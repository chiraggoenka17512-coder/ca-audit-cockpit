import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AVAILABLE_CLIENTS, 
  ClientProfile, 
  loadClientData, 
  saveClientData, 
  resetClientData 
} from './data/clientDatabases';
import { ReviewItem } from './data/reviewItems';
import { HomeView } from './components/views/HomeView';
import { ReviewList } from './components/ReviewList';
import { DetailPanel } from './components/DetailPanel';
import { ComposerInput } from './components/ComposerInput';
import { ReconciliationView } from './components/views/ReconciliationView';
import { DeadlinesView } from './components/views/DeadlinesView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { ClientSwitcherModal } from './components/ClientSwitcherModal';
import { EditModal } from './components/EditModal';
import { KeyboardHelpModal } from './components/KeyboardHelpModal';
import { InvoiceFinderModal } from './components/InvoiceFinderModal';
import { AuditEntry, createAuditEntry } from './engine/auditLedger';

type NavSection = 'home' | 'exceptions' | 'reconciliation' | 'deadlines' | 'audit';

export const App: React.FC = () => {
  // Active Client Workspace State
  const [activeClient, setActiveClient] = useState<ClientProfile>(AVAILABLE_CLIENTS[0]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Active Navigation Tab
  const [activeNav, setActiveNav] = useState<NavSection>('home');

  // Isolated Client Database State
  const [items, setItems] = useState<ReviewItem[]>(() => loadClientData(AVAILABLE_CLIENTS[0].id).items);
  const [auditLedger, setAuditLedger] = useState<AuditEntry[]>(() => loadClientData(AVAILABLE_CLIENTS[0].id).auditLedger);

  // Third Pane (Inspection Loupe) & Selection State
  const [activeDetailItem, setActiveDetailItem] = useState<ReviewItem | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [editingItem, setEditingItem] = useState<ReviewItem | null>(null);

  // Modal & Notification State
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isFinderModalOpen, setIsFinderModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setNotification(msg);
    toastTimerRef.current = setTimeout(() => {
      setNotification(null);
      toastTimerRef.current = null;
    }, 3200);
  }, []);

  // When active client changes, switch to that client's isolated database
  const handleSelectClient = useCallback((newClient: ClientProfile) => {
    setActiveClient(newClient);
    const clientData = loadClientData(newClient.id);
    setItems(clientData.items);
    setAuditLedger(clientData.auditLedger);
    setActiveDetailItem(null);
    setFocusedIndex(0);
    showNotification(`Switched database to ${newClient.name} (AES-GCM-256 isolated)`);
  }, [showNotification]);

  // Persist client data whenever items or auditLedger change
  const persistChanges = useCallback((updatedItems: ReviewItem[], updatedLedger: AuditEntry[]) => {
    saveClientData(activeClient.id, {
      items: updatedItems,
      auditLedger: updatedLedger
    });
  }, [activeClient.id]);

  // Approve single item -> append SHA-256 block to client ledger & persist
  const handleApproveItem = useCallback(async (item: ReviewItem) => {
    const lastEntry = auditLedger[auditLedger.length - 1];
    const prevHash = lastEntry ? lastEntry.entryHash : '0'.repeat(64);

    const newAuditEntry = await createAuditEntry(
      auditLedger.length,
      "Chirag (Audit Partner)",
      "APPROVED_MATCH",
      item.id,
      `${item.title} (${item.booksInvoice})`,
      `Approved match between books (${item.books}) and portal (${item.gstr}). Reason: ${item.why}`,
      prevHash
    );

    const updatedLedger = [...auditLedger, newAuditEntry];
    const updatedItems = items.filter(i => i.id !== item.id);

    setAuditLedger(updatedLedger);
    setItems(updatedItems);
    persistChanges(updatedItems, updatedLedger);

    // If active in third pane, advance to next item or close
    if (activeDetailItem?.id === item.id) {
      const remainingIndex = items.findIndex(i => i.id === item.id);
      if (updatedItems.length > 0 && remainingIndex < updatedItems.length) {
        setActiveDetailItem(updatedItems[remainingIndex]);
      } else if (updatedItems.length > 0) {
        setActiveDetailItem(updatedItems[updatedItems.length - 1]);
      } else {
        setActiveDetailItem(null);
      }
    }

    setFocusedIndex(prev => Math.max(0, Math.min(prev, updatedItems.length - 1)));
    showNotification(`Approved ${item.title} — Logged to SHA-256 ledger (Block #${newAuditEntry.index})`);
  }, [auditLedger, items, activeDetailItem, persistChanges, showNotification]);

  // Batch approve timing differences for active client
  const handleBatchApproveTiming = useCallback(async () => {
    const timingItems = items.filter(i => i.category === 'TIMING');
    if (timingItems.length === 0) {
      showNotification("No timing differences currently in review list.");
      return;
    }

    let lastHash = auditLedger[auditLedger.length - 1]?.entryHash || '0'.repeat(64);
    const newEntries: AuditEntry[] = [];

    for (let i = 0; i < timingItems.length; i++) {
      const it = timingItems[i];
      const entry = await createAuditEntry(
        auditLedger.length + i,
        "Chirag (Audit Partner)",
        "BATCH_TIMING_APPROVE",
        it.id,
        it.title,
        `Batch approved under Section 16(2)(aa) 30-day window. Amount: ${it.amount}`,
        lastHash
      );
      newEntries.push(entry);
      lastHash = entry.entryHash;
    }

    const updatedLedger = [...auditLedger, ...newEntries];
    const updatedItems = items.filter(i => i.category !== 'TIMING');

    setAuditLedger(updatedLedger);
    setItems(updatedItems);
    persistChanges(updatedItems, updatedLedger);
    setFocusedIndex(0);

    if (activeDetailItem && activeDetailItem.category === 'TIMING') {
      setActiveDetailItem(updatedItems[0] || null);
    }

    showNotification(`Batch approved ${timingItems.length} timing differences for ${activeClient.name}`);
  }, [items, auditLedger, activeDetailItem, activeClient.name, persistChanges, showNotification]);

  // Save manual edit / reclassification for active client
  const handleSaveEdit = useCallback(async (item: ReviewItem, updatedLedgerAccount: string, reason: string) => {
    const lastEntry = auditLedger[auditLedger.length - 1];
    const prevHash = lastEntry ? lastEntry.entryHash : '0'.repeat(64);

    const newAuditEntry = await createAuditEntry(
      auditLedger.length,
      "Chirag (Audit Partner)",
      "LEDGER_RECLASSIFICATION",
      item.id,
      item.title,
      `Ledger overridden to '${updatedLedgerAccount}'. Note: ${reason}`,
      prevHash
    );

    const updatedLedger = [...auditLedger, newAuditEntry];
    setAuditLedger(updatedLedger);
    persistChanges(items, updatedLedger);
    setEditingItem(null);
    showNotification(`Updated ledger for ${item.title} — Logged to SHA-256 chain`);
  }, [auditLedger, items, persistChanges, showNotification]);

  // Reset active client demo state
  const handleResetClientData = useCallback(() => {
    const fresh = resetClientData(activeClient.id);
    setItems(fresh.items);
    setAuditLedger(fresh.auditLedger);
    setActiveDetailItem(null);
    showNotification(`Reset ${activeClient.name} database to initial state`);
  }, [activeClient.id, activeClient.name, showNotification]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Global Ctrl+K / Cmd+K to open/toggle Invoice Finder Modal from anywhere
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsFinderModalOpen(prev => !prev);
        return;
      }

      // 2. Modals handle their own Esc
      if (isFinderModalOpen) {
        if (e.key === 'Escape') {
          setIsFinderModalOpen(false);
        }
        return;
      }

      if (isClientModalOpen || editingItem) {
        if (e.key === 'Escape') {
          setIsClientModalOpen(false);
          setEditingItem(null);
        }
        return;
      }

      if (isHelpModalOpen) {
        if (e.key === 'Escape') {
          setIsHelpModalOpen(false);
        }
        return;
      }

      const target = e.target as HTMLElement;
      // Guard against typing in form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // 3. Global '/' to open Invoice Finder overlay (when not in an input)
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsFinderModalOpen(true);
        return;
      }

      // 4. If Third Pane is open, handle its shortcuts
      if (activeDetailItem) {
        if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleApproveItem(activeDetailItem);
          return;
        }
        if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setEditingItem(activeDetailItem);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setActiveDetailItem(null);
          return;
        }
      }

      // 5. Help Modal Toggle
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsHelpModalOpen(true);
        return;
      }

      // 6. Navigation in review list (Exceptions tab or Home)
      const key = e.key.toLowerCase();

      if ((key === 'j' || e.key === 'ArrowDown') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = Math.min(prev + 1, Math.max(0, items.length - 1));
          if (activeDetailItem && items[next]) {
            setActiveDetailItem(items[next]);
          }
          return next;
        });
        return;
      }

      if ((key === 'k' || e.key === 'ArrowUp') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = Math.max(prev - 1, 0);
          if (activeDetailItem && items[next]) {
            setActiveDetailItem(items[next]);
          }
          return next;
        });
        return;
      }

      // Open in Third Pane
      if ((key === 'r' || e.key === 'Enter') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (items[focusedIndex]) {
          setActiveDetailItem(items[focusedIndex]);
        }
        return;
      }

      // Direct Approve highlighted item
      if (key === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (items[focusedIndex]) {
          handleApproveItem(items[focusedIndex]);
        }
        return;
      }

      // Edit highlighted item
      if (key === 'e' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (items[focusedIndex]) {
          setEditingItem(items[focusedIndex]);
        }
        return;
      }

      // Space to batch approve timing differences
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleBatchApproveTiming();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    items,
    focusedIndex,
    activeDetailItem,
    isClientModalOpen,
    editingItem,
    isHelpModalOpen,
    isFinderModalOpen,
    handleApproveItem,
    handleBatchApproveTiming
  ]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f1115] text-[#e8eaf0] font-sans antialiased">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-6 z-50 px-4 py-2.5 rounded-md bg-[#171a21] border border-[#262a33] text-[#e8eaf0] text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2"
        >
          {notification}
        </div>
      )}

      {/* Pane 1: Sidebar (220px, exactly 6 places + Find invoice) */}
      <aside className="cockpit-aside">
        <div className="cockpit-brand">
          AuditCockpit
          <span>Audit &amp; reconciliation</span>
        </div>

        <button
          type="button"
          onClick={() => setActiveNav('home')}
          className={`cockpit-nav-item ${activeNav === 'home' ? 'active' : ''}`}
        >
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav('exceptions')}
          className={`cockpit-nav-item ${activeNav === 'exceptions' ? 'active' : ''}`}
        >
          <span>Exceptions</span>
          {items.length > 0 && (
            <span className="cockpit-count">{items.length}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveNav('reconciliation')}
          className={`cockpit-nav-item ${activeNav === 'reconciliation' ? 'active' : ''}`}
        >
          <span>Reconciliation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav('deadlines')}
          className={`cockpit-nav-item ${activeNav === 'deadlines' ? 'active' : ''}`}
        >
          <span>Deadlines</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav('audit')}
          className={`cockpit-nav-item ${activeNav === 'audit' ? 'active' : ''}`}
        >
          <span>Audit trail</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFinderModalOpen(true)}
          className="cockpit-nav-item"
          title="Find invoice (Ctrl+K or /)"
        >
          <span>Find invoice</span>
          <kbd className="text-[11px] text-[#8a909c] bg-[#171a21] px-1.5 py-0.5 rounded border border-[#262a33]">Ctrl+K</kbd>
        </button>

        {/* Active Client Workspace Switcher */}
        <div
          className="cockpit-client"
          onClick={() => setIsClientModalOpen(true)}
          role="button"
          tabIndex={0}
          title="Click to switch client workspace"
        >
          <strong className="truncate">{activeClient.name}</strong>
          <span className="text-xs text-[#8a909c] block mt-0.5">Click to switch client</span>
        </div>
      </aside>

      {/* Pane 2: Centre Main Area */}
      <main className="cockpit-main">
        <div className="cockpit-content">
          {activeNav === 'home' && (
            <HomeView
              client={activeClient}
              items={items}
              auditLedger={auditLedger}
              onOpenItemInThirdPane={(item) => setActiveDetailItem(item)}
              onNavigate={(view) => setActiveNav(view)}
            />
          )}

          {activeNav === 'exceptions' && (
            <ReviewList
              items={items}
              focusedIndex={focusedIndex}
              activeItemId={activeDetailItem?.id}
              onOpenDetail={(item) => setActiveDetailItem(item)}
              onResetItems={handleResetClientData}
            />
          )}

          {activeNav === 'reconciliation' && (
            <ReconciliationView client={activeClient} />
          )}

          {activeNav === 'deadlines' && (
            <DeadlinesView />
          )}

          {activeNav === 'audit' && (
            <AuditTrailView client={activeClient} entries={auditLedger} />
          )}
        </div>

        {/* Chat-style Input at the Bottom */}
        <ComposerInput
          items={items}
          onOpenDetail={(item) => setActiveDetailItem(item)}
          onApproveItem={handleApproveItem}
          onNavigateToView={(view) => setActiveNav(view)}
        />
      </main>

      {/* Pane 3: Third Pane Inspection Loupe (Opens when an item is selected) */}
      {activeDetailItem && (
        <DetailPanel
          item={activeDetailItem}
          onClose={() => setActiveDetailItem(null)}
          onApprove={handleApproveItem}
          onEdit={(item) => setEditingItem(item)}
        />
      )}

      {/* Edit Ledger Modal */}
      <EditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />

      {/* Client Workspace Switcher Modal */}
      <ClientSwitcherModal
        isOpen={isClientModalOpen}
        activeClient={activeClient}
        onSelectClient={handleSelectClient}
        onClose={() => setIsClientModalOpen(false)}
      />

      {/* Keyboard Shortcuts Matrix Modal (?) */}
      <KeyboardHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Invoice Finder Modal (Omni-Search Ctrl+K / /) */}
      <InvoiceFinderModal
        isOpen={isFinderModalOpen}
        onClose={() => setIsFinderModalOpen(false)}
        items={items}
        client={activeClient}
        onSelectInvoice={(item) => {
          setActiveDetailItem(item);
          const idx = items.findIndex(i => i.id === item.id);
          if (idx !== -1) {
            setFocusedIndex(idx);
          }
        }}
      />
    </div>
  );
};
