import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseToPaise,
  formatPaiseToINR,
  calculateStringSimilarity,
  dateDiffDays,
  normalizeInvoiceNumber,
  reconcileDatasets,
  computeReconciliationSummary
} from '../src/engine/reconciliation';
import { BookInvoice, GSTR2BRecord } from '../src/types';

describe('Flow 5: Side-by-Side Deterministic Reconciliation Engine', () => {
  // Test 1: Integer Paise Arithmetic & Foundation
  it('computes amounts strictly in integer paise without floating point inaccuracy', () => {
    assert.equal(parseToPaise(53100.00), 5310000);
    assert.equal(parseToPaise(1.00), 100);
    assert.equal(parseToPaise(0.01), 1);
    assert.equal(parseToPaise(0.00), 0);
    assert.equal(parseToPaise('₹ 53,100.00'), 5310000);
    assert.equal(parseToPaise('Rs 40,000.00'), 4000000);
    assert.equal(parseToPaise('40,000'), 4000000);
    assert.equal(parseToPaise('128000.50'), 12800050);

    // Rounding safety
    assert.equal(parseToPaise(19.999), 2000);
    assert.equal(parseToPaise(19.991), 1999);

    // Formatter back to INR
    assert.equal(formatPaiseToINR(5310000), '₹ 53,100.00');
    assert.equal(formatPaiseToINR(12800050), '₹ 1,28,000.50');
    assert.equal(formatPaiseToINR(100), '₹ 1.00');
  });

  // Test 2: Stage 1 (Exact Match)
  it('executes Stage 1 exact match (GSTIN + Invoice Number + Amount in paise + Date exact)', () => {
    const books: BookInvoice[] = [
      {
        id: 'book-e1',
        invoiceNumber: 'INF/24/0912',
        invoiceDate: '2024-09-02',
        vendorName: 'Infosys BPM Limited',
        vendorGSTIN: '29AAACI4798L1ZU',
        taxableValue: 250000.00,
        cgst: 22500.00,
        sgst: 22500.00,
        igst: 0.00,
        totalAmount: 295000.00
      }
    ];

    const portal: GSTR2BRecord[] = [
      {
        id: 'portal-e1',
        supplierGSTIN: '29AAACI4798L1ZU',
        supplierTradeName: 'INFOSYS BPM LIMITED',
        invoiceNumber: 'INF/24/0912',
        invoiceDate: '2024-09-02',
        invoiceValue: 295000.00,
        taxableValue: 250000.00,
        integratedTax: 0.00,
        centralTax: 22500.00,
        stateTax: 22500.00,
        filingDate: '2024-10-05',
        itcAvailable: 'Y'
      }
    ];

    const results = reconcileDatasets(books, portal);
    assert.equal(results.length, 1);
    const item = results[0];
    assert.equal(item.status, 'EXACT_MATCH');
    assert.equal(item.confidenceScore, 1.0);
    assert.equal(item.matchRule, 'Exact 1:1 Match');
    assert.equal(item.differencePaise, 0);
    assert.equal(item.differenceAmount, 0);
    assert.equal(item.isApproved, true);
    assert.ok(item.auditRationale.includes('100% Deterministic Agreement'));
  });

  // Test 3: Stage 2 (Relaxed Match: Date within 30 days & ±100 paise rounding tolerance)
  it('executes Stage 2 relaxed match for date within 30-day window and amount within 100 paise', () => {
    const books: BookInvoice[] = [
      // 3a. Date drift within 30 days (5 days delta)
      {
        id: 'book-timing',
        invoiceNumber: 'INV/2024/891',
        invoiceDate: '2024-09-12',
        vendorName: 'Blue Dart Express Limited',
        vendorGSTIN: '27AAACB0446L1ZS',
        taxableValue: 45000.00,
        cgst: 4050.00,
        sgst: 4050.00,
        igst: 0.00,
        totalAmount: 53100.00
      },
      // 3b. Rounding tolerance within ±100 paise (50 paise delta)
      {
        id: 'book-round',
        invoiceNumber: 'GB/24/9901',
        invoiceDate: '2024-09-14',
        vendorName: 'Godrej & Boyce Mfg Co Ltd',
        vendorGSTIN: '27AABCG1122K1Z9',
        taxableValue: 108475.00,
        cgst: 9762.75,
        sgst: 9762.75,
        igst: 0.00,
        totalAmount: 128000.50 // 12800050 paise
      }
    ];

    const portal: GSTR2BRecord[] = [
      {
        id: 'portal-timing',
        supplierGSTIN: '27AAACB0446L1ZS',
        supplierTradeName: 'BLUE DART EXPRESS LIMITED',
        invoiceNumber: 'INV/2024/891',
        invoiceDate: '2024-09-07', // 5 days earlier in 2B
        invoiceValue: 53100.00,
        taxableValue: 45000.00,
        integratedTax: 0.00,
        centralTax: 4050.00,
        stateTax: 4050.00,
        filingDate: '2024-10-10',
        itcAvailable: 'Y'
      },
      {
        id: 'portal-round',
        supplierGSTIN: '27AABCG1122K1Z9',
        supplierTradeName: 'GODREJ & BOYCE MFG CO LTD',
        invoiceNumber: 'GB/24/9901',
        invoiceDate: '2024-09-14',
        invoiceValue: 128000.00, // 50 paise discrepancy (within 100 paise)
        taxableValue: 108474.58,
        integratedTax: 0.00,
        centralTax: 9762.71,
        stateTax: 9762.71,
        filingDate: '2024-10-10',
        itcAvailable: 'Y'
      }
    ];

    const results = reconcileDatasets(books, portal);
    assert.equal(results.length, 2);

    const timingItem = results.find(r => r.bookRecord?.id === 'book-timing');
    assert.ok(timingItem);
    assert.equal(timingItem.status, 'TIMING_DIFF');
    assert.equal(timingItem.confidenceScore, 0.90);
    assert.ok(timingItem.matchRule?.includes('Relaxed Date Match (5d delta)'));
    assert.equal(timingItem.differencePaise, 0);

    const roundItem = results.find(r => r.bookRecord?.id === 'book-round');
    assert.ok(roundItem);
    assert.equal(roundItem.status, 'RELAXED_MATCH');
    assert.equal(roundItem.confidenceScore, 0.90);
    assert.equal(roundItem.differencePaise, 50);
    assert.ok(roundItem.matchRule?.includes('±50p delta'));
  });

  // Test 4: Stage 3 (Fuzzy Party Name via Levenshtein strsim)
  it('executes Stage 3 fuzzy party matching when amount and GSTIN are strictly exact and similarity > 0.82', () => {
    const books: BookInvoice[] = [
      {
        id: 'book-fuzzy-party',
        invoiceNumber: 'BHEL/BPL/5510',
        invoiceDate: '2024-09-20',
        vendorName: 'Bharat Heavy Electricals Limited',
        vendorGSTIN: '23AAACB2233M1Z1',
        taxableValue: 207627.12,
        cgst: 18686.44,
        sgst: 18686.44,
        igst: 0.00,
        totalAmount: 245000.00 // 24500000 paise
      }
    ];

    const portal: GSTR2BRecord[] = [
      {
        id: 'portal-fuzzy-party',
        supplierGSTIN: '23AAACB2233M1Z1',
        supplierTradeName: 'Bharat Heavy Electricals Ltd', // "Limited" vs "Ltd" -> similarity ~ 0.86
        invoiceNumber: 'BHEL/BPL/5510',
        invoiceDate: '2024-09-20',
        invoiceValue: 245000.00, // strictly exact paise
        taxableValue: 207627.12,
        integratedTax: 0.00,
        centralTax: 18686.44,
        stateTax: 18686.44,
        filingDate: '2024-10-10',
        itcAvailable: 'Y'
      }
    ];

    const sim = calculateStringSimilarity(books[0].vendorName, portal[0].supplierTradeName);
    assert.ok(sim > 0.82, `Expected similarity > 0.82, got ${sim}`);

    const results = reconcileDatasets(books, portal);
    assert.equal(results.length, 1);
    const item = results[0];
    assert.equal(item.status, 'FUZZY_PARTY');
    assert.equal(item.confidenceScore, 0.85);
    assert.ok(item.matchRule?.includes('Fuzzy Party Match'));
    assert.equal(item.differencePaise, 0);
  });

  // Test 5: Prohibited fuzzy matching on Amount, GSTIN, or Invoice Number
  it('strictly prohibits fuzzy matching on amounts, GSTINs, or invoice numbers', () => {
    // 5a. Amounts differ by ₹500 (50000 paise) -> Must NOT match as fuzzy amount!
    const booksAmountDiff: BookInvoice[] = [
      {
        id: 'book-amt-diff',
        invoiceNumber: 'INV/2024/999',
        invoiceDate: '2024-09-18',
        vendorName: 'Kolkata Precision Tools Pvt Ltd',
        vendorGSTIN: '19AABCK9901M1Z4',
        taxableValue: 120000.00,
        cgst: 7200.00,
        sgst: 7200.00,
        igst: 0.00,
        totalAmount: 134400.00 // 12% GST
      }
    ];

    const portalAmountDiff: GSTR2BRecord[] = [
      {
        id: 'portal-amt-diff',
        supplierGSTIN: '19AABCK9901M1Z4',
        supplierTradeName: 'KOLKATA PRECISION TOOLS PVT LTD',
        invoiceNumber: 'INV/2024/999',
        invoiceDate: '2024-09-18',
        invoiceValue: 141600.00, // 18% GST (discrepancy of ₹7,200)
        taxableValue: 120000.00,
        integratedTax: 0.00,
        centralTax: 10800.00,
        stateTax: 10800.00,
        filingDate: '2024-10-09',
        itcAvailable: 'Y'
      }
    ];

    const results = reconcileDatasets(booksAmountDiff, portalAmountDiff);
    assert.equal(results.length, 1);
    const item = results[0];
    assert.equal(item.status, 'RATE_MISMATCH');
    assert.equal(item.differencePaise, 720000);
    assert.equal(item.differenceAmount, 7200);
    assert.equal(item.isApproved, false);

    // 5b. GSTIN differs by 1 character -> Must NOT match
    const booksGstinDiff: BookInvoice[] = [{
      ...booksAmountDiff[0],
      totalAmount: 141600.00,
      vendorGSTIN: '19AABCK9901M1Z4'
    }];
    const portalGstinDiff: GSTR2BRecord[] = [{
      ...portalAmountDiff[0],
      supplierGSTIN: '19AABCK9901M1Z5' // Last digit differs
    }];

    const gstinResults = reconcileDatasets(booksGstinDiff, portalGstinDiff);
    // Should be segregated into Missing in 2B and Missing in Books
    assert.equal(gstinResults.length, 2);
    assert.ok(gstinResults.some(r => r.status === 'MISSING_IN_2B'));
    assert.ok(gstinResults.some(r => r.status === 'MISSING_IN_BOOKS'));
  });

  // Test 6: Match Suggestions (Amber Banner, Confidence < 0.85)
  it('flags invoice delimiter differences as suggestions requiring explicit CA confirmation', () => {
    const books: BookInvoice[] = [
      {
        id: 'book-typo',
        invoiceNumber: 'TI/24-25/00482',
        invoiceDate: '2024-09-15',
        vendorName: 'Tata Tele Business Services Ltd',
        vendorGSTIN: '27AAACT2727Q1ZW',
        taxableValue: 84000.00,
        cgst: 7560.00,
        sgst: 7560.00,
        igst: 0.00,
        totalAmount: 99120.00
      }
    ];

    const portal: GSTR2BRecord[] = [
      {
        id: 'portal-typo',
        supplierGSTIN: '27AAACT2727Q1ZW',
        supplierTradeName: 'TATA TELE BUSINESS SERVICES LTD',
        invoiceNumber: 'TI-24-25-00482', // Hyphen vs Slash delimiter
        invoiceDate: '2024-09-15',
        invoiceValue: 99120.00,
        taxableValue: 84000.00,
        integratedTax: 0.00,
        centralTax: 7560.00,
        stateTax: 7560.00,
        filingDate: '2024-10-11',
        itcAvailable: 'Y'
      }
    ];

    const results = reconcileDatasets(books, portal);
    assert.equal(results.length, 1);
    const item = results[0];
    assert.equal(item.status, 'INVOICE_TYPO');
    assert.ok(item.confidenceScore < 0.85, 'Suggestions must carry confidence < 0.85');
    assert.equal(item.isApproved, false, 'Suggestions must require explicit CA sign-off');
    assert.equal(item.matchRule, 'Invoice Delimiter Typo Suggestion');
  });

  // Test 7: Section 16(2)(aa) ITC Ineligibility (Missing in GSTR-2B)
  it('correctly calculates at-risk ITC when invoice is missing in supplier GSTR-2B', () => {
    const books: BookInvoice[] = [
      {
        id: 'book-missing-2b',
        invoiceNumber: 'RAJ/INV/772',
        invoiceDate: '2024-09-22',
        vendorName: 'Rajasthan Heavy Haulage Logistics',
        vendorGSTIN: '08AAECR3344K1ZF',
        taxableValue: 160000.00,
        cgst: 0.00,
        sgst: 0.00,
        igst: 19200.00,
        totalAmount: 179200.00
      }
    ];

    const results = reconcileDatasets(books, []);
    assert.equal(results.length, 1);
    const item = results[0];
    assert.equal(item.status, 'MISSING_IN_2B');
    assert.equal(item.differenceAmount, 19200.00);
    assert.equal(item.differencePaise, 1920000);
    assert.ok(item.ruleCitation?.includes('Section 16(2)(aa)'));
  });

  // Test 8: Deterministic Reproducibility
  it('produces byte-for-byte identical output across 50 consecutive runs', () => {
    const books: BookInvoice[] = [
      {
        id: 'b1',
        invoiceNumber: 'INV-101',
        invoiceDate: '2024-09-01',
        vendorName: 'Alpha Corp',
        vendorGSTIN: '27AAAAA0000A1Z5',
        taxableValue: 10000,
        cgst: 900,
        sgst: 900,
        igst: 0,
        totalAmount: 11800
      },
      {
        id: 'b2',
        invoiceNumber: 'INV-102',
        invoiceDate: '2024-09-05',
        vendorName: 'Beta Corp',
        vendorGSTIN: '27BBBBB1111B1Z6',
        taxableValue: 20000,
        cgst: 1800,
        sgst: 1800,
        igst: 0,
        totalAmount: 23600
      }
    ];

    const portal: GSTR2BRecord[] = [
      {
        id: 'p1',
        supplierGSTIN: '27AAAAA0000A1Z5',
        supplierTradeName: 'ALPHA CORP',
        invoiceNumber: 'INV-101',
        invoiceDate: '2024-09-01',
        invoiceValue: 11800,
        taxableValue: 10000,
        integratedTax: 0,
        centralTax: 900,
        stateTax: 900,
        filingDate: '2024-10-10',
        itcAvailable: 'Y'
      }
    ];

    const baseRun = JSON.stringify(reconcileDatasets(books, portal));
    for (let i = 0; i < 50; i++) {
      const run = JSON.stringify(reconcileDatasets(books, portal));
      assert.equal(run, baseRun, `Run ${i} diverged from base deterministic output`);
    }
  });

  // Test 9: Summary Statistics Computation
  it('computes accurate batch summary metrics in paise and rupees', () => {
    const books: BookInvoice[] = [
      {
        id: 'b1',
        invoiceNumber: 'INV-01',
        invoiceDate: '2024-09-01',
        vendorName: 'Vendor 1',
        vendorGSTIN: '27AAAAA0000A1Z1',
        taxableValue: 10000,
        cgst: 900,
        sgst: 900,
        igst: 0,
        totalAmount: 11800
      },
      {
        id: 'b2',
        invoiceNumber: 'INV-02',
        invoiceDate: '2024-09-05',
        vendorName: 'Vendor 2',
        vendorGSTIN: '27BBBBB0000B1Z2',
        taxableValue: 20000,
        cgst: 1800,
        sgst: 1800,
        igst: 0,
        totalAmount: 23600
      }
    ];

    const portal: GSTR2BRecord[] = [
      {
        id: 'p1',
        supplierGSTIN: '27AAAAA0000A1Z1',
        supplierTradeName: 'VENDOR 1',
        invoiceNumber: 'INV-01',
        invoiceDate: '2024-09-01',
        invoiceValue: 11800,
        taxableValue: 10000,
        integratedTax: 0,
        centralTax: 900,
        stateTax: 900,
        filingDate: '2024-10-10',
        itcAvailable: 'Y'
      }
    ];

    const results = reconcileDatasets(books, portal);
    const summary = computeReconciliationSummary(books, portal, results);

    assert.equal(summary.totalBooksCount, 2);
    assert.equal(summary.totalBooksPaise, 3540000); // 11800 + 23600 = 35400.00
    assert.equal(summary.totalPortalCount, 1);
    assert.equal(summary.totalPortalPaise, 1180000);
    assert.equal(summary.matchedCount, 1);
    assert.equal(summary.matchedPaise, 1180000);
    assert.equal(summary.unmatchedExceptionsCount, 1);
    assert.equal(summary.atRiskItcPaise, 360000); // 1800 + 1800 = 3600.00
    assert.equal(summary.atRiskItcRupees, 3600);
  });

  // Test 10: Static Code Audit - Zero AI Design Slop for ReconciliationView.tsx
  it('verifies Zero AI Design Slop compliance in ReconciliationView.tsx', () => {
    const viewPath = path.resolve('src/components/views/ReconciliationView.tsx');
    const code = fs.readFileSync(viewPath, 'utf-8');

    // Rule 1: No rounded-full chip bubbles or pills
    assert.ok(!code.includes('rounded-full'), 'ReconciliationView must NOT contain rounded-full pills or tags');

    // Rule 2: No decorative italics
    assert.ok(!code.includes('italic'), 'ReconciliationView must NOT contain decorative italics');

    // Rule 3: Clean sans-serif only, no pretentious serifs
    assert.ok(!code.includes('font-serif'), 'Clean sans-serif only, no serif');
    assert.ok(!code.includes('serif'), 'Clean sans-serif only');

    // Rule 4: No negative tracking
    assert.ok(!code.includes('tracking-tight'), 'ReconciliationView must NOT contain tracking-tight');
    assert.ok(!code.includes('tracking-[-'), 'ReconciliationView must NOT contain negative tracking');

    // Rule 17: Numbers and dates must use tabular-nums
    assert.ok(code.includes('tabular-nums'), 'Numbers must use tabular-nums');

    // Rule 20: No periods at the end of titles
    assert.ok(!code.includes('Reconciliation.'), 'No trailing periods in title');

    // Green line styling for reconciled pairs
    assert.ok(code.includes('bg-emerald-950/20') || code.includes('text-emerald-400'), 'Must use emerald theme for reconciled lines');

    // Amber banner for suggestions (< 0.85)
    assert.ok(code.includes('amber'), 'Must provide amber styling for suggestions');
  });
});
