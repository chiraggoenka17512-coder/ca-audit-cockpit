import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ReviewItem, ExtractedField } from '../data/reviewItems';
import { getStatutoryRule } from '../data/rules';
import { 
  X, 
  Check, 
  Edit3, 
  AlertTriangle, 
  ExternalLink, 
  FileSearch, 
  CheckCircle2, 
  ArrowRight,
  BookOpen
} from 'lucide-react';

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
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  // Derive extracted fields list from item
  const extractedFields: ExtractedField[] = useMemo(() => {
    if (!item) return [];
    if (item.extractedFields && item.extractedFields.length > 0) {
      return item.extractedFields;
    }
    // Default fallback fields if not explicitly seeded
    const list: ExtractedField[] = [
      {
        id: 'f-inv',
        label: 'Invoice Number',
        field: 'invoiceNumber',
        ocrValue: item.booksInvoice || '—',
        confidence: item.category === 'TYPO' ? 0.76 : 0.98,
        box: [240, 60, 140, 24]
      },
      {
        id: 'f-date',
        label: 'Invoice Date',
        field: 'invoiceDate',
        ocrValue: item.booksDate || '12/09/2024',
        confidence: item.category === 'TIMING' ? 0.82 : 0.95,
        box: [240, 90, 110, 22]
      },
      {
        id: 'f-gstin',
        label: 'Supplier GSTIN',
        field: 'vendorGSTIN',
        ocrValue: item.identifier,
        confidence: 0.99,
        box: [40, 60, 170, 24]
      },
      {
        id: 'f-total',
        label: 'Total Amount',
        field: 'totalAmount',
        ocrValue: item.books || item.amount,
        confidence: item.confidenceScore,
        box: item.sourceSnippet?.box || [260, 390, 140, 26]
      }
    ];
    return list;
  }, [item]);

  // Set default active field on item change
  useEffect(() => {
    if (extractedFields.length > 0) {
      // Prefer field with low confidence if present, or the one matching sourceSnippet
      const lowConf = extractedFields.find(f => f.confidence < 0.85);
      if (lowConf) {
        setActiveFieldId(lowConf.id);
      } else {
        setActiveFieldId(extractedFields[0].id);
      }
    }
  }, [extractedFields]);

  // Keyboard navigation & Esc handling
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against typing in form inputs
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      // If Rule Modal is open, Escape should close ONLY the modal and NOT the panel
      if (showRuleModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setShowRuleModal(false);
          return;
        }
        return;
      }

      // Detail Panel shortcuts
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onApprove(item);
        return;
      }

      if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onEdit(item);
        return;
      }
    };

    // Use capture phase so modal Esc intercepts before window listener
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [item, showRuleModal, onClose, onApprove, onEdit]);

  // Focus modal close button when modal opens
  useEffect(() => {
    if (showRuleModal && modalCloseButtonRef.current) {
      modalCloseButtonRef.current.focus();
    }
  }, [showRuleModal]);

  if (!item) return null;

  const activeField = extractedFields.find(f => f.id === activeFieldId) || extractedFields[0];
  const hasLowConfidenceField = extractedFields.some(f => f.confidence < 0.85) || item.confidenceScore < 0.85;
  const lowestConfidence = Math.min(...extractedFields.map(f => f.confidence), item.confidenceScore);

  // Lookup statutory rule definition
  const statutoryRule = getStatutoryRule(item.ruleId);
  const ruleTitle = statutoryRule?.name || item.ruleName;
  const isRuleVerified = statutoryRule ? statutoryRule.verified : item.ruleVerified;
  const ruleEffectiveDate = statutoryRule 
    ? `${statutoryRule.effectiveFrom} to ${statutoryRule.effectiveTo}` 
    : (item.ruleEffectiveDate || 'Open');

  // Fallback agreed & differing field lists if not provided
  const agreedList = item.agreedFields && item.agreedFields.length > 0 
    ? item.agreedFields 
    : [
        `Gross Amount: ${item.books}`,
        `Invoice Reference: ${item.booksInvoice}`,
        `GSTIN: ${item.identifier}`
      ];

  const differingList = item.differingFields && item.differingFields.length > 0
    ? item.differingFields
    : (item.category === 'TIMING' 
        ? [`Date delta: Books (${item.booksDate || 'N/A'}) vs GSTR-2B (${item.filingDate || 'N/A'})`]
        : item.category === 'RATE_MISMATCH'
          ? [`Tax rate difference: Books (${item.books}) vs GSTR-2B (${item.gstr})`]
          : [`Verification required for ${item.category}`]);

  return (
    <aside 
      className="w-[500px] xl:w-[540px] shrink-0 border-l border-[#262a33] bg-[#171a21] flex flex-col h-full select-none z-30"
      aria-label="Detail review"
    >
      {/* Header */}
      <div className="p-5 border-b border-[#262a33] flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#e8eaf0] leading-snug">{item.title}</h2>
          <div className="text-xs text-[#8a909c] mt-0.5">{item.identifier}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#8a909c] hover:text-[#e8eaf0] transition"
          aria-label="Close detail panel"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Amber Confidence Warning Banner if < 85% */}
        {hasLowConfidenceField && (
          <div className="p-3.5 rounded-md bg-[#0f1115] border border-[#f5b754]/50 text-xs text-[#f5b754] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#f5b754]" />
            <div>
              <span className="font-semibold block text-[#f5b754]">
                Amber check: Field confidence <span className="tabular-nums">{Math.round(lowestConfidence * 100)}%</span>
              </span>
              <span className="text-[#8a909c] mt-0.5 block leading-relaxed">
                Extracted below 85% certainty threshold. Verify highlighted values against source document before approving.
              </span>
            </div>
          </div>
        )}

        {/* Dual-Pane Section: Interactive Document Preview with Bounding Box Sync */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[#8a909c]">
            <span className="flex items-center gap-1.5 font-medium text-[#e8eaf0]">
              <FileSearch className="w-3.5 h-3.5 text-[#3ddc97]" />
              <span>Source document inspection</span>
            </span>
            <span className="text-[11px] text-[#8a909c]">
              Box [<span className="tabular-nums">{activeField?.box.join(', ')}</span>]
            </span>
          </div>

          {/* Document Preview Canvas (Simulated Scanned Document Page) */}
          <div className="relative bg-[#0b0d11] border border-[#262a33] rounded-lg p-3.5 h-52 overflow-hidden flex flex-col justify-between">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b border-[#262a33]/60 pb-1.5 text-[11px] text-[#8a909c]">
              <span className="text-[#e8eaf0] font-medium truncate max-w-[240px]">
                {item.booksInvoice ? `${item.booksInvoice}.pdf` : 'Scanned_Invoice.pdf'}
              </span>
              <span className="text-[10px] text-[#8a909c]">Page 1 of 1 · 100%</span>
            </div>

            {/* Document Surface Representation with Coordinate Boxes */}
            <div className="relative flex-1 my-2 bg-[#13161c] border border-[#262a33]/40 rounded p-2.5 flex flex-col justify-between overflow-hidden">
              {/* Document Header Representation */}
              <div className="flex justify-between items-start text-[10px]">
                <div className="space-y-0.5">
                  <div className="text-[#e8eaf0] font-semibold tracking-wide">TAX INVOICE</div>
                  <div className="text-[#8a909c] truncate max-w-[150px]">{item.title}</div>
                  <div className="text-[#8a909c] text-[9px]">{item.identifier}</div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-[#e8eaf0] tabular-nums font-medium">Inv #{item.booksInvoice}</div>
                  <div className="text-[#8a909c] tabular-nums text-[9px]">Date: {item.booksDate || '12/09/2024'}</div>
                </div>
              </div>

              {/* Document Line Item Representation */}
              <div className="border-t border-b border-[#262a33]/40 py-1.5 my-1 text-[9px] flex justify-between text-[#8a909c]">
                <span>Description: Commercial Services / Goods</span>
                <span className="tabular-nums text-[#e8eaf0]">{item.books}</span>
              </div>

              {/* Document Footer Total */}
              <div className="flex justify-between items-center text-[10px] pt-1">
                <span className="text-[#8a909c]">Grand Total (Paise Exact)</span>
                <span className="text-[#e8eaf0] font-semibold tabular-nums">{item.books}</span>
              </div>

              {/* Interactive Bounding Box Overlays */}
              {extractedFields.map((field) => {
                const isSelected = activeField?.id === field.id;
                const isFieldLowConfidence = field.confidence < 0.85;

                // Scale coordinates proportionately to fit canvas
                const [x, y, w, h] = field.box;
                const leftPercent = Math.min(85, Math.max(5, (x / 400) * 100));
                const topPercent = Math.min(80, Math.max(8, (y / 500) * 100));

                return (
                  <div
                    key={field.id}
                    onClick={() => setActiveFieldId(field.id)}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                    }}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all px-2 py-1 rounded text-[10px] border whitespace-nowrap z-10 ${
                      isSelected
                        ? isFieldLowConfidence
                          ? 'border-[#f5b754] bg-[#f5b754]/20 text-[#f5b754] shadow-md ring-1 ring-[#f5b754]'
                          : 'border-[#3ddc97] bg-[#3ddc97]/20 text-[#3ddc97] shadow-md ring-1 ring-[#3ddc97]'
                        : 'border-[#262a33] bg-[#0f1115]/80 text-[#8a909c] hover:border-[#3ddc97]/60'
                    }`}
                    title={`Click to focus ${field.label} [${field.box.join(', ')}]`}
                  >
                    <span className="font-medium mr-1">{field.label}:</span>
                    <span className="tabular-nums font-semibold">{field.ocrValue}</span>
                    {isSelected && (
                      <span className="ml-1 text-[9px] opacity-80">
                        ({Math.round(field.confidence * 100)}%)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Status Cue */}
            <div className="text-[11px] text-[#8a909c] flex items-center justify-between">
              <span>Selected coordinate bounding box</span>
              <span className="text-[#3ddc97]">
                {activeField?.label} · <span className="tabular-nums">{Math.round(activeField?.confidence * 100)}%</span>
              </span>
            </div>
          </div>

          {/* Structured Extracted Fields List */}
          <div className="space-y-2">
            <div className="text-xs text-[#8a909c] flex justify-between items-center">
              <span>Extracted document fields ({extractedFields.length})</span>
              <span className="text-[11px] text-[#8a909c]">Click field to highlight on preview</span>
            </div>

            <div className="space-y-1.5">
              {extractedFields.map((field) => {
                const isSelected = activeField?.id === field.id;
                const isFieldLowConfidence = field.confidence < 0.85;

                return (
                  <div
                    key={field.id}
                    onClick={() => setActiveFieldId(field.id)}
                    className={`p-2.5 rounded-md border text-xs cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? isFieldLowConfidence
                          ? 'bg-[#171a21] border-[#f5b754] text-[#e8eaf0]'
                          : 'bg-[#171a21] border-[#3ddc97] text-[#e8eaf0]'
                        : 'bg-[#0f1115] border-[#262a33] text-[#8a909c] hover:border-[#3a404c]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#8a909c] font-medium">{field.label}</span>
                        {isFieldLowConfidence && (
                          <span className="text-[10px] text-[#f5b754] flex items-center gap-0.5 font-medium">
                            <AlertTriangle className="w-3 h-3 text-[#f5b754]" />
                            <span>Amber check</span>
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-[#e8eaf0] tabular-nums">
                        {field.ocrValue}
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className={`text-xs tabular-nums font-semibold ${
                        isFieldLowConfidence ? 'text-[#f5b754]' : 'text-[#3ddc97]'
                      }`}>
                        {Math.round(field.confidence * 100)}%
                      </div>
                      <div className="text-[10px] text-[#8a909c] tabular-nums">
                        [{field.box.join(', ')}]
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Books vs GSTR-2B Portal Comparison */}
        <div className="cockpit-compare">
          <div>
            <small>Your books</small>
            <span className="text-xs text-[#8a909c] block truncate">Invoice {item.booksInvoice}</span>
            <b className="text-base text-[#e8eaf0] tabular-nums">{item.books}</b>
            {item.booksDate && (
              <span className="text-xs text-[#8a909c] block mt-1 tabular-nums">
                Date: {item.booksDate}
              </span>
            )}
          </div>
          <div>
            <small>GSTR-2B portal</small>
            <span className="text-xs text-[#8a909c] block truncate">Invoice {item.gstrInvoice}</span>
            <b className="text-base text-[#e8eaf0] tabular-nums">{item.gstr}</b>
            {item.filingDate && (
              <span className="text-xs text-[#8a909c] block mt-1 tabular-nums">
                Filed: {item.filingDate}
              </span>
            )}
          </div>
        </div>

        {/* Flow 7: Exact Agreements & Differences Breakdown */}
        <div className="p-3.5 rounded-md bg-[#0f1115] border border-[#262a33] space-y-2.5 text-xs">
          <div className="text-[#8a909c] font-medium">Comparison breakdown</div>
          
          {/* Agreed Fields */}
          <div className="space-y-1">
            <span className="text-[11px] text-[#3ddc97] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#3ddc97]" />
              <span>Agreed fields</span>
            </span>
            <ul className="space-y-1 pl-4">
              {agreedList.map((agree, i) => (
                <li key={i} className="text-[#e8eaf0] text-[11px] list-disc">
                  {agree}
                </li>
              ))}
            </ul>
          </div>

          {/* Differing Fields */}
          <div className="space-y-1 pt-2 border-t border-[#262a33]/60">
            <span className="text-[11px] text-[#f5b754] font-semibold flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 text-[#f5b754]" />
              <span>Differences & variances</span>
            </span>
            <ul className="space-y-1 pl-4">
              {differingList.map((diff, i) => (
                <li key={i} className="text-[#8a909c] text-[11px] list-disc">
                  {diff}
                </li>
              ))}
            </ul>
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
            title="Edit ledger account (E)"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit (E)</span>
          </button>
        </div>

        {/* Plain Language Inspection Rationale */}
        <div>
          <label className="text-xs text-[#8a909c] block mb-1">Inspection rationale</label>
          <p className="cockpit-why leading-relaxed">
            {item.why}
          </p>
        </div>

        {/* Flow 7: Statutory Rule Citation */}
        <div className="pt-2 border-t border-[#262a33] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#8a909c]">Statutory tax citation</span>
            {ruleTitle ? (
              isRuleVerified ? (
                <span className="text-[#3ddc97] text-[11px] font-medium">Verified rule</span>
              ) : (
                <span className="text-[#ff6b6b] text-[11px] font-semibold">UNVERIFIED RULE</span>
              )
            ) : null}
          </div>

          {ruleTitle ? (
            <div className={`p-3 rounded-md bg-[#0f1115] border space-y-1.5 ${
              isRuleVerified ? 'border-[#262a33]' : 'border-[#ff6b6b]/40'
            }`}>
              <div className="text-xs font-medium text-[#e8eaf0]">
                {ruleTitle}
              </div>
              <div className="text-[11px] text-[#8a909c] flex justify-between">
                <span>Rule ID: {item.ruleId || 'N/A'}</span>
                <span>Effective: {ruleEffectiveDate}</span>
              </div>
              {!isRuleVerified && (
                <div className="text-[11px] text-[#ff6b6b] mt-1 leading-relaxed">
                  Caution: Source circular cannot be cryptographically verified. Do not rely on this rule for automated conclusions.
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowRuleModal(true)}
                className="text-[11px] text-[#3ddc97] hover:underline flex items-center gap-1 mt-1 pt-1 border-t border-[#262a33]/60 w-full"
              >
                <BookOpen className="w-3 h-3" />
                <span>View full rule text</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-md bg-[#0f1115] border border-[#262a33] text-xs text-[#8a909c]">
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

      {/* Flow 7: Statutory Rule Text Modal */}
      {showRuleModal && (
        <div
          className="cockpit-overlay"
          onClick={() => setShowRuleModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rule-modal-title"
        >
          <div
            className="w-full max-w-lg bg-[#171a21] border border-[#262a33] rounded-lg p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-[#262a33] mb-3">
              <div>
                <h3 id="rule-modal-title" className="text-sm font-semibold text-[#e8eaf0]">
                  {ruleTitle}
                </h3>
                <div className="text-[11px] text-[#8a909c] mt-0.5">
                  Rule ID: {item.ruleId || 'N/A'} · Effective: {ruleEffectiveDate}
                </div>
              </div>
              <button
                ref={modalCloseButtonRef}
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="text-[#8a909c] hover:text-[#e8eaf0] text-lg p-1 transition"
                aria-label="Close rule modal"
              >
                ×
              </button>
            </div>

            {/* Verification Status Banner in Modal */}
            {!isRuleVerified ? (
              <div className="mb-3.5 p-2.5 rounded-md bg-[#0f1115] border border-[#ff6b6b]/40 text-xs text-[#ff6b6b]">
                <div className="font-semibold">UNVERIFIED RULE</div>
                <div className="text-[11px] text-[#8a909c] mt-0.5">
                  This rule cannot be cryptographically verified against official gazetted notifications. Automated decisions based on this rule are prohibited.
                </div>
              </div>
            ) : (
              <div className="mb-3.5 p-2.5 rounded-md bg-[#0f1115] border border-[#3ddc97]/30 text-xs text-[#3ddc97]">
                <div className="font-medium">Verified Statutory Rulebook Entry</div>
                <div className="text-[11px] text-[#8a909c] mt-0.5">
                  Promulgated under official statutory authority. Admissible for Input Tax Credit reconciliation.
                </div>
              </div>
            )}

            {/* Official Legal Statutory Text */}
            <div className="mb-3.5">
              <label className="text-[11px] text-[#8a909c] block mb-1 font-medium">Statutory Legal Text</label>
              <div className="text-xs text-[#e8eaf0] bg-[#0f1115] p-3 rounded border border-[#262a33] leading-relaxed">
                {statutoryRule?.legalText || (
                  `"No registered person shall be entitled to the credit of any input tax in respect of any supply of goods or services or both to him unless the details of the invoice or debit note referred to in clause (a) have been furnished by the supplier in the statement of outward supplies and such details have been communicated to the recipient of such invoice or debit note in the manner specified under section 37."`
                )}
              </div>
            </div>

            {/* Rule Authority & Guidance */}
            <div className="text-xs text-[#8a909c] space-y-1.5 bg-[#0f1115] p-3 rounded border border-[#262a33] mb-4">
              <div><strong className="text-[#e8eaf0]">Authority:</strong> {statutoryRule?.sourceAuthority || 'Central Goods and Services Tax Act, 2017'}</div>
              <div><strong className="text-[#e8eaf0]">Application:</strong> {statutoryRule?.guidanceNote || 'Input Tax Credit eligibility depends on compliance with return filing and verification rules.'}</div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="cockpit-btn text-xs py-1.5 px-4"
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
