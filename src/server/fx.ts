import { randomUUID } from "node:crypto";
import type { DB } from "./db";
import { DEMO_RATES_E4 } from "@/lib/fx-rates";

// DEMO FX table, not market rates. Rate = units of pay currency per 1 hospital
// currency unit, scaled by 1e4 so all math stays in integers. All currencies are
// stored in minor units x100 (IDR included), so the scale cancels out.

export { DEMO_RATES_E4 };
export const FEE_BPS = 100; // 1.00 %, demo
export const QUOTE_TTL_MS = 15 * 60_000;

export interface Quote {
  id: string;
  requestId: string;
  memberId: string;
  amount: number;
  currency: string;
  payCurrency: string;
  payAmount: number;
  rateE4: number;
  fee: number;
  expiresAt: string;
}

export function convert(amount: number, from: string, to: string): { payAmount: number; rateE4: number; fee: number } {
  const rateE4 = from === to ? 10_000 : DEMO_RATES_E4[from]?.[to];
  if (!rateE4) throw new Error(`no demo rate ${from}->${to}`);
  const payAmount = Math.round((amount * rateE4) / 10_000);
  const fee = from === to ? 0 : Math.round((payAmount * FEE_BPS) / 10_000);
  return { payAmount, rateE4, fee };
}

export function formatRate(rateE4: number): string {
  return (rateE4 / 10_000).toFixed(4);
}

export function createQuote(db: DB, requestId: string, memberId: string, amount: number, now: Date): Quote {
  const req = db.prepare("SELECT r.id, c.currency FROM payment_requests r JOIN cases c ON c.id = r.case_id WHERE r.id = ?").get(requestId) as
    | { id: string; currency: string }
    | undefined;
  if (!req) throw new Error("unknown payment request");
  const m = db.prepare("SELECT currency FROM members WHERE id = ?").get(memberId) as { currency: string } | undefined;
  if (!m) throw new Error("unknown member");
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("invalid amount");

  const { payAmount, rateE4, fee } = convert(amount, req.currency, m.currency);
  const q: Quote = {
    id: `Q_${randomUUID().slice(0, 8)}`,
    requestId,
    memberId,
    amount,
    currency: req.currency,
    payCurrency: m.currency,
    payAmount,
    rateE4,
    fee,
    expiresAt: new Date(now.getTime() + QUOTE_TTL_MS).toISOString(),
  };
  db.prepare(
    `INSERT INTO fx_quotes (id, request_id, member_id, amount, currency, pay_currency, pay_amount, rate_e4, fee, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(q.id, q.requestId, q.memberId, q.amount, q.currency, q.payCurrency, q.payAmount, q.rateE4, q.fee, q.expiresAt);
  return q;
}

export function getQuote(db: DB, id: string): Quote | undefined {
  const r = db.prepare("SELECT * FROM fx_quotes WHERE id = ?").get(id) as Record<string, string & number> | undefined;
  if (!r) return undefined;
  return {
    id: r.id, requestId: r.request_id, memberId: r.member_id, amount: r.amount, currency: r.currency,
    payCurrency: r.pay_currency, payAmount: r.pay_amount, rateE4: r.rate_e4, fee: r.fee, expiresAt: r.expires_at,
  };
}
