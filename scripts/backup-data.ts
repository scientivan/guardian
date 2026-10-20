// Consistent copy of every Guardian SQLite file while the app keeps running (TASKS 7.5).
//
//   npm run data:backup                       -> <GUARDIAN_BACKUP_DIR>/<UTC timestamp>/
//   GUARDIAN_BACKUP_KEEP_DAYS=7 (default)     -> older backup folders are removed
//
// Uses SQLite's online backup API (better-sqlite3 `backup`), not a raw file copy, so a write in
// progress cannot leave a torn database in the backup.

import Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const accounts = process.env.GUARDIAN_ACCOUNTS_DIR ?? join(process.cwd(), ".cache", "accounts");
const legacy = process.env.GUARDIAN_DB ?? "guardian.db";
const root = process.env.GUARDIAN_BACKUP_DIR ?? join(process.cwd(), ".cache", "backups");
const keepDays = Number(process.env.GUARDIAN_BACKUP_KEEP_DAYS ?? 7);

const sources = [
  ...(existsSync(accounts) ? readdirSync(accounts).filter(f => f.endsWith(".db")).map(f => join(accounts, f)) : []),
  ...(existsSync(legacy) ? [legacy] : []),
];
const target = join(root, new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(join(target, "accounts"), { recursive: true, mode: 0o700 });

async function main() {
  for (const source of sources) {
    const db = new Database(source, { readonly: true, fileMustExist: true });
    try {
      const dest = source === legacy ? join(target, basename(source)) : join(target, "accounts", basename(source));
      await db.backup(dest);
      const check = new Database(dest, { readonly: true });
      try {
        if (check.pragma("integrity_check", { simple: true }) !== "ok") throw new Error(`integrity check failed for ${dest}`);
      } finally { check.close(); }
    } finally { db.close(); }
  }
  console.log(`backed up ${sources.length} database(s) to ${target}`);

  const cutoff = Date.now() - keepDays * 86_400_000;
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (path !== target && statSync(path).isDirectory() && statSync(path).mtimeMs < cutoff) {
      rmSync(path, { recursive: true, force: true });
      console.log(`removed old backup ${name}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
