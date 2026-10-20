# Human hospital verification evidence

The portal implements the approved Hospital Directory flow through the same authenticated web API used by the frontend. `browser-results.json` contains observed checks, live service results and explicit limits. `review-desktop.png` and `review-mobile.png` show the review interface with a synthetic institution and an advisory AI assessment.

## Verification performed

- Anonymous administrator navigation preserved its login destination. Ordinary Google and demo sessions were denied administrator access.
- The administrator created an institutional proposal in the UI with source URLs. Human profile approval did not activate payment authority.
- A separate UI submission and confirmation activated an Ed25519-signed account list against the correct directory identifier.
- A Google care case linked the approved institution, obtained a server quote and recorded approval against that recipient.
- An incident hold removed the recipient and cancelled the old approved request. The execute endpoint rejected it before submitting any charge.
- The local FISCO BCOS chain returned a real transaction for the approved verification snapshot digest.
- Role spoofing and cross-origin administrative writes were rejected.
- The review interface had no horizontal document overflow at 1600, 1280, 768 and 375 pixels. Browser runtime errors were absent.
- Live hospital discovery initially met a Google quota limit. The configured Groq browser-search fallback returned a complete Singapore General Hospital draft with provider-returned institutional and independent source URLs. The search did not approve the institution or activate an account.
- The source-retrieval endpoint returned the public hospital contact-page excerpt over HTTPS. A separate advisory review completed on Groq GPT-OSS 120B for a manually submitted synthetic proposal, producing nine findings while leaving the proposal pending. Those synthetic source domains could not be independently retrieved, and the findings treated their claims as unconfirmed.

## Repeat the workflow

Run `npm test` for 88 tests, including 22 hospital-directory scenarios. They cover authorization, separate trust decisions, signature/age checks, old-key rotation or recovery, stale/replayed reviews, resubmission, cross-workspace revocation, partial execution, snapshot tampering, private-network addresses, provider fallback and account-bound search provenance.

Run `npm run lint`, `npx tsc --noEmit` and `npm run build` for static and production checks. For manual browser verification, configure an authorized Google address in `GUARDIAN_ADMIN_EMAILS`, start the app, and follow [Hospital Directory](../../docs/HOSPITAL-DIRECTORY.md). Use a separate data directory for synthetic administrative decisions. Do not activate fictional institutions in the operational registry.

## Evidence scope

Browser checks used synthetic signed Google sessions with a separate test secret and isolated production preview on port 3100. They did not perform a new Google consent exchange. The user's port-3000 allowlist was checked separately through the read-only access endpoint, which returned authorized for the configured identity.

All administrative approvals, ownership confirmation text and signing keys in the workflow test were synthetic. No real hospital ownership was established, no patient data was used, and no real or Stripe payment was executed in this browser test. Actual institutional onboarding still requires responsible human confirmation and cooperation from the hospital. The live public-information search is evidence of discovery availability, not verified identity or payment authority.
