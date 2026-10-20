# Task tracker

Internal deadline: **20 Oct 2026 12:00 WIB**. Official deadline: 20 Oct 2026 23:59 Beijing time (22:59 WIB); use the earlier published time.

Owners: **Dien** (backend, agent, API, services) and **Aurel** (UI/FE). FE ↔ BE contract: `docs/API.md`. Status: `todo`, `doing`, `done`, `blocked`.

## Current state (read this first, updated 20 Oct evening)

**Supabase migration and public deployment, 20 Oct (Codex)**. [Fact] Nine SQLite databases and ten files (4,397,584 bytes) imported to private Supabase Postgres schemas and Storage with row/hash/audit verification, idempotent rerun and intact local backups. Cloud invoice, 5 MiB signed uploads, wrong-session/route denial, private object/RLS checks, WASM OCR, concurrent seeding/audit, payment/refund and hospital listing probes passed. Public browser run at https://guardian.scientivan.dev passed demo login, sandbox payment, 5 MiB private file round trips, payer original denial and audit filtering with zero JavaScript errors. A complete pg_dump 17 backup with verified referenced objects was also tested. [Decision Dien] Vercel hosting, manual Cloudflare CNAME, Google callback updated, production FISCO anchoring remains disabled until a reachable node exists. NextAuth retained. See docs/SUPABASE-MIGRATION.md and evidence/supabase-deployment-2026-10-20. Actual Google consent was not automated. Final source deployment verification follows the main push.

**Live services verified, 20 Oct (Codex)**. [Fact] One real product notification sent and found in Gmail INBOX by its unique token. Nine anchors verified on local FISCO with status-1 receipts, matching events and stored hashes. Fresh uncached reader rerun matched 40 items and five causes. Background second-provider reading checked 11 items with zero disagreements. [Limit] The second check timed out at the web 15-second budget, and the first reader attempt had a cause mismatch. No blanket live pass is claimed. Local ignored .env routing now prioritises proven Groq/OpenRouter paths. Evidence in `evidence/live-services-2026-10-20/`.

**Audit remediation completed, 20 Oct (Codex)**. [Fact] Nine audit findings addressed through server fixes, precise sandbox/test copy and documentation. Payer audits filter nested system details, explanation display uses code/source templates, persistent case PII covers assembled chat prompts, GET explanation is cache-only and closed reads do not write reminders or refresh hospital authority. Chat payment preparation uses the global final-bill balance. Invoice sharing remains explicit with a receipt-only warning. Tests 125/125, lint, TypeScript, isolated production build and browser sandbox execution/refund privacy checks pass. Plan in `docs/AUDIT-REMEDIATION-PLAN.md`, evidence in `evidence/audit-remediation-2026-10-20/`. Live-service limits remain explicit.

**Historical independent verification before remediation, 20 Oct (Codex)** — [Fact] Fresh 118/118 tests, lint, TypeScript and ten-page local browser smoke pass. The broader all-green claims in VERIFICATION.md need qualification. Reproduced payer audit disclosure, semantic explanation-guard gaps and known-name leakage in chat, plus rate-limit/closure/token issues. See [documentation audit](DOCUMENTATION-AUDIT-2026-10-20.md) and `evidence/docs-audit-2026-10-20/`. No product fixes applied in this verification-only pass.

For an agent or person picking this up. Details per area are in the linked docs; `docs/VERIFICATION.md` maps every PRD/ARCHITECTURE/API/TEST-PLAN requirement to where it lives.

**Product, as built on `main`:**

- **Roles** (PRD §2): Owner, Payer, Companion. The UI and docs say "Payer", never "helper". The role shows as a chip in the header and next to each pledge (`ROLE_LABEL` in `src/components/app/AppShell.tsx`).
- **Case tabs:** Agent Office, Bill Review, Pledges (with Refund Tracking behind a button), Case History, Case Members, Close and Records, How It Works. Upload is the button above the tabs. The Case Assistant is a window docked at the bottom of the sidebar; "Ask" buttons open it with a code-written answer (`src/server/case-answers.ts`). The status card of the latest pending request sits right under the tab list.
- **Upload:** a confirmation dialog shows file, format, chosen type (estimate / interim / final) and what it is used for, and warns when the file name suggests another type or when a newer document of that type will replace an older one.
- **Bill Review:** "Ask about this bill" (Case Assistant, context `{kind:"bill",documentId}`) replaced "Explain selected bill"; the page no longer re-runs the explanation on its own. Each line has "Double-check" (second model on that line, F6).
- **Payment requests** (`src/lib/payment-plan.ts`, enforced in `Integration.createRequest`): three kinds. Initial deposit = estimate's lower or upper end. Bill balance = latest bill (final replaces interim) minus all live requests. Emergency guarantee = typed amount (only manual one). One live request per document. New requests email payers through Gmail when configured (`src/server/notify.ts`).
- **Request card** (Pledges): a filled switcher next to the title replaces the old dropdown; stage strip Requested → Pledging → Covered → Paid; total with the viewer's own currency beside it (≈); the owner's pay and cancel buttons sit right of the total ("Pay when covered" until 100%). Each pledge row shows `IDR 73,031,490 (CNY 31,822)`; clicking shows rate, fee and status. The owner does not pledge by default ("I'm also paying part of this myself"). Payers confirm a pledge in a sandbox checkout dialog; once their share is charged they see a one-time receipt dialog.
- **Paid requests:** Hospital Invoice section. Owner or companion attaches the hospital's invoice (PDF/PNG/JPEG); every member can view or download it; its hash is anchored.
- **Hospital:** the hospital name with its verified account is one button; its menu has "Verify hospital account" and "View in Hospital Directory".
- **Closing** (`/case/:id/closing`, `Integration.closeCase`): blocked until no request is pending/executing, the final bill is read, and every paid request has an invoice. Then the case is read-only for everyone (every non-GET case route except chat returns 409) and a banner shows on every page. Closing documents per role: Case Closing Summary (owner), Payment Record (each payer; owner for anyone), Questions for Hospital Billing and Document and Audit Proof (owner, companion). Each prints on its own.
- **Blockchain** (FISCO BCOS, hash only, best effort): bills and invoices on upload, log head on demand / after each payment / at closing, closing-pack hash at closing, hospital verification snapshots by admins. Table in `docs/API.md` v1.6.
- **FX:** demo table with one CNY row; every other pair is a cross rate, so MYR, SGD, THB, AED, USD and IDR hospitals get quotes. Conversions are written "payer amount (hospital amount)".

**Current checks:** `npm test` 125/125, `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass (20 Oct).

**Open items:** guarantee amount still typed (no "hospital guarantee letter" document type); Gmail self-delivery and local FISCO invoice/closing paths are now verified. Independent second-model checks still time out in the tested 15-second web window. sections 6.5, 6.7, 6.8 and 7–10 below (deployment, video, submission) unchanged.

**Working conventions in this repo:** follow the existing design (Tailwind tokens in `src/app/globals.css`, `Section` / `Chip` / `PRIMARY` / `SECONDARY` from `src/components/app/ui.tsx`, the custom `Select`, no native `<select>`); keep `/mockup/titles` untouched; new SQLite columns are added in `openDb` (`src/server/db.ts`) with `ALTER TABLE … ADD COLUMN` guards because existing account databases must keep working; record attacks and evidence under `evidence/`; Dien asked for changes to be pushed straight to `main`.

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
| 2.1 | Design direction agreed with Dien before coding (palette, type, layout) | done (UI built, final visual review in 6.2) |
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

## 5. Remaining work plan (20 Oct, from 11:00 WIB)

Written 20 Oct 10:58 WIB. Official deadline 22:59 WIB (about 12 hours left). The 12:00 WIB internal deadline is no longer realistic for the full list, so this plan sets new internal cut-offs. Priority: **P0** blocks submission, **P1** strongly raises the score, **P2** only if time remains.

| Cut-off (WIB) | Gate |
|---|---|
| 14:00 | E2E flow passes locally from a clean database (section 6) |
| 16:00 | Public HTTPS URL works with the demo account (sections 7–8) |
| 18:00 | Demo video recorded (section 9) |
| 21:00 | All required files final (section 10) |
| 22:00 | Submitted, one hour of buffer before 22:59 |

Rules for today:

- Freeze features at 14:00. After that only bug fixes, deployment and submission material.
- Do not migrate SQLite to Postgres today. The code is written for synchronous `better-sqlite3` (`src/server/db.ts`, per-account files in `src/server/workspace.ts`). A migration touches every engine and the whole test suite. SQLite on a persistent VPS volume meets the need.
- Judges must be able to use the app without Google consent. The demo account is the main path, Google sign-in is a secondary path.

### 5.1 Open decisions (Dien, before 11:30)

| # | Decision | Recommendation | Status |
|---|---|---|---|
| 5.1.1 | VPS specs (CPU, RAM, OS, provider, region) | Minimum 2 vCPU / 4 GB RAM, because Next.js, the 4-node FISCO chain and Tesseract share the machine | todo |
| 5.1.2 | Domain or subdomain for the app | Needed for HTTPS and Google OAuth redirect. Without a domain, Google sign-in cannot run on the VPS | todo |
| 5.1.3 | FISCO BCOS on the VPS or anchoring off in production | On the VPS, same Docker setup as local (`docs/FISCO-SETUP.md`). Anchoring is part of the security story in the video | todo |
| 5.1.4 | Stripe test key on the public server | Yes, test mode only (`sk_test_`). The gateway already rejects other keys | todo |
| 5.1.5 | Who records the video and who narrates | Aurel screen recording, Dien narration or subtitles | todo |

## 6. Frontend–backend integration and E2E flow (Dien + Aurel, P0, until 14:00)

Integration is already in place (tasks 1.17, 2.10, `evidence/integration-2026-10-20/`). This section closes the gaps and proves the flow from a **clean database**, not an already filled workspace.

| # | Task | Owner | Pri | Done when | Status |
|---|---|---|---|---|---|
| 6.1 | Inventory of UI elements still showing static or demo data (search `src/lib/demo.ts`, hard-coded numbers, buttons without handlers) | Aurel | P0 | List in this file, each item with a file path | done (list below) |
| 6.2 | Fix every element from 6.1 that appears in the video. Remove or hide the ones that do not | Aurel + Dien | P0 | Nothing on screen claims a feature that is not running | doing (fixed items marked below; video items still to check with Aurel) |
| 6.3 | Error, loading and empty states on upload, explanation, payment and chat (model timeout, OCR failure, quota exhausted) | Aurel | P0 | Each failure shows a readable message plus a next action, never a blank screen | done (`Feedback.tsx`: error dialog + agent loading states on every case screen) |
| 6.4 | Reset script for the demo account and local data (`npm run demo:reset` or a written guide) | Dien | P0 | One command returns the app to the start of the video scenario | done (`npm run demo:reset`, `--dry-run`) |
| 6.5 | Manual E2E run on a clean database, D1 → D6 in UI order: create case, upload estimate, initial deposit, upload 40-line interim bill, explanation, hospital questions, D4 guarantee with 4 helpers and FX, withdraw then reapprove, execution, final bill, refunds, recap, audit + anchor | Dien | P0 | Every step passes, with screenshots in `evidence/e2e-2026-10-20/` | todo |
| 6.6 | Run the attacks through the UI (not only scripts): A1 changed account in chat, A2 PDF with hidden instruction, A5 data extraction request, A7 owner forcing a transfer | Dien | P0 | Each attack is rejected on screen with a clear reason, and appears in the audit log | done for A1, A4, A5, A7, A9 (`evidence/e2e-2026-10-20/attacks/ATTACKS.md`); A2 in the UI needs LLM keys |
| 6.7 | Dialogue counts for 3.3: user and agent turns for D1–D6 through the UI | Dien | P1 | Numbers recorded in `docs/TEST-PLAN.md` §3 | todo |
| 6.8 | Second account via Google invitation (owner invites helper, helper approves own share) | Dien | P1 | Passes with two real Google accounts, not only signed synthetic sessions | todo |
| 6.9 | Final checks: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` | Dien | P0 | All green, results in the progress notes | done 20 Oct: 118 tests, lint, `tsc --noEmit`, build all pass (last run evening) |
| 6.10 | Commit and push the E2E result to `main` | Dien | P0 | Tagged commit `v-submission-rc1` | todo |

### 6.1 Inventory: UI showing static, demo or misleading data (20 Oct)

| # | Where | What | Action |
|---|---|---|---|
| 1 | `src/app/mockup/titles/page.tsx` (`/mockup/titles`) | Aurel's temporary section-title comparison. It uses fixture `EXPLANATION` and is reachable by URL, though nothing links to it. `MAIN_LOOK` already picks "folder". | Aurel: delete the page or keep it out of the video |
| 2 | `src/server/workspace.ts`, `src/lib/demo.ts` | The demo case C1 starts from fixtures: explanation, 40 items, requests R1/R2, refunds and 19 story rows in the audit log (#6, #14, #16 are scripted denials, not live gateway decisions). The hashes are real and the data is synthetic. | Keep as the demo seed. In the video, show live denials made on screen (A1/A7). |
| 3 | `src/server/workspace.ts` seed | The story claimed "Anchored the log head on FISCO BCOS" without a transaction. | Fixed: row removed. "Anchor audit hash" makes a real anchor. |
| 4 | `src/app/case/[caseId]/log/page.tsx` | Live rows showed raw codes (`gateway.check`, actor `gateway`). | Fixed: plain-language actions and actors |
| 5 | `src/app/case/[caseId]/chat/page.tsx` | An account warning appeared twice (reply and warning box). | Fixed: shown once, in red |
| 6 | `src/app/case/[caseId]/upload/page.tsx` | The re-upload banner always said "too blurry", even for a totals mismatch. | Fixed: shows the backend reason |
| 7 | `src/app/case/[caseId]/refunds/page.tsx` | "Mark processing / received" and "Advance 30 days" simulate the hospital and the clock. | Demo-only by code (`mode==="demo"`). Say so if shown. |
| 8 | `src/app/case/[caseId]/log/page.tsx` | `CHECKS` legend is static text. | Correct: it documents the five gateway checks |
| 9 | FX quotes (`src/server/fx.ts`) | Reference rate table, not market rates. | Labelled in README and the payment confirmation |

## 7. Database and storage on the VPS (Dien, P0, 13:00–15:00)

Target: same SQLite files as local, on a persistent folder outside the build directory, with a backup.

| # | Task | Pri | Done when | Status |
|---|---|---|---|---|
| 7.1 | Server setup: non-root user, SSH key only, firewall (`ufw` open 22, 80, 443 only), timezone, swap 2–4 GB | P0 | `ufw status` shows only those three ports | todo |
| 7.2 | Install Node 22 LTS (README §3 requires 22+), build tools for `better-sqlite3` (`build-essential`, `python3`), `tesseract-ocr` + language data used by `src/server/extract.ts`, Docker | P0 | `node -v`, `tesseract --version`, `docker ps` succeed | todo |
| 7.3 | Data folder `/var/lib/guardian/` with `guardian.db`, `accounts/` and uploaded files. Set `GUARDIAN_DB` and `GUARDIAN_ACCOUNTS_DIR` to it; check every other path still pointing at `process.cwd()` or `.cache` | P0 | No app data is written inside the release folder | todo |
| 7.4 | Seed the shared registry: `npm run hospitals:seed`, plus the demo hospital (H1) and its signed payee list | P0 | Hospital directory lists 4 hospitals + the demo hospital, no duplicates on rerun | todo |
| 7.5 | Automatic backup: daily `sqlite3 .backup` (not a raw file copy while the app is running) to a separate folder, keep 7 days | P1 | Backup file can be opened and contains the tables | done in code (`npm run data:backup`, cron in `DEPLOY.md`); install on VPS |
| 7.6 | Upload limits (file size, PDF/image type) checked on the server and in the reverse proxy | P1 | 20 MB+ file rejected with a clear message | app limit 10 MB exists; proxy limit in `DEPLOY.md` §4; check on VPS |
| 7.7 | Clean demo data before the judging period (22–23 Oct): remove test accounts, keep the seed | P1 | Database contains only seed data and the demo template | todo |

## 8. Website deployment (Dien, P0, 14:00–16:00)

| # | Task | Pri | Done when | Status |
|---|---|---|---|---|
| 8.1 | Production `.env` on the VPS (permission 600, never in Git): LLM keys, `STRIPE_SECRET_KEY` test, `NEXTAUTH_URL=https://<domain>`, new `NEXTAUTH_SECRET`, `GUARDIAN_ADMIN_EMAILS`, FISCO variables, DB paths | P0 | `npm run llm:probe` succeeds on the VPS | todo |
| 8.2 | `npm ci && npm run build`, then run `next start` under a process manager (systemd or pm2) with auto restart | P0 | App comes back after `reboot` | todo |
| 8.3 | Reverse proxy (Caddy or nginx) with HTTPS (Let's Encrypt), `client_max_body_size` matched to 7.6, timeout above the 70-second reader budget | P0 | `https://<domain>` valid, 40-line PDF upload does not hit a 504 | todo |
| 8.4 | FISCO BCOS 4 nodes on the VPS in Docker, deploy `Anchor` (`npm run fisco:deploy`), RPC port 8545 **not** open to the internet | P0 if 5.1.3 = yes | Audit anchor from production returns a tx with status 1 | todo |
| 8.5 | Google OAuth: add origin `https://<domain>` and redirect `https://<domain>/api/auth/callback/google` in Google Console. While the consent screen is in Testing mode, only listed test users can sign in | P1 | Google sign-in succeeds on the domain | todo |
| 8.6 | Production smoke test: demo account D1 → D4 → D5 from a phone and a laptop, plus attack A1 | P0 | Passes, screenshots in `evidence/deploy-2026-10-20/` | todo |
| 8.7 | Rate limits and AI quota: make sure free-tier quotas are not used up by visitors before judging (limit per account / IP on reader and chat routes, LLM cache on) | P1 | 20 fast requests do not drain the quota and get a 429 message | done (`src/server/rate-limit.ts`; 20 fast calls → 8 × 200, 12 × 429) |
| 8.8 | Simple monitoring: uptime check (UptimeRobot or similar) on the URL + logs from the process manager | P2 | Notification arrives when the app is down | todo |
| 8.9 | Deployment steps written in `docs/DEPLOY.md` and the README "Deployment" section, URL included in the submission | P0 | Another person can follow it without asking | doing (`docs/DEPLOY.md` written; add URL after deployment) |

## 9. Demo video (Aurel + Dien, P0, 16:00–18:00)

Requirements (`demo-video-guide-en.docx`): at most 5 minutes, 16:9, preferably 1080p, readable UI, English narration or subtitles, file `Track-TeamName-DemoVideo`. Structure: team intro, core end-to-end scenario, safety mechanisms + innovation + results.

| # | Task | Owner | Pri | Done when | Status |
|---|---|---|---|---|---|
| 9.1 | Script with timestamps (outline below) | Dien | P0 | Narration ≤ 650 words, fits 4:45 | todo |
| 9.2 | Recording preparation: reset data (6.4), browser 1920×1080, zoom 110–125% so text is readable, notifications off, bookmarks hidden, model answers warmed in cache so the demo does not wait 70 seconds | Aurel | P0 | Test take with no visible waiting > 5 seconds | todo |
| 9.3 | Screen recording per segment (not one long take), from the production URL if 8.6 passed, otherwise localhost | Aurel | P0 | All segments recorded | todo |
| 9.4 | Narration or English subtitles, cut waiting time, simple labels on screen | Aurel | P0 | Final duration ≤ 5:00 | todo |
| 9.5 | Honesty check: "demo / synthetic / Stripe test mode" label appears once, no claim of features that do not exist | Dien | P0 | Each claim in the video maps to a test or log | todo |
| 9.6 | Export MP4 1080p, file name per guide, upload to its destination | Aurel | P0 | File plays on another device | todo |

Video outline (4:45):

| Time | Segment | What is shown |
|---|---|---|
| 0:00–0:20 | Team and problem | Family of a patient abroad receives a foreign-language bill that is higher than the estimate and is asked for a deposit |
| 0:20–0:45 | Case setup | Demo account, case, hospital from the directory, family members and their roles |
| 0:45–1:45 | Core: bill explainer (D2, D3) | Upload the 40-line interim bill, cause-by-cause explanation with item citations, basic items and duplicate CBC become questions for the hospital |
| 1:45–2:40 | Emergency guarantee (D4) | Helpers in IDR / MYR / AED, FX quotes, each approves own share, one withdraws, execution once covered, Stripe test receipts |
| 2:40–3:10 | Colloquial input (D6) + refund (D5) | "bayarin aja yg kemarin dong" gets a clarifying question; final bill, proportional refunds |
| 3:10–4:10 | Security | A1 changed account in chat rejected, A2 PDF with hidden instruction, A5 data extraction, A7 owner cannot override; architecture diagram in 15 seconds |
| 4:10–4:45 | Results and evidence | Audit log + FISCO anchor tx, 16/16 evidence, baseline vs generic LLM (5/5 vs 2–4/5 causes, 0 invented clinical causes), URL and repo |

## 10. Other submission material (P0, 18:00–22:00)

| # | Task | Owner | Pri | Status |
|---|---|---|---|---|
| 10.1 | Technical document (required, = 4.1) from PRD + ARCHITECTURE + TEST-PLAN, including the URL and deployment section | Dien | P0 | todo |
| 10.2 | Presentation deck ≤ 10 minutes (= 4.2), reusing screenshots from the E2E run | Aurel | P0 | todo |
| 10.3 | Security self-assessment (= 4.4), filled from A1–A9 + 6.6 | Dien | P1 | todo |
| 10.4 | Execution evidence (= 4.5): evidence summary, Stripe test IDs, anchor tx, reproduction steps for judges | Dien | P1 | todo |
| 10.5 | README: live URL, demo account, how to run, limits (test mode, reference FX, no real hospital verification) | Dien | P0 | todo |
| 10.6 | Team registration (= 0.4) and Aurel as collaborator (= 0.6) if not done yet | Dien | P0 | todo |
| 10.7 | Final check and submission (= 4.6): open every link in an incognito window, check file names, send, save the confirmation | Dien | P0 | todo |

## 11. After submission (21 Oct – 22 Nov)

| # | Task | Pri | Status |
|---|---|---|---|
| 11.1 | Keep the URL up through online review (22–23 Oct): check uptime and AI quota every day | P0 | todo |
| 11.2 | Do not deploy new code during 21–23 Oct, except critical fixes | P0 | todo |
| 11.3 | If selected as a finalist (31 Oct): live defence in English on 22 Nov, prepare an offline fallback (local + recorded video) | P1 | todo |

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

- 20 Oct, Claude (session with Dien). TASKS 6.1, 6.3, 6.4, 6.6 (A1, A4, A5, A7, A9 through the UI), 6.9, 8.7 and the code side of 7.5. New: `src/components/app/Feedback.tsx` gives a plain-language error dialog (title, server message, next step, support details) and "agents at work" loading dialogs, matching the existing palette, fonts and agent figures. `npm run demo:reset`, `npm run data:backup`, per-account and per-IP limits on model routes, and `docs/DEPLOY.md` are added. Fixes from the UI attack run: model-free refusal of private-data requests, audited payer denials, readable Security Log, no fake anchor in the seed. Doc consistency: test counts, Node 22, TEST-PLAN log paths, D2 longer-stay amount (CNY 3,000), answer-key location, and the API 1.1 badge note. Tests 95/95, lint, `tsc` and build pass. Not done here, because it needs keys, a VPS or people: A2 in the UI, 6.5 with live models, 6.7, 6.8 and sections 7–10.

- 20 Oct, Claude (session with Dien), second round. The Dashboard (`/projects`, renamed from Your Care Cases) shows care cases with a saved wizard draft, Invitation Requests and a Hospital Directory section. The Hospital Directory link is removed from the profile menu, and the directory picker is removed from the wizard. Invitations go to a Google email (listed in the invitee's Invitation Requests) or as a single-use share link. Both open a brief dialog with Accept, and email requests can also be declined. The wizard saves a per-account draft in the browser and resumes at the last step (files must be chosen again). Every form validates required fields and formats inline (`src/lib/validate.ts`, `FieldError.tsx`): names without digits, emails, phones, https URLs, amounts, files and JSON/base64 on admin forms. Case and invite APIs apply the same rules on the server. Activity panels show plain-language actions. Tests 105/105.

- 20 Oct, Claude, third round. The wizard's hospital step is a directory combobox: you must choose, and typing only filters. "Add a hospital" takes name, country and city/regency. AI drafts address, phone and website with sources (`POST /api/hospitals/request`), the proposal goes to the Verification Desk, and the step stays locked ("Waiting for review", draft saved) until an admin approves. It then selects the hospital by itself. Google case creation now requires a directory hospital on the server. Tests 108/108.

- 20 Oct, Claude, fourth round. Bill Review has its own section with "Upload a bill" as the section button. The Agent Office has a "What to do next" panel: role-based steps ticked from the case data, with one button for the next step; it starts folded on phones. Refund Tracking leaves the sidebar and opens from a button on Pledges (with "Back to Pledges"). The Pledges tab stays highlighted there. The invite form explains that the share limit is per request and that pledges stop at 100% of each request (gateway check 4, PRD F13).

- 20 Oct, Claude, fifth round. Agent Office: The Team and Recent Activity share the right column, each scrolling on its own. "What to do next" is the landscape strip at the bottom. The camera drags with the left button, and wheel and button zoom ease in small steps. Security Log is renamed Case History, with a plain-language Recent Activity section above the Full Record and "How Payments Are Protected". Every Recent Activity entry links to its row (`/log#step-N`, highlighted). Other case pages: the title band ends at the divider, and the agents column starts at the top, sticky, with The Team and Recent Activity scrolling separately.

- 20 Oct, Claude, sixth round. The Case Assistant tab is replaced by a window at the bottom left of every case page. "Ask" buttons on Bill Review (estimate vs bill, breakdown, each reason and hospital question), on payment requests and on refunds open it with their question. Those are answered by code from the case facts (`src/server/case-answers.ts`: numbers from the comparator, items and ledger; payers see no item details; audited as `chat`), and free questions still go through the chat planner. `/case/:id/chat` opens the window. The new "How It Works" tab gathers the explanations: the bill flow, the five payment checks with reasons, how money moves (no vault or escrow), the agent team, privacy, and what the records prove. They are removed from the Upload and Case History pages. Wheel zoom is stronger but still eased. The Team, Recent Activity and What to do next show edge fades and a scroll button when there is more.

- 20 Oct, Claude, seventh round. The case name in the header is a switcher across the account's care cases, keeping the current tab. Every native `<select>` is replaced by Guardian's own dropdown (`Select.tsx`: styled list, keyboard support, spacing for the arrow). In the invite form the owner sets the share limit in their own currency (converted to the hospital currency at the reference rate on the server), and the helper chooses their payment currency when accepting. The Dashboard uses two columns, with Care Cases as the main column and Invitation Requests plus Hospital Directory beside it, and fits one screen. Tests 113/113.

- 20 Oct, Claude, eighth round. On wide screens the Case Assistant docks at the bottom of the left sidebar: a launcher card opens and closes the window there, and Ask buttons open it. Phones keep the floating button. `npm run hospitals:demo-verify` runs the normal review and decision code as a stand-in operator, with a synthetic registry source, a fresh Ed25519 key and DEMO accounts. It was checked end to end: a Google case linked to HKU-Shenzhen verifies its account, creates a request, quotes IDR and records a pledge.

- 20 Oct, Claude, ninth round. Audit of the helper (payer) view against PRD §2. Already right: no bill lines, no original files, only calculated reasons, own pledge and withdraw, own refund and recap, no request, verify or pay controls. Fixed: the Upload button and form are hidden for helpers. Other helpers' pledges, share limits and activity rows are removed from the helper's projection on the server. The empty question and document-reason folders are hidden, and "Invite more helpers" is owner-only. Payment requests can now pay an uploaded bill: the owner picks a read interim or final bill, and the amount is capped on the server at its open balance (bill total less live requests for it). The request stores `documentId`, and the payee still comes only from the registry. Tests 114/114.


- 20 Oct, Claude, tenth round (docs verification). Request amounts now come from documents (deposit from the estimate, bill balance from the latest/final bill). Docs-vs-product gaps fixed: F6 family-questioned second check, F7 reference note, F9 payee source badge, F11 case-wide warning banner and warnings that could not be cleared, F12 countdown, F14 receipts per share, F19 in-app payment record, owner edits share limits. Full table in `docs/VERIFICATION.md`.

- 20 Oct, Claude, eleventh round. One live request per document (server and form); the owner's pledge box became opt-in; every conversion reads "payer amount (hospital amount)" with "1 CNY = … IDR"; FX cross rates through CNY (THB added). Stage strip on request cards, sandbox checkout dialog on pledge, one-time "Your share was paid" receipt.
- 20 Oct, Claude, twelfth round. Hospital Invoice section on paid requests (`request_invoices` table, `POST/GET /payment-requests/:id/invoices`). Case closing (`case_closure` table, `POST /cases/:id/close`, read-only guard in `src/server/api.ts`) with the Close and Records tab and printable closing documents. Hospital name merged into one menu button. "Helper" renamed "Payer" in UI, server messages and docs; role chips added. Status chips removed from card corners; request form text condensed.
- 20 Oct, Claude, thirteenth round. Bill Review "Ask about this bill". Invoices viewable by every member. Gmail emails on new requests (`nodemailer`, `memberships.email` stored when an invitation is accepted). Review and Pay moved into the request card, request switcher in the card header (filled `Select strong`), invite link hidden once covered. Upload confirmation dialog. Request status card under the tab list.
- 20 Oct, Claude, fourteenth round. Closing also requires the final bill and an invoice on every paid request; checklist "Open" links go to the exact request (`?requestId=…#invoice`). Blockchain: invoices anchored on upload, log head anchored after each executed payment and at closing, closing-pack SHA-256 written into the `case.closed` row and anchored (`case_closure.pack_sha256/pack_tx/audit_hash/audit_tx`). All docs updated for handoff. Tests 118/118.

- 20 Oct, Codex (independent documentation audit). [Fact] Read all ten existing docs plus README and inspected routes, UI and services. Fresh 118/118, lint and TypeScript pass. Chrome opened ten primary pages and checked payer projection and mobile Bill Review. Isolated probes reproduced gaps beyond the existing tests. Nine prioritized findings, implementation coverage and live-service limits are in `docs/DOCUMENTATION-AUDIT-2026-10-20.md`. Evidence in `evidence/docs-audit-2026-10-20/`. No product code changes, live payment or external message.

- 20 Oct, Codex (audit remediation). [Fact] Completed `docs/AUDIT-REMEDIATION-PLAN.md`. Fixed nested payer audit disclosure, canonical explanation rendering including old caches, case-stable PII and full chat-prompt scrubbing, cache-only explanation GET and closed-read side effects. Aligned chat preparation with current global balances. Corrected sandbox/test settlement claims, invoice privacy notice, wizard/API docs and landing arithmetic. Seven new regressions, 125/125 total tests, lint, TypeScript and isolated production build pass. Local Chrome executed sandbox shares and refund reconciliation, confirmed payer isolation and mobile layout, with no page errors. Evidence in `evidence/audit-remediation-2026-10-20/`. User package.json and bun.lock changes preserved. No external email or real payment.

- 20 Oct, Codex (live services verification). [Fact] Exercised real Gmail through email-bound membership and notifyRequest, then confirmed the single message in INBOX using read-only IMAP. Verified nine document/audit/invoice/closure/directory anchor transactions by status, event and mapping. Uncached model rerun matched 40 items, total and five causes. Independent OpenRouter/free reading of 11 items matched Groq. [Limit] Initial reader cause mismatch and failed provider attempts retained. Interactive 15-second second-check timed out, so full live pass is not claimed. Local routing changed in ignored .env without exporting credentials. Product source unchanged. Evidence and reproducible runners in `evidence/live-services-2026-10-20/`.

### 20 October, Supabase and Vercel round

[Fakta] Implemented the Supabase migration plan, preserved SQLite for offline regression/rollback, added cloud backup and temporary private upload/download flow, and verified the public domain. Demo initialization, audits and sensitive synchronous transitions use workspace transactions. Postgres bigint aggregate decoding preserves numeric money calculations. The user supplied Storage keys, installed DNS and reported updating OAuth. Production anchoring is intentionally unconfigured by user choice. Evidence and remaining limits are recorded in SUPABASE-MIGRATION.md.
