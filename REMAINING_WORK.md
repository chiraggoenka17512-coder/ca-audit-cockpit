# ReconOS — Remaining Engineering Work & Architecture Handoff Spec

> **Scope:** Everything remaining to finish the ReconOS desktop application **excluding ML model training, distillation, and quantization** (which stays with the ML owner). This document includes the exact app-side Rust/UI integration boundary where the quantized ONNX model will plug in.
>
> **Companion Contracts in Repo:** Read [`GEMINI.md`](GEMINI.md), [`AGENTS.md`](AGENTS.md), and [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md) alongside this file. If a tax rule, Tally XML schema, or portal schema lacks a verified source in the repo, mark it `UNVERIFIED` and stop rather than inventing it.

---

## 1. Current Verified State of the Repo (Baseline Audit)

Do not assume everything listed in [`HANDOFF.md`](HANDOFF.md) is wired end-to-end. Based on direct inspection and command runs:

### What Works Today
* **Frontend UI Shell (in-memory / browser `localStorage`):**
  * 3-pane cockpit in [`src/App.tsx`](src/App.tsx) with keyboard navigation (`J`/`K`/arrows, `Enter`/`R`, `A`, `E`, `Space`, `Ctrl+Z`/`U`, `Ctrl+K`/`/`, `Ctrl+O`, `Ctrl+I`, `?`).
  * Client switcher & creation (`Flow 1` client modal & `Flow 2` dirty-check switch guard in [`ClientSwitcherModal.tsx`](src/components/ClientSwitcherModal.tsx), [`NewClientModal.tsx`](src/components/NewClientModal.tsx), [`SaveOrDiscardModal.tsx`](src/components/SaveOrDiscardModal.tsx)).
  * Ingestion parsers in TS ([`src/engine/ingestion.ts`](src/engine/ingestion.ts)): `parseCurrencyToPaise`, `parseIndianDate`, HDFC Bank CSV parser, Purchase Register CSV parser, and GSTR-2B JSON parser (`parseGstr2bJson`).
  * Multi-stage deterministic reconciler in TS ([`src/engine/reconciliation.ts`](src/engine/reconciliation.ts)) and side-by-side UI ([`ReconciliationView.tsx`](src/components/views/ReconciliationView.tsx)).
  * Grouped Exception Queue ([`ExceptionQueue.tsx`](src/components/queue/ExceptionQueue.tsx)), Inspection Loupe ([`DetailPanel.tsx`](src/components/DetailPanel.tsx)), Invoice Finder ([`InvoiceFinderModal.tsx`](src/components/InvoiceFinderModal.tsx)), and LIFO session undo ([`sessionUndo.ts`](src/engine/sessionUndo.ts)).
  * **Unit tests (`npm test`):** 51 of 53 tests in [`tests/all.test.ts`](tests/all.test.ts) pass (`npx tsx src/engine/test_money.ts` also passes).
* **Rust Core Modules Written (not yet wired to Tauri IPC):**
  * [`src-tauri/src/engine/money.rs`](src-tauri/src/engine/money.rs): `Paise(i64)`, `parse_paise`, `validate_pan`, `validate_gstin` (format only; checksum marked `UNVERIFIED`), `parse_indian_date`, `mask_pan`, `mask_gstin`.
  * [`src-tauri/src/rules/mod.rs`](src-tauri/src/rules/mod.rs): `StatutoryRule`, `get_rules_for_date`, `DeterministicInvoiceBreakdown`, `Gstr2bReconcileResult` (5 hardcoded rules).
  * [`src-tauri/src/parsers/excel.rs`](src-tauri/src/parsers/excel.rs): `ExcelRegisterParser` using `calamine`.
  * [`src-tauri/src/parsers/gstr2b.rs`](src-tauri/src/parsers/gstr2b.rs): `Gstr2bParser`.
  * [`src-tauri/src/storage/encryption.rs`](src-tauri/src/storage/encryption.rs): `EncryptedStore` (AES-256-GCM with 96-bit random nonce) and `ClientWorkspace` (`client_records` table).
  * [`src-tauri/src/storage/audit.rs`](src-tauri/src/storage/audit.rs): `AuditLedger` (SHA-256 hash chain + `verify_chain()`).

### Immediate Broken Items & Unverified Tooling
1. **`npm run build` (`tsc && vite build`) fails:** [`src/engine/test_money.ts`](src/engine/test_money.ts) uses `process.exit(1)`, which causes `tsc` error `TS2580: Cannot find name 'process'` (no `@types/node`, and [`tsconfig.json`](tsconfig.json) includes all of `src/`). Also note that running Vite through the `C:\Users\Chirag\Desktop\ReconOS` junction instead of `D:\CodingProjects\ReconOS` causes a Rollup `emitFile` path mismatch error on `index.html`.
2. **`npm test` has 2 uncommitted regressions:**
   * [`tests/flow3_import.test.ts`](tests/flow3_import.test.ts) fails on `parseCurrencyToPaise('NOT_MONEY')`: recent edits in [`src/engine/ingestion.ts`](src/engine/ingestion.ts) changed the error message from `"Invalid currency string..."` to `"Non-digit characters in integer part..."`.
   * [`tests/flow4_flow7.test.ts`](tests/flow4_flow7.test.ts) fails static audit on [`DetailPanel.tsx`](src/components/DetailPanel.tsx): changing `onApprove(item)` to `onApprove(updated)` for Top-3 candidates broke the assertion `code.includes("onApprove(item)")`.
3. **Rust toolchain not verified on this machine:** `cargo` / `rustc` are not installed on `PATH` here, so Rust compilation and unit tests in `src-tauri/` have not been verified yet. Uncommitted local edits also exist in [`money.rs`](src-tauri/src/engine/money.rs) and [`rules/mod.rs`](src-tauri/src/rules/mod.rs).
4. **Legacy / Unused Frontend Files (Do Not Wire New Work Into These):**
   * Active components are [`TitleBar.tsx`](src/components/TitleBar.tsx), [`HomeView.tsx`](src/components/views/HomeView.tsx), [`DetailPanel.tsx`](src/components/DetailPanel.tsx), [`InvoiceFinderModal.tsx`](src/components/InvoiceFinderModal.tsx), and [`auditLedger.ts`](src/engine/auditLedger.ts).
   * Older unused components exist in the repo and are not wired in [`App.tsx`](src/App.tsx): `Header.tsx`, `ReviewList.tsx` (imported only), `DetailInspectionLoupe.tsx`, `OmniSearchModal.tsx`, `TodayDashboard.tsx`, `auditChain.ts`. Clean up or ignore rather than extending them.

---

## 2. Design System, Code Style & Testing Pattern Contract

Any new screens, Rust modules, or refactors **must match** the existing design system and conventions below. Note that [`tests/`](tests/all.test.ts) contains automated static source audits that will fail CI if violated.

### 2.1 Visual Design Tokens ([`src/index.css`](src/index.css))
| Token / Role | Exact Value | Usage |
| :--- | :--- | :--- |
| Canvas Background | `#0f1115` (`--bg`) | App background, inputs, inner rows |
| Panel Surface | `#171a21` (`--panel`) | Cards, modals, detail panel, toasts |
| Elevated / Hover Surface | `#1e222b` (`--panel-elevated`) | Active switcher item, button hover |
| Title Bar Surface | `#12151b` | Top persistent bar (`h-12`) |
| Border Hairline | `#262a33` (`--line`) / `#363b47` | Flat 1px solid borders |
| Primary Text | `#e8eaf0` (`--text`) | Headings, titles, amounts |
| Muted Text | `#8a909c` (`--muted`) | Metadata, labels, timestamps |
| Primary Accent / Pass | `#3ddc97` (`--accent`) / hover `#34c486` | Primary CTAs, verified status, matched green |
| Warning / Low Confidence | `#f5b754` (`--warn`) | Confidence `< 85%`, timing/pending alerts |
| Danger / Critical Risk | `#ff6b6b` (`--danger`) | Unverified rules, missing in 2B, errors |
| Typography | `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | All UI copy and headings |

### 2.2 Layout & CSS Primitives to Reuse
Use the existing CSS classes in [`src/index.css`](src/index.css) instead of inventing new modal/page chrome:
* Page shell: `.cockpit-wrap` (`max-width: 680px; margin: 0 auto;`) or clean Tailwind responsive grid like [`ReconciliationView.tsx`](src/components/views/ReconciliationView.tsx) when wider side-by-side columns are needed.
* Headings: `.cockpit-h1` (`24px`, weight `600`, normal letter-spacing) + `.cockpit-sub`.
* Controls: `.cockpit-btn` and `.cockpit-btn.primary` (`#3ddc97` background, `#0b1a13` text).
* Lists & overlays: `.cockpit-list`, `.cockpit-row`, `.cockpit-row.focused`, `.cockpit-overlay`, `.cockpit-compare`.

### 2.3 Zero AI Design Slop Rules (Enforced by Static Regex Tests)
Several test suites (`flow3_import.test.ts`, `flow4_flow7.test.ts`, `flow5_reconciliation.test.ts`, `flow6_exceptions.test.ts`, `flow16_undo.test.ts`) read `.tsx`/`.ts` files and fail if these appear:
1. **NO `rounded-full`** pill bubbles/tags — use `rounded`, `rounded-md`, or `rounded-lg` only.
2. **NO `italic`**, **`font-serif`**, or **`Instrument Serif`**.
3. **NO negative tracking** (`tracking-tight`, `tracking-[-...]`).
4. **NO gradient backgrounds** (`bg-gradient-to-*`). Flat solid colors only.
5. **NO trailing periods (`.`) on headings** (`<h1>`, `<h2>`, `<h3>`).
6. **NO eyebrow labels** (tiny uppercase tracked labels above headings) or numbered section prefixes (`01.`).
7. **NO pseudo-code breadcrumbs** (e.g., `// INSPECTION LOUPE //`).
8. **`tabular-nums` for ALL numbers, rupees, paise, dates, counts, bounding boxes, and confidence %**. Restrict `font-mono` strictly to SHA-256 hashes, GSTINs, PANs, `<kbd>` hints, and XML/code snippets.
9. **NO nested bordered card-inside-card-inside-card stacks**; group with whitespace or top/bottom borders (`border-t` / `border-b border-[#262a33]`).

### 2.4 Non-Negotiable Architecture & Security Rules ([`GEMINI.md`](GEMINI.md))
* **Air-gapped:** Zero outbound network calls, zero telemetry, zero external fonts/CDNs. CSP in [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) stays locked to `'self'`.
* **Money = Integer Paise (`i64` / JS integer):** Never use `f32`/`f64` for money calculations or storage. Note that Rust's `Gstr2bParser` (`val: f64`) and `ExcelRegisterParser` (`Data::Float`) currently convert floats by multiplying by `100.0`—replace JSON float inputs or keep decimal-string exact parsing where raw strings are available.
* **Human approval gate:** Nothing is auto-posted or auto-merged without explicit user action and a logged audit event. Every approval, rejection, edit, import, export, and undo appends a block to the SHA-256 hash chain.
* **No panics in Rust library code:** Use `thiserror` enums (`Result<T, DomainError>`) in core modules and `anyhow` only at the `#[tauri::command]` boundary. No `.unwrap()`/`.expect()` in production Rust paths without an explanatory comment.
* **PII masking:** Never log unmasked PAN, GSTIN, party names, or bank account numbers (`mask_pan`, `mask_gstin`).
* **TypeScript strict mode:** `strict: true` in `tsconfig.json`; no `any` outside the IPC boundary.
* **Testing convention:** Keep using `npm test` (`esbuild` -> `node --test`) and add both behavioral unit assertions and static anti-slop audits for every new component/view. Add Playwright specs matching `tests/verify_phase1_e2e.mjs` / `tests/verify_flow6_e2e.mjs`.

---

## 3. Remaining Work Breakdown (Ordered by Dependency)

### Phase 1: Fix Build, Tests & Toolchain Baseline
1. **Fix `npm run build`:** Exclude [`src/engine/test_money.ts`](src/engine/test_money.ts) from [`tsconfig.json`](tsconfig.json) or move it under `tests/` and eliminate `process.exit(1)` so `tsc && vite build` succeeds cleanly. Ensure dev/build scripts work reliably across the `Desktop/ReconOS` junction or document building from `D:\CodingProjects\ReconOS`.
2. **Fix the 2 failing tests in `npm test`:**
   * Reconcile the error prefix in [`parseCurrencyToPaise`](src/engine/ingestion.ts) (`"Invalid currency string: Non-digit characters..."`) or update the assertion in [`tests/flow3_import.test.ts`](tests/flow3_import.test.ts).
   * Preserve backward compatibility or update [`tests/flow4_flow7.test.ts`](tests/flow4_flow7.test.ts) static assertion for [`DetailPanel.tsx`](src/components/DetailPanel.tsx) `onApprove`.
3. **Install Rust & Tauri v2 build prerequisites:** Install `rustup` (`cargo`, `rustc`), Windows WebView2 / MSVC Build Tools, run `cargo fmt --check`, `cargo clippy --all-targets`, and `cargo test` in `src-tauri/`. Verify and clean uncommitted diffs in [`money.rs`](src-tauri/src/engine/money.rs) and [`rules/mod.rs`](src-tauri/src/rules/mod.rs).

---

### Phase 2: Tauri IPC Bridge & Encrypted Local Storage (Replacing `localStorage`)
Right now `App.tsx` is a pure browser app backed by `localStorage` and static arrays. Move the source of truth into Rust:

1. **Setup Tauri IPC & `ts-rs` codegen:**
   * Install `@tauri-apps/api` (and `@tauri-apps/plugin-dialog` / `@tauri-apps/plugin-fs` if native file pickers/save dialogs are used — check license & permissions).
   * Annotate shared Rust DTOs with `#[derive(TS)] #[ts(export, export_to = "../../src/types/generated/")]` and generate TypeScript interfaces via `cargo test export_bindings`. Do not hand-duplicate types across Rust and TS.
   * Register real `#[tauri::command]` handlers in [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs) backed by managed Tauri state (active workspace connection, firm keystore state, loaded models).
2. **Complete Encrypted Storage ([`src-tauri/src/storage/`](src-tauri/src/storage/mod.rs)) (`GEMINI.md` Step 2 & Flow 14):**
   * **Master key + Passphrase derivation:** Integrate OS keychain (e.g. `keyring` crate or DPAPI on Windows) plus PBKDF2/Argon2 key derivation from the CA's firm passphrase (Flow 1 step 1). Never store raw keys or plaintext client names on disk.
   * **Unify `AuditLedger` inside the encrypted client workspace:** Currently [`audit.rs`](src-tauri/src/storage/audit.rs) opens its own unencrypted SQLite file with `audit_log`, separate from [`encryption.rs`](src-tauri/src/storage/encryption.rs)'s `client_records`. Encrypt sensitive payload/detail columns (or store hash-chained audit records inside the encrypted workspace) and remove the WebCrypto fallback + hardcoded demo skip (`audit-000` / `audit-001`) in [`auditLedger.ts`](src/engine/auditLedger.ts).
   * **Client Workspace tables:** Persist imported vouchers (`PurchaseRegisterRow`, `Gstr2bRecord`, `BankTxn`), reconciliation matches, firm preferences, review queue state, and firm users in per-client SQLite files. Enforce zero cross-client query leakage.
   * **Encrypted Backup & Client Deletion (Flow 14):** Implement Tauri commands for `export_encrypted_backup(client_id, passphrase, dest_path)` (AES-256-GCM archive) and `delete_client_workspace(client_id, confirm_legal_name)` (deletes DB, indexes, backups in app data, and logs a sanitized non-PII firm audit event).
3. **Migrate Frontend Data Access:**
   * Replace `localStorage` in [`clientDatabases.ts`](src/data/clientDatabases.ts) and [`firmMemory.ts`](src/engine/firmMemory.ts) with Tauri `invoke` calls (keeping thin typed client wrappers so React unit tests can inject mock transports when running in Node).
   * Verify raw `.db` files on disk contain zero plaintext client/vendor names or invoice numbers.

---

### Phase 3: Complete Rust Parsers, Deterministic Matching, Rules & Tally Export

1. **Parsers & Format Verification (`src-tauri/src/parsers/`, `GEMINI.md` Step 4):**
   * **GSTIN Mod-36 Checksum in Rust:** [`money.rs`](src-tauri/src/engine/money.rs#L305) currently validates GSTIN format only (leaving checksum `UNVERIFIED`), whereas [`taxValidators.ts`](src/data/taxValidators.ts#L70-L85) implements Luhn Modulo-36. Verify official GSTN test vectors (including `27AAACT2727Q1ZW`) and implement matching checksum validation in Rust.
   * **Wire `.xlsx` / `.xlsb` Excel Ingestion:** Hook [`ExcelRegisterParser`](src-tauri/src/parsers/excel.rs) up via Tauri IPC and update [`ImportView.tsx`](src/components/views/ImportView.tsx) and [`ImportModal.tsx`](src/components/ImportModal.tsx) to send binary bytes / file paths for `.xlsx`/`.xlsb` files (currently they skip non-text files and pass `undefined` to `parsePurchaseRegisterCsv`). Preserve source file name, row number, raw row text, unmapped column header warnings, and exact rejection reasons (no silent drops).
   * **Named Bank Statement Parser in Rust:** Port the documented HDFC Bank CSV parser ([`parseBankStatementCsv`](src/engine/ingestion.ts#L616)) to Rust (explicitly named format, zero guessing), and replace any `f64` conversion in `gstr2b.rs` / `excel.rs` with decimal string parsing to paise where string representations exist.
   * **Real Local Invoice OCR / PDF Pipeline (Replace Mock Stub):** [`parseTaxInvoiceMetadata`](src/engine/ingestion.ts#L1056-L1120) is currently hardcoded to return `"Siemens Industrial Switchgear Ltd"` (or error if filename includes `encrypted`/`protected`/`locked`). Build the actual local pipeline:
     1. PDF text extraction + password-protected PDF prompt/error state (`"Enter PDF password"` / `"Re-export unencrypted"`, Flow 3).
     2. Local OCR ONNX runner (PP-OCRv4 / RapidOCR ONNX, CPU-only) returning words and normalized 2D bounding boxes `[x, y, w, h]`.
     3. Deterministic regex/Mod-36 value parser for GSTIN, invoice number, Indian dates, and paise amounts + tie-out check (`taxable + taxes == total`).
     4. Coordinate linking to drive the source bounding-box preview in [`DetailPanel.tsx`](src/components/DetailPanel.tsx).
2. **Deterministic Matching Engine in Rust (`src-tauri/src/engine/match.rs`, `GEMINI.md` Step 5):**
   * Implement the multi-stage matcher in Rust (`rayon` + `strsim`): exact match (`GSTIN + Invoice # + Paise + Date`), relaxed match (30-day window + ±100 paise tolerance), fuzzy party name (`strsim` similarity > 0.82 **only on vendor names/narrations**, strictly exact GSTIN/amount/invoice #), typo normalization suggestions, and root-cause exception grouping (`Timing Difference`, `Invoice Typo`, `Tax Rate Mismatch`, `Missing in 2B`, `Missing in Books`, `Below-the-line 206C(1H)/194Q` using [`DeterministicInvoiceBreakdown`](src-tauri/src/rules/mod.rs#L111)).
   * Every result must carry rule name, deterministic confidence, agreed fields, differing fields, and plain-language rationale.
   * Create the golden benchmark suite under `tests/golden/` and measure precision/recall across synthetic test cases.
   * **Connect live data in UI:** Update [`ReconciliationView.tsx`](src/components/views/ReconciliationView.tsx) so it reconciles the active client's **real imported** Purchase Register / Bank / GSTR-2B datasets from Rust SQLite instead of `SEEDED_BOOK_INVOICES` and `SEEDED_GSTR2B_RECORDS`.
3. **Versioned Rules File (`rules/gst.toml`, `GEMINI.md` Step 6):**
   * Extract hardcoded rules out of [`src-tauri/src/rules/mod.rs`](src-tauri/src/rules/mod.rs) and [`src/data/rules.ts`](src/data/rules.ts) into a single versioned TOML file (`rules/gst.toml`), loaded at startup.
   * Populate all statutory rules used in the UI (`SEC-16-2-AA`, `SEC-16-2-C`, `SEC-9-3`, `GST-SEC-17-5-A`, `GST-SEC-17-5-C`, plus Sec `17(5)(b)`, `194C`, `194J`, `194J-TECH`, `194Q`, `206C(1H)`, `CIRCULAR-183-TYPO`, and an explicit `status = "UNVERIFIED"` entry) with verified circular references and effective dates.
   * Enforce `rules_for(transaction_date)` everywhere so historical vouchers never use future rules, and forbid `UNVERIFIED` rules from driving any automated decision.
4. **Hybrid Invoice Search (`src-tauri/src/engine/search.rs`, `GEMINI.md` Step 7 & Flow 8):**
   * Build per-client search indexing inside the encrypted workspace. Apply structured filters first (client ID, date range, amount paise range, GSTIN, invoice #), then combine exact + keyword/BM25 (and semantic vector similarity once the model integrates). Return snippet + confidence, or label results `"no strong match"`.
   * Replace hardcoded demo replies in [`chatAssistant.ts`](src/engine/chatAssistant.ts) and wire [`InvoiceFinderModal.tsx`](src/components/InvoiceFinderModal.tsx) to query the active client's encrypted Rust index.
5. **Verified Tally Prime XML Exporter (`src-tauri/src/engine/tally.rs`, `GEMINI.md` Step 8 & Flow 10):**
   * **Stop & verify first:** Obtain a real sample XML export from Tally Prime (`Purchase` / `Expense` / `Payment` / `Journal` vouchers with GST/TDS ledgers) and commit it as a golden fixture. Do not ship an unverified XML schema (`UNVERIFIED` until matched byte-for-byte).
   * Replace floating-point `.toFixed(2)` formatting in [`tallyExport.ts`](src/engine/tallyExport.ts) with an integer `Paise` decimal formatter in Rust with unit tests ensuring Debits == Credits (`total == 0` sum).

---

### Phase 4: Missing User Flows in the UI (`docs/USER_FLOWS.md`)
Keep all new screens strictly aligned with `#0f1115`/`#171a21`/`#3ddc97`, `tabular-nums`, and Zero AI Design Slop checks:

* **Flow 1 — First-Time Launch Setup Modal / Screen:**
  * On first launch (when no firm profile exists), prompt for Firm Passphrase (with explicit warning: *"ReconOS cannot recover encrypted client data if this passphrase is lost"*), Firm Name, and initial Partner account before entering the cockpit.
* **Flow 9 — Learning from Corrections (Firm Memory) + Settings UI:**
  * Call [`recordCACorrection`](src/engine/firmMemory.ts#L31) (backed by Rust SQLite) whenever the CA overrides a ledger/TDS section in [`EditModal.tsx`](src/components/EditModal.tsx).
  * Automatically surface `learnedFromFirmMemory` suggestions (*"Suggested based on your earlier correction"*) on matching pending unreviewed vouchers, and prompt before retroactively applying to unapproved vouchers (never alter already-approved items).
  * Add a **Learned Preferences** tab inside **Settings** to view, edit, and revoke saved vendor mappings.
* **Flow 10 — Tally Prime XML Export UI:**
  * Add an **Export > Tally Prime XML** workflow (accessible from `ReconciliationView` / sidebar / command).
  * Pre-export gate: verify Debits == Credits and block export if unapproved/incomplete vouchers remain in the period unless explicitly excluded by the CA.
  * Write XML file locally via Tauri save dialog, show copyable Tally import instructions (`Alt + O > Import > Transactions`), and append a `TALLY_EXPORT` block (filename, voucher count, total paise, SHA-256 file digest) to the audit ledger.
* **Flow 11 — Statutory Excel Reports (`Reports` View):**
  * Add `reports` to `NavSection` in [`App.tsx`](src/App.tsx) and the left sidebar.
  * Allow selecting client + filing period (e.g., `Q2 FY 2024-25`) + report type (*Reconciliation Summary* or *Exception List*), preview summary metrics (matched vs at-risk ITC), export formatted `.xlsx` / `.csv` from Rust without network calls, and log an audit block.
* **Flow 12 — Live Return Check in [`DeadlinesView.tsx`](src/components/views/DeadlinesView.tsx):**
  * Replace the hardcoded Nov 2024 `DEADLINES` array with dynamic GST filing calendar calculation based on active client `filingFrequency` (`Monthly` vs `Quarterly QRMP`).
  * Add the **Return vs Books Check** comparing eligible GSTR-2B ITC against Purchase Register input credits broken down by `CGST`, `SGST`, `IGST` (using [`ReturnCheckDifference`](src/data/clientDatabases.ts#L36)), deep-linking variances to the Exception Queue, and displaying *"Rule not verified"* with no pass/fail verdict if any rule lacks verification.
* **Flow 13 — Audit Trail Verification & Filters in [`AuditTrailView.tsx`](src/components/views/AuditTrailView.tsx):**
  * Add actor, action type, and date-range filter controls.
  * Add the **"Verify Chain"** button calling Rust `verify_chain()` (`verifyAuditChain`) across all stored blocks, showing either a green intact summary with verified block count or a red alert identifying the exact tampered/severed block index.
* **Flows 14 & 15 — Settings View (Backup, Client Deletion, Users & Roles RBAC):**
  * Add `settings` to `NavSection` and the sidebar with tabs:
    1. **Learned Preferences** (Flow 9)
    2. **Backup & Delete Client** (Flow 14): Passphrase-protected encrypted backup export + external storage warning; permanent client delete requiring the CA to type the exact legal entity name.
    3. **Users & Roles** (Flow 15): Manage Partner vs Staff accounts (using `FirmUser` from `clientDatabases.ts` / Rust DB), restrict sensitive actions (client deletion, rule edits, master audit export) to Partner role, enforce **cannot delete last remaining Partner account**, and log role changes to the audit trail.

---

### Phase 5: App-Side Integration Boundary for the ML Friend's Model (`GEMINI.md` Step 9)
Your ML friend is responsible for delivering `multitask_student_int8.onnx` (< 150 MB), `tokenizer.json`, and `config.json` into `src-tauri/resources/models/` with 3 output heads (`retrieval_embedding`, `narration_logits`, `token_bio_logits`). To make the app actually consume that model safely:

1. **Rust ONNX Runtime Wrapper (`src-tauri/src/engine/model.rs`):**
   * Add `ort` (ONNX Runtime) and `tokenizers` crates to [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml) configured strictly for CPU execution (no telemetry, no network weight downloads).
   * Configure `bundle.resources` in [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) to package `resources/models/*`.
   * Load the model lazily / in managed state on app startup and expose typed inference commands (semantic query embedding, Top-3 bank narration ledger classification + softmax probabilities, BIO role-tagging).
2. **Untrusted Output Guardrails:**
   * Treat all neural outputs as untrusted suggestions: validate shapes, finite floats, category bounds, and enforce the 15-digit GSTIN invariant before proposing any vendor alias merge.
   * Never let the model calculate taxes, totals, or paise values.
3. **Wire UI Consumers:**
   * Replace the heuristic `candidateSuggestions` generator in [`DetailPanel.tsx`](src/components/DetailPanel.tsx#L190-L280) with Top-3 predictions returned by Rust (`narration_logits`), keeping the existing `1`/`2`/`3` + `A` keyboard flow and amber highlight for any score `< 0.85`.
   * Wire [`InvoiceFinderModal.tsx`](src/components/InvoiceFinderModal.tsx) and [`ComposerInput.tsx`](src/components/ComposerInput.tsx) / [`chatAssistant.ts`](src/engine/chatAssistant.ts) to call Rust hybrid search (`retrieval_embedding` + deterministic filters).

---

## 4. Acceptance & Definition of Done Checklist
Before handing back or shipping a release:
* `npm run build` exits `0` with zero TypeScript errors.
* `npm test` passes 100% (including all Anti-Slop static audits and new tests for Flows 9–15).
* `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, and `cargo test` in `src-tauri/` pass with zero warnings.
* `cargo tauri build` bundles the desktop executable cleanly with `src-tauri/resources/models/*`.
* Playwright / desktop E2E verification covers all 16 flows cleanly.
* Air-gap audit confirms `0` outbound network sockets / telemetry calls during startup, import, reconciliation, search, inference, and export, and raw SQLite `.db` files contain no plaintext client PII.
