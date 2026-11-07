import React, { useState } from 'react';
import { ReviewItem } from '../data/reviewItems';
import { Check } from 'lucide-react';

interface EditModalProps {
  item: ReviewItem | null;
  onClose: () => void;
  onSave: (item: ReviewItem, updatedLedger: string, reason: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  item,
  onClose,
  onSave
}) => {
  const [ledger, setLedger] = useState('Courier & Freight Expenses');
  const [reason, setReason] = useState('Reclassified per CA audit review');

  if (!item) return null;

  return (
    <div
      className="cockpit-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-title"
    >
      <div
        className="w-full max-w-md bg-[#171a21] border border-[#262a33] rounded-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262a33] mb-4">
          <h3 id="edit-title" className="text-base font-semibold text-[#e8eaf0]">
            Edit ledger: {item.booksInvoice}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8a909c] hover:text-[#e8eaf0] text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs text-[#8a909c] mb-1.5 font-medium">
              Vendor
            </label>
            <input
              type="text"
              disabled
              value={item.title}
              className="w-full px-3 py-2 rounded bg-[#0f1115] border border-[#262a33] text-sm text-[#e8eaf0]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#8a909c] mb-1.5 font-medium">
              Ledger account
            </label>
            <select
              value={ledger}
              onChange={(e) => setLedger(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#0f1115] border border-[#262a33] text-sm text-[#e8eaf0] outline-none"
            >
              <option value="Courier & Freight Expenses">Courier & Freight Expenses</option>
              <option value="Telephone & Internet Charges">Telephone & Internet Charges</option>
              <option value="Machinery Spares & Consumables">Machinery Spares & Consumables</option>
              <option value="Software Subscriptions (194J)">Software Subscriptions (194J)</option>
              <option value="Legal & Professional Fees (194J)">Legal & Professional Fees (194J)</option>
              <option value="General Administrative Expenses">General Administrative Expenses</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#8a909c] mb-1.5 font-medium">
              Note
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State reason for change..."
              className="w-full px-3 py-2 rounded bg-[#0f1115] border border-[#262a33] text-sm text-[#e8eaf0] outline-none"
            />
            <div className="text-xs text-[#8a909c] mt-1">
              Recorded in audit ledger with timestamp
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cockpit-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(item, ledger, reason)}
            className="cockpit-btn primary flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
