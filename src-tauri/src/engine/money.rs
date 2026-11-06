//! Foundation: Money (Paise i64) and Indian Tax Identifiers
//! Enforces GEMINI.md Rule: "All money is stored and computed as integer paise (i64). Never use f32 or f64 for money."

use std::fmt;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum FormatError {
    #[error("Invalid money format: '{0}'. Expected format like '40000', '40,000.50', or 'Rs 1,25,000'")]
    InvalidMoneyString(String),

    #[error("Invalid GSTIN format: '{0}'. Must be 15 alphanumeric characters matching state(2) + PAN(10) + entity(1) + Z + check(1)")]
    InvalidGSTIN(String),

    #[error("GSTIN checksum mismatch for '{0}'")]
    GSTINChecksumMismatch(String),

    #[error("Invalid PAN format: '{0}'. Must be 10 characters (5 uppercase letters, 4 digits, 1 uppercase letter)")]
    InvalidPAN(String),

    #[error("Invalid Indian date format: '{0}'. Expected DD/MM/YYYY, DD-MM-YYYY, or DD-MMM-YYYY")]
    InvalidDate(String),
}

/// Represents an amount in Indian Paise (1 Rupee = 100 Paise).
/// Backed strictly by i64 to prevent floating-point rounding errors.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize, Default)]
pub struct Paise(pub i64);

impl Paise {
    pub const ZERO: Paise = Paise(0);

    pub fn from_rupees_and_paise(rupees: i64, paise: i64) -> Self {
        Paise(rupees * 100 + paise)
    }

    pub fn to_rupees_float_string(&self) -> String {
        let is_negative = self.0 < 0;
        let abs_val = self.0.abs();
        let rupees = abs_val / 100;
        let paise = abs_val % 100;
        format!("{}{}.{:02}", if is_negative { "-" } else { "" }, rupees, paise)
    }

    /// Formats amount into Indian numbering system (e.g., ₹ 12,34,567.50)
    pub fn to_indian_currency_string(&self) -> String {
        let is_negative = self.0 < 0;
        let abs_val = self.0.abs();
        let rupees = abs_val / 100;
        let paise = abs_val % 100;

        let r_str = rupees.to_string();
        let formatted_rupees = format_indian_commas(&r_str);

        format!(
            "{}₹ {}.{:02}",
            if is_negative { "-" } else { "" },
            formatted_rupees,
            paise
        )
    }
}

impl fmt::Display for Paise {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_indian_currency_string())
    }
}

/// Helper function to format an integer string using Indian grouping:
/// Last 3 digits grouped, then groups of 2 digits (e.g. 12,34,567).
fn format_indian_commas(s: &str) -> String {
    if s.len() <= 3 {
        return s.to_string();
    }
    let (head, tail) = s.split_at(s.len() - 3);
    let mut chunks = Vec::new();
    let mut rem = head;
    while rem.len() > 2 {
        let (h, t) = rem.split_at(rem.len() - 2);
        chunks.push(t);
        rem = h;
    }
    if !rem.is_empty() {
        chunks.push(rem);
    }
    chunks.reverse();
    format!("{},{}", chunks.join(","), tail)
}

/// Parses any Indian currency string into exact integer paise.
/// Handles prefixes ("Rs.", "INR", "₹"), commas, whitespace, and negative values.
pub fn parse_paise(raw: &str) -> Result<Paise, FormatError> {
    let clean = raw.trim()
        .trim_start_matches("Rs.")
        .trim_start_matches("Rs")
        .trim_start_matches("INR")
        .trim_start_matches("₹")
        .trim()
        .replace(',', "");

    if clean.is_empty() {
        return Err(FormatError::InvalidMoneyString(raw.to_string()));
    }

    let is_negative = clean.starts_with('-');
    let num_str = if is_negative { &clean[1..] } else { &clean };

    let parts: Vec<&str> = num_str.split('.').collect();
    match parts.len() {
        1 => {
            // Whole rupees, no decimals
            let rupees = parts[0].parse::<i64>().map_err(|_| FormatError::InvalidMoneyString(raw.to_string()))?;
            let val = rupees * 100;
            Ok(Paise(if is_negative { -val } else { val }))
        }
        2 => {
            let rupees = parts[0].parse::<i64>().map_err(|_| FormatError::InvalidMoneyString(raw.to_string()))?;
            let dec = parts[1];
            let paise = match dec.len() {
                0 => 0,
                1 => dec.parse::<i64>().map_err(|_| FormatError::InvalidMoneyString(raw.to_string()))? * 10,
                2 => dec.parse::<i64>().map_err(|_| FormatError::InvalidMoneyString(raw.to_string()))?,
                _ => {
                    // Round to nearest paise if more than 2 decimals
                    let two_dec = &dec[0..2].parse::<i64>().map_err(|_| FormatError::InvalidMoneyString(raw.to_string()))?;
                    let third = dec.chars().nth(2).unwrap_or('0');
                    if third >= '5' { two_dec + 1 } else { *two_dec }
                }
            };
            let val = rupees * 100 + paise;
            Ok(Paise(if is_negative { -val } else { val }))
        }
        _ => Err(FormatError::InvalidMoneyString(raw.to_string())),
    }
}

/// Validates an Indian Permanent Account Number (PAN).
/// Format: 5 uppercase letters + 4 digits + 1 uppercase letter (e.g. ABCDE1234F).
pub fn validate_pan(pan: &str) -> Result<&str, FormatError> {
    let s = pan.trim();
    if s.len() != 10 {
        return Err(FormatError::InvalidPAN(s.to_string()));
    }
    let chars: Vec<char> = s.chars().collect();
    for i in 0..5 {
        if !chars[i].is_ascii_uppercase() {
            return Err(FormatError::InvalidPAN(s.to_string()));
        }
    }
    for i in 5..9 {
        if !chars[i].is_ascii_digit() {
            return Err(FormatError::InvalidPAN(s.to_string()));
        }
    }
    if !chars[9].is_ascii_uppercase() {
        return Err(FormatError::InvalidPAN(s.to_string()));
    }
    Ok(s)
}

/// Validates an Indian Goods and Services Tax Identification Number (GSTIN).
/// 15 characters: 2 digits state code + 10 chars PAN + 1 char entity + 'Z' + 1 check digit.
/// Verifies format and standard GSTN Mod-36 check character.
pub fn validate_gstin(gstin: &str) -> Result<&str, FormatError> {
    let s = gstin.trim();
    if s.len() != 15 {
        return Err(FormatError::InvalidGSTIN(s.to_string()));
    }
    let chars: Vec<char> = s.chars().collect();

    // Check state code (first 2 digits)
    if !chars[0].is_ascii_digit() || !chars[1].is_ascii_digit() {
        return Err(FormatError::InvalidGSTIN(s.to_string()));
    }

    // Check PAN (chars 2..12)
    let pan_part: String = chars[2..12].iter().collect();
    validate_pan(&pan_part).map_err(|_| FormatError::InvalidGSTIN(s.to_string()))?;

    // 13th char: entity number (digit or letter)
    if !chars[12].is_ascii_alphanumeric() {
        return Err(FormatError::InvalidGSTIN(s.to_string()));
    }

    // 14th char: standard default 'Z'
    if chars[13] != 'Z' {
        return Err(FormatError::InvalidGSTIN(s.to_string()));
    }

    // Check character calculation (GSTN official Mod-36 algorithm)
    let expected_check = compute_gstin_check_char(&s[0..14]);
    if chars[14] != expected_check {
        return Err(FormatError::GSTINChecksumMismatch(s.to_string()));
    }

    Ok(s)
}

/// Official GSTN Checksum computation (ISO 7064 Mod 36, 36)
fn compute_gstin_check_char(code14: &str) -> char {
    const CHARS: &str = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let mut factor = 1;
    let mut sum = 0;

    for c in code14.chars().rev() {
        if let Some(pos) = CHARS.find(c) {
            let mut add = (pos as i32) * factor;
            factor = if factor == 2 { 1 } else { 2 };
            add = (add / 36) + (add % 36);
            sum += add;
        }
    }

    let remainder = sum % 36;
    let check_code = (36 - remainder) % 36;
    CHARS.chars().nth(check_code as usize).unwrap_or('0')
}

/// Parses dates strictly supporting Indian business formats:
/// DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY (e.g. 15-Mar-2024).
/// Never confuses day-first and month-first.
pub fn parse_indian_date(raw: &str) -> Result<NaiveDate, FormatError> {
    let s = raw.trim();
    let formats = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d-%b-%Y",
        "%d/%b/%Y",
        "%d-%B-%Y",
        "%Y-%m-%d", // standard ISO fallback
    ];

    for fmt in &formats {
        if let Ok(d) = NaiveDate::parse_from_str(s, fmt) {
            return Ok(d);
        }
    }

    Err(FormatError::InvalidDate(s.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_paise_parsing() {
        assert_eq!(parse_paise("40000").unwrap(), Paise(4000000));
        assert_eq!(parse_paise("40,000.50").unwrap(), Paise(4000050));
        assert_eq!(parse_paise("Rs 1,25,000.00").unwrap(), Paise(12500000));
        assert_eq!(parse_paise("₹ 9,999.99").unwrap(), Paise(999999));
        assert_eq!(parse_paise("-₹ 500.25").unwrap(), Paise(-50025));
    }

    #[test]
    fn test_indian_formatting() {
        let p = Paise(123456789);
        assert_eq!(p.to_indian_currency_string(), "₹ 12,34,567.89");

        let p2 = Paise(500000);
        assert_eq!(p2.to_indian_currency_string(), "₹ 5,000.00");
    }

    #[test]
    fn test_pan_validation() {
        assert!(validate_pan("ABCDE1234F").is_ok());
        assert!(validate_pan("abcde1234f").is_err()); // Must be uppercase
        assert!(validate_pan("ABCD12345F").is_err()); // 4 letters only
    }

    #[test]
    fn test_gstin_validation() {
        // Valid Maharashtra GSTIN
        let valid_gstin = "27AABCA1234F1Z5";
        // Check calculation matches format
        assert!(validate_gstin(valid_gstin).is_ok());
        // Invalid check char
        assert!(validate_gstin("27AABCA1234F1Z9").is_err());
    }

    #[test]
    fn test_indian_date_parsing() {
        let d = parse_indian_date("15/08/1947").unwrap();
        assert_eq!(d, NaiveDate::from_ymd_opt(1947, 8, 15).unwrap());

        let d2 = parse_indian_date("31-03-2024").unwrap();
        assert_eq!(d2, NaiveDate::from_ymd_opt(2024, 3, 31).unwrap());

        let d3 = parse_indian_date("15-Aug-2024").unwrap();
        assert_eq!(d3, NaiveDate::from_ymd_opt(2024, 8, 15).unwrap());
    }
}
