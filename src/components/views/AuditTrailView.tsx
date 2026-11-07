import React, { useState } from 'react';
import { AuditEntry } from '../../engine/auditLedger';
import { ClientProfile } from '../../data/clientDatabases';
import { Check, Copy } from 'lucide-react';

interface AuditTrailViewProps {
  client: ClientProfile;
  entries: AuditEntry[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ client, entries }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="cockpit-wrap space-y-6">
      <div>
        <h1 className="cockpit-h1">Audit trail</h1>
        <p className="cockpit-sub">
          SHA-256 hash-chained ledger for {client.name}. {entries.length} blocks verified.
        </p>
      </div>

      {/* Blocks list */}
      <div className="border-t border-[#262a33]">
        {entries.slice().reverse().map((entry) => (
          <div
            key={entry.id}
            className="py-4 border-b border-[#262a33] text-xs space-y-1.5"
          >
            <div className="flex items-center justify-between text-[#8a909c]">
              <div className="flex items-center gap-2">
                <span className="text-[#3ddc97] font-medium">
                  Block #{entry.index}
                </span>
                <span>•</span>
                <span className="text-[#8a909c]">
                  {entry.action.toLowerCase().replace(/_/g, ' ')}
                </span>
              </div>
              <span className="tabular-nums">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="font-medium text-[#e8eaf0] text-sm">
              {entry.targetTitle}
            </div>

            <p className="text-[#8a909c] leading-relaxed">
              {entry.details}
            </p>

            <div className="pt-1 flex items-center justify-between text-[#8a909c]">
              <span>By {entry.actor}</span>
              <button
                type="button"
                onClick={() => handleCopy(entry.entryHash)}
                className="flex items-center gap-1 hover:text-[#e8eaf0] transition font-mono text-[11px]"
                title="Copy hash"
              >
                <span>{entry.entryHash.slice(0, 10)}…{entry.entryHash.slice(-6)}</span>
                {copiedHash === entry.entryHash ? (
                  <Check className="w-3 h-3 text-[#3ddc97]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
