# Hospital directory and human verification

Guardian separates institutional identity, payment authority and blockchain evidence. A family can propose a hospital, but only a configured human administrator can approve a profile or activate a signed account list. The registry is shared by Google workspaces. Patient records remain in private case databases.

## Administrator access

Set `GUARDIAN_ADMIN_EMAILS` in the ignored `.env` or `.env.local` to a comma-separated list of verified Google email addresses. Empty configuration denies all administrator access. Restart the development server if it has not reloaded the environment. Sign in with an authorized Google account and open `/admin`, or choose Verification Desk in the profile dropdown. Demo sessions and case owners do not inherit administrator rights. No browser form, header or JWT role field can grant the privilege.

The administrator portal includes Overview, Hospital Directory, Review Queue and Audit History. API handlers check the server session and current allowlist on every request. State-changing requests also require the same origin. Account provisioning remains server configuration, without a self-service role editor.

## Profile onboarding

1. Open the Hospital Directory from the Dashboard (`/hospitals`) to suggest an institution, or `/admin/hospitals/new` as an administrator. In the care case wizard, the hospital must be chosen from the directory (listed or verified, in the case's country). Typing only filters the list. If it is missing, "Add a hospital" asks for its name, country and city or regency. `POST /api/hospitals/request` then has AI draft the address, phone and official website with sources, and files it as a normal profile proposal. The wizard waits on that step, with the draft saved, until an administrator approves it. Incomplete AI drafts are refused with a pointer to the full suggestion form. Demo accounts can pick the demo hospital or directory entries but cannot add hospitals. "Start a care case here" on a directory entry pre-selects the hospital.
2. Search by exact hospital, branch, city and country, or enter the profile manually. Sources accompany the draft. Search results never establish trust.
3. Submit the profile with HTTPS source URLs. An initial profile is not published as a verified institution.
4. An administrator compares the proposal with existing data and opens or retrieves its evidence. A separate AI check can identify supported, conflicting and unknown claims.
5. The administrator records the confirmation channel, independent evidence source, confirmation details and decision notes, then explicitly confirms approval. Initial verification and identity recovery require a source outside the proposed domain.
6. Approval publishes the profile. Payment authority remains unverified until a separate review succeeds.

Search uses [Gemini Google Search grounding](https://ai.google.dev/gemini-api/docs/google-search) and falls back to [Groq browser search](https://console.groq.com/docs/tool-use/built-in-tools/browser-search). Only provider-returned citation or search-result metadata supplies the source list. Existing `GEMINI_API_KEY` and `GROQ_API_KEY` credentials are used. Legacy `GROK_API_KEY` is supported as the Groq key alias. `HOSPITAL_SEARCH_MODEL` optionally overrides the Gemini model. Quota or provider failures are surfaced with a manual-evidence path.

Search provenance is stored server-side and bound to the account for one hour. A client-supplied model name cannot select the independent-review policy. When a search provider is known, the reviewer excludes that provider. The reviewer has no registry mutation tools. If no independent provider responds, the result explicitly records unavailability rather than claiming a completed check. Human confirmation remains mandatory in either case.

## Payment authority

Open the institution record, choose Payment authority, and submit the official billing channel, hospital Ed25519 public key, bank name, signed account list and evidence. The public key must be obtained through independent institutional onboarding, not accepted merely because it appears on the proposed website. Never enter a private key.

The account list must have this shape. Its `hospitalId` must equal the directory identifier displayed by the form.

```json
{
  "hospitalId": "HD_<directory identifier>",
  "issuedAt": "2026-10-20T03:00:00.000Z",
  "payees": [
    { "id": "main", "name": "Hospital legal account holder", "account": "1234567890" }
  ],
  "signature": "<base64 Ed25519 signature>"
}
```

The signature covers the UTF-8 JSON encoding of this array, with payees sorted by ID, matching `canonicalPayload` in `src/server/portal.ts`.

```text
["guardian.payee-list.v1", hospitalId, issuedAt, [[payeeId, account, name], ...]]
```

The public key is base64 SPKI DER. At activation, the server checks the identifier, Ed25519 signature, unique payee identifiers, unambiguous account names and issue time within the previous seven days, allowing five minutes of future clock skew. The publicly known fixture key is rejected by the shared directory. A valid signature does not prove institutional ownership, so the administrator must separately attest to account, channel and key ownership through an established contact. Approving a profile never bypasses this decision.

Existing cases can choose a reviewed institution through the link on Pledges. New cases can select it in the wizard. Linking checks the care-case currency/country and cannot silently replace an already linked institution. Public directory responses omit full account numbers, keys, private evidence and administrator notes.

## Revisions, key rotation and incidents

Proposals retain a baseline version. Approving a stale proposal fails and requires a fresh review. A request for more evidence can be resubmitted by its original author or an administrator. Contact changes stay proposed until approved. Ordinary contact changes do not automatically stop valid payments. A change to the institution's name, branch or country places payment authority on hold for a separate review.

Normal key rotation requires confirmation through an established institutional channel plus an Ed25519 signature from the previous key over the UTF-8 JSON encoding of the following statement.

```text
["guardian.hospital-key-rotation.v1", hospitalId, newOfficialChannel, newPublicKey, signedList.issuedAt]
```

Supply that base64 signature in the rotation field. If the previous key or channel is lost or compromised, the reviewer must explicitly choose identity recovery, provide an independent source outside the proposed domain, and document the recovery in at least 60 characters. A new key cannot authenticate itself.

Incident controls can suspend payment authority, revoke it, or suspend the institution and its payment authority. A hold invalidates queued activation reviews. Restoration requires a fresh proposal and review. There is no blanket Resume button.

The backend checks current registry authority when projecting a linked case, at the payment gateway, and before submitting each approved share. Changed or removed payees cancel affected pending requests and withdraw active approvals. A new authority version gets new local payee identifiers, so an old approval cannot move to a replacement account. An already submitted charge cannot be undone by a later hold. Partial execution remains recorded and must be handled through the existing payment/refund process.

## Audit and optional blockchain evidence

Approved versions store the exact payload, sources, human proof, reviewer and timestamp in `directory_verifications`. The SHA-256 digest can be anchored separately to FISCO BCOS. Complete evidence stays off-chain. Anchoring checks the stored payload hash before writing. Failure leaves the local record intact and displays an honest unavailable state. Blockchain status does not grant payment authority.

The hash-chained institution audit records proposals, AI checks, decisions, holds and anchors. The directory refuses new approvals when that audit chain fails its integrity check. The shared directory database is `hospital-directory.db` under `GUARDIAN_ACCOUNTS_DIR`, defaulting to `.cache/accounts`. Its contents must be backed up with the deployment data, not committed to source control.

## API surfaces

| Route | Purpose |
|---|---|
| `GET /api/hospitals` | Published profiles and the current Google account's own proposals |
| `POST /api/hospitals/discover` | Find an untrusted hospital draft with grounded sources |
| `POST /api/hospitals/proposals` | Submit profile evidence, or an administrator's payment proposal |
| `POST /api/hospitals/proposals/:id/resubmit` | Supply requested evidence for the same institution |
| `POST /api/cases/:id/hospital` | Owner links a Google case to a verified institution |
| `GET /api/admin/access` | Whether the signed-in account can enter Verification Desk |
| `GET /api/admin` | Restricted institution records, queue, verification snapshots and audit |
| `POST /api/admin/sources` | Retrieve a public evidence page with private-network protection |
| `POST /api/admin/payment-list` | Retrieve the proposed channel's signed account list without trusting it |
| `POST /api/admin/reviews/:id/ai` | Independent advisory assessment |
| `POST /api/admin/reviews/:id/decision` | Human approval, rejection or request for evidence |
| `POST /api/admin/hospitals/:id/suspend` | Scoped hold or revocation with a reason |
| `POST /api/admin/verifications/:id/anchor` | Anchor an approved verification snapshot hash |

## Operational boundaries

The software records human attestations. It cannot prove a telephone call occurred or that a person actually performed the institutional checks. Administrators remain responsible for the evidence they approve. Hospital account-list signing requires institutional cooperation or a controlled test fixture. No automatic registry is populated from search results. Rechecks are triggered through submissions and administrator actions, without a scheduled monitoring job. The payment adapter remains sandbox or Stripe test mode. Tests using signed synthetic Google sessions demonstrate authorization behavior, not a fresh Google consent exchange or real hospital onboarding.

## Public hospital seed and client contributions

Run `npm run hospitals:seed` from `guardian/`. It loads the local environment and adds four official-source listings to the shared registry configured by `GUARDIAN_ACCOUNTS_DIR` (default `.cache/accounts`). Source data and contact-page URLs are in `src/server/hospital-seeds.json`. Repeated runs preserve existing records and pending reviews, including later incident holds. Matching canonical name, country and city also prevents a duplicate seed over an existing record.

The initial set covers HKU-Shenzhen Hospital (China), Bumrungrad International Hospital (Thailand), Singapore General Hospital (Singapore), and Gleneagles Hospital Penang (Malaysia). Public contact pages were checked on 20 October 2026. General enquiry numbers are not presented as verified billing contacts. No bank accounts, public signing keys or human verification proofs are seeded.

A `listed` profile is selectable for document management but has profile version zero, a pending identity review, and unverified payment status. Only human approval can establish a verified profile, followed by a separate payment review. Source listing does not imply affiliation or hospital onboarding. The wizard filters the directory by country and offers manual entry. Changing countries clears the prior hospital selection. Manually typing a name only creates an institution within the private care case and does not publish it to the shared directory. Demo selections populate mock case details without linking shared payment authority.

Clients currently help by submitting hospital identity/contact details and source URLs through **Suggest a hospital**, then responding to an admin request for more evidence. They cannot approve identity, establish a trusted channel, activate an account or self-promote to admin. Client evidence remains untrusted until independently checked. A future correction/evidence contribution flow for an existing public listing is a discussion proposal, not an implemented privilege. Patient documents should not become public directory evidence.
