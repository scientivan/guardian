# API contract (FE ↔ BE)

Version 1.1, 17 October 2026. Owner: Dien (backend). Consumer: Aurel (UI/FE). Change this file first, then the code, so FE and BE stay in sync.

## Conventions

- Base path `/api`. JSON in and out. Route handlers in `src/app/api/`.
- **Money is an integer in minor units** (fen for CNY: `3000000` = CNY 30,000.00; rupiah has no minor unit in display but is stored ×100 too). Every money field is paired with a `currency` field. FE formats; FE never does money math.
- Current user: header `x-member-id` (demo only, no real auth). Values come from `GET /api/cases/:caseId`.
- Time: ISO 8601 UTC strings.
- Errors: `{ "error": { "code": string, "message": string, "check"?: 1|2|3|4|5 } }`. `check` is the gateway check that rejected the action (`docs/ARCHITECTURE.md` §3.6). FE shows `message` as is.
- State-changing responses include `auditSeq` so FE can link to the audit view.
- Demo labelling: every response includes `"demo": true`. FE shows a visible "Demo data" badge.

## Case

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
    "payCurrency": "IDR", "payAmount": 459000000, "fxRate": "2295.00", "fee": 4590000, "quoteExpiresAt": "…",
    "status": "approved", "chargeRef": null, "ts": "…"
  }]
}]
```

Request `status`: `pending`, `executing`, `paid`, `expired`, `cancelled`, `failed`. Approval `status`: `approved`, `withdrawn`, `charged`, `charge_failed`.

`POST /api/payment-requests/:requestId/fx-quote` body `{ "amount": 2000000 }` (member from header)

```json
{ "demo": true, "amount": 2000000, "currency": "CNY", "payCurrency": "IDR", "payAmount": 459000000, "fxRate": "2295.00", "fee": 4590000, "quoteId": "Q9", "expiresAt": "…" }
```

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

Plus a member picker (sets `x-member-id`) to switch roles during the demo, and a visible "Demo data" badge. Until endpoints exist, mock the JSON above.
