# API contract (FE ↔ BE)

## Hospital verification update, 20 October 2026

Version 1.3 adds `/api/hospitals` and `/api/admin` with the workflow in [Hospital Directory](HOSPITAL-DIRECTORY.md). Shared profile records, payment-authority reviews and verification hashes are separate from patient cases. Human administrator access uses the server-configured Google-email allowlist. A family may propose a profile but cannot activate accounts. Discovery and independent AI review are advisory, without mutation tools.

`GET /api/hospitals` returns published profile/contact data and the signed-in Google account's own proposals. `GET /api/admin` is restricted and returns institution records, reviews, verification snapshots and a hash-chained audit. All administrative writes require the same origin. Decisions require baseline-version checks and recorded human confirmation. Payment activation additionally validates the signed account list. Holds and recipient replacements invalidate old pending requests and approvals through the gateway's current-directory checks. See the workflow document for endpoint bodies, signing formats and operational boundaries.

## Integration update, 20 October 2026

Version 1.2 supersedes the authentication and fixture conventions below. Both Google and demo sessions are signed. The server resolves the acting case member from the session and accepted membership. `x-member-id` is accepted only inside the current demo account and only for members of that case. Google requests cannot choose a different actor. Workspace snapshots are UI projections of backend tables, not a second payment ledger.

The existing document, analysis, second-reader, gateway, FX, state-machine, refund, recap and audit modules own their respective operations. Demo execution uses an isolated sandbox charger. Google execution uses the existing Stripe test adapter, which rejects live keys. A case without a pinned hospital key and official channel cannot enroll a payee. No invoice or user-entered account can create payee trust. FISCO anchoring records actual transaction results when available and reports unavailability without claiming an anchor exists.

Invitations for Google users are bound to the invited email and expire after 72 hours. A signed-in Google account must match that address before accepting. Acceptance creates the invited role, not an owner role. Demo invitations and member switching stay within the originating guest workspace. Global demo badges remain removed by Dien's instruction. UI errors include a safe message and an optional gateway check number.

Integration acceptance covers upload and re-upload, document selection and cited explanation, chat actions and clarification, trusted payee verification, request creation, server FX quotes, own approval and withdrawal, explicit owner execution/cancellation, refund reconciliation and follow-up, member recap, hash verification, agent activity and shared-case invitations. `GET /api/cases/:caseId` returns the full nested `CareCase` view defined in `src/lib/workspace.ts`, including `case`, `documents`, `explanation`, `items`, `requests`, `refunds`, `audit` and `agents`. `/api/workspace` and `GET /api/cases` return `{ mode, cases }`. The original endpoint examples below describe individual resources, with these version 1.2 changes taking precedence. Errors use the flat shape `{ error: string, code: string, check?: number }`.

Historical version 1.1 examples, 17 October 2026. Owner: Dien (backend). Consumer: Aurel (UI/FE). Change this file first, then the code, so FE and BE stay in sync.

## Conventions

- Base path `/api`. JSON in and out. Route handlers in `src/app/api/`.
- **Money is an integer in minor units** (fen for CNY: `3000000` = CNY 30,000.00; rupiah has no minor unit in display but is stored ×100 too). Every money field is paired with a `currency` field. FE formats; FE never does money math.
- Current user comes from the signed session. Only a demo session can select one of its own case members with `x-member-id`.
- Time: ISO 8601 UTC strings.
- Errors have a flat `error` message, `code`, and optional gateway `check`. The frontend shows the safe message.
- State-changing responses include `auditSeq` so FE can link to the audit view.
- Demo mode is account-scoped. The UI has no global fixture badge. Payment confirmation discloses the sandbox or Stripe test adapter.

## Case

Version 1.2 wraps the case metadata below in `case` and adds the other `CareCase` fields.

`GET /api/cases/:caseId`

```json
{
  "demo": true,
  "id": "C1",
  "currency": "CNY",
  "hospital": { "id": "H1", "name": "Shenzhen International Hospital (demo)", "officialChannel": "https://hospital.example/billing" },
  "me": { "id": "M_JKT", "role": "payer" },
  "members": [{ "id": "M_JKT", "displayName": "Adi (Jakarta)", "role": "payer", "shareLimit": 2000000, "currency": "IDR" }],
  "payees": [{ "id": "P1", "name": "Shenzhen International Hospital (demo)", "accountMasked": "•••• 2222", "source": "official_registry", "verifiedAt": "…" }],
  "anomalies": [{ "id": 1, "kind": "unverified_payee", "detail": "…", "resolved": false, "ts": "…" }],
  "totals": { "paid": 3000000, "billedSoFar": 3270000, "currency": "CNY" }
}
```

## Documents

`POST /api/cases/:caseId/documents` (multipart: `file`, `type` = `estimate` | `interim` | `final`)

```json
{ "demo": true, "documentId": "D2", "sha256": "…", "anchoredTx": null, "status": "parsed", "auditSeq": 12 }
```

`status`: `parsed`, `needs_reupload` (OCR failed or line sum ≠ stated total; `reason` field explains).

`GET /api/documents/:documentId`

```json
{
  "demo": true,
  "id": "D2", "type": "interim", "sha256": "…", "anchoredTx": "0x…",
  "currency": "CNY",
  "items": [{ "id": "I7", "category": "room", "description": "Ward bed per day", "qty": 5, "unitPrice": 120000, "lineTotal": 600000, "flags": [] }]
}
```

## Bill explanation (core screen)

`GET /api/cases/:caseId/explanation?documentId=D2`

```json
{
  "demo": true,
  "currency": "CNY",
  "total": 3270000,
  "estimate": { "low": 3000000, "high": 3400000, "assumedStayDays": 3 },
  "actualStayDays": 5,
  "byCategory": { "room": 600000, "drug": 90000, "procedure": 2500000, "lab": 60000, "consumable": 20000, "other": 0 },
  "lines": [
    { "type": "arithmetic_fact", "text": "The stay is 2 days longer than the estimate assumed, adding CNY 2,400.", "amount": 240000, "itemIds": ["I7"] },
    { "type": "stated_in_document", "text": "The bill notes an extra antibiotic course.", "itemIds": ["I12"] },
    { "type": "unknown_ask_hospital", "text": "Ask why pillow cases are billed separately.", "itemIds": ["I30"] }
  ],
  "questions": [{ "kind": "basic_item_billed", "itemIds": ["I30"], "text": "Why is this item billed separately?" }],
  "secondModelChecked": ["I30"],
  "referenceNote": "Reference prices are indicative, not regulated prices."
}
```

`lines[].type`: `arithmetic_fact` (computed by code), `stated_in_document`, `unknown_ask_hospital`. `questions[].kind`: `duplicate`, `basic_item_billed`, `above_reference`, `models_disagree`. Amounts come from code; only `text` comes from the LLM.

## Payment requests and approvals

`POST /api/cases/:caseId/payment-requests` (owner only)

Body `{ "payeeId": "P1", "amount": 5000000, "purpose": "emergency guarantee", "expiresInMinutes": 120 }`

`GET /api/cases/:caseId/payment-requests`

```json
[{
  "id": "R2", "payeeId": "P1", "payeeName": "Shenzhen International Hospital (demo)",
  "amount": 5000000, "currency": "CNY", "approved": 4500000, "remaining": 500000,
  "purpose": "emergency guarantee", "status": "pending", "expiresAt": "…",
  "approvals": [{
    "memberId": "M_JKT", "displayName": "Adi (Jakarta)", "amount": 2000000,
    "payCurrency": "IDR", "payAmount": 4590000000, "fxRate": "2295.0000", "fee": 45900000, "quoteExpiresAt": "…",
    "status": "approved", "chargeRef": null, "ts": "…"
  }]
}]
```

Request `status`: `pending`, `executing`, `paid`, `expired`, `cancelled`, `failed`. Approval `status`: `approved`, `withdrawn`, `charged`, `charge_failed`.

`POST /api/payment-requests/:requestId/fx-quote` body `{ "amount": 2000000 }` (member from header)

```json
{ "demo": true, "amount": 2000000, "currency": "CNY", "payCurrency": "IDR", "payAmount": 4590000000, "fxRate": "2295.0000", "fee": 45900000, "quoteId": "Q9", "expiresAt": "…" }
```

The helper is charged `payAmount + fee` in `payCurrency`. Quotes expire after 15 minutes; an approval must use the member's own unexpired quote for the same amount (else error with `check: 4`). Rates and the 1% fee are demo values.

`POST /api/payment-requests/:requestId/approvals` body `{ "amount": 2000000, "quoteId": "Q9" }`

Success `{ "ok": true, "approved": 2000000, "remaining": 3000000, "auditSeq": 20 }`. Rejection uses the error shape with `check` (3 = role, 4 = amount or share limit).

`DELETE /api/payment-requests/:requestId/approvals/me` (withdraw own approval while `pending`)

`POST /api/payment-requests/:requestId/execute`

Success `{ "ok": true, "status": "paid", "charges": [{ "memberId": "M_JKT", "chargeRef": "pi_test_…", "status": "charged" }], "auditSeq": 21 }`. Runs gateway checks 1–5. Rejection uses the error shape.

`POST /api/payment-requests/:requestId/cancel` (owner only)

## Payee verification

`POST /api/cases/:caseId/payees/verify` (owner only) body `{ "hospitalId": "H1" }`

Fetches the signed payee list from the hospital's official channel and enrolls verified payees. Response lists enrolled payees and resolves related anomalies if the disputed account was not on the list (it stays blocked).

## Chat (agent)

`POST /api/cases/:caseId/chat` body `{ "message": "bayarin aja yg kemarin dong" }`

```json
{
  "demo": true,
  "reply": "There are two open bills (D2 and D3). Which one, and how much?",
  "actions": [{ "type": "ask_clarification", "options": [{ "label": "D2 · CNY 32,700", "value": "D2" }, { "label": "D3 · CNY 8,100", "value": "D3" }] }],
  "auditSeq": 30
}
```

`actions[].type`: `explain_bill`, `ask_clarification`, `request_approval`, `prepare_payment`, `track_refund`, `ask_hospital`, `warning`. FE renders `request_approval` and `prepare_payment` as buttons that call the endpoints above. The agent never pays by itself. `warning` carries `severity` (`info` | `high`) and `text`.

## Refunds

`GET /api/cases/:caseId/refunds`

```json
{
  "demo": true, "currency": "CNY", "totalRefund": 900000,
  "items": [{ "memberId": "M_JKT", "displayName": "Adi (Jakarta)", "amount": 450000, "status": "requested", "dueAt": "…", "overdue": false }]
}
```

`status`: `requested`, `processing`, `received`.

`POST /api/demo/clock` body `{ "advanceDays": 30 }` (demo only; moves the simulated clock to show overdue reminders)

## Recap

`GET /api/cases/:caseId/recap?memberId=M_JKT` returns the member's payments, purposes, receipts, refund share and document hashes.

## Audit log

`GET /api/cases/:caseId/audit` returns `{ "chainValid": true, "anchoredHead": { "hash": "…", "tx": "0x…" }, "rows": [{ "seq", "ts", "actor", "action", "inputSources", "decision", "result", "prevHash", "hash" }] }`.

## Screens (Aurel)

1. **Case overview:** members and roles, payees with source badge, open anomalies (prominent), totals.
2. **Upload:** estimate or bill; shows `needs_reupload` reason.
3. **Bill explanation (core):** estimate range vs total, lines grouped by type (fact / stated / ask hospital), each linked to its items, questions list.
4. **Payment request:** progress bar approved vs remaining, per-helper rows with currency and FX quote, approve / withdraw, expiry countdown.
5. **Chat:** agent replies with action buttons and clarification options.
6. **Refunds:** per-member share, status, overdue reminder.
7. **Audit log:** rows, chain status, anchor tx (for judges).

Plus a member picker (sets `x-member-id`) to switch roles during the demo. The 1.1 "Demo data" badge and JSON mocks were replaced in 1.2: there is no global badge, and the UI calls the live endpoints.

## Additional web operations in version 1.2

- `POST /api/cases`, `GET /api/cases` and `GET /api/workspace` create and list private or accepted shared cases.
- `GET /api/documents/:id/file` downloads the stored original for owner or companion. Upload accepts optional `replacementDocumentId` for an unreadable document.
- `POST /api/cases/:id/explanation?documentId=...` explicitly recomputes a selected bill.
- `GET /api/cases/:id/chat` returns the acting member’s stored chat history.
- `POST /api/cases/:id/invitations` accepts `name`, `delivery` (`email` or `link`), `email` (required for `email`), `role`, `shareLimit` and `limitCurrency`. `shareLimit` is in `limitCurrency` (the owner's own currency) and is stored in the hospital currency at the reference rate, rounded down. The owner no longer chooses the helper's payment currency. The helper picks it on acceptance: `currency` in the accept body must be one with a reference rate for the case, and every invitation preview lists the options in `currencies`. Names and emails are checked with the same rules as the forms (`src/lib/validate.ts`); a failed rule returns `400 INVALID_INPUT` with its message. An `email` invite is bound to that Google address. A `link` invite has no email and can be accepted once by the first Google account that opens it, within 72 hours.
- `POST /api/hospitals/request` (Google accounts) takes `{ name, country, city }`, has AI draft the remaining profile fields with source citations, and files a pending profile proposal. It returns `{ review: { id, hospitalId, status }, profile, uncertainties }`. A second request for the same name and city returns the existing pending review. An incomplete AI draft returns `422`. Google care cases must name `hospitalDirectoryId` (a listed or verified directory hospital). Free text is refused.
- `GET /api/invitations` lists pending email invitations addressed to the signed-in account (Dashboard → Invitation Requests). `GET /api/invitations/id/:id` shows one; `POST` with `{ action: "accept" | "decline" }` answers it.
- `GET /api/invitations/:token` previews a link invitation and `POST` accepts it. Every preview returns the case brief: patient, hospital, country, inviter, role, share limit, payment currency and expiry.
- `POST /api/cases/:id/refunds/reconcile` accepts documentId. Demo-only `/refunds/status` accepts memberId and status. `/follow-up` records an audit event, without sending external messages.
- `POST /api/cases/:id/clock` accepts advanceDays for demo owners only.
- FX quotes use the configured reference table, not a live-market rate feed. Quotes expire after 15 minutes.
- Routes that call a model (document upload, explanation POST, chat POST, `/hospitals/discover`, `/admin/reviews/:id/ai`) are rate-limited per account and per client IP (`src/server/rate-limit.ts`). Over the limit: `429`, `Retry-After`, body `{ error, code: "RATE_LIMITED", retryAfter }`.
- Web document reading has a 70-second model budget. Independent checking and explanation have separate bounded budgets and preserve deterministic arithmetic when AI is unavailable. Blockchain RPC is bounded and its provider is closed after every attempt.
