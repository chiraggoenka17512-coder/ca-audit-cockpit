import React, { useState } from 'react';
import { ClientProfile } from '../data/clientDatabases';
import { validateGSTIN, validatePAN, GST_STATE_CODES } from '../data/taxValidators';
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

  const trimmedGstin = gstin.trim().toUpperCase();
  const trimmedPan = pan.trim().toUpperCase();

  const gstinResult = validateGSTIN(trimmedGstin);
  const panResult = validatePAN(trimmedPan);
  const isNameValid = name.trim().length >= 3;

  // Fully compliant client workspace requires valid 15-char GSTIN and 10-char PAN
  const canSaveAsActive = isNameValid && gstinResult.isValid && panResult.isValid;
  // Save as draft allows CAs to onboard clients even if GSTIN is incomplete or unverified
  const canSaveAsDraft = isNameValid;

  // Auto-fill PAN and derive State when GSTIN is entered
  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setGstin(val);
    if (val.length >= 12 && !pan) {
      const extractedPan = val.substring(2, 12);
      const extractedValidation = validatePAN(extractedPan);
      if (extractedValidation.isValid) {
        setPan(extractedPan);
      }
    }
  };

  const handleCreate = (isDraft: boolean) => {
    if (isDraft && !canSaveAsDraft) return;
    if (!isDraft && !canSaveAsActive) return;

    const stateCode = trimmedGstin.substring(0, 2);
    const derivedState = GST_STATE_CODES[stateCode] || (stateCode ? `State code ${stateCode}` : 'General');

    const newClient: ClientProfile = {
      id: `cl-${Date.now()}`,
      name: name.trim(),
      gstin: trimmedGstin || 'DRAFT_GSTIN_PENDING',
      pan: trimmedPan || (trimmedGstin.length >= 12 ? trimmedGstin.substring(2, 12) : 'PAN_PENDING'),
      state: derivedState,
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
      aria-labelledby="new-client-title"
    >
      <div
        className="w-full max-w-lg bg-[#171a21] border border-[#262a33] rounded-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262a33] mb-4">
          <div>
            <h3 id="new-client-title" className="text-base font-semibold text-[#e8eaf0]">
              New client workspace
            </h3>
            <span className="text-xs text-[#8a909c]">
              Air-gapped local database with AES-256-GCM encryption
            </span>
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

          {/* GSTIN with inline checksum and format validation */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-[#8a909c]">
                Goods and Services Tax Identification Number (GSTIN)
              </label>
              {trimmedGstin && (
                <span className={`text-xs ${gstinResult.isValid ? 'text-[#3ddc97]' : 'text-[#f5b754]'}`}>
                  {gstinResult.isValid
                    ? 'Valid 15-char format & checksum'
                    : gstinResult.isFormatValid
                    ? 'Format valid (checksum pending)'
                    : `${trimmedGstin.length}/15 chars`}
                </span>
              )}
            </div>
            <input
              type="text"
              maxLength={15}
              value={gstin}
              onChange={handleGstinChange}
              placeholder="e.g. 27AAACT2727Q1ZW"
              className={`w-full px-3.5 py-2.5 rounded-md bg-[#0f1115] border text-sm text-[#e8eaf0] placeholder-[#8a909c] font-mono focus:outline-none ${
                trimmedGstin && !gstinResult.isFormatValid
                  ? 'border-[#ff6b6b]'
                  : 'border-[#262a33] focus:border-[#3ddc97]'
              }`}
            />
            {trimmedGstin && !gstinResult.isFormatValid && (
              <p className="text-xs text-[#ff6b6b] mt-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>15 characters: 2 state digits + 10 PAN chars + 1 entity + Z + 1 check digit</span>
              </p>
            )}
            {trimmedGstin && gstinResult.isFormatValid && !gstinResult.isValid && (
              <p className="text-xs text-[#f5b754] mt-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Format matches. Checksum mismatch: can save as draft to verify portal later.</span>
              </p>
            )}
            {gstinResult.stateName && (
              <p className="text-xs text-[#8a909c] mt-1">
                State jurisdiction: <span className="text-[#e8eaf0]">{gstinResult.stateName}</span>
              </p>
            )}
          </div>

          {/* PAN */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-[#8a909c]">
                Permanent Account Number (PAN)
              </label>
              {trimmedPan && (
                <span className={`text-xs ${panResult.isValid ? 'text-[#3ddc97]' : 'text-[#ff6b6b]'}`}>
                  {panResult.isValid
                    ? `Valid 10-char PAN (${panResult.entityType || 'Entity'})`
                    : 'Invalid PAN structure'}
                </span>
              )}
            </div>
            <input
              type="text"
              maxLength={10}
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="e.g. AAACT2727Q"
              className={`w-full px-3.5 py-2.5 rounded-md bg-[#0f1115] border text-sm text-[#e8eaf0] placeholder-[#8a909c] font-mono focus:outline-none ${
                trimmedPan && !panResult.isValid
                  ? 'border-[#ff6b6b]'
                  : 'border-[#262a33] focus:border-[#3ddc97]'
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
            A separate SQLite database will be initialized for this client. All rows are encrypted with AES-256-GCM. Client records never touch the network.
          </span>
        </div>

        {/* Action Buttons: Decision Point for Save as Draft */}
        <div className="flex items-center justify-between pt-3 border-t border-[#262a33]">
          <div>
            {isNameValid && (!gstinResult.isValid || !panResult.isValid) && (
              <button
                type="button"
                onClick={() => handleCreate(true)}
                className="text-xs text-[#f5b754] hover:underline flex items-center gap-1"
                title="Save client profile as draft and complete GSTIN later"
              >
                <span>Save as draft (finish GSTIN later)</span>
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
