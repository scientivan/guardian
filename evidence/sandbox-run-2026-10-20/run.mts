// Sandbox execution evidence: the full payment lifecycle and the main attacks on the seeded demo
// case, through the same Integration engine the web API uses. No keys, no network: SQLite in a
// temporary folder, the demo sandbox charger, no LLM calls, no FISCO node (anchors report null).
//
//   node --import tsx evidence/sandbox-run-2026-10-20/run.mts
//
// Writes steps.jsonl (wall-clock time, actor, action, expected, outcome, detail), audit.jsonl (the
// case's hash-chained log) and summary.md next to this file.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Session } from "next-auth";

const OUT = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "guardian-sandbox-run-"));
Object.assign(process.env, { GUARDIAN_ACCOUNTS_DIR: dir, GUARDIAN_DATABASE_DRIVER: "sqlite", GUARDIAN_STORAGE_DRIVER: "", FISCO_BCOS_RPC_URL: "", GMAIL_USER: "", GMAIL_APP_PASSWORD: "", GEMINI_API_KEY: "", GROQ_API_KEY: "", OPENROUTER_API_KEY: "" });

const { caseAccess } = await import("../../src/server/access");
const { Integration } = await import("../../src/server/integration");
const { verifyChain } = await import("../../src/server/audit");

const session: Session = { user: { id: "demo:sandbox-evidence", name: "Rina", mode: "demo" }, expires: "2099-01-01" };
type Step = { n: number; time: string; actor: string; action: string; expected: string; outcome: "pass" | "fail"; detail: string };
const steps: Step[] = [];
const money = (minor: number, cur = "CNY") => `${cur} ${(minor / 100).toLocaleString("en-US")}`;

async function as<T>(member: string, fn: (api: InstanceType<typeof Integration>) => T | Promise<T>) {
  const c = caseAccess(session, "C1", member);
  try { return await fn(new Integration(c)); } finally { c.close(); }
}
async function step(actor: string, action: string, expected: string, run: () => Promise<{ ok: boolean; detail: string }>) {
  let ok = false, detail = "";
  try { ({ ok, detail } = await run()); } catch (e) { detail = `threw: ${(e as Error).message}`; }
  steps.push({ n: steps.length + 1, time: new Date().toISOString(), actor, action, expected, outcome: ok ? "pass" : "fail", detail });
}
/** An attack passes when it is refused with the expected message or gateway check. */
async function refused(actor: string, member: string, action: string, expected: string, attempt: (api: InstanceType<typeof Integration>) => unknown, match: RegExp) {
  await step(actor, action, expected, async () => {
    try { await as(member, attempt); return { ok: false, detail: "accepted (should have been refused)" }; }
    catch (e) { const err = e as Error & { check?: number; status?: number }; return { ok: match.test(err.message), detail: `refused${err.status ? ` HTTP ${err.status}` : ""}${err.check ? `, check ${err.check}` : ""}: ${err.message}` }; }
  });
}
const pdf = (name: string) => new File([new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10])], name, { type: "application/pdf" });

try {
  const start = await as("M_OWNER", api => api.view());
  const r2 = start.requests.find(r => r.status === "pending")!;
  const r1 = start.requests.find(r => r.status === "paid")!;
  const payee = start.case.payees[0];

  await step("Rina (owner)", "Open seeded case C1", "verified payee from the signed list; one paid deposit, one pending guarantee", async () => ({ ok: Boolean(payee && r1 && r2), detail: `payee ${payee?.name} ${payee?.accountMasked} (${payee?.source}); ${r1.purpose} ${money(r1.amount)} paid; ${r2.purpose} ${money(r2.approved)} of ${money(r2.amount)} pledged` }));

  // Attacks before payment
  await refused("Rina (owner)", "M_OWNER", "A7: pay an account that is not in the registry", "gateway check 1", api => api.createRequest({ payeeId: "P_ATTACKER", amount: 100_000, purpose: "Transfer to new account" }), /registry|official|not found/i);
  await refused("Rina (owner)", "M_OWNER", "Execute the guarantee before it is fully pledged", "refused, nothing charged", api => api.execute(r2.id), /cover|approved|remaining|check/i);
  await refused("Dewi (companion)", "M_COMP", "A4: companion pledges a share", "role check 3", api => api.quote(r2.id, 100_000), /companion/i);
  await refused("Masjid fund (payer)", "M_MOSQUE", "A4: pledge CNY 15,000, above own CNY 10,000 limit", "gateway check 4", api => { const q = api.quote(r2.id, 1_500_000); return api.approve(r2.id, { amount: 1_500_000, quoteId: q.quoteId }); }, /limit|exceed|remaining/i);
  await refused("Adi (payer)", "M_JKT", "A4: payer creates a payment request", "role check 3", api => api.createRequest({ payeeId: payee.id, amount: 100_000, purpose: "My own request" }), /owner|role|cannot|only/i);
  await refused("Rina (owner)", "M_OWNER", "Deposit that is not the estimate's lower or upper end", "plan check 4", api => api.createRequest({ payeeId: payee.id, amount: 3_100_000, purpose: "Deposit", documentId: start.documents.find(d => d.type === "estimate")!.id }), /lower or upper|already requested/i);

  // Normal flow
  await refused("Rina (owner)", "M_OWNER", "Pay while a payee warning is open (seeded A1 warning)", "gateway check 5", async api => { await as("M_MOSQUE", m => { const q = m.quote(r2.id, 500_000); m.approve(r2.id, { amount: 500_000, quoteId: q.quoteId }); }); return api.execute(r2.id); }, /anomaly|warning/i);
  await step("Rina (owner)", "Verify the hospital account through its official channel", "signed list verified; open payee warnings resolved", async () => as("M_OWNER", async api => {
    await api.verifyPayees();
    const open = api.view().case.anomalies.filter(a => !a.resolved).length;
    return { ok: open === 0, detail: `open warnings after verification: ${open}` };
  }));
  await step("Masjid fund (payer)", "Pledge recorded for the missing CNY 5,000 (made during the previous step)", "request fully pledged", async () => as("M_MOSQUE", api => {
    const r = api.view().requests.find(x => x.id === r2.id)!; const mine = r.approvals.find(a => a.memberId === "M_MOSQUE")!;
    return { ok: r.remaining === 0, detail: `pledged ${money(mine.payAmount, mine.payCurrency)} (${money(mine.amount)}) + ${money(mine.fee, mine.payCurrency)} fee at 1 CNY = ${mine.fxRate} ${mine.payCurrency}; request ${money(r.approved)} of ${money(r.amount)}` };
  }));
  await step("Rina (owner)", "Execute the covered guarantee", "five checks pass; each share charged separately in the sandbox", async () => as("M_OWNER", async api => {
    const res = await api.execute(r2.id) as { ok: boolean; status?: string; charges?: { memberId: string; chargeRef: string | null; status: string }[]; anchor?: { tx: string | null } };
    return { ok: res.ok && res.status === "paid", detail: `status ${res.status}; ${res.charges?.map(c => `${c.memberId}=${c.chargeRef}`).join(", ")}; log head anchor ${res.anchor?.tx ?? "not configured"}` };
  }));
  await refused("Rina (owner)", "M_OWNER", "Execute the same request again", "refused, no double charge", api => api.execute(r2.id), /paid|pending|status|not/i);
  await step("Adi (payer)", "Read the case as a payer", "own share and receipt only; no other payer's charge in the audit view", async () => as("M_JKT", api => {
    const v = api.view(); const req = v.requests.find(r => r.id === r2.id)!;
    const others = JSON.stringify(v.audit.rows).match(/M_KL|M_DXB|M_MOSQUE/g)?.length ?? 0;
    return { ok: req.approvals.every(a => a.memberId === "M_JKT") && others === 0, detail: `approvals visible: ${req.approvals.map(a => a.memberId).join(", ")}; other payers mentioned in audit view: ${others}` };
  }));
  for (const r of [r1, r2]) await step("Dewi (companion)", `Attach hospital invoice to ${r.purpose}`, "stored with SHA-256; anchored when a chain is configured", async () => as("M_COMP", async api => { const inv = await api.addInvoice(r.id, pdf(`invoice-${r.id}.pdf`)); return { ok: /^[0-9a-f]{64}$/.test(inv.sha256), detail: `sha256 ${inv.sha256.slice(0, 16)}…; anchor ${inv.anchoredTx ?? "not configured"}` }; }));
  await step("Rina (owner)", "Reconcile the final bill", "refund split in proportion to what each person paid", async () => as("M_OWNER", api => {
    const final = api.view().documents.find(d => d.type === "final" && d.status === "parsed")!;
    const r = api.reconcile(final.id) as { totalRefund?: number; balanceDue?: number };
    const refunds = api.view().refunds;
    return { ok: Boolean(refunds), detail: `final ${money(final.total ?? 0)}; ${refunds ? `refund ${money(refunds.totalRefund)}: ${refunds.items.map(i => `${i.memberId} ${money(i.amount)}`).join(", ")}` : `balance due ${money(r.balanceDue ?? 0)}`}` };
  }));
  await step("Rina (owner)", "Close the care case", "allowed: no open request, final bill read, every paid request has an invoice", async () => as("M_OWNER", async api => {
    const closed = (await api.closeCase()).case.closed;
    return { ok: Boolean(closed?.packSha256), detail: `closed ${closed?.at}; closing pack sha256 ${closed?.packSha256?.slice(0, 16)}…; anchors ${closed?.packTx ?? "not configured"}` };
  }));
  await step("Auditor (code)", "Verify the hash chain", "every row links to the previous hash", async () => as("M_OWNER", api => { const broken = verifyChain(api.c.db); return { ok: broken === null, detail: broken === null ? `intact over ${api.view().audit.rows.length} rows` : `broken at row ${broken}` }; }));

  const audit = await as("M_OWNER", api => api.c.db.prepare("SELECT seq,ts,actor,action,decision,result,prev_hash,hash FROM audit_log WHERE case_id='C1' ORDER BY seq").all() as Record<string, unknown>[]);
  writeFileSync(join(OUT, "steps.jsonl"), steps.map(s => JSON.stringify(s)).join("\n") + "\n");
  writeFileSync(join(OUT, "audit.jsonl"), audit.map(r => JSON.stringify(r)).join("\n") + "\n");
  const passed = steps.filter(s => s.outcome === "pass").length;
  const md = [
    "# Sandbox execution evidence, 20 October 2026",
    "",
    `Run at ${steps[0].time} (UTC) by \`node --import tsx evidence/sandbox-run-2026-10-20/run.mts\`. Synthetic demo case C1, temporary SQLite database, demo sandbox charger, no LLM, no Stripe network call, no blockchain node (anchor fields read "not configured"). Same engine as the web API (\`src/server/integration.ts\`).`,
    "",
    `**Result: ${passed}/${steps.length} steps behaved as expected.** Raw records: \`steps.jsonl\` (each step) and \`audit.jsonl\` (${audit.length} hash-chained audit rows of the case, including the seeded story rows).`,
    "",
    "| # | Time (UTC) | Actor | Action | Expected | Outcome | Detail |",
    "|---|---|---|---|---|---|---|",
    ...steps.map(s => `| ${s.n} | ${s.time.slice(11, 23)} | ${s.actor} | ${s.action} | ${s.expected} | ${s.outcome} | ${s.detail.replace(/\|/g, "/")} |`),
    "",
    "## Audit rows written by this run",
    "",
    "| Seq | Time (case clock) | Actor | Action | Decision | Hash |",
    "|---|---|---|---|---|---|",
    ...audit.filter(r => (r.seq as number) > 19).map(r => `| ${r.seq} | ${String(r.ts).slice(0, 19)} | ${r.actor} | ${r.action} | ${r.decision} | \`${String(r.hash).slice(0, 12)}…\` |`),
    "",
    "Case clock: the demo case runs on its own clock (`src/server/clock.ts`), so audit timestamps follow the seeded story date rather than the wall clock.",
  ].join("\n");
  writeFileSync(join(OUT, "summary.md"), md + "\n");
  console.log(`${passed}/${steps.length} steps as expected`);
  for (const s of steps) console.log(`${s.outcome.padEnd(4)} ${s.action} — ${s.detail}`);
} finally { rmSync(dir, { recursive: true, force: true }); }
