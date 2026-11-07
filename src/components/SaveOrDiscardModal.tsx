import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ClientProfile } from '../data/clientDatabases';
import { ReviewItem } from '../data/reviewItems';

interface SaveOrDiscardModalProps {
  isOpen: boolean;
  currentItem: ReviewItem | null;
  targetClient: ClientProfile | null;
  onSaveAndSwitch: () => void;
  onDiscardAndSwitch: () => void;
  onCancel: () => void;
}

export const SaveOrDiscardModal: React.FC<SaveOrDiscardModalProps> = ({
  isOpen,
  currentItem,
  targetClient,
  onSaveAndSwitch,
  onDiscardAndSwitch,
  onCancel
}) => {
  if (!isOpen || !targetClient) return null;

  return (
    <div
      className="cockpit-overlay z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-discard-title"
    >
      <div
        className="w-full max-w-md bg-[#171a21] border border-[#262a33] rounded-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-md bg-[#f5b754]/10 border border-[#f5b754]/30 text-[#f5b754] shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="save-discard-title" className="text-base font-semibold text-[#e8eaf0]">
              Unsaved changes
            </h3>
            <p className="text-xs text-[#8a909c] mt-1 leading-relaxed">
              You have an in-flight ledger edit for{' '}
              <strong className="text-[#e8eaf0]">{currentItem?.title || 'an invoice'}</strong>.
              Save changes or discard before switching to{' '}
              <strong className="text-[#e8eaf0]">{targetClient.name}</strong>?
            </p>
          </div>
        </div>

        <div className="p-3 rounded-md bg-[#0f1115] border border-[#262a33] text-xs text-[#8a909c] mb-6">
          Switching clients unloads the current workspace and opens the target client's isolated database. To prevent cross-client data bleed, uncommitted edits cannot carry over.
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="cockpit-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscardAndSwitch}
            className="cockpit-btn border-[#ff6b6b]/40 text-[#ff6b6b] hover:bg-[#ff6b6b]/10"
          >
            Discard &amp; switch
          </button>
          <button
            type="button"
            onClick={onSaveAndSwitch}
            className="cockpit-btn primary"
          >
            Save &amp; switch
          </button>
        </div>
      </div>
    </div>
  );
};
