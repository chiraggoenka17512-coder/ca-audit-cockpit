export interface SourceSnippet {
  label: string;
  field: string;
  ocrValue: string;
  box: [number, number, number, number]; // [x, y, width, height]
}

export interface ExtractedField {
  id: string;
  label: string;
  field: string;
  ocrValue: string;
  confidence: number; // 0.0 to 1.0 (fields < 0.85 show amber check)
  box: [number, number, number, number]; // [x, y, width, height]
}

export interface ReviewItem {
  id: string;
  title: string;
  meta: string;
  amount: string;
  rawAmountPaise: number;
  identifier: string;
  booksInvoice: string;
  gstrInvoice: string;
  books: string;
  gstr: string;
  why: string;
  category: 'TIMING' | 'RCM' | 'RATE_MISMATCH' | 'TDS' | 'TYPO' | 'MISSING_2B' | 'CLASSIFICATION' | 'OTHER';
  filingDate?: string;
  booksDate?: string;
  confidenceScore: number; // 0.0 to 1.0 (fields < 0.85 show amber check)
  ruleId?: string;
  ruleName?: string;
  ruleEffectiveDate?: string;
  ruleVerified: boolean; // false = UNVERIFIED
  sourceSnippet?: SourceSnippet;
  extractedFields?: ExtractedField[];
  agreedFields?: string[];
  differingFields?: string[];
  assignedLedger?: string;
  learnedFromPreference?: boolean;
}

export const INITIAL_REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "rev-001",
    title: "Blue Dart Express Limited",
    meta: "Timing difference · 5 days",
    amount: "₹53,100",
    rawAmountPaise: 5310000,
    identifier: "27AAACB0446L1ZS",
    booksInvoice: "INV/2024/891",
    gstrInvoice: "INV/2024/891",
    books: "₹53,100",
    gstr: "₹53,100",
    why: "Invoice dated 12 Sep in your books, 17 Sep in GSTR-2B. Both agree on ₹53,100. Filed within the permissible 30-day window, so Input Tax Credit is fully eligible.",
    category: "TIMING",
    booksDate: "12/09/2024",
    filingDate: "17/09/2024",
    confidenceScore: 0.98,
    ruleId: "SEC-16-2-AA",
    ruleName: "Section 16(2)(aa) CGST Act, 2017 & Rule 36(4)",
    ruleEffectiveDate: "01/01/2022 to Present",
    ruleVerified: true,
    assignedLedger: "Courier & Freight Expenses",
    agreedFields: [
      "Total Amount: ₹53,100 (Paise exact)",
      "Invoice Number: INV/2024/891",
      "Supplier GSTIN: 27AAACB0446L1ZS"
    ],
    differingFields: [
      "Invoice Date: 12/09/2024 (Books) vs 17/09/2024 (GSTR-2B) · 5-day timing delta"
    ],
    sourceSnippet: {
      label: "Total Invoice Value",
      field: "Total Invoice Value",
      ocrValue: "53,100.00",
      box: [280, 410, 160, 28]
    },
    extractedFields: [
      {
        id: "f-001-inv",
        label: "Invoice Number",
        field: "invoiceNumber",
        ocrValue: "INV/2024/891",
        confidence: 0.99,
        box: [240, 60, 150, 24]
      },
      {
        id: "f-001-date",
        label: "Invoice Date",
        field: "invoiceDate",
        ocrValue: "12/09/2024",
        confidence: 0.97,
        box: [240, 92, 110, 22]
      },
      {
        id: "f-001-gstin",
        label: "Supplier GSTIN",
        field: "vendorGSTIN",
        ocrValue: "27AAACB0446L1ZS",
        confidence: 0.99,
        box: [40, 60, 170, 24]
      },
      {
        id: "f-001-taxable",
        label: "Taxable Value",
        field: "taxableValue",
        ocrValue: "45,000.00",
        confidence: 0.98,
        box: [280, 340, 130, 24]
      },
      {
        id: "f-001-total",
        label: "Total Invoice Value",
        field: "totalAmount",
        ocrValue: "53,100.00",
        confidence: 0.98,
        box: [280, 410, 160, 28]
      }
    ]
  },
  {
    id: "rev-002",
    title: "Reliance Transport Bill #882",
    meta: "Waiting for RCM confirmation · 3 days",
    amount: "₹24,500",
    rawAmountPaise: 2450000,
    identifier: "Client query",
    booksInvoice: "BILL/882",
    gstrInvoice: "Not found",
    books: "₹24,500",
    gstr: "Not found",
    why: "Reverse charge applies under Section 9(3). The transporter has not submitted the non-availment of ITC declaration. Confirm GTA declaration before approving payment.",
    category: "RCM",
    booksDate: "14/09/2024",
    confidenceScore: 0.78, // Low confidence -> Amber warning!
    ruleId: "SEC-9-3",
    ruleName: "Section 9(3) CGST Act (GTA RCM Notifications 13/2017 & 05/2022)",
    ruleEffectiveDate: "01/07/2017 to Present",
    ruleVerified: true,
    assignedLedger: "Freight & Transportation Charges",
    agreedFields: [
      "Vendor Name: Reliance Transport Services",
      "Books Recorded Amount: ₹24,500"
    ],
    differingFields: [
      "Missing in GSTR-2B: Transporter filed under Forward Charge without Annexure V",
      "RCM Status: Unconfirmed · Declaration missing"
    ],
    sourceSnippet: {
      label: "Consignment Total",
      field: "Consignment Total",
      ocrValue: "24,500.00",
      box: [260, 390, 150, 26]
    },
    extractedFields: [
      {
        id: "f-002-inv",
        label: "Consignment Note #",
        field: "invoiceNumber",
        ocrValue: "BILL/882",
        confidence: 0.94,
        box: [240, 58, 120, 24]
      },
      {
        id: "f-002-date",
        label: "Consignment Date",
        field: "invoiceDate",
        ocrValue: "14/09/2024",
        confidence: 0.91,
        box: [240, 90, 110, 22]
      },
      {
        id: "f-002-total",
        label: "Consignment Total",
        field: "totalAmount",
        ocrValue: "24,500.00",
        confidence: 0.78, // Low confidence amber check!
        box: [260, 390, 150, 26]
      },
      {
        id: "f-002-rcm",
        label: "RCM Declaration Flag",
        field: "rcmDeclaration",
        ocrValue: "NON-AVAILMENT NOT ATTACHED",
        confidence: 0.65, // Low confidence amber check!
        box: [40, 210, 240, 26]
      }
    ]
  },
  {
    id: "rev-003",
    title: "Bharat Logistics Corp",
    meta: "Tax rate mismatch",
    amount: "₹8,900",
    rawAmountPaise: 890000,
    identifier: "Vendor 27AABCB5521K1Z8",
    booksInvoice: "BL/2024/041",
    gstrInvoice: "BL/2024/041",
    books: "₹8,900",
    gstr: "₹8,426",
    why: "Client books show 18% GST (Tax ₹1,357), while the vendor filed at 12% (Tax ₹902). Check physical invoice copy to determine if transport was composite supply before claiming ITC.",
    category: "RATE_MISMATCH",
    booksDate: "16/09/2024",
    filingDate: "16/09/2024",
    confidenceScore: 0.94,
    ruleId: "SEC-16-2-C",
    ruleName: "Section 16(2)(c) CGST Act & Notification 11/2017-CT(R)",
    ruleEffectiveDate: "01/07/2017 to Present",
    ruleVerified: true,
    assignedLedger: "Logistics & Cartage",
    agreedFields: [
      "Invoice Number: BL/2024/041",
      "Supplier GSTIN: 27AABCB5521K1Z8",
      "Invoice Date: 16/09/2024"
    ],
    differingFields: [
      "Tax Rate: 18% in Books (Tax ₹1,357) vs 12% in GSTR-2B (Tax ₹902)",
      "Gross Total Delta: ₹474 mismatch (Books ₹8,900 vs GSTR-2B ₹8,426)"
    ],
    sourceSnippet: {
      label: "GST Rate Table",
      field: "GST Rate",
      ocrValue: "18% vs 12%",
      box: [240, 310, 160, 28]
    },
    extractedFields: [
      {
        id: "f-003-inv",
        label: "Invoice Number",
        field: "invoiceNumber",
        ocrValue: "BL/2024/041",
        confidence: 0.98,
        box: [240, 60, 140, 24]
      },
      {
        id: "f-003-gstin",
        label: "Supplier GSTIN",
        field: "vendorGSTIN",
        ocrValue: "27AABCB5521K1Z8",
        confidence: 0.99,
        box: [40, 60, 180, 24]
      },
      {
        id: "f-003-rate",
        label: "GST Tax Breakdown",
        field: "taxRate",
        ocrValue: "18% GST Rate (Tax ₹1,357.00)",
        confidence: 0.74, // Low confidence amber check!
        box: [240, 310, 160, 28]
      },
      {
        id: "f-003-total",
        label: "Invoice Gross Value",
        field: "totalAmount",
        ocrValue: "8,900.00",
        confidence: 0.96,
        box: [260, 400, 140, 26]
      }
    ]
  },
  {
    id: "rev-004",
    title: "Legal fee TDS deduction (194J)",
    meta: "Form 15H verification requested · 1 day",
    amount: "₹12,000",
    rawAmountPaise: 1200000,
    identifier: "Client query",
    booksInvoice: "TDS-194J-LEG",
    gstrInvoice: "—",
    books: "₹12,000",
    gstr: "—",
    why: "Payment of ₹12,000 to legal counsel flagged for TDS. Vendor submitted Form 15H for nil TDS deduction. Confirm PAN validity and upload on TRACES before clearing voucher.",
    category: "TDS",
    booksDate: "18/09/2024",
    confidenceScore: 0.81, // Amber check (< 0.85)
    ruleId: "SEC-194J",
    ruleName: "Section 194J & Section 197A Income Tax Act, 1961",
    ruleEffectiveDate: "01/04/2020 to Present",
    ruleVerified: true,
    assignedLedger: "Legal & Professional Fees",
    agreedFields: [
      "Payee: Adv. R. Subramanian",
      "Voucher Gross Amount: ₹12,000"
    ],
    differingFields: [
      "TDS Rate: Nil TDS (Form 15H tendered) vs Statutory 10% under 194J",
      "Verification Status: TRACES confirmation pending"
    ],
    sourceSnippet: {
      label: "Declaration Form 15H",
      field: "Nil TDS Certificate",
      ocrValue: "15H-2024-991",
      box: [80, 150, 210, 28]
    },
    extractedFields: [
      {
        id: "f-004-inv",
        label: "Fee Bill Reference",
        field: "invoiceNumber",
        ocrValue: "TDS-194J-LEG",
        confidence: 0.96,
        box: [240, 60, 140, 24]
      },
      {
        id: "f-004-total",
        label: "Professional Fee Amount",
        field: "totalAmount",
        ocrValue: "12,000.00",
        confidence: 0.95,
        box: [260, 390, 140, 26]
      },
      {
        id: "f-004-cert",
        label: "Form 15H Certificate Number",
        field: "certificateNumber",
        ocrValue: "15H-2024-991",
        confidence: 0.81, // Amber check!
        box: [80, 150, 210, 28]
      }
    ]
  },
  {
    id: "rev-005",
    title: "Rajasthan Heavy Haulage Logistics",
    meta: "Missing in GSTR-2B · ITC at risk",
    amount: "₹1,79,200",
    rawAmountPaise: 17920000,
    identifier: "27AAACR4411P1Z3",
    booksInvoice: "RHH/SEP/104",
    gstrInvoice: "Not uploaded",
    books: "₹1,79,200",
    gstr: "₹0",
    why: "Recorded in client books on 22 Sep, but vendor has NOT filed GSTR-1 for September. Under Section 16(2)(aa), ITC of ₹19,200 cannot be claimed until supplier uploads.",
    category: "MISSING_2B",
    booksDate: "22/09/2024",
    confidenceScore: 0.99,
    ruleId: "SEC-16-2-AA",
    ruleName: "Section 16(2)(aa) CGST Act & CBIC Circular 170/02/2022-GST",
    ruleEffectiveDate: "01/01/2022 to Present",
    ruleVerified: true,
    assignedLedger: "Inward Freight Charges",
    agreedFields: [
      "Supplier GSTIN: 27AAACR4411P1Z3",
      "Books Invoice Number: RHH/SEP/104"
    ],
    differingFields: [
      "GSTR-2B Status: Unfiled · Supplier return not found on GST portal",
      "ITC Availment: Ineligible under Section 16(2)(aa) until vendor files"
    ],
    sourceSnippet: {
      label: "Purchase Voucher Total",
      field: "Gross Payable",
      ocrValue: "1,79,200.00",
      box: [270, 420, 170, 30]
    },
    extractedFields: [
      {
        id: "f-005-inv",
        label: "Invoice Number",
        field: "invoiceNumber",
        ocrValue: "RHH/SEP/104",
        confidence: 0.99,
        box: [240, 60, 150, 24]
      },
      {
        id: "f-005-gstin",
        label: "Supplier GSTIN",
        field: "vendorGSTIN",
        ocrValue: "27AAACR4411P1Z3",
        confidence: 0.99,
        box: [40, 60, 180, 24]
      },
      {
        id: "f-005-total",
        label: "Gross Invoice Value",
        field: "totalAmount",
        ocrValue: "1,79,200.00",
        confidence: 0.99,
        box: [270, 420, 170, 30]
      }
    ]
  },
  {
    id: "rev-006",
    title: "Adobe Systems India Software",
    meta: "First-time vendor · Ledger assignment",
    amount: "₹34,200",
    rawAmountPaise: 3420000,
    identifier: "07AABCA3311D1ZX",
    booksInvoice: "ADBE-IN-90812",
    gstrInvoice: "ADBE-IN-90812",
    books: "₹34,200",
    gstr: "₹34,200",
    why: "First invoice from this software vendor. Requires assignment to an approved expenditure head and TDS section (194J vs 194C).",
    category: "CLASSIFICATION",
    booksDate: "25/09/2024",
    filingDate: "25/09/2024",
    confidenceScore: 0.72, // Amber check (< 0.85)
    ruleId: "SEC-194J-TECH",
    ruleName: "Section 194J(1)(b) Fee for Technical Services",
    ruleEffectiveDate: "01/04/2020 to Present",
    ruleVerified: true,
    assignedLedger: "Software Subscriptions",
    agreedFields: [
      "Invoice Amount: ₹34,200 (Paise exact)",
      "Invoice Number: ADBE-IN-90812",
      "Supplier GSTIN: 07AABCA3311D1ZX"
    ],
    differingFields: [
      "Ledger Classification: First-time vendor · New head mapping required",
      "TDS Withholding Category: 194J(1)(b) 2% Technical Fee vs 10% Professional"
    ],
    sourceSnippet: {
      label: "Description of Service",
      field: "Description of Service",
      ocrValue: "Creative Cloud for Enterprise",
      box: [40, 220, 260, 32]
    },
    extractedFields: [
      {
        id: "f-006-inv",
        label: "Invoice Number",
        field: "invoiceNumber",
        ocrValue: "ADBE-IN-90812",
        confidence: 0.97,
        box: [240, 60, 150, 24]
      },
      {
        id: "f-006-desc",
        label: "Line Item Description",
        field: "serviceDescription",
        ocrValue: "Creative Cloud for Enterprise",
        confidence: 0.72, // Amber check (< 0.85)
        box: [40, 220, 260, 32]
      },
      {
        id: "f-006-total",
        label: "Total Amount",
        field: "totalAmount",
        ocrValue: "34,200.00",
        confidence: 0.98,
        box: [260, 390, 140, 26]
      }
    ]
  },
  {
    id: "rev-007",
    title: "Gujarat Corridor Transit Tollway",
    meta: "Unverified state cess provision · Audit caution",
    amount: "₹18,400",
    rawAmountPaise: 1840000,
    identifier: "24AAACG8822K1Z5",
    booksInvoice: "TOLL/SEP/441",
    gstrInvoice: "TOLL/SEP/441",
    books: "₹18,400",
    gstr: "₹18,400",
    why: "Invoice includes state infrastructure surcharge cited under an unnotified circular draft. Per audit policy, non-promulgated rules cannot be used for tax credit conclusions.",
    category: "OTHER",
    booksDate: "27/09/2024",
    filingDate: "27/09/2024",
    confidenceScore: 0.95,
    ruleId: "CIRCULAR-UNVERIFIED-CESS",
    ruleName: "Draft State Freight Surcharge Proposal (Internal Memo)",
    ruleEffectiveDate: "Unscheduled to Open",
    ruleVerified: false, // UNVERIFIED RULE!
    assignedLedger: "Toll & State Transit Fees",
    agreedFields: [
      "Invoice Amount: ₹18,400 (Paise exact)",
      "Invoice Number: TOLL/SEP/441",
      "Toll Agency GSTIN: 24AAACG8822K1Z5"
    ],
    differingFields: [
      "Statutory Authority: Draft circular without gazette notification",
      "Audit Warning: Rule marked UNVERIFIED · Human confirmation required"
    ],
    sourceSnippet: {
      label: "Transit Toll Surcharge Note",
      field: "State Surcharge",
      ocrValue: "18,400.00",
      box: [260, 380, 150, 26]
    },
    extractedFields: [
      {
        id: "f-007-inv",
        label: "Transit Bill Number",
        field: "invoiceNumber",
        ocrValue: "TOLL/SEP/441",
        confidence: 0.97,
        box: [240, 60, 140, 24]
      },
      {
        id: "f-007-total",
        label: "Total Toll & Cess",
        field: "totalAmount",
        ocrValue: "18,400.00",
        confidence: 0.95,
        box: [260, 380, 150, 26]
      }
    ]
  },
  {
    id: "rev-008",
    title: "City Stationery Mart (Petty Cash)",
    meta: "Internal ledger adjustment · Routine",
    amount: "₹3,450",
    rawAmountPaise: 345000,
    identifier: "Cash Voucher",
    booksInvoice: "PC/2024/09/18",
    gstrInvoice: "—",
    books: "₹3,450",
    gstr: "—",
    why: "Internal office stationery purchase under ₹5,000 threshold. No GST registration for unregistered vendor; standard general ledger booking.",
    category: "OTHER",
    booksDate: "28/09/2024",
    confidenceScore: 0.99,
    ruleId: undefined, // No rule cited!
    ruleName: undefined, // No rule cited!
    ruleEffectiveDate: undefined,
    ruleVerified: false,
    assignedLedger: "Printing & Stationery Expenses",
    agreedFields: [
      "Voucher Amount: ₹3,450.00",
      "Voucher Ref: PC/2024/09/18"
    ],
    differingFields: [
      "No GST Portal Record (Unregistered petty supply)"
    ],
    sourceSnippet: {
      label: "Cash Receipt Total",
      field: "Receipt Amount",
      ocrValue: "3,450.00",
      box: [240, 360, 130, 24]
    },
    extractedFields: [
      {
        id: "f-008-inv",
        label: "Cash Memo #",
        field: "invoiceNumber",
        ocrValue: "PC/2024/09/18",
        confidence: 0.99,
        box: [240, 60, 130, 24]
      },
      {
        id: "f-008-total",
        label: "Receipt Total",
        field: "totalAmount",
        ocrValue: "3,450.00",
        confidence: 0.99,
        box: [240, 360, 130, 24]
      }
    ]
  }
,
  {
    id: "rev-009",
    title: "Tata Tele Business Services Ltd",
    meta: "Invoice number format variation · Slash vs hyphen",
    amount: "₹99,120",
    rawAmountPaise: 9912000,
    identifier: "27AAACT2727Q1ZW",
    booksInvoice: "TI/24-25/00482",
    gstrInvoice: "TI-24-25-00482",
    books: "₹99,120",
    gstr: "₹99,120",
    why: "Client books record invoice as 'TI/24-25/00482' whereas vendor filed 'TI-24-25-00482'. Amounts and GSTIN agree paise-exact. Covered under Circular 183/15/2022-GST clarifying typographical discrepancies.",
    category: "TYPO",
    booksDate: "15/09/2024",
    filingDate: "15/09/2024",
    confidenceScore: 0.96,
    ruleId: "CIRCULAR-183-TYPO",
    ruleName: "CBIC Circular 183/15/2022-GST (Typographical errors in invoice numbering)",
    ruleEffectiveDate: "27/12/2022 to Present",
    ruleVerified: true,
    assignedLedger: "Telephone & Internet Charges",
    agreedFields: [
      "Total Amount: ₹99,120 (Paise exact)",
      "Supplier GSTIN: 27AAACT2727Q1ZW",
      "Invoice Date: 15/09/2024"
    ],
    differingFields: [
      "Invoice Number: TI/24-25/00482 (Books) vs TI-24-25-00482 (Portal) · Punctuation variance"
    ],
    sourceSnippet: {
      label: "Tax Invoice Number",
      field: "Invoice Number",
      ocrValue: "TI/24-25/00482",
      box: [240, 58, 140, 24]
    },
    extractedFields: [
      {
        id: "f-009-inv",
        label: "Invoice Number",
        field: "invoiceNumber",
        ocrValue: "TI/24-25/00482",
        confidence: 0.96,
        box: [240, 58, 140, 24]
      },
      {
        id: "f-009-total",
        label: "Gross Amount",
        field: "totalAmount",
        ocrValue: "99,120.00",
        confidence: 0.98,
        box: [260, 390, 140, 26]
      }
    ]
  },
  {
    id: "rev-010",
    title: "DHL Express India Pvt Ltd",
    meta: "Timing difference · 8 days",
    amount: "₹34,500",
    rawAmountPaise: 3450000,
    identifier: "27AAACD1122M1ZQ",
    booksInvoice: "DHL/2024/441",
    gstrInvoice: "DHL/2024/441",
    books: "₹34,500",
    gstr: "₹34,500",
    why: "Invoice recorded on 10 Sep in client books, uploaded on 18 Sep in GSTR-2B. Both agree on ₹34,500 paise-exact. Filed within statutory filing window under Rule 36(4).",
    category: "TIMING",
    booksDate: "10/09/2024",
    filingDate: "18/09/2024",
    confidenceScore: 0.98,
    ruleId: "SEC-16-2-AA",
    ruleName: "Section 16(2)(aa) CGST Act, 2017 & Rule 36(4)",
    ruleEffectiveDate: "01/01/2022 to Present",
    ruleVerified: true,
    assignedLedger: "Courier & Freight Expenses",
    agreedFields: [
      "Total Amount: ₹34,500 (Paise exact)",
      "Invoice Number: DHL/2024/441",
      "Supplier GSTIN: 27AAACD1122M1ZQ"
    ],
    differingFields: [
      "Invoice Date: 10/09/2024 (Books) vs 18/09/2024 (GSTR-2B) · 8-day timing delta"
    ],
    sourceSnippet: {
      label: "Consignment Total Value",
      field: "Total Invoice Value",
      ocrValue: "34,500.00",
      box: [280, 410, 160, 28]
    },
    extractedFields: [
      {
        id: "f-010-inv",
        label: "Invoice Number",
        field: "invoiceNumber",
        ocrValue: "DHL/2024/441",
        confidence: 0.98,
        box: [240, 60, 150, 24]
      },
      {
        id: "f-010-total",
        label: "Total Amount",
        field: "totalAmount",
        ocrValue: "34,500.00",
        confidence: 0.98,
        box: [280, 410, 160, 28]
      }
    ]
  }
];
