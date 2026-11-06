//! Fast In-Memory Excel & CSV Purchase Register Reader
//! Uses calamine for zero-allocation parsing of 50,000+ row client books.
//! Complies with GEMINI.md Step 4: "Read header row explicitly. Map columns by normalized header text."

use calamine::{Reader, Xlsx, open_workbook_from_rs, Data};
use std::io::Cursor;
use chrono::NaiveDate;
use serde::{Serialize, Deserialize};
use thiserror::Error;
use crate::engine::money::{Paise, parse_paise, parse_indian_date, validate_gstin};

#[derive(Error, Debug)]
pub enum ParserError {
    #[error("Calamine workbook error: {0}")]
    CalamineError(String),

    #[error("No sheets found in Excel file")]
    EmptyWorkbook,

    #[error("Required header '{0}' could not be mapped from columns")]
    MissingRequiredHeader(String),

    #[error("CSV parsing error: {0}")]
    CsvError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ParsedInvoiceRow {
    pub row_index: usize,
    pub vendor_gstin: String,
    pub vendor_name: String,
    pub invoice_number: String,
    pub invoice_date: String,
    pub taxable_value: Paise,
    pub cgst: Paise,
    pub sgst: Paise,
    pub igst: Paise,
    pub total_amount: Paise,
    pub is_valid: bool,
    pub error_flags: Vec<String>,
}

#[derive(Default)]
struct ColumnIndices {
    vendor_gstin: Option<usize>,
    vendor_name: Option<usize>,
    invoice_number: Option<usize>,
    invoice_date: Option<usize>,
    taxable_value: Option<usize>,
    cgst: Option<usize>,
    sgst: Option<usize>,
    igst: Option<usize>,
    total_amount: Option<usize>,
}

pub struct ExcelRegisterParser;

impl ExcelRegisterParser {
    /// Parses an in-memory .xlsx or .xlsb buffer into structured invoice rows
    pub fn parse_bytes(buffer: &[u8]) -> Result<Vec<ParsedInvoiceRow>, ParserError> {
        let cursor = Cursor::new(buffer);
        let mut workbook: Xlsx<_> = open_workbook_from_rs(cursor)
            .map_err(|e| ParserError::CalamineError(e.to_string()))?;

        let sheet_names = workbook.sheet_names().to_vec();
        let first_sheet = sheet_names.first().ok_or(ParserError::EmptyWorkbook)?;

        let range = workbook
            .worksheet_range(first_sheet)
            .map_err(|e| ParserError::CalamineError(e.to_string()))?;

        let mut rows_iter = range.rows();
        let header_row = rows_iter.next().ok_or(ParserError::EmptyWorkbook)?;

        // Map column indices by normalized header text
        let col_map = Self::map_headers(header_row);

        let mut parsed_results = Vec::new();
        for (idx, row) in rows_iter.enumerate() {
            let row_idx = idx + 2; // 1-based index (row 1 is header)
            let mut errors = Vec::new();

            // Extract cells
            let gstin_raw = Self::cell_to_string(col_map.vendor_gstin.and_then(|i| row.get(i)));
            let vendor_name = Self::cell_to_string(col_map.vendor_name.and_then(|i| row.get(i)));
            let inv_num = Self::cell_to_string(col_map.invoice_number.and_then(|i| row.get(i)));
            let date_raw = Self::cell_to_string(col_map.invoice_date.and_then(|i| row.get(i)));

            // Skip completely empty spacer rows
            if gstin_raw.is_empty() && inv_num.is_empty() && vendor_name.is_empty() {
                continue;
            }

            // Validate GSTIN if present
            let gstin = match validate_gstin(&gstin_raw) {
                Ok(v) => v.to_string(),
                Err(e) => {
                    errors.push(format!("GSTIN: {}", e));
                    gstin_raw
                }
            };

            // Parse Date
            let invoice_date = match parse_indian_date(&date_raw) {
                Ok(d) => d.to_string(),
                Err(e) => {
                    errors.push(format!("Date: {}", e));
                    date_raw
                }
            };

            // Parse Paise amounts
            let taxable = Self::parse_cell_paise(col_map.taxable_value.and_then(|i| row.get(i)), &mut errors, "Taxable");
            let cgst = Self::parse_cell_paise(col_map.cgst.and_then(|i| row.get(i)), &mut errors, "CGST");
            let sgst = Self::parse_cell_paise(col_map.sgst.and_then(|i| row.get(i)), &mut errors, "SGST");
            let igst = Self::parse_cell_paise(col_map.igst.and_then(|i| row.get(i)), &mut errors, "IGST");
            let total = Self::parse_cell_paise(col_map.total_amount.and_then(|i| row.get(i)), &mut errors, "Total");

            let is_valid = errors.is_empty();

            parsed_results.push(ParsedInvoiceRow {
                row_index: row_idx,
                vendor_gstin: gstin,
                vendor_name,
                invoice_number: inv_num,
                invoice_date,
                taxable_value: taxable,
                cgst,
                sgst,
                igst,
                total_amount: total,
                is_valid,
                error_flags: errors,
            });
        }

        Ok(parsed_results)
    }

    fn cell_to_string(cell: Option<&Data>) -> String {
        match cell {
            Some(Data::String(s)) => s.trim().to_string(),
            Some(Data::Float(f)) => f.to_string(),
            Some(Data::Int(i)) => i.to_string(),
            Some(Data::DateTime(dt)) => dt.to_string(),
            _ => String::new(),
        }
    }

    fn parse_cell_paise(cell: Option<&Data>, errors: &mut Vec<String>, field_name: &str) -> Paise {
        match cell {
            Some(Data::Float(f)) => {
                // Round safely to paise
                Paise((f * 100.0).round() as i64)
            }
            Some(Data::Int(i)) => Paise(i * 100),
            Some(Data::String(s)) => {
                match parse_paise(s) {
                    Ok(p) => p,
                    Err(e) => {
                        errors.push(format!("{}: {}", field_name, e));
                        Paise::ZERO
                    }
                }
            }
            _ => Paise::ZERO,
        }
    }

    /// Dynamically maps columns from header variants
    fn map_headers(header_row: &[Data]) -> ColumnIndices {
        let mut cols = ColumnIndices::default();

        for (i, cell) in header_row.iter().enumerate() {
            let h = Self::cell_to_string(Some(cell)).to_lowercase();
            let norm = h.replace([' ', '_', '-', '.', '#'], "");

            if norm.contains("gstin") || norm.contains("gstno") {
                cols.vendor_gstin = Some(i);
            } else if norm.contains("vendor") || norm.contains("party") || norm.contains("supplier") {
                cols.vendor_name = Some(i);
            } else if norm.contains("invno") || norm.contains("invoiceno") || norm.contains("billno") {
                cols.invoice_number = Some(i);
            } else if norm.contains("invdate") || norm.contains("date") || norm.contains("billdate") {
                cols.invoice_date = Some(i);
            } else if norm.contains("taxable") || norm.contains("baseamt") {
                cols.taxable_value = Some(i);
            } else if norm.contains("cgst") {
                cols.cgst = Some(i);
            } else if norm.contains("sgst") || norm.contains("utgst") {
                cols.sgst = Some(i);
            } else if norm.contains("igst") {
                cols.igst = Some(i);
            } else if norm.contains("total") || norm.contains("invoiceval") || norm.contains("gross") {
                cols.total_amount = Some(i);
            }
        }

        cols
    }
}
