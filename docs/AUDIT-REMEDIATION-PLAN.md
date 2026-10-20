# Audit remediation plan, 20 October 2026

Requested by Dien after DOCUMENTATION-AUDIT-2026-10-20.md. Execute within the sandbox product. Real settlement, hospital cooperation, deployment and live-service credentials remain outside this patch.

## Design and sequence

1. Apply payer privacy on the server. Expose own audit details and a small allowlist of shared metadata. Remove other members' financial data from nested system results. Identify the record as a filtered view whose integrity is checked against the full server log.
2. Render arithmetic with code templates. A model can select existing source statements or questions, but its free prose cannot become a factual explanation. Statements remain attributed extracted content, not verified clinical facts. Invalidate legacy cached explanations before display.
3. Allocate supported PII tokens per case in a transaction. Scrub known names and the assembled chat prompt including request state. Keep tokens in AI-generated views rather than restoring identifiers. Preserve role-controlled access to original documents.
4. Make explanation GET cache-only without writes or model calls. Generate through limited POST. Closed reads must not synchronise directory authority or record refund reminders. Chat remains an explicit post-closure exception. Align chat payment suggestions with the current global bill balance.
5. Correct sandbox/test payment claims. No charge ID proves hospital settlement. Preserve the agreed all-member invoice access, with an explicit receipt-only privacy notice. Correct wizard/API documentation, provenance claims and landing examples.
6. Run targeted regressions, full tests, lint, TypeScript, an isolated production build and local browser checks. Record evidence and refresh verification docs.

## Acceptance

- A payer response cannot disclose another member's charge, share limit or refund through an audit result.
- Wrong numeric/diagnostic model prose cannot enter explanation lines. All computed causes remain available when the model fails.
- Different PII values never share a persistent token. Known case names are absent from the complete captured chat prompt.
- Explanation GET never generates. Reading a closed case changes no financial, refund, token or audit state.
- UI and documentation describe simulated recipient checks and test charges accurately. Shared invoice files carry an explicit medical-privacy warning.
- Existing user changes to package.json and bun.lock are preserved. Build output is isolated from the running development server.

## Results

All six phases are complete. Fresh tests pass 125/125 across 19 files. Lint, TypeScript and the isolated production build pass. Chrome verified a sandbox execution/refund cycle, payer audit projection, five case pages, the receipt-only warning, landing disclosure and mobile Bill Review without overflow. Build-copy source bytes match the current src tree.

Findings 1, 2, 4, 5, 6 and 7 have code fixes and targeted regression proof. Finding 3 is resolved by truthful sandbox/test copy and documentation rather than claiming an unimplemented bank-settlement adapter. Findings 8 and 9 have corrected docs and shared-data landing examples. Chat preparation also uses the current global payment balance.

Evidence is in `evidence/audit-remediation-2026-10-20/`. Original audit artifacts remain historical. Shared invoice files remain an explicit privacy exception with a visible warning. Pattern-based PII and extracted statements retain their documented limitations. Real settlement, Gmail delivery, real Google consent, hospital confirmation and fresh live-model/anchor evaluation are not claimed.
