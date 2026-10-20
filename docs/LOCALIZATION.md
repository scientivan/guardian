# English and Simplified Chinese interface

The header offers English and 中文 on public pages, login, case lists, case workspaces and the verification desk. English is the default. The language preference is stored in the `guardian-language` cookie for one year and applies across navigation and reloads. Switching languages updates the existing React tree, preserving form values, selections and open dialogs.

## Implementation

`src/components/i18n/LocaleProvider.tsx` owns the preference, language switch and rendering helpers. The root layout reads the whitelisted cookie for server rendering and sets the document language. `src/lib/i18n/zh-CN.json` is a static Simplified Chinese catalogue. `translateText` translates known interface messages and templates, retaining dynamic template values verbatim. Unknown messages retain their original text. No translation API runs in a user's browser or during a payment.

The switch changes presentation only. Currency codes, amounts, payment identifiers, stored role values and authorization rules retain their existing meanings. Original documents, user entries, source citations and model-generated prose retain their original language. This feature does not promise Chinese versions of uploaded documents, AI responses, Google consent screens, payment-provider pages, emails or downloaded reports.

## Verification

Run `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build` from a clean checkout. Stop the development server before building, or build in an isolated directory. Unit tests cover language validation, known and unknown messages, template values and financial-copy invariants.

Browser checks cover both directions, cookie persistence and server-rendered Chinese after reload, public and application navigation, keyboard-accessible controls, mobile width, form-state retention and unchanged financial figures. Production checks use the deployed website after release.

## Verified on 20 October 2026

131 tests passed, including six localization tests. ESLint, TypeScript and an isolated production build passed. Chromium checks passed a seeded test sign-in (since removed), language-cookie persistence, six case tabs, wizard form retention, 375px public and case layouts without horizontal overflow, and no JavaScript errors. The Chinese catalogue contains 1,519 messages. Unknown source prose remains in its original language.

The same browser checks passed on https://guardian.scientivan.dev after deployment of source commit `2305084`. Keyboard activation of the English button passed. A direct request with the Chinese preference returned HTTP 200 with Chinese HTML language, heading and document title. No financial mutation was submitted during these production checks.
