-- Only Guardian-owned private namespaces are added. Existing Supabase schemas are untouched.
create schema if not exists guardian_meta;
revoke all on schema guardian_meta from public, anon, authenticated;
create table if not exists guardian_meta.migration_runs (
  source_key text primary key,
  source_digest text not null,
  target_namespace text not null unique,
  verification jsonb not null,
  completed_at timestamptz not null default now()
);
alter table guardian_meta.migration_runs enable row level security;
revoke all on guardian_meta.migration_runs from public, anon, authenticated;
comment on schema guardian_meta is 'Server-only Guardian migration ledger. Account data lives in private guardian_w_* namespaces.';
