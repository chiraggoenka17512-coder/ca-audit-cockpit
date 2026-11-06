import React, { useMemo, useRef, useEffect } from 'react';
import { 
  AlertTriangle, 
  Check, 
  Layers, 
  Clock, 
  FileEdit, 
  ShieldAlert
} from 'lucide-react';
import { formatPaiseToINR } from '../../data/formatters';

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
  category: 'TIMING_DIFFERENCE' | 'INVOICE_TYPO' | 'TAX_RATE_MISMATCH' | 'MISSING_IN_2B';
  confidence: number;
  statutoryNote: string;
  suggestedAction: string;
}

interface ExceptionQueueProps {
  items: ExceptionItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onApprove: (id: string) => void;
  onBatchApproveTiming: () => void;
}

export const ExceptionQueue: React.FC<ExceptionQueueProps> = ({
  items,
  selectedIndex,
  onSelect,
  onApprove,
  onBatchApproveTiming
}) => {
  const timingItems = useMemo(
    () => items.filter(i => i.category === 'TIMING_DIFFERENCE'),
    [items]
  );

  const selectedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  return (
    <div className="space-y-6">
      {/* Header with Batch Approve Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <span>Exception Queue</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              {items.length} Pending
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Grouped by root cause. Use <kbd className="font-mono bg-obsidian-800 px-1 py-0.5 rounded text-neutral-300">J/K</kbd> to navigate, <kbd className="font-mono bg-obsidian-800 px-1 py-0.5 rounded text-neutral-300">A</kbd> to approve.
          </p>
        </div>

        {timingItems.length > 0 && (
          <button
            type="button"
            onClick={onBatchApproveTiming}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-medium transition-all duration-75 shadow-lg shadow-emerald-950/40"
          >
            <Layers className="w-4 h-4" />
            <span>Batch Approve {timingItems.length} Timing Differences</span>
            <span className="text-[10px] font-mono bg-emerald-700/60 px-1.5 py-0.5 rounded">Space</span>
          </button>
        )}
      </div>

      {/* Exception List */}
      <div className="space-y-3" role="listbox" aria-label="Exceptions list">
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={item.id}
              ref={isSelected ? selectedRef : undefined}
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onApprove(item.id);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-75 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isSelected 
                  ? 'bg-obsidian-900 border-emerald-500/80 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30' 
                  : 'bg-obsidian-900/60 border-obsidian-800 hover:border-obsidian-700'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-200">{item.vendorName}</span>
                  <span className="text-[10px] font-mono text-neutral-400">{item.vendorGstin}</span>
                  {getCategoryBadge(item.category)}
                </div>

                <div className="flex items-center gap-4 text-xs text-neutral-300">
                  <span>Books: <strong className="font-mono">{item.invoiceNumber}</strong> ({item.invoiceDate})</span>
                  {item.gstrInvoiceNumber && (
                    <span className="text-neutral-400">
                      GSTR-2B: <strong className="font-mono text-neutral-200">{item.gstrInvoiceNumber}</strong> ({item.gstrDate})
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                  <span className="text-emerald-400/90 font-medium">{item.statutoryNote}</span>
                  <span>•</span>
                  <span>{item.suggestedAction}</span>
                </div>
              </div>

              {/* Amount and Action */}
              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-neutral-100">
                    {formatPaiseToINR(item.booksAmount)}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400">
                    Confidence: {Math.round(item.confidence * 100)}%
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(item.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all duration-75"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve</span>
                  <span className="text-[10px] font-mono opacity-60">A</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getCategoryBadge(category: ExceptionItem['category']) {
  switch (category) {
    case 'TIMING_DIFFERENCE':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Timing Difference</span>
        </span>
      );
    case 'INVOICE_TYPO':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
          <FileEdit className="w-3 h-3" />
          <span>Typo Match</span>
        </span>
      );
    case 'TAX_RATE_MISMATCH':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>Tax Rate Discrepancy</span>
        </span>
      );
    case 'MISSING_IN_2B':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          <span>Missing in GSTR-2B</span>
        </span>
      );
  }
}
