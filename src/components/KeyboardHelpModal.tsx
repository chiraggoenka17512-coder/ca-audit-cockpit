import React from 'react';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="cockpit-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md bg-[#171a21] border border-[#262a33] rounded-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262a33] mb-4">
          <h3 className="text-base font-semibold text-[#e8eaf0]">Keyboard shortcuts</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8a909c] hover:text-[#e8eaf0] text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="flex justify-between p-2.5 rounded bg-[#0f1115] border border-[#262a33]">
            <span className="text-[#8a909c]">Find invoice</span>
            <kbd className="text-[#3ddc97] font-medium">Ctrl+K / /</kbd>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-[#0f1115] border border-[#262a33]">
            <span className="text-[#8a909c]">Open review</span>
            <kbd className="text-[#3ddc97] font-medium">Enter / R</kbd>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-[#0f1115] border border-[#262a33]">
            <span className="text-[#8a909c]">Next item</span>
            <kbd className="text-[#3ddc97] font-medium">J / ↓</kbd>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-[#0f1115] border border-[#262a33]">
            <span className="text-[#8a909c]">Previous item</span>
            <kbd className="text-[#3ddc97] font-medium">K / ↑</kbd>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-[#0f1115] border border-[#262a33]">
            <span className="text-[#8a909c]">Approve match</span>
            <kbd className="text-[#3ddc97] font-medium">A</kbd>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-[#0f1115] border border-[#262a33]">
            <span className="text-[#8a909c]">Edit ledger</span>
            <kbd className="text-[#3ddc97] font-medium">E</kbd>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-[#0f1115] border border-[#262a33]">
            <span className="text-[#8a909c]">Batch timing</span>
            <kbd className="text-[#3ddc97] font-medium">Space</kbd>
          </div>
          <div className="flex justify-between p-2.5 rounded bg-[#0f1115] border border-[#262a33]">
            <span className="text-[#8a909c]">Close panel</span>
            <kbd className="text-[#3ddc97] font-medium">Esc</kbd>
          </div>
        </div>

        <div className="text-center text-xs text-[#8a909c]">
          Press Esc to close
        </div>
      </div>
    </div>
  );
};
