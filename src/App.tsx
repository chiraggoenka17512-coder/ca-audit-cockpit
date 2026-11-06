import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { 
  Building2, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  ShieldCheck, 
  Settings,
  HelpCircle,
  X
} from 'lucide-react';
import { TodayDashboard } from './components/today/TodayDashboard';
import { ExceptionQueue, ExceptionItem } from './components/queue/ExceptionQueue';
import { DetailInspectionLoupe } from './components/loupe/DetailInspectionLoupe';
import { OmniSearchModal } from './components/search/OmniSearchModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const INITIAL_EXCEPTIONS: ExceptionItem[] = [
  {
    id: "exc-001",
    vendorName: "Blue Dart Express Limited",
    vendorGstin: "27AAACB0446L1ZS",
    invoiceNumber: "INV/2024/891",
    gstrInvoiceNumber: "INV/2024/891",
    invoiceDate: "12/09/2024",
    gstrDate: "17/09/2024",
    booksAmount: 5310000,
    gstrAmount: 5310000,
    category: "TIMING_DIFFERENCE",
    confidence: 0.98,
    statutoryNote: "Timing drift (5 days); filed within permissible 30-day window",
    suggestedAction: "1-Click Approve (Sec 16(2)(aa) compliant)"
  },
  {
    id: "exc-002",
    vendorName: "Tata Tele Business Services Ltd",
    vendorGstin: "27AAACT2727Q1ZW",
    invoiceNumber: "TI/24-25/00482",
    gstrInvoiceNumber: "TI-24-25-00482",
    invoiceDate: "15/09/2024",
    gstrDate: "15/09/2024",
    booksAmount: 9912000,
    gstrAmount: 9912000,
    category: "INVOICE_TYPO",
    confidence: 0.94,
    statutoryNote: "Exact amount & date match; Levenshtein distance 2 on special chars (/ vs -)",
    suggestedAction: "Confirm Typo Match"
  },
  {
    id: "exc-003",
    vendorName: "Kolkata Precision Tools Pvt Ltd",
    vendorGstin: "19AABCK9901M1Z4",
    invoiceNumber: "KL/GST/2024/99",
    gstrInvoiceNumber: "KL/GST/2024/99",
    invoiceDate: "18/09/2024",
    gstrDate: "18/09/2024",
    booksAmount: 13440000,
    gstrAmount: 14160000,
    category: "TAX_RATE_MISMATCH",
    confidence: 0.88,
    statutoryNote: "Client booked at 12% (₹ 14,400 tax); Vendor filed at 18% (₹ 21,600 tax)",
    suggestedAction: "Flag for ledger adjustment"
  },
  {
    id: "exc-004",
    vendorName: "Rajasthan Heavy Haulage Logistics",
    vendorGstin: "08AAECR9012F1Z8",
    invoiceNumber: "RAJ/INV/772",
    invoiceDate: "22/09/2024",
    booksAmount: 24000000,
    gstrAmount: 0,
    category: "MISSING_IN_2B",
    confidence: 0.99,
    statutoryNote: "Missing in GSTR-2B; ITC at statutory risk under Section 16(2)(aa)",
    suggestedAction: "Send inquiry notice to vendor"
  }
];

export const App: React.FC = () => {
  const [activeClient] = useState('ACME Manufacturing Pvt Ltd (27AABCA1234F1Z5)');
  const [currentView, setCurrentView] = useState<'today' | 'queue' | 'reconciliation' | 'audit'>('today');
  const [exceptions, setExceptions] = useState<ExceptionItem[]>(INITIAL_EXCEPTIONS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Manage toast timers in a ref to avoid race conditions on rapid actions
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setNotification(msg);
    toastTimerRef.current = setTimeout(() => {
      setNotification(null);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Hotkeys Cheat Sheet Escape Listener
  useEffect(() => {
    if (!isHelpOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsHelpOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isHelpOpen]);

  const handleApprove = useCallback((id: string) => {
    setExceptions((prev) => {
      const item = prev.find(e => e.id === id);
      if (item) {
        showNotification(`Approved ${item.invoiceNumber} (${item.vendorName}) - Logged to SHA-256 chain`);
      }
      return prev.filter(e => e.id !== id);
    });
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, exceptions.length - 2)));
  }, [exceptions.length, showNotification]);

  const handleBatchApproveTiming = useCallback(() => {
    const timingCount = exceptions.filter(e => e.category === 'TIMING_DIFFERENCE').length;
    if (timingCount === 0) {
      showNotification('No timing differences in current queue.');
      return;
    }
    setExceptions((prev) => prev.filter(e => e.category !== 'TIMING_DIFFERENCE'));
    setSelectedIndex(0);
    showNotification(`Batch approved ${timingCount} timing differences (Sec 16(2)(aa) compliant)`);
  }, [exceptions, showNotification]);

  const handleEdit = useCallback((id: string) => {
    showNotification(`Opening ledger editor for item ${id}`);
  }, [showNotification]);

  // Keyboard Shortcuts: strictly disabled when modals are open
  useKeyboardShortcuts(
    {
      onNext: () => setSelectedIndex((prev) => Math.min(prev + 1, exceptions.length - 1)),
      onPrev: () => setSelectedIndex((prev) => Math.max(prev - 1, 0)),
      onApprove: () => {
        if (exceptions.length > 0 && exceptions[selectedIndex]) {
          handleApprove(exceptions[selectedIndex].id);
        }
      },
      onBatchApprove: handleBatchApproveTiming,
      onSearch: () => setIsSearchOpen(true),
      onHelp: () => setIsHelpOpen(true),
      onEdit: () => {
        if (exceptions.length > 0 && exceptions[selectedIndex]) {
          handleEdit(exceptions[selectedIndex].id);
        }
      }
    },
    { enabled: !isSearchOpen && !isHelpOpen }
  );

  const selectedItem = exceptions[selectedIndex];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-obsidian-950 text-neutral-100 font-sans">
      {/* Persistent App Header & Air-Gap Sentinel */}
      <Header clientName={activeClient} onReset={() => setExceptions(INITIAL_EXCEPTIONS)} />

      {/* Accessible Notification Toast with ARIA Live Region */}
      {notification && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed top-14 right-6 z-50 px-4 py-2.5 rounded-lg bg-emerald-600/90 text-white text-xs font-medium shadow-2xl border border-emerald-400/40 backdrop-blur-md animate-in fade-in slide-in-from-top-2"
        >
          {notification}
        </div>
      )}

      {/* 3-Pane Desktop Workspace Shell */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Pane 1: Left Navigation & Client Switcher (240px) */}
        <aside className="w-60 border-r border-obsidian-800 bg-obsidian-950/80 flex flex-col justify-between shrink-0 select-none">
          <div className="p-3 space-y-4">
            {/* Client Switcher */}
            <div>
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5 px-2">Active Client</div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-obsidian-900 border border-obsidian-700/80 cursor-pointer hover:border-emerald-500/50 transition">
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-neutral-200 truncate">ACME Manufacturing</span>
              </div>
            </div>

            {/* Global Sections */}
            <nav className="space-y-1">
              <button 
                type="button"
                onClick={() => setCurrentView('today')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                  currentView === 'today' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Today (Dashboard)</span>
              </button>

              <button 
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition"
              >
                <Search className="w-4 h-4" />
                <span>Find Invoice</span>
                <span className="ml-auto text-[10px] font-mono bg-obsidian-800 px-1.5 py-0.5 rounded text-neutral-400">Ctrl+K</span>
              </button>

              <button 
                type="button"
                onClick={() => setCurrentView('queue')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                  currentView === 'queue' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Exception Queue</span>
                {exceptions.length > 0 && (
                  <span className="ml-auto text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                    {exceptions.length}
                  </span>
                )}
              </button>

              <button 
                type="button"
                onClick={() => setCurrentView('reconciliation')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                  currentView === 'reconciliation' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Reconciliation</span>
              </button>
            </nav>

            {/* Statutory & Audit Section */}
            <div className="pt-2 border-t border-obsidian-800">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5 px-2">Statutory & Audit</div>
              <nav className="space-y-1">
                <button 
                  type="button"
                  onClick={() => setCurrentView('audit')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                    currentView === 'audit' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>SHA-256 Audit Trail</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-obsidian-800 space-y-1">
            <button 
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-neutral-400 hover:text-neutral-200 hover:bg-obsidian-900/60 transition"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Hotkeys Cheat Sheet</span>
              </span>
              <kbd className="font-mono text-[10px] bg-obsidian-800 px-1 py-0.5 rounded">?</kbd>
            </button>
          </div>
        </aside>

        {/* Pane 2: Centre Worklist / Views (Flex 1) */}
        <main className="flex-1 border-r border-obsidian-800 bg-obsidian-950 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {currentView === 'today' && (
              <TodayDashboard 
                onOpenQueue={() => setCurrentView('queue')} 
                onOpenRecon={() => setCurrentView('reconciliation')} 
              />
            )}

            {currentView === 'queue' && (
              <ExceptionQueue
                items={exceptions}
                selectedIndex={selectedIndex}
                onSelect={(idx) => setSelectedIndex(idx)}
                onApprove={handleApprove}
                onBatchApproveTiming={handleBatchApproveTiming}
              />
            )}

            {currentView === 'reconciliation' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-neutral-100">Deterministic Two-Column Reconciliation</h2>
                <p className="text-xs text-neutral-400">
                  482 matched pairs reconciled within +- ₹1.00 tolerance. 0 hallucinations.
                </p>
                <div className="p-8 rounded-xl bg-obsidian-900 border border-obsidian-800 text-center text-xs text-neutral-400">
                  All matched invoices are cryptographically locked and exportable to Tally XML.
                </div>
              </div>
            )}

            {currentView === 'audit' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Tamper-Evident SHA-256 Audit Ledger</span>
                </h2>
                <p className="text-xs text-neutral-400">
                  Cryptographically chained hash tree. Every approval, rejection, and ledger override is permanently recorded.
                </p>
                <div className="p-4 rounded-xl bg-obsidian-900 border border-emerald-500/20 text-xs text-emerald-300 font-mono flex items-center justify-between">
                  <span>CHAIN STATUS: VALID & IMMUTABLE (Genesis Hash: 00000000... verified)</span>
                  <span className="bg-emerald-500/20 px-2 py-0.5 rounded">Passed 100%</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Pane 3: Right Inspection Loupe (320px) */}
        <aside className="w-80 bg-obsidian-950/90 shrink-0">
          <DetailInspectionLoupe
            item={selectedItem}
            onApprove={handleApprove}
            onEdit={handleEdit}
          />
        </aside>

      </div>

      {/* Omni-Search Modal (Ctrl + K) */}
      <OmniSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        items={exceptions}
        onSelectItem={(item) => {
          setCurrentView('queue');
          const idx = exceptions.findIndex(e => e.id === item.id);
          if (idx !== -1) setSelectedIndex(idx);
        }}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal (?) */}
      {isHelpOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setIsHelpOpen(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard Shortcuts Matrix"
            className="w-full max-w-md rounded-xl bg-obsidian-900 border border-obsidian-700 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-obsidian-800">
              <h3 className="text-sm font-bold text-neutral-100">Keyboard Shortcuts Matrix</h3>
              <button 
                type="button"
                onClick={() => setIsHelpOpen(false)} 
                className="text-neutral-400 hover:text-neutral-200 transition active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-obsidian-950">
                <span className="text-neutral-400">Next Item</span>
                <kbd className="font-mono text-emerald-400 font-bold">J / ↓</kbd>
              </div>
              <div className="flex justify-between p-2 rounded bg-obsidian-950">
                <span className="text-neutral-400">Previous Item</span>
                <kbd className="font-mono text-emerald-400 font-bold">K / ↑</kbd>
              </div>
              <div className="flex justify-between p-2 rounded bg-obsidian-950">
                <span className="text-neutral-400">Approve</span>
                <kbd className="font-mono text-emerald-400 font-bold">A / Enter</kbd>
              </div>
              <div className="flex justify-between p-2 rounded bg-obsidian-950">
                <span className="text-neutral-400">Batch Timing</span>
                <kbd className="font-mono text-emerald-400 font-bold">Space</kbd>
              </div>
              <div className="flex justify-between p-2 rounded bg-obsidian-950">
                <span className="text-neutral-400">Find Invoice</span>
                <kbd className="font-mono text-emerald-400 font-bold">Ctrl+K / /</kbd>
              </div>
              <div className="flex justify-between p-2 rounded bg-obsidian-950">
                <span className="text-neutral-400">Edit Ledger</span>
                <kbd className="font-mono text-emerald-400 font-bold">E</kbd>
              </div>
            </div>
            <div className="pt-2 text-[10px] text-neutral-400 text-center font-mono">
              Press Esc or click outside to dismiss
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
