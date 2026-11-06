# ReconOS: Team Task Breakdown & Phased Build Order

> **Architecture Contract:** Polyglot Native Desktop (Rust Tauri + Python ML + React TypeScript UI)  
> **Rule:** Core security, audit hashing, and matching run in Rust. Model training runs in Python. UI runs in React.

---

## 📅 Phased Implementation Order

To guarantee stability, the team must build in this sequence:
```
PHASE 1 (Rust Foundation)  ──► PHASE 2 (Rust Engines)   ──► PHASE 3 (UI & Model Integration)
Storage & SHA-256 Audit Log    Matching Math & Tax Rules     3-Pane Cockpit & Local Inference
(Rajveer)                      (Rajveer & Vihaan)            (Chirag & Team)
```

---

## 1. Chirag — Frontend 3-Pane Cockpit & Model Fine-Tuning Lead

### A. Frontend Cockpit (TypeScript / React in Tauri)
- [ ] **3-Pane Desktop Layout (`src/components/layout/`):**
  - **Left Sidebar:** Client list with search, active client indicator, global navigation (Inbox, Queues, Find Invoice, Rules, Audit Log, Settings).
  - **Centre Pane:** Working list (Today view, Exception Queue, Two-Column Reconciliation Workspace).
  - **Right Pane:** Detail inspection loupe (Selected item, Extracted values vs. Source document side-by-side, Cited rule).
- [ ] **Home Screen ("Today" View):**
  - Strictly 3 widgets: (1) Client queries waiting with deadlines, (2) Statutory deadlines this week, (3) Queue progress per client.
- [ ] **The "Find Invoice" Omni-Search Bar (`/` or `Ctrl + K`):**
  - Instant fuzzy search accepting loose input (e.g. *"transport bill March about 40k"*). Shows snippet, confidence tag, and inline filters.
- [ ] **Keyboard-First Workflow Engine:**
  - Implement navigation shortcuts: `J`/`K` (move selection), `A`/`Enter` (approve), `E` (edit ledger/TDS), `Space` (batch approve), `U` (undo), `?` (cheat sheet).
- [ ] **Tauri IPC Integration:**
  - Call Rajveer's Rust commands via `@tauri-apps/api/core` (`invoke('reconcile_books')`, `invoke('append_audit_block')`).

### B. Machine Learning & Model Fine-Tuning (Python / PyTorch)
- [ ] **Training Data Preparation:** Curate 3,000 synthetic Indian GST invoice examples (generated via Vihaan's pipeline).
- [ ] **QLoRA Fine-Tuning (`ml/training/`):**
  - Fine-tune a lightweight VLM/LLM (e.g., `Qwen2.5-VL-3B/7B` or `Florence-2`) to extract Indian accounting fields:
    - `vendorGSTIN`, `invoiceNumber`, `invoiceDate`, `hsnCode`, `taxableValue`, `cgst`, `sgst`, `igst`, `totalAmount`.
- [ ] **Model Export:**
  - Quantize and export model weights to GGUF / ONNX format for on-device inference via Rust Candle or a bundled local engine.

---

## 2. Rajveer — Rust Systems, Security & Core Engine Lead

### A. Phase 1: Storage Layer & Tamper-Evident Audit Log (Start Here!)
- [ ] **Workspace Isolation & Encryption (`src-tauri/src/storage/`):**
  - Implement local workspace storage with client-level cryptographic separation.
  - Implement on-device encryption using `AES-GCM-256` (`aes-gcm` or `ring` crate).
- [ ] **SHA-256 Hash-Chained Audit Log (`src-tauri/src/storage/audit.rs`):**
  - Implement cryptographic block structure:
    `{ index, timestamp, action, actor, record_ids, previous_hash, block_hash }`.
  - Use `sha2` crate to guarantee tamper-evidence.
  - Expose `verify_chain()` function to prove complete audit integrity to a Partner.

### B. Phase 2: Deterministic Reconciliation & Tax Rules
- [ ] **Matching Math (`src-tauri/src/engine/`):**
  - **Exact Match:** `GSTIN + normalized Invoice # + Total Amount` match identically within +- ₹1.00 tolerance.
  - **Fuzzy Invoice Number Match:** Apply Levenshtein distance (`strsim` crate) on invoice strings (e.g. `/` vs `-`) with confidence scoring.
  - **Timing Difference Check:** Compares invoice date vs 2B filing date; flags items within 30-day window.
  - **Multi-threading:** Use `rayon` to process 50,000+ records in parallel across CPU cores.
- [ ] **Dated Statutory Rulebook (`src-tauri/src/rules/`):**
  - Implement versioned compliance rules with effective dates:
    - `GST_SEC_16_2_AA`: ITC eligibility against GSTR-2B.
    - `TDS_194C_194J`: Flags professional/service invoices exceeding statutory thresholds.
- [ ] **Local Firm Memory (`src-tauri/src/engine/memory.rs`):**
  - Local SQLite / key-value store for per-firm classification habits. Overriding a ledger head records the preference and auto-adapts remaining pending items.
- [ ] **Tally Prime XML Builder (`src-tauri/src/export/tally.rs`):**
  - Generates valid `<TALLYMESSAGE>` XML for instant import into Tally Prime.

---

## 3. Vihaan — Data Ingestion, Parsers & Model Evaluation Lead

### A. Fast Ingestion Parsers (Rust / Calamine)
- [ ] **Excel Purchase Register Reader (`src-tauri/src/parsers/excel.rs`):**
  - Use **`calamine`** crate to parse massive `.xlsx` and `.xlsb` client books at 10x the speed of Python/Node.
  - Parse Indian date formats (`DD/MM/YYYY`, `DD-MM-YYYY`) and Indian currency strings (Lakhs/Crores).
- [ ] **GSTR-2B JSON Parser (`src-tauri/src/parsers/gstr2b.rs`):**
  - Use `serde_json` to parse official portal JSON exports into Rust structs.
- [ ] **Bank Statement CSV Parser:**
  - Robust table parser handling debit, credit, reference numbers, and Indian transaction narrations.

### B. Synthetic Data Engine (Python / `ml/synthetic/`)
- [ ] **Generator Pipeline (`generate_invoices.py`):**
  - Use `Faker('en_IN')` + Jinja2 HTML templates + `WeasyPrint` / `ReportLab`.
  - Generate 2,000+ realistic Indian invoices covering Tally, Busy, Marg ERP, and Zoho Books layouts.
  - Guarantee valid GSTIN checksums, authentic HSN codes, and exact GST tax math.
  - Output paired PDF files and structured JSON ground truth for Chirag's ML training.

### C. Evaluation Benchmark Harness (Python / `ml/eval/`)
- [ ] Build a 200-document **Gold Test Set** with verified ground truth.
- [ ] Write the automated benchmark evaluation script:
  - Measure **Field Error Rate (FER)** across GSTIN, invoice number, and amounts.
  - Ensure Chirag's model reaches > 96% accuracy before production release.

---

## 4. Git Branch Strategy

```
main (Protected)
 ├── feat/chirag-ui-and-model    (Chirag works in src/ and ml/training/)
 ├── feat/rajveer-rust-engine    (Rajveer works in src-tauri/src/engine/ and storage/)
 └── feat/vihaan-parsers-and-ml  (Vihaan works in src-tauri/src/parsers/ and ml/synthetic/)
```
