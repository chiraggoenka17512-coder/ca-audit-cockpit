/**
 * MASTER CONTRACT - CA AUDIT & RECONCILIATION COCKPIT
 * Shared across:
 * - Part 1 (Chirag): UI Cockpit & Model Fine-Tuning Lead
 * - Part 2 (Vihaan): Data Ingestion, Synthetic Data & Evaluation
 * - Part 3 (Rajveer): Reconciliation Engine, Statutory Rules & Hash Chain
 */

export type MatchStatus = 
  | 'EXACT_MATCH'         // 100% agreement on GSTIN, Invoice #, and Amount
  | 'TIMING_DIFF'         // Matched within allowed 30-day filing window
  | 'INVOICE_TYPO'        // Fuzzy match on invoice string (e.g. / vs -)
  | 'RATE_MISMATCH'       // Tax rate discrepancy (e.g. 18% in 2B vs 12% in books)
  | 'UNMAPPED_LEDGER'     // First-time vendor needing CA ledger assignment
  | 'MISSING_IN_2B'       // In books, not in portal (ITC at risk under 16(2)(aa))
  | 'MISSING_IN_BOOKS';   // In portal, not in books (Unclaimed purchase)

export interface BookInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  vendorName: string;
  vendorGSTIN: string;
  hsnCode?: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  assignedLedger?: string;
  tdsSection?: string; // e.g. "194C", "194J", "None"
  voucherType?: 'Purchase' | 'Expense' | 'Payment';
  pdfSnippetUrl?: string; // Mock visual invoice crop
}

export interface GSTR2BRecord {
  id: string;
  supplierGSTIN: string;
  supplierTradeName: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  invoiceValue: number;
  taxableValue: number;
  integratedTax: number;
  centralTax: number;
  stateTax: number;
  filingDate: string; // YYYY-MM-DD
  itcAvailable: 'Y' | 'N';
}

export interface ReconciledItem {
  id: string;
  status: MatchStatus;
  confidenceScore: number; // 0.0 - 1.0
  bookRecord?: BookInvoice;
  portalRecord?: GSTR2BRecord;
  auditRationale: string; // Plain-language explanation for CA sign-off
  ruleCitation?: string; // e.g. "Section 16(2)(aa) CGST Act, 2017"
  differenceAmount?: number;
  isApproved: boolean;
  learnedFromFirmMemory?: boolean;
}

export interface FirmPreference {
  vendorPattern: string;    // e.g. "ADOBE*SYSTEMS"
  assignedLedger: string;   // e.g. "Software Subscriptions"
  tdsSection: string;       // e.g. "194J"
  lastUpdated: number;
  overrideCount: number;
}

export interface AuditBlock {
  index: number;
  timestamp: string;
  action: string;           // e.g. "BATCH_APPROVED", "LEDGER_OVERRIDE"
  actor: string;            // e.g. "Chirag (Audit Partner)"
  recordIds: string[];
  previousHash: string;
  blockHash: string;
}

export interface TelemetryMetrics {
  totalInvoices: number;
  totalTurnover: number;
  exactMatchedCount: number;
  exceptionCount: number;
  itcAtRiskAmount: number;
  networkBytesOut: number; // Strictly 0 for air-gap proof
}
