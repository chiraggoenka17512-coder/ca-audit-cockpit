# Team Task Breakdown & Architecture Contract

> **Project:** CA Audit & Reconciliation Cockpit  
> **Team:** Chirag, Vihaan, Rajveer  
> **Rule:** All work must align strictly with the interfaces in `src/types/index.ts`. No team member may change field names without mutual agreement.

---

## 1. Chirag — Frontend Cockpit & Model Fine-Tuning Lead

### A. Frontend Cockpit Build
- [ ] **Air-Gap Sentinel Header:**
  - Create the sticky top bar with a live telemetry pill: `[STATUS: AIR-GAPPED // 0 KB OUTBOUND // AES-GCM-256]`.
  - Add client workspace switcher dropdown (e.g., *"Apex Logistics Pvt Ltd"*, *"Kolkata Precision Tools"*).
- [ ] **Metric Telemetry Strip:**
  - 4 high-contrast cards: Total Invoices processed, Auto-Reconciled %, Actionable Exceptions count, and ITC at Risk amount (₹).
- [ ] **The Exception-First Queue Cockpit:**
  - Build accordion cards grouped by root cause:
    1. *Timing Differences (30-day window)* -> Batch Approve action.
    2. *Invoice Number Typos* -> Side-by-side string diff view with 1-click resolve.
    3. *Tax Rate Mismatch* (Books 12% vs 2B 18%) -> Variance flag.
    4. *Unmapped Vendor / Ledger Head* -> Dropdown to assign ledger & TDS section.
- [ ] **Dual-Pane Inspection Loupe:**
  - Left pane: Extracted voucher details, tax breakdown, plain-language audit reason, and statutory rule citation.
  - Right pane: Visual crop / preview of the source PDF invoice with bounding box highlight.
- [ ] **Audit Defense & Tally Export Modal:**
  - Verification certificate displaying the SHA-256 immutable block hash.
  - Download button for `tally_import.xml` and formatted Excel audit report.

### B. Model Fine-Tuning & Local Inference
- [ ] **Dataset Preparation:** Curate ~3,000 synthetic Indian GST invoice training examples (utilizing Vihaan's synthetic generation pipeline).
- [ ] **Fine-Tuning Execution:** Run QLoRA fine-tuning on a small Vision-Language Model (`Qwen2.5-VL-3B/7B` or `Florence-2`) to extract:
  - `vendorGSTIN`, `invoiceNumber`, `invoiceDate`, `hsnCode`, `taxableValue`, `cgst`, `sgst`, `igst`, `totalAmount`.
- [ ] **Local Inference Wrapper:** Package the model weights to run locally via WebAssembly / ONNX or a lightweight local Python/Node runner with zero cloud dependencies.

---

## 2. Vihaan — Data Ingestion, Synthetic Generation & Model Eval

### A. Ingestion Parsers (`src/data/parsers/`)
- [ ] **Excel / CSV Purchase Register Parser:**
  - Implement using `xlsx` (`sheetjs`) to parse client purchase books.
  - Normalize Indian currency strings (Lakhs/Crores), commas, and date formats (`DD/MM/YYYY`, `DD-MM-YYYY`) into standard ISO `YYYY-MM-DD`.
- [ ] **GSTR-2B JSON Parser:**
  - Ingest official Indian GST portal JSON format (`b2b`, `b2ba`, `cdnr`).
  - Extract supplier GSTIN, invoice details, tax split, and ITC eligibility flag (`itcAvailable: 'Y' | 'N'`).
- [ ] **Indian Format Utilities (`src/data/formatters.ts`):**
  - `formatINR(amount)`: Formats numbers into ₹ Lakhs & Crores (e.g. `₹ 12,34,567.00`).
  - `validateGSTIN(gstin)`: 15-character Indian GST regex validator.
  - `validatePAN(pan)`: 10-character Indian PAN regex validator.

### B. Synthetic Data Engine (`scripts/generate_synthetic_invoices.py`)
- [ ] Using Python's `Faker('en_IN')` + HTML/Jinja2 templates + `WeasyPrint` / `ReportLab`:
  - Generate 1,500 diverse synthetic Indian invoices (Tally Prime, Busy, Marg ERP, Zoho Books layouts).
  - Ensure authentic constraints: valid state codes (e.g., `27` Maharashtra, `19` West Bengal), valid HSN codes, and CGST+SGST vs IGST logic.
  - Output paired PDF files and structured JSON ground truth for Chirag's fine-tuning set.

### C. Evaluation Benchmark Harness
- [ ] Build a 200-document **Gold Test Set** with verified ground truth.
- [ ] Write an automated evaluation script to benchmark Chirag's fine-tuned model:
  - Measure **Field Error Rate (FER)** across GSTIN, invoice number, and amounts.
  - Generate a benchmark report (Target: > 96% field accuracy).

---

## 3. Rajveer — Deterministic Engine, Rules & Compliance Logic

### A. Deterministic Reconciliation Engine (`src/engine/reconciliation.ts`)
- [ ] **Exact Matching Pass:**
  - Reconcile where `GSTIN + normalized Invoice # + Total Amount` match within +- ₹1.00 tolerance.
- [ ] **Fuzzy Invoice Number Match:**
  - Normalize invoice strings (stripping slashes, hyphens, leading zeros) and apply **Levenshtein Distance**.
  - Return similarity confidence score (e.g. 0.94) and flag as `INVOICE_TYPO`.
- [ ] **Timing Difference Evaluator:**
  - Check invoice date vs 2B filing date. If within 30-day window, flag as `TIMING_DIFF` with plain-language explanation.
- [ ] **Tax Rate Discrepancy Checker:**
  - Flag invoices where books show 12% but supplier uploaded 18% in GSTR-2B.
- [ ] **Unreported / ITC Risk Flag:**
  - Flag invoices in books missing from GSTR-2B under **Section 16(2)(aa) of CGST Act**.

### B. Local Firm Memory Engine (`src/engine/firmMemory.ts`)
- [ ] Implement on-device preference store in `localStorage` / `IndexedDB`:
  - Stores: `{ vendorNormalized, assignedLedger, tdsSection, overrideCount, lastUpdated }`.
- [ ] When Chirag's UI triggers a CA override on a vendor:
  - Record preference locally.
  - Scan remaining unreviewed items in the active queue and auto-update their suggestions with badge `[Adapted to Firm Preference]`.

### C. Tamper-Evident Hash Chain & Tally Export
- [ ] **SHA-256 Audit Chain (`src/engine/auditChain.ts`):**
  - Implement browser-native WebCrypto `crypto.subtle` hash chaining.
  - Block structure: `{ index, timestamp, action, actor, recordIds, previousHash, blockHash }`.
- [ ] **Tally Prime XML Builder (`src/engine/tallyExport.ts`):**
  - Format approved invoices into valid Tally XML `<ENVELOPE><BODY><DATA><TALLYMESSAGE>...`.
  - Include Party Ledger, Purchase Ledger, Input CGST/SGST/IGST splits, and voucher narration.

---

## 4. Git Branch Strategy (Zero Merge Conflicts)

```
main (Protected)
 ├── feat/chirag-ui-and-model    (Chirag works here)
 ├── feat/vihaan-data-pipeline   (Vihaan works here)
 └── feat/rajveer-engine-rules   (Rajveer works here)
```

1. Each teammate checks out their designated feature branch.
2. Only edit files inside your owned directory.
3. Keep `src/types/index.ts` synchronized and frozen.
4. When ready, submit a Pull Request to `main`.
