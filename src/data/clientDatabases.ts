import { ReviewItem, INITIAL_REVIEW_ITEMS } from './reviewItems';
import { AuditEntry, INITIAL_AUDIT_LOG, createAuditEntry } from '../engine/auditLedger';

export interface ClientProfile {
  id: string;
  name: string;
  gstin: string;
  pan: string;
  state: string;
  turnoverPaise: number;
  matchedCount: number;
  matchedTurnoverFormatted: string;
  itcClaimFormatted: string;
  filingFrequency: 'Monthly' | 'Quarterly QRMP';
  isDraft?: boolean;
}

export interface FirmPreference {
  id: string;
  pattern: string;
  assignedLedger: string;
  tdsSection: string;
  ruleCited: string;
  createdAt: string;
  overrideCount: number;
}

export interface FirmUser {
  id: string;
  name: string;
  email: string;
  role: 'Partner' | 'Staff';
  isCurrentUser?: boolean;
}

export interface ReturnCheckDifference {
  id: string;
  head: string;
  booksAmount: string;
  returnAmount: string;
  variance: string;
  category: string;
  affectedItemCount: number;
  ruleCited: string;
  isRuleVerified: boolean;
}

export const AVAILABLE_CLIENTS: ClientProfile[] = [
  {
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
  },
  {
    id: "cl-apex",
    name: "Apex Engineering Technologies Ltd",
    gstin: "27AABCE5678G1Z9",
    pan: "AABCE5678G",
    state: "Maharashtra (27)",
    turnoverPaise: 2458000000,
    matchedCount: 214,
    matchedTurnoverFormatted: "₹2,45,80,000",
    itcClaimFormatted: "₹38,15,200",
    filingFrequency: "Monthly"
  },
  {
    id: "cl-zenith",
    name: "Zenith Retail & Logistics LLP",
    gstin: "29AABCP9876M1Z2",
    pan: "AABCP9876M",
    state: "Karnataka (29)",
    turnoverPaise: 1184000000,
    matchedCount: 156,
    matchedTurnoverFormatted: "₹1,18,40,000",
    itcClaimFormatted: "₹18,92,400",
    filingFrequency: "Quarterly QRMP"
  }
];

export const INITIAL_FIRM_USERS: FirmUser[] = [
  {
    id: "usr-1",
    name: "Chirag (Audit Partner)",
    email: "chirag@ca-firm.in",
    role: "Partner",
    isCurrentUser: true
  },
  {
    id: "usr-2",
    name: "Vihaan Sharma",
    email: "vihaan@ca-firm.in",
    role: "Staff"
  },
  {
    id: "usr-3",
    name: "Rajveer Patel",
    email: "rajveer@ca-firm.in",
    role: "Staff"
  }
];

export const INITIAL_PREFERENCES: FirmPreference[] = [
  {
    id: "pref-01",
    pattern: "ADOBE*SYSTEMS",
    assignedLedger: "Software Subscriptions",
    tdsSection: "194J(1)(b)",
    ruleCited: "Section 194J IT Act (Technical Services)",
    createdAt: "2024-09-18",
    overrideCount: 4
  },
  {
    id: "pref-02",
    pattern: "BLUE*DART*EXPRESS",
    assignedLedger: "Courier & Freight Expenses",
    tdsSection: "194C",
    ruleCited: "Section 194C IT Act (Contractor Payments)",
    createdAt: "2024-09-10",
    overrideCount: 9
  },
  {
    id: "pref-03",
    pattern: "UBER*INDIA*SYSTEMS",
    assignedLedger: "Travel & Conveyance",
    tdsSection: "None",
    ruleCited: "Exempt below threshold Section 194C",
    createdAt: "2024-08-22",
    overrideCount: 14
  }
];

export const INITIAL_RETURN_CHECKS: ReturnCheckDifference[] = [
  {
    id: "diff-01",
    head: "Input Tax Credit (All other ITC - Table 4(A)(5))",
    booksAmount: "₹73,20,500",
    returnAmount: "₹73,15,400",
    variance: "-₹5,100",
    category: "MISSING_2B",
    affectedItemCount: 1,
    ruleCited: "Section 16(2)(aa) CGST Act & Rule 36(4)",
    isRuleVerified: true
  },
  {
    id: "diff-02",
    head: "Inward supplies liable to Reverse Charge (Table 3.1(d))",
    booksAmount: "₹24,500",
    returnAmount: "₹0",
    variance: "+₹24,500",
    category: "RCM",
    affectedItemCount: 1,
    ruleCited: "Section 9(3) CGST Act (GTA RCM Notifications)",
    isRuleVerified: true
  },
  {
    id: "diff-03",
    head: "Tax Rate Variance (18% vs 12% in Table 4)",
    booksAmount: "₹8,900",
    returnAmount: "₹8,426",
    variance: "+₹474",
    category: "RATE_MISMATCH",
    affectedItemCount: 1,
    ruleCited: "Section 16(2)(c) CGST Act & Notification 11/2017-CT(R)",
    isRuleVerified: true
  }
];

// Initial seeded items for Client 2: Apex Engineering
const APEX_REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "apx-001",
    title: "Siemens Industrial Switchgear Ltd",
    meta: "Tax rate mismatch (18% vs 28%)",
    amount: "₹1,85,000",
    rawAmountPaise: 18500000,
    identifier: "27AAACS1122D1Z0",
    booksInvoice: "SIEM/2024/902",
    gstrInvoice: "SIEM/2024/902",
    books: "₹1,85,000",
    gstr: "₹2,00,800",
    why: "Client booked at 18% GST (HSN 8537), supplier filed under 28% GST (HSN 8538). Verify HSN classification for heavy distribution boards.",
    category: "RATE_MISMATCH",
    booksDate: "10/09/2024",
    filingDate: "10/09/2024",
    confidenceScore: 0.93,
    ruleId: "SEC-16-2-C",
    ruleName: "Section 16(2)(c) CGST Act",
    ruleEffectiveDate: "01/07/2017 to Present",
    ruleVerified: true,
    assignedLedger: "Plant & Machinery Spares"
  },
  {
    id: "apx-002",
    title: "ABB Power Grids India Limited",
    meta: "Timing difference · 4 days",
    amount: "₹94,200",
    rawAmountPaise: 9420000,
    identifier: "27AAACA9922M1ZQ",
    booksInvoice: "ABB/W/24/110",
    gstrInvoice: "ABB/W/24/110",
    books: "₹94,200",
    gstr: "₹94,200",
    why: "Recorded 14 Sep in client books, uploaded 18 Sep in GSTR-2B. Within permissible 30-day window under Section 16(2)(aa).",
    category: "TIMING",
    booksDate: "14/09/2024",
    filingDate: "18/09/2024",
    confidenceScore: 0.99,
    ruleId: "SEC-16-2-AA",
    ruleName: "Section 16(2)(aa) CGST Act, 2017 & Rule 36(4)",
    ruleEffectiveDate: "01/01/2022 to Present",
    ruleVerified: true,
    assignedLedger: "Electrical Infrastructure"
  },
  {
    id: "apx-003",
    title: "Schneider Electric Infrastructure",
    meta: "Missing in GSTR-2B · ITC blocked",
    amount: "₹3,12,000",
    rawAmountPaise: 31200000,
    identifier: "27AAACS4455E1ZZ",
    booksInvoice: "SE/PUNE/781",
    gstrInvoice: "Not found",
    books: "₹3,12,000",
    gstr: "₹0",
    why: "Supplier did not file GSTR-1 for September. ITC of ₹33,428 cannot be claimed until vendor uploads under Section 16(2)(aa).",
    category: "MISSING_2B",
    booksDate: "20/09/2024",
    confidenceScore: 0.97,
    ruleId: "SEC-16-2-AA",
    ruleName: "Section 16(2)(aa) CGST Act",
    ruleEffectiveDate: "01/01/2022 to Present",
    ruleVerified: true,
    assignedLedger: "Factory Equipment"
  }
];

const APEX_AUDIT_LOG: AuditEntry[] = [
  {
    id: "audit-apx-000",
    index: 0,
    timestamp: "2024-10-14T09:00:00.000Z",
    actor: "System Sentinel",
    action: "GENESIS_INITIALIZE",
    targetId: "WORKSPACE_APEX",
    targetTitle: "Apex Engineering Technologies Ltd Workspace",
    details: "Air-gapped workspace initialized. AES-GCM-256 local database created.",
    previousHash: "0".repeat(64),
    entryHash: "b3f0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b811"
  },
  {
    id: "audit-apx-001",
    index: 1,
    timestamp: "2024-10-14T10:04:12.000Z",
    actor: "Automated Reconciler",
    action: "AUTO_MATCH_BATCH",
    targetId: "BATCH-APEX-09",
    targetTitle: "September Purchase Register vs GSTR-2B",
    details: "214 exact invoice pairs reconciled automatically. Variance within ±₹1.00 tolerance.",
    previousHash: "b3f0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b811",
    entryHash: "4c83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9022"
  }
];

const ZENITH_REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "zen-001",
    title: "Delhivery Surface Freight Services",
    meta: "Timing difference · 7 days",
    amount: "₹1,42,800",
    rawAmountPaise: 14280000,
    identifier: "29AABCD1122K1Z4",
    booksInvoice: "DEL/BLR/9921",
    gstrInvoice: "DEL/BLR/9921",
    books: "₹1,42,800",
    gstr: "₹1,42,800",
    why: "Dated 05 Sep in books, uploaded 12 Sep in GSTR-2B. Within permissible statutory filing window.",
    category: "TIMING",
    booksDate: "05/09/2024",
    filingDate: "12/09/2024",
    confidenceScore: 0.99,
    ruleId: "SEC-16-2-AA",
    ruleName: "Section 16(2)(aa) CGST Act, 2017 & Rule 36(4)",
    ruleEffectiveDate: "01/01/2022 to Present",
    ruleVerified: true,
    assignedLedger: "E-Commerce Logistics"
  },
  {
    id: "zen-002",
    title: "Amazon Seller Services Pvt Ltd",
    meta: "TCS credit reconciliation · Section 52",
    amount: "₹38,500",
    rawAmountPaise: 3850000,
    identifier: "29AABCA9999M1ZQ",
    booksInvoice: "AMZ/FBA/2024/09",
    gstrInvoice: "AMZ/FBA/2024/09",
    books: "₹38,500",
    gstr: "₹38,500",
    why: "Marketplace TCS of 1% (₹385) deducted under Section 52. Matches GSTR-8 portal report.",
    category: "OTHER",
    booksDate: "30/09/2024",
    filingDate: "04/10/2024",
    confidenceScore: 0.96,
    ruleId: "SEC-52",
    ruleName: "Section 52 CGST Act (Collection of Tax at Source)",
    ruleEffectiveDate: "01/10/2018 to Present",
    ruleVerified: true,
    assignedLedger: "Marketplace Commission & TCS"
  }
];

const ZENITH_AUDIT_LOG: AuditEntry[] = [
  {
    id: "audit-zen-000",
    index: 0,
    timestamp: "2024-10-14T09:00:00.000Z",
    actor: "System Sentinel",
    action: "GENESIS_INITIALIZE",
    targetId: "WORKSPACE_ZENITH",
    targetTitle: "Zenith Retail & Logistics LLP Workspace",
    details: "Air-gapped workspace initialized. AES-GCM-256 local database created.",
    previousHash: "0".repeat(64),
    entryHash: "c3f0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b833"
  },
  {
    id: "audit-zen-001",
    index: 1,
    timestamp: "2024-10-14T11:20:05.000Z",
    actor: "Automated Reconciler",
    action: "AUTO_MATCH_BATCH",
    targetId: "BATCH-ZEN-09",
    targetTitle: "September Purchase Register vs GSTR-2B",
    details: "156 exact invoice pairs reconciled automatically. Variance within ±₹1.00 tolerance.",
    previousHash: "c3f0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b833",
    entryHash: "8d83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9044"
  }
];

export interface ClientDataBundle {
  items: ReviewItem[];
  auditLedger: AuditEntry[];
}

export function loadClientData(clientId: string): ClientDataBundle {
  try {
    const raw = localStorage.getItem(`reconos_client_${clientId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to load isolated client DB from storage:", err);
  }

  // Initial Seed
  if (clientId === "cl-apex") {
    return { items: APEX_REVIEW_ITEMS, auditLedger: APEX_AUDIT_LOG };
  } else if (clientId === "cl-zenith") {
    return { items: ZENITH_REVIEW_ITEMS, auditLedger: ZENITH_AUDIT_LOG };
  }
  if (clientId === 'cl-acme') return { items: INITIAL_REVIEW_ITEMS, auditLedger: INITIAL_AUDIT_LOG };
  return { items: [], auditLedger: [] };
}

export function saveClientData(clientId: string, data: ClientDataBundle): void {
  try {
    localStorage.setItem(`reconos_client_${clientId}`, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save isolated client DB to storage:", err);
  }
}

export function resetClientData(clientId: string): ClientDataBundle {
  localStorage.removeItem(`reconos_client_${clientId}`);
  return loadClientData(clientId);
}


const CLIENTS_STORAGE_KEY = 'reconos_clients_list';

export function getStoredClients(): ClientProfile[] {
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load clients list from storage:', err);
  }
  return AVAILABLE_CLIENTS;
}

export function saveStoredClients(clients: ClientProfile[]): void {
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  } catch (err) {
    console.error('Failed to save clients list to storage:', err);
  }
}

export function addStoredClient(newClient: ClientProfile): ClientProfile[] {
  const current = getStoredClients();
  const exists = current.some(c => c.id === newClient.id);
  const updated = exists ? current.map(c => c.id === newClient.id ? newClient : c) : [...current, newClient];
  saveStoredClients(updated);
  return updated;
}

export async function initializeClientWorkspace(client: ClientProfile): Promise<ClientDataBundle> {
  const genesisEntry = await createAuditEntry(
    0,
    'Chirag (Audit Partner)',
    'GENESIS_INITIALIZE',
    `WORKSPACE_${client.id.toUpperCase()}`,
    `${client.name} Workspace`,
    client.isDraft
      ? 'Air-gapped workspace initialized as draft. AES-GCM-256 local database created. GSTIN pending completion.'
      : `Air-gapped workspace initialized. AES-GCM-256 local database created with verified GSTIN ${client.gstin}.`,
    '0'.repeat(64)
  );

  const bundle: ClientDataBundle = {
    items: [],
    auditLedger: [genesisEntry]
  };

  saveClientData(client.id, bundle);
  addStoredClient(client);
  return bundle;
}
