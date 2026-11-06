import React from 'react';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface TodayDashboardProps {
  onOpenQueue: () => void;
  onOpenRecon: () => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({ onOpenQueue, onOpenRecon }) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100">Today: Audit & Compliance Cockpit</h1>
        <p className="text-xs text-neutral-400 mt-1">
          High-priority statutory deadlines, client queries, and active exception queues.
        </p>
      </div>

      {/* 3 Core Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Pending Exceptions */}
        <div 
          onClick={onOpenQueue}
          className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800 hover:border-amber-500/50 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Exception Queue</span>
            <AlertCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-300">18</span>
            <span className="text-xs text-neutral-400">items need CA review</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            12 Timing differences, 4 Typo matches, 2 Tax rate mismatches
          </p>
        </div>

        {/* Metric 2: Auto-Match Rate */}
        <div 
          onClick={onOpenRecon}
          className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800 hover:border-emerald-500/50 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Deterministic Matching</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">92.4%</span>
            <span className="text-xs text-neutral-400">auto-reconciled</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            482 of 522 invoices verified within +- ₹1 tolerance
          </p>
        </div>

        {/* Metric 3: ITC at Risk */}
        <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Statutory Risk (Sec 16)</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400">₹ 1,48,200</span>
            <span className="text-xs text-neutral-400">at risk</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            Unfiled in GSTR-2B or vendor filing pending
          </p>
        </div>
      </div>

      {/* The 3 Statutory & Practice Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 1: Statutory Deadlines This Week */}
        <div className="p-4 rounded-xl bg-obsidian-900/60 border border-obsidian-800 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-semibold text-neutral-200 uppercase tracking-wide">Upcoming Statutory Deadlines</h2>
          </div>
          <div className="space-y-2.5">
            <div className="p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-800 flex justify-between items-center">
              <div>
                <div className="text-xs font-medium text-neutral-200">GSTR-3B Monthly Return</div>
                <div className="text-[10px] text-neutral-400">All registered clients</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
                In 2 Days
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-800 flex justify-between items-center">
              <div>
                <div className="text-xs font-medium text-neutral-200">TDS Payment (Sec 194C/J)</div>
                <div className="text-[10px] text-neutral-400">October deductions deposit</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                In 5 Days
              </span>
            </div>
          </div>
        </div>

        {/* Widget 2: Client Queries Waiting with Deadlines */}
        <div className="p-4 rounded-xl bg-obsidian-900/60 border border-obsidian-800 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold text-neutral-200 uppercase tracking-wide">Client Queries Pending</h2>
          </div>
          <div className="space-y-2.5">
            <div className="p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-800 flex justify-between items-center">
              <div>
                <div className="text-xs font-medium text-neutral-200">Reliance Transport Bill #882</div>
                <div className="text-[10px] text-neutral-400">Awaiting RCM confirmation from ACME</div>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Waiting 3d</span>
            </div>

            <div className="p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-800 flex justify-between items-center">
              <div>
                <div className="text-xs font-medium text-neutral-200">Legal Fee TDS Deduction (194J)</div>
                <div className="text-[10px] text-neutral-400">Form 15H verification requested</div>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Waiting 1d</span>
            </div>
          </div>
        </div>

        {/* Widget 3: Audit Progress Per Client */}
        <div className="p-4 rounded-xl bg-obsidian-900/60 border border-obsidian-800 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-semibold text-neutral-200 uppercase tracking-wide">Client Audit Completion</h2>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-200 font-medium">ACME Manufacturing</span>
                <span className="text-emerald-400 font-mono">92%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-obsidian-950 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-200 font-medium">Bharat Logistics Corp</span>
                <span className="text-amber-400 font-mono">68%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-obsidian-950 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
