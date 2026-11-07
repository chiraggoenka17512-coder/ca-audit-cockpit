import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { 
  INITIAL_REVIEW_ITEMS, 
  ReviewItem 
} from '../src/data/reviewItems.ts';
import { 
  AuditEntry, 
  createAuditEntry, 
  verifyAuditChain,
  INITIAL_AUDIT_LOG
} from '../src/engine/auditLedger.ts';
import { 
  UndoableAction,
  pushUndoAction,
  createSingleApprovalUndo,
  createBatchApprovalUndo,
  createLedgerEditUndo,
  createRejectionUndo,
  executeUndo
} from '../src/engine/sessionUndo.ts';
import {
  ExceptionItem,
  ExceptionCategory,
  EXCEPTION_GROUPS,
  normalizeCategory,
  toExceptionItem,
  categorizeExceptions,
  calculateGroupTotals,
  getStatutoryCitation
} from '../src/components/queue/ExceptionQueue.tsx';
import { formatPaiseToINR, formatINR } from '../src/data/formatters.ts';

describe('Flow 6: Exception Queue Triage & Root-Cause Grouping', () => {
  it('correctly categorizes items into all 4 structured root-cause exception buckets', () => {
    const { groups, groupedList, flattenedItems } = categorizeExceptions(INITIAL_REVIEW_ITEMS);

    // Group 1: Timing Differences
    const timing = groups.TIMING_DIFFERENCE;
    assert.ok(timing, 'Timing Differences group must exist');
    assert.equal(timing.category, 'TIMING_DIFFERENCE');
    assert.equal(timing.title, 'Timing Differences');
    assert.equal(timing.riskLevel, 'Minimal Risk');
    assert.ok(timing.count >= 2, `Expected at least 2 timing difference items, found ${timing.count}`);
    assert.ok(timing.totalAmountPaise > 0, 'Timing difference total amount must be > 0 paise');
    assert.ok(timing.totalTaxImpactPaise > 0, 'Timing difference tax impact must be > 0 paise');
    assert.ok(timing.items.some(i => i.vendorName.includes('Blue Dart')), 'Should contain Blue Dart Express');
    assert.ok(timing.items.some(i => i.vendorName.includes('DHL Express')), 'Should contain DHL Express');

    // Group 2: Invoice Number Typos
    const typos = groups.INVOICE_TYPO;
    assert.ok(typos, 'Invoice Typos group must exist');
    assert.equal(typos.category, 'INVOICE_TYPO');
    assert.equal(typos.title, 'Invoice Number Typos');
    assert.equal(typos.riskLevel, 'Low Risk');
    assert.ok(typos.count >= 1, `Expected at least 1 invoice typo item, found ${typos.count}`);
    assert.ok(typos.items.some(i => i.vendorName.includes('Tata Tele')), 'Should contain Tata Tele Business Services');
    const typoItem = typos.items[0];
    assert.ok(typoItem.invoiceNumber.includes('/') || typoItem.invoiceNumber.includes('-'));
    assert.ok(typoItem.taxImpactPaise > 0);

    // Group 3: Tax Rate Mismatches
    const rateMismatch = groups.TAX_RATE_MISMATCH;
    assert.ok(rateMismatch, 'Tax Rate Mismatches group must exist');
    assert.equal(rateMismatch.category, 'TAX_RATE_MISMATCH');
    assert.equal(rateMismatch.title, 'Tax Rate Mismatches');
    assert.equal(rateMismatch.riskLevel, 'High Risk');
    assert.ok(rateMismatch.count >= 1, `Expected at least 1 rate mismatch item, found ${rateMismatch.count}`);
    assert.ok(rateMismatch.items.some(i => i.vendorName.includes('Bharat Logistics')), 'Should contain Bharat Logistics');
    const rateItem = rateMismatch.items[0];
    assert.ok(rateItem.booksAmount !== rateItem.gstrAmount, 'Books and portal amounts must reflect tax rate delta');
    assert.ok(rateItem.taxImpactPaise > 0, 'Tax impact paise must reflect rate delta');

    // Group 4: Missing in GSTR-2B
    const missing2b = groups.MISSING_IN_2B;
    assert.ok(missing2b, 'Missing in GSTR-2B group must exist');
    assert.equal(missing2b.category, 'MISSING_IN_2B');
    assert.equal(missing2b.title, 'Missing in GSTR-2B');
    assert.equal(missing2b.riskLevel, 'Critical Risk');
    assert.ok(missing2b.count >= 1, `Expected at least 1 missing in 2B item, found ${missing2b.count}`);
    assert.ok(missing2b.items.some(i => i.vendorName.includes('Rajasthan Heavy Haulage')), 'Should contain Rajasthan Logistics');
    const missingItem = missing2b.items[0];
    assert.equal(missingItem.gstrAmount, 0, 'Unfiled return in GSTR-2B should have 0 portal amount');
    assert.ok(missingItem.taxImpactPaise > 0, 'ITC at risk must be positive integer paise');

    // Grouped list must contain all 4 primary groups
    assert.equal(groupedList.length, 4);
    assert.deepEqual(groupedList.map(g => g.category), [
      'TIMING_DIFFERENCE',
      'INVOICE_TYPO',
      'TAX_RATE_MISMATCH',
      'MISSING_IN_2B'
    ]);

    // Flattened items count must equal total categorized items
    const totalCategorized = timing.count + typos.count + rateMismatch.count + missing2b.count;
    assert.ok(flattenedItems.length >= totalCategorized);
  });

  it('calculates group totals in integer paise without floating point inaccuracy', () => {
    const mockExceptions: ExceptionItem[] = [
      {
        id: 't-1',
        vendorName: 'Vendor A',
        vendorGstin: '27AABCA1234F1Z5',
        invoiceNumber: 'INV/001',
        invoiceDate: '10/09/2024',
        booksAmount: 50000.50,
        gstrAmount: 50000.50,
        category: 'TIMING_DIFFERENCE',
        confidence: 0.98,
        statutoryNote: 'Date drift',
        suggestedAction: 'Approve',
        rawAmountPaise: 5000050,
        taxImpactPaise: 762720
      },
      {
        id: 't-2',
        vendorName: 'Vendor B',
        vendorGstin: '27AABCB5521K1Z8',
        invoiceNumber: 'INV/002',
        invoiceDate: '12/09/2024',
        booksAmount: 30000.25,
        gstrAmount: 30000.25,
        category: 'TIMING_DIFFERENCE',
        confidence: 0.95,
        statutoryNote: 'Date drift',
        suggestedAction: 'Approve',
        rawAmountPaise: 3000025,
        taxImpactPaise: 457631
      }
    ];

    const totals = calculateGroupTotals(mockExceptions);
    assert.equal(totals.count, 2);
    // Exact integer addition: 5000050 + 3000025 = 8000075 paise
    assert.equal(totals.totalAmountPaise, 8000075);
    // Exact integer tax addition: 762720 + 457631 = 1220351 paise
    assert.equal(totals.totalTaxImpactPaise, 1220351);

    // Formatter verification
    const formattedAmount = formatPaiseToINR(totals.totalAmountPaise);
    assert.ok(formattedAmount.includes('80,000.75'));
    const formattedTax = formatPaiseToINR(totals.totalTaxImpactPaise);
    assert.ok(formattedTax.includes('12,203.51'));
  });

  it('guarantees statutory rule citations across all 4 exception categories', () => {
    // 1. Timing Difference citation
    const timingCitation = getStatutoryCitation('TIMING_DIFFERENCE');
    assert.ok(timingCitation.ruleCitation.includes('Rule 36(4)'));
    assert.ok(timingCitation.ruleCitation.includes('Circular 183/15/2022-GST'));
    assert.ok(timingCitation.statutoryBasis.includes('Section 16(2)(aa)'));
    assert.equal(timingCitation.riskLevel, 'Minimal Risk');

    // 2. Invoice Typo citation
    const typoCitation = getStatutoryCitation('INVOICE_TYPO');
    assert.ok(typoCitation.ruleCitation.includes('Circular 183/15/2022-GST'));
    assert.ok(typoCitation.ruleCitation.includes('Typographical and clerical errors'));
    assert.equal(typoCitation.riskLevel, 'Low Risk');

    // 3. Tax Rate Mismatch citation
    const rateCitation = getStatutoryCitation('TAX_RATE_MISMATCH');
    assert.ok(rateCitation.ruleCitation.includes('Section 16(2)(c)'));
    assert.ok(rateCitation.ruleCitation.includes('Notification 11/2017-CT(R)'));
    assert.equal(rateCitation.riskLevel, 'High Risk');

    // 4. Missing in 2B citation
    const missingCitation = getStatutoryCitation('MISSING_IN_2B');
    assert.ok(missingCitation.ruleCitation.includes('Section 16(2)(aa)'));
    assert.ok(missingCitation.ruleCitation.includes('Circular 170/02/2022-GST'));
    assert.equal(missingCitation.riskLevel, 'Critical Risk');
  });

  it('executes single item approval, appends SHA-256 block, and records undo state', async () => {
    let items = [...INITIAL_REVIEW_ITEMS];
    let ledger = [...INITIAL_AUDIT_LOG];
    let stack: UndoableAction[] = [];

    const itemToApprove = items.find(i => i.id === 'rev-001')!;
    const originalIndex = items.findIndex(i => i.id === itemToApprove.id);
    const lastHash = ledger[ledger.length - 1].entryHash;

    const approvalBlock = await createAuditEntry(
      ledger.length,
      "Chirag (Audit Partner)",
      "APPROVED_MATCH",
      itemToApprove.id,
      itemToApprove.title,
      `Approved timing difference under Rule 36(4). Amount: ${itemToApprove.amount}`,
      lastHash
    );

    ledger.push(approvalBlock);
    items = items.filter(i => i.id !== itemToApprove.id);
    assert.equal(items.some(i => i.id === itemToApprove.id), false);

    // Push to session undo stack
    stack = pushUndoAction(stack, createSingleApprovalUndo(itemToApprove, originalIndex, approvalBlock));
    assert.equal(stack.length, 1);

    // Verify cryptographic audit chain continuity
    const chainCheck = await verifyAuditChain(ledger);
    assert.equal(chainCheck.valid, true, chainCheck.reason);

    // Revert via Undo
    const { result, nextStack } = await executeUndo({
      stack,
      currentItems: items,
      auditLedger: ledger,
      actor: "Chirag (Audit Partner)"
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(nextStack.length, 0);
    assert.equal(result.actionUndone, 'SINGLE_APPROVAL');
    assert.equal(result.restoredItems.length, INITIAL_REVIEW_ITEMS.length);
    assert.equal(result.restoredItems[originalIndex].id, itemToApprove.id);

    // Append undo block to ledger & verify chain
    ledger.push(result.newAuditEntry);
    const postUndoCheck = await verifyAuditChain(ledger);
    assert.equal(postUndoCheck.valid, true, postUndoCheck.reason);
  });

  it('executes single item rejection, appends SHA-256 block, and restores via undo', async () => {
    let items = [...INITIAL_REVIEW_ITEMS];
    let ledger = [...INITIAL_AUDIT_LOG];
    let stack: UndoableAction[] = [];

    const itemToReject = items.find(i => i.id === 'rev-005')!; // Missing in 2B
    const originalIndex = items.findIndex(i => i.id === itemToReject.id);
    const lastHash = ledger[ledger.length - 1].entryHash;

    const rejectionBlock = await createAuditEntry(
      ledger.length,
      "Chirag (Audit Partner)",
      "REJECTED_MATCH",
      itemToReject.id,
      itemToReject.title,
      `Rejected ITC claim: Supplier unfiled under Section 16(2)(aa). Amount: ${itemToReject.amount}`,
      lastHash
    );

    ledger.push(rejectionBlock);
    items = items.filter(i => i.id !== itemToReject.id);
    assert.equal(items.some(i => i.id === itemToReject.id), false);

    stack = pushUndoAction(stack, createRejectionUndo(itemToReject, originalIndex, rejectionBlock));
    assert.equal(stack.length, 1);

    // Verify audit chain
    const chainCheck = await verifyAuditChain(ledger);
    assert.equal(chainCheck.valid, true);

    // Undo rejection
    const { result, nextStack } = await executeUndo({
      stack,
      currentItems: items,
      auditLedger: ledger,
      actor: "Chirag (Audit Partner)"
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.actionUndone, 'REJECTION');
    assert.equal(result.restoredItems[originalIndex].id, itemToReject.id);
    assert.ok(result.toastMessage.includes('Rejection for Rajasthan Heavy Haulage Logistics restored'));

    ledger.push(result.newAuditEntry);
    const postUndoCheck = await verifyAuditChain(ledger);
    assert.equal(postUndoCheck.valid, true);
  });

  it('executes inline ledger edit/reclassification and enables session undo reversion', async () => {
    let items = [...INITIAL_REVIEW_ITEMS];
    let ledger = [...INITIAL_AUDIT_LOG];
    let stack: UndoableAction[] = [];

    const targetItem = items.find(i => i.id === 'rev-009')!;
    const previousLedger = targetItem.assignedLedger;
    const newLedger = 'General Administrative Expenses';
    const reason = 'Reclassified per partner review for telecom expenses';
    const lastHash = ledger[ledger.length - 1].entryHash;

    const editBlock = await createAuditEntry(
      ledger.length,
      "Chirag (Audit Partner)",
      "LEDGER_RECLASSIFICATION",
      targetItem.id,
      targetItem.title,
      `Ledger overridden to '${newLedger}'. Note: ${reason}`,
      lastHash
    );

    ledger.push(editBlock);
    items = items.map(i => i.id === targetItem.id ? { ...i, assignedLedger: newLedger } : i);
    assert.equal(items.find(i => i.id === targetItem.id)?.assignedLedger, newLedger);

    stack = pushUndoAction(
      stack,
      createLedgerEditUndo(targetItem, previousLedger, newLedger, undefined, reason, editBlock)
    );

    // Undo edit
    const { result, nextStack } = await executeUndo({
      stack,
      currentItems: items,
      auditLedger: ledger,
      actor: "Chirag (Audit Partner)"
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.actionUndone, 'LEDGER_EDIT');
    assert.equal(result.restoredItems.find(i => i.id === targetItem.id)?.assignedLedger, previousLedger);
    assert.ok(result.toastMessage.includes('Ledger edit for Tata Tele Business Services Ltd restored'));

    ledger.push(result.newAuditEntry);
    const postUndoCheck = await verifyAuditChain(ledger);
    assert.equal(postUndoCheck.valid, true);
  });

  it('executes batch group approval and restores all items simultaneously on session undo', async () => {
    let items = [...INITIAL_REVIEW_ITEMS];
    let ledger = [...INITIAL_AUDIT_LOG];
    let stack: UndoableAction[] = [];

    const { groups } = categorizeExceptions(items);
    const timingGroup = groups.TIMING_DIFFERENCE;
    assert.ok(timingGroup.count >= 2, 'Batch test requires at least 2 timing items');

    const timingItemsWithIndices = timingGroup.items.map(it => ({
      item: it.originalItem || INITIAL_REVIEW_ITEMS.find(i => i.id === it.id)!,
      originalIndex: items.findIndex(i => i.id === it.id)
    }));

    let lastHash = ledger[ledger.length - 1].entryHash;
    const batchAuditEntries: AuditEntry[] = [];

    for (let i = 0; i < timingItemsWithIndices.length; i++) {
      const { item: it } = timingItemsWithIndices[i];
      const entry = await createAuditEntry(
        ledger.length + i,
        "Chirag (Audit Partner)",
        "BATCH_APPROVAL",
        it.id,
        it.title,
        `Batch approved timing difference under Rule 36(4). Amount: ${it.amount}`,
        lastHash
      );
      batchAuditEntries.push(entry);
      lastHash = entry.entryHash;
    }

    // Append batch entries to ledger
    ledger.push(...batchAuditEntries);

    // Remove batch approved items from items list
    const batchIds = new Set(timingGroup.items.map(i => i.id));
    items = items.filter(i => !batchIds.has(i.id));
    assert.equal(items.length, INITIAL_REVIEW_ITEMS.length - timingItemsWithIndices.length);

    // Verify audit chain across the entire batch
    const batchChainCheck = await verifyAuditChain(ledger);
    assert.equal(batchChainCheck.valid, true, batchChainCheck.reason);

    // Push BATCH_APPROVAL action to session undo stack
    stack = pushUndoAction(
      stack,
      createBatchApprovalUndo(timingItemsWithIndices, batchAuditEntries, 'timing differences')
    );
    assert.equal(stack.length, 1);

    // Execute Undo (Ctrl+Z)
    const { result, nextStack } = await executeUndo({
      stack,
      currentItems: items,
      auditLedger: ledger,
      actor: "Chirag (Audit Partner)"
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(nextStack.length, 0);
    assert.equal(result.actionUndone, 'BATCH_APPROVAL');
    // All batch items restored simultaneously
    assert.equal(result.restoredItems.length, INITIAL_REVIEW_ITEMS.length);
    for (const { item, originalIndex } of timingItemsWithIndices) {
      assert.equal(result.restoredItems[originalIndex].id, item.id);
    }

    assert.ok(result.toastMessage.includes(`Batch approval of ${timingItemsWithIndices.length} timing differences restored`));

    // Append ACTION_UNDO block to ledger and verify complete unbroken chain
    ledger.push(result.newAuditEntry);
    const postBatchUndoCheck = await verifyAuditChain(ledger);
    assert.equal(postBatchUndoCheck.valid, true, postBatchUndoCheck.reason);
  });

  it('verifies Zero AI Design Slop compliance in ExceptionQueue.tsx', () => {
    const queuePath = path.resolve('src/components/queue/ExceptionQueue.tsx');
    const code = fs.readFileSync(queuePath, 'utf8');

    // Rule 1: No gratuitous rounded-full chip bubbles or pills
    assert.ok(!code.includes('rounded-full'), 'ExceptionQueue must not contain rounded-full pills or tag clusters');

    // Rule 2: No decorative italics
    assert.ok(!code.includes('italic'), 'ExceptionQueue must not contain decorative italics');

    // Rule 3: No instrument serif / pretentious serifs
    assert.ok(!code.includes('font-serif'), 'ExceptionQueue must use clean sans-serif only');
    assert.ok(!code.includes('font-[serif]'), 'ExceptionQueue must use clean sans-serif only');

    // Rule 4: No negative tracking
    assert.ok(!code.includes('tracking-tight'), 'ExceptionQueue must not contain tracking-tight');
    assert.ok(!code.includes('tracking-[-'), 'ExceptionQueue must not contain negative kerning');

    // Rule 11: No pseudo-code headers
    assert.ok(!code.includes('// INSPECTION LOUPE //'), 'No pseudo-code comments as headers');

    // Rule 17: Numbers and dates must use tabular-nums, not font-mono
    assert.ok(code.includes('tabular-nums'), 'Numbers and dates must use tabular-nums');

    // Rule 19: Background surfaces adhere to #0a0a0c, #111115, #161920
    assert.ok(code.includes('#111115') || code.includes('#161920'), 'Surfaces must adhere to clean dark cockpit palette');
    assert.ok(code.includes('border-white/10'), 'Borders must use clean border-white/10');

    // Rule 20: No periods at end of titles
    assert.ok(!code.includes('Exception Queue.'), 'No trailing period in Exception Queue title');
    assert.ok(!code.includes('Batch Approval Confirmation.'), 'No trailing period in dialog title');

    // Active focus styling: exactly border-emerald-500/50 bg-neutral-900/80
    assert.ok(
      code.includes('border-emerald-500/50 bg-neutral-900/80'),
      'Focused item must carry specified active focus border and background classes'
    );
  });
});
