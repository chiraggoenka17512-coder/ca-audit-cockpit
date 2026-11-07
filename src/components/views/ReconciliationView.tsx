import React, { useState } from 'react';
import { ClientProfile } from '../../data/clientDatabases';
import { Check, ChevronRight, ChevronDown, CheckCircle2, SplitSquareVertical } from 'lucide-react';

interface ReconciliationViewProps {
  client: ClientProfile;
  onNavigateToExceptions?: () => void;
}

interface ReconciledRow {
  id: string;
  vendor: string;
  booksInv: string;
  portalInv: string;
  booksAmount: string;
  portalAmount: string;
  booksDate: string;
  portalDate: string;
  matchRule: string;
  isCollapsed: boolean;
}

const SAMPLE_MATCHED_ROWS: ReconciledRow[] = [
  {
    id: "m-1",
    vendor: "Tata Steel Processing & Distribution Ltd",
    booksInv: "TSPDL/MUM/9920",
    portalInv: "TSPDL/MUM/9920",
    booksAmount: "₹4,12,500",
    portalAmount: "₹4,12,500",
    booksDate: "04/09/2024",
    portalDate: "04/09/2024",
    matchRule: "Exact Match: GSTIN, Invoice #, and Amount in paise identical",
    isCollapsed: true
  },
  {
    id: "m-2",
    vendor: "Larsen & Toubro Heavy Engineering",
    booksInv: "LT/HA/2024/09",
    portalInv: "LT/HA/2024/09",
    booksAmount: "₹18,45,000",
    portalAmount: "₹18,45,000",
    booksDate: "08/09/2024",
    portalDate: "08/09/2024",
    matchRule: "Exact Match: GSTIN, Invoice #, and Amount in paise identical",
    isCollapsed: true
  },
  {
    id: "m-3",
    vendor: "Kirloskar Brothers Limited",
    booksInv: "KB/IND/4412",
    portalInv: "KB/IND/4412",
    booksAmount: "₹62,400",
    portalAmount: "₹62,400",
    booksDate: "11/09/2024",
    portalDate: "11/09/2024",
    matchRule: "Exact Match: GSTIN, Invoice #, and Amount in paise identical",
    isCollapsed: true
  },
  {
    id: "m-4",
    vendor: "Godrej & Boyce Mfg Co Ltd",
    booksInv: "GB/24/9901",
    portalInv: "GB/24/9901",
    booksAmount: "₹1,28,000",
    portalAmount: "₹1,28,000",
    booksDate: "14/09/2024",
    portalDate: "16/09/2024",
    matchRule: "Relaxed Timing Match: Date within 30-day window, Amount exact",
    isCollapsed: true
  }
];

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ client, onNavigateToExceptions }) => {
  const [sourceA, setSourceA] = useState('Purchase Register (Books)');
  const [sourceB, setSourceB] = useState('GSTR-2B (GST Portal)');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="cockpit-wrap space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262a33]">
        <div>
          <h1 className="cockpit-h1">Reconciliation</h1>
          <p className="cockpit-sub mb-0">
            Side-by-side deterministic matching for {client.name}
          </p>
        </div>

        {/* Source Selectors */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={sourceA}
            onChange={(e) => setSourceA(e.target.value)}
            className="bg-[#171a21] border border-[#262a33] text-[#e8eaf0] rounded px-3 py-1.5 focus:outline-none"
          >
            <option value="Purchase Register (Books)">Purchase Register (Books)</option>
            <option value="General Ledger (Bank)">General Ledger (Bank)</option>
          </select>
          <span className="text-[#8a909c]">vs</span>
          <select
            value={sourceB}
            onChange={(e) => setSourceB(e.target.value)}
            className="bg-[#171a21] border border-[#262a33] text-[#e8eaf0] rounded px-3 py-1.5 focus:outline-none"
          >
            <option value="GSTR-2B (GST Portal)">GSTR-2B (GST Portal)</option>
            <option value="Bank Statement (CSV)">Bank Statement (CSV)</option>
          </select>
        </div>
      </div>

      {/* 3 Metrics: Flat cards, no neon gradients */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[#171a21] border border-[#262a33]">
          <div className="text-xs text-[#8a909c] mb-1">Matched automatically</div>
          <div className="text-2xl font-semibold text-[#3ddc97] tabular-nums">
            {client.matchedCount}
          </div>
          <div className="text-xs text-[#8a909c] mt-1">
            92% of entries exact
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#171a21] border border-[#262a33]">
          <div className="text-xs text-[#8a909c] mb-1">Reconciled value</div>
          <div className="text-2xl font-semibold text-[#e8eaf0] tabular-nums">
            {client.matchedTurnoverFormatted}
          </div>
          <div className="text-xs text-[#8a909c] mt-1">
            ITC: {client.itcClaimFormatted}
          </div>
        </div>

        <div 
          onClick={onNavigateToExceptions}
          className="p-4 rounded-lg bg-[#171a21] border border-[#262a33] hover:border-[#3a404c] cursor-pointer transition"
        >
          <div className="text-xs text-[#8a909c] mb-1">Exceptions &amp; variances</div>
          <div className="text-2xl font-semibold text-[#f5b754] tabular-nums">
            6
          </div>
          <div className="text-xs text-[#8a909c] mt-1">
            Review in Exceptions queue
          </div>
        </div>
      </div>

      {/* Side-by-Side Sources Comparison Header */}
      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-[#8a909c] px-3 pt-4 border-t border-[#262a33]">
        <div className="flex items-center justify-between">
          <span>SOURCE A: {sourceA}</span>
          <span className="font-normal tabular-nums">488 items</span>
        </div>
        <div className="flex items-center justify-between">
          <span>SOURCE B: {sourceB}</span>
          <span className="font-normal tabular-nums">486 items</span>
        </div>
      </div>

      {/* Reconciled Pairs List: Collapsed into green lines */}
      <div className="space-y-2">
        <div className="text-xs text-[#3ddc97] font-medium px-2 py-1 flex items-center justify-between">
          <span>Collapsed Matched Pairs (482 Verified)</span>
          <span className="text-[11px] text-[#8a909c]">Click row to inspect proof</span>
        </div>

        <div className="border border-[#262a33] rounded-lg divide-y divide-[#262a33] bg-[#0f1115] overflow-hidden">
          {SAMPLE_MATCHED_ROWS.map((row) => {
            const isExpanded = !!expandedRows[row.id];
            return (
              <div key={row.id} className="transition">
                <div
                  onClick={() => toggleRow(row.id)}
                  className="p-3 cursor-pointer hover:bg-[#171a21] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#3ddc97] shrink-0" />
                    <span className="font-medium text-[#e8eaf0] truncate">
                      {row.vendor}
                    </span>
                    <span className="text-[#8a909c] hidden sm:inline">
                      • Inv {row.booksInv}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-medium text-[#e8eaf0] tabular-nums">
                      {row.booksAmount}
                    </span>
                    <span className="text-[11px] text-[#3ddc97] hidden md:inline">
                      Matched
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#8a909c]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#8a909c]" />
                    )}
                  </div>
                </div>

                {/* Expanded side-by-side inspection */}
                {isExpanded && (
                  <div className="p-4 bg-[#171a21] border-t border-[#262a33] grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1 p-3 rounded bg-[#0f1115] border border-[#262a33]">
                      <span className="text-[#8a909c] block font-medium">Source A: Books Record</span>
                      <div className="text-[#e8eaf0]">Invoice: {row.booksInv}</div>
                      <div className="text-[#e8eaf0]">Date: {row.booksDate}</div>
                      <div className="text-base font-semibold text-[#e8eaf0] tabular-nums mt-1">{row.booksAmount}</div>
                    </div>

                    <div className="space-y-1 p-3 rounded bg-[#0f1115] border border-[#262a33]">
                      <span className="text-[#8a909c] block font-medium">Source B: Portal Record</span>
                      <div className="text-[#e8eaf0]">Invoice: {row.portalInv}</div>
                      <div className="text-[#e8eaf0]">Date: {row.portalDate}</div>
                      <div className="text-base font-semibold text-[#e8eaf0] tabular-nums mt-1">{row.portalAmount}</div>
                    </div>

                    <div className="col-span-2 text-[11px] text-[#8a909c] pt-1 border-t border-[#262a33] flex justify-between items-center">
                      <span>Reason: {row.matchRule}</span>
                      <span className="text-[#3ddc97]">Variance: ₹0.00</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unmatched items banner linking to Exception Queue */}
      <div className="p-4 rounded-lg bg-[#171a21] border border-[#262a33] flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-medium text-[#e8eaf0]">6 exceptions require human sign-off</h4>
          <p className="text-xs text-[#8a909c] mt-0.5">
            Timing differences, rate mismatches, and unfiled vendor invoices segregated in the exception queue.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToExceptions}
          className="cockpit-btn primary text-xs py-2 px-3.5 shrink-0"
        >
          Open exceptions queue
        </button>
      </div>
    </div>
  );
};
