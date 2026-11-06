import { BookInvoice, GSTR2BRecord } from '../types';

export const SEEDED_BOOK_INVOICES: BookInvoice[] = [
  // 1. Scripted Exception 1: Timing Difference (Date drift by 5 days, within window)
  {
    id: "book-001",
    invoiceNumber: "INV/2024/891",
    invoiceDate: "2024-09-12",
    vendorName: "Blue Dart Express Limited",
    vendorGSTIN: "27AAACB0446L1ZS",
    hsnCode: "996812",
    taxableValue: 45000.00,
    cgst: 4050.00,
    sgst: 4050.00,
    igst: 0.00,
    totalAmount: 53100.00,
    assignedLedger: "Courier & Freight Expenses",
    tdsSection: "194C",
    voucherType: "Purchase"
  },
  // 2. Scripted Exception 2: Typo in Invoice Number (/ vs -)
  {
    id: "book-002",
    invoiceNumber: "TI/24-25/00482",
    invoiceDate: "2024-09-15",
    vendorName: "Tata Tele Business Services Ltd",
    vendorGSTIN: "27AAACT2727Q1ZW",
    hsnCode: "998411",
    taxableValue: 84000.00,
    cgst: 7560.00,
    sgst: 7560.00,
    igst: 0.00,
    totalAmount: 99120.00,
    assignedLedger: "Telephone & Internet Charges",
    tdsSection: "194C",
    voucherType: "Purchase"
  },
  // 3. Scripted Exception 3: Rate Mismatch (Books 12%, Supplier billed 18%)
  {
    id: "book-003",
    invoiceNumber: "KL/GST/2024/99",
    invoiceDate: "2024-09-18",
    vendorName: "Kolkata Precision Tools Pvt Ltd",
    vendorGSTIN: "19AABCK9901M1Z4",
    hsnCode: "820730",
    taxableValue: 120000.00,
    cgst: 7200.00,
    sgst: 7200.00,
    igst: 0.00,
    totalAmount: 134400.00, // Client booked at 12%
    assignedLedger: "Machinery Spares & Consumables",
    tdsSection: "None",
    voucherType: "Purchase"
  },
  // 4. Scripted Exception 4: Missing in 2B (Supplier didn't file return, ITC at risk)
  {
    id: "book-004",
    invoiceNumber: "RAJ/INV/772",
    invoiceDate: "2024-09-22",
    vendorName: "Rajasthan Heavy Haulage Logistics",
    vendorGSTIN: "08AAECR3344K1ZF",
    hsnCode: "996511",
    taxableValue: 160000.00,
    cgst: 0.00,
    sgst: 0.00,
    igst: 19200.00,
    totalAmount: 179200.00,
    assignedLedger: "Freight Inward (Transport)",
    tdsSection: "194C",
    voucherType: "Purchase"
  },
  // 5. Scripted Exception 5: Unmapped Ledger / New Vendor (Triggers Local Learning Loop!)
  {
    id: "book-005",
    invoiceNumber: "AWS-IN-2024-8192",
    invoiceDate: "2024-09-24",
    vendorName: "Amazon Web Services India Pvt Ltd",
    vendorGSTIN: "29AALCA0024Q1ZP",
    hsnCode: "998313",
    taxableValue: 65000.00,
    cgst: 5850.00,
    sgst: 5850.00,
    igst: 0.00,
    totalAmount: 76700.00,
    assignedLedger: "General Administrative Expenses", // Wrong initial classification
    tdsSection: "None",
    voucherType: "Purchase"
  },
  // 6. Another pending invoice from AWS (to prove the learning loop updates the rest!)
  {
    id: "book-006",
    invoiceNumber: "AWS-IN-2024-8193",
    invoiceDate: "2024-09-28",
    vendorName: "Amazon Web Services India Pvt Ltd",
    vendorGSTIN: "29AALCA0024Q1ZP",
    hsnCode: "998313",
    taxableValue: 42000.00,
    cgst: 3780.00,
    sgst: 3780.00,
    igst: 0.00,
    totalAmount: 49560.00,
    assignedLedger: "General Administrative Expenses",
    tdsSection: "None",
    voucherType: "Purchase"
  },
  // Clean Exact Matches (Representing the 40+ bulk batch)
  {
    id: "book-007",
    invoiceNumber: "INF/24/0912",
    invoiceDate: "2024-09-02",
    vendorName: "Infosys BPM Limited",
    vendorGSTIN: "29AAACI4798L1ZU",
    hsnCode: "998314",
    taxableValue: 250000.00,
    cgst: 22500.00,
    sgst: 22500.00,
    igst: 0.00,
    totalAmount: 295000.00,
    assignedLedger: "IT Consulting & Audit Support",
    tdsSection: "194J",
    voucherType: "Purchase"
  },
  {
    id: "book-008",
    invoiceNumber: "DEL/GST/74921",
    invoiceDate: "2024-09-05",
    vendorName: "Dell International Services India Pvt Ltd",
    vendorGSTIN: "29AAACD0125F1ZS",
    hsnCode: "847130",
    taxableValue: 480000.00,
    cgst: 43200.00,
    sgst: 43200.00,
    igst: 0.00,
    totalAmount: 566400.00,
    assignedLedger: "Computer Hardware & Laptops",
    tdsSection: "None",
    voucherType: "Purchase"
  },
  {
    id: "book-009",
    invoiceNumber: "LT/WEST/4412",
    invoiceDate: "2024-09-08",
    vendorName: "Larsen & Toubro Limited",
    vendorGSTIN: "27AAACL0140P1ZM",
    hsnCode: "995411",
    taxableValue: 750000.00,
    cgst: 67500.00,
    sgst: 67500.00,
    igst: 0.00,
    totalAmount: 885000.00,
    assignedLedger: "Plant Maintenance & Electricals",
    tdsSection: "194C",
    voucherType: "Purchase"
  }
];

export const SEEDED_GSTR2B_RECORDS: GSTR2BRecord[] = [
  // 1. Matches book-001 but filed 5 days earlier in 2B (Timing Diff)
  {
    id: "gstr-001",
    supplierGSTIN: "27AAACB0446L1ZS",
    supplierTradeName: "BLUE DART EXPRESS LIMITED",
    invoiceNumber: "INV/2024/891",
    invoiceDate: "2024-09-07", // 5 days earlier
    invoiceValue: 53100.00,
    taxableValue: 45000.00,
    integratedTax: 0.00,
    centralTax: 4050.00,
    stateTax: 4050.00,
    filingDate: "2024-10-10",
    itcAvailable: "Y"
  },
  // 2. Matches book-002 with typo in invoice number (TI-24-25-00482 instead of TI/24-25/00482)
  {
    id: "gstr-002",
    supplierGSTIN: "27AAACT2727Q1ZW",
    supplierTradeName: "TATA TELE BUSINESS SERVICES LTD",
    invoiceNumber: "TI-24-25-00482",
    invoiceDate: "2024-09-15",
    invoiceValue: 99120.00,
    taxableValue: 84000.00,
    integratedTax: 0.00,
    centralTax: 7560.00,
    stateTax: 7560.00,
    filingDate: "2024-10-11",
    itcAvailable: "Y"
  },
  // 3. Matches book-003 with Rate Mismatch (Supplier filed 18% = ₹141,600 instead of ₹134,400)
  {
    id: "gstr-003",
    supplierGSTIN: "19AABCK9901M1Z4",
    supplierTradeName: "KOLKATA PRECISION TOOLS PVT LTD",
    invoiceNumber: "KL/GST/2024/99",
    invoiceDate: "2024-09-18",
    invoiceValue: 141600.00, // 18% GST (Taxable 120,000 + 21,600 GST)
    taxableValue: 120000.00,
    integratedTax: 0.00,
    centralTax: 10800.00,
    stateTax: 10800.00,
    filingDate: "2024-10-09",
    itcAvailable: "Y"
  },
  // Notice: book-004 ("Rajasthan Heavy Haulage Logistics") has NO entry here (Simulates Section 16(2)(aa) ITC Risk)

  // Matches book-005 & book-006 (AWS)
  {
    id: "gstr-005",
    supplierGSTIN: "29AALCA0024Q1ZP",
    supplierTradeName: "AMAZON WEB SERVICES INDIA PVT LTD",
    invoiceNumber: "AWS-IN-2024-8192",
    invoiceDate: "2024-09-24",
    invoiceValue: 76700.00,
    taxableValue: 65000.00,
    integratedTax: 0.00,
    centralTax: 5850.00,
    stateTax: 5850.00,
    filingDate: "2024-10-10",
    itcAvailable: "Y"
  },
  {
    id: "gstr-006",
    supplierGSTIN: "29AALCA0024Q1ZP",
    supplierTradeName: "AMAZON WEB SERVICES INDIA PVT LTD",
    invoiceNumber: "AWS-IN-2024-8193",
    invoiceDate: "2024-09-28",
    invoiceValue: 49560.00,
    taxableValue: 42000.00,
    integratedTax: 0.00,
    centralTax: 3780.00,
    stateTax: 3780.00,
    filingDate: "2024-10-10",
    itcAvailable: "Y"
  },

  // Clean Exact Matches
  {
    id: "gstr-007",
    supplierGSTIN: "29AAACI4798L1ZU",
    supplierTradeName: "INFOSYS BPM LIMITED",
    invoiceNumber: "INF/24/0912",
    invoiceDate: "2024-09-02",
    invoiceValue: 295000.00,
    taxableValue: 250000.00,
    integratedTax: 0.00,
    centralTax: 22500.00,
    stateTax: 22500.00,
    filingDate: "2024-10-05",
    itcAvailable: "Y"
  },
  {
    id: "gstr-008",
    supplierGSTIN: "29AAACD0125F1ZS",
    supplierTradeName: "DELL INTERNATIONAL SERVICES INDIA PVT LTD",
    invoiceNumber: "DEL/GST/74921",
    invoiceDate: "2024-09-05",
    invoiceValue: 566400.00,
    taxableValue: 480000.00,
    integratedTax: 0.00,
    centralTax: 43200.00,
    stateTax: 43200.00,
    filingDate: "2024-10-06",
    itcAvailable: "Y"
  },
  {
    id: "gstr-009",
    supplierGSTIN: "27AAACL0140P1ZM",
    supplierTradeName: "LARSEN & TOUBRO LIMITED",
    invoiceNumber: "LT/WEST/4412",
    invoiceDate: "2024-09-08",
    invoiceValue: 885000.00,
    taxableValue: 750000.00,
    integratedTax: 0.00,
    centralTax: 67500.00,
    stateTax: 67500.00,
    filingDate: "2024-10-08",
    itcAvailable: "Y"
  }
];
