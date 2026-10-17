import Database from "better-sqlite3";

// Amounts are stored as integer minor units (fen for CNY) to avoid float drift.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  official_channel TEXT NOT NULL,
  -- Ed25519 public key (base64 SPKI DER) pinned out of band; verifies the portal's signed payee list.
  public_key TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  patient_token TEXT NOT NULL,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','payer','companion')),
  share_limit INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY'
);
CREATE TABLE IF NOT EXISTS payees (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  account TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  source TEXT NOT NULL,
  verified_at TEXT
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  type TEXT NOT NULL CHECK (type IN ('estimate','interim','final')),
  sha256 TEXT NOT NULL,
  anchored_tx TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES documents(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  qty REAL NOT NULL,
  unit_price INTEGER NOT NULL,
  flags TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  payee_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','executing','paid','expired','cancelled','failed')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS fx_quotes (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES payment_requests(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  pay_currency TEXT NOT NULL,
  pay_amount INTEGER NOT NULL,
  rate_e4 INTEGER NOT NULL,
  fee INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL REFERENCES payment_requests(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved','withdrawn','charged','charge_failed')),
  quote_id TEXT REFERENCES fx_quotes(id),
  charge_ref TEXT,
  withdrawn_at TEXT,
  ts TEXT NOT NULL,
  UNIQUE (request_id, member_id)
);
CREATE TABLE IF NOT EXISTS anomalies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL REFERENCES cases(id),
  kind TEXT NOT NULL,
  detail TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL REFERENCES cases(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  due_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pii_tokens (
  case_id TEXT NOT NULL,
  token TEXT NOT NULL,
  value TEXT NOT NULL,
  kind TEXT NOT NULL,
  PRIMARY KEY (case_id, token)
);
CREATE TABLE IF NOT EXISTS audit_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  case_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  input_sources TEXT NOT NULL,
  decision TEXT NOT NULL,
  result TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export type DB = Database.Database;

export function openDb(path = process.env.GUARDIAN_DB ?? "guardian.db"): DB {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

let shared: DB | undefined;

export function getDb(): DB {
  shared ??= openDb();
  return shared;
}
