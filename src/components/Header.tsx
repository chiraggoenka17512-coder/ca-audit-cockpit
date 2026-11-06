import React from 'react';
import { ShieldCheck, WifiOff, Lock, Database, RefreshCw } from 'lucide-react';

interface HeaderProps {
  clientName: string;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({ clientName, onReset }) => {
  return (
    <header className="border-b border-obsidian-800 bg-obsidian-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Client */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
              CA
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-neutral-100 flex items-center gap-1.5">
                AuditCockpit <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-obsidian-800 border border-obsidian-700 text-neutral-400">Air-Gapped v1.0</span>
              </span>
              <p className="text-xs text-neutral-400">Autonomous Financial Reconciliation & Audit Defense</p>
            </div>
          </div>

          <div className="h-4 w-px bg-obsidian-800" />

          {/* Active Client Pill */}
          <div className="flex items-center space-x-2 bg-obsidian-900 border border-obsidian-700/60 px-3 py-1 rounded-md">
            <Database className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-300 font-medium">{clientName}</span>
          </div>
        </div>

        {/* The Live Air-Gap Sentinel Telemetry */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-mono text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <WifiOff className="w-3.5 h-3.5" />
            <span>0 KB OUTBOUND</span>
          </div>

          <div className="hidden md:flex items-center space-x-1.5 bg-obsidian-900 border border-obsidian-700/60 px-2.5 py-1.5 rounded-md text-xs font-mono text-neutral-300">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>AES-GCM-256</span>
          </div>

          <div className="hidden lg:flex items-center space-x-1.5 bg-obsidian-900 border border-obsidian-700/60 px-2.5 py-1.5 rounded-md text-xs font-mono text-neutral-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>LOCAL RECONCILER</span>
          </div>

          <button 
            onClick={onReset}
            title="Reset to fresh demo state"
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-800 rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
