import React, { useState } from 'react';
import { Check, Plus, Search, Building2 } from 'lucide-react';
import { ClientProfile } from '../data/clientDatabases';

interface ClientSwitcherModalProps {
  isOpen: boolean;
  activeClient: ClientProfile;
  clients: ClientProfile[];
  onSelectClient: (client: ClientProfile) => void;
  onOpenNewClient: () => void;
  onClose: () => void;
}

export const ClientSwitcherModal: React.FC<ClientSwitcherModalProps> = ({
  isOpen,
  activeClient,
  clients,
  onSelectClient,
  onOpenNewClient,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.gstin.toLowerCase().includes(q) ||
      c.pan.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="cockpit-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-switcher-title"
    >
      <div
        className="w-full max-w-lg bg-[#171a21] border border-[#262a33] rounded-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#262a33] mb-4">
          <div>
            <h3 id="client-switcher-title" className="text-base font-semibold text-[#e8eaf0]">
              Switch client workspace
            </h3>
            <span className="text-xs text-[#8a909c]">
              Each client operates in an isolated local database with AES-256-GCM encryption
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

        {/* Search & New Client Action Bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#8a909c] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, GSTIN, or PAN..."
              className="w-full pl-8 pr-3 py-2 rounded-md bg-[#0f1115] border border-[#262a33] text-xs text-[#e8eaf0] placeholder-[#8a909c] focus:outline-none focus:border-[#3ddc97]"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewClient();
            }}
            className="cockpit-btn primary flex items-center gap-1.5 py-2 px-3 text-xs shrink-0"
            title="Create a new client workspace"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New client</span>
          </button>
        </div>

        {/* Client List */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto mb-6 pr-1">
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#8a909c]">
              No clients match "{searchQuery}"
            </div>
          ) : (
            filteredClients.map((client) => {
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
                      ? 'bg-[#1e222b] border-[#3ddc97] text-[#e8eaf0]'
                      : 'bg-[#0f1115] border-[#262a33] text-[#8a909c] hover:border-[#3a404c] hover:text-[#e8eaf0]'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[#e8eaf0] truncate">
                        {client.name}
                      </span>
                      {client.isDraft && (
                        <span className="px-1.5 py-0.2 rounded text-[11px] font-medium bg-[#f5b754]/10 border border-[#f5b754]/30 text-[#f5b754] shrink-0">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#8a909c] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>GSTIN: <span className="font-mono text-[#e8eaf0]">{client.gstin}</span></span>
                      <span>·</span>
                      <span>PAN: <span className="font-mono text-[#e8eaf0]">{client.pan}</span></span>
                      <span>·</span>
                      <span>{client.state}</span>
                      <span>·</span>
                      <span>{client.filingFrequency}</span>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#3ddc97] font-medium shrink-0">
                      <Check className="w-4 h-4 text-[#3ddc97]" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[#8a909c] hover:text-[#e8eaf0] shrink-0">
                      Switch →
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cockpit-btn"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
