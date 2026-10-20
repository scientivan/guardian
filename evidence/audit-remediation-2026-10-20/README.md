# Audit remediation evidence, 20 October 2026

The plan is in `docs/AUDIT-REMEDIATION-PLAN.md`. The original findings remain in `docs/DOCUMENTATION-AUDIT-2026-10-20.md` as a historical snapshot.

## Fresh results

- `npm test` passed 125 tests in 19 files, including seven new audit regressions.
- `npm run lint` and `npx tsc --noEmit --incremental false` passed.
- `npm run build` passed in an isolated source copy with linked dependencies. No environment files, application databases or caches were copied. The running development server was left available.
- Chrome executed sandbox R2 with separate shares and reconciled D3. Payer M_JKT received only its own charge audit result, approval and refund allocation. Other member IDs were absent from the payer audit payload.
- Browser visited Bill Review, Pledges, Case History, Close and Records and How It Works. It checked the shared-receipt warning, absence of the old direct-settlement claim and the landing prototype disclosure. No page errors were recorded.
- Mobile Bill Review at 390 × 844 had no horizontal document overflow. Screenshots are in this folder.
- `probe-results.jsonl` records the original audit probes against the patched implementation. Its only remaining invoice payload is the intentional all-member shared attachment. Old stateless token storage is now rejected rather than silently aliasing a value.

## Reproduction

Run `npm test` from guardian. For the browser script, run a local development server on port 3000 and install Playwright outside the product if necessary. Set PLAYWRIGHT_MODULE to that installation's module path and execute `node evidence/audit-remediation-2026-10-20/browser.cjs`. The runner uses the local Chrome executable on macOS and creates a fresh isolated demo session. It runs sandbox payments, not Stripe network charges.

The browser script deliberately does not invoke live model endpoints, email sending or real hospital verification. Automatic best-effort local anchoring may run when configured in the existing server. That is not a fresh validation of every new anchor path. Gmail, real Google consent, institutional onboarding, real bank settlement and a new live model baseline remain outside this evidence.
