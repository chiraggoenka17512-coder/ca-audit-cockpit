import React, { useEffect, useState } from 'react';
import { ReviewItem } from '../data/reviewItems';
import { X, Check, Edit3, AlertTriangle, ShieldCheck, ExternalLink, FileSearch } from 'lucide-react';

interface DetailPanelProps {
  item: ReviewItem | null;
  onClose: () => void;
  onApprove: (item: ReviewItem) => void;
  onEdit: (item: ReviewItem) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  item,
  onClose,
  onApprove,
  onEdit
}) => {
  const [activeSnippetField, setActiveSnippetField] = useState<string | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showRuleModal) {
          setShowRuleModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose, showRuleModal]);

  if (!item) return null;

  const isLowConfidence = item.confidenceScore < 0.85;

  return (
    <aside 
      className="w-[460px] shrink-0 border-l border-[#262a33] bg-[#171a21] flex flex-col h-full select-none z-30"
      aria-label="Detail review"
    >
      {/* Header: Clean, direct, no uppercase eyebrow */}
      <div className="p-5 border-b border-[#262a33] flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#e8eaf0] leading-snug">{item.title}</h2>
          <div className="text-xs text-[#8a909c] mt-0.5">{item.identifier}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#8a909c] hover:text-[#e8eaf0] transition"
          aria-label="Close"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Amber Confidence Warning Banner if < 85% */}
        {isLowConfidence && (
          <div className="p-3 rounded-md bg-[#0f1115] border border-[#f5b754]/40 text-xs text-[#f5b754] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#f5b754]" />
            <div>
              <span className="font-semibold block text-[#f5b754]">Amber check: Field confidence {Math.round(item.confidenceScore * 100)}%</span>
              <span className="text-[#8a909c] mt-0.5 block">
                Extracted below 85% certainty threshold. Verify highlighted values against source document before approving.
              </span>
            </div>
          </div>
        )}

        {/* Source Document Visual Snippet (Simulated OCR Crop) */}
        {item.sourceSnippet && (
          <div className="p-3.5 rounded-lg bg-[#0f1115] border border-[#262a33] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8a909c]">
              <span className="flex items-center gap-1.5 font-medium text-[#e8eaf0]">
                <FileSearch className="w-3.5 h-3.5 text-[#3ddc97]" />
                <span>Source document location</span>
              </span>
              <span className="font-mono text-[11px] text-[#8a909c]">
                Box [{item.sourceSnippet.box.join(', ')}]
              </span>
            </div>

            <div 
              onClick={() => setActiveSnippetField(item.sourceSnippet?.field || null)}
              className={`p-3 rounded border text-xs cursor-pointer transition ${
                activeSnippetField 
                  ? 'bg-[#171a21] border-[#3ddc97] text-[#e8eaf0]' 
                  : 'bg-[#13161c] border-[#262a33] text-[#8a909c] hover:border-[#3a404c]'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[#8a909c]">{item.sourceSnippet.label}</span>
                <span className="text-[#3ddc97] text-[11px]">Click to synchronize</span>
              </div>
              <div className="font-mono text-sm text-[#e8eaf0] font-medium bg-[#0f1115] p-1.5 rounded border border-[#262a33]">
                "{item.sourceSnippet.ocrValue}"
              </div>
            </div>
          </div>
        )}

        {/* Books vs GSTR-2B comparison */}
        <div className="cockpit-compare">
          <div>
            <small>Your books</small>
            <span className="text-xs text-[#8a909c] block truncate">Invoice {item.booksInvoice}</span>
            <b className="text-base text-[#e8eaf0]">{item.books}</b>
            {item.booksDate && (
              <span className="text-xs text-[#8a909c] block mt-1">
                Date: {item.booksDate}
              </span>
            )}
          </div>
          <div>
            <small>GSTR-2B portal</small>
            <span className="text-xs text-[#8a909c] block truncate">Invoice {item.gstrInvoice}</span>
            <b className="text-base text-[#e8eaf0]">{item.gstr}</b>
            {item.filingDate && (
              <span className="text-xs text-[#8a909c] block mt-1">
                Filed: {item.filingDate}
              </span>
            )}
          </div>
        </div>

        {/* Assigned Ledger Head & Category */}
        <div className="p-3 rounded-md bg-[#0f1115] border border-[#262a33] text-xs flex justify-between items-center">
          <div>
            <span className="text-[#8a909c] block">Assigned ledger account</span>
            <span className="text-[#e8eaf0] font-medium mt-0.5 block">{item.assignedLedger || 'General Expenses'}</span>
          </div>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="text-xs text-[#3ddc97] hover:underline flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit (E)</span>
          </button>
        </div>

        {/* Plain reason */}
        <div>
          <label className="text-xs text-[#8a909c] block mb-1">Inspection rationale</label>
          <p className="cockpit-why leading-relaxed">
            {item.why}
          </p>
        </div>

        {/* Statutory Rule Citation */}
        <div className="pt-2 border-t border-[#262a33] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#8a909c]">Statutory tax citation</span>
            {item.ruleVerified ? (
              <span className="text-[#3ddc97] text-[11px]">Verified rule</span>
            ) : (
              <span className="text-[#ff6b6b] text-[11px] font-semibold">UNVERIFIED RULE</span>
            )}
          </div>

          {item.ruleName ? (
            <div className="p-3 rounded-md bg-[#0f1115] border border-[#262a33] space-y-1.5">
              <div className="text-xs font-medium text-[#e8eaf0]">
                {item.ruleName}
              </div>
              <div className="text-[11px] text-[#8a909c] flex justify-between">
                <span>Rule ID: {item.ruleId || 'N/A'}</span>
                <span>Effective: {item.ruleEffectiveDate || 'Open'}</span>
              </div>
              {!item.ruleVerified && (
                <div className="text-[11px] text-[#ff6b6b] mt-1">
                  Caution: Source circular cannot be cryptographically verified. Do not rely on this rule for automated conclusions.
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowRuleModal(true)}
                className="text-[11px] text-[#3ddc97] hover:underline flex items-center gap-1 mt-1"
              >
                <span>View full rule text</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-[#8a909c]">
              No rule cited
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-[#262a33] bg-[#171a21] flex items-center gap-3">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="cockpit-btn flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
          title="Edit ledger (E)"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit ledger (E)</span>
        </button>

        <button
          type="button"
          onClick={() => onApprove(item)}
          className="cockpit-btn primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
          title="Approve match (A)"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Approve (A)</span>
        </button>
      </div>

      {/* Statutory Rule Text Modal */}
      {showRuleModal && (
        <div
          className="cockpit-overlay"
          onClick={() => setShowRuleModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-[#171a21] border border-[#262a33] rounded-lg p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#262a33] mb-3">
              <h3 className="text-sm font-semibold text-[#e8eaf0]">{item.ruleName}</h3>
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="text-[#8a909c] hover:text-[#e8eaf0]"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-[#8a909c] leading-relaxed mb-4">
              "No registered person shall be entitled to the credit of any input tax in respect of any supply of goods or services or both to him unless the details of the invoice or debit note referred to in clause (a) have been furnished by the supplier in the statement of outward supplies and such details have been communicated to the recipient of such invoice or debit note in the manner specified under section 37."
            </p>

            <div className="text-xs text-[#8a909c] space-y-1 bg-[#0f1115] p-3 rounded border border-[#262a33] mb-4">
              <div>Rule ID: {item.ruleId}</div>
              <div>Source: CGST Act 2017 / CBIC Notification</div>
              <div>Status: {item.ruleVerified ? 'Verified Statutory Authority' : 'UNVERIFIED'}</div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="cockpit-btn text-xs py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
