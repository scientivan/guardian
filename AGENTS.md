# Guide for coding agents

Guardian is a Next.js 15 app (TypeScript, `better-sqlite3`, Tailwind v4, vitest) for a FinTechathon entry: an AI agent that explains a foreign hospital's bills and pays deposits only to the hospital's verified account after each payer approves their own share.

## Read first

1. `docs/TASKS.md` → **Current state**: what is built, open items, conventions. Progress notes at the end of that file record each work round.
2. `docs/PRD.md` (scope; §12 lists changes made during the build), `docs/ARCHITECTURE.md` (design, data model), `docs/API.md` (routes; v1.4–v1.6 at the end are the latest), `docs/VERIFICATION.md` (requirement → code map).
3. `README.md` for setup, environment variables and commands.

## Commands

```bash
npm ci
npm test              # vitest, no network needed (118 tests on 20 Oct)
npm run lint
npx tsc --noEmit
npm run build
npm run dev           # http://localhost:3000, "Use demo account" on /login
npm run demo:reset    # back to the seeded demo case
```

Run all four checks before pushing. Stop a running `next dev` before `npm run build` (they share `.next`).

## Rules that are easy to get wrong

- **Money:** integers in minor units (×100, IDR included). Amounts, FX and refunds are computed in code, never by an LLM.
- **Payments:** only through the gateway (`src/server/gateway.ts`, five checks, no override). The payee always comes from the official registry, never from a document or chat. Payment-request amounts are validated by `src/lib/payment-plan.ts`.
- **Roles:** Owner, Payer, Companion (PRD §2). Never write "helper" in UI or docs. Payers see the bill summary and their own share only; projection happens server-side in `src/server/case-state.ts`.
- **Closed cases** are read-only: `src/server/api.ts` rejects mutating case routes (except chat) when `case_closure` has a row. Hide write controls in the UI with `care.closed`.
- **Database changes:** add columns with a guarded `ALTER TABLE … ADD COLUMN` in `openDb` (`src/server/db.ts`); existing account databases must keep opening.
- **Blockchain:** hashes only, best effort (`src/server/anchor.ts` returns null when unconfigured). Never let anchoring fail the user's action.
- **Personal data:** tokenised before any LLM call (`src/server/pii.ts`); emails and anchors carry no patient data.
- **UI:** follow the existing design: tokens in `src/app/globals.css`, `Section`, `Chip`, `PRIMARY`, `SECONDARY` from `src/components/app/ui.tsx`, the custom `Select` (no native `<select>`), dialogs styled like `Feedback.tsx`. Keep `/mockup/titles` untouched.
- **Evidence:** record attack runs and screenshots under `evidence/`.
- **Git:** the project owner (Dien) asked for finished work to be pushed to `main`. Add a progress note to `docs/TASKS.md` for each round of changes.
