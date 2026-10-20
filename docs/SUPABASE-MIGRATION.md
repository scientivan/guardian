# Supabase migration and deployment

Requested by Dien on 20 October 2026. Target URL is guardian.scientivan.dev.

## Plan

1. Inventory existing databases and uploads, create consistent backups, and confirm access to the target Postgres project. Do not delete local data.
2. Introduce a Postgres adapter for the existing synchronous domain engine. Queries run against real Postgres tables through an isolated Node worker and a bounded connection pool. No SQLite database image is stored in Postgres. Retain SQLite for offline tests and rollback.
3. Preserve workspace isolation using server-only schemas derived from account hashes. Keep the shared invitation and hospital directory schemas separate. Revoke public/anon/authenticated schema access and enable RLS without public policies. Continue existing signed-session and role checks at the server. Keep money in bigint minor units with safe-integer decoding.
4. Move uploaded originals and invoice bytes into an immutable private Supabase Storage bucket. Keep metadata and hashes in Postgres. Downloads continue through authenticated server routes with the existing role checks. No public file URLs or service keys in the browser.
5. Import each legacy database idempotently, preserve row ordering and sequence values, and compare source/target table counts, audit integrity and file hashes. Upload/download-verify each file before clearing its target Postgres byte column. Original SQLite files and backups remain intact.
6. Run SQLite regressions, focused real-Postgres isolation/concurrency tests, Storage authorization checks, lint, TypeScript and a production build. Cut over only after import verification.
7. Deploy to the user's hosting account, configure secrets, set NEXTAUTH_URL and Google callback for guardian.scientivan.dev, add only that subdomain in DNS, and verify HTTPS, login/demo, uploads and payments in sandbox. Preserve unrelated domain records.

## Compatibility and rollback

The application retains its synchronous domain API to preserve the audited financial checks. The adapter uses real network queries and therefore requires the Node runtime, not Edge. The worker pool does not retain a connection while the app waits for an LLM or SMTP call. Synchronous database calls block the request's Node event loop, a compatibility tradeoff rather than an async throughput optimisation. Horizontal concurrency is protected with database transactions and workspace advisory locks.

The initial deployment uses the existing NextAuth identity model. This is not a migration to Supabase Auth. Private schemas and a private Storage bucket are only reachable by the trusted backend. RLS and schema privileges prevent exposure through public Data API roles.

Keep GUARDIAN_DATABASE_DRIVER=sqlite for the old installation or set it to postgres after migration. Remote credentials never belong in NEXT_PUBLIC variables. Stop the new deployment before rolling back to an old snapshot, since writes after cutover would otherwise be lost. No automated destructive contraction is authorised by this plan.

## Access discovered

SUPABASE_URL is a PostgreSQL connection string and a read-only connection probe succeeded. The target currently has the standard Supabase schemas and no application tables. Storage additionally needs the project's HTTPS URL and a backend secret/service key. The Vercel CLI has an authenticated local account. Domain nameservers are Cloudflare. Dien selected Vercel, supplied backend Storage keys, installed the recommended Cloudflare CNAME and reported updating the Google OAuth callback. The production FISCO endpoint is intentionally unconfigured by Dien's decision because the existing node is local to the laptop.

## References

- [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase changelog](https://supabase.com/changelog)

The 12 Oct TLS changelog deprecates old CBC ciphers. Current Node TLS is used. The 25 Sep Postgres extension changes do not affect this migration, which does not introduce ltree, pgcrypto encryption or custom operators.

## Execution results

[Fact, 20 October] All nine SQLite databases were backed up consistently and imported. Every imported row was compared across original columns, legacy ordering and identity sequences were preserved, and all audit chains passed. Ten existing files totalling 4,397,584 bytes were uploaded and downloaded with exact SHA-256 checks before clearing target BLOB columns. A second import run skipped completed sources without overwriting cloud writes. Local sources remain untouched.

[Fact] The dedicated cloud probe passed an invoice round trip with zero bytes in the database BLOB, intact audit chain, a 5 MiB signed upload, wrong-user and wrong-route receipt rejection, and bundled English OCR. The security probe confirmed anon/authenticated have no schema access, every application table has RLS enabled, and unauthenticated public object access fails with HTTP 400. A two-process initialization/audit probe preserved exactly 40 seeded bill items and ten audit additions. Its payment/refund extension passed with a CNY 9,000 refund. A directory listing/deduplication probe also passed. These are focused live probes, separate from the 125 offline regressions.

[Fact] A complete PostgreSQL custom-format backup and 11 referenced private objects were written and hash-verified with pg_dump 17. The original system pg_dump 14 was incompatible with server 17.11, so the local ignored PG_DUMP_BIN now selects the installed version 17. Migration backups live in .cache/supabase-backups, cloud backups in .cache/backups. Neither is committed.

[Fact] Vercel project guardian is connected to scientivan/guardian. Cloudflare CNAME guardian points to 60dacdc2fb70470b.vercel-dns-017.com with proxy disabled. Vercel verified the domain and serves HTTPS. Public browser verification passed on guardian.scientivan.dev. Demo login, cloud workspace, sandbox payment, private 5 MiB original/invoice upload and exact invoice download, payer original-document HTTP 403 and payer audit filtering passed with zero page JavaScript errors. An intentionally malformed synthetic PDF correctly returned needs_reupload while preserving its original. Results and screenshots are in evidence/supabase-deployment-2026-10-20. Initial worker dependency packaging and concurrent demo-seeding failures were fixed before this passing run.

## Operations

- Local development defaults to SQLite and database BLOBs unless the explicit driver variables select cloud mode. The current ignored .env selects postgres and supabase after verified import. NextAuth remains the identity provider.
- Production uses Node 22, Next.js 15.5.28, Mumbai functions colocated with the ap-south-1 database, the transaction pooler on port 6543, verified TLS with Supabase's public CA, and at most four pooled connections per process. Query and RPC waits are bounded at 60 and 75 seconds to accommodate serialized cold initialization. Money is bigint with safe-integer decoding.
- Browser uploads use a server-authorized immutable signed upload URL. An HMAC receipt binds the uploaded object to the session, destination, file size and a 15-minute processing window. Private downloads are authorized by existing membership rules and redirected to a 60-second signed URL. This preserves the 10 MB limit across Vercel's 4.5 MB function body limit. Invoice files remain visible to all case members.
- Vercel OCR uses bundled Tesseract WASM and English language data. Native local Tesseract remains available outside Vercel. Raw files do not go to an LLM.
- Run npm run data:backup for a custom-format PostgreSQL dump plus verified referenced Storage files. Set PG_DUMP_BIN to pg_dump 17 or newer. Keep the dump and objects.json with its objects directory. Provider database backups alone do not include Storage object bytes. Transient staging/probe objects are not part of the referenced-file backup.
- Cloud demo reset preserves every cloud workspace and migration source. Sign out and start a new demo session for a clean seeded workspace. Deliberate SQLite cleanup requires selecting the SQLite driver explicitly.
- Recover in an isolated database and private bucket first. Restore the dump with a compatible pg_restore, upload every objects.json entry under its original key, verify SHA-256 and audit chains, then switch production secrets. Do not restore over current production data. Automatic deletion of old databases or Storage objects is not implemented.
- FISCO anchoring is disabled in production with Dien's approval. Database hash chains continue to work. Enable anchoring only after a production-accessible node and its credentials are supplied. Google callback configuration was reported complete by Dien, while actual Google consent requires a real user login.

## Reproduction

```sh
npm run data:migrate:supabase
GUARDIAN_DATABASE_DRIVER=postgres GUARDIAN_STORAGE_DRIVER=supabase node --env-file=.env --import tsx scripts/cloud-probe.ts
node --env-file=.env --import tsx scripts/cloud-security-probe.ts
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The probe scripts create synthetic verification data. The browser runner in evidence/supabase-deployment-2026-10-20 uses an external Playwright installation and Chrome. Never expose .env, database dumps or original uploads in public evidence.

The Next.js 15 release line was patched from 15.5.4 to 15.5.28 for deployment. Existing dependency audit findings, including development-tool findings, are not claimed resolved by this persistence migration. The user's Nodemailer 10 choice is retained and install commands use legacy peer resolution.

[Fact] Final source commit 2c98f9a was automatically deployed from main and reached READY. The final production check passed demo login, unauthenticated HTTP 401, two simultaneous cold workspace reads with HTTP 200 in 1.54/1.74 seconds, Mumbai function placement and the correct Google redirect URI. Real Google consent was not automated. Final evidence is in evidence/supabase-deployment-2026-10-20/final-health.json. All 125 offline tests, lint, TypeScript and an isolated production build passed before the source push.
