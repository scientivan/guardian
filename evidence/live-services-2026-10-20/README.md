# Live services verification, 20 October 2026

This evidence follows commit `80b7f40`. No product source code changed during this verification. It uses real model requests without response caching, the configured local FISCO BCOS chain and Gmail SMTP/IMAP. Patient/hospital documents, sessions and payment data are synthetic. Account databases are temporary and removed afterwards.

## Outcome

| Area | Result | Evidence |
|---|---|---|
| Product notification | PASS. One notification through Integration.createRequest followed by Integration.notifyRequest, after email-bound invitation acceptance. SMTP accepted it and read-only IMAP found its unique subject token in INBOX. | email-send.json, email-inbox.json |
| Reader | PASS on an uncached rerun. Estimate bounds/stay, all 40 interim item categories/quantities/unit prices, interim total CNY 36,782, five causes and final total CNY 71,000 match the fixture key. | models-and-anchors.json, reader-output.json |
| Explanation and colloquial clarification | PASS with a live model answer. Five arithmetic causes, citations, no forbidden clinical claim, and clarification without preparing payment for an ambiguous request. | models-and-anchors.json, explanation.json |
| Independent second provider, background budget | PASS. Groq first reader, OpenRouter/free re-reader, 11 checked items, zero disagreements. The free route can select underlying models dynamically, so different API providers do not prove independent weights. | independent-second-model.json |
| Independent second provider, web budget | FAIL on the tested attempt. OpenRouter timed out at 15 seconds, with no independent check completed. The product reports unavailability rather than pretending success. | interactive-second-model.json |
| Document anchors | PASS. Estimate, interim and final document transactions have receipt status 1, matching Anchored hash/kind events and nonzero contract anchoredAt mappings. | initial-models-and-anchors.json |
| Payment log, invoices and closure | PASS. Sandbox execution audit, two invoice hashes, closing pack and closing log head each verified against receipts/events/mapping. Local audit chain remains valid. | initial-models-and-anchors.json |
| Directory verification hash | PASS with corrected verifier event label hospital.verification. Synthetic operator fixture only, not real hospital confirmation. | directory-anchor.json |

Nine verified anchor transactions cover documents, invoices, payment/closing audit heads, the closing pack and directory verification snapshots. This is the local chain ID 20200, not a public-chain explorer or proof of hospital authenticity. No Stripe network charge or real bank transfer was executed.

## Failures, retries and configuration

The initial reader run matched item amounts but did not match all expected cause classifications. A second uncached run matched every tested item and cause. Both results are retained. No product algorithm changed between these attempts. This is evidence of fixture performance and model variability, not a universal extraction guarantee.

The original model chain returned Gemini 503/cooldown responses and OpenRouter 404. Official provider model-list endpoints were checked. An independent small probe answered through Gemini preview, and a full independent re-reading succeeded through OpenRouter/free. The local ignored .env LLM_CHAIN now puts the proven Groq reader and OpenRouter/free route first, retaining Gemini preview and smaller Groq fallbacks. Only the routing setting changed. Credentials were neither changed nor exported. The 15-second web check still timed out, so this report does not claim an all-green live product.

The first directory test expected the shorthand event kind directory. Product code actually emits hospital.verification. The verifier label was corrected and that directory path was rerun successfully, without rerunning model requests. The original failure is retained in initial-models-and-anchors.json.

## Scope of email proof

Exactly one message was sent to the configured Gmail sender's own inbox. It contains only synthetic verification information. The runner exercised the real invitation acceptance, recipient membership lookup, notification formatting, SMTP send and notify.email audit event. Google sessions are local fixtures, not a new OAuth consent exchange. The temporary case was deleted, so its link is not a persistent user case. IMAP searched only the unique run token and fetched matching subject/date/message-ID headers, without reading unrelated messages.

Gmail accepted the SMTP credentials and the message was found in INBOX. This proves delivery of this message, not all possible recipient domains or future availability.

## Reproduction

From guardian, use the existing ignored .env

- `node --env-file=.env --import tsx evidence/live-services-2026-10-20/verify-models-and-anchors.ts` calls live models and writes new local-chain anchors. Add --models-only or --directory-only for the focused checks.
- `node --env-file=.env --import tsx evidence/live-services-2026-10-20/verify-second-model.ts` reconstructs the already validated first-reading fields from reader-output.json and independently re-reads the same PDF. Add --interactive for the actual 15-second web budget. No model output cache is used.
- `node --env-file=.env --import tsx evidence/live-services-2026-10-20/send-notification.ts` sends another real synthetic email to the configured sender address. Run intentionally. It overwrites email-send.json with the new run token.
- Load the same environment before executing check-inbox.py. The Python standard-library runner authenticates to Gmail IMAP and checks only that run token.

The summary retains pass, fail and service limits separately. Historical 125-test and production-build proof still matches the unchanged product source. Fresh lint and TypeScript checks cover these new verification runners.
