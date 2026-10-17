// D4 end-to-end against live services: Stripe test mode (one charge per helper)
// and FISCO BCOS (anchor of the audit-log head). Fresh in-memory DB; writes a
// JSONL log to logs/. Usage: npm run d4:live
import { mkdirSync, writeFileSync } from "node:fs";
import { openDb } from "../src/server/db";
import { seed } from "../src/server/seed";
import { createQuote } from "../src/server/fx";
import { recordApproval } from "../src/server/gateway";
import { createPaymentRequest, executeRequest } from "../src/server/payments";
import { stripeCharger } from "../src/server/stripe";
import { anchorHash } from "../src/server/anchor";
import { verifyChain } from "../src/server/audit";

async function main() {
  const db = openDb(":memory:");
  seed(db);
  const req = createPaymentRequest(db, { caseId: "C1", actor: "M_OWNER", payeeId: "P1", amount: 5_000_000, purpose: "emergency guarantee", expiresInMinutes: 120 });
  if (!req.ok) throw new Error(req.reason);
  for (const [m, a] of [["M_JKT", 2_000_000], ["M_KL", 1_500_000], ["M_DXB", 1_000_000], ["M_MOSQUE", 500_000]] as const) {
    const q = createQuote(db, req.id!, m, a, new Date());
    const r = recordApproval(db, req.id!, m, a, q.id);
    console.log("approve", m, a, q.payCurrency, q.payAmount + q.fee, r.ok ? "ok" : r.reason);
  }
  const exec = await executeRequest(db, req.id!, "M_OWNER", stripeCharger());
  console.log("execute", exec.status, exec.charges);

  const head = db.prepare("SELECT hash FROM audit_log ORDER BY seq DESC LIMIT 1").get() as { hash: string };
  const tx = await anchorHash(head.hash, "audit_head");
  console.log("audit chain intact:", verifyChain(db) === null, "head", head.hash, "anchor tx", tx);

  mkdirSync("logs", { recursive: true });
  const file = `logs/D4-live-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY seq").all();
  writeFileSync(file, [...rows, { anchor: { head: head.hash, tx } }].map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log("log", file);
  if (exec.status !== "paid") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
