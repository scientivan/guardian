# Sandbox execution evidence, 20 October 2026

Run at 2026-10-20T10:00:47.996Z (UTC) by `node --import tsx evidence/sandbox-run-2026-10-20/run.mts`. Synthetic demo case C1, temporary SQLite database, demo sandbox charger, no LLM, no Stripe network call, no blockchain node (anchor fields read "not configured"). Same engine as the web API (`src/server/integration.ts`).

**Result: 18/18 steps behaved as expected.** Raw records: `steps.jsonl` (each step) and `audit.jsonl` (41 hash-chained audit rows of the case, including the seeded story rows).

| # | Time (UTC) | Actor | Action | Expected | Outcome | Detail |
|---|---|---|---|---|---|---|
| 1 | 10:00:47.996 | Rina (owner) | Open seeded case C1 | verified payee from the signed list; one paid deposit, one pending guarantee | pass | payee Shenzhen International Hospital •••• 2222 (official_registry); Initial deposit CNY 30,000 paid; Emergency guarantee CNY 45,000 of CNY 50,000 pledged |
| 2 | 10:00:48.008 | Rina (owner) | A7: pay an account that is not in the registry | gateway check 1 | pass | refused HTTP 409, check 1: payee is not in the hospital's official account list |
| 3 | 10:00:48.021 | Rina (owner) | Execute the guarantee before it is fully pledged | refused, nothing charged | pass | refused HTTP 409, check 4: approved 4500000 of 5000000 |
| 4 | 10:00:48.031 | Dewi (companion) | A4: companion pledges a share | role check 3 | pass | refused HTTP 403, check 3: Companions cannot approve payments. |
| 5 | 10:00:48.050 | Masjid fund (payer) | A4: pledge CNY 15,000, above own CNY 10,000 limit | gateway check 4 | pass | refused HTTP 409, check 4: amount exceeds this member's share limit |
| 6 | 10:00:48.054 | Adi (payer) | A4: payer creates a payment request | role check 3 | pass | refused HTTP 403, check 3: Only the case owner can do this. |
| 7 | 10:00:48.073 | Rina (owner) | Deposit that is not the estimate's lower or upper end | plan check 4 | pass | refused HTTP 409, check 4: A deposit from the estimate is its lower or upper end. |
| 8 | 10:00:48.106 | Rina (owner) | Pay while a payee warning is open (seeded A1 warning) | gateway check 5 | pass | refused HTTP 409, check 5: open anomaly; verify through the hospital's official channel first |
| 9 | 10:00:48.118 | Rina (owner) | Verify the hospital account through its official channel | signed list verified; open payee warnings resolved | pass | open warnings after verification: 0 |
| 10 | 10:00:48.126 | Masjid fund (payer) | Pledge recorded for the missing CNY 5,000 (made during the previous step) | request fully pledged | pass | pledged IDR 11,475,000 (CNY 5,000) + IDR 114,750 fee at 1 CNY = 2295.0000 IDR; request CNY 50,000 of CNY 50,000 |
| 11 | 10:00:48.147 | Rina (owner) | Execute the covered guarantee | five checks pass; each share charged separately in the sandbox | pass | status paid; M_JKT=sandbox_1622cc304e1af3e106669ab4, M_KL=sandbox_17b85535a1012196fc0f9bb8, M_DXB=sandbox_ea8cc23949b5a38dbf220285, M_MOSQUE=sandbox_00d90cf216cdebde90c8fb02; log head anchor not configured |
| 12 | 10:00:48.155 | Rina (owner) | Execute the same request again | refused, no double charge | pass | refused HTTP 409, check 3: request is paid |
| 13 | 10:00:48.161 | Adi (payer) | Read the case as a payer | own share and receipt only; no other payer's charge in the audit view | pass | approvals visible: M_JKT; other payers mentioned in audit view: 0 |
| 14 | 10:00:48.170 | Dewi (companion) | Attach hospital invoice to Initial deposit | stored with SHA-256; anchored when a chain is configured | pass | sha256 e5c62df5dab5c87b…; anchor not configured |
| 15 | 10:00:48.179 | Dewi (companion) | Attach hospital invoice to Emergency guarantee | stored with SHA-256; anchored when a chain is configured | pass | sha256 e5c62df5dab5c87b…; anchor not configured |
| 16 | 10:00:48.202 | Rina (owner) | Reconcile the final bill | refund split in proportion to what each person paid | pass | final CNY 71,000; refund CNY 9,000: M_OWNER CNY 3,375, M_JKT CNY 2,250, M_KL CNY 1,687.5, M_DXB CNY 1,125, M_MOSQUE CNY 562.5 |
| 17 | 10:00:48.229 | Rina (owner) | Close the care case | allowed: no open request, final bill read, every paid request has an invoice | pass | closed 2026-10-20T10:00:48.214Z; closing pack sha256 386df8a052e77adf…; anchors not configured |
| 18 | 10:00:48.234 | Auditor (code) | Verify the hash chain | every row links to the previous hash | pass | intact over 41 rows |

## Audit rows written by this run

| Seq | Time (case clock) | Actor | Action | Decision | Hash |
|---|---|---|---|---|---|
| 20 | 2026-10-20T10:00:48 | M_OWNER | gateway.check | deny | `cf4e58398d2d…` |
| 21 | 2026-10-20T10:00:48 | gateway | gateway.check | deny | `89e2005361cb…` |
| 22 | 2026-10-20T10:00:48 | M_COMP | permission.denied | deny | `5f86b5e9c4ed…` |
| 23 | 2026-10-20T10:00:48 | M_MOSQUE | fx.quote | allow | `2602fc61dfcd…` |
| 24 | 2026-10-20T10:00:48 | M_MOSQUE | gateway.check | deny | `422ea14b1550…` |
| 25 | 2026-10-20T10:00:48 | M_JKT | permission.denied | deny | `4b16cfbbcdf1…` |
| 26 | 2026-10-20T10:00:48 | M_MOSQUE | fx.quote | allow | `0c3eb8cc9811…` |
| 27 | 2026-10-20T10:00:48 | M_MOSQUE | approval.record | allow | `0d807d5fa451…` |
| 28 | 2026-10-20T10:00:48 | gateway | gateway.check | deny | `ce648a5ba228…` |
| 29 | 2026-10-20T10:00:48 | M_OWNER | payee.enroll | allow | `6b4da9b85257…` |
| 30 | 2026-10-20T10:00:48 | gateway | gateway.authorize | allow | `f4a779fc2e47…` |
| 31 | 2026-10-20T10:00:48 | M_OWNER | request.execute | allow | `9bddfab13b69…` |
| 32 | 2026-10-20T10:00:48 | gateway | charge | allow | `9921e118fd44…` |
| 33 | 2026-10-20T10:00:48 | gateway | charge | allow | `52478ee45d1d…` |
| 34 | 2026-10-20T10:00:48 | gateway | charge | allow | `d67e62d6c816…` |
| 35 | 2026-10-20T10:00:48 | gateway | charge | allow | `91b45fe9ce95…` |
| 36 | 2026-10-20T10:00:48 | gateway | request.paid | info | `26eb7def8d0b…` |
| 37 | 2026-10-20T10:00:48 | gateway | gateway.check | deny | `1c500d131693…` |
| 38 | 2026-10-20T10:00:48 | M_COMP | request.invoice | info | `dbaf54a52614…` |
| 39 | 2026-10-20T10:00:48 | M_COMP | request.invoice | info | `85b4459a881a…` |
| 40 | 2026-10-20T10:00:48 | system | refund.open | info | `8ac82014bf21…` |
| 41 | 2026-10-20T10:00:48 | M_OWNER | case.closed | info | `67b560ffd0ab…` |

Case clock: the demo case runs on its own clock (`src/server/clock.ts`), so audit timestamps follow the seeded story date rather than the wall clock.
