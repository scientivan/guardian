# Google sign-in

The landing page is public. Open App goes to `/app`, then `/projects`, whose visible title is Dashboard. Missing or expired sessions go to `/login`. Users can continue with Google or choose Use demo account without a Google login. Both paths use signed sessions. Visiting `/login` with a valid session returns to the app immediately. Sessions last eight hours and are refreshed while in use. Open app tabs recheck the session every minute and on window focus.

## Google Console

Create an OAuth client with application type **Web application**.

| Setting | Local value |
| --- | --- |
| Authorized JavaScript origins | `http://localhost:3000` |
| Authorized redirect URIs | `http://localhost:3000/api/auth/callback/google` |

Use HTTP for the standard local Next.js server. The origin has no path. The callback must match exactly, including scheme, port and path. For production, add the HTTPS origin and its `/api/auth/callback/google` URL and set `NEXTAUTH_URL` to the production origin.

Configure the app name, support email and developer contact in Google Auth Platform. If the audience is External and publishing status is Testing, add the Google accounts that will test the app under Audience > Test users. Only basic identity scopes are requested, namely openid, email and profile.

## Local configuration

Put these variables in `.env` or `.env.local`, both of which Git ignores. If both files define a variable, `.env.local` takes precedence.

```dotenv
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random session secret>
GOOGLE_CLIENT_ID=<client ID from Google Console>
GOOGLE_CLIENT_SECRET=<client secret from Google Console>
```

Generate a session secret with `openssl rand -base64 32` if one is not already configured. Restart `npm run dev` after updating the file. Keep the secret and Google client secret on the server. They must not use the `NEXT_PUBLIC_` prefix.

The sign-in page shows a setup message until all three secret/client variables are present. It does not fall back to demo authentication. Cancelled or failed Google sign-in offers a retry. The case header shows the account and current case role and provides Sign out.

## Account data and current boundaries

Google sessions use the Google subject identifier, name, email and profile image. Google workspaces start empty and persist cases under that account. The application does not read Gmail messages. Demo entry generates a fresh random account identifier and seeds its own case, bill, pledges and refund data. Demo mutations cannot reach Stripe. Signing out and entering another demo account starts a new independent workspace.

Each account has its own SQLite database under `.cache/accounts/`, named by a SHA-256 hash of its signed account identifier. No client-supplied mode, owner ID or case ID can choose another account's database. Workspace APIs recheck the server session and reject mutations from other origins. `/case/C1` is not a fallback for Google users. The shared profile dropdown offers Sign out on the care-case list, wizard, invitations and case pages. Global fixture notices have been removed from the UI at Dien's request.

The five-step wizard saves entered patient and hospital details instead of opening C1. Uploaded documents use the existing local extraction, PII scrubber and reader pipeline, followed by estimate comparison where possible. The case assistant uses case-specific data. Personal workspaces have no fabricated hospital account, bill, payment request, refund or chain anchor. The wizard can select an institution from `/hospitals`, whose profile and payment authority are approved separately through the human `/admin` Verification Desk. Admin access requires a verified Google session with an email in `GUARDIAN_ADMIN_EMAILS`. Institutional confirmation and account-list signing still require hospital cooperation, and payments stay in test mode. See [Hospital Directory](HOSPITAL-DIRECTORY.md). Google invitations are sent either to a Google email (bound to that address and listed under Invitation Requests on the invitee's Dashboard) or as a share link (single use by the first Google account that accepts it). Both expire after 72 hours, show the case brief in a dialog, and create only the invited role after acceptance. Guardian does not send email messages. Shared-case access is checked on the server. Demo invitations remain within the original guest account.

The demo provides all case screens, seeded bill explanation, an interactive assistant and backend payment approvals, sandbox execution, refund reconciliation and per-member receipts. Real money transfers are not enabled by this account separation. Credentials provider behavior follows the [NextAuth documentation](https://next-auth.js.org/providers/credentials).

## Verification

- Anonymous requests to `/app`, `/projects`, `/projects/new`, `/case/C1` and `/join/example` must redirect to sign-in with their destination preserved.
- Sign in through Google, open a case, refresh, and open App again. A valid session must skip login.
- Sign out, then revisit a protected page. Sign-in must be required again.
- An expired or invalid cookie must not grant access. An open app tab must return to sign-in after the next session check.
- Test the office at desktop, tablet and phone sizes. The document must fit the viewport. The team can scroll internally and recent activity scrolls horizontally. Other case pages retain ordinary document scrolling.

References are the [NextAuth Google provider](https://next-auth.js.org/providers/google), [NextAuth options](https://next-auth.js.org/configuration/options) and [Google web server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server).
