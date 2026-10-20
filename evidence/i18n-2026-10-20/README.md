# English / Simplified Chinese verification

Verified on 20 October 2026 against source commit `2305084`.
Production site https://guardian.scientivan.dev.
Vercel deployment `dpl_Gp82Mq9M1ZEfvoXEe1WThuJxBw1X` reached READY and the custom domain was aliased successfully.

- `npm test` passed 131 tests across 20 files, including six localization tests.
- `npm run lint` and `npx tsc --noEmit` passed.
- Isolated local and Vercel production builds passed.
- Chromium production checks passed demo login and Chinese preference persistence after reload.
- Bill Review, Pledges, Case Members, Close and Records, Case History and How It Works rendered without JavaScript errors.
- Switching English / 中文 retained a typed wizard field value.
- Public and case screens had zero horizontal overflow at 375px.
- Keyboard Space activated the English button and changed the document language to `en`.
- A direct production request with `guardian-language=zh-CN` returned HTTP 200, `lang="zh-CN"`, the Chinese heading and Chinese document title.

No financial mutation was submitted during these production checks. No browser session, cookies, personal screenshots or credentials are included in this evidence folder. Local screenshots remain in ignored development cache.

For reproduction and supported scope, see [localization notes](../../docs/LOCALIZATION.md).
