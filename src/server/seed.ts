import type { DB } from "./db";
import { normalizeName } from "./normalize";

// Synthetic demo data. The hospital, accounts and people are fictional.

export const DEMO = {
  hospital: { id: "H1", name: "Shenzhen International Hospital (demo)", channel: "https://hospital.example/billing" },
  case: { id: "C1", currency: "CNY" },
  payee: { id: "P1", account: "6222 0000 1111 2222", name: "Shenzhen International Hospital (demo)" },
  members: [
    { id: "M_OWNER", name: "Rina (owner)", role: "owner", limit: 0 },
    { id: "M_JKT", name: "Adi (Jakarta)", role: "payer", limit: 2_000_000 },
    { id: "M_KL", name: "Sari (Kuala Lumpur)", role: "payer", limit: 1_500_000 },
    { id: "M_DXB", name: "Fajar (Dubai)", role: "payer", limit: 1_000_000 },
    { id: "M_MOSQUE", name: "Masjid community fund", role: "payer", limit: 1_000_000 },
    { id: "M_COMP", name: "Dewi (at hospital)", role: "companion", limit: 0 },
  ],
} as const;

export function seed(db: DB): void {
  const d = DEMO;
  db.prepare("INSERT OR IGNORE INTO hospitals (id, name, official_channel) VALUES (?, ?, ?)").run(d.hospital.id, d.hospital.name, d.hospital.channel);
  db.prepare("INSERT OR IGNORE INTO cases (id, patient_token, hospital_id, currency) VALUES (?, ?, ?, ?)").run(d.case.id, "[PASIEN_1]", d.hospital.id, d.case.currency);
  db.prepare("INSERT OR IGNORE INTO payees (id, hospital_id, account, name_normalized, source, verified_at) VALUES (?, ?, ?, ?, 'official_registry', ?)").run(
    d.payee.id,
    d.hospital.id,
    d.payee.account,
    normalizeName(d.payee.name),
    new Date().toISOString(),
  );
  const m = db.prepare("INSERT OR IGNORE INTO members (id, case_id, display_name, role, share_limit) VALUES (?, ?, ?, ?, ?)");
  for (const x of d.members) m.run(x.id, d.case.id, x.name, x.role, x.limit);
}

export function createRequest(db: DB, id: string, amount: number, purpose: string, payeeId: string = DEMO.payee.id): void {
  db.prepare("INSERT INTO payment_requests (id, case_id, payee_id, amount, purpose, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    id,
    DEMO.case.id,
    payeeId,
    amount,
    purpose,
    new Date().toISOString(),
  );
}
