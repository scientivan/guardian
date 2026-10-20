# Frontend integration verification

The web app now calls authenticated API routes that invoke the existing backend engines. Payment and refund totals come from core SQLite tables. Web snapshots hold presentation metadata and cached explanations.

`browser-results.json` records the production-browser checks. `bill-review.png` shows a newly uploaded synthetic bill after reading and comparison. These checks used an isolated production build on port 3100, separate account databases and a separate AI response cache. The user's development server and personal workspace were not used for payment tests.

## Verified behavior

- Demo entry, quote-bound approval, refresh persistence, explicit owner confirmation and sandbox execution.
- Four approved shares charged through the backend state machine. Total deposits became CNY 80,000, and final-bill reconciliation allocated CNY 9,000 in refunds.
- Per-member payment recap downloaded with the actual stored sandbox receipts.
- Refund clock and settlement controls updated core state. Companion execution and clock manipulation were rejected.
- The local FISCO BCOS node accepted the audit hash and returned the transaction recorded in the JSON report.
- Estimate and 40-line interim PDFs went through local extraction, PII scrubbing and the configured reader providers. The resulting bill total was CNY 36,782, with nine cited explanation lines and eleven independently checked items.
- Chat produced a working link to the selected bill explanation.
- Email-bound invitations accepted the intended signed identity and rejected a different account. A payer could not spoof the owner through `x-member-id`. Cross-account reads and cross-origin mutations were denied.
- Desktop and mobile office views stayed within the viewport. No browser runtime errors were observed.

## Reproduction

Run `npm test` for 66 automated tests, including thirteen integration scenarios in `src/server/integration.test.ts`. Tests replace external AI and payment calls with controlled responses. Run `npm run lint`, `npx tsc --noEmit` and `npm run build` for static and production checks.

For the browser flow, start the app with configured AI keys and the local chain. Choose Use demo account, approve the missing CNY 5,000 share, review and execute R2, reconcile the final bill, and download the payment record. Create another case and upload `fixtures/pdf/estimate.pdf` followed by `fixtures/pdf/interim-bill.pdf`, then open Bill Review and ask the assistant to explain the interim bill. For shared Google cases, invite a second account by its verified email and accept while signed into that account.

## Scope and limits

The browser authorization tests used synthetic signed Google sessions in the isolated environment, not a fresh Google consent or callback exchange. Payment tests used the sandbox charger. Google-mode execution uses the existing Stripe test adapter and requires an enrolled hospital. No real-money payment or hospital refund settlement was tested. Personal hospital enrollment requires a pinned official channel and public key. FX uses the configured reference table, not a live-market rate feed. Follow-up records activity and does not send an external message. Repeated identical AI requests may use the isolated cache.
