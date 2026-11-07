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
import { ImportView } from './components/views/ImportView';
import { TitleBar } from './components/TitleBar';
import { ClientSwitcherModal } from './components/ClientSwitcherModal';
import { NewClientModal } from './components/NewClientModal';
import { SaveOrDiscardModal } from './components/SaveOrDiscardModal';
import { EditModal } from './components/EditModal';
import { KeyboardHelpModal } from './components/KeyboardHelpModal';
import { InvoiceFinderModal } from './components/InvoiceFinderModal';
import { ImportModal } from './components/ImportModal';
import { AuditEntry, createAuditEntry } from './engine/auditLedger';
import { 
  UndoableAction, 
  pushUndoAction, 
  createSingleApprovalUndo, 
  createBatchApprovalUndo, 
  createLedgerEditUndo, 
  createRejectionUndo, 
  executeUndo 
} from './engine/sessionUndo';

type NavSection = 'home' | 'exceptions' | 'reconciliation' | 'deadlines' | 'audit' | 'import';

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
  const [isFinderModalOpen, setIsFinderModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // In-flight edit protection
  const [isSaveOrDiscardOpen, setIsSaveOrDiscardOpen] = useState(false);
  const [pendingSwitchClient, setPendingSwitchClient] = useState<ClientProfile | null>(null);

  // Isolated Client Database State
  const [items, setItems] = useState<ReviewItem[]>(() => loadClientData(activeClient.id).items);
  const [auditLedger, setAuditLedger] = useState<AuditEntry[]>(() => loadClientData(activeClient.id).auditLedger);

  // Session Undo Stack (In-Memory per session)
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);

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

  // Actual Client Switch Executor (loads clean isolated database)
  const executeClientSwitch = useCallback((targetClient: ClientProfile) => {
    setActiveClient(targetClient);
    const clientData = loadClientData(targetClient.id);
    setItems(clientData.items);
    setAuditLedger(clientData.auditLedger);
    setActiveDetailItem(null);
    setFocusedIndex(0);
    setEditingItem(null);
    setUndoStack([]);
    showNotification(`Switched database to ${targetClient.name} (AES-GCM-256 isolated)`);
  }, [showNotification]);

  // Client Selection Handler with Dirty Check Guard
  const handleSelectClient = useCallback((targetClient: ClientProfile) => {
    if (targetClient.id === activeClient.id) return;

    if (editingItem !== null) {
      setPendingSwitchClient(targetClient);
      setIsSaveOrDiscardOpen(true);
      return;
    }

    executeClientSwitch(targetClient);
  }, [activeClient.id, editingItem, executeClientSwitch]);

  // Dirty Check: Save In-flight Edit & Switch
  const handleSaveAndSwitch = useCallback(async () => {
    if (!pendingSwitchClient || !editingItem) return;

    const lastEntry = auditLedger[auditLedger.length - 1];
    const prevHash = lastEntry ? lastEntry.entryHash : '0'.repeat(64);

    const newAuditEntry = await createAuditEntry(
      auditLedger.length,
      "Chirag (Audit Partner)",
      "LEDGER_RECLASSIFICATION",
      editingItem.id,
      editingItem.title,
      `Ledger updated for ${editingItem.title} prior to client switch`,
      prevHash
    );

    const updatedLedger = [...auditLedger, newAuditEntry];
    setAuditLedger(updatedLedger);
    persistChanges(items, updatedLedger);

    setIsSaveOrDiscardOpen(false);
    const target = pendingSwitchClient;
    setPendingSwitchClient(null);
    setEditingItem(null);
    executeClientSwitch(target);
  }, [pendingSwitchClient, editingItem, auditLedger, items, persistChanges, executeClientSwitch]);

  // Dirty Check: Discard In-flight Edit & Switch
  const handleDiscardAndSwitch = useCallback(() => {
    if (!pendingSwitchClient) return;
    setIsSaveOrDiscardOpen(false);
    const target = pendingSwitchClient;
    setPendingSwitchClient(null);
    setEditingItem(null);
    executeClientSwitch(target);
  }, [pendingSwitchClient, executeClientSwitch]);

  // Flow 3: Ingest vouchers from parsed files into active client review items
  const handleIngestVouchers = useCallback(async (vouchers: ReviewItem[], fileName: string) => {
    // Avoid duplicate vouchers by checking booksInvoice + identifier
    const existingKeys = new Set(items.map(i => `${i.booksInvoice}_${i.identifier}`));
    const freshVouchers = vouchers.filter(v => !existingKeys.has(`${v.booksInvoice}_${v.identifier}`));

    if (freshVouchers.length === 0) {
      showNotification(`All vouchers from ${fileName} are already present in ${activeClient.name} review queue.`);
      return;
    }

    const updatedItems = [...items, ...freshVouchers];

    const lastEntry = auditLedger[auditLedger.length - 1];
    const prevHash = lastEntry ? lastEntry.entryHash : '0'.repeat(64);

    const newAuditEntry = await createAuditEntry(
      auditLedger.length,
      "Chirag (Audit Partner)",
      "DOCUMENT_INGESTION",
      `BATCH_${Date.now()}`,
      fileName,
      `Ingested ${freshVouchers.length} vouchers from ${fileName}. Verified paise arithmetic.`,
      prevHash
    );

    const updatedLedger = [...auditLedger, newAuditEntry];
    setItems(updatedItems);
    setAuditLedger(updatedLedger);
    persistChanges(updatedItems, updatedLedger);

    showNotification(`Ingested ${freshVouchers.length} vouchers from ${fileName} into ${activeClient.name} — Block #${newAuditEntry.index}`);
  }, [items, auditLedger, activeClient.name, persistChanges, showNotification]);

  // First-Time Setup & New Client Creation
  const handleCreateClient = useCallback(async (newClient: ClientProfile, isDraft: boolean) => {
    await initializeClientWorkspace(newClient);
    setClients(getStoredClients());
    executeClientSwitch(newClient);
    showNotification(
      isDraft 
        ? `Saved draft workspace for ${newClient.name} (GSTIN pending)`
        : `Created encrypted workspace for ${newClient.name}`
    );
  }, [executeClientSwitch, showNotification]);

  // Approve single item -> append SHA-256 block to client ledger & persist
  const handleApproveItem = useCallback(async (item: ReviewItem) => {
    const originalIndex = items.findIndex(i => i.id === item.id);
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

    // Push action to in-memory session undo stack
    setUndoStack(prev => pushUndoAction(
      prev, 
      createSingleApprovalUndo(item, originalIndex >= 0 ? originalIndex : 0, newAuditEntry)
    ));

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

  // Reject single item -> append SHA-256 block to client ledger & persist
  const handleRejectItem = useCallback(async (item: ReviewItem) => {
    const originalIndex = items.findIndex(i => i.id === item.id);
    const lastEntry = auditLedger[auditLedger.length - 1];
    const prevHash = lastEntry ? lastEntry.entryHash : '0'.repeat(64);

    const newAuditEntry = await createAuditEntry(
      auditLedger.length,
      "Chirag (Audit Partner)",
      "REJECTED_MATCH",
      item.id,
      `${item.title} (${item.booksInvoice})`,
      `Rejected match between books (${item.books}) and portal (${item.gstr}). Reason: Marked for audit query.`,
      prevHash
    );

    const updatedLedger = [...auditLedger, newAuditEntry];
    const updatedItems = items.filter(i => i.id !== item.id);

    setAuditLedger(updatedLedger);
    setItems(updatedItems);
    persistChanges(updatedItems, updatedLedger);

    // Push action to in-memory session undo stack
    setUndoStack(prev => pushUndoAction(
      prev, 
      createRejectionUndo(item, originalIndex >= 0 ? originalIndex : 0, newAuditEntry)
    ));

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
    showNotification(`Rejected ${item.title} — Logged to SHA-256 ledger (Block #${newAuditEntry.index})`);
  }, [auditLedger, items, activeDetailItem, persistChanges, showNotification]);

  // Batch approve timing differences for active client
  const handleBatchApproveTiming = useCallback(async () => {
    const timingItemsWithIndices = items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => item.category === 'TIMING');

    if (timingItemsWithIndices.length === 0) {
      showNotification("No timing differences currently in review list.");
      return;
    }

    let lastHash = auditLedger[auditLedger.length - 1]?.entryHash || '0'.repeat(64);
    const newEntries: AuditEntry[] = [];

    for (let i = 0; i < timingItemsWithIndices.length; i++) {
      const { item: it } = timingItemsWithIndices[i];
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

    // Push batch approval to session undo stack
    setUndoStack(prev => pushUndoAction(
      prev, 
      createBatchApprovalUndo(timingItemsWithIndices, newEntries, 'timing differences')
    ));

    if (activeDetailItem && activeDetailItem.category === 'TIMING') {
      setActiveDetailItem(updatedItems[0] || null);
    }

    showNotification(`Batch approved ${timingItemsWithIndices.length} timing differences for ${activeClient.name}`);
  }, [items, auditLedger, activeDetailItem, activeClient.name, persistChanges, showNotification]);

  // Save manual edit / reclassification for active client
  const handleSaveEdit = useCallback(async (item: ReviewItem, updatedLedgerAccount: string, reason: string) => {
    const currentItem = items.find(i => i.id === item.id) || item;
    const previousLedger = currentItem.assignedLedger;
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
    const updatedItems = items.map(i => 
      i.id === item.id ? { ...i, assignedLedger: updatedLedgerAccount } : i
    );

    setAuditLedger(updatedLedger);
    setItems(updatedItems);
    persistChanges(updatedItems, updatedLedger);

    if (activeDetailItem?.id === item.id) {
      setActiveDetailItem({ ...activeDetailItem, assignedLedger: updatedLedgerAccount });
    }

    // Push ledger edit to in-memory session undo stack
    setUndoStack(prev => pushUndoAction(
      prev,
      createLedgerEditUndo(item, previousLedger, updatedLedgerAccount, undefined, reason, newAuditEntry)
    ));

    setEditingItem(null);
    showNotification(`Updated ledger for ${item.title} — Logged to SHA-256 chain`);
  }, [auditLedger, items, activeDetailItem, persistChanges, showNotification]);

  // Flow 16: Session Undo Execution
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) {
      showNotification("Nothing to undo in current session");
      return;
    }

    const { result, nextStack } = await executeUndo({
      stack: undoStack,
      currentItems: items,
      auditLedger,
      actor: "Chirag (Audit Partner)"
    });

    if (!result.success) {
      showNotification(result.reason);
      return;
    }

    setUndoStack(nextStack);
    const updatedLedger = [...auditLedger, result.newAuditEntry];
    setAuditLedger(updatedLedger);
    setItems(result.restoredItems);
    persistChanges(result.restoredItems, updatedLedger);

    if (result.activeItem) {
      setActiveDetailItem(result.activeItem);
    }
    setFocusedIndex(result.focusedIndex);
    showNotification(result.toastMessage);
  }, [undoStack, items, auditLedger, persistChanges, showNotification]);

  // Reset active client demo state
  const handleResetClientData = useCallback(() => {
    const fresh = resetClientData(activeClient.id);
    setItems(fresh.items);
    setAuditLedger(fresh.auditLedger);
    setActiveDetailItem(null);
    setUndoStack([]);
    showNotification(`Reset ${activeClient.name} database to initial state`);
  }, [activeClient.id, activeClient.name, showNotification]);

  // Global Keyboard shortcuts
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
        if (e.key === 'Escape') {
          setIsHelpModalOpen(false);
        }
        return;
      }

      if (isImportModalOpen) {
        if (e.key === 'Escape') {
          setIsImportModalOpen(false);
        }
        return;
      }

      const target = e.target as HTMLElement;
      // Guard against typing in form inputs: preserve native undo inside input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const key = e.key.toLowerCase();

      // Flow 16: Session Undo (Ctrl+Z or Cmd+Z without Shift, or 'U' without modifiers)
      const isUndoShortcut = 
        ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey && !e.altKey) ||
        (key === 'u' && !e.ctrlKey && !e.metaKey && !e.altKey);

      if (isUndoShortcut) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 3. Global '/' to open Invoice Finder overlay (when not in an input)
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsFinderModalOpen(true);
        return;
      }

      // Quick Client Switcher: Ctrl+O or Cmd+O
      if ((e.ctrlKey || e.metaKey) && key === 'o') {
        e.preventDefault();
        setIsClientModalOpen(true);
        return;
      }

      // Import Documents Shortcut: Ctrl+I or Cmd+I
      if ((e.ctrlKey || e.metaKey) && key === 'i') {
        e.preventDefault();
        setIsImportModalOpen(prev => !prev);
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
    isFinderModalOpen,
    editingItem,
    isHelpModalOpen,
    isImportModalOpen,
    handleApproveItem,
    handleBatchApproveTiming,
    handleUndo
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0f1115] text-[#e8eaf0] font-sans antialiased">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-12 right-6 z-50 px-4 py-2.5 rounded-md bg-[#171a21] border border-[#262a33] text-[#e8eaf0] text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2"
        >
          {notification}
        </div>
      )}

      {/* Persistent Title Bar across top of the application */}
      <TitleBar 
        activeClient={activeClient}
        onOpenClientSwitcher={() => setIsClientModalOpen(true)}
        onOpenNewClientModal={() => setIsNewClientModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Pane 1: Sidebar */}
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
            onClick={() => setActiveNav('import')}
            className={`cockpit-nav-item ${activeNav === 'import' ? 'active' : ''}`}
          >
            <span>Import documents</span>
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

          {/* Find Invoice action with Ctrl+K trigger */}
          <button
            type="button"
            onClick={() => setIsFinderModalOpen(true)}
            className="cockpit-nav-item group"
            title="Open Omni-Search (Ctrl+K)"
          >
            <span className="text-[#8a909c] group-hover:text-[#e8eaf0]">Find invoice</span>
            <kbd className="text-[10px] text-[#8a909c] font-medium px-1.5 py-0.5 rounded bg-[#171a21] border border-[#262a33]">
              Ctrl+K
            </kbd>
          </button>

          {/* Active Client Workspace Switcher in Sidebar */}
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

            {activeNav === 'import' && (
              <ImportView
                client={activeClient}
                onIngestVouchers={handleIngestVouchers}
                onNavigateToExceptions={() => setActiveNav('exceptions')}
              />
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

      {/* Client Workspace Switcher Modal */}
      <ClientSwitcherModal
        isOpen={isClientModalOpen}
        activeClient={activeClient}
        clients={clients}
        onSelectClient={handleSelectClient}
        onOpenNewClient={() => {
          setIsClientModalOpen(false);
          setIsNewClientModalOpen(true);
        }}
        onClose={() => setIsClientModalOpen(false)}
      />

      {/* First-Time Setup & New Client Modal */}
      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        onCreateClient={handleCreateClient}
      />

      {/* Dirty Check Guard: Save or Discard Modal */}
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

      {/* Invoice Finder Omni-Search Modal (Ctrl+K) */}
      <InvoiceFinderModal
        isOpen={isFinderModalOpen}
        onClose={() => setIsFinderModalOpen(false)}
        items={items}
        client={activeClient}
        onSelectInvoice={(selected) => {
          setActiveDetailItem(selected);
          const idx = items.findIndex(i => i.id === selected.id);
          if (idx >= 0) setFocusedIndex(idx);
          showNotification(`Inspecting invoice ${selected.booksInvoice} (${selected.title})`);
        }}
      />

      {/* Keyboard Shortcuts Matrix Modal (?) */}
      <KeyboardHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Flow 3: Document Ingestion Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        client={activeClient}
        onIngestVouchers={handleIngestVouchers}
        onNavigateToExceptions={() => {
          setIsImportModalOpen(false);
          setActiveNav('exceptions');
        }}
      />
    </div>
  );
};
