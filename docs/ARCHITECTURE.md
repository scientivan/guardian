# Architecture: Deposit and Bill Guardian

Version 1.1, 17 October 2026. Stack approved by Dien on 17 Oct 2026. This document is the draft for the "System architecture", "Agent design" and "Security design" sections of the official technical document.

## 1. Security principles

- **Assume the LLM will be fooled.** Every consequential action is blocked or allowed by deterministic code outside the model. Based on CaMeL (Google DeepMind + ETH Zurich, arXiv 2503.18813) and the design-pattern paper arXiv 2506.08837: once an agent has read untrusted input, that input must not be able to trigger consequential actions.
- **Separate instructions from data.** The LLM that reads external documents has no tools. The LLM that plans never sees raw external text.
- **Provenance boundaries.** Payee claims carry source fields and operations record input source labels. Reader fields are ordinary schema-validated values, not general per-value taint tracking. The gateway enforces recipient provenance. This is reader quarantine inspired by CaMeL, not its full information-flow implementation.
- **Money math in code only.** Differences, totals, FX, shares and refunds are computed by code. The LLM extracts fields and proposes text. Displayed arithmetic is rendered from code templates.
- **Least privilege and data minimisation.** The LLM gets tokenised text and the minimum fields; scoped keys; role-based display.
- **Everything logged.** Hash-chained audit log, which doubles as execution evidence.

## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| App | Next.js 15 + TypeScript, one repo (`src/app` UI by Aurel, `src/server` + `src/app/api` by Dien) | One language for UI and API |
| DB | Supabase Postgres via Node worker, SQLite for offline tests | Private account schemas preserve identity and role boundaries |
| Validation | `zod` | Fixed schemas for LLM output and API input |
| LLM | Free tiers of Gemini, Groq and OpenRouter behind one router (`src/server/llm.ts`): first model not rate-limited wins; 429/5xx/timeout puts a model on cooldown | Quarantined reader and planner; no paid key needed |
| Second LLM | Same router with the first answer's provider excluded | Selective double-check from a different provider |
| OCR | Text-layer PDF read directly; photos through local Tesseract | Raw images with PII never reach an LLM |
| Payments | Stripe test mode (`sk_test_` only) | Verifiable test transaction IDs |
| FX | Demo rate table, labelled demo | Deterministic results |
| Anchoring | FISCO BCOS v3.17.1, 4-node local chain in Docker, web3 RPC; contract `contracts/Anchor.sol` (see `docs/FISCO-SETUP.md`) | Document hashes and audit log head; no token, allowed in China |
| Tests | `vitest` | Scripted tasks and attack tests |

Environment variables are listed in `.env.example`. Real `.env` is never committed.

## 3. Components

```
 upload / chat ──► [PII scrubber: code] ──► [Quarantined reader: LLM, no tools] ──► typed fields
                                                                                       │
 user request ─────────────────────────────► [Planner: LLM] ◄──────────────────────────┘
                                                   │ fixed action set only
                                                   ▼
                           [Comparator: code]  [Payment gateway: code]  [Auditor: code]
                                                   │
                                     Stripe test mode, FISCO BCOS anchor
```

### 3.1 PII scrubber (code)

See §4.

### 3.2 Quarantined reader (LLM, no tools)

- Input: tokenised text of an estimate, bill or message.
- Output: JSON in a fixed schema: `items[] {id, category, description, qty, unitPrice}`, `currency`, `total`, `assumedStayDays`, `exclusions[]`, `statedReasons[]` (only reasons written in the document), `payeeMentions[]`.
- Output is validated with `zod`; fields outside the schema are dropped. The ingestion operation records `hospital_doc` or `chat` provenance. Individual reader strings are not capability-labelled.
- Instructions inside a document can at worst become a wrong field value. A wrong `payeeMentions` value is caught by the gateway; an inconsistent total is caught by the totals check. Self-consistent wrong prices, reasons or categories may remain and need independent reading or hospital confirmation.

### 3.3 Planner (LLM)

- Input: the trusted user request plus typed fields and comparator results. Never raw document text.
- Output: plain-language text plus actions from a fixed set: `explain_bill`, `ask_clarification`, `request_approval`, `prepare_payment`, `track_refund`, `ask_hospital`, `warning`.
- The planner references payees only by `payeeId` from the registry; it cannot write an account number. It cannot approve or execute.
- Explanation lines must cite item ids and carry a type: `arithmetic_fact`, `stated_in_document`, `unknown_ask_hospital`. Lines without citations are dropped before display.

Implementation: `src/server/explain.ts` (bill explanation) and `src/server/agent.ts` (chat). Every displayed arithmetic line is reconstructed from its computed cause with code templates. Document statements are attributed quotations of extracted source statements, not independently verified clinical facts. Hospital-question lines use bounded templates. Planner free prose never becomes a displayed fact, and legacy cached prose is reconstructed on reads. In chat, the model only classifies the message into a fixed intent; code resolves which bill, amount or request it means, asks a clarifying question when the message does not identify it (relative words like "kemarin" are not accepted), and can only prepare a payment, never execute one. Account numbers in chat are checked by the gateway before any model runs.

### 3.4 Comparator (code, `src/server/compare.ts`)

- Totals per category: room, drug, procedure, lab, consumable, other.
- Causes: `longer_stay` (extra days × daily room rate), `category_over`, `not_in_estimate`. Room overrun already explained by the longer stay is not counted twice.
- Flags: `duplicate`, `basic_item_billed`, `above_reference`.
- Refund split proportional to amounts paid; remainder to the largest payer; total conserved.
- Reference table rows carry their source and the label "indicative".

### 3.5 Selective second-model check

- Called only for items above a threshold, flagged items, or items a family member questions.
- If both models disagree on an item's category or reading, the item becomes a `models_disagree` question for the hospital. The agent never picks a side.
- Reason for not using 2-of-3 on every item: 3× cost and latency, correlated errors, and no added novelty (Lethe already does it).

### 3.6 Payment gateway (code, `src/server/gateway.ts`)

Checks before any payment, in order:

1. **Registry.** `payeeId` exists for the case's hospital and its source is `official_registry`.
2. **Exact name.** Claimed payee name, after NFKC normalisation and removal of invisible characters, has no look-alike letters and equals the registry name.
3. **Role.** Actor belongs to the case and has a role allowed to approve (owner or payer; never companion or agent).
4. **Amount.** Positive integer; payer within share limit; approved total ≤ requested amount; at execution, approved total ≥ requested amount.
5. **Anomalies.** No open anomaly on the case (new or changed account, mismatch, urgent request from an unofficial channel).

Any failed check denies the action and writes an audit row. There is no override path.

**Payee enrollment** (closes the circularity of trusting an "official invoice"): the fictional hospital portal serves its payee list with a signature from the hospital's key (Ed25519; public key pinned in seed data, standing in for a hospital domain or contract). Only a list that verifies is enrolled as `official_registry`. Accounts seen in invoices or chat are matched against the registry and never enrolled from there.

**Payment state machine:**

```
pending ──(approvals cover amount, checks 1–5 pass)──► executing ──► paid
   │                                                       │
   ├──(expiry)──► expired                                   └──(charge fails)──► failed (no partial success hidden; per-share status shown)
   └──(owner cancels)──► cancelled
```

When `executing`, each approved share is a separate sandbox or Stripe test charge in the payer's currency at the locked quote. The registry payee is the intended recipient and payeeId is Stripe metadata, not a settlement destination. Each payer receives a test charge reference. No hospital bank settlement is implemented. Approvals can be withdrawn only in `pending`.

### 3.7 Auditor (code, `src/server/audit.ts`)

- Row: `seq, ts, case_id, actor, action, input_sources, decision, result, prev_hash, hash`; `hash = sha256(prev_hash, ts, case_id, actor, action, input_sources, decision, result)`.
- `verifyChain` recomputes every hash and returns the first broken row.
- Anchoring: SHA-256 of each uploaded document and hospital invoice, the log head (on demand, after each payment and at closing) and the closing pack are written to a FISCO BCOS contract (`anchor(bytes32 hash, string kind)`). Tx hashes are stored by kind in document/invoice anchor columns, audit-anchor settings and case_closure fields.
- Claim limit: an anchor proves a file or log did not change after anchoring. It does not prove who issued the file or that the bill is correct.

## 4. PII removal (`src/server/pii.ts`)

1. Document becomes text (text-layer PDF or local OCR).
2. Code detects fixed patterns (email, card number, medical record number, passport, phone, date of birth) and the names already known from case data (patient, members). Longest names first.
3. Supported values become tokens such as `[PASIEN_1]` and `[PASSPORT_1]`. Case-aware allocation reuses the stored mapping and allocates new counters in a transaction. Different values cannot silently overwrite an existing token. Known-name scrubbing also covers the complete chat prompt, including request purposes.
4. Token table (`pii_tokens`) is stored apart and never sent to an LLM.
5. LLMs read only tokenised text.
6. AI-generated views retain tokens. `restore` remains a role-aware utility, not a web display path. Owner/companion original medical-document downloads and all-member shared receipt downloads are explicit separate surfaces. Receipt upload warns to remove medical details, identifiers and card numbers.

Limits: unusual formats can slip through; doctor names not in case data and addresses need a local name detector (planned); drug and procedure names stay, so a diagnosis can be guessed. Role masking is the second layer.

## 5. Data model (`src/server/db.ts`)

Money is stored as integer minor units (fen for CNY).

| Table | Key fields |
|---|---|
| `hospitals` | `id`, `name`, `official_channel`, `public_key` (Ed25519, pinned) |
| `cases` | `id`, `patient_token`, `hospital_id`, `currency`, `status` |
| `members` | `id`, `case_id`, `display_name`, `role`, `share_limit`, `currency` |
| `payees` | `id`, `hospital_id`, `account`, `name_normalized`, `source`, `verified_at` |
| `documents` | `id`, `case_id`, `type`, `sha256`, `anchored_tx`, `created_at` |
| `bill_items` | `document_id`, `category`, `description`, `qty`, `unit_price`, `flags` |
| `payment_requests` | `id`, `case_id`, `payee_id`, `document_id` (estimate or bill it pays, optional), `amount`, `purpose`, `status`, `created_at`, `expires_at` |
| `request_invoices` | `id`, `request_id`, `case_id`, `filename`, `mime`, `bytes`, `sha256`, `anchored_tx`, `uploaded_by`, `ts` (hospital invoice for a paid request) |
| `case_closure` | `case_id`, `closed_at`, `closed_by`, `pack_sha256`, `pack_tx`, `audit_hash`, `audit_tx` (a row means the case is read-only) |
| `fx_quotes` | `id`, `request_id`, `member_id`, `amount`, `pay_currency`, `pay_amount`, `rate_e4`, `fee`, `expires_at` |
| `approvals` | `request_id`, `member_id`, `amount`, `status`, `quote_id`, `charge_ref`, `withdrawn_at`, `ts` (unique per member per request) |
| `anomalies` | `case_id`, `kind`, `detail`, `resolved`, `ts` |
| `refunds` | `case_id`, `member_id`, `amount`, `status`, `due_at` |
| `pii_tokens` | `case_id`, `token`, `value`, `kind` |
| `audit_log` | see §3.7 |

Columns added after the first release are created by guarded `ALTER TABLE` statements in `openDb`, so existing per-account databases keep working. The shared `access.db` (`src/server/access.ts`) holds `invitations` and `memberships` (with the member's Google `email`, used for payment-request emails).

Web-layer additions (20 Oct): request amounts are validated against `src/lib/payment-plan.ts`; `src/server/notify.ts` sends Gmail notifications (optional, hash-free, no patient data); a closed case rejects every mutating case route except chat in `src/server/api.ts`.

## 6. Rubric mapping

| Rubric item | Mechanism |
|---|---|
| Task completion (scripted tasks in a simulated environment) | D1–D6 scripts with logs, Stripe test IDs, anchors |
| Induced transfers | Registry, signed enrollment, exact-name check, anomaly stop (A1, A3, A6, A7) |
| Data extraction | PII tokens before LLM, role masking (A5) |
| Privilege escalation | Role and share-limit checks in the gateway (A4) |
| Prompt injection | Quarantined reader, fixed action set, provenance labels (A2) |
| User control | Per-payer approval, withdrawal, expiry, no auto-pay (S5) |
| Intent understanding, clarification, colloquial input | Planner with `ask_clarification` (D6) |
| Correction and fallback | Totals mismatch asks for re-upload; model disagreement becomes a hospital question; stop on anomaly |

## 7. Technical risks

- Photo OCR quality: Tesseract on phone photos may misread. Demo uses text-layer PDFs as the primary path; photos are a secondary path with a re-upload fallback.
- FISCO BCOS setup needs Docker. Fallback: anchoring stays "planned", on-chain bonus 0, local hash chain still runs.
- Multi-person approval adds dialogue turns. Mitigation: one-screen summary per payer and one tap to approve.
- Stripe test mode does not simulate cross-border settlement. FX is shown from the demo table; Stripe charges are in test currency.


## 8. Audit remediation, 20 October 2026

Payer audit projections use an allowlist of actions and scalar result fields, scoped by raw member IDs. Nested refund allocations, recipients and other members' charge references are not returned. Full-log integrity remains a server calculation, with a filtered-view notice in Case History.

Explanation GET is cache-only and never calls a model. A closed case does not refresh local hospital authority or record new refund reminders during a view. Chat is the explicit post-closure exception and can still append conversation, token and audit state. Closed financial records remain fixed.

PII protection covers supported patterns and known case names, not arbitrary sensitive content. Existing stored text from earlier versions is not retroactively reparsed or re-tokenised. If an earlier document used an ambiguous token mapping, re-upload the original rather than claiming its lost mapping can be recovered.

## Supabase and Vercel persistence, 20 October

Cloud mode uses a synchronous Node worker adapter over real PostgreSQL tables. Workspace schema names are derived from the existing account hash, preserving overlapping case/member identifiers and NextAuth memberships. Shared invitation and hospital-directory schemas remain separate. Schema grants deny public, anon and authenticated roles, while application tables enable RLS without public policies. Only the trusted backend connects through the TLS-verified transaction pooler. Integer minor units use bigint and reject values outside JavaScript's safe integer range.

The adapter retains the existing synchronous engine API. This blocks the Node event loop during database queries and is a compatibility tradeoff. It runs in the Node runtime with a bounded four-connection pool. Explicit synchronous transactions hold a workspace advisory lock. Audit append, payment authorization plus claim, request validation plus creation, closure validation plus insertion, and demo initialization execute atomically. LLM, email, Storage and gateway waits occur outside these synchronous callbacks.

File metadata and SHA-256 remain in Postgres. Original bytes and invoice bytes live in a private Supabase Storage bucket. The browser receives narrowly scoped temporary upload permissions and a session/destination-bound signed receipt, then the backend repeats intake validation. Downloads apply the existing role boundary before issuing a 60-second signed URL. This accommodates the 10 MB product limit on Vercel. Bundled English Tesseract WASM replaces the native binary in Vercel functions. NextAuth identities are retained, with no Supabase Auth migration.

See SUPABASE-MIGRATION.md for import evidence, rollback, backup/restore and production anchoring limits.
