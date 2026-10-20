# Deposit and Bill Guardian

An AI agent on the patient family's side that reads a foreign hospital's bills, explains in plain language why the cost changed from the estimate, and pays deposits only to the hospital's verified account after each payer approves their own share.

- **Track:** 2026 Shenzhen International FinTech Competition (FinTechathon), International Track (AI)
- **Topic:** C, Cross-border & Student Finance
- **Team:** Dien (backend, agent, services), Aurel (UI/FE)
- **Status:** backend, agent and frontend work end to end. Google accounts have private care-case data. A separate demo account opens a seeded workspace without Google login. Hospital Directory and the human Verification Desk support proposals, AI evidence checks, separate profile/account approval, holds and verification-hash anchoring. Institutional confirmation still requires human work and hospital cooperation. Payments remain sandbox or Stripe test mode.

> Fixture patients, hospitals and account numbers are synthetic. Directory proposals require human verification. Payments use the isolated demo sandbox or Stripe **test mode** only.

## 1. What it does

1. **Estimate in.** A family member uploads the hospital's estimate (PDF or photo).
2. **Payee check.** Payments can only go to accounts from the hospital's signed payee list.
3. **Initial deposit.** FX quote per payer, owner approval, Stripe test charge.
4. **Bill explainer (core).** A 40-line interim bill is compared with the estimate; each difference is explained by cause and cited to bill lines. Duplicates, basic items billed separately and prices above an indicative reference become questions for the hospital, not accusations.
5. **Emergency guarantee.** Helpers in other countries (IDR, MYR, AED) each approve their own share; nothing is charged until the approved shares cover the amount; each share is a separate charge to the hospital.
6. **Final bill and refund.** The refund is split in proportion to what each person paid and tracked with reminders.
7. **Recap.** Each payer gets their own record with receipts and document hashes.

## 2. Architecture

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

- **The LLM never decides a payment.** A deterministic gateway (`src/server/gateway.ts`) runs five checks: payee in the official registry, exact normalized name, role, amount and share limit, no open anomaly. There is no override, including for the owner.
- **Instructions and data are separated** (CaMeL pattern). The reader that sees documents has no tools; the planner never sees raw document text.
- **Money math is code only.** The LLM writes words; totals, causes, FX and refunds come from code.
- **PII is replaced by tokens before any LLM call** and restored by role for display.
- **Every action is in a hash-chained audit log**; document hashes and the log head are anchored on FISCO BCOS.

Details: `docs/ARCHITECTURE.md`, `docs/PRD.md`, `docs/API.md`, `docs/TEST-PLAN.md`.

| Path | What |
|---|---|
| `src/server/gateway.ts`, `payments.ts`, `fx.ts`, `stripe.ts` | Payment checks, state machine, FX quotes, Stripe test charges |
| `src/server/portal.ts`, `enrollment.ts` | Hospital portal mock with Ed25519-signed payee list; registry enrollment |
| `src/server/extract.ts`, `pii.ts`, `reader.ts`, `documents.ts` | Local text extraction / OCR, PII scrubbing, quarantined reader, intake |
| `src/server/compare.ts`, `analysis.ts`, `explain.ts`, `secondcheck.ts` | Comparator, cited explanation with guards, second-model check |
| `src/server/agent.ts` | Chat planner: intents, clarification, chat attack checks |
| `src/server/refunds.ts`, `recap.ts`, `clock.ts` | Refund split and reminders, per-member recap, demo clock |
| `src/server/audit.ts`, `anchor.ts`, `contracts/Anchor.sol` | Hash-chained audit log, FISCO BCOS anchoring |
| `src/server/llm.ts` | Router over free-tier LLM providers with rate-limit fallback |
| `src/server/fixtures/`, `fixtures/pdf/` | Synthetic documents and hand-written answer keys |
| `evidence/` | Snapshots of live runs for judges |

## 3. Environment and dependencies

- **OS:** macOS 14+ or Linux. Tested on macOS (Apple silicon).
- **Runtime:** Node.js 22 or later (tested with 24.10), npm 10+.
- **Docker:** needed only for the FISCO BCOS chain.
- **Optional:** `tesseract` (photos via OCR; `brew install tesseract` or `apt install tesseract-ocr`). Text-layer PDFs need nothing extra.
- **Main libraries:** Next.js 15, TypeScript, `better-sqlite3`, `zod`, `stripe`, `ethers`, `unpdf`, `pdf-lib`, `vitest`.

Environment variables (`.env`, never committed; template in `.env.example`):

| Variable | Needed for | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | LLM (primary) | aistudio.google.com, free tier |
| `GROQ_API_KEY` | LLM (fallback, second-model check) | console.groq.com, free tier |
| `OPENROUTER_API_KEY` | LLM (last fallback) | openrouter.ai, free models |
| `LLM_CHAIN` | optional: fixed model order, e.g. `gemini:gemini-3.8-flash,groq:openai/gpt-oss-120b` | |
| `STRIPE_SECRET_KEY` | payments (must start with `sk_test_`) | Stripe dashboard, test mode |
| `FISCO_BCOS_RPC_URL`, `FISCO_BCOS_CHAIN_ID` | anchoring | local chain, see §4.3 |
| `FISCO_BCOS_PRIVATE_KEY`, `FISCO_BCOS_CONTRACT_ADDRESS` | anchoring | printed by `npm run fisco:deploy` |
| `GUARDIAN_DB` | SQLite file for the evidence scripts (default `guardian.db`) | |
| `GUARDIAN_ACCOUNTS_DIR` | per-account databases and the shared hospital directory (default `.cache/accounts`) | |
| `LLM_CACHE_DIR` | optional: cache model answers on disk (the eval scripts set `.cache/llm`) | |
| `GUARDIAN_ADMIN_EMAILS` | Google emails allowed into `/admin`; empty denies all | |
| `HOSPITAL_SEARCH_MODEL` | optional: Gemini model for hospital search | |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | app URL and session signing | `.env.local`, see [Google sign-in setup](docs/GOOGLE-OAUTH.md) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in | Google Console, Web application OAuth client |

The router uses whichever LLM keys are present and skips a model that is rate-limited, so one key is enough to run.

## 4. Installation and execution

### 4.1 Without any keys (code-level tests)

```bash
git clone https://github.com/scientivan/guardian.git
cd guardian
npm ci
npm test            # 95 tests covering the core, authentication, isolation, hospital verification and rate limits
npm run fixtures    # regenerates the demo PDFs in fixtures/pdf/
```

The unit tests replace LLM, Stripe and chain calls with local fakes, so they need no network.

To open the UI, run `npm run dev` and visit `http://localhost:3000`. Open App enters the Dashboard at `/projects` (care cases, invitation requests and the hospital directory). Start a care case opens the five-step wizard at `/projects/new`. Sign in with Google for your own private workspace, or use the demo account to explore a seeded case without Google. Keep OAuth credentials in `.env` or `.env.local` following [sign-in setup](docs/GOOGLE-OAUTH.md). The case office fills the available viewport, with the team on the right and activity along the bottom. Other case pages scroll normally.

### 4.2 With keys (live LLM and Stripe test mode)

```bash
cp .env.example .env    # then fill in the keys from §3
npm run llm:probe       # shows which model answers right now
npm run eval:reader     # reads the fixture PDFs and scores them against the answer key
npm run eval:explain    # bill explanation (English and Indonesian) + second-model check
npm run eval:chat       # 10 dialogue and chat-attack cases
```

LLM replies are cached in `.cache/llm/`, so reruns return the same text and do not use free-tier quota. Delete the folder to call the models again.

### 4.3 FISCO BCOS chain (anchoring)

A 4-node FISCO BCOS v3.17.1 chain runs in Docker with its web3 RPC on `127.0.0.1:8545`. Full steps, including a workaround for the build script's CDN, are in `docs/FISCO-SETUP.md`. Short version once the chain is up:

```bash
npm run fisco:deploy    # compiles and deploys contracts/Anchor.sol; copy the two printed values into .env
```

Without the chain, everything else still runs; anchoring returns `null` and the local hash chain keeps working.

### 4.4 Full evidence run

```bash
npm run evidence        # D1–D6, D4b, A1–A9 against the live router, Stripe test mode and the chain
npm run baseline        # generic LLM vs guardian on the same bill, 3 trials
```

Output goes to `logs/evidence/<run>/summary.md` and `logs/baseline/`. Committed snapshots are in `evidence/`.

### 4.5 Web app

```bash
npm run dev             # http://localhost:3000
```

The UI calls authenticated Next.js API routes described in `docs/API.md`. Backend tables own payment and refund state. Each Google account starts empty, with access to shared cases only after accepting an email-bound invitation. Demo execution uses an isolated sandbox charger. Google execution uses the existing Stripe test adapter, and only hospitals with a pinned official channel and key can enroll payees. Reference FX quotes are not live-market rates.

Hospital profiles are available at `/hospitals`. Human administrators enter `/admin` using a Google account listed in the ignored `GUARDIAN_ADMIN_EMAILS` configuration. Empty configuration denies access. The profile dropdown exposes Verification Desk only to authorized accounts. See [Hospital Directory setup and verification](docs/HOSPITAL-DIRECTORY.md) for onboarding, independent AI review, signed account lists, key rotation, incident holds and trust boundaries.

## 5. Testing

| Command | Covers | Last result |
|---|---|---|
| `npm test` | Unit and scenario tests with fakes | 95 passing |
| `npm run evidence` | D1–D6, D4b, A1–A9 live | 16/16 from a fresh clone (`evidence/run-2026-10-18-clean-clone/summary.md`) |
| `npm run eval:reader` | 40-item bill reading vs answer key | 40/40 items, total and causes match |
| `npm run eval:chat` | Clarification, colloquial input, chat attacks | 10/10 |
| Attacks through the web UI | A1, A4, A5, A7, A9 on a fresh demo account | all rejected (`evidence/e2e-2026-10-20/attacks/ATTACKS.md`) |
| `npm run baseline` | Generic LLM vs guardian | `evidence/baseline-2026-10-18/` |

Scripted tasks (D) and attacks (A) are defined in `docs/TEST-PLAN.md`. Answer keys were written by hand before any LLM run (`src/server/fixtures/answer-keys.ts`).

Known limitations:

- Free-tier LLMs are rate-limited (e.g. Groq 8,000 tokens per minute per model; OpenRouter free models 50 requests per day). Long prompts can hit 429 or 503; the router falls back, document reading waits once for a cooldown, and the cache avoids repeat calls. Two full uncached `evidence` runs a few minutes apart can still exhaust the free quotas; wait about a minute between runs.
- Photo OCR is a secondary path; the demo uses text-layer PDFs.
- FX rates and the 1% fee are a demo table, not market rates. Stripe test mode does not simulate cross-border settlement.
- The hospital portal is a mock: its signing key is in the code (`src/server/portal.ts`), so anyone reading the repo could sign a payee list. In real use only the hospital holds that key.
- The FISCO BCOS chain is local; tx hashes are not on a public explorer.
- PII detection is pattern- and name-based and can miss unusual formats; role masking is the second layer.

## 6. Repository and deployment

- **Repository:** https://github.com/scientivan/guardian
- **Live demo:** not deployed yet.
- **Deployment:** local by default (SQLite files, local chain). VPS steps with HTTPS, backups and AI rate limits are in [`docs/DEPLOY.md`](docs/DEPLOY.md). No real accounts or money.
- **Demo reset:** `npm run demo:reset` removes demo workspaces so the next demo sign-in starts from the seeded case.

## 7. Security notes

- **Roles:** owner (creates and cancels payment requests, approves), payer/helper (approves or withdraws only their own share, within a limit), companion (uploads, asks; cannot approve), agent (reads, explains, prepares; cannot approve or execute).
- **Confirmation:** the agent can only prepare a payment. Creating, approving and executing are explicit user actions. Each payer approves an FX quote for their own share; quotes expire after 15 minutes and requests expire on their own timer.
- **Payee trust:** accounts come only from the hospital's signed list. Accounts in invoices or chat are matched against the registry and never enrolled; a new or changed account opens an anomaly that pauses all payments until the family checks with the hospital's official channel.
- **Prompt injection:** the reader has no tools and a fixed schema; the planner sees typed facts only; explanation lines with numbers not in the facts, uncited lines, or clinical causes the document does not state are dropped.
- **Data:** PII is tokenised before any LLM call; token values stay in the local DB; payers never see medical identifiers; nobody but the owner sees card numbers.
- **Audit:** every check, approval, denial and charge is written to a hash-chained log; tampering is detected (`verifyChain`, test A9).
- **Secrets:** only test keys; `.env` is git-ignored; `stripe.ts` refuses any key that is not `sk_test_`.
