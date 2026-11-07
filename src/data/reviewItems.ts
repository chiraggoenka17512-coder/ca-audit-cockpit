export interface SourceSnippet {
  label: string;
  field: string;
  ocrValue: string;
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
    sourceSnippet: {
      label: "Invoice Amount Box",
      field: "Total Invoice Value",
      ocrValue: "53,100.00",
      box: [320, 480, 140, 26]
    }
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
    sourceSnippet: {
      label: "Consignment Note #882",
      field: "Consignment Total",
      ocrValue: "24,500.00",
      box: [120, 240, 180, 30]
    }
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
    sourceSnippet: {
      label: "Tax Breakdown Table",
      field: "GST Rate",
      ocrValue: "18% vs 12%",
      box: [280, 360, 150, 32]
    }
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
    confidenceScore: 0.81, // Amber check
    ruleId: "SEC-194J",
    ruleName: "Section 194J & Section 197A Income Tax Act, 1961",
    ruleEffectiveDate: "01/04/2020 to Present",
    ruleVerified: true,
    assignedLedger: "Legal & Professional Fees",
    sourceSnippet: {
      label: "Declaration Form 15H",
      field: "Nil TDS Certificate",
      ocrValue: "15H-2024-991",
      box: [80, 150, 210, 28]
    }
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
    sourceSnippet: {
      label: "Purchase Voucher",
      field: "Gross Payable",
      ocrValue: "1,79,200.00",
      box: [310, 520, 160, 30]
    }
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
    confidenceScore: 0.72, // Amber check
    ruleId: "SEC-194J-TECH",
    ruleName: "Section 194J(1)(b) Fee for Technical Services",
    ruleEffectiveDate: "01/04/2020 to Present",
    ruleVerified: true,
    assignedLedger: "Software Subscriptions",
    sourceSnippet: {
      label: "SaaS Subscription Tax Invoice",
      field: "Description of Service",
      ocrValue: "Creative Cloud for Enterprise",
      box: [90, 190, 240, 35]
    }
  }
];
