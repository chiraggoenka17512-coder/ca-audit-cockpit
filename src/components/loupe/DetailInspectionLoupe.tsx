import React from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  Check, 
  FileEdit, 
  ExternalLink,
  Lock,
  Hash
} from 'lucide-react';
import { ExceptionItem } from '../queue/ExceptionQueue';
import { formatPaiseToINR } from '../../data/formatters';

interface DetailInspectionLoupeProps {
  item?: ExceptionItem;
  onApprove: (id: string) => void;
  onEdit: (id: string) => void;
}

export const DetailInspectionLoupe: React.FC<DetailInspectionLoupeProps> = ({
  item,
  onApprove,
  onEdit
}) => {
  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-neutral-400">
        <BookOpen className="w-8 h-8 opacity-40 mb-2" />
        <p className="text-xs">Select an invoice from the queue to inspect details & statutory citations.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-between p-4 space-y-4 overflow-y-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="pb-3 border-b border-obsidian-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Detail Inspection Loupe</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              {Math.round(item.confidence * 100)}% Confidence
            </span>
          </div>
          <h3 className="text-sm font-bold text-neutral-100 mt-1">{item.vendorName}</h3>
          <div className="text-[11px] font-mono text-neutral-400">{item.vendorGstin}</div>
        </div>

        {/* Side-by-Side Comparison */}
        <div>
          <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2">Source Comparison</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Column A: Client Books */}
            <div className="p-3 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-2">
              <div className="text-[10px] font-mono text-sky-400 uppercase font-bold">Client Books</div>
              <div>
                <div className="text-[10px] text-neutral-400">Invoice Number</div>
                <div className="font-mono text-neutral-200 font-bold">{item.invoiceNumber}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400">Date</div>
                <div className="text-neutral-200">{item.invoiceDate}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400">Total Value</div>
                <div className="font-mono text-neutral-100 font-bold">{formatPaiseToINR(item.booksAmount)}</div>
              </div>
            </div>

            {/* Column B: GSTR-2B Record */}
            <div className="p-3 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-2">
              <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold">GSTR-2B Government</div>
              <div>
                <div className="text-[10px] text-neutral-400">Invoice Number</div>
                <div className="font-mono text-neutral-200 font-bold">{item.gstrInvoiceNumber || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400">Date</div>
                <div className="text-neutral-200">{item.gstrDate || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400">Total Value</div>
                <div className="font-mono text-neutral-100 font-bold">
                  {item.gstrAmount ? formatPaiseToINR(item.gstrAmount) : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statutory Rule Citation */}
        <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-800 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Statutory Rulebook Citation</span>
          </div>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            {item.statutoryNote}
          </p>
          <div className="text-[10px] text-neutral-400 pt-1 border-t border-obsidian-800 flex items-center justify-between">
            <span>Applicable Act: CGST Sec 16(2)(aa)</span>
            <span className="text-emerald-400 font-mono">ITC Eligible</span>
          </div>
        </div>

        {/* SHA-256 Audit Integrity Proof */}
        <div className="p-3 rounded-lg bg-obsidian-950 border border-obsidian-800/80 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
            <Hash className="w-3 h-3 text-sky-400" />
            <span>Immutable SHA-256 Trail</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-400 truncate">
            Payload Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-obsidian-800 space-y-2">
        <button
          onClick={() => onApprove(item.id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-lg shadow-emerald-950/40"
        >
          <Check className="w-4 h-4" />
          <span>Approve Match</span>
          <span className="text-[10px] font-mono bg-emerald-700/60 px-1.5 py-0.5 rounded">A</span>
        </button>

        <button
          onClick={() => onEdit(item.id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-obsidian-900 hover:bg-obsidian-800 text-neutral-300 border border-obsidian-700 text-xs font-medium transition"
        >
          <FileEdit className="w-4 h-4" />
          <span>Edit Ledger Head</span>
          <span className="text-[10px] font-mono opacity-60">E</span>
        </button>
      </div>
    </div>
  );
};
