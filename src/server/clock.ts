import type { DB } from "./db";

// Demo clock: real time plus an offset stored in the DB, so the demo can jump
// forward (expiry, overdue refunds) without waiting. POST /api/demo/clock sets it.

export function now(db: DB): Date {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'clock_offset_ms'").get() as { value: string } | undefined;
  return new Date(Date.now() + Number(row?.value ?? 0));
}

export function advanceClock(db: DB, ms: number): Date {
  const cur = db.prepare("SELECT value FROM settings WHERE key = 'clock_offset_ms'").get() as { value: string } | undefined;
  const next = Number(cur?.value ?? 0) + ms;
  db.prepare("INSERT INTO settings (key, value) VALUES ('clock_offset_ms', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(next));
  return now(db);
}
