/**
 * INDIAN BUSINESS FORMAT UTILITIES (VIHAAN'S MODULE)
 */

/**
 * Formats numbers into Indian numbering system (Lakhs & Crores)
 * e.g. 1234567.5 -> "₹ 12,34,567.50"
 */
export function formatINR(amount: number): string {
  const parts = amount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith('-');
  if (isNegative) integerPart = integerPart.substring(1);

  // Indian grouping: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;

  return `${isNegative ? '-' : ''}₹ ${formattedInteger}.${decimalPart}`;
}

/**
 * Validates 15-character Indian Goods and Services Tax Identification Number (GSTIN)
 * Format: 2 digits (State Code) + 10 chars (PAN) + 1 entity num + 'Z' + 1 checksum
 */
export function validateGSTIN(gstin: string): boolean {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
}

/**
 * Validates 10-character Indian Permanent Account Number (PAN)
 * 4th char: C (Company), P (Person), H (HUF), F (Firm), A (AOP), T (Trust)
 */
export function validatePAN(pan: string): boolean {
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return regex.test(pan.trim().toUpperCase());
}

/**
 * Formats date into standard Indian audit format DD/MM/YYYY
 */
export function formatIndianDate(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
