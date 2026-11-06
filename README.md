# CA Audit & Reconciliation Cockpit ⚖️

> **Air-Gapped Autonomous Financial Intelligence & Audit Defense for Indian CAs**

An on-device, privacy-first reconciliation and audit review system designed specifically for Indian Chartered Accountants, tax practitioners, and audit associates. 

Instead of sending confidential client bank statements, PANs, and vendor ledgers to third-party cloud servers, this tool operates **100% locally with zero network outbound traffic**, offering deterministic compliance checks, an exception-first review workflow, on-device firm learning, and audit-defensible justifications.

---

## 🎯 Core Innovations & USPs

1. **Confidentiality by Design (Not by Policy):**
   * Client financial data is encrypted locally with `AES-GCM-256`.
   * The AI and rule engines run entirely on-device. Zero network traffic (`0 KB outbound`).
2. **Exception-First Review Workflow:**
   * Instead of dumping 500 flat rows, the UI groups unmatched transactions by root cause:
     * *Timing Differences* (Dates within 30-day window) -> 1-Click Batch Approve.
     * *Invoice Number Typos* (Levenshtein distance matching e.g. `/` vs `-`).
     * *Tax Rate Discrepancies* (Books booked at 12% vs GSTR-2B filed at 18%).
     * *Statutory Risk Flags* (ITC at risk under Section 16(2)(aa)).
3. **Local Firm Memory (On-Device Learning):**
   * Learns per-firm classification habits locally. When a CA overrides a vendor's ledger head or TDS section, the system records it in an isolated local store and auto-adapts to remaining unreviewed items without cloud telemetry.
4. **Audit Defense Trail:**
   * Every extraction, match, and rule check generates a plain-language explanation (e.g., *"Matched: GSTIN and amount agree; date differs by 3 days within allowed window"*).
   * Every approval is cryptographically signed in a tamper-evident **SHA-256 hash chain**.
5. **Tally Prime Ready:**
   * 1-Click export of valid `<TALLYMESSAGE>` XML for direct import into Tally Prime.

---

## 👥 The 3-Person Team Breakdown

This repository is divided into 3 independent modules to allow parallel development with zero merge conflicts. For full task specs, see [TEAM_TASKS.md](./TEAM_TASKS.md).

| Member | Assigned Area | Key Responsibilities |
| :--- | :--- | :--- |
| **Chirag** | **Frontend Cockpit & Model Fine-Tuning Lead** | • Builds the entire UI (Cockpit, Exception Queue, Inspection Loupe, Air-Gap Sentinel)<br>• Fine-tunes the local VLM/LLM for Indian document extraction (LoRA/QLoRA)<br>• Integrates the engine & data pipelines into the final app |
| **Vihaan** | **Data Ingestion, Synthetic Generation & Model Eval** | • Builds multi-format parsers (Excel Purchase Register, GSTR-2B JSON, Bank CSV)<br>• Generates synthetic training datasets using Python Faker (`en_IN`) & HTML templates<br>• Establishes the 200-document Gold Test Set & evaluation harness |
| **Rajveer** | **Deterministic Engine & Statutory Compliance** | • Builds the mathematical reconciliation engine (Exact match + Levenshtein fuzzy match)<br>• Implements the dated statutory rulebook (GST Sec 16(2)(aa), TDS 194C/J/Q)<br>• Implements on-device Local Firm Memory, SHA-256 hash chaining, and Tally XML export |

---

## 📐 Master Type Contract

All modules interact through the strictly typed contract defined in [`src/types/index.ts`](./src/types/index.ts).

```typescript
// Core Data Interfaces
BookInvoice      // Normalized client purchase register entry
GSTR2BRecord     // Normalized GST Portal return entry
ReconciledItem   // Result pair with MatchStatus, AuditRationale, and RuleCitation
FirmPreference   // Local on-device learned classification preference
AuditBlock       // SHA-256 cryptographic audit block
```

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/chiraggoenka17512-coder/ca-audit-cockpit.git
cd ca-audit-cockpit

# Install dependencies
npm install

# Start development server
npm run dev
```
