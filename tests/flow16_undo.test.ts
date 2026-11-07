import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
import fs from 'node:fs';
import path from 'node:path';

describe('Flow 16: Session Undo (Ctrl+Z) & In-Memory Stack', () => {
  it('undoes a single item approval and restores it to the items array at original position', async () => {
    let items = [...INITIAL_REVIEW_ITEMS];
    let ledger = [...INITIAL_AUDIT_LOG];
    let stack: UndoableAction[] = [];

    // 1. Simulate approval of first item
    const itemToApprove = items[0]; // rev-001 "Blue Dart Express Limited"
    const originalIndex = 0;
    const lastHash = ledger[ledger.length - 1].entryHash;

    const approvalEntry = await createAuditEntry(
      ledger.length,
      "Chirag (Audit Partner)",
      "APPROVED_MATCH",
      itemToApprove.id,
      `${itemToApprove.title} (${itemToApprove.booksInvoice})`,
      `Approved match between books and portal.`,
      lastHash
    );

    ledger.push(approvalEntry);
    items = items.filter(i => i.id !== itemToApprove.id);
    assert.equal(items.length, INITIAL_REVIEW_ITEMS.length - 1);
    assert.equal(items.find(i => i.id === itemToApprove.id), undefined);

    // 2. Push to session undo stack
    stack = pushUndoAction(stack, createSingleApprovalUndo(itemToApprove, originalIndex, approvalEntry));
    assert.equal(stack.length, 1);

    // 3. Execute Undo (Ctrl+Z)
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
    assert.equal(result.restoredItems[0].id, itemToApprove.id);
    assert.equal(result.toastMessage, `Undone: Approved match for ${itemToApprove.title} restored to review queue`);

    // Verify audit block appended for undo
    assert.equal(result.newAuditEntry.action, 'ACTION_UNDO');
    assert.equal(result.newAuditEntry.targetId, itemToApprove.id);
    assert.equal(result.newAuditEntry.previousHash, approvalEntry.entryHash);
    assert.ok(result.newAuditEntry.details.includes('Undone: Approved match'));
    assert.ok(result.newAuditEntry.details.includes(`#${approvalEntry.index}`));

    // Append to ledger and verify unbroken chain
    ledger.push(result.newAuditEntry);
    const verification = await verifyAuditChain(ledger);
    assert.equal(verification.valid, true, verification.reason);
  });

  it('undoes a batch timing difference approval and restores all timing items', async () => {
    // Construct test items with 2 timing items
    const timingItem2: ReviewItem = {
      ...INITIAL_REVIEW_ITEMS[0],
      id: 'rev-timing-002',
      title: 'DHL Express India Pvt Ltd',
      booksInvoice: 'DHL/2024/441',
      gstrInvoice: 'DHL/2024/441',
      amount: '₹34,500',
      category: 'TIMING'
    };

    let items = [INITIAL_REVIEW_ITEMS[0], timingItem2, INITIAL_REVIEW_ITEMS[1], INITIAL_REVIEW_ITEMS[2]];
    const initialItemCount = items.length;
    let ledger = [...INITIAL_AUDIT_LOG];
    let stack: UndoableAction[] = [];

    // Find all timing items
    const timingItemsWithIndices = items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => item.category === 'TIMING');

    assert.equal(timingItemsWithIndices.length, 2, 'Expected 2 timing difference items');

    // Simulate batch approval
    let lastHash = ledger[ledger.length - 1].entryHash;
    const batchAuditEntries: AuditEntry[] = [];

    for (let i = 0; i < timingItemsWithIndices.length; i++) {
      const { item: it } = timingItemsWithIndices[i];
      const entry = await createAuditEntry(
        ledger.length + i,
        "Chirag (Audit Partner)",
        "BATCH_TIMING_APPROVE",
        it.id,
        it.title,
        `Batch approved under Section 16(2)(aa) 30-day window.`,
        lastHash
      );
      batchAuditEntries.push(entry);
      lastHash = entry.entryHash;
    }

    ledger.push(...batchAuditEntries);
    items = items.filter(i => i.category !== 'TIMING');
    assert.equal(items.length, initialItemCount - timingItemsWithIndices.length);

    // Push batch approval to session undo stack
    stack = pushUndoAction(stack, createBatchApprovalUndo(timingItemsWithIndices, batchAuditEntries, 'timing differences'));
    assert.equal(stack.length, 1);

    // Execute Undo
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
    assert.equal(result.restoredItems.length, initialItemCount);
    
    // Verify each timing item is back in restoredItems
    for (const { item } of timingItemsWithIndices) {
      assert.ok(result.restoredItems.some(i => i.id === item.id), `Item ${item.id} should be restored`);
    }

    assert.equal(
      result.toastMessage, 
      `Undone: Batch approval of ${timingItemsWithIndices.length} timing differences restored to review queue`
    );

    // Verify audit block
    assert.equal(result.newAuditEntry.action, 'ACTION_UNDO');
    assert.equal(result.newAuditEntry.targetId, 'BATCH_TIMING_RESTORE');
    assert.equal(result.newAuditEntry.previousHash, ledger[ledger.length - 1].entryHash);

    ledger.push(result.newAuditEntry);
    const verification = await verifyAuditChain(ledger);
    assert.equal(verification.valid, true, verification.reason);
  });

  it('undoes a ledger edit and reverts assignedLedger to its previous state', async () => {
    let items = [...INITIAL_REVIEW_ITEMS];
    let ledger = [...INITIAL_AUDIT_LOG];
    let stack: UndoableAction[] = [];

    const itemToEdit = items[2]; // Reliance Jio
    const previousLedger = itemToEdit.assignedLedger; // undefined or original
    const updatedLedger = 'Software Subscriptions (194J)';
    const reason = 'Reclassified to software subscription';

    const lastHash = ledger[ledger.length - 1].entryHash;
    const editEntry = await createAuditEntry(
      ledger.length,
      "Chirag (Audit Partner)",
      "LEDGER_RECLASSIFICATION",
      itemToEdit.id,
      itemToEdit.title,
      `Ledger overridden to '${updatedLedger}'. Note: ${reason}`,
      lastHash
    );

    ledger.push(editEntry);
    items = items.map(i => i.id === itemToEdit.id ? { ...i, assignedLedger: updatedLedger } : i);
    assert.equal(items.find(i => i.id === itemToEdit.id)?.assignedLedger, updatedLedger);

    stack = pushUndoAction(stack, createLedgerEditUndo(
      itemToEdit,
      previousLedger,
      updatedLedger,
      undefined,
      reason,
      editEntry
    ));

    // Execute Undo
    const { result, nextStack } = await executeUndo({
      stack,
      currentItems: items,
      auditLedger: ledger,
      actor: "Chirag (Audit Partner)"
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(nextStack.length, 0);
    assert.equal(result.actionUndone, 'LEDGER_EDIT');
    assert.equal(result.restoredItems.find(i => i.id === itemToEdit.id)?.assignedLedger, previousLedger);
    assert.equal(result.toastMessage, `Undone: Ledger edit for ${itemToEdit.title} restored`);

    // Verify audit block
    assert.equal(result.newAuditEntry.action, 'ACTION_UNDO');
    assert.equal(result.newAuditEntry.targetId, itemToEdit.id);
    assert.ok(result.newAuditEntry.details.includes(`Reverted from '${updatedLedger}'`));

    ledger.push(result.newAuditEntry);
    const verification = await verifyAuditChain(ledger);
    assert.equal(verification.valid, true, verification.reason);
  });

  it('undoes an item rejection and restores item to review queue', async () => {
    let items = [...INITIAL_REVIEW_ITEMS];
    let ledger = [...INITIAL_AUDIT_LOG];
    let stack: UndoableAction[] = [];

    const itemToReject = items[1];
    const originalIndex = 1;
    const lastHash = ledger[ledger.length - 1].entryHash;

    const rejectionEntry = await createAuditEntry(
      ledger.length,
      "Chirag (Audit Partner)",
      "REJECTED_MATCH",
      itemToReject.id,
      itemToReject.title,
      `Rejected match. Marked for query.`,
      lastHash
    );

    ledger.push(rejectionEntry);
    items = items.filter(i => i.id !== itemToReject.id);
    stack = pushUndoAction(stack, createRejectionUndo(itemToReject, originalIndex, rejectionEntry));

    // Execute Undo
    const { result, nextStack } = await executeUndo({
      stack,
      currentItems: items,
      auditLedger: ledger,
      actor: "Chirag (Audit Partner)"
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(nextStack.length, 0);
    assert.equal(result.actionUndone, 'REJECTION');
    assert.equal(result.restoredItems.length, INITIAL_REVIEW_ITEMS.length);
    assert.equal(result.restoredItems[originalIndex].id, itemToReject.id);
    assert.equal(result.toastMessage, `Undone: Rejection for ${itemToReject.title} restored to review queue`);

    ledger.push(result.newAuditEntry);
    const verification = await verifyAuditChain(ledger);
    assert.equal(verification.valid, true, verification.reason);
  });

  it('handles LIFO multi-level undo stack and empty stack gracefully', async () => {
    let items = [...INITIAL_REVIEW_ITEMS];
    let ledger = [...INITIAL_AUDIT_LOG];
    let stack: UndoableAction[] = [];

    // Perform Action 1: Approve item 0
    const item0 = items[0];
    const entry0 = await createAuditEntry(ledger.length, "Chirag", "APPROVED_MATCH", item0.id, item0.title, "Approve 0", ledger[ledger.length - 1].entryHash);
    ledger.push(entry0);
    items = items.filter(i => i.id !== item0.id);
    stack = pushUndoAction(stack, createSingleApprovalUndo(item0, 0, entry0));

    // Perform Action 2: Approve item 1
    const item1 = items[0]; // now first in filtered list
    const entry1 = await createAuditEntry(ledger.length, "Chirag", "APPROVED_MATCH", item1.id, item1.title, "Approve 1", ledger[ledger.length - 1].entryHash);
    ledger.push(entry1);
    items = items.filter(i => i.id !== item1.id);
    stack = pushUndoAction(stack, createSingleApprovalUndo(item1, 1, entry1));

    assert.equal(stack.length, 2);

    // 1st Undo: should undo item1
    const undo1 = await executeUndo({ stack, currentItems: items, auditLedger: ledger });
    assert.equal(undo1.result.success, true);
    if (undo1.result.success) {
      assert.equal(undo1.result.activeItem?.id, item1.id);
      items = undo1.result.restoredItems;
      ledger.push(undo1.result.newAuditEntry);
      stack = undo1.nextStack;
    }
    assert.equal(stack.length, 1);

    // 2nd Undo: should undo item0
    const undo2 = await executeUndo({ stack, currentItems: items, auditLedger: ledger });
    assert.equal(undo2.result.success, true);
    if (undo2.result.success) {
      assert.equal(undo2.result.activeItem?.id, item0.id);
      items = undo2.result.restoredItems;
      ledger.push(undo2.result.newAuditEntry);
      stack = undo2.nextStack;
    }
    assert.equal(stack.length, 0);

    // 3rd Undo: empty stack
    const undo3 = await executeUndo({ stack, currentItems: items, auditLedger: ledger });
    assert.equal(undo3.result.success, false);
    assert.equal(undo3.result.reason, 'Nothing to undo');

    // Entire chain including undos must be valid
    const verification = await verifyAuditChain(ledger);
    assert.equal(verification.valid, true, verification.reason);
  });

  it('guarantees cryptographic hash chain continuity and detects any tampering', async () => {
    let ledger: AuditEntry[] = [];

    // Build a fresh test chain
    const genesis = await createAuditEntry(
      0,
      "System Sentinel",
      "GENESIS_INITIALIZE",
      "WORKSPACE_TEST",
      "Test Workspace",
      "Fresh workspace initialized",
      '0'.repeat(64)
    );
    ledger.push(genesis);

    // Add block 1
    const b1 = await createAuditEntry(1, "Chirag", "APPROVED_MATCH", "rev-001", "Item 1", "Approve", genesis.entryHash);
    ledger.push(b1);

    // Add block 2 (Undo)
    const b2 = await createAuditEntry(2, "Chirag", "ACTION_UNDO", "rev-001", "Item 1", "Undo approve", b1.entryHash);
    ledger.push(b2);

    // Add block 3
    const b3 = await createAuditEntry(3, "Chirag", "LEDGER_RECLASSIFICATION", "rev-002", "Item 2", "Edit ledger", b2.entryHash);
    ledger.push(b3);

    // Add block 4 (Undo)
    const b4 = await createAuditEntry(4, "Chirag", "ACTION_UNDO", "rev-002", "Item 2", "Undo edit", b3.entryHash);
    ledger.push(b4);

    // Chain must verify successfully
    const initialCheck = await verifyAuditChain(ledger);
    assert.equal(initialCheck.valid, true, initialCheck.reason);

    // Tamper 1: modify details of block 1
    const tamperedPayload = [...ledger.map(e => ({ ...e }))];
    tamperedPayload[1].details = "Tampered details by malicious actor";
    const tamperCheck1 = await verifyAuditChain(tamperedPayload);
    assert.equal(tamperCheck1.valid, false);
    assert.equal(tamperCheck1.brokenIndex, 1);

    // Tamper 2: break previousHash link at block 3
    const brokenLinkChain = [...ledger.map(e => ({ ...e }))];
    brokenLinkChain[3].previousHash = 'f'.repeat(64);
    const brokenCheck = await verifyAuditChain(brokenLinkChain);
    assert.equal(brokenCheck.valid, false);
    assert.equal(brokenCheck.brokenIndex, 3);

    // Tamper 3: remove a block from the middle
    const deletedChain = [ledger[0], ledger[1], ledger[3], ledger[4]];
    const deleteCheck = await verifyAuditChain(deletedChain);
    assert.equal(deleteCheck.valid, false);
  });

  it('verifies Zero AI Design Slop compliance in KeyboardHelpModal and sessionUndo', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/KeyboardHelpModal.tsx');
    const modalContent = fs.readFileSync(modalPath, 'utf8');

    // Rule 1: No pills or tags
    assert.ok(!modalContent.includes('rounded-full'), 'No rounded-full badges allowed in modal');
    // Rule 3: No instrument serif
    assert.ok(!modalContent.includes('serif'), 'Clean sans-serif only');
    // Rule 4: No negative tracking
    assert.ok(!modalContent.includes('tracking-tight'), 'No negative kerning');
    assert.ok(!modalContent.includes('tracking-[-'), 'No negative tracking');
    // Rule 20: No periods at end of titles
    assert.ok(!modalContent.includes('Keyboard shortcuts.'), 'No trailing period in title');
    // Documents Ctrl+Z
    assert.ok(modalContent.includes('Ctrl+Z'), 'Must document Ctrl+Z shortcut');
    assert.ok(modalContent.includes('Undo last action'), 'Must label Undo last action');
  });
});
