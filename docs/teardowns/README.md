# ReconOS UX Reverse-Engineering Teardown Index

This directory contains the in-depth competitive teardowns, interaction analyses, and ergonomic specifications for **ReconOS**, benchmarked against market-leading financial, audit, triage, and search applications.

---

## Master Architecture & Specification
- [**00_reconos_master_ui_spec.md**](./00_reconos_master_ui_spec.md): **The Master UI & Interaction Specification for ReconOS** — synthesizes all teardowns into the 3-Pane desktop cockpit, "Today" dashboard, universal omni-search, 2-column reconciliation workspace, grouped exception queues with SA 320 materiality speed-bump, dated statutory rule citations, cryptographic SHA-256 audit logs, keyboard hotkey matrix, and Rust developer guide.

---

## Detailed Benchmark Teardowns
1. [**01_xero_qbo_reconciliation.md**](./01_xero_qbo_reconciliation.md):
   - **Products:** Xero, QuickBooks Online
   - **Domain:** Two-column bank reconciliation, match vs. add mechanics, green collapsing matched rows, split-match heuristics, and difference flags.
2. [**02_dext_hubdoc_document_review.md**](./02_dext_hubdoc_document_review.md):
   - **Products:** Dext (Receipt Bank), Hubdoc
   - **Domain:** Split-screen document inspection, synchronized SVG coordinate bounding boxes, confidence score pills, inline editing, and approval velocity.
3. [**03_tally_suvit_taxone.md**](./03_tally_suvit_taxone.md):
   - **Products:** Tally Prime, Suvit, Vyapar TaxOne
   - **Domain:** Indian accounting mental models, keyboard ergonomics (`Alt`/`Ctrl` function keys), voucher creation, Tally XML synchronization, and statutory GST / TDS compliance workflows.
4. [**04_superhuman_linear_triage.md**](./04_superhuman_linear_triage.md):
   - **Products:** Superhuman, Linear
   - **Domain:** Sub-50ms keyboard triage (`J`/`K`, `A`, `R`), zero-inbox progress bars, batch command palette, and optimistic UI transitions.
5. [**05_karbon_canopy_practice_management.md**](./05_karbon_canopy_practice_management.md):
   - **Products:** Karbon, Canopy
   - **Domain:** Client-first 3-pane navigation, persistent client switcher in title bar, statutory filing calendars (GSTR-1, GSTR-3B, TDS), and client context isolation.
6. [**06_vicai_docyt_autonomous_accounting.md**](./06_vicai_docyt_autonomous_accounting.md):
   - **Products:** Vic.ai, Docyt
   - **Domain:** Autonomous AP accounting, AI confidence scoring tiers, root-cause exception grouping, top-3 ranked GL candidate suggestions, and cascading batch firm memory adaptation.
7. [**07_spotlight_alfred_raycast_omnisearch.md**](./07_spotlight_alfred_raycast_omnisearch.md):
   - **Products:** Apple Spotlight, Alfred, Raycast
   - **Domain:** Universal `Ctrl+K` omni-search overlay, loose natural language query parsing (e.g. "transport bill March about 40k"), zero-dropdown parameter parsing, and candidate ranking.
