# Task tracker

Internal deadline: **20 Oct 2026 12:00 WIB**. Official deadline: 20 Oct 2026 23:59 Beijing time (22:59 WIB); use the earlier published time.

Owners: **Dien** (backend, agent, API, services) and **Aurel** (UI/FE). FE ↔ BE contract: `docs/API.md`. Status: `todo`, `doing`, `done`, `blocked`.

## 0. Decisions and admin

| # | Task | Owner | Status |
|---|---|---|---|
| 0.1 | Approve demo scope (`PRD.md` §5) | Dien | done |
| 0.2 | Approve stack (`ARCHITECTURE.md` §2) | Dien | done |
| 0.3 | Split work between members | Dien | done |
| 0.4 | Team registration via `fintechathon@ican-x.com` | Dien | todo |
| 0.5 | Fill real keys in `.env` (Gemini, Groq, OpenRouter, Stripe test) | Dien | done |
| 0.6 | Add Aurel as GitHub collaborator | Dien | todo |
| 0.7 | Choose second-model provider and model | Dien | done (router, different provider) |

## 1. Backend build (Dien, 17–18 Oct)

| # | Task | Status |
|---|---|---|
| 1.1 | Repo, DB schema, demo seed | done |
| 1.2 | Gateway checks 1–5, approvals, coverage rule | done |
| 1.3 | Comparator (causes, flags, refund split) | done |
| 1.4 | PII scrubber + role restore | done |
| 1.5 | Hash-chained audit log + verify | done |
| 1.6 | Schema additions: `expires_at`, approval withdraw, FX quote, per-share `charge_ref`, member currency, hospital public key | done |
| 1.7 | Signed payee enrollment from hospital portal mock (Ed25519) | done (`portal.ts`, `enrollment.ts`) |
| 1.8 | Payment state machine (`pending` → `executing` → `paid` / `expired` / `cancelled` / `failed`) | done (`payments.ts`, demo clock `clock.ts`) |
| 1.9 | FX demo table + quotes | done (`fx.ts`) |
| 1.10 | Stripe test mode: one charge per approved share | done (`stripe.ts`; live run 4 PaymentIntents succeeded) |
| 1.11 | Document upload, text-layer PDF read, Tesseract OCR for photos, totals check | done (`extract.ts`, `documents.ts`; upload route with 1.17) |
| 1.12 | Quarantined reader (free-tier router, zod schema) | done (`reader.ts`) |
| 1.13 | Planner (fixed action set, cited explanation lines, clarification) | done (`explain.ts`, `agent.ts`) |
| 1.14 | Selective second-model check | done (`secondcheck.ts`) |
| 1.15 | Refund status + simulated clock + reminders | done (`refunds.ts`, `clock.ts`) |
| 1.16 | Recap per member | done (`recap.ts`) |
| 1.17 | API routes per `docs/API.md` | done (authenticated web API and frontend service integration) |
| 1.18 | FISCO BCOS node (Docker) + anchor contract + anchoring calls | done (document and audit API integration, bounded RPC, local chain smoke test) |
| 1.19 | Demo fixtures: estimate PDF, 40-item interim bill, final bill, injected PDF, answer keys | done (`fixtures/pdf/`, `src/server/fixtures/`) |

## 2. Frontend build (Aurel, 17–19 Oct)

| # | Task | Status |
|---|---|---|
| 2.1 | Design direction agreed with Dien before coding (palette, type, layout) | todo |
| 2.2 | App shell, account profile and demo member picker, global badge removed by Dien | done |
| 2.3 | Case overview | done |
| 2.4 | Upload screen with re-upload state | done |
| 2.5 | Bill explanation screen (core) | done |
| 2.6 | Payment request: progress, per-helper FX, approve / withdraw, expiry | done |
| 2.7 | Chat with action buttons and clarification options | done |
| 2.8 | Refunds screen | done |
| 2.9 | Audit log screen with chain status and anchor tx | done |
| 2.10 | Switch from mock JSON to live API | done |

## 3. Tests and evidence (Dien, 18–19 Oct)

| # | Task | Status |
|---|---|---|
| 3.1 | Run D1–D6 end-to-end, save logs | done (`npm run evidence`, live, 7/7) |
| 3.2 | Run A1–A9, save logs | done (`npm run evidence`, live, 9/9) |
| 3.3 | Dialogue turn counts and correction tests | doing (`npm run eval:chat` 10/10; turn counts need the UI flow) |
| 3.4 | Baseline comparison vs generic LLM | done (`npm run baseline`, 3 trials) |
| 3.5 | README tested from a clean clone | done (fresh clone: `npm ci`, 45 tests, deterministic fixtures, `evidence` 16/16) |

## 4. Submission (19–20 Oct)

| # | Task | Owner | Status |
|---|---|---|---|
| 4.1 | Technical document (required), from PRD + ARCHITECTURE + TEST-PLAN | Dien | todo |
| 4.2 | Presentation deck ≤10 min (required) | Aurel | todo |
| 4.3 | Demo video ≤5 min, 16:9, English narration or subtitles, file `Track-TeamName-DemoVideo` (required) | Aurel + Dien | todo |
| 4.4 | Security self-assessment (optional) | Dien | todo |
| 4.5 | Execution evidence (optional) | Dien | todo |
| 4.6 | Final check of all files and links, submit, confirm receipt | Dien | todo |

## Progress notes

- 17 Oct: repo scaffolded (Next.js 15.5.4, TypeScript, Tailwind). Deterministic core in `src/server/`: `gateway.ts`, `compare.ts`, `pii.ts`, `audit.ts`, `seed.ts`, `db.ts`. `npm test`: 14 passing.
- 17 Oct: docs expanded to v1.1. New requirements not yet in code: signed payee enrollment, approval withdraw and expiry, FX quotes, per-share charges, cited explanation lines (tasks 1.6–1.9, 1.13).
- 17 Oct: LLM router (`src/server/llm.ts`) over Gemini, Groq, OpenRouter free tiers with cooldown fallback; live probe answered on `gemini-3.8-flash`. Stripe test key verified (`livemode=false`). FISCO BCOS v3.17.1 4-node chain running; `Anchor` deployed at `0x7571ee502b7A719066dF31CB0D8C59E6081d13A5`; smoke anchor tx `0x8420b9a1…6e2` status 1. `npm test`: 17 passing.
- 17 Oct: tasks 1.6–1.10 done. `npm run d4:live` ran D4 against live services: 4 helper shares (IDR, MYR, AED, IDR) charged as separate Stripe test PaymentIntents (`pi_3URapKIZ…`, `pi_3URapLIZ…` ×2, `pi_3URapMIZ…`), request `paid`, audit chain intact, head anchored on FISCO BCOS (tx `0xc8de5e9b…ae12`). `npm test`: 28 passing.
- 18 Oct: tasks 1.11–1.16 and 1.19 done; 1.17 (API routes) deferred until FE integration. `npm run evidence` against live LLM router, Stripe test and FISCO BCOS: 16/16 (D1–D6, D4b, A1–A9), audit head anchored. `npm test`: 44 passing.
- 18 Oct baseline (same model `groq:openai/gpt-oss-120b` both sides, 3 trials, metrics by code from the answer key): causes found guardian 5/5 in every trial vs generic chat 4/5, 3/5, 2/5; basic items raised 4/4 vs 2–3/4; duplicate CBC raised 3/3 vs 1/3; invented clinical cause ("infection") 0 vs 3/3 trials; numbers not traceable to the bill or computed facts 0 vs 4–8 per trial (spot-checked: drug total stated as CNY 2,534 and 2,224, true 1,702; lab 1,190, true 1,150). Generic chat was 1,000–1,400 words vs 160–210. One earlier run on the same model produced a degenerate repeated-character reply; it was discarded and the comparison rerun with fixed settings.
- 18 Oct: README rewritten per competition template. Clean-clone test found and fixed three issues: fixture PDFs were not byte-stable (fixed metadata dates); second-model check gave up while independent providers were cooling down; back-to-back runs exhausted free quotas so A2/A8 documents were never read (router now waits once for the soonest cooldown in background reads). Fresh-clone `evidence` 16/16; snapshot in `evidence/run-2026-10-18-clean-clone/`.

- 20 Oct, Codex. Authenticated frontend integration now uses the existing document reader, comparator, second reader, payment gateway/state machine, server FX quotes, refunds, recap and audit services. Private Google and isolated demo workspaces remain separate. Email-bound invitations grant the invited role after acceptance. Web PDF reading and model fallback have bounded time budgets. Tests 66/66, lint and isolated production build pass. Payment execution stays in sandbox or Stripe test mode, with official hospital enrollment required for personal cases.

- 20 Oct, Codex. Added shared Hospital Directory and human Verification Desk at `/admin`, server Google-email allowlist, family proposals/resubmission, grounded discovery with provider fallback, independent advisory review, separate human profile/account decisions, signature and key-rotation checks, incident holds, version-bound approvals and optional verification-hash anchoring. Browser verifies onboarding through revocation and mobile layouts. See `docs/HOSPITAL-DIRECTORY.md` and `evidence/admin-2026-10-20/`. Scheduled monitoring and real hospital confirmation remain operational boundaries.
