# Requirements verification

Checked on 20 October 2026: every requirement in `PRD.md`, `ARCHITECTURE.md`, `API.md`, `TEST-PLAN.md`, `HOSPITAL-DIRECTORY.md` and `GOOGLE-OAUTH.md` against the code and the running app. The roles were checked as owner, payer (Adi) and companion (Dewi) in the demo account. A Google case linked to a directory hospital was also checked.

Status: **✅** in the product · **✅ new** gap found in this check and fixed · **⚠️** partly, with the limit stated · **—** not a product feature (process, deployment or people).

## PRD §4: product chain

| Step | Where | Status |
|---|---|---|
| 1 Estimate in | Upload, wizard step "First bill"; estimate range shown in Bill Review | ✅ |
| 2 Payee check | Pledges → Verify hospital account; signed list (demo) or reviewed directory account (Google) | ✅ |
| 3 Initial deposit | Pledges → "Initial deposit", amount from the estimate's lower or upper end | ✅ new (amount used to be typed) |
| 4 Bill explainer | Bill Review: cited lines in three kinds, breakdown, hospital questions, Ask buttons | ✅ |
| 5 Guarantee / top-up | Pledges → "Emergency guarantee"; per-payer FX quote, approve or withdraw, pay at 100% | ✅ (amount typed, see open items) |
| 6 Final bill reconciliation | Refund Tracking → Reconcile; Bill Review of the final bill; "Bill balance" uses the final bill and replaces interim bills | ✅ new (final bill can be paid; interim bills no longer payable once replaced) |
| 7 Refund tracking | Refund Tracking: own share, status, due date, overdue chip, follow-up, demo clock | ✅ |
| 8 Recap | Refund Tracking → Your Payment Record, shown in the app and downloadable | ✅ new (was download only) |

## PRD §2: roles

| Rule | Status |
|---|---|
| Owner adds members, sets share limits | ✅ new: "Change limit" per payer on Case Members (`POST /cases/:id/members/:memberId`), audited as `member.limit` |
| Owner requests payee verification | ✅ |
| No one pays outside the registry or overrides the gateway | ✅ (attack run A1, A7) |
| Payer sees bill summary and own share only | ✅ new: other payers' pledges, limits and activity are removed server-side, and empty folders are hidden |
| Payer can't see full documents, approve for others, change payees | ✅ (no originals, no items, check 3) |
| Companion uploads and asks, can't approve | ✅ |
| Agent only prepares | ✅ |

## PRD §6: functional requirements

| # | Requirement | Where | Status |
|---|---|---|---|
| F1 | PDF and photo upload, text layer or local OCR | `extract.ts`, Upload | ✅ |
| F2 | PII tokens before any LLM | `pii.ts`; agents see `[PASIEN_1]` | ✅ |
| F3 | Quarantined reader, fixed schema | `reader.ts` | ✅ |
| F4 | Comparator: categories, stay, outside estimate, duplicates, basic items, reference, FX | `compare.ts` | ✅ |
| F5 | Cited lines in three types; no invented clinical cause | `explain.ts`, Bill Review | ✅ |
| F6 | Second model for big or flagged items **and items a family member questions** | Bill Review → open a group → "Double-check" per line (`POST /cases/:id/second-check`) | ✅ new (the "family questions" path was missing) |
| F7 | Reference prices labelled indicative | Bill Review note above the hospital questions | ✅ new (the note existed in data but was not shown) |
| F8 | Payees only from an independent signed channel | `enrollment.ts`, directory review | ✅ |
| F9 | Source label on account values | "Official registry" badge next to the account on Pledges | ✅ new |
| F10 | Exact normalised name, no override | `gateway.ts` check 2 | ✅ |
| F11 | New or changed account opens a warning; all payments stop until resolved through the official channel | Case-wide red banner on every page; resolved by Verify hospital account | ✅ new: banner added; a warning from a document with hidden instructions could never be cleared, and Google directory cases never cleared warnings. Both fixed. |
| F12 | Request states payee, amount, purpose, expiry | Pledges request card, live countdown | ✅ new (countdown) |
| F13 | Own share within limit; never above 100% | check 4 | ✅ |
| F14 | State machine; each share charged separately with its own receipt | `payments.ts`; receipt per share on the request card and in the payment record | ✅ new (receipts were not shown) |
| F15 | Withdraw while pending | Pledges | ✅ |
| F16 | FX quote with fee and expiry, labelled demo | Pledges quote line: "IDR 78,030,000 (CNY 34,000)" with the rate "1 CNY = 2,295 IDR" | ✅ new: cross rates through CNY cover MYR, SGD, THB, AED, USD and IDR hospitals |
| F17 | Agent only prepares | chat "Prepare payment request" | ✅ |
| F18 | Refund split by share paid, statuses, due date, reminder | Refund Tracking | ✅ |
| F19 | Recap per payer with receipts and hashes | Your Payment Record | ✅ new (in-app view) |
| F20 | Hash-chained audit, document and log anchoring | Case History, Anchor audit hash; automatic head anchor after each payment and at closing; invoices and the closing pack anchored too | ✅ (extended 20 Oct) |
| F21 | Clarifying question on ambiguous requests | Case Assistant | ✅ |

## ARCHITECTURE

| Item | Status |
|---|---|
| §3.1–3.4 scrubber, reader, planner, comparator | ✅ |
| §3.5 selective second check, including family-questioned items | ✅ new (see F6) |
| §3.6 five checks, signed enrollment, state machine | ✅ |
| §3.7 audit chain and anchor, honest claim limits | ✅ (How It Works → What the Records Prove) |
| §4 PII display by role | ✅ |
| §6 rubric mapping | ✅ evidence in `evidence/` |

## API.md screens and endpoints

| Item | Status |
|---|---|
| Screens 1–7 (overview, upload, explanation, payment request, chat, refunds, audit) | ✅ Agent Office, Upload, Bill Review, Pledges, Case Assistant window, Refund Tracking, Case History |
| Open warnings shown prominently | ✅ new (banner) |
| Payees with source badge | ✅ new |
| Expiry countdown | ✅ new |
| v1.2–1.3 endpoints (invitations, refunds, clock, hospitals, admin) | ✅ |

## TEST-PLAN

| Item | Status |
|---|---|
| D1–D6, D4b, A1–A9 | ✅ `npm test`, `evidence/run-2026-10-18-clean-clone`, UI attack run `evidence/e2e-2026-10-20/attacks` |
| §3 correction: OCR failure, total mismatch → re-upload; model disagreement → hospital question | ✅ |
| §3 fallback: request expires cleanly; hospital questions exported | ✅ (countdown, expiry, Copy questions) |
| §3 dialogue turn counts | — TASKS 6.7, a measurement still to record |
| §4 baseline | ✅ `evidence/baseline-2026-10-18` |

## HOSPITAL-DIRECTORY and GOOGLE-OAUTH

All described flows are present: suggestions, AI search with sources, separate profile and payment reviews, holds, key rotation, verification-hash anchoring, admin allowlist, email-bound and link invitations, an eight-hour session and the Dashboard. ✅

## Added after this check (20 Oct, later rounds)

PRD §12 lists these scope changes. Each is in the product and covered by `src/server/bill-request.test.ts` where it has server logic.

| Item | Where |
|---|---|
| Payer role name and role chips | UI everywhere, `ROLE_LABEL` |
| One live request per document | `payment-plan.ts`, `Integration.createRequest` |
| Hospital invoice on paid requests (view and download for all members, anchored) | Pledges → Hospital Invoice |
| Case closing, read-only guard, closing documents, closing-pack hash | Close and Records tab, `Integration.closeCase`, `api.ts` |
| Gmail notification on new requests | `notify.ts` (needs `GMAIL_USER`, `GMAIL_APP_PASSWORD`) |
| Upload type confirmation | Upload → confirmation dialog |

## Open items (not changed in this pass)

| Item | Why |
|---|---|
| Emergency guarantee amount is typed by the owner | The hospital asks for it in a letter, and there is no "hospital payment request" document type for the reader yet. Adding one would let this amount come from a document too. |
| Gmail sending and the new anchoring paths against live services | Not run in the build environment (no Gmail credentials, no FISCO node); code paths are tested with fakes or skip cleanly |
| A2 through the UI, live models | Needs LLM keys in the environment (covered by the live evidence run of 18 Oct). |
| Real hospital confirmation, public deployment, video, two real Google accounts | — operational (TASKS 6.8, 7–10) |
