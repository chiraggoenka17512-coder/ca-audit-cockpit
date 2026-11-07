import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  validateGSTIN, 
  validatePAN, 
  computeGstinChecksum,
  GST_STATE_CODES,
  PAN_ENTITY_TYPES
} from '../src/data/taxValidators.ts';
import { 
  ClientProfile, 
  loadClientData, 
  saveClientData, 
  getStoredClients, 
  saveStoredClients, 
  addStoredClient,
  initializeClientWorkspace 
} from '../src/data/clientDatabases.ts';
import { createAuditEntry, computeSha256 } from '../src/engine/auditLedger.ts';

// Mock localStorage for Node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

// Attach global localStorage if not present
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new MockLocalStorage();
}

describe('Flow 1: Tax Identifier Validation & First-Time Setup', () => {
  it('computes GSTN Modulo-36 checksum correctly for verified test vectors', () => {
    // Tata Motors: 27AAACT2727Q1ZW
    const cd = computeGstinChecksum('27AAACT2727Q1Z');
    assert.equal(cd, 'W');
  });

  it('validates authentic 15-character GSTIN with format and checksum', () => {
    const result = validateGSTIN('27AAACT2727Q1ZW');
    assert.equal(result.isValid, true);
    assert.equal(result.isFormatValid, true);
    assert.equal(result.isChecksumValid, true);
    assert.equal(result.stateCode, '27');
    assert.equal(result.stateName, 'Maharashtra');
    assert.equal(result.pan, 'AAACT2727Q');
    assert.equal(result.computedCheckDigit, 'W');
  });

  it('detects checksum mismatch when check digit does not match algorithm', () => {
    // Same prefix but check digit altered from 'W' to '5'
    const result = validateGSTIN('27AAACT2727Q1Z5');
    assert.equal(result.isValid, false);
    assert.equal(result.isFormatValid, true);
    assert.equal(result.isChecksumValid, false);
    assert.match(result.error || '', /Check digit mismatch/);
  });

  it('rejects malformed or incomplete GSTIN formats', () => {
    const tooShort = validateGSTIN('27AAACT2727Q1Z');
    assert.equal(tooShort.isValid, false);
    assert.match(tooShort.error || '', /must be 15 characters/);

    const badChars = validateGSTIN('27AAACT2727Q1!W');
    assert.equal(badChars.isValid, false);
    assert.equal(badChars.isFormatValid, false);
  });

  it('validates 10-character PAN structure and derives entity classification', () => {
    // 4th char 'C' -> Company
    const compResult = validatePAN('AAACT2727Q');
    assert.equal(compResult.isValid, true);
    assert.equal(compResult.entityType, 'Company');

    // 4th char 'P' -> Individual / Person (AABPK1234F: char 1..3 = AAB, char 4 = P, char 5 = K)
    const personResult = validatePAN('AABPK1234F');
    assert.equal(personResult.isValid, true);
    assert.equal(personResult.entityType, 'Individual / Person');

    // 4th char 'F' -> Firm / LLP (AABFP9999K: char 1..3 = AAB, char 4 = F, char 5 = P)
    const firmResult = validatePAN('AABFP9999K');
    assert.equal(firmResult.isValid, true);
    assert.equal(firmResult.entityType, 'Firm / Limited Liability Partnership (LLP)');
  });

  it('rejects invalid PAN strings', () => {
    const invalidPan = validatePAN('INVALID');
    assert.equal(invalidPan.isValid, false);
    assert.match(invalidPan.error || '', /must be 10 characters/);

    const numericPan = validatePAN('1234567890');
    assert.equal(numericPan.isValid, false);
    assert.match(numericPan.error || '', /Invalid PAN structure/);
  });
});

describe('Flow 1: Draft Client Creation & Encrypted Workspace Genesis', () => {
  it('initializes encrypted workspace with genesis block (index 0) and SHA-256 hash', async () => {
    const client: ClientProfile = {
      id: 'cl-test-unit-01',
      name: 'Paramount Alloys Pvt Ltd',
      gstin: '27AAACT2727Q1ZW',
      pan: 'AAACT2727Q',
      state: 'Maharashtra',
      turnoverPaise: 0,
      matchedCount: 0,
      matchedTurnoverFormatted: '₹0',
      itcClaimFormatted: '₹0',
      filingFrequency: 'Monthly',
      isDraft: false
    };

    const bundle = await initializeClientWorkspace(client);
    assert.equal(bundle.items.length, 0);
    assert.equal(bundle.auditLedger.length, 1);

    const genesis = bundle.auditLedger[0];
    assert.equal(genesis.index, 0);
    assert.equal(genesis.action, 'GENESIS_INITIALIZE');
    assert.equal(genesis.targetId, 'WORKSPACE_CL-TEST-UNIT-01');
    assert.equal(genesis.previousHash, '0'.repeat(64));
    assert.equal(genesis.entryHash.length, 64);
  });

  it('allows saving incomplete GSTIN as draft with pending status', async () => {
    const draftClient: ClientProfile = {
      id: 'cl-test-draft-02',
      name: 'Incomplete Enterprise',
      gstin: 'DRAFT_GSTIN_PENDING',
      pan: 'PAN_PENDING',
      state: 'General',
      turnoverPaise: 0,
      matchedCount: 0,
      matchedTurnoverFormatted: '₹0',
      itcClaimFormatted: '₹0',
      filingFrequency: 'Monthly',
      isDraft: true
    };

    const bundle = await initializeClientWorkspace(draftClient);
    assert.equal(draftClient.isDraft, true);
    assert.equal(bundle.auditLedger[0].details.includes('draft'), true);

    const storedClients = getStoredClients();
    assert.equal(storedClients.some(c => c.id === 'cl-test-draft-02'), true);
  });
});

describe('Flow 2: Client Switching & Strict Workspace Isolation', () => {
  it('guarantees zero data bleed when switching between client workspaces', () => {
    // ACME seeded data
    const acmeBundle = loadClientData('cl-acme');
    assert.ok(acmeBundle.items.length > 0);

    // Apex seeded data
    const apexBundle = loadClientData('cl-apex');
    assert.ok(apexBundle.items.length > 0);

    // Ensure item IDs are strictly distinct
    const acmeIds = new Set(acmeBundle.items.map(i => i.id));
    for (const apexItem of apexBundle.items) {
      assert.equal(acmeIds.has(apexItem.id), false, `Cross-client data bleed detected for item ${apexItem.id}`);
    }

    // Newly provisioned workspace defaults to empty items and no bleed
    const unseededBundle = loadClientData('cl-nonexistent-empty');
    assert.equal(unseededBundle.items.length, 0);
  });

  it('persists changes strictly per client workspace without overwriting other clients', () => {
    const clientA = 'cl-test-persist-a';
    const clientB = 'cl-test-persist-b';

    saveClientData(clientA, {
      items: [{
        id: 'item-a-01',
        title: 'Vendor A',
        meta: 'Meta A',
        amount: '₹10,000',
        rawAmountPaise: 1000000,
        identifier: '27AABCA1111A1Z1',
        booksInvoice: 'INV-A-1',
        gstrInvoice: 'INV-A-1',
        books: '₹10,000',
        gstr: '₹10,000',
        why: 'Reason A',
        category: 'TIMING',
        booksDate: '01/09/2024',
        confidenceScore: 0.99
      }],
      auditLedger: []
    });

    saveClientData(clientB, {
      items: [{
        id: 'item-b-01',
        title: 'Vendor B',
        meta: 'Meta B',
        amount: '₹20,000',
        rawAmountPaise: 2000000,
        identifier: '27AABCB2222B1Z2',
        booksInvoice: 'INV-B-1',
        gstrInvoice: 'INV-B-1',
        books: '₹20,000',
        gstr: '₹20,000',
        why: 'Reason B',
        category: 'RATE_MISMATCH',
        booksDate: '02/09/2024',
        confidenceScore: 0.95
      }],
      auditLedger: []
    });

    const loadedA = loadClientData(clientA);
    const loadedB = loadClientData(clientB);

    assert.equal(loadedA.items.length, 1);
    assert.equal(loadedA.items[0].id, 'item-a-01');
    assert.equal(loadedB.items.length, 1);
    assert.equal(loadedB.items[0].id, 'item-b-01');
  });
});
