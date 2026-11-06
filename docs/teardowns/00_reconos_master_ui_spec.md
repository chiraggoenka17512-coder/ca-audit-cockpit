# ReconOS: Master UI & Interaction Specification
## Air-Gapped Financial Intelligence & Audit Defense Cockpit for Indian Chartered Accountants

---

## 1. Executive Summary & Design Thesis

**ReconOS** is a zero-cloud, 100% air-gapped desktop financial intelligence application engineered specifically for Indian Chartered Accountants (CAs), tax auditors, and article assistants. 

Traditional enterprise accounting software (SAP, Oracle, NetSuite) was built for data entry clerks; cloud-based reconciliation SaaS (Xero, QuickBooks Online, Vic.ai, Docyt) requires streaming sensitive financial records to third-party multi-tenant servers, violating the **ICAI Code of Ethics**, the **Digital Personal Data Protection (DPDP) Act, 2023**, and client Non-Disclosure Agreements. Conversely, local legacy tools (Tally Prime, Busy) offer dense keyboard navigation but lack automated 3-way reconciliation, machine learning extraction, and statutory rule validation.

ReconOS bridges this divide by combining:
1. **The speed and density of Tally Prime** (keyboard-first navigation, single-keystroke approvals, 0-latency native rendering).
2. **The modern ergonomics of Linear and Superhuman** (focused triage queues, optimistic local updates, zero-clutter lists).
3. **The inspection rigor of Dext and Hubdoc** (dual-pane source-linked document review with synchronized bounding-box highlight).
4. **The intelligent omni-search of Raycast and Alfred** (always-accessible global search parsing loose natural language queries).
5. **Absolute air-gapped security and statutory defensibility** (on-device local storage encrypted with AES-GCM-256, cryptographic SHA-256 hash-chained audit trails, and deterministic Indian tax law citations: CGST Sec 16(2)(aa), Rule 36(4), TDS Sec 194C/J/Q, and Sec 43B(h)).

---

## 2. Competitive Synthesis: What ReconOS Borrows vs. What ReconOS Does Differently

Across the 7 reverse-engineering teardowns conducted on industry benchmarks, ReconOS adopts best-of-breed interaction patterns while deliberately discarding patterns that fail the audit defense requirement:

```
+-------------------------------------------------------------------------------------------------------------------------+
|                                    RECONOS INTERACTION SYNTHESIS MATRIX                                                 |
+-------------------------------------------------------------------------------------------------------------------------+
| Source Product         | What ReconOS Borrows (Adopted)             | What ReconOS Discards & Replaces (Innovation)             |
+------------------------+--------------------------------------------+-----------------------------------------------------------+
| Xero & QBO             | • Two-column bank/ledger match layout      | • Replaces manual row-by-row clicking with grouped        |
|                        | • Green row collapse upon reconciliation   |   root-cause batch clearing.                              |
|                        | • Visual difference flags (±₹)             | • Adds multi-rule statutory validation (Books vs 2B).     |
+------------------------+--------------------------------------------+-----------------------------------------------------------+
| Dext & Hubdoc          | • Split-screen (Source Document on Left,   | • Discards cloud OCR latency (runs on-device).            |
|                        |   Extracted Form Fields on Right)          | • Amber confidence warning pills on fields < 85%.         |
|                        | • Synchronized coordinate bounding boxes   | • Single-action inline edit & approve keystroke.          |
+------------------------+--------------------------------------------+-----------------------------------------------------------+
| Tally Prime & Suvit    | • Alt/Ctrl function key shortcuts          | • Replaces flat unstructured voucher screens with grouped |
|                        | • Dense, high-contrast information layout  |   exception hierarchies.                                  |
|                        | • Native `<TALLYMESSAGE>` XML voucher sync | • Eliminates third-party cloud intermediaries (Suvit).   |
+------------------------+--------------------------------------------+-----------------------------------------------------------+
| Superhuman & Linear    | • Keyboard triage (`J`/`K`, `A` Approve)   | • Introduces "SA 320 Materiality Speed-Bump": prevents   |
|                        | • Zero-inbox progress counters             |   blind rapid key-tapping on high-risk vouchers > ₹50,000.|
|                        | • Micro-second visual transitions          | • Permanent contextual rule audit defense panel.          |
+------------------------+--------------------------------------------+-----------------------------------------------------------+
| Karbon & Canopy        | • Client-first 3-pane navigation hierarchy | • Replaces generic project tasks with CA statutory filing |
|                        | • Client switcher in persistent title bar  |   deadlines (GSTR-1, GSTR-3B, TDS, Tax Audit 3CD).       |
|                        | • Client context never lost across screens | • Embeds PAN-hash color badge to prevent client mismatch. |
+------------------------+--------------------------------------------+-----------------------------------------------------------+
| Vic.ai & Docyt         | • Root-cause exception grouping            | • Replaces black-box probability floats (e.g. 94%) with   |
|                        | • Top-3 ranked candidate GL suggestions    |   dated statutory legal citations (Act & Rule number).    |
|                        | • Cascading batch classification overrides | • Replaces cloud retraining with encrypted local memory.  |
+------------------------+--------------------------------------------+-----------------------------------------------------------+
| Spotlight & Raycast    | • Universal `Ctrl+K` omni-search overlay   | • Adds financial query parsing: amount ranges (about 40k),|
|                        | • Instant fuzzy match across all entities  |   vendor aliases, invoice regex, and status tokens.       |
|                        | • Rich preview metadata cards              | • Air-gapped offline index (SQLite FTS5 + Trigram).       |
+------------------------+--------------------------------------------+-----------------------------------------------------------+
```

---

## 3. Structural Master Architecture: The 3-Pane Desktop Layout

To mirror how a CA operates during peak filing and audit cycles, the workspace is organized strictly around **Clients, Work Queues, and Review**, rather than abstract software modules.

```
+===================================================================================================================================+
| ReconOS v1.0.4  [Client: 27AABCA1234F1Z5 | ACME MANUFACTURING PVT LTD] [FY: 2026-27 | Q2]   [🛡️ 0 KB OUTBOUND AIR-GAP] [_][口][X]|
+===================================================================================================================================+
| LEFT SIDEBAR (240px)          | CENTRE WORKLIST PANE (Flex 1, min 580px)            | RIGHT DETAIL / LOUPE PANE (480px fixed)     |
|-------------------------------+-----------------------------------------------------+---------------------------------------------|
| [🔍 Quick Client Search...]   | SECTION: EXCEPTION QUEUE > TIMING DIFFERENCES (14)  | ITEM DETAIL: REC-2026-0941                  |
| 🏢 ACME Manufacturing [Active]| Batch: Oct 2026 GSTR-2B vs Books Purchase Register  | Vendor: Reliance Jio Infocomm Ltd           |
| 🏢 Bharat Heavy Steels        |-----------------------------------------------------| GSTIN:  27AAACR7148F1Z1                     |
| 🏢 Deccan Logistics Ltd       | [All (64)] [Timing (14)] [Typo (8)] [Rate (3)]      | Match Status: ⏱️ Timing Difference (+18 Days) |
| 🏢 Trident Pharma Labs        |-----------------------------------------------------|---------------------------------------------|
|-------------------------------| [ ] VENDOR NAME     | INV #     | AMOUNT    | DIFF  | SOURCE DOCUMENT (PDF / OCR)                 |
| WORK QUEUES                   |---------------------+-----------+-----------+-------| +-----------------------------------------+ |
| 📥 Today (3 Deadlines)        | [>] Reliance Jio    | JIO/99120 | ₹42,500   |   ₹0  | | [TAX INVOICE]          Date: 28-Sep-2026| |
| ⚖️ 3-Way Reconciliation       | [ ] Tata Motors Ltd | TM-40192  | ₹1,84,200 |   ₹0  | | Reliance Jio Infocomm Ltd               | |
| ⚠️ Exception Queue (25)       | [ ] Kirloskar Bros  | KB/8812   | ₹29,140   |   ₹0  | | Billed to: ACME Manufacturing Pvt Ltd   | |
| 📄 Document Review (8)        | [ ] Godrej Boyce    | GB-10029  | ₹12,800   |   ₹0  | | Bounding Box [x:120, y:340, w:180, h:30] | |
| 🔍 Find Invoice (Ctrl+K)      | [ ] Larsen & Toubro | LT-99014  | ₹5,12,000 |   ₹0  | | >>> Taxable: ₹36,016.95                 | |
|-------------------------------|-----------------------------------------------------| | >>> CGST 9%: ₹3,241.52                  | |
| STATUTORY AUDIT & SYSTEM      | SELECTED ITEM SUMMARY:                              | | >>> SGST 9%: ₹3,241.53                  | |
| 📜 Rulebook Citations         | --------------------------------------------------- | | >>> Total:   ₹42,500.00                 | |
| 🔗 Audit Trail (Block #1,204) | In Books:      Date: 16-Oct-2026 | Amount: ₹42,500  | +-----------------------------------------+ |
| 🧠 Firm Memory (42 Overrides) | In GSTR-2B:    Date: 28-Sep-2026 | Amount: ₹42,500  | STATUTORY AUDIT CITATION:                   |
| ⚙️ Client Workspace Settings  | Timing Gap:    +18 Days (Within 30-day safe harbor) | Section 16(2)(aa) CGST Act, 2017:           |
|                               | Rationale:     Supplier uploaded in Sep GSTR-1,     | "ITC claimed in Oct books was reported in   |
|                               |                accounted in Oct purchase register.  | Sep GSTR-2B. Eligible under Rule 36(4)."    |
|                               | Recommended:   Auto-Match with Timing Flag.         | Action: [A] Approve  [M] Manual Edit  [R] Rej|
+-----------------------------------------------------------------------------------------------------------------------------------+
| FOOTER / STATUS BAR: [Client: ACME] | [Vouchers: 1,482 Reconciled, 25 Exceptions] | [Tauri IPC: Native] | [DB: Encrypted AES-GCM] |
+===================================================================================================================================+
```

---

## 4. Detailed Screen Specifications

### Screen 1: "Today" Home Dashboard
Unlike generic SaaS dashboards cluttered with vanity pie charts and marketing banners, the ReconOS **Today** view opens exclusively on 3 high-leverage operational widgets:

```
+====================================================================================================+
| TODAY DASHBOARD                                                                [Friday, 06-Nov-2026]
+====================================================================================================+
| [WIDGET 1: CLIENT QUERIES WAITING (5)]                                                             |
| • ACME Mfg: "Need transport bills > ₹50k for Q2 statutory tax audit"        | Due: Today 18:00 (🔴) |
| • Bharat Heavy: "Confirm if Tata Motors invoice #40192 is in Oct GSTR-2B"   | Due: Tomorrow 12:00   |
| • Deccan Logistics: "Resolve ₹18,400 rate variance on fuel purchases"       | Due: 09-Nov-2026      |
|----------------------------------------------------------------------------------------------------|
| [WIDGET 2: STATUTORY FILING DEADLINES THIS WEEK]                                                   |
| • 11-Nov-2026: GSTR-1 Monthly Filing (ACME Mfg, Deccan Logistics, Trident Pharma)         [5 Days] |
| • 13-Nov-2026: GSTR-1 Quarterly / IFF (Bharat Heavy Steels)                               [7 Days] |
| • 20-Nov-2026: GSTR-3B Tax Payment & Return Filing                                        [14 Days]|
|----------------------------------------------------------------------------------------------------|
| [WIDGET 3: CLIENT RECONCILIATION & QUEUE PROGRESS]                                                |
| Client Name             | Total Rows | Auto-Matched (%) | Unresolved Exceptions | Materiality Risk |
| ------------------------+------------+------------------+-----------------------+------------------|
| ACME Manufacturing      |      1,507 | 1,482 (98.3%)    | 25 items              | ₹1,14,000 (Amber)|
| Bharat Heavy Steels     |      3,840 | 3,810 (99.2%)    | 30 items              | ₹4,20,000 (Red)  |
| Deccan Logistics Ltd    |        840 |   838 (99.7%)    |  2 items              | ₹12,000  (Green) |
| Trident Pharma Labs     |      2,100 | 2,040 (97.1%)    | 60 items              | ₹85,000  (Amber) |
+====================================================================================================+
```

### Screen 2: "Find Invoice" Universal Omni-Search
Triggered via `Ctrl+K` or `/` from any screen. Accepts loose natural language, financial amount thresholds, date ranges, and vendor names without requiring dropdown menu clicks:

```
+====================================================================================================+
| FIND INVOICE (Ctrl+K)                                                                          [X] |
+====================================================================================================+
| > transport bill March about 40k                                                                   |
| [Filter: ACME Mfg (Default)] [Date: 01-Mar-2026 to 31-Mar-2026] [Amount: ₹35,000 - ₹45,000]       |
+----------------------------------------------------------------------------------------------------+
| 3 MATCHES FOUND (Ranked by confidence):                                                            |
|                                                                                                    |
| 1. [96% Match] Reliance Logistics Ltd | INV #RLL/2026/0389 | Date: 18-Mar-2026                     |
|    Amount: ₹41,200.00 (Taxable: ₹34,915.25 | GST 18%: ₹6,284.75)                                   |
|    Matched snippet: "...goods transport agency services for March warehouse distribution..."       |
|    Statutory Status: ✅ Present in GSTR-2B | RCM Applicable (Sec 9(3) CGST Act)                     |
|    Actions: [Enter] Open in Loupe  [C] Copy Voucher No  [T] View Tally Ledger                      |
|                                                                                                    |
| 2. [84% Match] SpeedEx Cargo Carriers | INV #SEC-9921 | Date: 24-Mar-2026                          |
|    Amount: ₹39,500.00 (Taxable: ₹37,619.05 | GST 5%: ₹1,880.95)                                    |
|    Matched snippet: "...inter-state heavy vehicle freight March shipment..."                       |
|    Statutory Status: ⚠️ In Books, Missing in GSTR-2B (ITC Ineligible under Sec 16(2)(aa))           |
|                                                                                                    |
| 3. [CLOSE CANDIDATE - LOW CONFIDENCE (54%)] BlueDart Express | INV #BD-4401 | Date: 02-Feb-2026    |
|    Amount: ₹43,000.00 (February invoice paid in March)                                             |
|    Matched snippet: "...courier logistics charges..."                                              |
+====================================================================================================+
```

### Screen 3: Two-Column Reconciliation Workspace
Directly mirrors the mental model of manual CA working papers. When an item is reconciled, it collapses into a slim single green line. Unmatched items remain side-by-side:

```
+====================================================================================================+
| TWO-COLUMN RECONCILIATION WORKSPACE: BOOKS (PURCHASE REGISTER) vs GSTR-2B (PORTAL)                 |
+====================================================================================================+
| BOOKS OF ACCOUNTS (Tally Register)                   | GSTR-2B GOVERNMENT PORTAL (JSON Ingestion)   |
| Date        | Inv #     | Vendor         | Amount    | Date        | Inv #     | Supplier       | Amount|
|-------------+-----------+----------------+-----------+-------------+-----------+----------------+-------|
| [COLLAPSED] JIO/8821    | Reliance Jio   | ₹14,160   | [MATCHED]   | JIO/8821  | Reliance Jio   |₹14,160|
| [COLLAPSED] INF/9012    | Infosys BPM    | ₹2,40,000 | [MATCHED]   | INF/9012  | Infosys BPM    |₹2,40,0|
| [COLLAPSED] TM/3310     | Tata Motors    | ₹88,500   | [MATCHED]   | TM/3310   | Tata Motors    |₹88,500|
|-------------+-----------+----------------+-----------+-------------+-----------+----------------+-------|
| UNMATCHED & EXCEPTIONS:                                                                            |
| 14-Oct-2026 | KB/1029   | Kirloskar Tools| ₹28,400   |             |           | [MISSING IN 2B]        |
| 18-Oct-2026 | ZG/771    | Zenith Graphics| ₹18,000   | 18-Oct-2026 | ZG-771    | Zenith Graphics|₹18,000|
|             |           | [UNRECORDED]   |           | 22-Oct-2026 | DL/9941   | Dell India Ltd |₹64,900|
| 25-Oct-2026 | BA/0019   | Bajaj Auto Ltd | ₹54,000   | 25-Oct-2026 | BA/0019   | Bajaj Auto Ltd |₹54,320|
+====================================================================================================+
```

### Screen 4: Grouped Exception Queue & Rapid Keyboard Triage
Exceptions are partitioned into 4 distinct statutory root-cause buckets:
1. **Timing Differences:** Invoice dated in earlier/later month but present within safe harbor window (Rule 36(4)).
2. **Invoice Number Typos:** Sanitized alphanumeric strings match, but formatting differs (`/` vs `-` vs `.` vs spaces).
3. **Tax Rate / Amount Discrepancies:** Rounding variances (< ₹5.00) vs genuine tax bracket mismatches (12% vs 18%).
4. **Missing in GSTR-2B:** Potential ITC loss under Section 16(2)(aa).

```
+====================================================================================================+
| EXCEPTION QUEUE (25 ITEMS REQUIRING CA RESOLUTION)                                                 |
+====================================================================================================+
| GROUP 1: TIMING DIFFERENCES (14 items | ₹6,42,000 total)                       [Review Group (Alt+1)]|
| Group summary: Invoices booked in October but uploaded by supplier in August/September GSTR-1.     |
| Action: Single-keystroke approval [A] marks all 14 as timing differences with Rule 36(4) tags.    |
|----------------------------------------------------------------------------------------------------|
| GROUP 2: INVOICE NUMBER FORMATTING / TYPOS (8 items | ₹3,18,400 total)         [Review Group (Alt+2)]|
| Group summary: Exact match on GSTIN, Date, and Amount; Levenshtein distance ≤ 2 on Invoice Number. |
| Example: Book has 'INV/2026/0491' while GSTR-2B has 'INV-2026-0491'. Clean 1-to-1 equivalence.    |
|----------------------------------------------------------------------------------------------------|
| GROUP 3: RATE & ROUNDING MISMATCHES (2 items | ₹1,440 variance)                [Review Group (Alt+3)]|
| Group summary: 1 item has ₹0.80 rounding diff; 1 item booked at 12% GST but supplier filed at 18%.|
|----------------------------------------------------------------------------------------------------|
| GROUP 4: SUPPLIER DEFAULTS / MISSING IN 2B (1 item | ₹84,000 ITC Risk)         [Review Group (Alt+4)]|
| ⚠️ SA 320 MATERIALITY ALERT: Exceeds firm audit threshold (₹50,000). Rapid tap disabled.           |
| Requires explicit 'Enter' to view vendor communication history or mark 'Disputed / Hold Payment'.  |
+====================================================================================================+
```

### Screen 5: Dual-Pane Document Review & Inspection Loupe
Provides instant, pixel-perfect verification linking OCR/VLM extractions directly to the original document:
- **Left Pane (50%):** Canvas showing the original scanned PDF/TIFF/JPEG with an interactive coordinate overlay.
- **Right Pane (50%):** Form fields extracted by the model. 
- **Interaction:** Focusing any field on the right (e.g. `Invoice Date`) instantly scrolls and pulses a highlighted SVG box over that coordinate on the left canvas. If extraction confidence is `< 85%`, the field is bordered in amber with an alert badge.

### Screen 6: Dated Statutory Rulebook Panel
Builds unshakeable audit trust by citing the exact legislative text in force on the transaction date:
```
+====================================================================================================+
| STATUTORY AUDIT CITATION & RULE DEFENSE                                                            |
+====================================================================================================+
| Statutory Rule:   Section 16(2)(aa) of the Central Goods and Services Tax (CGST) Act, 2017        |
| Inserted By:      Finance Act, 2021 (Effective from 01-Jan-2022 vide Notification 39/2021-CT)      |
| Text in Force:    "No registered person shall be entitled to the credit of any input tax in respect|
|                   of any supply of goods or services... unless the details of the invoice or debit |
|                   note has been furnished by the supplier in the statement of outward supplies     |
|                   (GSTR-1) and communicated to the recipient in the prescribed manner (GSTR-2B)."  |
| Impact on Item:   Invoice #KB/1029 from Kirloskar Tools is NOT found in GSTR-2B.                   |
| CA Action:        ITC must be parked in 'Ineligible / Deferred ITC Ledger' to prevent tax notice.  |
+====================================================================================================+
```

### Screen 7: Immutable Cryptographic SHA-256 Audit Trail
Every action taken by a CA, partner, or article assistant is recorded into an append-only, tamper-evident hash chain:
```
+====================================================================================================+
| AUDIT DEFENSE LOG & CRYPTOGRAPHIC CHAIN                                    [Verify Chain Integrity]|
+====================================================================================================+
| Block #1,204 | 06-Nov-2026 19:42:10 IST                                                            |
| Action:      Exception Approved: Timing Difference                                                 |
| Target:      Voucher REC-2026-0941 (Reliance Jio Infocomm Ltd - ₹42,500.00)                        |
| Operator:    Chirag Goenka (Audit Partner)                                                         |
| Statutory:   CGST Sec 16(2)(aa) & Rule 36(4) [Safe Harbor Validated]                              |
| Block Hash:  9f83ab28e4693a901e672901309fef201c137452d9a2491a62947192a83e0129                     |
| Prev Hash:   3b129cd848194017fa8302194819a82049182309184091a0912401824091a841                     |
| Chain Status: [✅ VALID & UNBROKEN - 1,204 BLOCKS VERIFIED IN 1.2ms]                                |
+====================================================================================================+
```

---

## 5. Keyboard Navigation Engine & Hotkey Matrix

Following the ergonomic principles of Tally Prime and Superhuman, power users can complete entire audits without touching a mouse:

| Keystroke | Scope | Function |
| :--- | :--- | :--- |
| `Ctrl+K` or `/` | Global | Open "Find Invoice" Universal Omni-Search |
| `Alt+C` | Global | Focus Client Switcher in title bar |
| `Alt+1` | Global | Navigate to Today Dashboard |
| `Alt+2` | Global | Navigate to 3-Way Reconciliation Workspace |
| `Alt+3` | Global | Navigate to Exception Queue |
| `Alt+4` | Global | Navigate to Document Review & Loupe |
| `J` or `↓` | List / Table | Move selection down to next invoice |
| `K` or `↑` | List / Table | Move selection up to previous invoice |
| `Space` | Table | Toggle row checkbox selection |
| `A` | Exception Queue | **Approve Match** (Auto-advances to next item; blocked if > SA 320 threshold) |
| `R` | Exception Queue | **Reject / Disputed** (Routes to vendor follow-up list) |
| `T` | Exception Queue | **Mark Timing Difference** (Applies Rule 36(4) tag) |
| `Shift+A` | Exception Queue | **Override SA 320 Speed-Bump** (Explicit sign-off on material items) |
| `Tab` / `Shift+Tab` | Document Review | Jump between editable fields (auto-focuses bounding box on PDF) |
| `Ctrl+Enter` | Document Review | **Save Edit & Approve Voucher** |
| `Ctrl+E` | Workspace | **Export Reconciled Vouchers to Native Tally XML** |
| `Esc` | Modal / Loupe | Close current overlay / return to list focus |

---

## 6. Rust Developer Guide: Making Rust Development Fast, Safe & Ergonomic

Writing safe, high-performance systems in Rust does not have to be difficult when equipped with modern tooling, compiler harnesses, and automated type bridges:

### 6.1 Tooling Setup for Chirag, Rajveer & Vihaan
1. **Automated TypeScript-Rust Type Generation (`ts-rs`):**
   - Eliminates 100% of frontend-backend contract drift.
   - Every Rust struct in `src-tauri/src/types.rs` derives `TS`:
     ```rust
     #[derive(Serialize, Deserialize, TS)]
     #[ts(export, export_to = "../src/types/generated/")]
     pub struct ReconciledItem { ... }
     ```
   - Running `cargo test export_bindings` automatically writes pristine TypeScript definitions to `src/types/generated/`.
2. **Zero-Boilerplate Error Handling (`anyhow` & `thiserror`):**
   - Internal engine and parsers use typed errors with `thiserror`.
   - IPC boundary commands return `Result<T, String>` using `anyhow::Result` formatted cleanly.
3. **Instant Compilation Checking (`cargo check` & `cargo watch`):**
   - Don't wait for LLVM codegen during development:
     ```bash
     cargo check
     cargo watch -x check
     ```
   - Validates types, borrow checker, and lifespans in < 1.5 seconds.
4. **Pedantic Linter Safeguards (`cargo clippy`):**
   - Configured with `#![warn(clippy::all, clippy::pedantic)]` to proactively catch unidiomatic clones, lifetime issues, and performance bottlenecks before committing.
5. **Fast In-Memory Excel Parsing (`calamine`):**
   - Up to 40x faster than Python `openpyxl` or JavaScript `xlsx`, reading 100,000-row Tally purchase registers in ~120ms with zero memory bloat.

---

## 7. Next Engineering Steps
- **Chirag:** Build the React 3-Pane container components using Tailwind CSS and wire `useHotkeys` for the keyboard state machine. Fine-tune local Indian GST extraction models with QLoRA.
- **Rajveer:** Implement the Rust storage engine (`AES-GCM-256` workspace isolation), the SHA-256 hash-chaining audit logger, and the dated statutory rulebook in `src-tauri`.
- **Vihaan:** Build the Python synthetic invoice generator (`Faker('en_IN')`) and the `calamine` Excel / GSTR-2B JSON ingestion pipeline.
