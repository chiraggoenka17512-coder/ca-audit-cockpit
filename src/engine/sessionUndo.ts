import { ReviewItem } from '../data/reviewItems';
import { AuditEntry, createAuditEntry } from './auditLedger';

export type UndoActionType = 
  | 'SINGLE_APPROVAL' 
  | 'BATCH_APPROVAL' 
  | 'LEDGER_EDIT' 
  | 'REJECTION';

export interface SingleApprovalUndoPayload {
  item: ReviewItem;
  originalIndex: number;
  auditEntry: AuditEntry;
}

export interface BatchApprovalUndoPayload {
  items: { item: ReviewItem; originalIndex: number }[];
  auditEntries: AuditEntry[];
  batchDescription: string;
}

export interface LedgerEditUndoPayload {
  itemId: string;
  itemTitle: string;
  previousLedger?: string;
  updatedLedger: string;
  previousReason?: string;
  updatedReason: string;
  auditEntry: AuditEntry;
}

export interface RejectionUndoPayload {
  item: ReviewItem;
  originalIndex: number;
  auditEntry: AuditEntry;
}

export type UndoableAction =
  | { type: 'SINGLE_APPROVAL'; payload: SingleApprovalUndoPayload }
  | { type: 'BATCH_APPROVAL'; payload: BatchApprovalUndoPayload }
  | { type: 'LEDGER_EDIT'; payload: LedgerEditUndoPayload }
  | { type: 'REJECTION'; payload: RejectionUndoPayload };

export interface UndoSuccessResult {
  success: true;
  restoredItems: ReviewItem[];
  newAuditEntry: AuditEntry;
  toastMessage: string;
  activeItem: ReviewItem | null;
  focusedIndex: number;
  actionUndone: UndoActionType;
}

export interface UndoFailureResult {
  success: false;
  reason: string;
}

export type UndoResult = UndoSuccessResult | UndoFailureResult;

/**
 * Creates an undo action descriptor for a single item approval.
 */
export function createSingleApprovalUndo(
  item: ReviewItem,
  originalIndex: number,
  auditEntry: AuditEntry
): UndoableAction {
  return {
    type: 'SINGLE_APPROVAL',
    payload: {
      item,
      originalIndex,
      auditEntry
    }
  };
}

/**
 * Creates an undo action descriptor for a batch timing difference approval.
 */
export function createBatchApprovalUndo(
  itemsWithIndices: { item: ReviewItem; originalIndex: number }[],
  auditEntries: AuditEntry[],
  batchDescription: string = 'timing differences'
): UndoableAction {
  return {
    type: 'BATCH_APPROVAL',
    payload: {
      items: itemsWithIndices,
      auditEntries,
      batchDescription
    }
  };
}

/**
 * Creates an undo action descriptor for a manual ledger edit/reclassification.
 */
export function createLedgerEditUndo(
  item: ReviewItem,
  previousLedger: string | undefined,
  updatedLedger: string,
  previousReason: string | undefined,
  updatedReason: string,
  auditEntry: AuditEntry
): UndoableAction {
  return {
    type: 'LEDGER_EDIT',
    payload: {
      itemId: item.id,
      itemTitle: item.title,
      previousLedger,
      updatedLedger,
      previousReason,
      updatedReason,
      auditEntry
    }
  };
}

/**
 * Creates an undo action descriptor for an item rejection.
 */
export function createRejectionUndo(
  item: ReviewItem,
  originalIndex: number,
  auditEntry: AuditEntry
): UndoableAction {
  return {
    type: 'REJECTION',
    payload: {
      item,
      originalIndex,
      auditEntry
    }
  };
}

/**
 * Pushes an undo action to the session undo stack.
 */
export function pushUndoAction(
  stack: UndoableAction[],
  action: UndoableAction
): UndoableAction[] {
  return [...stack, action];
}

/**
 * Executes an undo operation against the session stack, updating the items list
 * and recording an immutable SHA-256 hash-chained block with action "ACTION_UNDO".
 */
export async function executeUndo({
  stack,
  currentItems,
  auditLedger,
  actor = 'Chirag (Audit Partner)'
}: {
  stack: UndoableAction[];
  currentItems: ReviewItem[];
  auditLedger: AuditEntry[];
  actor?: string;
}): Promise<{ result: UndoResult; nextStack: UndoableAction[] }> {
  if (stack.length === 0) {
    return {
      result: { success: false, reason: 'Nothing to undo' },
      nextStack: stack
    };
  }

  const nextStack = [...stack];
  const lastAction = nextStack.pop()!;
  const lastHash = auditLedger[auditLedger.length - 1]?.entryHash || '0'.repeat(64);
  const nextIndex = auditLedger.length;

  switch (lastAction.type) {
    case 'SINGLE_APPROVAL': {
      const { item, originalIndex, auditEntry } = lastAction.payload;
      
      // Re-insert item at original index, or at end if originalIndex is beyond current length
      const updatedItems = [...currentItems];
      const targetIndex = Math.min(Math.max(0, originalIndex), updatedItems.length);
      updatedItems.splice(targetIndex, 0, item);

      const newAuditEntry = await createAuditEntry(
        nextIndex,
        actor,
        'ACTION_UNDO',
        item.id,
        item.title,
        `Undone: Approved match for ${item.title} (${item.booksInvoice}). Item restored to review queue. Undoes block #${auditEntry.index}.`,
        lastHash
      );

      return {
        result: {
          success: true,
          restoredItems: updatedItems,
          newAuditEntry,
          toastMessage: `Undone: Approved match for ${item.title} restored to review queue`,
          activeItem: item,
          focusedIndex: targetIndex,
          actionUndone: 'SINGLE_APPROVAL'
        },
        nextStack
      };
    }

    case 'BATCH_APPROVAL': {
      const { items, auditEntries, batchDescription } = lastAction.payload;
      
      // Restore all batch approved items preserving original ordering
      const updatedItems = [...currentItems];
      // Sort items by originalIndex ascending so they insert at proper positions
      const sortedBatch = [...items].sort((a, b) => a.originalIndex - b.originalIndex);
      for (const entry of sortedBatch) {
        const targetIndex = Math.min(Math.max(0, entry.originalIndex), updatedItems.length);
        updatedItems.splice(targetIndex, 0, entry.item);
      }

      const blockIndices = auditEntries.map(e => `#${e.index}`).join(', ');
      const newAuditEntry = await createAuditEntry(
        nextIndex,
        actor,
        'ACTION_UNDO',
        'BATCH_TIMING_RESTORE',
        `Batch ${batchDescription} (${items.length} items)`,
        `Undone: Batch approval of ${items.length} ${batchDescription}. Items restored to review queue. Undoes blocks ${blockIndices}.`,
        lastHash
      );

      const firstItem = sortedBatch[0]?.item || null;
      const firstIndex = sortedBatch[0]?.originalIndex ?? 0;

      return {
        result: {
          success: true,
          restoredItems: updatedItems,
          newAuditEntry,
          toastMessage: `Undone: Batch approval of ${items.length} timing differences restored to review queue`,
          activeItem: firstItem,
          focusedIndex: Math.min(firstIndex, updatedItems.length - 1),
          actionUndone: 'BATCH_APPROVAL'
        },
        nextStack
      };
    }

    case 'LEDGER_EDIT': {
      const { itemId, itemTitle, previousLedger, updatedLedger, auditEntry } = lastAction.payload;
      
      // Revert the item's assignedLedger in currentItems
      let revertedItem: ReviewItem | null = null;
      let targetIndex = 0;
      const updatedItems = currentItems.map((it, idx) => {
        if (it.id === itemId) {
          revertedItem = { ...it, assignedLedger: previousLedger };
          targetIndex = idx;
          return revertedItem;
        }
        return it;
      });

      const newAuditEntry = await createAuditEntry(
        nextIndex,
        actor,
        'ACTION_UNDO',
        itemId,
        itemTitle,
        `Undone: Ledger edit for ${itemTitle}. Reverted from '${updatedLedger}' to '${previousLedger || 'original'}'. Undoes block #${auditEntry.index}.`,
        lastHash
      );

      return {
        result: {
          success: true,
          restoredItems: updatedItems,
          newAuditEntry,
          toastMessage: `Undone: Ledger edit for ${itemTitle} restored`,
          activeItem: revertedItem,
          focusedIndex: targetIndex,
          actionUndone: 'LEDGER_EDIT'
        },
        nextStack
      };
    }

    case 'REJECTION': {
      const { item, originalIndex, auditEntry } = lastAction.payload;
      
      const updatedItems = [...currentItems];
      const targetIndex = Math.min(Math.max(0, originalIndex), updatedItems.length);
      updatedItems.splice(targetIndex, 0, item);

      const newAuditEntry = await createAuditEntry(
        nextIndex,
        actor,
        'ACTION_UNDO',
        item.id,
        item.title,
        `Undone: Rejection for ${item.title} (${item.booksInvoice}). Item restored to review queue. Undoes block #${auditEntry.index}.`,
        lastHash
      );

      return {
        result: {
          success: true,
          restoredItems: updatedItems,
          newAuditEntry,
          toastMessage: `Undone: Rejection for ${item.title} restored to review queue`,
          activeItem: item,
          focusedIndex: targetIndex,
          actionUndone: 'REJECTION'
        },
        nextStack
      };
    }
  }
}
