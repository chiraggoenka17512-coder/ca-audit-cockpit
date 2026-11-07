import React, { useState } from 'react';
import { ClientProfile } from '../data/clientDatabases';
import { AlertTriangle, Check, ShieldCheck } from 'lucide-react';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateClient: (client: ClientProfile, isDraft: boolean) => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  onCreateClient
}) => {
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [filingFrequency, setFilingFrequency] = useState<'Monthly' | 'Quarterly QRMP'>('Monthly');

  if (!isOpen) return null;

  // Official Indian GSTIN regex: 2 digits (state) + 10 PAN chars + 1 entity + Z + 1 check digit
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  // Indian Income Tax PAN regex: 5 letters + 4 digits + 1 letter
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  const trimmedGstin = gstin.trim().toUpperCase();
  const trimmedPan = pan.trim().toUpperCase();

  const isGstinValid = gstinRegex.test(trimmedGstin);
  const isPanValid = panRegex.test(trimmedPan);
  const isNameValid = name.trim().length >= 3;

  const canSaveAsActive = isNameValid && isGstinValid && isPanValid;
  const canSaveAsDraft = isNameValid; // Allows saving incomplete or unverified GSTIN for later correction

  // Auto-fill PAN when GSTIN is typed
  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setGstin(val);
    if (val.length >= 12 && !pan) {
      const extractedPan = val.substring(2, 12);
      if (panRegex.test(extractedPan)) {
        setPan(extractedPan);
      }
    }
  };

  const handleCreate = (isDraft: boolean) => {
    if (isDraft && !canSaveAsDraft) return;
    if (!isDraft && !canSaveAsActive) return;

    const stateCode = trimmedGstin.substring(0, 2);
    const stateMap: Record<string, string> = {
      '27': 'Maharashtra (27)',
      '29': 'Karnataka (29)',
      '07': 'Delhi (07)',
      '24': 'Gujarat (24)',
      '33': 'Tamil Nadu (33)',
      '06': 'Haryana (06)',
      '19': 'West Bengal (19)',
      '09': 'Uttar Pradesh (09)'
    };

    const newClient: ClientProfile = {
      id: `cl-${Date.now()}`,
      name: name.trim(),
      gstin: trimmedGstin || 'DRAFT_GSTIN_PENDING',
      pan: trimmedPan || (trimmedGstin.length >= 12 ? trimmedGstin.substring(2, 12) : 'PAN_PENDING'),
      state: stateMap[stateCode] || `State code ${stateCode || 'General'}`,
      turnoverPaise: 0,
      matchedCount: 0,
      matchedTurnoverFormatted: '₹0',
      itcClaimFormatted: '₹0',
      filingFrequency,
      isDraft
    };

    onCreateClient(newClient, isDraft);
    onClose();
  };

  return (
    <div
      className="cockpit-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="New client workspace setup"
    >
      <div
        className="w-full max-w-lg bg-[#171a21] border border-[#262a33] rounded-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262a33] mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#e8eaf0]">New client workspace</h3>
            <span className="text-xs text-[#8a909c]">Air-gapped local database with AES-256-GCM encryption</span>
          </div>
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
          {/* Client Name */}
          <div>
            <label className="block text-xs font-medium text-[#8a909c] mb-1.5">
              Client legal entity name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paramount Steels & Alloys Pvt Ltd"
              className="w-full px-3.5 py-2.5 rounded-md bg-[#0f1115] border border-[#262a33] text-sm text-[#e8eaf0] placeholder-[#8a909c] focus:outline-none focus:border-[#3ddc97]"
            />
          </div>

          {/* GSTIN with inline validation */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-[#8a909c]">
                Goods and Services Tax Identification Number (GSTIN)
              </label>
              {gstin && (
                <span className={`text-[11px] ${isGstinValid ? 'text-[#3ddc97]' : 'text-[#ff6b6b]'}`}>
                  {isGstinValid ? 'Valid 15-char format' : 'Invalid GSTIN format'}
                </span>
              )}
            </div>
            <input
              type="text"
              maxLength={15}
              value={gstin}
              onChange={handleGstinChange}
              placeholder="e.g. 27AABCP1234F1Z5"
              className={`w-full px-3.5 py-2.5 rounded-md bg-[#0f1115] border text-sm text-[#e8eaf0] placeholder-[#8a909c] font-mono focus:outline-none ${
                gstin && !isGstinValid ? 'border-[#ff6b6b]' : 'border-[#262a33] focus:border-[#3ddc97]'
              }`}
            />
            {gstin && !isGstinValid && (
              <p className="text-xs text-[#ff6b6b] mt-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Must be 15 characters: 2 state digits + 10 PAN chars + 1 entity + Z + 1 checksum.</span>
              </p>
            )}
          </div>

          {/* PAN */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-[#8a909c]">
                Permanent Account Number (PAN)
              </label>
              {pan && (
                <span className={`text-[11px] ${isPanValid ? 'text-[#3ddc97]' : 'text-[#ff6b6b]'}`}>
                  {isPanValid ? 'Valid 10-char PAN' : 'Invalid PAN format'}
                </span>
              )}
            </div>
            <input
              type="text"
              maxLength={10}
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="e.g. AABCP1234F"
              className={`w-full px-3.5 py-2.5 rounded-md bg-[#0f1115] border text-sm text-[#e8eaf0] placeholder-[#8a909c] font-mono focus:outline-none ${
                pan && !isPanValid ? 'border-[#ff6b6b]' : 'border-[#262a33] focus:border-[#3ddc97]'
              }`}
            />
          </div>

          {/* Filing Frequency */}
          <div>
            <label className="block text-xs font-medium text-[#8a909c] mb-1.5">
              GST filing frequency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFilingFrequency('Monthly')}
                className={`py-2 px-3 text-xs rounded-md border text-left transition ${
                  filingFrequency === 'Monthly'
                    ? 'bg-[#171a21] border-[#3ddc97] text-[#e8eaf0]'
                    : 'bg-[#0f1115] border-[#262a33] text-[#8a909c] hover:text-[#e8eaf0]'
                }`}
              >
                <div className="font-medium text-[#e8eaf0]">Monthly regular</div>
                <div className="text-[11px] text-[#8a909c] mt-0.5">GSTR-1 (11th) &amp; GSTR-3B (20th)</div>
              </button>
              <button
                type="button"
                onClick={() => setFilingFrequency('Quarterly QRMP')}
                className={`py-2 px-3 text-xs rounded-md border text-left transition ${
                  filingFrequency === 'Quarterly QRMP'
                    ? 'bg-[#171a21] border-[#3ddc97] text-[#e8eaf0]'
                    : 'bg-[#0f1115] border-[#262a33] text-[#8a909c] hover:text-[#e8eaf0]'
                }`}
              >
                <div className="font-medium text-[#e8eaf0]">Quarterly QRMP</div>
                <div className="text-[11px] text-[#8a909c] mt-0.5">IFF (13th) &amp; quarterly return</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security callout: Flat, neutral */}
        <div className="p-3 rounded-md bg-[#0f1115] border border-[#262a33] text-xs text-[#8a909c] mb-6 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#3ddc97] shrink-0 mt-0.5" />
          <span>
            A separate SQLite database will be created for this client. All rows are encrypted with a client-isolated key. Client records never touch the network.
          </span>
        </div>

        {/* Action Buttons: Decision Point for Save as Draft */}
        <div className="flex items-center justify-between pt-3 border-t border-[#262a33]">
          <div>
            {name.trim() && !isGstinValid && (
              <button
                type="button"
                onClick={() => handleCreate(true)}
                className="text-xs text-[#f5b754] hover:underline"
              >
                Save as draft (finish GSTIN later)
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cockpit-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSaveAsActive}
              onClick={() => handleCreate(false)}
              className={`cockpit-btn ${canSaveAsActive ? 'primary' : 'opacity-40 cursor-not-allowed'}`}
            >
              Create workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
