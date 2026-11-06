import React, { useState } from 'react';
import { Header } from './components/Header';
import { 
  Building2, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  BookOpen, 
  ShieldCheck, 
  History, 
  Settings,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeClient, setActiveClient] = useState('ACME Manufacturing Pvt Ltd (27AABCA1234F1Z5)');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-obsidian-950 text-neutral-100">
      {/* Persistent App Header & Air-Gap Sentinel */}
      <Header clientName={activeClient} onReset={() => {}} />

      {/* 3-Pane Desktop Workspace Shell */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Pane 1: Left Navigation & Client Switcher (240px) */}
        <aside className="w-60 border-r border-obsidian-800 bg-obsidian-950/60 flex flex-col justify-between shrink-0">
          <div className="p-3 space-y-4">
            {/* Client Switcher */}
            <div>
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5 px-2">Active Client</div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-obsidian-900 border border-obsidian-700/80 cursor-pointer hover:border-emerald-500/50 transition">
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-neutral-200 truncate">ACME Manufacturing</span>
              </div>
            </div>

            {/* Global Sections */}
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Clock className="w-4 h-4" />
                <span>Today (Dashboard)</span>
              </button>
              <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition">
                <Search className="w-4 h-4" />
                <span>Find Invoice</span>
                <span className="ml-auto text-[10px] font-mono bg-obsidian-800 px-1.5 py-0.5 rounded text-neutral-400">Ctrl+K</span>
              </button>
              <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition">
                <CheckCircle2 className="w-4 h-4" />
                <span>Reconciliation</span>
              </button>
              <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition">
                <AlertTriangle className="w-4 h-4" />
                <span>Exception Queue</span>
                <span className="ml-auto text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">18</span>
              </button>
              <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition">
                <FileText className="w-4 h-4" />
                <span>Document Review</span>
              </button>
            </nav>

            <div className="pt-2 border-t border-obsidian-800">
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5 px-2">Statutory & Audit</div>
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition">
                  <BookOpen className="w-4 h-4" />
                  <span>Rulebook Citations</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SHA-256 Audit Trail</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition">
                  <History className="w-4 h-4" />
                  <span>Firm Memory</span>
                </button>
              </nav>
            </div>
          </div>

          <div className="p-3 border-t border-obsidian-800">
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition">
              <Settings className="w-4 h-4" />
              <span>Workspace Settings</span>
            </button>
          </div>
        </aside>

        {/* Pane 2: Centre Worklist / Today View (Flex 1) */}
        <main className="flex-1 border-r border-obsidian-800 bg-obsidian-950 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-100">Today: Audit & Filing Overview</h1>
              <p className="text-xs text-neutral-400 mt-1">High-priority statutory deadlines, client queries, and active exception queues.</p>
            </div>

            {/* 3 Core Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-obsidian-900/70 border border-obsidian-800 space-y-2">
                <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Client Queries Waiting</div>
                <div className="text-2xl font-bold font-mono text-neutral-100">5</div>
                <div className="text-xs text-rose-400 flex items-center gap-1">
                  <span>1 due today (18:00 IST)</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-obsidian-900/70 border border-obsidian-800 space-y-2">
                <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Filing Deadlines This Week</div>
                <div className="text-2xl font-bold font-mono text-neutral-100">3</div>
                <div className="text-xs text-amber-400 flex items-center gap-1">
                  <span>GSTR-1 due in 5 days</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-obsidian-900/70 border border-obsidian-800 space-y-2">
                <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Auto-Reconciled Share</div>
                <div className="text-2xl font-bold font-mono text-emerald-400">98.3%</div>
                <div className="text-xs text-neutral-400">1,482 of 1,507 vouchers resolved</div>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-obsidian-900 to-obsidian-900 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">18 Unresolved Exceptions in Oct 2026 Batch</h3>
                <p className="text-xs text-neutral-400 mt-0.5">14 Timing differences, 3 rate mismatches, 1 missing in GSTR-2B.</p>
              </div>
              <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 text-xs font-semibold transition">
                <span>Open Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>

        {/* Pane 3: Right Detail & Statutory Citation Loupe (440px) */}
        <aside className="w-[440px] bg-obsidian-950/70 p-5 overflow-y-auto space-y-5 shrink-0">
          <div>
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Statutory Rule Defense</div>
            <h2 className="text-sm font-semibold text-neutral-200 mt-0.5">Section 16(2)(aa) CGST Act, 2017</h2>
          </div>

          <div className="p-3.5 rounded-lg bg-obsidian-900 border border-obsidian-800 space-y-2 text-xs">
            <div className="text-neutral-400 leading-relaxed font-serif">
              "No registered person shall be entitled to the credit of any input tax in respect of any supply of goods or services unless the details of the invoice or debit note has been furnished by the supplier in GSTR-1 and communicated in GSTR-2B."
            </div>
            <div className="text-[11px] font-mono text-emerald-400">Effective: 01-Jan-2022 vide Notif 39/2021-CT</div>
          </div>

          <div className="border-t border-obsidian-800 pt-4 space-y-3">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">Cryptographic Proof</div>
            <div className="p-3 rounded-lg bg-obsidian-900/60 border border-obsidian-800 font-mono text-[11px] space-y-1.5 text-neutral-300">
              <div className="text-neutral-400 text-[10px]">LATEST AUDIT BLOCK (#1,204)</div>
              <div className="truncate text-emerald-400">sha256:9f83ab28e4693a901e672901309fef20...</div>
              <div className="text-[10px] text-neutral-400">Chain integrity: 100% verified (0 tampering)</div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};
