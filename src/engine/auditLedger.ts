export interface AuditEntry {
  id: string;
  index: number;
  timestamp: string;
  actor: string;
  action: string;
  targetId: string;
  targetTitle: string;
  details: string;
  previousHash: string;
  entryHash: string;
}

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export async function computeSha256(canonicalPayload: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalPayload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback for non-crypto environments
  let hash = 0;
  for (let i = 0; i < canonicalPayload.length; i++) {
    const char = canonicalPayload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

export async function createAuditEntry(
  index: number,
  actor: string,
  action: string,
  targetId: string,
  targetTitle: string,
  details: string,
  previousHash: string
): Promise<AuditEntry> {
  const timestamp = new Date().toISOString();
  // Canonical serialization format
  const canonicalPayload = JSON.stringify({
    index,
    timestamp,
    actor,
    action,
    targetId,
    targetTitle,
    details,
    previousHash
  });

  const entryHash = await computeSha256(canonicalPayload);

  return {
    id: `audit-${Date.now()}-${index}`,
    index,
    timestamp,
    actor,
    action,
    targetId,
    targetTitle,
    details,
    previousHash,
    entryHash
  };
}

export const INITIAL_AUDIT_LOG: AuditEntry[] = [
  {
    id: "audit-000",
    index: 0,
    timestamp: "2024-10-14T09:00:00.000Z",
    actor: "System Sentinel",
    action: "GENESIS_INITIALIZE",
    targetId: "WORKSPACE_ACME",
    targetTitle: "ACME Manufacturing Pvt Ltd Workspace",
    details: "Air-gapped workspace initialized. AES-GCM-256 local database created.",
    previousHash: "0".repeat(64),
    entryHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  {
    id: "audit-001",
    index: 1,
    timestamp: "2024-10-14T09:15:22.000Z",
    actor: "Automated Reconciler",
    action: "AUTO_MATCH_BATCH",
    targetId: "BATCH-2024-09",
    targetTitle: "September Purchase Register vs GSTR-2B",
    details: "482 exact invoice pairs reconciled automatically. Variance within ±₹1.00 tolerance.",
    previousHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    entryHash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
  }
];
