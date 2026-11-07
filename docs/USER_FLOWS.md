# ReconOS: Master User Flows & Interaction Specification
## Air-Gapped Financial Intelligence & Audit Defense Cockpit for Indian Chartered Accountants

---

## Executive Overview

ReconOS is an air-gapped, zero-cloud desktop operating cockpit for Indian Chartered Accountants (CAs). It operates on **integer paise arithmetic**, **AES-GCM-256 local workspace encryption**, and **immutable SHA-256 hash-chained audit logging**.

This specification operationalizes all 16 end-to-end user flows, detailing triggers, procedural steps, decision points, failure states, and audit trail guarantees.

---

## Flow 1: First-Time Setup & Client Creation

- **Trigger:** The CA launches ReconOS for the first time, or clicks **New client** in the persistent client switcher.
- **Steps:**
  1. **Firm Passphrase Initialization:** For first-time launch, the CA establishes a master firm passphrase used to derive the local database encryption key via PBKDF2/Argon2. The UI explicitly warns: *"ReconOS cannot recover encrypted client data if this passphrase is lost."*
  2. **Firm Profile & Initial Users:** CA enters firm name (e.g. *M/s Chirag & Associates, Chartered Accountants*) and initial partner/staff credentials.
  3. **Client Onboarding Form:**
     - Client Legal Name (e.g. *ACME Manufacturing Pvt Ltd*)
     - GSTIN (15 alphanumeric characters)
     - PAN (10 alphanumeric characters)
     - Filing Frequency (*Monthly* or *Quarterly QRMP*)
     - State jurisdiction (auto-derived from first 2 digits of GSTIN)
  4. **Validation Logic:** Deterministic checksum and regex validation on GSTIN (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`) and PAN (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`).
  5. **Encrypted Workspace Provisioning:** App creates a dedicated SQLite database encrypted with AES-256-GCM.
- **Decision Point:** If GSTIN fails checksum validation, offer **Save as draft** so the CA can proceed with data ingestion and correct the GSTIN later before statutory return checks.
- **Done When:** The client appears in the sidebar and the persistent title bar reflects the active client name, GSTIN, and air-gap status (`0 KB OUTBOUND`).

---

## Flow 2: Switching Clients

- **Trigger:** The CA selects a different client in the sidebar, clicks the title bar client cue, or presses `Ctrl+O`.
- **Steps:**
  1. **Dirty Check:** If any unsaved manual ledger override or in-flight edit exists on the current client, display an inline modal: *"Save changes or discard before switching clients?"*
  2. **Workspace Isolation Switch:** Unload memory of current client. Open the target client's encrypted database.
  3. **UI Synchronization:** Update title bar, sidebar active state, review items list, reconciliation matrix, and search index.
- **Why:** Cross-client data bleed is the most damaging error in statutory accounting. Isolation is cryptographically separated per workspace.
- **Done When:** Every open panel and background queue strictly represents the active client.

---

## Flow 3: Importing Documents

- **Trigger:** CA drags files into the Inbox, selects **Import Documents**, or points to a watched local directory.
- **Steps:**
  1. **File Detection:** Calamine and native parsers inspect headers and MIME types to auto-classify files into:
     - *Purchase Register* (Excel/CSV)
     - *Bank Statement* (CSV/Excel with bank-specific schema)
     - *GSTR-2B JSON* (Official GSTN schema)
     - *Tax Invoices* (PDF / Images)
     - *Unknown / Unmapped*
  2. **Pre-Processing Review:** CA can override the detected file type from a dropdown before ingestion begins.
  3. **Background Ingestion & Parsing:** Processing executes locally with per-file progress indicators.
  4. **Ingestion Summary:** App reports rows read, rows rejected with specific reasons (e.g., malformed date, negative paise), and unmapped column headers.
- **Decision Point:** Unknown or corrupt files are moved to a *"Needs attention"* queue. No file is ever silently skipped.
- **Failure State:** Corrupt or password-protected PDFs are flagged with actionable options (*"Enter PDF password"* or *"Re-export unencrypted"*). Other files continue processing unaffected.
- **Done When:** Every file is either processed into the active client's staging tables or listed with a concrete failure reason.

---

## Flow 4: Reviewing Extracted Fields

- **Trigger:** CA opens an ingested invoice or statement transaction in the Loupe Inspector.
- **Steps:**
  1. **Dual-Pane Inspection:** Document preview appears on the left; structured extracted fields appear on the right.
  2. **Source Linking:** Clicking any extracted field (e.g. *Taxable Amount ₹45,000*) highlights the exact coordinate bounding box on the source document.
  3. **Confidence Scoring:** Fields extracted with model confidence < 85% carry a high-contrast amber warning indicator, ensuring the CA verifies them first.
  4. **Single-Action Approval:** CA edits any incorrect field (recording an audit entry) and presses `A` or clicks **Approve**.
- **Decision Point:** Any edit preserves the original OCR value and the human override in the immutable audit log.
- **Done When:** Document is marked approved and its vouchers enter the deterministic reconciliation engine.

---

## Flow 5: Deterministic Reconciliation

- **Trigger:** CA navigates to **Reconciliation** and selects two sources (e.g. *Purchase Register vs GSTR-2B* or *Bank Statement vs General Ledger*).
- **Steps:**
  1. **Side-by-Side Presentation:** Left column displays source A (Books); right column displays source B (Portal/Bank).
  2. **Deterministic Multi-Stage Matching:**
     - Stage 1: Exact match on GSTIN + Invoice Number + Amount (paise exact).
     - Stage 2: Relaxed match (Date within 30-day statutory window, amount within ±₹1.00 rounding tolerance).
     - Stage 3: Fuzzy party name matching via Levenshtein distance (`strsim`), strictly keeping amount and GSTIN exact.
  3. **Visual Collapse:** Reconciled pairs collapse into a single green line.
  4. **Exception Segregation:** Unmatched records remain expanded and grouped by root cause.
- **Decision Point:** Matches below confidence threshold are presented as suggestions requiring CA confirmation.
- **Done When:** All records are either reconciled, routed to the exception queue, or marked as deferred with a CA note.

---

## Flow 6: Exception Queue Triage

- **Trigger:** CA opens **Exceptions** or clicks the *Today* triage badge.
- **Steps:**
  1. **Root-Cause Grouping:** Items are grouped into actionable categories:
     - *Timing Differences* (e.g., supplier uploaded in Sep, recorded in Oct books)
     - *Invoice Number Typos* (e.g., `/` vs `-`, leading zeros)
     - *Tax Rate Mismatches* (e.g., 18% in books vs 12% in GSTR-2B)
     - *Missing in GSTR-2B* (ITC at risk under Section 16(2)(aa))
  2. **Keyboard Navigation:** CA steps through exceptions with `J` (next) and `K` (previous).
  3. **Direct Actions:**
     - `A`: Approve proposed match or ITC claim.
     - `R`: Reject match.
     - `E`: Open inline ledger reclassification editor.
  4. **Batch Group Actions:** Press `Space` to batch-approve homogeneous groups (e.g., all timing differences within the 30-day window).
- **Decision Point:** Batch actions trigger a confirmation dialog stating exact item count and statutory rule basis before executing.
- **Done When:** The active exception queue is cleared or remaining items are deferred with documented notes.

---

## Flow 7: Explanations & Rule Citations

- **Trigger:** CA inspects any match, suggestion, or flagged exception.
- **Steps:**
  1. **Plain-Language Rationale:** Displays exact field agreements, differences in paise/rupees, and date deltas.
  2. **Statutory Reference:** Displays the applicable Act, Section, and Circular (e.g. *Section 16(2)(aa) CGST Act, 2017 & Rule 36(4)*).
  3. **Rule Verification Status:**
     - If verified: Shows effective date range and statutory citation.
     - If unverified: Displays `UNVERIFIED RULE` warning and prohibits automated tax conclusions.
  4. **Deep-Link:** Clicking **View rule** opens the full statutory text in the rulebook.
- **Decision Point:** If no specific tax rule governs the transaction, the panel explicitly displays *"No rule cited"* rather than an empty space.

---

## Flow 8: Invoice Finder (Omni-Search `Ctrl+K`)

- **Trigger:** CA presses `Ctrl+K` or `/` from any screen.
- **Steps:**
  1. **Omni-Search Overlay:** Opens modal with instant focus on query input.
  2. **Financial Query Parsing:**
     - Amount expressions (e.g. *about 40k* -> `₹35,000 - ₹45,000`).
     - Vendor keywords (e.g. *transport* -> matches GTA, Blue Dart, Reliance Logistics).
     - Temporal tokens (e.g. *March* -> `2024-03-01 to 2024-03-31`).
  3. **Ranked Candidate Cards:** Displays top matches with snippet context, invoice number, date, amount, and confidence percentage.
  4. **Navigation:** `Enter` opens top candidate; arrow keys navigate list.
  5. **Empty State:** Shows recent documents for the active client workspace.
- **Decision Point:** Search never implies certainty. Candidates display clear confidence indicators and highlight matching tokens.
- **Done When:** CA selects an invoice to view in the Loupe Inspector.

---

## Flow 9: Learning from Corrections (Firm Memory)

- **Trigger:** CA changes a suggested ledger account or overrides a vendor match (e.g., maps *Adobe Systems* to *Software Subscriptions* under Section 194J).
- **Steps:**
  1. **Preference Recording:** The correction is saved to the client's encrypted firm preference store.
  2. **Cascading Suggestions:** Subsequent unreviewed vouchers matching the vendor pattern highlight the updated ledger with note: *"Suggested based on your earlier correction."*
  3. **Preference Management:** CA can view, edit, or revoke learned rules in **Settings > Learned Preferences**.
- **Decision Point:** The app prompts before applying a newly learned preference to previously approved vouchers. It **never** alters approved transactions automatically.

---

## Flow 10: Tally Prime XML Export

- **Trigger:** CA selects **Export** and chooses **Tally Prime XML**.
- **Steps:**
  1. **Pre-Export Validation:** Lists all approved vouchers for the period with debit and credit balance verification.
  2. **Unapproved Voucher Guard:** Detects unapproved or incomplete vouchers in the period and blocks export until approved or explicitly excluded.
  3. **Deterministic XML Generation:** Emits standard `<ENVELOPE><TALLYMESSAGE><VOUCHER>` XML formatted from integer paise.
  4. **Export Artifact:** Saves file to local disk (e.g. `ReconOS_ACME_Sep2024_Tally.xml`) and displays copy/download options.
  5. **Import Guidance:** Provides copyable steps for Tally Prime (`Alt + O > Import > Transactions`).
- **Decision Point:** Audit log appends a dedicated export block capturing filename, voucher count, total value, and SHA-256 digest.
- **Done When:** Export file is saved locally and logged in the immutable audit trail.

---

## Flow 11: Statutory Excel Reports

- **Trigger:** CA navigates to **Reports** and selects *Reconciliation Summary* or *Exception List*.
- **Steps:**
  1. **Report Parameter Selection:** Select client, filing period (e.g. *Q2 FY 2024-25*), and column configuration.
  2. **On-Device Compilation:** Calamine/Rust engine compiles data in memory without network transmission.
  3. **Interactive Preview:** Displays summary table with reconciled vs at-risk ITC breakdown.
  4. **Export:** Generates formatted `.xlsx` or `.csv` with exact cell formatting and currency display.
- **Done When:** File is written to local filesystem and audit entry is appended.

---

## Flow 12: GST & Filing Deadlines Check

- **Trigger:** CA opens **Deadlines** or initiates a **Return Check**.
- **Steps:**
  1. **Statutory Calendar:** Displays upcoming compliance dates customized to client filing type (e.g., GSTR-1 on 11th, GSTR-3B on 20th, TDS Challan 281 on 7th).
  2. **Return vs Books Comparison:** Compares eligible ITC in GSTR-2B against Purchase Register input credit.
  3. **Variance Identification:** Lists specific tax differences (CGST, SGST, IGST) with direct links to corresponding exception queue items.
- **Decision Point:** If any rule required for the check is unverified, displays *"Rule not verified"* and does not issue a compliance pass/fail.

---

## Flow 13: Cryptographic Audit Trail Verification

- **Trigger:** CA opens **Audit Trail** from sidebar.
- **Steps:**
  1. **Ledger Timeline:** Displays chronological chain of all human decisions, approvals, and imports.
  2. **Filter Controls:** Filter by actor (e.g. *Partner*, *Staff*), action type, or date range.
  3. **"Verify Chain" Action:** CA clicks **Verify Chain**. Engine iterates through every block, recomputing `SHA-256(canonicalPayload + prevHash)`.
  4. **Integrity Report:**
     - If intact: Displays green confirmation with verified block count.
     - If tampered: Raises critical alert identifying the exact block index where the hash chain severed.
- **Done When:** Full verification executes locally with visual cryptographic proof.

---

## Flow 14: Backup & Client Workspace Deletion

- **Backup Workflow:**
  1. CA selects **Backup Workspace** and inputs the firm passphrase.
  2. App writes an encrypted archive file (AES-256-GCM) and presents file size and destination path.
  3. Warning modal prompts CA to store backup on air-gapped external media.
- **Client Deletion Workflow:**
  1. CA opens **Settings > Delete Client**.
  2. Warning outlines exact scope: local workspace DB, document indexes, and cache will be permanently wiped.
  3. CA must type the exact legal name of the client to confirm deletion.
  4. App purges local database and logs a sanitized event in the firm audit trail containing no client-identifiable data.
- **Decision Point:** Warns that external backups previously saved by the CA remain intact.

---

## Flow 15: Role-Based Access Control (Users & Roles)

- **Trigger:** Audit Partner opens **Settings > Users & Roles**.
- **Steps:**
  1. **User Roster:** Displays active users and assigned roles:
     - **Partner:** Full administrative access (client deletion, rule modifications, master audit log export).
     - **Staff / Article Assistant:** Operational review, matching approvals, Tally export generation.
  2. **Role Assignment & Revocation:** Partner adds or deactivates accounts.
- **Decision Point:** The system strictly prevents deletion of the last remaining Partner account.
- **Done When:** User permissions update instantly and an audit block records the user administration event.

---

## Flow 16: Session Undo (`Ctrl+Z`)

- **Trigger:** CA presses `Ctrl+Z` after an approval, rejection, or manual edit.
- **Steps:**
  1. **State Reversion:** The immediately preceding action is undone in the active view, restoring items to the review queue.
  2. **Audit Append:** Rather than deleting history, ReconOS appends an `ACTION_UNDO` block referencing the reverted block ID.
  3. **Toast Notification:** Feedback confirms: *"Undone: [Item Title] restored to review queue."*
- **Scope Limit:** Undo is available for in-memory actions during the current active session. Exported Tally files cannot be revoked.

---

## Cross-Cutting System Guarantees

1. **Air-Gap Invariant:** Outbound network telemetry is zero bytes. All parsing, matching, search, and encryption occur on-device.
2. **Integer Arithmetic:** Money is strictly computed as integer paise (`i64`), eliminating floating-point rounding errors.
3. **No Automatic Posting:** Every accounting voucher and return match requires explicit human approval.
4. **Zero AI Design Slop:** No gratuitous tags, no neon gradients, no ASCII art, no pseudo-code headers, and no negative tracking. Clean, high-density typography with tabular numerals.
