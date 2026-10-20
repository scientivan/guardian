// Sample data for the case screens, in the exact shapes of docs/API.md v1.1, so switching to
// Dien's live endpoints later only changes where the data comes from (TASKS 2.10).
// Numbers follow Dien's fixture (src/server/fixtures/demo-case.ts) and seed (src/server/seed.ts).
// Fictional hospital, family and accounts. Money in minor units (fen for CNY).

export type Role = "owner" | "payer" | "companion";

export type Member = { id: string; displayName: string; role: Role; shareLimit: number; currency: string };

export const CASE = {
  demo: true,
  id: "C1",
  currency: "CNY",
  patient: { name: "Budi Santoso", token: "[PASIEN_1]" },
  hospital: { id: "H1", name: "Shenzhen International Hospital", officialChannel: "https://hospital.example/billing" },
  me: { id: "M_OWNER", role: "owner" as Role },
  members: [
    { id: "M_OWNER", displayName: "Rina (owner)", role: "owner", shareLimit: 0, currency: "IDR" },
    { id: "M_JKT", displayName: "Adi (Jakarta)", role: "payer", shareLimit: 2_000_000, currency: "IDR" },
    { id: "M_KL", displayName: "Sari (Kuala Lumpur)", role: "payer", shareLimit: 1_500_000, currency: "MYR" },
    { id: "M_DXB", displayName: "Fajar (Dubai)", role: "payer", shareLimit: 1_000_000, currency: "AED" },
    { id: "M_MOSQUE", displayName: "Masjid community fund", role: "payer", shareLimit: 1_000_000, currency: "IDR" },
    { id: "M_COMP", displayName: "Dewi (at hospital)", role: "companion", shareLimit: 0, currency: "IDR" },
  ] as Member[],
  payees: [
    { id: "P1", name: "Shenzhen International Hospital", accountMasked: "•••• 2222", source: "official_registry", verifiedAt: "2026-10-18T05:21:00Z" },
  ],
  anomalies: [
    {
      id: 1,
      kind: "unverified_payee",
      detail: "A chat message asked the family to pay account •••• 9071. It is not in the hospital’s official registry, so it stays blocked.",
      resolved: true,
      ts: "2026-10-18T06:06:00Z",
    },
  ],
  totals: { paid: 3_000_000, billedSoFar: 3_678_200, currency: "CNY" },
};

export const MEMBER_BY_ID = Object.fromEntries(CASE.members.map((m) => [m.id, m])) as Record<string, Member>;

/* ---------- Documents ---------- */

export type DocStatus = "parsed" | "needs_reupload";
export const DOCUMENTS: {
  id: string;
  type: "estimate" | "interim" | "final";
  title: string;
  by: string;
  ts: string;
  status: DocStatus;
  items: number;
  total: number | null;
  sha256: string;
  anchoredTx: string | null;
  reason?: string;
}[] = [
  { id: "D1", type: "estimate", title: "Treatment cost estimate", by: "Rina (owner)", ts: "2026-10-18T05:25:00Z", status: "parsed", items: 5, total: null, sha256: "3f9a6c1e…b27d", anchoredTx: "0x8e41…c0a9" },
  { id: "D2", type: "interim", title: "Interim bill, day 5", by: "Dewi (at hospital)", ts: "2026-10-18T05:58:00Z", status: "parsed", items: 40, total: 3_678_200, sha256: "c51d0e77…9f13", anchoredTx: "0x1b7c…44de" },
  {
    id: "D2b",
    type: "interim",
    title: "Photo of bill D2, page 2",
    by: "Dewi (at hospital)",
    ts: "2026-10-18T06:01:00Z",
    status: "needs_reupload",
    items: 0,
    total: null,
    sha256: "77e0b4a2…01c8",
    anchoredTx: null,
    reason: "The photo is blurred, so the lines don’t add up to the stated total. Please take it again in good light.",
  },
];

/* ---------- Bill explanation (GET /api/cases/C1/explanation?documentId=D2) ---------- */

export type LineType = "arithmetic_fact" | "stated_in_document" | "unknown_ask_hospital";

export type Item = { id: string; category: string; description: string; qty: number; unitPrice: number; lineTotal: number; flags: string[] };

// The 40 lines of bill D2, as GET /api/documents/D2 returns them (lineTotal and flags come from the backend).
const D2_LINES: [string, string, string, number, number, string[]?][] = [
  ["I01", "room", "Ward bed per day", 5, 120_000],
  ["I02", "room", "Nursing care per day", 5, 18_000],
  ["I03", "room", "Doctor ward round per day", 5, 12_000],
  ["I04", "procedure", "Laparoscopic appendectomy", 1, 1_800_000],
  ["I05", "procedure", "Anaesthesia", 1, 450_000],
  ["I06", "procedure", "Operating theatre use", 1, 250_000],
  ["I07", "procedure", "Post-operative wound dressing", 3, 15_000],
  ["I08", "other", "Medical record copy fee", 1, 5_000],
  ["I09", "other", "Patient meals per day", 5, 6_000],
  ["I10", "drug", "Ceftriaxone 1g injection", 10, 4_500, ["above_reference"]],
  ["I11", "drug", "Metronidazole 500mg IV", 10, 3_000],
  ["I12", "drug", "Paracetamol 500mg tablet", 20, 200],
  ["I13", "drug", "Omeprazole 40mg IV", 5, 3_800],
  ["I14", "drug", "Ondansetron 4mg injection", 4, 2_500],
  ["I15", "drug", "Ketorolac 30mg injection", 6, 2_000],
  ["I16", "drug", "Normal saline 500ml", 10, 1_200],
  ["I17", "drug", "Ringer lactate 500ml", 8, 1_400],
  ["I18", "drug", "Heparin 5000IU injection", 5, 2_800],
  ["I19", "drug", "Tramadol 50mg capsule", 10, 300],
  ["I20", "drug", "Amoxicillin-clavulanate 625mg tablet", 14, 600],
  ["I21", "drug", "Lidocaine 2% 5ml", 2, 800],
  ["I22", "lab", "Complete blood count", 1, 6_000, ["duplicate"]],
  ["I23", "lab", "Complete blood count", 1, 6_000, ["duplicate"]],
  ["I24", "lab", "C-reactive protein", 1, 8_000],
  ["I25", "lab", "Electrolytes panel", 1, 9_000],
  ["I26", "lab", "Liver function test", 1, 12_000],
  ["I27", "lab", "Renal function test", 1, 10_000],
  ["I28", "lab", "Coagulation profile", 1, 11_000],
  ["I29", "lab", "Abdominal ultrasound", 1, 38_000],
  ["I30", "lab", "Chest X-ray", 1, 15_000],
  ["I31", "consumable", "IV cannula 22G", 3, 2_500],
  ["I32", "consumable", "IV infusion set", 5, 1_500],
  ["I33", "consumable", "Syringe 5ml", 20, 200],
  ["I34", "consumable", "Surgical gauze pack", 6, 1_000],
  ["I35", "consumable", "Pillow case", 5, 1_500, ["basic_item_billed"]],
  ["I36", "consumable", "Alcohol swab", 40, 100, ["basic_item_billed"]],
  ["I37", "consumable", "Disposable gloves (pair)", 30, 200],
  ["I38", "consumable", "Urinary catheter", 1, 4_500],
  ["I39", "consumable", "Wound drain bag", 1, 6_000],
  ["I40", "consumable", "Bed sheet change", 5, 2_000],
];

export const ITEMS: Record<string, Item> = Object.fromEntries(
  D2_LINES.map(([id, category, description, qty, unitPrice, flags = []]) => [id, { id, category, description, qty, unitPrice, lineTotal: qty * unitPrice, flags }]),
);

export const EXPLANATION = {
  demo: true,
  documentId: "D2",
  currency: "CNY",
  total: 3_678_200,
  estimate: { low: 3_000_000, high: 3_400_000, assumedStayDays: 3 },
  actualStayDays: 5,
  byCategory: { procedure: 2_545_000, room: 750_000, drug: 170_200, lab: 115_000, consumable: 63_000, other: 35_000 } as Record<string, number>,
  lines: [
    { type: "arithmetic_fact", text: "The stay is 5 days instead of the 3 the estimate assumed. Room and daily care for the 2 extra days adds", amount: 300_000, itemIds: ["I01", "I02", "I03"] },
    { type: "arithmetic_fact", text: "Meals and a medical record copy are billed but were not in the estimate", amount: 35_000, itemIds: ["I08", "I09"] },
    { type: "arithmetic_fact", text: "Wound dressing after the operation was not in the estimate", amount: 45_000, itemIds: ["I07"] },
    { type: "stated_in_document", text: "The doctor’s note on the bill says the antibiotic course was extended to 5 days.", itemIds: ["I10", "I11"] },
    { type: "stated_in_document", text: "The estimate said consumables are billed as used, so they were never part of its total.", amount: 63_000, itemIds: ["I35", "I36"] },
    { type: "unknown_ask_hospital", text: "A complete blood count appears twice. Was it done twice?", itemIds: ["I22", "I23"] },
    { type: "unknown_ask_hospital", text: "Pillow cases and alcohol swabs are billed as separate items. Are they normally part of the room fee?", itemIds: ["I35", "I36"] },
  ] as { type: LineType; text: string; amount?: number; itemIds: string[] }[],
  questions: [
    { kind: "duplicate", itemIds: ["I22", "I23"], text: "A complete blood count is billed twice. Was it done twice?" },
    { kind: "basic_item_billed", itemIds: ["I35", "I36"], text: "Why are pillow cases and alcohol swabs billed separately?" },
    { kind: "above_reference", itemIds: ["I10"], text: "Ceftriaxone is CNY 45 a dose, above our reference of CNY 30. Why?" },
  ],
  secondModelChecked: ["I10", "I22", "I23", "I35"],
  referenceNote: "Reference prices are indicative, not regulated prices. A price above the reference is a question, never proof of overcharging.",
};

/* ---------- Payment requests and pledges (API: approvals) ---------- */

export type Pledge = {
  memberId: string;
  displayName: string;
  amount: number;
  payCurrency: string;
  payAmount: number;
  fxRate: string;
  fee: number;
  status: "approved" | "withdrawn" | "charged" | "charge_failed";
  ts: string;
  /** Proposed in brainstorm/17 §6: "send my part even if the full amount isn't reached". Not in the API yet. */
  sendIfShort?: boolean;
};

export type PaymentRequest = {
  id: string;
  payeeId?: string;
  payeeName: string;
  accountMasked: string;
  amount: number;
  currency: string;
  approved: number;
  remaining: number;
  purpose: string;
  status: "pending" | "executing" | "paid" | "expired" | "cancelled" | "failed";
  createdAt: string;
  expiresAt: string;
  approvals: Pledge[];
};

export const REQUESTS: PaymentRequest[] = [
  {
    id: "R2",
    payeeName: "Shenzhen International Hospital",
    accountMasked: "•••• 2222",
    amount: 5_000_000,
    currency: "CNY",
    approved: 4_500_000,
    remaining: 500_000,
    purpose: "Emergency guarantee",
    status: "pending",
    createdAt: "2026-10-18T06:10:00Z",
    expiresAt: "2026-10-18T08:10:00Z",
    approvals: [
      { memberId: "M_JKT", displayName: "Adi (Jakarta)", amount: 2_000_000, payCurrency: "IDR", payAmount: 4_590_000_000, fxRate: "2295.0000", fee: 45_900_000, status: "approved", ts: "2026-10-18T06:15:00Z", sendIfShort: true },
      { memberId: "M_KL", displayName: "Sari (Kuala Lumpur)", amount: 1_500_000, payCurrency: "MYR", payAmount: 975_000, fxRate: "0.6500", fee: 9_750, status: "approved", ts: "2026-10-18T06:18:00Z", sendIfShort: false },
      { memberId: "M_DXB", displayName: "Fajar (Dubai)", amount: 1_000_000, payCurrency: "AED", payAmount: 510_000, fxRate: "0.5100", fee: 5_100, status: "approved", ts: "2026-10-18T06:22:00Z", sendIfShort: true },
    ],
  },
  {
    id: "R1",
    payeeName: "Shenzhen International Hospital",
    accountMasked: "•••• 2222",
    amount: 3_000_000,
    currency: "CNY",
    approved: 3_000_000,
    remaining: 0,
    purpose: "Initial deposit",
    status: "paid",
    createdAt: "2026-10-18T05:30:00Z",
    expiresAt: "2026-10-18T07:30:00Z",
    approvals: [
      { memberId: "M_OWNER", displayName: "Rina (owner)", amount: 3_000_000, payCurrency: "IDR", payAmount: 6_885_000_000, fxRate: "2295.0000", fee: 68_850_000, status: "charged", ts: "2026-10-18T05:40:00Z" },
    ],
  },
];

/** Demo FX table, labelled as demo (API F16): units of the helper's currency per 1 CNY, 1% fee. */
export const FX: Record<string, number> = { IDR: 2295, MYR: 0.65, AED: 0.51 };

/* ---------- Refunds (after discharge, simulated clock) ---------- */

export const REFUNDS = {
  demo: true,
  currency: "CNY",
  finalBill: 7_100_000,
  deposits: 8_000_000,
  totalRefund: 900_000,
  items: [
    { memberId: "M_OWNER", displayName: "Rina (owner)", paid: 3_000_000, amount: 337_500, status: "received", dueAt: "2026-11-13T00:00:00Z", overdue: false },
    { memberId: "M_JKT", displayName: "Adi (Jakarta)", paid: 2_000_000, amount: 225_000, status: "received", dueAt: "2026-11-13T00:00:00Z", overdue: false },
    { memberId: "M_KL", displayName: "Sari (Kuala Lumpur)", paid: 1_500_000, amount: 168_750, status: "processing", dueAt: "2026-11-13T00:00:00Z", overdue: false },
    { memberId: "M_DXB", displayName: "Fajar (Dubai)", paid: 1_000_000, amount: 112_500, status: "requested", dueAt: "2026-11-13T00:00:00Z", overdue: false },
    { memberId: "M_MOSQUE", displayName: "Masjid community fund", paid: 500_000, amount: 56_250, status: "requested", dueAt: "2026-11-06T00:00:00Z", overdue: true },
  ] as { memberId: string; displayName: string; paid: number; amount: number; status: "requested" | "processing" | "received"; dueAt: string; overdue: boolean }[],
};

/* ---------- Audit log (GET /api/cases/C1/audit) ---------- */

export type AuditRow = { seq: number; ts: string; actor: string; action: string; decision: "allow" | "deny"; check?: number; hash: string };

export const AUDIT: { chainValid: boolean; anchoredHead: { hash: string; tx: string }; rows: AuditRow[] } = {
  chainValid: true,
  anchoredHead: { hash: "a41f…9be0", tx: "0x5d2e…71f3" },
  rows: [
    { seq: 1, ts: "2026-10-18T05:20:00Z", actor: "Rina", action: "Created case C1", decision: "allow", hash: "0c7e…12aa" },
    { seq: 2, ts: "2026-10-18T05:21:00Z", actor: "Payment Gate", action: "Enrolled account •••• 2222 from the hospital’s signed list", decision: "allow", hash: "91b3…e07f" },
    { seq: 3, ts: "2026-10-18T05:25:00Z", actor: "Privacy Clerk", action: "Hid names and ID numbers in estimate D1", decision: "allow", hash: "5ad0…4c19" },
    { seq: 4, ts: "2026-10-18T05:26:00Z", actor: "Reader", action: "Read estimate D1, 5 lines", decision: "allow", hash: "e2f4…88b1" },
    { seq: 5, ts: "2026-10-18T05:26:00Z", actor: "Reader", action: "Ignored hidden white text in D1 asking to pay a new account", decision: "deny", hash: "7c19…d3e2" },
    { seq: 6, ts: "2026-10-18T05:40:00Z", actor: "Payment Gate", action: "Paid the initial deposit, CNY 30,000, to •••• 2222", decision: "allow", hash: "b8a2…0f5c" },
    { seq: 7, ts: "2026-10-18T05:58:00Z", actor: "Dewi", action: "Uploaded interim bill D2", decision: "allow", hash: "2e6d…a971" },
    { seq: 8, ts: "2026-10-18T05:58:00Z", actor: "Privacy Clerk", action: "Hid names and ID numbers in bill D2", decision: "allow", hash: "f03b…6c24" },
    { seq: 9, ts: "2026-10-18T06:01:00Z", actor: "Reader", action: "Read bill D2: 40 items that add up to the stated total", decision: "allow", hash: "48cc…b5d0" },
    { seq: 10, ts: "2026-10-18T06:02:00Z", actor: "Calculator", action: "Compared bill D2 with estimate D1", decision: "allow", hash: "9d71…3e8a" },
    { seq: 11, ts: "2026-10-18T06:03:00Z", actor: "Second Opinion", action: "Double-checked I10, I22, I23 and I35; both models agree", decision: "allow", hash: "c4e9…2b17" },
    { seq: 12, ts: "2026-10-18T06:04:00Z", actor: "Planner", action: "Wrote 7 explanation lines and 3 questions for the hospital", decision: "allow", hash: "13fa…9c60" },
    { seq: 13, ts: "2026-10-18T06:06:00Z", actor: "Payment Gate", action: "Blocked a payment to •••• 9071, not in the official registry", decision: "deny", check: 1, hash: "6b05…e4d8" },
    { seq: 14, ts: "2026-10-18T06:10:00Z", actor: "Rina", action: "Opened emergency guarantee R2, CNY 50,000", decision: "allow", hash: "da38…5f02" },
    { seq: 15, ts: "2026-10-18T06:14:00Z", actor: "Payment Gate", action: "Blocked Sari pledging on Fajar’s behalf", decision: "deny", check: 3, hash: "0e92…7ab4" },
    { seq: 16, ts: "2026-10-18T06:15:00Z", actor: "Adi", action: "Pledged CNY 20,000 to R2", decision: "allow", hash: "85d1…c3f9" },
    { seq: 17, ts: "2026-10-18T06:18:00Z", actor: "Sari", action: "Pledged CNY 15,000 to R2", decision: "allow", hash: "3b7f…10e6" },
    { seq: 18, ts: "2026-10-18T06:22:00Z", actor: "Fajar", action: "Pledged CNY 10,000 to R2", decision: "allow", hash: "f6c0…8d25" },
    { seq: 19, ts: "2026-10-18T06:23:00Z", actor: "Auditor", action: "Anchored the log head on FISCO BCOS", decision: "allow", hash: "a41f…9be0" },
  ],
};

/** The five gateway checks (docs/ARCHITECTURE.md §3.6), for the security log legend. */
export const CHECKS: Record<number, string> = {
  1: "Payee must be in the hospital’s official registry",
  2: "Name must match exactly",
  3: "Only the right person can act (role)",
  4: "Amount within the request and the person’s own quote",
  5: "No open warnings on the case",
};

/* ---------- Stand-ins for backend calls (replace with fetch in TASKS 2.10) ---------- */

/** Mirrors POST /api/payment-requests/:id/fx-quote: the backend does the money math, the UI only shows it. */
export function demoQuote(amount: number, payCurrency: string) {
  const rate = FX[payCurrency] ?? 1;
  const payAmount = Math.round(amount * rate);
  return {
    demo: true,
    amount,
    currency: "CNY",
    payCurrency,
    payAmount,
    fxRate: rate.toFixed(4),
    fee: Math.round(payAmount * 0.01),
    quoteId: `Q-${amount}`,
    expiresInMinutes: 15,
  };
}

/** Mirrors POST /api/payment-requests/:id/approvals: returns the new pledged total and what is still missing. */
export function demoPledge(request: PaymentRequest, amount: number) {
  const approved = Math.min(request.amount, request.approved + amount);
  return { ok: true, approved, remaining: request.amount - approved };
}
