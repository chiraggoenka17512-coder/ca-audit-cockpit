# CA Audit & Reconciliation Cockpit (ReconOS) ⚖️

> **Air-Gapped Autonomous Financial Intelligence & Audit Defense for Indian CAs**

ReconOS is an on-device, privacy-first desktop application designed specifically for Indian Chartered Accountants, tax practitioners, and audit associates. 

Instead of sending confidential client bank statements, PANs, and vendor ledgers to third-party cloud servers, ReconOS operates **100% locally with zero network outbound traffic**, offering deterministic compliance checks, an exception-first review workflow, on-device firm learning, and audit-defensible justifications.

---

## 🏗️ Polyglot Architecture: Right Tool for the Right Job

| Layer | Language / Tech | Why This Tool? |
| :--- | :--- | :--- |
| **Desktop Shell** | **Rust (Tauri v2)** | Small (~15MB), native Windows performance, 200ms boot, zero Electron bloat. |
| **Storage, Encryption & Audit Log** | **Rust (`ring`, `sha2`, `rusqlite`)** | Strict memory safety, zero buffer overflows, audit-grade local AES-GCM-256 encryption. |
| **Deterministic Matching & Tax Rules** | **Rust (`rayon`, `strsim`, `calamine`)** | Blazing-fast parallel CPU execution; reconciles 50,000 invoices in <200ms with zero hallucination. |
| **Local Model Inference** | **Rust (Candle / `llama-cpp-rs`)** | Self-contained on-device inference without needing a separate Python runtime. |
| **Model Fine-Tuning & Evaluation** | **Python (PyTorch, Unsloth, Hugging Face)** | Mature ML ecosystem for LoRA fine-tuning and export to GGUF/Candle. |
| **User Interface (3-Pane Cockpit)** | **TypeScript (React / Tailwind)** | Rapid, flexible UI development with rich micro-interactions and keyboard accessibility. |

---

## 🎨 UI & UX Specifications (Reverse-Engineered Benchmarks)

The user interface of ReconOS is thoroughly documented in [`docs/teardowns/`](./docs/teardowns/README.md). It synthesizes reverse-engineering teardowns across 7 industry-leading products:
- [**00_reconos_master_ui_spec.md**](./docs/teardowns/00_reconos_master_ui_spec.md): **The Master UI & Interaction Specification for ReconOS** — synthesizes all teardowns into the 3-Pane desktop cockpit, Today dashboard, universal omni-search, grouped exception queues with the SA 320 materiality speed-bump, dated statutory rule defense, and hotkey matrix.
- [**01_xero_qbo_reconciliation.md**](./docs/teardowns/01_xero_qbo_reconciliation.md): Xero & QuickBooks Online Two-Column Reconciliation
- [**02_dext_hubdoc_document_review.md**](./docs/teardowns/02_dext_hubdoc_document_review.md): Dext & Hubdoc Source-Linked Document Review
- [**03_tally_suvit_taxone.md**](./docs/teardowns/03_tally_suvit_taxone.md): Tally Prime, Suvit & Vyapar TaxOne Indian Accounting Ergonomics
- [**04_superhuman_linear_triage.md**](./docs/teardowns/04_superhuman_linear_triage.md): Superhuman & Linear High-Velocity Keyboard Triage
- [**05_karbon_canopy_practice_management.md**](./docs/teardowns/05_karbon_canopy_practice_management.md): Karbon & Canopy Practice Management 3-Pane Layout
- [**06_vicai_docyt_autonomous_accounting.md**](./docs/teardowns/06_vicai_docyt_autonomous_accounting.md): Vic.ai & Docyt Autonomous Accounting & Exception Queues
- [**07_spotlight_alfred_raycast_omnisearch.md**](./docs/teardowns/07_spotlight_alfred_raycast_omnisearch.md): Spotlight, Alfred & Raycast "Find Invoice" Omni-Search

---

## 🎯 Core Innovations & USPs

1. **Confidentiality by Design (Not by Policy):**
   * Client financial data is encrypted on-device with `AES-GCM-256`.
   * The application has no outbound network path for client data (`0 KB outbound`).
2. **Exception-First Review Workflow:**
   * Replaces flat spreadsheets with an exception queue grouped by root cause:
     * *Timing Differences* (Dates within 30-day window) -> 1-Click Batch Approve.
     * *Invoice Number Typos* (Levenshtein distance matching e.g. `/` vs `-`).
     * *Tax Rate Discrepancies* (Books booked at 12% vs GSTR-2B filed at 18%).
     * *Statutory Risk Flags* (ITC at risk under Section 16(2)(aa)).
3. **Local Firm Memory (On-Device Learning):**
   * Learns per-firm classification habits locally without cloud telemetry. Overriding a vendor's ledger head updates the local memory and auto-adapts remaining unreviewed items.
4. **Tamper-Evident Audit Defense Trail:**
   * Every extraction, match, and rule check generates a plain-language explanation.
   * Every approval is cryptographically signed into an immutable **SHA-256 hash chain**.
5. **Tally Prime Ready:**
   * 1-Click export of valid `<TALLYMESSAGE>` XML for direct import into Tally Prime.

---

## 👥 The 3-Person Team Breakdown

| Member | Assigned Area | Key Responsibilities | Primary Languages |
| :--- | :--- | :--- | :--- |
| **Chirag** | **Frontend 3-Pane Cockpit & Model Fine-Tuning Lead** | • Builds the 3-Pane desktop UI in React/Tailwind inside Tauri<br>• Fine-tunes local VLM/LLM in Python (LoRA/QLoRA) & exports weights<br>• Connects React UI to Tauri IPC commands (`invoke()`) | **TypeScript (React) & Python (PyTorch)** |
| **Rajveer** | **Rust Systems, Security & Core Engine Lead** | • Rust storage layer (AES-GCM-256 workspace encryption & client isolation)<br>• Tamper-evident SHA-256 hash-chained audit log<br>• Multi-threaded reconciliation engine (`rayon`, `strsim`) & dated tax rulebook | **Rust (Tauri Core & Crates)** |
| **Vihaan** | **Data Ingestion, Parsers & Model Evaluation Lead** | • Multi-format parsers (Rust `calamine` for fast Excel, GSTR-2B JSON, bank CSV)<br>• Synthetic Indian invoice generation pipeline in Python (`Faker('en_IN')`, Jinja2)<br>• 200-document Gold Test Set & automated model evaluation harness | **Python & Rust** |

---

## 🦀 Rust Ergonomics: Making Rust Development Fast & Safe

Writing Rust is made approachable and productive through battle-tested crates and workflow tooling:
1. **`ts-rs` (Automated Type Sync):** Automatically exports Rust structs directly into TypeScript types (`npm run build:types`), ensuring zero frontend-backend type drift.
2. **`anyhow` & `thiserror`:** Eliminates tedious manual error boilerplate with ergonomic error propagation.
3. **`cargo-check` & `cargo-watch`:** Sub-second compile-checking without waiting for full LLVM codegen (`cargo watch -x check`).
4. **`clippy`:** Built-in compiler linter that catches 90% of beginner lifetime and borrow-checker traps before they become bugs.
5. **`calamine`:** Blazing fast, zero-alloc in-memory Excel parsing (40x faster than openpyxl).

---

## 📁 Repository Layout

```
ca-audit-cockpit/
├── src/                        # [CHIRAG] React + Tailwind UI (Tauri Webview)
│   ├── components/             # 3-Pane layout, Today View, Exception Queue, Loupe
│   └── types/                  # Master TypeScript contracts
├── src-tauri/                  # [RAJVEER & VIHAAN] Native Rust Engine
│   ├── src/
│   │   ├── engine/             # Matching math, Levenshtein, date window checks
│   │   ├── rules/              # Dated statutory tax rulebook (GST Sec 16(2)(aa), TDS)
│   │   ├── storage/            # AES-GCM-256 encrypted storage & SHA-256 audit chain
│   │   ├── parsers/            # Fast Calamine Excel & GSTR-2B JSON reader
│   │   └── main.rs             # Tauri command handlers (IPC bridge)
│   └── Cargo.toml              # Rust crate dependencies
├── ml/                         # [CHIRAG & VIHAAN] Machine Learning Pipeline
│   ├── training/               # Python fine-tuning scripts (QLoRA, Unsloth)
│   ├── synthetic/              # Python synthetic invoice generator (Faker en_IN)
│   └── eval/                   # Model benchmark harness (FER / CER scoring)
└── docs/                       # Architecture, UI Specs & Team Contracts
    └── teardowns/              # Master UI Specs & 7 Reverse-Engineering Teardowns
        ├── 00_reconos_master_ui_spec.md
        ├── 01_xero_qbo_reconciliation.md
        ├── 02_dext_hubdoc_document_review.md
        ├── 03_tally_suvit_taxone.md
        ├── 04_superhuman_linear_triage.md
        ├── 05_karbon_canopy_practice_management.md
        ├── 06_vicai_docyt_autonomous_accounting.md
        └── 07_spotlight_alfred_raycast_omnisearch.md
```

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/chiraggoenka17512-coder/ca-audit-cockpit.git
cd ca-audit-cockpit

# Install frontend dependencies
npm install

# Run Vite in dev mode (for UI development without Rust compiler)
npm run dev

# Run Tauri in desktop dev mode (when Rust is installed)
npm run tauri dev
```
