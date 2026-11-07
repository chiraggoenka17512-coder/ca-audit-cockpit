# GEMINI.md: Instructions for the CA Audit Cockpit agent

Read this file completely before writing or changing any code. If something here conflicts with a request in chat, stop and ask. Do not resolve the conflict yourself.

---

## 1. What this project is

A desktop app (Tauri v2) for Indian chartered accountant (CA) firms. It reconciles bank statements, purchase registers, invoices, and GSTR-2B against ledgers. It proposes matches and entries with a stated reason, lets the CA approve or reject them in batches, retrieves invoices from vague queries, and exports to Tally.

Four rules outrank everything else:

1. **Client data never leaves the machine.** No network call may carry client data. No telemetry, no crash reports containing client data, no cloud AI calls.
2. **Nothing is posted automatically.** Every entry needs an explicit human approval.
3. **The model never does arithmetic or tax decisions.** Totals, GST, TDS, and matching logic are deterministic and tested. The model only reads documents, suggests matches, and drafts explanations.
4. **Do not invent.** Tax rules, Tally XML schema, GSTR-2B field names, and competitor features must come from a verified source. If you cannot verify it, write `UNVERIFIED` and stop there.

---

## 2. Current state of the repository (read this first)

- Stack: Tauri v2 backend in Rust (`src-tauri/`), React + TypeScript frontend (`src/`), Vite build.
- Rust crates already declared in `src-tauri/Cargo.toml`: `tauri`, `serde`, `serde_json`, `anyhow`, `thiserror`, `sha2`, `aes-gcm`, `calamine`, `strsim`, `rayon`, `rusqlite` (bundled), `chrono`, `quick-xml`, `ts-rs`.
- **The Rust modules are empty stubs** (about 5 lines each): `storage/mod.rs`, `engine/mod.rs`, `rules/mod.rs`, `parsers/mod.rs`. Nothing is implemented in them yet.
- `src/types/` contains only `index.ts`. No generated types exist yet.
- Only the `main` branch is confirmed on the remote. Feature branches named in planning documents (`feat/rajveer-engine-rules`, `feat/vihaan-data-pipeline`, `feat/chirag-ui-and-model`) may not exist. Check with `git branch -a` before assuming they do. Do not claim work exists in a branch you have not seen.
- The docs in `docs/teardowns/` are design research. They describe competitor products and design patterns. Treat competitor details as unverified hypotheses.

Do not describe any module as "done," "working," or "verified" unless you have run its tests and can show the output.

---

## 3. What must be built, in order

Build in this order. Do not start a later item until the earlier one passes its acceptance criteria.

### Step 1: Money and identifiers (foundation)
- All money is stored and computed as **integer paise** (i64). Never use `f32` or `f64` for money. Parse "Rs 40,000.00" or "40,000" into paise in one function with tests.
- Validate **GSTIN** (15 characters, format and checksum) and **PAN** (10 characters, format). Use test vectors from official GSTN documentation. If you cannot find official vectors, mark the checksum function `UNVERIFIED` and do not rely on it for decisions.
- Use `chrono` for dates. Support Indian date formats (`DD/MM/YYYY`, `DD-MMM-YYYY`) explicitly; never guess between day-first and month-first.

**Acceptance:** unit tests for parsing, validation, and rounding pass. Invalid inputs return typed errors, not panics.

### Step 2: Encrypted storage (`storage/`)
- SQLite via `rusqlite`, one database file per client workspace.
- Encrypt the sensitive columns or the file with **AES-256-GCM** (`aes-gcm`). Generate a fresh random 96-bit nonce for every encryption. Never reuse a nonce.
- The master key is retrieved from the OS keychain. It is never hardcoded, never written to a log, and never written to disk in plain text.
- Provide an encrypted backup export that requires a passphrase.
- Provide a per-client delete that removes the workspace and its backups.

**Acceptance:** a test that writes and reads a record, a test that a wrong key fails to decrypt, a test that two encryptions of the same plaintext differ, and a test that the database file contains no plaintext client names.

### Step 3: Audit log (`storage/` or `engine/audit`)
- Append-only table. Each entry stores: id, timestamp (UTC), actor, action type, payload hash, previous entry hash, and entry hash.
- Entry hash = SHA-256 over the canonical serialization of the entry fields plus the previous hash. Define the canonical format once and document it in code.
- First entry uses a fixed genesis hash, documented in code.
- Provide `verify_chain()`, which recomputes every hash and returns the first broken link.

**Acceptance:** tests showing that editing any past row causes `verify_chain()` to fail at that row, and that deleting a row is detected.

### Step 4: Parsers (`parsers/`)
- Excel and CSV via `calamine` and a CSV reader. Read the header row explicitly. Do not assume column positions; map columns by header name and report unmapped headers.
- GSTR-2B: parse the JSON export. Field names must match the official schema. If you cannot confirm the schema, stop and ask for a sample file.
- Bank statement: parse the CSV export format of at least one named bank, with the bank named in the code and the format documented. Do not write a "generic" parser that guesses.
- Every parsed row keeps a reference to its source file, row number, and raw text. This is needed for source linking.

**Acceptance:** parsers run on synthetic fixtures in `tests/fixtures/` and produce expected rows. Malformed rows are reported, not silently dropped.

### Step 5: Matching engine (`engine/`)
- Deterministic matching first: exact match on GSTIN + invoice number + amount, then relaxed rules (date within a configured window, amount within a configured tolerance). Each rule is named and documented.
- Fuzzy matching (`strsim`) only for party names and narrations, never for amounts, GSTINs, or invoice numbers.
- Every match result returns: the matched pair, the rule that matched, a confidence score, and a plain-language reason listing which fields agree and which differ.
- Unmatched items are grouped by likely cause: timing difference, invoice number typo, missing entry, amount mismatch.
- The matcher must be deterministic: same input, same output, every time.

**Acceptance:** a golden test set in `tests/golden/` of synthetic cases with known correct answers. Report precision and recall. Do not change matching rules to make a test pass without explaining why in the commit message.

### Step 6: Rules engine (`rules/`)
- Tax and reconciliation rules live in a **versioned data file** (for example `rules/gst.toml`), not in code. Each rule has: id, description, effective-from date, effective-to date (or open), and a source reference (URL or circular number).
- A rule with no verified source is marked `status = "UNVERIFIED"` and must not be used to produce a tax conclusion. It may appear only as a labelled suggestion.
- `rules_for(date)` returns the rules in force on a transaction date. Never apply today's rules to a past transaction.
- Every explanation that cites a rule includes the rule id and effective date.

**Acceptance:** tests that a rule outside its effective dates is not returned, and that an UNVERIFIED rule cannot produce a conclusion.

### Step 7: Invoice retrieval (`engine/search`)
- Hybrid search: exact match on GSTIN, invoice number, and amount, plus semantic or keyword match on descriptions and party names. Structured filters (client, date range, amount range) are applied first.
- Return: the document, the matched snippet, and a confidence level.
- If no strong match exists, return the closest candidates labelled "no strong match". Never return one result as certain.
- The index lives inside the client's encrypted workspace. Queries never cross workspaces.

**Acceptance:** a test that a query across two clients returns results only from the selected client.

### Step 8: Tally export (`engine/tally`)
- Generate `TALLYMESSAGE` XML vouchers.
- **Do not write the XML schema from memory.** Use a verified sample from Tally documentation or a sample file the team exports from Tally Prime. If none is available, mark the module `UNVERIFIED` and stop.
- Amounts in the XML are formatted from paise in one function, with tests.

**Acceptance:** exported XML matches the verified sample byte-for-byte for the same input, and the team has imported it into Tally Prime successfully.

### Step 9: Model integration (`engine/model`)
- The fine-tuned model is loaded locally (GGUF or ONNX). It is not called over a network.
- Model output is treated as untrusted text. It is parsed with strict validation, and any field that fails validation is flagged, not accepted.
- Model confidence is not treated as truth. Show the source snippet next to every extracted value.
- Model training code lives in Python under `training/` and is not part of the Rust build.

**Acceptance:** a test where malformed model output produces a flagged field, not a crash or a silent accept.

### Step 10: UI (`src/`)
- Three-pane layout: left sidebar (clients, Inbox, Queues, Find Invoice, Reports, Rules, Audit Log, Settings), centre list, right detail panel.
- Client name always visible in the title bar.
- Keyboard-first: J/K to move, A to approve, R to reject, Ctrl+K for Find Invoice, `?` for shortcut sheet. Every review action has a shortcut.
- Every approval and edit can be undone and the undo is logged.
- Amber highlight for fields below the confidence threshold. Never hide low-confidence items.
- The UI calls Rust commands through Tauri IPC. It does not contain matching or tax logic.

**Acceptance:** the review flow can be completed from the keyboard alone. A reviewer can see the source, the extracted value, the reason, and the rule without leaving the screen.

---

## 4. Non-negotiable rules

### Privacy and security
- No outbound network call may include client data. The app must function with networking disabled.
- Do not add analytics, telemetry, or crash reporting that could include client data. If crash reporting is added, it must be disabled by default and scrubbed.
- Do not hardcode keys, passphrases, or sample client data. Use `.gitignore` for any local data directory.
- Never log PAN, GSTIN, bank account numbers, or party names at info level or above. Mask them in logs.
- Use only synthetic data in the repository. Real client data must never be committed, even for testing.

### Correctness
- Money is integer paise. No floating point for money.
- No panics in library code. Use `Result` with `thiserror` for domain errors and `anyhow` only at the Tauri command boundary.
- No `unwrap()` or `expect()` outside tests, except where a comment explains why it cannot fail.
- No silent drops. Every rejected row, failed validation, or unmatched item is reported.
- Matching and tax logic must produce the same output for the same input.

### AI and data
- The model reads and suggests. It never posts, never computes totals, and never decides tax treatment.
- Do not present a model's confidence score as a probability of correctness unless it has been calibrated on the golden test set.
- Do not invent training data that looks like real invoices with real identifiers. Use synthetic generators (for example Faker with `en_IN`) and document the generator's settings.

### Honesty in reporting
- Do not say tests pass unless you ran them. Show the command and the output summary.
- Do not say a feature works unless it has an acceptance test that passes.
- Do not describe competitor features as facts. Mark them as hypotheses.
- If a dependency is missing, a file is absent, or a branch does not exist, say so plainly. Do not work around it silently.

---

## 5. Coding standards

- Rust: run `cargo fmt`, `cargo clippy --all-targets`, and `cargo test` before reporting completion. Keep clippy warnings at zero or document each suppression.
- TypeScript: strict mode on. No `any` except at the IPC boundary, where it must be typed immediately after receipt.
- Types shared between Rust and TypeScript should be generated with `ts-rs` into `src/types/generated/`, not hand-written.
- Small commits. One logical change per commit, with a message stating what changed and why.
- Do not add a dependency without stating why in the commit message and checking its licence is compatible with commercial use.
- Do not rename or restructure modules without being asked.

---

## 6. Stop and ask when

- A tax rule, GSTR-2B field name, or Tally XML element is needed and no verified source is in the repo.
- A request would send data over the network.
- A request would post or submit anything without approval.
- A test fails and the fix would mean changing the expected result rather than the code.
- A branch, file, or sample you were told exists is not present.
- The request conflicts with a rule in this file.

When you stop, state what is missing, what you have already done, and the exact question you need answered. Do not guess to keep going.

---

## 7. Definition of done for any task

1. The code compiles with no new warnings.
2. The relevant tests pass, and you have shown the output.
3. No real client data is included.
4. No new network calls carry client data.
5. Any unverified rule, schema, or assumption is marked `UNVERIFIED` in code and in the summary.
6. The summary lists what changed, what was tested, what was not tested, and what is still open.

---

## 8. Things not to build yet

- Automatic filing of GST or income tax returns
- Client invoicing
- Cloud sync or multi-machine sync
- Audit sign-off or opinion generation
- Anomaly flags (stretch goal, only after Steps 1 to 10 pass)
- Any feature that needs a server


---

## 9. Zero AI Design Slop Policy (Strict Mandatory Rule)
Under no circumstances may any of the 20 AI Design Slop indicators appear in ReconOS:
1. Tags and pills: No gratuitous rounded-full chip bubbles, pill badges, or tag clusters.
2. Excessive italics: No decorative italics for artificial emphasis.
3. Instrument Serif / Pretentious Serifs: Clean sans-serif only (Inter, system-ui).
4. Negative kerning: No negative tracking (`tracking-tight`, `tracking-[-0.03em]`).
5. Over-the-top detailed UI: No superfluous decorations, micro-icons, or visual noise.
6. Overusing dividers: Group with natural whitespace, avoid cutting everything with hairline dividers.
7. Multiple color shades and opacities: No chaotic soup of opacity shifts (`/15`, `/30`, `/80`).
8. Containers with borders (Nested boxes): No cards inside cards inside cards with borders.
9. Overly detailed diagrams: No fake progress charts or complex decorative meters.
10. Overly verbose text: Direct, concise copy without AI breathlessness.
11. Code breadcrumbs: No pseudo-code paths (`// INSPECTION LOUPE //`) as headers.
12. Section numbering: No arbitrary `01.`, `02.`, `#1` prefixes on titles.
13. Eyebrows: No tiny uppercase tracked-out eyebrow labels above headings.
14. Dithering: Strictly banned.
15. ASCII images / art: Strictly banned.
16. Squirkles: Use standard consistent `rounded-lg` or `rounded-md`.
17. Excessive monospace: `font-mono` is strictly for code & hashes, NOT dates, numbers, or titles. Use `tabular-nums`.
18. All-caps subtitles: Use natural sentence case or standard title case.
19. Gradient backgrounds: Flat, solid, high-contrast surfaces only. No glowing neon gradients.
20. Periods in titles: No trailing periods at the end of headings.
