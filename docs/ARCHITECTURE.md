# Architecture: Deposit and Bill Guardian

Version 1.1, 17 October 2026. Stack approved by Dien on 17 Oct 2026. This document is the draft for the "System architecture", "Agent design" and "Security design" sections of the official technical document.

## 1. Security principles

- **Assume the LLM will be fooled.** Every consequential action is blocked or allowed by deterministic code outside the model. Based on CaMeL (Google DeepMind + ETH Zurich, arXiv 2503.18813) and the design-pattern paper arXiv 2506.08837: once an agent has read untrusted input, that input must not be able to trigger consequential actions.
- **Separate instructions from data.** The LLM that reads external documents has no tools. The LLM that plans never sees raw external text.
- **Provenance labels.** Every value carries its source: `user`, `official_registry`, `hospital_doc`, `chat`, `system`. The gateway checks labels before any payment.
- **Money math in code only.** Differences, totals, FX, shares and refunds are computed by code. The LLM writes words, not numbers.
- **Least privilege and data minimisation.** The LLM gets tokenised text and the minimum fields; scoped keys; role-based display.
- **Everything logged.** Hash-chained audit log, which doubles as execution evidence.

## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| App | Next.js 15 + TypeScript, one repo (`src/app` UI by Aurel, `src/server` + `src/app/api` by Dien) | One language for UI and API |
| DB | SQLite via `better-sqlite3` | No server; easy reset for judges |
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
- Output is validated with `zod`; fields outside the schema are dropped. Every value is labelled `hospital_doc` or `chat`.
- Instructions inside a document can at worst become a wrong field value. A wrong `payeeMentions` value is caught by the gateway; a wrong price is caught by the totals check (sum of lines must equal the stated total, else the agent asks for re-upload).

### 3.3 Planner (LLM)

- Input: the trusted user request plus typed fields and comparator results. Never raw document text.
- Output: plain-language text plus actions from a fixed set: `explain_bill`, `ask_clarification`, `request_approval`, `prepare_payment`, `track_refund`, `ask_hospital`, `warning`.
- The planner references payees only by `payeeId` from the registry; it cannot write an account number. It cannot approve or execute.
- Explanation lines must cite item ids and carry a type: `arithmetic_fact`, `stated_in_document`, `unknown_ask_hospital`. Lines without citations are dropped before display.

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

When `executing`, each approved share is a separate Stripe test charge in the helper's currency, converted at the locked quote, to the registry payee. Each helper receives their own receipt. Approvals can be withdrawn only in `pending`.

### 3.7 Auditor (code, `src/server/audit.ts`)

- Row: `seq, ts, case_id, actor, action, input_sources, decision, result, prev_hash, hash`; `hash = sha256(prev_hash, ts, case_id, actor, action, input_sources, decision, result)`.
- `verifyChain` recomputes every hash and returns the first broken row.
- Anchoring: SHA-256 of each uploaded document and the current log head are written to a FISCO BCOS contract (`anchor(bytes32 hash, string kind)`). Tx hash stored in `documents.anchored_tx`.
- Claim limit: an anchor proves a file or log did not change after anchoring. It does not prove who issued the file or that the bill is correct.

## 4. PII removal (`src/server/pii.ts`)

1. Document becomes text (text-layer PDF or local OCR).
2. Code detects fixed patterns (email, card number, medical record number, passport, phone, date of birth) and the names already known from case data (patient, members). Longest names first.
3. Each value becomes a token such as `[PASIEN_1]`, `[PASSPORT_1]`. Same value, same token.
4. Token table (`pii_tokens`) is stored apart and never sent to an LLM.
5. LLMs read only tokenised text.
6. Display restores tokens by role: owner sees all; payers do not see medical record number, passport, date of birth or card; nobody but the owner sees card numbers.

Limits: unusual formats can slip through; doctor names not in case data and addresses need a local name detector (planned); drug and procedure names stay, so a diagnosis can be guessed. Role masking is the second layer.

## 5. Data model (`src/server/db.ts`)

Money is stored as integer minor units (fen for CNY).

| Table | Key fields |
|---|---|
| `hospitals` | `id`, `name`, `official_channel` (+ planned `public_key`) |
| `cases` | `id`, `patient_token`, `hospital_id`, `currency`, `status` |
| `members` | `id`, `case_id`, `display_name`, `role`, `share_limit` (+ planned `currency`) |
| `payees` | `id`, `hospital_id`, `account`, `name_normalized`, `source`, `verified_at` |
| `documents` | `id`, `case_id`, `type`, `sha256`, `anchored_tx`, `created_at` |
| `bill_items` | `document_id`, `category`, `description`, `qty`, `unit_price`, `flags` |
| `payment_requests` | `id`, `case_id`, `payee_id`, `amount`, `purpose`, `status`, `created_at` (+ planned `expires_at`) |
| `approvals` | `request_id`, `member_id`, `amount`, `ts` (unique per member per request) (+ planned `fx_quote`, `charge_ref`, `withdrawn_at`) |
| `anomalies` | `case_id`, `kind`, `detail`, `resolved`, `ts` |
| `refunds` | `case_id`, `member_id`, `amount`, `status`, `due_at` |
| `pii_tokens` | `case_id`, `token`, `value`, `kind` |
| `audit_log` | see §3.7 |

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
