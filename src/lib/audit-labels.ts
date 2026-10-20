import { CHECKS } from "./demo";

// Backend action codes in plain words, so live rows read like the seeded story rows.
const ACTIONS: Record<string, string> = {
  "chat": "Asked the case assistant",
  "request.create": "Created a payment request",
  "request.cancel": "Cancelled a payment request",
  "request.execute": "Paid the approved shares",
  "request.expire": "A payment request expired",
  "request.recipient_invalidated": "Request cancelled: the hospital account changed",
  "fx.quote": "Got an exchange-rate quote",
  "approval.record": "Approved their own share",
  "approval.withdraw": "Withdrew their approval",
  "charge": "Charged an approved share",
  "gateway.authorize": "Payment Gate allowed the payment",
  "document.ingest": "Uploaded a document; names hidden and lines read",
  "document.second_check": "Second model double-checked items",
  "bill.explain": "Explained the bill with cited lines",
  "payee.enroll": "Enrolled the hospital’s verified account",
  "refund.open": "Opened refund shares",
  "refund.status": "Updated a refund status",
  "refund.reminder": "Sent a refund reminder",
  "followup.request": "Asked for a refund follow-up",
  "member.invite": "Invited a helper",
  "member.join": "A helper joined the case",
  "member.limit": "Changed a helper’s share limit",
  "request.invoice": "Attached the hospital’s invoice to a paid request",
  "case.closed": "Closed the care case; it is read-only now",
  "permission.denied": "Tried something their role does not allow",
};
export function describeAction(action: string, check?: number) {
  if (action === "gateway.check") return check ? `Payment Gate blocked it: ${CHECKS[check]?.toLowerCase() ?? "a check failed"}` : "Payment Gate blocked it";
  return ACTIONS[action] ?? action;
}
const ACTORS: Record<string, string> = { gateway: "Payment Gate", system: "Guardian" };
export const actorLabel = (actor: string) => ACTORS[actor] ?? actor;
