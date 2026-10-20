// Returns the app to the start of the demo video scenario (TASKS 6.4).
//
//   npm run demo:reset             remove every demo workspace, keep Google workspaces and the directory
//   npm run demo:reset -- --dry-run  only list what would be removed
//
// Each "Use demo account" sign-in creates a fresh seeded workspace, so after this runs the next demo
// sign-in starts from the seeded case C1. Google accounts, the shared hospital directory and the LLM
// cache (which keeps recorded answers fast) are left alone.

import Database from "better-sqlite3";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { openHospitalDirectory } from "../src/server/hospital-directory";
import hospitals from "../src/server/hospital-seeds.json";

loadEnvConfig(process.cwd());
if(process.env.GUARDIAN_DATABASE_DRIVER==="postgres") {
  console.log("Cloud demo workspaces are preserved. Sign out and choose Use demo account for a new seeded workspace. For deliberate local cleanup, explicitly select GUARDIAN_DATABASE_DRIVER=sqlite.");
  process.exit(0);
}
const dryRun = process.argv.includes("--dry-run");
const dir = process.env.GUARDIAN_ACCOUNTS_DIR ?? join(process.cwd(), ".cache", "accounts");
const SHARED = new Set(["access.db", "hospital-directory.db"]);

/** Only demo workspaces are seeded, and only they carry the 'initialized' marker (src/server/workspace.ts). */
function isDemoWorkspace(path: string) {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='web_workspace'").get();
    return Boolean(table && db.prepare("SELECT key FROM web_workspace WHERE key='initialized'").get());
  } finally { db.close(); }
}

let removed = 0;
let kept = 0;
if (existsSync(dir)) {
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".db") || SHARED.has(name)) continue;
    const path = join(dir, name);
    if (!isDemoWorkspace(path)) { kept++; continue; }
    removed++;
    console.log(`${dryRun ? "would remove" : "removing"} demo workspace ${name}`);
    if (!dryRun) for (const suffix of ["", "-wal", "-shm"]) rmSync(path + suffix, { force: true });
  }
  const access = join(dir, "access.db");
  if (existsSync(access) && !dryRun) {
    const db = new Database(access);
    try {
      const tables = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(t => t.name));
      if (tables.has("invitations")) {
        const r = db.prepare("DELETE FROM invitations WHERE mode='demo'").run();
        console.log(`removed ${r.changes} demo invitation(s)`);
      }
    } finally { db.close(); }
  }
}

if (!dryRun) {
  const directory = openHospitalDirectory();
  try {
    let added = 0;
    for (const h of hospitals) if (directory.seedListing(h.id, h.profile, h.sources)) added++;
    console.log(`hospital directory: ${added} listing(s) added, existing records preserved`);
  } finally { directory.close(); }
}

console.log(`${dryRun ? "Dry run: " : ""}${removed} demo workspace(s) ${dryRun ? "found" : "removed"}, ${kept} other account(s) kept in ${dir}.`);
console.log("Next: sign out in the browser, then choose \"Use demo account\" to start from the seeded case C1.");
