# Documentation and product audit, 20 October 2026

Historical pre-remediation snapshot. The findings below were subsequently addressed under [the remediation plan](AUDIT-REMEDIATION-PLAN.md). See [current verification](VERIFICATION.md) for the patched behavior and remaining limits.

Verdict — the main product flows exist, but the documentation is not fully supported by the implementation. In particular, the all-green assertions in VERIFICATION.md are too broad.

This is a verification report. No product code was changed. Findings distinguish reproduced behavior from static inspection and operational limits.

## Scope and proof

Read README.md, AGENTS.md and all ten existing documents in docs/. Compared the current PRD §12 amendments and API integration updates with server services, routes, UI pages, landing-page copy and stored execution evidence. Earlier versions were treated as historical where explicitly superseded.

Repository HEAD at inspection was `86694ef`. Later in the inspection, package.json was modified and bun.lock appeared in the shared workspace. This audit did not make those changes. Results describe the inspected files rather than claiming a frozen clean checkout.

Fresh checks passed

- `npm test` — 118 tests in 18 files.
- `npm run lint` — exit 0.
- `npx tsc --noEmit --incremental false` — exit 0.
- Chrome via Playwright on localhost:3000 — demo sign-in, Agent Office, Bill Review, Pledges, Refund Tracking, Case History, Case Members, Close and Records, How It Works, new-case wizard and Hospital Directory all opened.
- Browser API check as M_JKT — role was payer, item details were empty and approval arrays contained only that payer's own approvals.
- Bill Review at 390 × 844 — no horizontal document overflow.

Build was not rerun because an existing development server was running and the project explicitly warns against sharing .next between dev and build. This browser pass checks navigation and basic projection, not every financial action or every mobile page.

Fresh isolated reproductions use synthetic data, fake model responses, the sandbox charger and a temporary account directory that is deleted afterwards. No live charges, external messages or real patient records were used. The committed 18 Oct live evidence was read as historical evidence, not rerun or presented as fresh proof.

## Findings

### 1. High — payer privacy filtering misses system-generated audit rows

Claim — PRD §2 and VERIFICATION.md say a payer sees their own share and other payers' activity is removed server-side.

Code — `src/server/case-state.ts:108–118` removes other approval rows, but filters audit entries only by their actor's display name. `payments.ts` writes charge entries as actor `gateway`, with memberId, amount, currency and charge reference inside result.

Reproduced — execute R2 in an isolated demo case, then project it as M_JKT. Its audit rows still include M_KL's MYR charge, M_DXB's AED charge and M_OWNER's IDR charge, with their sandbox references. Hiding approval arrays does not remove this second disclosure path.

Recommended — apply a payer-specific allowlist to audit result fields and subjects, including system-generated events. Retest the full API response after execution, refund opening and notification events.

### 2. High — explanation guards do not enforce factual text or the no-diagnosis promise

Claim — PRD F5, ARCHITECTURE §3.3, VERIFICATION F5 and How It Works say no clinical cause is invented and arithmetic comes from code.

Code — `src/server/explain.ts:88–141` allows any number occurring anywhere in the facts. It does not require the prose to use the cited cause's amount or days. Its clinical check is a finite English regex. A valid citation and causeRef do not establish that the sentence is true.

Reproduced with a fake model response — for the true longer-stay cause of 2 extra days and CNY 3,000, the guard accepted “The stay is 5 days longer, adding CNY 34,000.” The result's numeric amount remained 300000 minor units while its text said 34,000. It also accepted “The patient has cancer.” as an unknown_ask_hospital line, although no such diagnosis was in the fixture.

This demonstrates guard acceptance, not a claim that a live provider spontaneously returned these sentences. It disproves the unconditional prevention claim.

Recommended — render arithmetic prose from the validated cause structure and constrain stated-document lines to their actual source. Use tightly bounded question templates or qualify the medical-content guarantee. A broader keyword list alone does not prove semantic correctness.

### 3. High claim mismatch — Stripe does not route funds to the registry account

Claim — PRD F14, ARCHITECTURE §3.6 and website How It Works say each charged share goes straight to the hospital's verified account. PaymentSheet also says a share was charged and sent to the hospital.

Static evidence — `src/server/stripe.ts:12–24` creates a test PaymentIntent with `pm_card_visa`. payeeId is metadata only. Neither the hospital bank account nor a connected Stripe destination is supplied to Stripe. `ChargeInput` itself has a payeeId rather than a settlement destination. Demo execution returns a generated sandbox reference.

The registry and gateway restrict the simulated intended recipient. They do not demonstrate bank settlement or a Stripe destination transfer. Existing test-mode disclaimers are helpful but do not make the direct-routing mechanism implemented.

Recommended — state that this version validates the intended recipient and simulates separate charges. A real direct-payment claim needs an adapter that binds the verified account to an actual destination and evidence of that behavior. Current receipt references are test PaymentIntent IDs or sandbox IDs, not hospital-issued receipts. Uploaded hospital invoices are separate artifacts.

### 4. High — known patient names are not tokenised in free chat

Claim — PRD F2 and ARCHITECTURE §4 include known patient/member names before any LLM call. VERIFICATION marks this complete.

Code — document ingestion passes known case names to scrub. `src/server/agent.ts:147` instead calls `scrub(message)` without those names. Chat state also includes request purpose text without a separate scrub of that field.

Reproduced — an isolated demo chat containing “Budi Santoso needs help” sent Budi Santoso to the fake model endpoint in its prompt. This is a supported, already-known patient name rather than an unusual format covered by the documented limitation.

Recommended — use the case name/token context in every model-input path and inspect the full assembled prompt, including state fields. Review human evidence payloads separately before repeating a universal “any LLM” promise.

### 5. Medium — explanation GET can spend model quota outside the rate limit

Claim — DEPLOY §8 describes protection for routes that spend AI quota.

Code — `src/server/rate-limit.ts:36–42` accepts only POST. `src/server/api.ts:128–132` also serves explanation on GET, and `Integration.explanation` calls secondCheck and explain when no cached explanation exists.

Reproduced classifier result — explanation GET is not limited, while explanation POST is limited. Static call tracing confirms that a cache miss may call models. This is not a measured quota-exhaustion attack.

Recommended — make GET cached/read-only and use a limited POST for generation, or include every model-generating GET in the policy. Also reconcile the closed-case read-only promise with generation through this GET path.

### 6. Medium — viewing a closed case can append new audit records

Claim — PRD §12 and TASKS Current state describe a case as read-only after closing, with chat explicitly excepted in architecture and code.

Code — `projectCase` calls `refundStatus`, which writes reminded_at and appends refund.reminder when a refund becomes overdue. The mutation guard only gates non-GET routes.

Reproduced — execute R2, reconcile the normal final bill, attach invoices and close. Simulate 15 days passing by overriding Date.now only during the read. Calling view added four refund.reminder rows, moving the count from 32 to 36. No new payment or refund-status action was requested.

Recommended — decide whether immutable closure includes reminder/audit state. Either freeze it, or document permitted post-closure events and distinguish the anchored closing head from later history. Chat is already an intentional exception, so a claim that absolutely nothing changes would also be inaccurate.

### 7. Medium — the documented persistent PII token mapping is incomplete

Claim — ARCHITECTURE §4 promises stable value-to-token mapping across a case and restoration by role.

Code — every `scrub` call starts counters from one. `storeTokens` inserts with INSERT OR IGNORE into a case/token key. `restore` exists but repository search found no production call site, only its unit test.

Reproduced — two separate scrubs of alpha@example.com and beta@example.com both emit [EMAIL_1]. After storing both in one case, restoring that token returns alpha@example.com. This establishes ambiguous persistence. The current web UI does not call restore, so this report does not claim an observed wrong-identity rendering there.

Recommended — allocate tokens from the persistent case mapping and either wire role-specific restoration into display paths or describe the current token-only behavior accurately.

### 8. Low — hospital onboarding documentation contradicts itself

`docs/HOSPITAL-DIRECTORY.md` Profile onboarding correctly says directory selection is mandatory and missing hospitals wait for review. Its Public hospital seed section at line 101 still says the wizard offers private manual entry.

Current `HospitalPicker.tsx` requires a listed/verified directory choice or a pending proposal. `api.ts` rejects Google case creation without hospitalDirectoryId. The older manual-entry description is stale.

`docs/API.md` also retains a version-1.2 payment-balance description that subtracts requests for the selected document. Current `payment-plan.ts` subtracts all live case requests and allows estimate-based deposits, consistent with PRD §12 and TASKS Current state. The contract should clearly supersede that older paragraph.

Recommended — remove contradictory descriptions and refresh VERIFICATION.md after the material findings above are addressed. No blanket all-green declaration is supported by this audit.

### 9. Low — landing-page examples do not consistently match their own numbers

`src/components/landing/Capabilities.tsx:56` plots the bill marker at 32,700 while the visible total says CNY 36,782. The estimate range is 30,000–34,000, so the illustration visually places an over-range bill inside that range.

The same component lists Sari's CNY 15,000 as MYR 9,750, while the configured rate is 0.59 MYR per CNY. That gives MYR 8,850 before the 1% demo fee, or 8,938.50 with it. The component comment says these examples match the seed and scenarios.

Recommended — derive the visual marker and example conversions from shared values, and state consistently whether an amount includes the fee.

## Requirement coverage

“Present” means a concrete implementation path exists. It does not assert a formal guarantee or a fresh live-service pass.

| Requirement area | Assessment |
|---|---|
| F1 upload, text PDF and local photo OCR | Present. OCR is English-only. Scanned PDFs request another upload rather than automatic page-image OCR. Photo quality is already documented as secondary. |
| F2 PII protection | Partial. Document path scrubs known names. Chat and persistent mapping have findings 4 and 7. |
| F3 quarantined reader and schema | Present. No payment tools in the reader. Schema validation cannot establish source-document truth. |
| F4 deterministic comparison | Present for implemented category/stay/duplicate/basic-item logic. Above-reference checks use demo data. Google cases explicitly use no configured reference table. |
| F5 cited explanation | Present, but factual enforcement is incomplete under finding 2. |
| F6 selective independent check | Present automatically and through Double-check. Can skip when an independent provider is unavailable. A single configured key does not establish an independent check. |
| F7 indicative references | Present in UI and data, conditional on reference data being configured. |
| F8–F11 independent enrollment and payee checks | Implemented as signed fixture or human-reviewed directory authority. Real hospital verification remains an operational step. |
| F12–F15 requests, own approval, limits, withdrawal and state machine | Present. Recipient settlement is simulated as described in finding 3. Payer audit privacy has finding 1. |
| F16 FX | Present as a demo rate table and code conversion. No live FX or cross-border settlement. |
| F17 and F21 agent prepares, clarification | Present with fixed intents and explicit user execution. Free chat still uses an older bill-specific paid-balance calculation, while final createRequest validates against the newer global payment plan. A prepared suggestion can therefore be rejected at creation rather than representing the current payable balance. |
| F18 refund allocation/status/reminders | Present as tracking and demo statuses. Follow-up records an audit event, not an external hospital message. No scheduled reminder worker or real refund settlement integration. |
| F19 per-payer payment record | Present in-app, JSON and printable closing documents. Test charge references should not be called hospital settlement proof. |
| F20 audit and anchors | Local hash chain present. Document, invoice, log, closing-pack and directory anchor call paths exist. Anchoring is best effort and may return null. New paths were not freshly tested against a live chain. |
| Google and invitations | Session/account isolation and invitation flows present, covered by existing tests. This run did not perform a new Google consent exchange with two real accounts. |
| Human Verification Desk | Review, signature/key checks, separate profile/payment authority, holds and allowlist implemented. This run did not onboard a real institution or rerun every admin screen. |
| Closing | Present with required final bill, invoices and no open requests. Post-closure view mutations have finding 6. |
| D1–D6 and A1–A9 | Existing script tests and historical evidence available. Passing these fixtures does not prove all security or semantic claims for arbitrary inputs. |

## Intentional scope and unresolved proof

These are not newly discovered missing features

- Emergency guarantees use a typed amount. There is no guarantee-letter reader type, explicitly documented in PRD §12 and open items.
- Invoice files are intentionally viewable by all members under PRD §12, although PRD §2 broadly promises payer medical privacy. No invoice redaction is applied. The probe confirms raw bytes are returned to a payer. The product needs a precise receipt-only rule or explicit privacy exception, since an uploaded invoice could contain medical details.
- Google cases cannot simulate refund received/processing updates. Only demo cases can. Real hospital updates are not integrated.
- Gmail notifications require configuration and accepted payer email addresses. The flow exists, but delivery was not tested here.
- FISCO is optional/local. A hash proves integrity relative to an anchor, not issuer authenticity or bill correctness. Live status of invoice and closing anchors remains unverified here.
- Public deployment, real hospital confirmation, dialogue-turn measurement, video and submission still need their own proof. Documentation says these are open and they are not established by local browser navigation.

The architecture's “every value carries provenance” wording is stronger than implementation. The code uses source fields on payee claims and inputSources on audit operations. Reader item descriptions and planner fields are ordinary strings, without general per-value information-flow enforcement. This is a quarantine-inspired architecture, not a full CaMeL implementation or a proof that untrusted strings cannot affect planner prose.

## Reproduction artifacts

- `evidence/docs-audit-2026-10-20/probe.ts` — isolated semantic, privacy, closure, rate-classifier and token probes. Run from guardian with `node --import tsx evidence/docs-audit-2026-10-20/probe.ts`.
- `evidence/docs-audit-2026-10-20/probe-results.jsonl` — captured results.
- `evidence/docs-audit-2026-10-20/browser-results.json` — recorded browser smoke results.
- `evidence/docs-audit-2026-10-20/browser.cjs` — navigation and payer API smoke check. Requires Playwright and Chrome. Set PLAYWRIGHT_MODULE to the installed Playwright module path if it is outside this repository. This run used `/tmp/guardian-browser/node_modules/playwright` and the existing localhost server.

A candidate refund calculation concern was discarded. It required injecting a parsed no-line-item bill directly into the database, whereas document ingestion rejects nonzero bills whose lines do not sum to the total. It is not reported as an observed upload-path defect.
