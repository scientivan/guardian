import type { CareCase } from "./workspace";

// What the owner can ask the family to pay, worked out from the uploaded documents instead of typed
// in (PRD §4 steps 3, 5, 6). Shared by the Pledges form and the server check in createRequest.
//
//  - Initial deposit: the estimate's range. The owner picks its lower or upper end.
//  - Bill balance: the latest bill. A final bill replaces the interim bills, because it covers the
//    whole stay. Balance = bill total − every live request (pending, executing or paid), because
//    deposits are payments in advance towards that same bill. A negative balance is a refund.
//  - One live request per document: a second deposit from the same estimate, or a second request
//    while one for the latest bill is still open, is refused.

const LIVE = ["pending", "executing", "paid"];

export type PaymentPlan = {
  deposit: { documentId: string; title: string; low: number; high: number; assumedStayDays: number | null; requestedId: string | null } | null;
  bill: { documentId: string; title: string; type: "interim" | "final"; total: number; committed: number; balance: number; openId: string | null } | null;
  /** Bills that a newer bill replaced. */
  superseded: { documentId: string; title: string }[];
};

export function paymentPlan(view: Pick<CareCase, "documents" | "requests">): PaymentPlan {
  const live = (documentId: string | undefined, statuses = LIVE) => (documentId && view.requests.find(r => r.documentId === documentId && statuses.includes(r.status))?.id) || null;
  const read = view.documents.filter(d => d.status === "parsed");
  const estimate = [...read].reverse().find(d => d.type === "estimate" && d.estimate && d.estimate.low > 0);
  const bills = read.filter(d => d.type !== "estimate" && (d.total ?? 0) > 0);
  const latest = [...bills].reverse().find(d => d.type === "final") ?? bills.at(-1);
  const committed = view.requests.filter(r => LIVE.includes(r.status)).reduce((s, r) => s + r.amount, 0);
  return {
    deposit: estimate?.estimate ? { documentId: estimate.id, title: estimate.title, low: estimate.estimate.low, high: estimate.estimate.high, assumedStayDays: estimate.estimate.assumedStayDays ?? null, requestedId: live(estimate.id) } : null,
    bill: latest ? { documentId: latest.id, title: latest.title, type: latest.type as "interim" | "final", total: latest.total ?? 0, committed, balance: (latest.total ?? 0) - committed, openId: live(latest.id, ["pending", "executing"]) } : null,
    superseded: bills.filter(b => b.id !== latest?.id).map(b => ({ documentId: b.id, title: b.title })),
  };
}
