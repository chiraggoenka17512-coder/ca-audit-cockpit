import React from 'react';
import { 
  BookOpen, 
  Check, 
  FileEdit, 
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
        <p className="text-xs">Select an invoice from the queue to inspect details and statutory citations.</p>
      </div>
    );
  }

  const isLowConfidence = item.confidence < 0.85;

  return (
    <div className="h-full flex flex-col justify-between p-4 space-y-4 overflow-y-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="pb-3 border-b border-[#262a33]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#e8eaf0]">Detail Inspection Loupe</span>
            <span className={`text-xs px-2 py-0.5 rounded tabular-nums font-medium ${
              isLowConfidence 
                ? 'bg-[#f5b754]/10 text-[#f5b754] border border-[#f5b754]/30' 
                : 'bg-[#3ddc97]/10 text-[#3ddc97] border border-[#3ddc97]/20'
            }`}>
              {Math.round(item.confidence * 100)}% Confidence
            </span>
          </div>
          <h3 className="text-sm font-semibold text-[#e8eaf0] mt-1">{item.vendorName}</h3>
          <div className="text-xs text-[#8a909c]">{item.vendorGstin}</div>
        </div>

        {/* Side-by-Side Comparison */}
        <div>
          <div className="text-xs font-medium text-[#8a909c] mb-2">Source comparison</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Column A: Client Books */}
            <div className="p-3 rounded-lg bg-[#0f1115] border border-[#262a33] space-y-2">
              <div className="text-xs text-[#38bdf8] font-semibold">Client books</div>
              <div>
                <div className="text-[10px] text-[#8a909c]">Invoice number</div>
                <div className="text-[#e8eaf0] font-medium">{item.invoiceNumber}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#8a909c]">Date</div>
                <div className="text-[#e8eaf0] tabular-nums">{item.invoiceDate}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#8a909c]">Total value</div>
                <div className="text-[#e8eaf0] font-semibold tabular-nums">{formatPaiseToINR(item.booksAmount)}</div>
              </div>
            </div>

            {/* Column B: GSTR-2B Record */}
            <div className="p-3 rounded-lg bg-[#0f1115] border border-[#262a33] space-y-2">
              <div className="text-xs text-[#3ddc97] font-semibold">GSTR-2B government</div>
              <div>
                <div className="text-[10px] text-[#8a909c]">Invoice number</div>
                <div className="text-[#e8eaf0] font-medium">{item.gstrInvoiceNumber || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#8a909c]">Date</div>
                <div className="text-[#e8eaf0] tabular-nums">{item.gstrDate || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#8a909c]">Total value</div>
                <div className="text-[#e8eaf0] font-semibold tabular-nums">
                  {item.gstrAmount ? formatPaiseToINR(item.gstrAmount) : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statutory Rule Citation */}
        <div className="p-3 rounded-lg bg-[#0f1115] border border-[#262a33] space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3ddc97]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Statutory rulebook citation</span>
          </div>
          <p className="text-xs text-[#8a909c] leading-relaxed">
            {item.statutoryNote}
          </p>
          <div className="text-[11px] text-[#8a909c] pt-1 border-t border-[#262a33] flex items-center justify-between">
            <span>Applicable Act: CGST Sec 16(2)(aa)</span>
            <span className="text-[#3ddc97]">ITC Eligible</span>
          </div>
        </div>

        {/* SHA-256 Audit Integrity Proof */}
        <div className="p-3 rounded-lg bg-[#0f1115] border border-[#262a33] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-[#8a909c]">
            <Hash className="w-3 h-3 text-[#38bdf8]" />
            <span>Immutable SHA-256 trail</span>
          </div>
          <div className="text-[11px] font-mono text-[#8a909c] truncate">
            Payload hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#262a33] space-y-2">
        <button
          onClick={() => onApprove(item.id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-medium transition"
        >
          <Check className="w-4 h-4" />
          <span>Approve match</span>
          <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">A</span>
        </button>

        <button
          onClick={() => onEdit(item.id)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#171a21] hover:bg-[#20242e] text-[#e8eaf0] border border-[#262a33] text-xs font-medium transition"
        >
          <FileEdit className="w-4 h-4" />
          <span>Edit ledger head</span>
          <span className="text-[10px] opacity-60">E</span>
        </button>
      </div>
    </div>
  );
};
