import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { 
  AlertTriangle, 
  Check, 
  Layers, 
  Clock, 
  FileEdit, 
  ShieldAlert,
  X,
  ExternalLink
} from 'lucide-react';
import { ReviewItem } from '../../data/reviewItems';
import { formatPaiseToINR, formatINR } from '../../data/formatters';

export type ExceptionCategory = 
  | 'TIMING_DIFFERENCE' 
  | 'INVOICE_TYPO' 
  | 'TAX_RATE_MISMATCH' 
  | 'MISSING_IN_2B';

export interface ExceptionItem {
  id: string;
  vendorName: string;
  vendorGstin: string;
  invoiceNumber: string;
  gstrInvoiceNumber?: string;
  invoiceDate: string;
  gstrDate?: string;
  booksAmount: number;
  gstrAmount: number;
  category: ExceptionCategory;
  confidence: number;
  statutoryNote: string;
  suggestedAction: string;
  rawAmountPaise: number;
  taxImpactPaise: number;
  assignedLedger?: string;
  ruleCitation?: string;
  agreedFields?: string[];
  differingFields?: string[];
  originalItem?: ReviewItem;
}

export interface GroupDefinition {
  category: ExceptionCategory;
  title: string;
  shortLabel: string;
  riskLevel: 'Minimal Risk' | 'Low Risk' | 'High Risk' | 'Critical Risk';
  riskBadgeClass: string;
  statutoryRuleCitation: string;
  statutoryBasis: string;
  ruleId: string;
  description: string;
}

export const EXCEPTION_GROUPS: Record<ExceptionCategory, GroupDefinition> = {
  TIMING_DIFFERENCE: {
    category: 'TIMING_DIFFERENCE',
    title: 'Timing Differences',
    shortLabel: 'Timing Difference',
    riskLevel: 'Minimal Risk',
    riskBadgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    statutoryRuleCitation: 'Rule 36(4) CGST Rules & Circular 183/15/2022-GST: Tolerance of timing differences up to statutory filing window',
    statutoryBasis: 'Section 16(2)(aa) CGST Act, 2017 & Rule 36(4)',
    ruleId: 'SEC-16-2-AA',
    description: 'Supplier uploaded invoice in subsequent filing period. Transaction and GSTIN agree paise-exact.'
  },
  INVOICE_TYPO: {
    category: 'INVOICE_TYPO',
    title: 'Invoice Number Typos',
    shortLabel: 'Invoice Typo',
    riskLevel: 'Low Risk',
    riskBadgeClass: 'bg-sky-500/10 text-sky-400 border border-sky-500/30',
    statutoryRuleCitation: 'CBIC Circular 183/15/2022-GST: Typographical and clerical errors in invoice numbering',
    statutoryBasis: 'Circular 183/15/2022-GST Clause 4',
    ruleId: 'CIRCULAR-183-TYPO',
    description: 'Formatting variations (e.g. slash vs hyphen, leading zeros). Party GSTIN and amount agree paise-exact.'
  },
  TAX_RATE_MISMATCH: {
    category: 'TAX_RATE_MISMATCH',
    title: 'Tax Rate Mismatches',
    shortLabel: 'Rate Mismatch',
    riskLevel: 'High Risk',
    riskBadgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    statutoryRuleCitation: 'Section 16(2)(c) CGST Act & Notification 11/2017-CT(R): Restricted to actual tax discharged to exchequer',
    statutoryBasis: 'Section 16(2)(c) CGST Act, 2017',
    ruleId: 'SEC-16-2-C',
    description: 'Rate delta (e.g. 18% books vs 12% GSTR-2B). Excess ITC restricted until supplier issues amendment.'
  },
  MISSING_IN_2B: {
    category: 'MISSING_IN_2B',
    title: 'Missing in GSTR-2B',
    shortLabel: 'Missing in 2B',
    riskLevel: 'Critical Risk',
    riskBadgeClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    statutoryRuleCitation: 'Section 16(2)(aa) CGST Act & Circular 170/02/2022-GST: Mandatory manifestation in GSTR-2B for ITC eligibility',
    statutoryBasis: 'Section 16(2)(aa) CGST Act, 2017',
    ruleId: 'SEC-16-2-AA',
    description: 'Vouchers recorded in purchase register with zero manifestation in supplier GSTR-1. 100% ITC at risk.'
  }
};

export interface ExceptionGroupSummary extends GroupDefinition {
  count: number;
  totalAmountPaise: number;
  totalTaxImpactPaise: number;
  items: ExceptionItem[];
}

export function normalizeCategory(category: string): ExceptionCategory | null {
  const c = category.toUpperCase().trim();
  if (c === 'TIMING' || c === 'TIMING_DIFFERENCE') return 'TIMING_DIFFERENCE';
  if (c === 'TYPO' || c === 'INVOICE_TYPO') return 'INVOICE_TYPO';
  if (c === 'RATE_MISMATCH' || c === 'TAX_RATE_MISMATCH') return 'TAX_RATE_MISMATCH';
  if (c === 'MISSING_2B' || c === 'MISSING_IN_2B') return 'MISSING_IN_2B';
  return null;
}

export function toExceptionItem(item: ReviewItem | ExceptionItem): ExceptionItem {
  if ('vendorName' in item && 'taxImpactPaise' in item) {
    return item as ExceptionItem;
  }
  const rev = item as ReviewItem;
  const category = normalizeCategory(rev.category) || 'TIMING_DIFFERENCE';
  const booksAmt = rev.rawAmountPaise ? rev.rawAmountPaise / 100 : parseFloat(rev.amount.replace(/[^0-9.]/g, '')) || 0;
  let gstrAmt = booksAmt;
  if (rev.gstr === '—' || rev.gstr === 'Not found' || rev.gstr === '₹0' || !rev.gstr) {
    gstrAmt = 0;
  } else {
    gstrAmt = parseFloat(rev.gstr.replace(/[^0-9.]/g, '')) || booksAmt;
  }

  // Calculate tax impact in integer paise
  let taxImpactPaise = 0;
  if (category === 'TIMING_DIFFERENCE') {
    taxImpactPaise = Math.round((rev.rawAmountPaise * 18) / 118);
  } else if (category === 'INVOICE_TYPO') {
    taxImpactPaise = Math.round((rev.rawAmountPaise * 18) / 118);
  } else if (category === 'TAX_RATE_MISMATCH') {
    const deltaRupees = Math.abs(booksAmt - gstrAmt);
    taxImpactPaise = Math.round(deltaRupees * 100) || Math.round((rev.rawAmountPaise * 6) / 118);
  } else if (category === 'MISSING_IN_2B') {
    taxImpactPaise = Math.round((rev.rawAmountPaise * 18) / 118);
  }

  let suggestedAction = 'Review and verify invoice';
  if (category === 'TIMING_DIFFERENCE') {
    suggestedAction = 'Batch approve under Section 16(2)(aa) 30-day window';
  } else if (category === 'INVOICE_TYPO') {
    suggestedAction = 'Approve match under Circular 183/15/2022-GST clerical tolerance';
  } else if (category === 'TAX_RATE_MISMATCH') {
    suggestedAction = 'Claim restricted ITC at supplier rate; issue debit note for balance';
  } else if (category === 'MISSING_IN_2B') {
    suggestedAction = 'Withhold ITC claim until supplier uploads GSTR-1';
  }

  return {
    id: rev.id,
    vendorName: rev.title,
    vendorGstin: rev.identifier || '27AAACB0446L1ZS',
    invoiceNumber: rev.booksInvoice,
    gstrInvoiceNumber: rev.gstrInvoice !== '—' && rev.gstrInvoice !== 'Not found' ? rev.gstrInvoice : undefined,
    invoiceDate: rev.booksDate || '12/09/2024',
    gstrDate: rev.filingDate,
    booksAmount: booksAmt,
    gstrAmount: gstrAmt,
    category,
    confidence: rev.confidenceScore,
    statutoryNote: rev.ruleName || rev.why,
    suggestedAction,
    rawAmountPaise: rev.rawAmountPaise,
    taxImpactPaise,
    assignedLedger: rev.assignedLedger,
    ruleCitation: rev.ruleId,
    agreedFields: rev.agreedFields,
    differingFields: rev.differingFields,
    originalItem: rev
  };
}

export function calculateGroupTotals(items: ExceptionItem[]): {
  count: number;
  totalAmountPaise: number;
  totalTaxImpactPaise: number;
} {
  let totalAmountPaise = 0;
  let totalTaxImpactPaise = 0;
  for (const it of items) {
    totalAmountPaise += it.rawAmountPaise;
    totalTaxImpactPaise += it.taxImpactPaise;
  }
  return {
    count: items.length,
    totalAmountPaise,
    totalTaxImpactPaise
  };
}

export function getStatutoryCitation(category: ExceptionCategory): {
  ruleCitation: string;
  statutoryBasis: string;
  riskLevel: 'Minimal Risk' | 'Low Risk' | 'High Risk' | 'Critical Risk';
} {
  const g = EXCEPTION_GROUPS[category];
  return {
    ruleCitation: g.statutoryRuleCitation,
    statutoryBasis: g.statutoryBasis,
    riskLevel: g.riskLevel
  };
}

export function categorizeExceptions(rawItems: (ReviewItem | ExceptionItem)[]): {
  groups: Record<ExceptionCategory, ExceptionGroupSummary>;
  groupedList: ExceptionGroupSummary[];
  flattenedItems: ExceptionItem[];
  otherItems: ExceptionItem[];
} {
  const normalizedItems = rawItems.map(toExceptionItem);

  const groups: Record<ExceptionCategory, ExceptionGroupSummary> = {
    TIMING_DIFFERENCE: {
      ...EXCEPTION_GROUPS.TIMING_DIFFERENCE,
      count: 0,
      totalAmountPaise: 0,
      totalTaxImpactPaise: 0,
      items: []
    },
    INVOICE_TYPO: {
      ...EXCEPTION_GROUPS.INVOICE_TYPO,
      count: 0,
      totalAmountPaise: 0,
      totalTaxImpactPaise: 0,
      items: []
    },
    TAX_RATE_MISMATCH: {
      ...EXCEPTION_GROUPS.TAX_RATE_MISMATCH,
      count: 0,
      totalAmountPaise: 0,
      totalTaxImpactPaise: 0,
      items: []
    },
    MISSING_IN_2B: {
      ...EXCEPTION_GROUPS.MISSING_IN_2B,
      count: 0,
      totalAmountPaise: 0,
      totalTaxImpactPaise: 0,
      items: []
    }
  };

  const otherItems: ExceptionItem[] = [];

  for (const item of normalizedItems) {
    if (groups[item.category]) {
      groups[item.category].items.push(item);
      groups[item.category].count += 1;
      groups[item.category].totalAmountPaise += item.rawAmountPaise;
      groups[item.category].totalTaxImpactPaise += item.taxImpactPaise;
    } else {
      otherItems.push(item);
    }
  }

  const groupedList = [
    groups.TIMING_DIFFERENCE,
    groups.INVOICE_TYPO,
    groups.TAX_RATE_MISMATCH,
    groups.MISSING_IN_2B
  ];

  const flattenedItems: ExceptionItem[] = [
    ...groups.TIMING_DIFFERENCE.items,
    ...groups.INVOICE_TYPO.items,
    ...groups.TAX_RATE_MISMATCH.items,
    ...groups.MISSING_IN_2B.items,
    ...otherItems
  ];

  return { groups, groupedList, flattenedItems, otherItems };
}

export interface BatchConfirmDialogProps {
  isOpen: boolean;
  groupTitle: string;
  vouchersCount: number;
  totalAmountPaise: number;
  totalTaxImpactPaise: number;
  statutoryRuleCitation: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BatchConfirmDialog: React.FC<BatchConfirmDialogProps> = ({
  isOpen,
  groupTitle,
  vouchersCount,
  totalAmountPaise,
  totalTaxImpactPaise,
  statutoryRuleCitation,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-lg bg-[#111115] border border-white/10 rounded-lg p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 id="batch-confirm-title" className="text-base font-semibold text-[#e8eaf0]">
              Batch Approval Confirmation
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#8a909c] hover:text-[#e8eaf0] text-xl px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-[#161920] border border-white/10 rounded-md space-y-1">
            <div className="text-xs text-[#8a909c] font-medium">Exception category</div>
            <div className="text-sm font-semibold text-[#e8eaf0]">{groupTitle}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#161920] border border-white/10 rounded-md">
              <div className="text-xs text-[#8a909c] mb-1">Vouchers to approve</div>
              <div className="text-lg font-semibold text-[#e8eaf0] tabular-nums">
                {vouchersCount} {vouchersCount === 1 ? 'voucher' : 'vouchers'}
              </div>
            </div>
            <div className="p-3 bg-[#161920] border border-white/10 rounded-md">
              <div className="text-xs text-[#8a909c] mb-1">Total aggregate amount</div>
              <div className="text-base font-semibold text-[#e8eaf0] tabular-nums">
                {formatPaiseToINR(totalAmountPaise)}
              </div>
              <div className="text-[10px] text-[#8a909c] tabular-nums mt-0.5">
                {totalAmountPaise.toLocaleString('en-IN')} paise
              </div>
            </div>
          </div>

          {totalTaxImpactPaise > 0 && (
            <div className="px-3 py-2 bg-[#161920] border border-white/10 rounded-md flex items-center justify-between">
              <span className="text-xs text-[#8a909c]">Aggregate tax impact</span>
              <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                {formatPaiseToINR(totalTaxImpactPaise)} ({totalTaxImpactPaise.toLocaleString('en-IN')} paise)
              </span>
            </div>
          )}

          <div className="p-3 bg-[#161920] border border-white/10 rounded-md space-y-1.5">
            <div className="text-xs text-[#8a909c] font-medium">Statutory rule citation</div>
            <div className="text-xs text-neutral-300 leading-relaxed font-normal">
              {statutoryRuleCitation}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-[#161920] hover:bg-[#1f232b] text-xs font-medium text-[#8a909c] hover:text-[#e8eaf0] border border-white/10 transition"
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-xs font-medium text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Batch Approval (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ExceptionQueueProps {
  items: (ReviewItem | ExceptionItem)[];
  selectedIndex?: number;
  focusedIndex?: number;
  onSelect?: (index: number) => void;
  onApprove?: (item: ReviewItem | ExceptionItem | string) => void;
  onApproveItem?: (item: ReviewItem) => void;
  onReject?: (item: ReviewItem | ExceptionItem | string) => void;
  onRejectItem?: (item: ReviewItem) => void;
  onEdit?: (item: ReviewItem | ExceptionItem) => void;
  onEditItem?: (item: ReviewItem) => void;
  onOpenDetail?: (item: ReviewItem) => void;
  onBatchApprove?: (category: ExceptionCategory, items: (ReviewItem | ExceptionItem)[]) => void;
  onBatchApproveTiming?: () => void;
  onResetItems?: () => void;
}

export const ExceptionQueue: React.FC<ExceptionQueueProps> = ({
  items,
  selectedIndex,
  focusedIndex,
  onSelect,
  onApprove,
  onApproveItem,
  onReject,
  onRejectItem,
  onEdit,
  onEditItem,
  onOpenDetail,
  onBatchApprove,
  onBatchApproveTiming,
  onResetItems
}) => {
  const activeIdx = selectedIndex ?? focusedIndex ?? 0;

  const { groups, groupedList, flattenedItems } = useMemo(
    () => categorizeExceptions(items),
    [items]
  );

  const [batchModalGroup, setBatchModalGroup] = useState<ExceptionCategory | null>(null);

  const selectedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIdx]);

  const handleSelect = useCallback((idx: number) => {
    if (onSelect) onSelect(idx);
  }, [onSelect]);

  const handleSingleApprove = useCallback((item: ExceptionItem) => {
    if (onApproveItem && item.originalItem) {
      onApproveItem(item.originalItem);
    } else if (onApprove) {
      onApprove(item.originalItem || item.id);
    }
  }, [onApproveItem, onApprove]);

  const handleSingleReject = useCallback((item: ExceptionItem) => {
    if (onRejectItem && item.originalItem) {
      onRejectItem(item.originalItem);
    } else if (onReject) {
      onReject(item.originalItem || item.id);
    }
  }, [onRejectItem, onReject]);

  const handleSingleEdit = useCallback((item: ExceptionItem) => {
    if (onEditItem && item.originalItem) {
      onEditItem(item.originalItem);
    } else if (onEdit) {
      onEdit(item.originalItem || item);
    }
  }, [onEditItem, onEdit]);

  const handleOpenDetail = useCallback((item: ExceptionItem) => {
    if (onOpenDetail && item.originalItem) {
      onOpenDetail(item.originalItem);
    }
  }, [onOpenDetail]);

  const openBatchDialogForCategory = useCallback((cat: ExceptionCategory) => {
    if (groups[cat] && groups[cat].count > 0) {
      setBatchModalGroup(cat);
    }
  }, [groups]);

  const handleConfirmBatch = useCallback(() => {
    if (!batchModalGroup) return;
    const group = groups[batchModalGroup];
    const originalItems = group.items.map(i => i.originalItem || i);

    if (onBatchApprove) {
      onBatchApprove(batchModalGroup, originalItems);
    } else if (batchModalGroup === 'TIMING_DIFFERENCE' && onBatchApproveTiming) {
      onBatchApproveTiming();
    } else if (onApprove) {
      for (const it of group.items) {
        onApprove(it.originalItem || it.id);
      }
    }
    setBatchModalGroup(null);
  }, [batchModalGroup, groups, onBatchApprove, onBatchApproveTiming, onApprove]);

  // Keyboard navigation & ergonomics
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If batch modal is open, intercept Enter and Escape
      if (batchModalGroup) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          handleConfirmBatch();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setBatchModalGroup(null);
          return;
        }
        return;
      }

      // Ignore input fields
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      // J: Navigate next exception
      if (key === 'j' || e.key === 'ArrowDown') {
        if (flattenedItems.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const next = Math.min(activeIdx + 1, flattenedItems.length - 1);
          handleSelect(next);
        }
        return;
      }

      // K: Navigate previous exception
      if (key === 'k' || e.key === 'ArrowUp') {
        if (flattenedItems.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const prev = Math.max(activeIdx - 1, 0);
          handleSelect(prev);
        }
        return;
      }

      // A: Approve focused item
      if (key === 'a' && !e.ctrlKey && !e.metaKey) {
        if (flattenedItems[activeIdx]) {
          e.preventDefault();
          e.stopPropagation();
          handleSingleApprove(flattenedItems[activeIdx]);
        }
        return;
      }

      // R: Reject focused item
      if (key === 'r' && !e.ctrlKey && !e.metaKey) {
        if (flattenedItems[activeIdx]) {
          e.preventDefault();
          e.stopPropagation();
          handleSingleReject(flattenedItems[activeIdx]);
        }
        return;
      }

      // E: Edit focused item
      if (key === 'e' && !e.ctrlKey && !e.metaKey) {
        if (flattenedItems[activeIdx]) {
          e.preventDefault();
          e.stopPropagation();
          handleSingleEdit(flattenedItems[activeIdx]);
        }
        return;
      }

      // Space: Open Batch Approval Confirmation Dialog
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const focused = flattenedItems[activeIdx];
        if (focused) {
          openBatchDialogForCategory(focused.category);
        } else if (groups.TIMING_DIFFERENCE.count > 0) {
          openBatchDialogForCategory('TIMING_DIFFERENCE');
        }
        return;
      }

      // Enter: Open detail inspection
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        if (flattenedItems[activeIdx]) {
          e.preventDefault();
          e.stopPropagation();
          handleOpenDetail(flattenedItems[activeIdx]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batchModalGroup, activeIdx, flattenedItems, groups, handleSelect, handleSingleApprove, handleSingleReject, handleSingleEdit, handleOpenDetail, openBatchDialogForCategory, handleConfirmBatch]);

  if (items.length === 0) {
    return (
      <div className="p-12 text-center bg-[#111115] border border-white/10 rounded-lg max-w-2xl mx-auto my-12 space-y-4">
        <div className="w-12 h-12 mx-auto rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Check className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-[#e8eaf0]">
          All exception items resolved
        </h2>
        <p className="text-sm text-[#8a909c] max-w-md mx-auto leading-relaxed">
          Every exception item in this filing period has been approved or reconciled. The ledger is clean and ready for statutory return filing.
        </p>
        {onResetItems && (
          <button
            type="button"
            onClick={onResetItems}
            className="px-4 py-2 rounded-md bg-[#161920] hover:bg-[#1f232b] text-xs font-medium text-[#e8eaf0] border border-white/10 transition"
          >
            Reset sample exception queue
          </button>
        )}
      </div>
    );
  }

  const activeBatchGroup = batchModalGroup ? groups[batchModalGroup] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-semibold text-[#e8eaf0] flex items-center gap-2.5">
            <span>Exception Queue</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium tabular-nums">
              {flattenedItems.length} Pending
            </span>
          </h2>
          <p className="text-xs text-[#8a909c] mt-1">
            Grouped by root cause. Use <kbd className="px-1.5 py-0.5 rounded bg-[#161920] border border-white/10 text-neutral-300 text-[11px]">J/K</kbd> to navigate, <kbd className="px-1.5 py-0.5 rounded bg-[#161920] border border-white/10 text-neutral-300 text-[11px]">A</kbd> approve, <kbd className="px-1.5 py-0.5 rounded bg-[#161920] border border-white/10 text-neutral-300 text-[11px]">R</kbd> reject, <kbd className="px-1.5 py-0.5 rounded bg-[#161920] border border-white/10 text-neutral-300 text-[11px]">E</kbd> edit, <kbd className="px-1.5 py-0.5 rounded bg-[#161920] border border-white/10 text-neutral-300 text-[11px]">Space</kbd> batch approve.
          </p>
        </div>

        {groups.TIMING_DIFFERENCE.count > 0 && (
          <button
            type="button"
            onClick={() => openBatchDialogForCategory('TIMING_DIFFERENCE')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-medium transition shadow-lg shadow-emerald-950/40 shrink-0 self-start sm:self-auto"
          >
            <Layers className="w-4 h-4" />
            <span>Batch Approve {groups.TIMING_DIFFERENCE.count} Timing Differences</span>
            <span className="text-[10px] bg-emerald-700/60 px-1.5 py-0.5 rounded">Space</span>
          </button>
        )}
      </div>

      {/* Structured Exception Buckets */}
      <div className="space-y-6" role="listbox" aria-label="Exception queue groups">
        {groupedList.map((group) => {
          if (group.count === 0) return null;

          return (
            <div key={group.category} className="space-y-3">
              {/* Group Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#161920] border border-white/10 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(group.category)}
                    <h3 className="text-sm font-semibold text-[#e8eaf0]">{group.title}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${group.riskBadgeClass}`}>
                      {group.riskLevel}
                    </span>
                    <span className="text-xs text-[#8a909c] tabular-nums">
                      ({group.count} {group.count === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  <div className="text-xs text-[#8a909c] flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Total value: <strong className="text-[#e8eaf0] tabular-nums">{formatPaiseToINR(group.totalAmountPaise)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Tax impact: <strong className="text-emerald-400 tabular-nums">{formatPaiseToINR(group.totalTaxImpactPaise)}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-neutral-400 font-normal">{group.statutoryBasis}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openBatchDialogForCategory(group.category)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111115] hover:bg-[#1f232b] text-neutral-300 hover:text-white border border-white/10 text-xs font-medium transition shrink-0 self-start sm:self-auto"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Batch approve group</span>
                </button>
              </div>

              {/* Items in this Group */}
              <div className="space-y-2.5">
                {group.items.map((item) => {
                  const itemGlobalIndex = flattenedItems.findIndex(i => i.id === item.id);
                  const isSelected = itemGlobalIndex === activeIdx;

                  return (
                    <div
                      key={item.id}
                      ref={isSelected ? selectedRef : undefined}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => handleSelect(itemGlobalIndex)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isSelected 
                          ? 'border-emerald-500/50 bg-neutral-900/80 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-950/20' 
                          : 'bg-[#111115] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#e8eaf0]">{item.vendorName}</span>
                          <span className="text-[11px] font-mono text-[#8a909c]">{item.vendorGstin}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${group.riskBadgeClass}`}>
                            {group.shortLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[#8a909c] flex-wrap">
                          <span>
                            Books: <strong className="font-mono text-neutral-200">{item.invoiceNumber}</strong> (<span className="tabular-nums">{item.invoiceDate}</span>)
                          </span>
                          {item.gstrInvoiceNumber && (
                            <span>
                              GSTR-2B: <strong className="font-mono text-neutral-200">{item.gstrInvoiceNumber}</strong> (<span className="tabular-nums">{item.gstrDate || 'Unfiled'}</span>)
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#8a909c] flex items-center gap-2 flex-wrap">
                          <span className="text-emerald-400/90 font-medium">{item.statutoryNote}</span>
                          <span>•</span>
                          <span>{item.suggestedAction}</span>
                        </div>
                      </div>

                      {/* Amounts & Quick Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[#e8eaf0] tabular-nums">
                            {formatINR(item.booksAmount)}
                          </div>
                          <div className="text-[11px] text-[#8a909c] tabular-nums">
                            Tax: {formatPaiseToINR(item.taxImpactPaise)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Approve item (A)"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSingleApprove(item);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] text-emerald-400 border border-emerald-500/30 text-xs font-medium transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                            <span className="text-[10px] opacity-60">A</span>
                          </button>

                          <button
                            type="button"
                            title="Reject item (R)"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSingleReject(item);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] text-rose-400 border border-rose-500/30 text-xs font-medium transition"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                            <span className="text-[10px] opacity-60">R</span>
                          </button>

                          <button
                            type="button"
                            title="Edit ledger (E)"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSingleEdit(item);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#161920] hover:bg-[#1f232b] text-[#8a909c] hover:text-[#e8eaf0] border border-white/10 text-xs font-medium transition"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                            <span className="text-[10px] opacity-60">E</span>
                          </button>

                          {onOpenDetail && (
                            <button
                              type="button"
                              title="Inspect details (Enter)"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(item);
                              }}
                              className="px-2 py-1.5 rounded-md bg-[#161920] hover:bg-[#1f232b] text-[#8a909c] hover:text-[#e8eaf0] border border-white/10 text-xs transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Approval Confirmation Dialog */}
      {activeBatchGroup && (
        <BatchConfirmDialog
          isOpen={Boolean(batchModalGroup)}
          groupTitle={activeBatchGroup.title}
          vouchersCount={activeBatchGroup.count}
          totalAmountPaise={activeBatchGroup.totalAmountPaise}
          totalTaxImpactPaise={activeBatchGroup.totalTaxImpactPaise}
          statutoryRuleCitation={activeBatchGroup.statutoryRuleCitation}
          onConfirm={handleConfirmBatch}
          onCancel={() => setBatchModalGroup(null)}
        />
      )}
    </div>
  );
};

function getCategoryIcon(category: ExceptionCategory) {
  switch (category) {
    case 'TIMING_DIFFERENCE':
      return <Clock className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'INVOICE_TYPO':
      return <FileEdit className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'TAX_RATE_MISMATCH':
      return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'MISSING_IN_2B':
      return <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />;
  }
}
