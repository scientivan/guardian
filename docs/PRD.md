# PRD: Deposit and Bill Guardian

Version 1.1, 17 October 2026. Owner: Dien. Status: scope and stack approved by Dien on 17 Oct 2026.

Competition: 2026 Shenzhen International FinTech Competition (FinTechathon), International Track (AI), **Topic C: Cross-border & Student Finance**. Theme: *AI as a Financial Participant*.

Labels used in this document: **[Fact]** has a source; **[Design]** is a team decision; **[Assumption]** is unverified and must not be presented as fact.

## 1. Product in one sentence

An AI agent on the patient family's side that reads a foreign hospital's bills, explains in plain language why the cost changed from the estimate, and pays deposits only to the hospital's verified account after each payer approves their own share.

- **Framing:** a *deposit and bill guardian*, not a fraud detector. Most bill changes have non-malicious causes (longer stay, complications, items outside the package). The agent explains; it does not accuse.
- **Core feature:** the bill explainer (problem M2). The other steps serve M1, M3, M4 and M5 in the same chain.

## 2. Users and roles

| Role | Who | Can | Cannot |
|---|---|---|---|
| Owner | Patient or main family member | Add members, set share limits, approve payments, request payee verification | Pay to an account outside the official registry, override the gateway |
| Payer / helper | Relative, friend, community or mosque fund | See a bill summary and their own share, approve or withdraw their own share | See full medical documents, approve for someone else, change payees |
| Companion | Family member at the hospital | Upload estimates and bills, ask questions | Approve payments |
| Agent | System | Read, explain, ask, prepare a payment request | Execute without approval, write a payee account, give medical advice |

Demo persona: an Indonesian family whose father is treated at a fictional international hospital in Shenzhen. Helpers are in Jakarta, Kuala Lumpur and Dubai, plus a mosque community fund. The demo scenario is China; the product is not China-only.

## 3. Problem

Parent problem: families of patients treated abroad must manage medical money (pay, understand, approve, recover) remotely, without tools, and under stress.

| # | Sub-problem | Evidence status | Product step |
|---|---|---|---|
| M1 | Hard to pay a hospital in the destination country | Partial | 3 |
| M2 | Bills are hard to understand and change from the estimate | Partial (hospital and regulator level) | 4, 6 (core) |
| M3 | Payee fraud (fake facilitator, "changed account") | Not established; built as a security defence | 2 |
| M4 | Emergency payment guarantee gathered fast from many helpers | Partial (real cases) | 5, 8 |
| M5 | Refund of unused deposit | Weak; tracking only, not pitched as a problem | 7 |

Key evidence (details in the internal research notes):

- [Fact] Mount Elizabeth Novena (Singapore): average estimate accuracy 72% (2023 data); 28% of bills outside the estimate range, in both directions.
- [Fact] Malaysian parliament PAC (25 Jun 2026): private hospitals bill basic items separately (pillow cases, alcohol swabs); drug markups "sometimes reaching 300%".
- [Fact] Gleneagles Penang, Penang Adventist, Bumrungrad: estimates are ranges, complications excluded, extra deposits requested during the stay.
- [Fact] Caixin (5 Feb 2026) names payment systems as a main barrier to medical travel to China. Guangdong designated 25 international-medical pilot hospitals (Mar 2026).
- [Fact] Emergency cases: hospitals in Bali and Chiang Mai required payment or a guarantee before treatment.
- [Fact] Limits: no patient-level prevalence figure published after Oct 2025; no verified case of account-replacement fraud in medical travel; the China foreign-patient deposit (预交金) and refund process is not verified. The China demo is simulated.

## 4. Product chain (8 steps)

1. **Estimate in.** Companion uploads an estimate (PDF or photo). Fields extracted.
2. **Payee check.** Account must be in the hospital's official registry (§6.2).
3. **Initial deposit.** FX quote, fee, method; owner approves; payment in sandbox.
4. **Bill explainer (core).** Group items, explain each difference by cause, flag duplicates, basic items billed separately, and prices above reference as questions for the hospital.
5. **Guarantee or top-up.** Request sent to payers and helpers; each approves their own share; payment runs only when approved shares cover the amount (§6.3).
6. **Final bill reconciliation.** Final bill vs deposits and interim bills; list of questions for hospital billing.
7. **Refund tracking.** Each payer sees their share of any refund, its status and due date; agent reminds when overdue.
8. **Recap.** Per-payer record (how much, for what, receipts, hashes).

## 5. Build scope

Approved by Dien on 17 Oct 2026.

| ID | Scenario | Build |
|---|---|---|
| D1 | Estimate in, initial deposit paid to the official account | Full |
| D2 | Interim bill, 40 items, stay 2 days longer than assumed; differences explained by cause | Full (core) |
| D3 | Basic items billed separately ("pillow case", "alcohol swab") become questions, not auto-paid | Full |
| D4 | Emergency guarantee: hospital asks for a guarantee, several helpers approve their shares in different currencies, payment runs once covered | Full |
| D5 | Final bill below deposit; refund split per contributor and tracked; reminder after due date | Light (status and simulated clock) |
| D6 | Colloquial message ("bayarin aja yg kemarin dong"); agent asks which bill and how much | Full |

Security tests A1–A7 are in `docs/TEST-PLAN.md`.

## 6. Functional requirements

### 6.1 Documents and explanation

| # | Requirement | Scenario |
|---|---|---|
| F1 | Upload estimate, interim and final bills (PDF, photo). Text-layer PDF read directly; photos through local OCR (Tesseract). Raw images never go to an LLM. | D1, D2 |
| F2 | Code-based PII removal before any LLM call; tokens such as `[PASIEN_1]`; token table stored separately; restore by role. | D2, A5 |
| F3 | Quarantined reader extracts items into a fixed schema; output validated, unknown fields dropped. | D2 |
| F4 | Comparator (code): estimate vs bill by category, stay length, items outside estimate, duplicates, basic items billed separately, above reference price, FX. All money math in code. | D2, D3 |
| F5 | Each explanation line cites the item ids it is based on and is typed as one of: **arithmetic fact** (from code), **likely cause stated in the document**, or **unknown, ask the hospital**. The agent never states a clinical cause the documents do not state. | D2, D3 |
| F6 | Selective second-model check (different provider) only for items above a threshold, flagged items, or items a family member questions. Disagreement turns the item into a question for the hospital. | D3 |
| F7 | Reference prices are labelled indicative (e.g. LIAM Jan 2026 ranges come from insured claims). A price above reference is a question, never proof of overcharging. | D3 |

### 6.2 Payee verification

| # | Requirement |
|---|---|
| F8 | Payees enter the registry only through an **independent enrollment channel**, never from an uploaded invoice or a chat message. Demo: the fictional hospital portal publishes its payee list signed with the hospital's key; the backend verifies the signature before enrolling. A payee copied from an invoice is matched against the registry, not enrolled from it. |
| F9 | Every account value carries a source label (`official_registry`, `user`, `hospital_doc`, `chat`). |
| F10 | Gateway blocks any payment to a payee outside the registry. Names are normalised (NFKC, invisible characters removed, look-alike letters rejected) and must match exactly. Nobody can override, including the owner; the way out is verification through the hospital's official channel. |
| F11 | A new or changed account opens an anomaly. All payments for the case stop until the anomaly is resolved through the official channel. |

### 6.3 Approvals and payments

| # | Requirement |
|---|---|
| F12 | Payment request states payee, amount (hospital currency), purpose, and an expiry time. |
| F13 | Each payer approves only their own share, within their share limit. Approved total can never exceed the requested amount. |
| F14 | **State machine:** `pending` → (`approvals cover amount`) → `executing` → `paid`; or `pending` → `expired` / `cancelled`. Nothing is charged while `pending`. When covered, each approved share is charged separately and sent to the hospital's registry account, so every helper pays the hospital directly and gets their own receipt. |
| F15 | A payer can withdraw their approval while the request is `pending`. A mistaken approval after `paid` can only be fixed through a hospital refund. |
| F16 | Cross-currency: each helper sees an FX quote from their currency (IDR, MYR, AED) to the hospital currency (CNY) with fee and quote expiry. Rates come from a demo table labelled as demo. |
| F17 | The agent can only prepare a request. Approval and execution are explicit user actions in the UI. |

### 6.4 Refund, recap, audit

| # | Requirement |
|---|---|
| F18 | Refund = deposits paid − final bill. Split in proportion to what each payer paid; rounding remainder to the largest payer. Status per payer: `requested`, `processing`, `received`; due date; reminder when overdue. |
| F19 | Recap per payer with amounts, purposes, receipts and document hashes. |
| F20 | Every action, approval and rejection is written to a hash-chained audit log. Document hashes and the log head are anchored to FISCO BCOS. |
| F21 | Agent asks a clarifying question whenever the bill, amount or payer is ambiguous. No payment action is prepared from an ambiguous message. |

## 7. Non-goals

- Medical advice, or judging whether a treatment is needed.
- Booking flights, hotels or doctors (more attack surface, no rubric value).
- Commercial insurance, loans, interest, or any interest-bearing product (team's sharia filter).
- Stablecoin payments or crypto escrow. [Fact] Mainland China bans these services (Yinfa 2026 No. 42); hospitals would not accept funds locked by a third party.
- Holding back emergency payments. The family always decides.
- Real hospitals, real accounts, real money. Everything is simulated or in test mode and labelled as demo.

## 8. Honest claims (for pitch and documents)

- A document hash proves the file was not changed after anchoring. It does not prove the hospital issued it or that the bill is correct.
- Two agreeing models can share the same blind spot when they read the same incomplete document.
- PII detection can miss unusual formats. Drug and procedure names stay visible, so a diagnosis can still be guessed; role masking is the second layer.
- Adjacent products exist: Lethe (AI bill audit with redaction and 2-of-3 models, no payment), Tiba (provider-side billing), HealthChain Nigeria (USDC held until the hospital confirms), Bumrungrad split payment. No checked product combines a bill explainer with verified cross-border deposit payment and per-helper approval. The search was not exhaustive.

## 9. Success criteria

1. Every in-scope scenario D1–D6 passes its script in `docs/TEST-PLAN.md` and leaves a log.
2. A1–A7 are rejected by code-level checks, with rejection logs.
3. No path pays without approval or to an account outside the registry, even when the LLM is manipulated.
4. Explanation accuracy on D2/D3 matches the answer key (totals exact; causes correct; no invented clinical causes).
5. Same case run through a generic LLM baseline shows fewer wrong statements and turns with the guardian (comparison in TEST-PLAN §4).
6. A judge can run the demo from a clean environment following the README.

## 10. Submission mapping

| Required or optional item | Built from |
|---|---|
| Technical document (required) | `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/TEST-PLAN.md` |
| Presentation deck ≤10 min (required) | PRD §1–5, demo results |
| Demo video ≤5 min (required) | D2 + D4 + one attack (A1) |
| Source code + README (optional) | this repo |
| Security self-assessment (optional) | ARCHITECTURE §1, §3.5, §4; TEST-PLAN §2 |
| Execution evidence (optional) | `logs/`, Stripe test IDs, FISCO BCOS transaction hashes |

All submission materials are in English. Deadline: 20 Oct 2026 23:59 Beijing time (22:59 WIB); team internal deadline 20 Oct 12:00 WIB.

## 11. Open items

1. FISCO BCOS: local Docker node (default) or public testnet.
2. Second-model provider and model name.
3. China 预交金 and refund process stays simulated unless verified.
