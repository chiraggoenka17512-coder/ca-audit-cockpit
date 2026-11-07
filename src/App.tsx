import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ClientProfile, 
  loadClientData, 
  saveClientData, 
  resetClientData,
  getStoredClients,
  initializeClientWorkspace
} from './data/clientDatabases';
import { ReviewItem } from './data/reviewItems';
import { HomeView } from './components/views/HomeView';
import { ReviewList } from './components/ReviewList';
import { DetailPanel } from './components/DetailPanel';
import { ComposerInput } from './components/ComposerInput';
import { ReconciliationView } from './components/views/ReconciliationView';
import { DeadlinesView } from './components/views/DeadlinesView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { TitleBar } from './components/TitleBar';
import { ClientSwitcherModal } from './components/ClientSwitcherModal';
import { NewClientModal } from './components/NewClientModal';
import { SaveOrDiscardModal } from './components/SaveOrDiscardModal';
import { EditModal } from './components/EditModal';
import { KeyboardHelpModal } from './components/KeyboardHelpModal';
import { AuditEntry, createAuditEntry } from './engine/auditLedger';

type NavSection = 'home' | 'exceptions' | 'reconciliation' | 'deadlines' | 'audit';

export const App: React.FC = () => {
  // Stored Client Workspaces
  const [clients, setClients] = useState<ClientProfile[]>(() => getStoredClients());
  // Active Client Workspace State
  const [activeClient, setActiveClient] = useState<ClientProfile>(() => {
    const list = getStoredClients();
    return list[0] || {
      id: "cl-acme",
      name: "ACME Manufacturing Pvt Ltd",
      gstin: "27AABCA1234F1Z5",
      pan: "AABCA1234F",
      state: "Maharashtra (27)",
      turnoverPaise: 4825000000,
      matchedCount: 482,
      matchedTurnoverFormatted: "₹4,82,50,000",
      itcClaimFormatted: "₹73,20,500",
      filingFrequency: "Monthly"
    };
  });

  // Navigation & Modals State
  const [activeNav, setActiveNav] = useState<NavSection>('home');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Dirty State & Switching Safety
  const [pendingSwitchClient, setPendingSwitchClient] = useState<ClientProfile | null>(null);
  const [isSaveOrDiscardOpen, setIsSaveOrDiscardOpen] = useState(false);

  // Isolated Client Database State
  const [items, setItems] = useState<ReviewItem[]>(() => loadClientData(activeClient.id).items);
  const [auditLedger, setAuditLedger] = useState<AuditEntry[]>(() => loadClientData(activeClient.id).auditLedger);

  // Third Pane (Inspection Loupe) & Selection State
  const [activeDetailItem, setActiveDetailItem] = useState<ReviewItem | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [editingItem, setEditingItem] = useState<ReviewItem | null>(null);

  // Notification Toast State
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

  // Persist client data whenever items or auditLedger change
  const persistChanges = useCallback((updatedItems: ReviewItem[], updatedLedger: AuditEntry[]) => {
    saveClientData(activeClient.id, {
      items: updatedItems,
      auditLedger: updatedLedger
    });
  }, [activeClient.id]);

  // Core workspace switch routine with strict state isolation
  const switchActiveClient = useCallback((newClient: ClientProfile) => {
    setActiveClient(newClient);
    const clientData = loadClientData(newClient.id);
    setItems(clientData.items);
    setAuditLedger(clientData.auditLedger);
    // Strict isolation: clear third-pane loupe, editing state, and selection index
    setActiveDetailItem(null);
    setFocusedIndex(0);
    setEditingItem(null);
    showNotification(`Switched database to ${newClient.name} (AES-GCM-256 isolated)`);
  }, [showNotification]);

  // Client switch with dirty edit guard (Flow 2)
  const handleSelectClient = useCallback((targetClient: ClientProfile) => {
    if (targetClient.id === activeClient.id) return;

    // Dirty Check: If an edit is in-flight, ask to save or discard
    if (editingItem) {
      setPendingSwitchClient(targetClient);
      setIsSaveOrDiscardOpen(true);
      return;
    }

    switchActiveClient(targetClient);
  }, [activeClient.id, editingItem, switchActiveClient]);

  // Save in-flight edit and then proceed with switching
  const handleSaveAndSwitch = useCallback(async () => {
    if (editingItem) {
      const lastEntry = auditLedger[auditLedger.length - 1];
      const prevHash = lastEntry ? lastEntry.entryHash : '0'.repeat(64);

      const newAuditEntry = await createAuditEntry(
        auditLedger.length,
        "Chirag (Audit Partner)",
        "LEDGER_RECLASSIFICATION",
        editingItem.id,
        editingItem.title,
        `Ledger saved before switching client workspace: '${editingItem.assignedLedger || 'General Administrative Expenses'}'`,
        prevHash
      );

      const updatedLedger = [...auditLedger, newAuditEntry];
      setAuditLedger(updatedLedger);
      persistChanges(items, updatedLedger);
    }

    setIsSaveOrDiscardOpen(false);
    setEditingItem(null);

    if (pendingSwitchClient) {
      switchActiveClient(pendingSwitchClient);
      setPendingSwitchClient(null);
    }
  }, [editingItem, auditLedger, items, persistChanges, pendingSwitchClient, switchActiveClient]);

  // Discard in-flight edit and switch
  const handleDiscardAndSwitch = useCallback(() => {
    setEditingItem(null);
    setIsSaveOrDiscardOpen(false);

    if (pendingSwitchClient) {
      const target = pendingSwitchClient;
      setPendingSwitchClient(null);
      switchActiveClient(target);
      showNotification(`Switched database to ${target.name} (Discarded unsaved edit)`);
    }
  }, [pendingSwitchClient, switchActiveClient, showNotification]);

  // Flow 1: New client workspace creation & encrypted storage init
  const handleCreateClient = useCallback(async (newClient: ClientProfile, isDraft: boolean) => {
    const bundle = await initializeClientWorkspace(newClient);
    const updatedClients = getStoredClients();
    setClients(updatedClients);

    // Switch to the newly provisioned workspace
    setActiveClient(newClient);
    setItems(bundle.items);
    setAuditLedger(bundle.auditLedger);
    setActiveDetailItem(null);
    setFocusedIndex(0);
    setEditingItem(null);

    showNotification(
      isDraft
        ? `Saved draft workspace for ${newClient.name} (AES-GCM-256 initialized)`
        : `Created encrypted workspace for ${newClient.name} (Block #0 logged)`
    );
  }, [showNotification]);

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

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Guard against typing in form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Fast modal close handlers on Escape
      if (isSaveOrDiscardOpen) {
        if (e.key === 'Escape') {
          setIsSaveOrDiscardOpen(false);
          setPendingSwitchClient(null);
        }
        return;
      }

      if (isNewClientModalOpen) {
        if (e.key === 'Escape') setIsNewClientModalOpen(false);
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
        if (e.key === 'Escape') setIsHelpModalOpen(false);
        return;
      }

      const key = e.key.toLowerCase();

      // Quick Client Switcher: Ctrl+O or Cmd+O
      if ((e.ctrlKey || e.metaKey) && key === 'o') {
        e.preventDefault();
        setIsClientModalOpen(true);
        return;
      }

      // If Third Pane is open, handle its shortcuts
      if (activeDetailItem) {
        if (key === 'a' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleApproveItem(activeDetailItem);
          return;
        }
        if (key === 'e' && !e.ctrlKey && !e.metaKey) {
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

      // Help Modal Toggle: ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsHelpModalOpen(true);
        return;
      }

      // Navigation in review list (Exceptions tab or Home)
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
    isNewClientModalOpen,
    isSaveOrDiscardOpen,
    editingItem,
    isHelpModalOpen,
    handleApproveItem,
    handleBatchApproveTiming
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0f1115] text-[#e8eaf0] font-sans antialiased">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 right-6 z-50 px-4 py-2.5 rounded-md bg-[#171a21] border border-[#262a33] text-[#e8eaf0] text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2"
        >
          {notification}
        </div>
      )}

      {/* Persistent Title Bar at the Top (Always visible, showing active Client, GSTIN, PAN, and 0 KB OUTBOUND) */}
      <TitleBar
        activeClient={activeClient}
        onOpenClientSwitcher={() => setIsClientModalOpen(true)}
        onOpenNewClientModal={() => setIsNewClientModalOpen(true)}
        onResetClientData={handleResetClientData}
      />

      {/* Cockpit Workspace (3 Panes) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Pane 1: Sidebar (220px, exactly 6 places) */}
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

          {/* 6th Place: Active Client Workspace Switcher in Sidebar */}
          <div
            className="cockpit-client"
            onClick={() => setIsClientModalOpen(true)}
            role="button"
            tabIndex={0}
            title="Click to switch client workspace (Ctrl+O)"
          >
            <div className="flex items-center justify-between">
              <strong className="truncate">{activeClient.name}</strong>
              {activeClient.isDraft && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#f5b754]/10 border border-[#f5b754]/30 text-[#f5b754] shrink-0">
                  Draft
                </span>
              )}
            </div>
            <span className="text-xs text-[#8a909c] block mt-0.5">Click to switch (Ctrl+O)</span>
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
      </div>

      {/* Edit Ledger Modal */}
      <EditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />

      {/* Client Workspace Switcher Modal (Can launch NewClientModal) */}
      <ClientSwitcherModal
        isOpen={isClientModalOpen}
        activeClient={activeClient}
        clients={clients}
        onSelectClient={handleSelectClient}
        onOpenNewClient={() => setIsNewClientModalOpen(true)}
        onClose={() => setIsClientModalOpen(false)}
      />

      {/* Flow 1: New Client Workspace Modal */}
      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        onCreateClient={handleCreateClient}
      />

      {/* Flow 2: Dirty Guard Modal (Save or Discard before client switch) */}
      <SaveOrDiscardModal
        isOpen={isSaveOrDiscardOpen}
        currentItem={editingItem}
        targetClient={pendingSwitchClient}
        onSaveAndSwitch={handleSaveAndSwitch}
        onDiscardAndSwitch={handleDiscardAndSwitch}
        onCancel={() => {
          setIsSaveOrDiscardOpen(false);
          setPendingSwitchClient(null);
        }}
      />

      {/* Keyboard Shortcuts Matrix Modal (?) */}
      <KeyboardHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
};
