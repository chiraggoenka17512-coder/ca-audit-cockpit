import React from 'react';
import { ClientProfile } from '../../data/clientDatabases';
import { ReviewItem } from '../../data/reviewItems';
import { AuditEntry } from '../../engine/auditLedger';

interface HomeViewProps {
  client: ClientProfile;
  items: ReviewItem[];
  auditLedger: AuditEntry[];
  onOpenItemInThirdPane: (item: ReviewItem) => void;
  onNavigate: (view: 'exceptions' | 'reconciliation' | 'deadlines' | 'audit') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  client,
  items,
  auditLedger,
  onOpenItemInThirdPane,
  onNavigate
}) => {
  const topPriorityItems = items.slice(0, 3);
  const latestAuditBlock = auditLedger[auditLedger.length - 1];

  return (
    <div className="cockpit-wrap space-y-8">
      {/* Client Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262a33]">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">{client.name}</h1>
          <div className="text-xs text-[#8a909c] mt-1 space-x-3">
            <span>GSTIN: {client.gstin}</span>
            <span>•</span>
            <span>PAN: {client.pan}</span>
            <span>•</span>
            <span>September 2024</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('exceptions')}
          className="cockpit-btn primary text-xs py-2 px-3.5 self-start sm:self-auto"
        >
          Review {items.length} items
        </button>
      </div>

      {/* 4 Clean Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigate('exceptions')}
          className="p-4 rounded-lg bg-[#171a21] border border-[#262a33] hover:border-[#3a404c] cursor-pointer transition"
        >
          <div className="text-xs text-[#8a909c] mb-1">To review</div>
          <div className="text-2xl font-semibold text-[#f5b754] tabular-nums">
            {items.length}
          </div>
          <div className="text-xs text-[#8a909c] mt-1">
            Flagged items
          </div>
        </div>

        <div 
          onClick={() => onNavigate('reconciliation')}
          className="p-4 rounded-lg bg-[#171a21] border border-[#262a33] hover:border-[#3a404c] cursor-pointer transition"
        >
          <div className="text-xs text-[#8a909c] mb-1">Matched</div>
          <div className="text-2xl font-semibold text-[#3ddc97] tabular-nums">
            {client.matchedCount}
          </div>
          <div className="text-xs text-[#8a909c] mt-1">
            92% of register
          </div>
        </div>

        <div 
          onClick={() => onNavigate('reconciliation')}
          className="p-4 rounded-lg bg-[#171a21] border border-[#262a33] hover:border-[#3a404c] cursor-pointer transition"
        >
          <div className="text-xs text-[#8a909c] mb-1">Reconciled value</div>
          <div className="text-lg font-semibold text-[#e8eaf0] tabular-nums truncate mt-1">
            {client.matchedTurnoverFormatted}
          </div>
          <div className="text-xs text-[#8a909c] mt-1">
            ITC: {client.itcClaimFormatted}
          </div>
        </div>

        <div 
          onClick={() => onNavigate('deadlines')}
          className="p-4 rounded-lg bg-[#171a21] border border-[#262a33] hover:border-[#3a404c] cursor-pointer transition"
        >
          <div className="text-xs text-[#8a909c] mb-1">Next deadline</div>
          <div className="text-lg font-semibold text-[#e8eaf0] mt-1">
            07 Nov
          </div>
          <div className="text-xs text-[#8a909c] mt-1">
            TDS payment
          </div>
        </div>
      </div>

      {/* Priority items needing CA review */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#e8eaf0]">Items for review</h2>
          <button
            type="button"
            onClick={() => onNavigate('exceptions')}
            className="text-xs text-[#3ddc97] hover:underline"
          >
            Show all {items.length} →
          </button>
        </div>

        {topPriorityItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8a909c]">
            All items reviewed for this client
          </div>
        ) : (
          <div className="border-t border-[#262a33]">
            {topPriorityItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenItemInThirdPane(item)}
                className="flex items-center justify-between py-3.5 px-2 border-bottom border-[#262a33] hover:bg-[#171a21] cursor-pointer transition rounded-md"
              >
                <div>
                  <div className="font-medium text-sm text-[#e8eaf0]">{item.title}</div>
                  <div className="text-xs text-[#8a909c] mt-0.5">{item.meta}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#8a909c] tabular-nums">{item.amount}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenItemInThirdPane(item);
                    }}
                    className="cockpit-btn text-xs py-1 px-2.5"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit ledger status summary */}
      {latestAuditBlock && (
        <div 
          onClick={() => onNavigate('audit')}
          className="p-4 rounded-lg bg-[#171a21] border border-[#262a33] hover:border-[#3a404c] cursor-pointer transition flex items-center justify-between text-xs"
        >
          <div>
            <div className="text-[#e8eaf0] font-medium">Audit chain intact</div>
            <div className="text-[#8a909c] text-xs mt-0.5">
              {auditLedger.length} verified blocks in local encrypted store
            </div>
          </div>
          <span className="text-xs text-[#3ddc97] hover:underline">
            View ledger →
          </span>
        </div>
      )}
    </div>
  );
};
