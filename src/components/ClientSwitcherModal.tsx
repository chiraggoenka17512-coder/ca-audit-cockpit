import React from 'react';
import { Check } from 'lucide-react';
import { ClientProfile, AVAILABLE_CLIENTS } from '../data/clientDatabases';

interface ClientSwitcherModalProps {
  isOpen: boolean;
  activeClient: ClientProfile;
  onSelectClient: (client: ClientProfile) => void;
  onClose: () => void;
}

export const ClientSwitcherModal: React.FC<ClientSwitcherModalProps> = ({
  isOpen,
  activeClient,
  onSelectClient,
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
      aria-label="Switch client workspace"
    >
      <div
        className="w-full max-w-md bg-[#171a21] border border-[#262a33] rounded-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262a33] mb-4">
          <h3 className="text-base font-semibold text-[#e8eaf0]">Switch client workspace</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8a909c] hover:text-[#e8eaf0] text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-[#8a909c] mb-4">
          Each client operates in an isolated local database. Approvals, exceptions, and audit entries never cross client workspaces.
        </p>

        <div className="space-y-2 mb-6">
          {AVAILABLE_CLIENTS.map((client) => {
            const isSelected = client.id === activeClient.id;
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  onSelectClient(client);
                  onClose();
                }}
                className={`w-full text-left p-3.5 rounded-lg border transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#171a21] border-[#3ddc97] text-[#e8eaf0]'
                    : 'bg-[#0f1115] border-[#262a33] text-[#8a909c] hover:border-[#3a404c] hover:text-[#e8eaf0]'
                }`}
              >
                <div>
                  <div className="font-medium text-sm text-[#e8eaf0]">
                    {client.name}
                  </div>
                  <div className="text-xs text-[#8a909c] mt-0.5">
                    GSTIN: {client.gstin} · {client.state}
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-[#3ddc97] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cockpit-btn"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
