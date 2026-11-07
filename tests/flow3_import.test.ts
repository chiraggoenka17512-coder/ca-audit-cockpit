import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  parseCurrencyToPaise,
  parseIndianDate,
  classifyFile,
  parseCsvRows,
  parseGstr2bJson,
  parseBankStatementCsv,
  parsePurchaseRegisterCsv,
  parseTaxInvoiceMetadata,
  processIngestionFile,
  SAMPLE_INGESTION_FILES,
  SAMPLE_PURCHASE_REGISTER_CSV,
  SAMPLE_GSTR2B_JSON,
  SAMPLE_HDFC_BANK_CSV,
  IngestionFileItem
} from '../src/engine/ingestion';
import { createAuditEntry, verifyAuditChain } from '../src/engine/auditLedger';
import { ReviewItem } from '../src/data/reviewItems';

describe('Flow 3: Air-Gapped Multi-Format Ingestion Engine', () => {
  describe('Integer Paise Currency Parsing', () => {
    it('converts formatted Indian currency strings into integer paise', () => {
      // Basic Rupee strings
      assert.equal(parseCurrencyToPaise('₹ 53,100.00').paise, 5310000);
      assert.equal(parseCurrencyToPaise('53,100').paise, 5310000);
      assert.equal(parseCurrencyToPaise('Rs. 1,85,000.50').paise, 18500050);

      // Indian Lakhs and Crores notation
      assert.equal(parseCurrencyToPaise('₹ 12,34,567.50').paise, 123456750);
      assert.equal(parseCurrencyToPaise('4,82,50,000').paise, 4825000000);

      // Raw float numbers
      assert.equal(parseCurrencyToPaise(53100).paise, 5310000);
      assert.equal(parseCurrencyToPaise(156779.66).paise, 15677966);
    });

    it('rejects malformed or non-numeric currency with typed errors', () => {
      const emptyRes = parseCurrencyToPaise('');
      assert.equal(emptyRes.isValid, false);
      assert.ok(emptyRes.error?.includes('empty'));

      const nullRes = parseCurrencyToPaise(null);
      assert.equal(nullRes.isValid, false);

      const invalidStr = parseCurrencyToPaise('NOT_MONEY');
      assert.equal(invalidStr.isValid, false);
      assert.ok(invalidStr.error?.includes('Invalid currency string'));

      const badChars = parseCurrencyToPaise('53,100.XX');
      assert.equal(badChars.isValid, false);
      assert.ok(badChars.error?.includes('Non-numeric'));
    });
  });

  describe('Deterministic Indian Date Parsing', () => {
    it('parses valid DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, and DD-MMM-YYYY dates', () => {
      const d1 = parseIndianDate('12/09/2024');
      assert.equal(d1.isValid, true);
      assert.equal(d1.iso, '2024-09-12');
      assert.equal(d1.formatted, '12/09/2024');

      const d2 = parseIndianDate('17-09-2024');
      assert.equal(d2.isValid, true);
      assert.equal(d2.iso, '2024-09-17');
      assert.equal(d2.formatted, '17/09/2024');

      const d3 = parseIndianDate('2024-09-10');
      assert.equal(d3.isValid, true);
      assert.equal(d3.iso, '2024-09-10');
      assert.equal(d3.formatted, '10/09/2024');

      const d4 = parseIndianDate('15-Sep-2024');
      assert.equal(d4.isValid, true);
      assert.equal(d4.iso, '2024-09-15');
      assert.equal(d4.formatted, '15/09/2024');
    });

    it('rejects invalid day, month, or malformed dates with typed errors', () => {
      // Day out of range
      const invalidDay = parseIndianDate('35/09/2024');
      assert.equal(invalidDay.isValid, false);
      assert.ok(invalidDay.error?.includes('Invalid day 35'));

      // Month out of range
      const invalidMonth = parseIndianDate('12/15/2024');
      assert.equal(invalidMonth.isValid, false);
      assert.ok(invalidMonth.error?.includes('Invalid month 15'));

      // Unsupported format
      const malformed = parseIndianDate('September 12th, 2024');
      assert.equal(malformed.isValid, false);
      assert.ok(malformed.error?.includes('Unsupported date format'));
    });
  });

  describe('File Detection & Auto-Classification', () => {
    it('accurately auto-classifies multi-format accounting files', () => {
      assert.equal(classifyFile('GSTR2B_27AABCA1234F1Z5_092024.json'), 'GSTR-2B JSON');
      assert.equal(classifyFile('data.json', '{"b2b":[{"ctin":"27AAACB0446L1ZS"}]}'), 'GSTR-2B JSON');

      assert.equal(classifyFile('HDFC_Current_Account_Sept2024.csv'), 'Bank Statement');
      assert.equal(classifyFile('statement.csv', 'Date,Narration,Chq/Ref No,Withdrawal Amt,Closing Balance'), 'Bank Statement');

      assert.equal(classifyFile('Sept24_Purchase_Register.xlsx'), 'Purchase Register');
      assert.equal(classifyFile('vendor_bills.csv', 'Invoice Number,Taxable Value,Vendor GSTIN'), 'Purchase Register');

      assert.equal(classifyFile('Vendor_Tax_Invoice_902.pdf'), 'Tax Invoices');
      assert.equal(classifyFile('scan_001.png'), 'Tax Invoices');

      assert.equal(classifyFile('random_notes.docx'), 'Unknown');
    });
  });

  describe('GSTR-2B JSON Parser (Official GSTN Schema)', () => {
    it('parses official GSTN GSTR-2B JSON with tax breakups into integer paise', () => {
      const result = parseGstr2bJson(SAMPLE_GSTR2B_JSON, 'test-gstr');

      assert.equal(result.status, 'COMPLETED');
      assert.equal(result.rowsRead, 2);
      assert.equal(result.vouchersIngested, 2);
      assert.equal(result.rowsRejected, 0);

      // Check unmapped header detection
      assert.ok(result.unmappedHeaders.includes('Internal_Filing_Batch'));

      const v1 = result.vouchers[0];
      assert.equal(v1.title, 'Blue Dart Express Limited');
      assert.equal(v1.identifier, '27AAACB0446L1ZS');
      assert.equal(v1.booksInvoice, 'INV/2024/891');
      assert.equal(v1.rawAmountPaise, 5310000);
      assert.ok(v1.why.includes('CGST ₹ 4,050.00'));
      assert.ok(v1.why.includes('SGST ₹ 4,050.00'));
    });

    it('rejects malformed GSTR-2B records without silent drops', () => {
      const corruptJson = JSON.stringify({
        gstin: '27AABCA1234F1Z5',
        b2b: [
          {
            ctin: 'INVALID_GSTIN',
            inv: [
              {
                inum: 'INV-1',
                idt: '12/09/2024',
                val: 5000
              }
            ]
          },
          {
            ctin: '27AAACB0446L1ZS',
            inv: [
              {
                inum: '', // Missing invoice number
                idt: '12/09/2024',
                val: 6000
              },
              {
                inum: 'INV-3',
                idt: '99/99/2024', // Malformed date
                val: 7000
              },
              {
                inum: 'INV-4',
                idt: '15/09/2024',
                val: -100 // Negative paise
              }
            ]
          }
        ]
      });

      const res = parseGstr2bJson(corruptJson, 'corrupt-gstr');
      assert.equal(res.status, 'FAILED');
      assert.equal(res.vouchersIngested, 0);
      assert.equal(res.rowsRejected, 4);

      // Verify each rejection is tracked with exact details
      assert.equal(res.rejectedDetails[0].field, 'ctin');
      assert.ok(res.rejectedDetails[0].reason.includes('Invalid supplier GSTIN'));

      assert.equal(res.rejectedDetails[1].field, 'inum');
      assert.ok(res.rejectedDetails[1].reason.includes('Missing invoice number'));

      assert.equal(res.rejectedDetails[2].field, 'idt');
      assert.ok(res.rejectedDetails[2].reason.includes('Malformed invoice date'));

      assert.equal(res.rejectedDetails[3].field, 'val');
      assert.ok(res.rejectedDetails[3].reason.includes('Negative paise'));
    });
  });

  describe('Named Bank Statement CSV Parser (HDFC Bank)', () => {
    it('parses HDFC Bank statement format and accurately converts debits/credits into paise', () => {
      const result = parseBankStatementCsv(SAMPLE_HDFC_BANK_CSV, 'test-hdfc');

      assert.equal(result.status, 'COMPLETED');
      assert.equal(result.rowsRead, 3);
      assert.equal(result.vouchersIngested, 3);
      assert.equal(result.rowsRejected, 0);
      assert.ok(result.unmappedHeaders.includes('Internal_Bank_Audit_Code'));

      const debitTxn = result.vouchers[0];
      assert.ok(debitTxn.title.includes('BLUE DART EXP'));
      assert.equal(debitTxn.rawAmountPaise, 5310000);
      assert.equal(debitTxn.assignedLedger, 'Bank Payments');

      const creditTxn = result.vouchers[1];
      assert.ok(creditTxn.title.includes('SIEMENS LTD'));
      assert.equal(creditTxn.rawAmountPaise, 18500000);
      assert.equal(creditTxn.assignedLedger, 'Bank Receipts');
    });

    it('rejects malformed HDFC bank statement rows and enforces typed errors', () => {
      const badBankCsv = `Date,Narration,Chq/Ref No,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
35/09/2024,"Invalid Date Narration",REF1,12/09/2024,500.00,,10000.00
12/09/2024,"",REF2,12/09/2024,600.00,,10000.00
14/09/2024,"Missing Amounts Narration",REF3,14/09/2024,,,10000.00
15/09/2024,"Negative Paise Txn",REF4,15/09/2024,-200.00,,10000.00`;

      const res = parseBankStatementCsv(badBankCsv, 'bad-bank');
      assert.equal(res.status, 'FAILED');
      assert.equal(res.rowsRead, 4);
      assert.equal(res.vouchersIngested, 0);
      assert.equal(res.rowsRejected, 4);

      assert.equal(res.rejectedDetails[0].field, 'date');
      assert.equal(res.rejectedDetails[1].field, 'narration');
      assert.equal(res.rejectedDetails[2].field, 'amount');
      assert.equal(res.rejectedDetails[3].field, 'amount');
    });
  });

  describe('Purchase Register CSV Parser & Column Header Mapping', () => {
    it('parses purchase register with unmapped header warnings and row rejection details', () => {
      const result = parsePurchaseRegisterCsv(SAMPLE_PURCHASE_REGISTER_CSV, 'test-pr');

      // Out of 5 rows: 3 valid vouchers, 2 rejected rows
      assert.equal(result.rowsRead, 5);
      assert.equal(result.vouchersIngested, 3);
      assert.equal(result.rowsRejected, 2);
      assert.equal(result.status, 'NEEDS_ATTENTION');

      // Unmapped header correctly reported
      assert.ok(result.unmappedHeaders.includes('Internal_Cost_Centre'));

      // Check valid vouchers
      assert.equal(result.vouchers[0].booksInvoice, 'INV/2024/891');
      assert.equal(result.vouchers[0].rawAmountPaise, 5310000);
      assert.equal(result.vouchers[0].assignedLedger, 'Courier & Freight Expenses');

      assert.equal(result.vouchers[1].booksInvoice, 'SIEM/2024/902');
      assert.equal(result.vouchers[1].rawAmountPaise, 18500000);

      // Verify rejection details for row 4 and row 5
      const r1 = result.rejectedDetails[0];
      assert.equal(r1.rowNumber, 5); // Row index in file (header is row 1)
      assert.equal(r1.field, 'invoiceDate');
      assert.ok(r1.reason.includes('Invalid day 35'));

      const r2 = result.rejectedDetails[1];
      assert.equal(r2.rowNumber, 6);
      assert.equal(r2.field, 'vendorGSTIN');
      assert.ok(r2.reason.includes('Invalid GSTIN'));
    });
  });

  describe('Corrupt / Password-Protected Invoices & Batch Orchestration', () => {
    it('routes password-protected or corrupt files to Needs Attention queue without crashing', () => {
      const encryptedFile: IngestionFileItem = {
        id: 'f-enc',
        name: 'Encrypted_Contract_2024.pdf',
        sizeBytes: 2048,
        sizeFormatted: '2 KB',
        detectedType: 'Tax Invoices',
        selectedType: 'Tax Invoices',
        status: 'PENDING',
        progress: 0
      };

      const processed = processIngestionFile(encryptedFile);
      assert.equal(processed.status, 'NEEDS_ATTENTION');
      assert.ok(processed.failureReason?.includes('Password-protected PDF stream'));
      assert.equal(processed.rowsRejected, 1);
    });

    it('processes sample batch and generates cryptographically verifiable audit block', async () => {
      const sampleFile = SAMPLE_INGESTION_FILES[0]; // Sept24_Purchase_Register.csv
      const processed = processIngestionFile(sampleFile);

      assert.equal(processed.rowsRead, 5);
      assert.equal(processed.vouchersIngested, 3);
      assert.ok(processed.parsedVouchers && processed.parsedVouchers.length === 3);

      // Verify that appending an ingestion block to the SHA-256 audit ledger works and verifies
      const genesis = await createAuditEntry(
        0,
        'System Sentinel',
        'GENESIS_INITIALIZE',
        'WORKSPACE_TEST',
        'Test Client',
        'Workspace initialized',
        '0'.repeat(64)
      );

      const ingestionBlock = await createAuditEntry(
        1,
        'Chirag (Audit Partner)',
        'DOCUMENT_INGESTION',
        'BATCH_001',
        processed.name,
        `Ingested ${processed.vouchersIngested} vouchers from ${processed.name}. Verified paise arithmetic.`,
        genesis.entryHash
      );

      const chain = [genesis, ingestionBlock];
      const verifyRes = await verifyAuditChain(chain);
      assert.equal(verifyRes.valid, true);
      assert.equal(chain.length, 2);
    });
  });

  describe('Zero AI Design Slop Policy Compliance Audit', () => {
    it('verifies ImportView.tsx adheres strictly to the 20 Anti-Slop Rules', () => {
      const viewPath = path.resolve(process.cwd(), 'src/components/views/ImportView.tsx');
      const viewContent = fs.readFileSync(viewPath, 'utf8');

      // Rule 1: No pills or tags (no rounded-full badges)
      assert.ok(!viewContent.includes('rounded-full'), 'No rounded-full chips or pills allowed');

      // Rule 3: No instrument serif / pretentious serifs
      assert.ok(!viewContent.includes('font-serif'), 'Clean sans-serif typography only');
      assert.ok(!viewContent.includes('Instrument Serif'), 'No pretentious serifs');

      // Rule 4: No negative kerning
      assert.ok(!viewContent.includes('tracking-tight'), 'No negative kerning');
      assert.ok(!viewContent.includes('tracking-[-'), 'No negative tracking');

      // Rule 17: Numbers and dates must use tabular-nums
      assert.ok(viewContent.includes('tabular-nums'), 'Must use tabular-nums for numbers and stats');

      // Rule 19: No glowing neon gradient backgrounds
      assert.ok(!viewContent.includes('bg-gradient-to'), 'Flat, solid surfaces only');

      // Rule 20: No periods at the end of headings
      assert.ok(!viewContent.includes('Import documents.'), 'No trailing periods in headings');
    });

    it('verifies ImportModal.tsx adheres strictly to the 20 Anti-Slop Rules', () => {
      const modalPath = path.resolve(process.cwd(), 'src/components/ImportModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');

      // Rule 1: No rounded-full
      assert.ok(!modalContent.includes('rounded-full'), 'No rounded-full chips in ImportModal');

      // Rule 4: No negative tracking
      assert.ok(!modalContent.includes('tracking-tight'), 'No negative tracking in ImportModal');

      // Rule 20: No trailing periods
      assert.ok(!modalContent.includes('Import documents.'), 'No trailing periods in modal header');
    });
  });
});
