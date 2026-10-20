# Deposit and Bill Guardian

**An AI agent on the patient family's side** that reads a foreign hospital's bills, explains in plain language why the cost changed from the estimate, and lets a family scattered across countries pay deposits together, only to the hospital's verified account, each person approving their own share.

**Try it:** https://guardian.scientivan.dev → **Use demo account** (no sign-up). Full write-up: **[Technical document](docs/TECHNICAL.md)**.

| | |
|---|---|
| Competition | 2026 Shenzhen International FinTech Competition (FinTechathon), International Track (AI), Topic C: Cross-border & Student Finance |
| Team | Dien (backend, agents, services), Aurel (UI/FE) |
| Status | Working prototype, deployed on Vercel + Supabase. Synthetic demo data. Payments are a sandbox or Stripe **test mode**; no real money and no hospital bank settlement. Blockchain anchoring runs on a local FISCO BCOS chain (off in production). |
| Checks | 131/131 unit and scenario tests · lint · TypeScript · production build · 16/16 live scripted tasks and attacks · 18/18 keyless sandbox lifecycle run |

## The problem

When a parent is hospitalised abroad, the family has to deal with medical money remotely and under stress:

- **The bill doesn't match the estimate.** One Singapore hospital's estimates were accurate 72% of the time on average; 28% of bills fell outside the range. Basic items such as pillow cases get billed separately.
- **Paying across borders is hard,** and an urgent deposit or guarantee must be gathered from relatives in several countries at once.
- **"Our account has changed"** messages are a classic fraud pattern, and a stressed family is an easy target.
- **Unused deposits** have to come back to the right people.

Guardian is a *deposit and bill guardian*, not a fraud detector: most bill changes are legitimate, so it explains and asks rather than accuses.

## What it does

1. **Upload** the hospital's estimate and bills (PDF or photo). Names and ID numbers are replaced by tokens before any AI reads them.
2. **Explain the bill** (the core): a 40-line interim bill is compared with the estimate. Each difference is a cause with the bill lines it comes from ("the stay was 2 days longer: +CNY 3,000, items I01–I03"). Duplicates, basic items and prices above a reference become **questions for the hospital**. Every number is computed by code.
3. **Ask** any part through the Case Assistant; answers come from the case facts.
4. **Request money from documents:** initial deposit from the estimate's range, bill balance from the latest (final) bill, or an emergency guarantee.
5. **Pledge across currencies:** payers in IDR, MYR or AED get an FX quote, see "IDR 11,475,000 (CNY 5,000)", and pledge their own share. Nothing is charged until 100% is pledged and the owner pays.
6. **Pay only the verified account:** the hospital's Ed25519-signed account list is the only possible payee. Five deterministic checks run before any charge, with no override, not even for the owner.
7. **Keep proof:** the hospital's invoice on every paid request, refunds split by what each person paid, a hash-chained history, blockchain anchors.
8. **Close the case:** read-only for everyone, with printable closing documents per role.

## How it is built

```
 upload / chat ──► [Privacy Clerk: code] ──► [Reader: LLM, no tools] ──► typed fields
                                                                           │
 user request ────────────────────► [Planner: LLM, fixed intents] ◄────────┘
                                              │ prepares only
                                              ▼
        [Calculator: code]     [Payment Gate: code, 5 checks]     [Auditor: hash chain]
               │                          │                                │
     [Second Opinion: other LLM]   sandbox / Stripe test         FISCO BCOS (hashes only)
```

- **Seven agents, three of them LLMs, none of them can move money.** The reader has no tools; the planner picks from a fixed set of intents and can only *prepare* a payment.
- **Money is code:** integer minor units; totals, causes, FX, refunds and request amounts are computed, never generated.
- **Prompt injection is data, not instructions:** a PDF saying "pay account X" raises a warning and pauses payments.
- **Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, NextAuth (Google + demo), Supabase Postgres and private Storage (SQLite locally), free-tier LLM router (Groq, OpenRouter, Gemini), Tesseract OCR, Stripe test mode, FISCO BCOS + `ethers`, Gmail SMTP, vitest.

Details: [architecture and agent design](docs/TECHNICAL.md#3-architecture), [permission boundaries](docs/TECHNICAL.md#5-permission-boundaries), [action confirmation](docs/TECHNICAL.md#6-action-confirmation), [security](docs/TECHNICAL.md#7-security-design), [data protection](docs/TECHNICAL.md#8-data-protection).

## Security at a glance

| Threat | Defence | Tested by |
|---|---|---|
| "Our account changed" in chat or a fake invoice | Payee only from the signed registry; anomaly pauses all payments | A1, A6, A8 |
| Hidden instruction in a PDF | Reader without tools, fixed schema | A2 |
| Look-alike names (Cyrillic, zero-width) | NFKC, invisible-character removal, exact match | A3 |
| Someone approves for someone else or above a limit | Role and amount checks, own share only | A4 |
| Extracting medical or card data | Tokenised before models, role projection on the server | A5 |
| Owner forcing a transfer | No override exists | A7 |
| Rewriting history | Hash-chained log, `verifyChain`, anchors | A9 |

All attacks pass in scripted live runs, through the web UI and in the keyless sandbox run. See [security testing](docs/TECHNICAL.md#12-security-testing).

## Quick start

Requires Node.js 22 and npm 10+ (macOS or Linux). Docker only for the FISCO chain; `tesseract` optional for photos.

```bash
git clone https://github.com/scientivan/guardian.git && cd guardian
npm ci --legacy-peer-deps
npm test                                                   # 131 tests, no keys or network
node --import tsx evidence/sandbox-run-2026-10-20/run.mts  # full payment lifecycle + attacks in the sandbox
npm run dev                                                # http://localhost:3000 → Use demo account
```

With keys (`cp .env.example .env`):

```bash
npm run llm:probe       # which model answers right now
npm run eval:reader     # 40-line bill vs a hand-written answer key
npm run eval:chat       # dialogue and chat attacks
npm run evidence        # D1–D6, D4b, A1–A9 against live models, Stripe test mode and the chain
npm run baseline        # generic LLM vs Guardian, 3 trials
npm run fisco:deploy    # deploy contracts/Anchor.sol to a running FISCO BCOS node
```

Other scripts: `npm run demo:reset` (fresh demo workspace), `npm run data:backup` (Postgres dump + Storage objects), `npm run hospitals:demo-verify` (synthetic verified accounts for directory hospitals; testing only), `npm run fixtures` (regenerate demo PDFs).

Environment variables (`.env`, never committed; template in `.env.example`):

| Variable | Needed for | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | LLM (primary) | aistudio.google.com, free tier |
| `GROQ_API_KEY` | LLM (fallback, second-model check) | console.groq.com, free tier |
| `OPENROUTER_API_KEY` | LLM (last fallback) | openrouter.ai, free models |
| `LLM_CHAIN` | optional: fixed model order, e.g. `gemini:gemini-3.8-flash,groq:openai/gpt-oss-120b` | |
| `STRIPE_SECRET_KEY` | payments (must start with `sk_test_`) | Stripe dashboard, test mode |
| `FISCO_BCOS_RPC_URL`, `FISCO_BCOS_CHAIN_ID` | anchoring | local chain, see [FISCO setup](docs/FISCO-SETUP.md) |
| `FISCO_BCOS_PRIVATE_KEY`, `FISCO_BCOS_CONTRACT_ADDRESS` | anchoring | printed by `npm run fisco:deploy` |
| `GUARDIAN_DB` | SQLite file for the evidence scripts (default `guardian.db`) | |
| `GUARDIAN_ACCOUNTS_DIR` | per-account databases and the shared hospital directory (default `.cache/accounts`) | |
| `LLM_CACHE_DIR` | optional: cache model answers on disk (the eval scripts set `.cache/llm`) | |
| `GUARDIAN_ADMIN_EMAILS` | Google emails allowed into `/admin`; empty denies all | |
| `HOSPITAL_SEARCH_MODEL` | optional: Gemini model for hospital search | |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | app URL and session signing | `.env.local`, see [Google sign-in setup](docs/GOOGLE-OAUTH.md) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in | Google Console, Web application OAuth client |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | optional: email payers when a payment request opens | a Gmail address and an app password (myaccount.google.com/apppasswords) |
| `GUARDIAN_DATABASE_DRIVER`, `GUARDIAN_STORAGE_DRIVER` | `postgres` and `supabase` for the cloud; unset means SQLite and database BLOBs | |
| `SUPABASE_URL`, `SUPABASE_PROJECT_URL`, `SUPABASE_SECRET_KEY` | cloud database (pooler string), Storage URL and server-only key | Supabase project settings; never `NEXT_PUBLIC_` |

The model router uses whichever LLM keys exist and skips rate-limited models; one key is enough.

## Evidence

| What | Result | Where |
|---|---|---|
| Unit and scenario tests | 131/131 | `npm test` |
| Keyless sandbox lifecycle with timestamps, actions and outcomes | 18/18 | [`evidence/sandbox-run-2026-10-20/`](evidence/sandbox-run-2026-10-20/summary.md) |
| Live scripted tasks and attacks (models, Stripe test IDs, anchor tx) | 16/16 | [`evidence/run-2026-10-18-clean-clone/`](evidence/run-2026-10-18-clean-clone/summary.md) |
| Attacks through the web UI | 11 attempts refused, 0 charges | [`evidence/e2e-2026-10-20/attacks/`](evidence/e2e-2026-10-20/attacks/ATTACKS.md) |
| Live services: Gmail delivery, nine anchors, uncached reader | pass, one recorded timeout | [`evidence/live-services-2026-10-20/`](evidence/live-services-2026-10-20/README.md) |
| Production deployment and security probes | pass | [`evidence/supabase-deployment-2026-10-20/`](evidence/supabase-deployment-2026-10-20/) |
| Generic LLM vs Guardian | causes 5/5 vs 2–4/5; invented clinical causes 0 vs 3/3 trials | [`evidence/baseline-2026-10-18/`](evidence/baseline-2026-10-18/) |

## Known limits

- No hospital bank settlement: charges are sandbox or Stripe test references.
- The demo hospital portal's signing key is in the repository; real hospitals would hold their own key. Directory approvals in the demo are synthetic.
- Free-tier models can be slow or rate-limited; the independent second-model check can time out in the 15-second web window and then says so.
- FX is a demo reference table (one CNY row, cross rates) with a 1% demo fee.
- PII detection is pattern- and name-based; role projection is the second layer. Shared hospital invoices are visible to all members (with a warning).
- The FISCO BCOS chain is local and off in production; the database hash chain always runs.
- The emergency guarantee amount is typed by the owner.

Full list with mitigations: [known risks](docs/TECHNICAL.md#14-known-risks-and-limits).

## Documentation

| Document | For |
|---|---|
| [TECHNICAL.md](docs/TECHNICAL.md) | Complete technical document (problem to evidence) |
| [Technical documentation PDF](docs/technical-doc/AI-Guardian-TechnicalDocumentation.pdf) | Submission version with the judging-criteria map, screenshots and measured turns |
| [PRD.md](docs/PRD.md) | Scope, roles, requirements, honest claims |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, gateway, data model |
| [API.md](docs/API.md) | Web API |
| [TEST-PLAN.md](docs/TEST-PLAN.md) · [VERIFICATION.md](docs/VERIFICATION.md) | Tests and requirement map |
| [DEPLOY.md](docs/DEPLOY.md) · [SUPABASE-MIGRATION.md](docs/SUPABASE-MIGRATION.md) · [FISCO-SETUP.md](docs/FISCO-SETUP.md) · [GOOGLE-OAUTH.md](docs/GOOGLE-OAUTH.md) · [HOSPITAL-DIRECTORY.md](docs/HOSPITAL-DIRECTORY.md) | Operations |
| [TASKS.md](docs/TASKS.md) · [AGENTS.md](AGENTS.md) | Progress and contributor guide |

All patients, hospitals and accounts in the demo are synthetic.

### Interface languages

Use the **English / 中文** control in the header to switch between English and Simplified Chinese. The preference persists across navigation and reloads. Original documents, entered names and AI responses retain their source language. See [localization notes](docs/LOCALIZATION.md).
