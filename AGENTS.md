# AGENTS.md — ReconOS Master Agentic Operating Contract

> **Mission:** Air-Gapped Autonomous Financial Intelligence & Audit Defense for Indian CAs.
> **Security Posture:** 100% on-device execution, zero outbound network traffic for client data, local AES-GCM-256 encryption, immutable SHA-256 hash-chained audit logging.

---

## 1. Multi-Agent Team Structure (JSM HQ Architecture)

Every autonomous coding agent operates under strict domain boundaries to prevent collisions:

```
                          ┌──────────────────────────┐
                          │       CHIRAG (CEO)       │
                          │   Human Product Owner    │
                          └────────────┬─────────────┘
                                       │
                                       ▼
                          ┌──────────────────────────┐
                          │   ANTIGRAVITY CTO LEAD   │
                          │   Orchestrator & Lead    │
                          └──────┬─────┬─────┬───────┘
                                 │     │     │
         ┌───────────────────────┘     │     └───────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│   AGENT 1 (RUST) │          │  AGENT 2 (DATA)  │          │    AGENT 3 (UI)  │
│  Rust Systems &  │          │ Ingestion, Calamine│        │ React 19 Cockpit │
│ Security Engine  │          │ Parsers & Gold Set │        │  & Triage Loupe  │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

### Roles & Code Ownership
1. **Agent 1: Rust Core & Security Lead**
   - **Scope:** `src-tauri/src/storage/`, `src-tauri/src/engine/`, `src-tauri/src/rules/`
   - **Responsibilities:**
     - AES-GCM-256 encrypted local workspace and client separation.
     - Cryptographic SHA-256 hash-chained tamper-evident audit ledger (`audit.rs`).
     - Multi-threaded reconciliation math using `rayon` and Levenshtein matching (`strsim`).
     - Versioned statutory rules (GST Sec 16(2)(aa) ITC eligibility, TDS thresholds 194C/194J).
   - **Testing:** `cargo test --package recon-os-core`

2. **Agent 2: Data Ingestion & Parsers Lead**
   - **Scope:** `src-tauri/src/parsers/`, `ml/synthetic/`
   - **Responsibilities:**
     - High-velocity in-memory Excel reader (`calamine`) for 50,000+ line client books.
     - Indian date formats (`DD/MM/YYYY`, `DD-MM-YYYY`) and currency parsing (Lakhs, Crores).
     - GSTR-2B JSON parser with tax breakups (`CGST`, `SGST`, `IGST`).
     - Synthetic Indian invoice generation pipeline (`Faker('en_IN')`).
   - **Testing:** Unit tests verifying Calamine parser against messy Indian Excel exports.

3. **Agent 3: Frontend Cockpit & UI Lead**
   - **Scope:** `src/components/`, `src/App.tsx`, `src/engine/`
   - **Responsibilities:**
     - 3-Pane Cockpit: Left Client Sidebar, Centre Working List/Today View, Right Loupe Inspector.
     - Exception-first triage queue (Timing differences, typos, tax rate discrepancies).
     - Full keyboard navigation: `J`/`K` (navigate), `A`/`Enter` (approve), `E` (edit), `Space` (batch approve), `U` (undo), `/` (omni-search).
     - Calling Tauri IPC commands (`invoke('reconcile_books')`, `invoke('append_audit_block')`).
   - **Testing:** `npm run build` and UI micro-interaction audits.

---

## 2. Tech Stack & Dependencies

| Area | Technology | Primary Crates / Packages |
| :--- | :--- | :--- |
| **Shell** | Tauri v2 | `tauri`, `tauri-plugin-opener` |
| **Engine & Storage** | Rust 2021 | `aes-gcm`, `sha2`, `rusqlite`, `calamine`, `strsim`, `rayon`, `chrono`, `ts-rs` |
| **Frontend UI** | React 19 + TypeScript | `vite`, `tailwindcss`, `lucide-react`, `clsx`, `tailwind-merge` |
| **IPC Types** | `ts-rs` automated sync | Shared Rust structs exported to `src/types/` via `cargo test export_bindings` |

---

## 3. Design System & Ergonomics Contract
- **Visual Theme:** Dark cockpit aesthetic (`#0a0a0c`, `#111115`). High-contrast neutral text. Glassmorphic borders (`border-white/10`).
- **No White Screen Default:** Clean dark backgrounds with tactile feedback on hover and active states.
- **Air-Gapped Guarantee:** No external telemetry, no remote cloud API dependencies during client data processing.

---

## 4. Branching & Review Rules
- Each agent must work on dedicated git branches:
  - `feat/rust-storage-audit`
  - `feat/calamine-excel-parser`
  - `feat/cockpit-3pane-ui`
- Merges to `main` require:
  1. `cargo check` & `cargo test` passing with zero warnings.
  2. `npm run build` passing with zero TypeScript errors.
  3. Code review verification via Antigravity `code-reviewer` and `rust-reviewer`.


---

## 5. Zero AI Design Slop (Mandatory Global Rule Forever)
Under no circumstances may any of the 20 AI Design Slop indicators appear in ReconOS:
1. **Tags and pills**: No gratuitous `rounded-full` chip bubbles, pill badges, or tag clusters.
2. **Excessive italics**: No decorative italics for artificial emphasis.
3. **Instrument Serif / Pretentious Serifs**: Clean sans-serif only (Inter, system-ui).
4. **Negative kerning**: No negative tracking (`tracking-tight`, `tracking-[-0.03em]`).
5. **Over-the-top detailed UI**: No superfluous decorations, micro-icons, or visual noise.
6. **Overusing dividers**: Group with natural whitespace, avoid cutting everything with hairline dividers.
7. **Multiple color shades and opacities**: No chaotic soup of opacity shifts (`/15`, `/30`, `/80`).
8. **Containers with borders (Nested boxes)**: No cards inside cards inside cards with borders.
9. **Overly detailed diagrams**: No fake progress charts or complex decorative meters.
10. **Overly verbose text**: Direct, concise copy without AI breathlessness.
11. **Code breadcrumbs**: No pseudo-code paths (`// INSPECTION LOUPE //`) as headers.
12. **Section numbering**: No arbitrary `01.`, `02.`, `#1` prefixes on titles.
13. **Eyebrows**: No tiny uppercase tracked-out eyebrow labels above headings.
14. **Dithering**: Strictly banned.
15. **ASCII images / art**: Strictly banned.
16. **Squirkles**: Use standard consistent `rounded-lg` or `rounded-md`.
17. **Excessive monospace**: `font-mono` is strictly for code & hashes, NOT dates, numbers, or titles. Use `tabular-nums`.
18. **All-caps subtitles**: Use natural sentence case or standard title case.
19. **Gradient backgrounds**: Flat, solid, high-contrast surfaces only. No glowing neon gradients.
20. **Periods in titles**: No trailing periods at the end of headings.
