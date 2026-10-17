import type { DB } from "./db";
import { enrollFromSignedList } from "./enrollment";
import { fetchSignedPayeeList, portalPublicKey } from "./portal";

// Synthetic demo data. The hospital, accounts and people are fictional.

export const DEMO = {
  hospital: { id: "H1", name: "Shenzhen International Hospital (demo)", channel: "https://hospital.example/billing" },
  case: { id: "C1", currency: "CNY" },
  payee: { id: "P1", account: "6222 0000 1111 2222", name: "Shenzhen International Hospital (demo)" },
  members: [
    { id: "M_OWNER", name: "Rina (owner)", role: "owner", limit: 0, currency: "IDR" },
    { id: "M_JKT", name: "Adi (Jakarta)", role: "payer", limit: 2_000_000, currency: "IDR" },
    { id: "M_KL", name: "Sari (Kuala Lumpur)", role: "payer", limit: 1_500_000, currency: "MYR" },
    { id: "M_DXB", name: "Fajar (Dubai)", role: "payer", limit: 1_000_000, currency: "AED" },
    { id: "M_MOSQUE", name: "Masjid community fund", role: "payer", limit: 1_000_000, currency: "IDR" },
    { id: "M_COMP", name: "Dewi (at hospital)", role: "companion", limit: 0, currency: "IDR" },
  ],
} as const;

/** The list the demo hospital portal publishes. */
export const PORTAL_PAYEES = [{ id: DEMO.payee.id, account: DEMO.payee.account, name: DEMO.payee.name }];

export function seed(db: DB, now = new Date()): void {
  const d = DEMO;
  db.prepare("INSERT OR IGNORE INTO hospitals (id, name, official_channel, public_key) VALUES (?, ?, ?, ?)").run(
    d.hospital.id, d.hospital.name, d.hospital.channel, portalPublicKey(d.hospital.id),
  );
  db.prepare("INSERT OR IGNORE INTO cases (id, patient_token, hospital_id, currency) VALUES (?, ?, ?, ?)").run(d.case.id, "[PASIEN_1]", d.hospital.id, d.case.currency);
  const m = db.prepare("INSERT OR IGNORE INTO members (id, case_id, display_name, role, share_limit, currency) VALUES (?, ?, ?, ?, ?, ?)");
  for (const x of d.members) m.run(x.id, d.case.id, x.name, x.role, x.limit, x.currency);
  // The registry is filled only from the hospital's signed list, never inserted directly.
  const r = enrollFromSignedList(db, d.case.id, "system", fetchSignedPayeeList(d.hospital.id, PORTAL_PAYEES, now.toISOString()), now);
  if (!r.ok) throw new Error(`seed enrollment failed: ${r.reason}`);
}

/** Test helper: inserts a pending request directly (bypasses the owner check in createPaymentRequest). */
export function createRequest(db: DB, id: string, amount: number, purpose: string, payeeId: string = DEMO.payee.id, now = new Date(), ttlMinutes = 120): void {
  db.prepare("INSERT INTO payment_requests (id, case_id, payee_id, amount, purpose, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    id, DEMO.case.id, payeeId, amount, purpose, now.toISOString(), new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
  );
}
