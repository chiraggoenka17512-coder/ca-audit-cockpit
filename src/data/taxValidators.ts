/**
 * Indian Tax Identifiers Validation Engine
 * Deterministic validation for GSTIN (15 chars) and PAN (10 chars)
 * In accordance with Section 16(2)(aa) CGST Act & Income Tax Department rules.
 */

// 37 States and Union Territories with official 2-digit GST state codes
export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction'
};

// Income Tax PAN 4th character entity mapping
export const PAN_ENTITY_TYPES: Record<string, string> = {
  'C': 'Company',
  'P': 'Individual / Person',
  'H': 'Hindu Undivided Family (HUF)',
  'F': 'Firm / Limited Liability Partnership (LLP)',
  'A': 'Association of Persons (AOP)',
  'T': 'Trust',
  'B': 'Body of Individuals (BOI)',
  'L': 'Local Authority',
  'J': 'Artificial Juridical Person',
  'G': 'Government Agency',
  'D': 'Government Department'
};

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Computes official GSTN Checksum using Luhn Modulo-36 algorithm.
 * Verified with official GSTIN test vectors (e.g. Tata Motors 27AAACT2727Q1ZW -> W).
 */
export function computeGstinChecksum(gstin14: string): string {
  if (!gstin14 || gstin14.length !== 14) return '';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const factor = (i % 2 === 0) ? 1 : 2;
    const val = GSTIN_CHARS.indexOf(gstin14[i]);
    if (val === -1) return '';
    const prod = val * factor;
    const quotient = Math.floor(prod / 36);
    const rem = prod % 36;
    sum += quotient + rem;
  }
  const rem36 = sum % 36;
  const checkDigitIndex = (36 - rem36) % 36;
  return GSTIN_CHARS[checkDigitIndex];
}

export interface GstinValidationResult {
  isValid: boolean;
  isFormatValid: boolean;
  isChecksumValid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  computedCheckDigit?: string;
  error?: string;
}

/**
 * Validates a 15-character Indian GSTIN format and checksum.
 * Regex: 2 digits (state) + 10 alphanumeric (PAN) + 1 alphanumeric (entity count) + 'Z' + 1 check character.
 */
export function validateGSTIN(gstin: string): GstinValidationResult {
  const clean = gstin.trim().toUpperCase();
  if (!clean) {
    return {
      isValid: false,
      isFormatValid: false,
      isChecksumValid: false,
      error: 'GSTIN cannot be empty'
    };
  }

  if (clean.length !== 15) {
    return {
      isValid: false,
      isFormatValid: false,
      isChecksumValid: false,
      error: `GSTIN must be 15 characters (currently ${clean.length})`
    };
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isFormatValid = gstinRegex.test(clean);

  if (!isFormatValid) {
    return {
      isValid: false,
      isFormatValid: false,
      isChecksumValid: false,
      error: 'Invalid format: must follow 2-digit state + 10-char PAN + 1 entity + Z + 1 check character'
    };
  }

  const stateCode = clean.substring(0, 2);
  const stateName = GST_STATE_CODES[stateCode] || `State code ${stateCode}`;
  const pan = clean.substring(2, 12);

  const gstin14 = clean.substring(0, 14);
  const actualCheckDigit = clean[14];
  const computedCheckDigit = computeGstinChecksum(gstin14);
  const isChecksumValid = actualCheckDigit === computedCheckDigit;

  return {
    isValid: isFormatValid && isChecksumValid,
    isFormatValid,
    isChecksumValid,
    stateCode,
    stateName,
    pan,
    computedCheckDigit,
    error: !isChecksumValid ? `Check digit mismatch (expected ${computedCheckDigit}, got ${actualCheckDigit})` : undefined
  };
}

export interface PanValidationResult {
  isValid: boolean;
  entityType?: string;
  error?: string;
}

/**
 * Validates a 10-character Indian Permanent Account Number (PAN).
 * Regex: 5 uppercase letters + 4 digits + 1 uppercase letter.
 */
export function validatePAN(pan: string): PanValidationResult {
  const clean = pan.trim().toUpperCase();
  if (!clean) {
    return { isValid: false, error: 'PAN cannot be empty' };
  }

  if (clean.length !== 10) {
    return { isValid: false, error: `PAN must be 10 characters (currently ${clean.length})` };
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(clean)) {
    return { isValid: false, error: 'Invalid PAN structure: 5 uppercase letters + 4 digits + 1 letter' };
  }

  const entityChar = clean[3];
  const entityType = PAN_ENTITY_TYPES[entityChar] || 'Taxpayer';

  return {
    isValid: true,
    entityType
  };
}
