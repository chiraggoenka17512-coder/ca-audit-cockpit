//! Official GSTR-2B JSON Reader & Tax Breakup Parser
//! Extracts government filed invoice records with ITC eligibility flags.

use serde::{Deserialize, Serialize};
use thiserror::Error;
use crate::engine::money::{Paise, parse_indian_date};

#[derive(Error, Debug)]
pub enum Gstr2bError {
    #[error("JSON deserialization error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Missing or malformed field: {0}")]
    MalformedField(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gstr2bRawPayload {
    pub gstin: Option<String>,
    pub fp: Option<String>,
    pub b2b: Option<Vec<Gstr2bSupplierGroup>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gstr2bSupplierGroup {
    pub ctin: String, // Supplier GSTIN
    pub cfs: Option<String>, // Filing status
    pub inv: Option<Vec<Gstr2bInvoiceEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gstr2bInvoiceEntry {
    pub inum: String, // Invoice Number
    pub dt: String,   // Date (DD-MM-YYYY)
    pub val: f64,     // Invoice Total Value
    pub itcavl: Option<String>, // 'Y' or 'N'
    pub rsn: Option<String>,    // Reason if ineligible
    pub items: Option<Vec<Gstr2bLineItem>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gstr2bLineItem {
    pub num: Option<i64>,
    pub txval: Option<f64>,
    pub camt: Option<f64>,
    pub samt: Option<f64>,
    pub iamt: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NormalizedGstr2bRecord {
    pub supplier_gstin: String,
    pub invoice_number: String,
    pub invoice_date: String,
    pub total_amount: Paise,
    pub taxable_value: Paise,
    pub cgst: Paise,
    pub sgst: Paise,
    pub igst: Paise,
    pub itc_available: bool,
    pub ineligibility_reason: Option<String>,
}

pub struct Gstr2bParser;

impl Gstr2bParser {
    /// Parses raw GSTR-2B JSON string into normalized statutory records
    pub fn parse_json(json_str: &str) -> Result<Vec<NormalizedGstr2bRecord>, Gstr2bError> {
        let payload: Gstr2bRawPayload = serde_json::from_str(json_str)?;
        let mut results = Vec::new();

        if let Some(suppliers) = payload.b2b {
            for sup in suppliers {
                let ctin = sup.ctin.trim().to_uppercase();
                if let Some(invoices) = sup.inv {
                    for inv in invoices {
                        let parsed_date = parse_indian_date(&inv.dt)
                            .map(|d| d.to_string())
                            .unwrap_or(inv.dt.clone());

                        let total_paise = Paise((inv.val * 100.0).round() as i64);

                        // Accumulate tax amounts from line items
                        let mut sum_txval = 0i64;
                        let mut sum_cgst = 0i64;
                        let mut sum_sgst = 0i64;
                        let mut sum_igst = 0i64;

                        if let Some(items) = &inv.items {
                            for itm in items {
                                sum_txval += (itm.txval.unwrap_or(0.0) * 100.0).round() as i64;
                                sum_cgst += (itm.camt.unwrap_or(0.0) * 100.0).round() as i64;
                                sum_sgst += (itm.samt.unwrap_or(0.0) * 100.0).round() as i64;
                                sum_igst += (itm.iamt.unwrap_or(0.0) * 100.0).round() as i64;
                            }
                        }

                        let itc_avl = inv.itcavl.as_deref().unwrap_or("Y") == "Y";

                        results.push(NormalizedGstr2bRecord {
                            supplier_gstin: ctin.clone(),
                            invoice_number: inv.inum.trim().to_string(),
                            invoice_date: parsed_date,
                            total_amount: total_paise,
                            taxable_value: Paise(sum_txval),
                            cgst: Paise(sum_cgst),
                            sgst: Paise(sum_sgst),
                            igst: Paise(sum_igst),
                            itc_available: itc_avl,
                            ineligibility_reason: inv.rsn,
                        });
                    }
                }
            }
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_gstr2b_json() {
        let sample = r#"{
            "gstin": "27AABCA1234F1Z5",
            "fp": "082024",
            "b2b": [
                {
                    "ctin": "27AAATT1234T1Z5",
                    "cfs": "Y",
                    "inv": [
                        {
                            "inum": "INV-2024-99",
                            "dt": "15-08-2024",
                            "val": 118000.00,
                            "itcavl": "Y",
                            "items": [
                                {
                                    "num": 1,
                                    "txval": 100000.00,
                                    "camt": 9000.00,
                                    "samt": 9000.00,
                                    "iamt": 0.00
                                }
                            ]
                        }
                    ]
                }
            ]
        }"#;

        let records = Gstr2bParser::parse_json(sample).unwrap();
        assert_eq!(records.len(), 1);
        let r = &records[0];
        assert_eq!(r.supplier_gstin, "27AAATT1234T1Z5");
        assert_eq!(r.invoice_number, "INV-2024-99");
        assert_eq!(r.invoice_date, "2024-08-15");
        assert_eq!(r.total_amount, Paise(11800000));
        assert_eq!(r.taxable_value, Paise(10000000));
        assert_eq!(r.cgst, Paise(900000));
        assert_eq!(r.sgst, Paise(900000));
        assert!(r.itc_available);
    }
}
