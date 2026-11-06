import { FirmPreference, ReconciledItem } from '../types';

const STORAGE_KEY = 'ca_audit_firm_memory';

/**
 * Normalizes vendor name for robust matching (e.g. "AWS INDIA PVT LTD" -> "AWS")
 */
export function normalizeVendor(name: string): string {
  return name
    .toUpperCase()
    .replace(/\b(PVT|LTD|PRIVATE|LIMITED|INC|CORP|SERVICES|SOLUTIONS|INDIA)\b/g, '')
    .replace(/[^A-Z0-9]/g, ' ')
    .trim();
}

/**
 * Reads local firm memory from local storage
 */
export function getFirmMemory(): Record<string, FirmPreference> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves a CA's classification correction locally on the device
 */
export function recordCACorrection(
  vendorName: string,
  selectedLedger: string,
  tdsSection: string
): FirmPreference {
  const normKey = normalizeVendor(vendorName);
  const memory = getFirmMemory();
  const existing = memory[normKey];

  const updated: FirmPreference = {
    vendorPattern: normKey,
    assignedLedger: selectedLedger,
    tdsSection: tdsSection,
    lastUpdated: Date.now(),
    overrideCount: (existing?.overrideCount || 0) + 1,
  };

  memory[normKey] = updated;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch (e) {
    console.error("Local storage error:", e);
  }

  return updated;
}

/**
 * Applies learned firm preferences to unreviewed pending items
 */
export function applyFirmMemoryToItems(
  items: ReconciledItem[],
  memory: Record<string, FirmPreference>
): { updatedItems: ReconciledItem[]; updatedCount: number } {
  let updatedCount = 0;

  const updatedItems = items.map(item => {
    if (!item.bookRecord || item.isApproved) return item;

    const normKey = normalizeVendor(item.bookRecord.vendorName);
    const pref = memory[normKey];

    if (pref && item.bookRecord.assignedLedger !== pref.assignedLedger) {
      updatedCount++;
      return {
        ...item,
        learnedFromFirmMemory: true,
        bookRecord: {
          ...item.bookRecord,
          assignedLedger: pref.assignedLedger,
          tdsSection: pref.tdsSection,
        },
        auditRationale: `${item.auditRationale} [Adapted to firm preference: Assigned to '${pref.assignedLedger}' under TDS ${pref.tdsSection}].`
      };
    }
    return item;
  });

  return { updatedItems, updatedCount };
}
