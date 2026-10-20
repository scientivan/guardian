import type { CareCase } from "@/lib/workspace";
import type { DB } from "./db";
import { verifyChain, type AuditRow } from "./audit";
import { createQuote, formatRate } from "./fx";
import { expireDue } from "./payments";
import { paidByMember, refundStatus } from "./refunds";
import { loadItems } from "./analysis";
import { FINAL, INTERIM_ITEMS, INTERIM } from "./fixtures/demo-case";
import { now } from "./clock";
import type { Member, PaymentRequest, Pledge } from "@/lib/demo";
import { syncDirectoryHospital } from "./hospital-directory";

/** One-time compatibility import of pre-integration demonstration snapshots. */
export function importLegacyState(db: DB, snapshots: CareCase[], demo: boolean) {
  for(const row of db.prepare("SELECT id,meta FROM documents WHERE type='estimate'").all() as {id:string;meta:string}[]) {
    const meta=JSON.parse(row.meta);
    if(meta.estimateByCategory && !Array.isArray(meta.estimateByCategory)) {
      meta.estimateByCategory=Object.entries(meta.estimateByCategory).map(([category,amount])=>({category,amount}));
      db.prepare("UPDATE documents SET meta=? WHERE id=?").run(JSON.stringify(meta),row.id);
    }
  }
  if (db.prepare("SELECT value FROM settings WHERE key='web_backend_v1'").get()) return;
  db.transaction(() => {
    if (demo) for (const data of snapshots) {
      for (const request of data.requests) {
        const exists = db.prepare("SELECT id FROM payment_requests WHERE id=?").get(request.id);
        if (exists) continue;
        const payee = db.prepare("SELECT id FROM payees WHERE hospital_id=? AND source='official_registry' LIMIT 1").get(data.case.hospital.id) as { id: string } | undefined;
        if (!payee) continue;
        const at = now(db);
        db.prepare("INSERT INTO payment_requests (id,case_id,payee_id,amount,purpose,status,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?)").run(request.id, data.case.id, payee.id, request.amount, request.purpose, request.status, at.toISOString(), new Date(at.getTime() + 120 * 60_000).toISOString());
        for (const pledge of request.approvals) {
          const quote = createQuote(db, request.id, pledge.memberId, pledge.amount, at);
          db.prepare("INSERT OR IGNORE INTO approvals (request_id,member_id,amount,status,quote_id,charge_ref,ts) VALUES (?,?,?,?,?,?,?)").run(request.id, pledge.memberId, pledge.amount, pledge.status, quote.id, pledge.status === "charged" ? `sandbox_seed_${request.id}_${pledge.memberId}` : null, at.toISOString());
        }
      }
      if (data.case.id === "C1") {
        const text = INTERIM_ITEMS.map(i => `${i.id} ${i.category} ${i.description} ${i.qty} x ${i.unitPrice / 100}`).join("\n") + `\n${INTERIM.notes.join("\n")}`;
        db.prepare("UPDATE documents SET scrubbed_text=? WHERE id='D2' AND scrubbed_text IS NULL").run(text);
        if (!db.prepare("SELECT id FROM documents WHERE id='D3'").get()) {
          db.prepare("INSERT INTO documents (id,case_id,type,sha256,meta,created_at) VALUES ('D3',?,'final','',?,?)").run(data.case.id, JSON.stringify({ statedTotal: FINAL.statedTotal, actualStayDays: 12, currency: "CNY" }), now(db).toISOString());
          const add = db.prepare("INSERT INTO bill_items (document_id,code,category,description,qty,unit_price) VALUES ('D3',?,?,?,?,?)");
          for (const i of FINAL.lines) add.run(i.id, i.category, i.description, i.qty, i.unitPrice);
        }
      }
    }
    db.prepare("INSERT INTO settings VALUES ('web_backend_v1','1')").run();
  })();
}

export function projectCase(db: DB, source: CareCase, memberId: string): CareCase {
  const data = structuredClone(source);
  const id = data.case.id;
  syncDirectoryHospital(db,data.case.hospital.id);
  const hospital=db.prepare("SELECT name,official_channel FROM hospitals WHERE id=?").get(data.case.hospital.id) as {name:string;official_channel:string};
  data.case.hospital.name=hospital.name.replace(" (demo)","");
  data.case.hospital.officialChannel=hospital.official_channel;
  const at = now(db);
  expireDue(db, at);
  const members = db.prepare("SELECT id,display_name displayName,role,share_limit shareLimit,currency FROM members WHERE case_id=?").all(id) as Member[];
  const me = members.find(m => m.id === memberId);
  if (!me) throw new Error("You are not a member of this care case.");
  data.case.members = members;
  data.case.me = { id: me.id, role: me.role };
  data.case.payees = (db.prepare("SELECT id,account,source,verified_at FROM payees WHERE hospital_id=? AND source='official_registry'").all(data.case.hospital.id) as { id: string; account: string; source: string; verified_at: string }[]).map(p => ({ id: p.id, name: data.case.hospital.name, accountMasked: `•••• ${p.account.replace(/\D/g, "").slice(-4)}`, source: p.source, verifiedAt: p.verified_at }));
  data.case.anomalies = (db.prepare("SELECT id,kind,detail,resolved,ts FROM anomalies WHERE case_id=?").all(id) as { id: number; kind: string; detail: string; resolved: number; ts: string }[]).map(a => ({ ...a, resolved: Boolean(a.resolved) }));
  const docs = db.prepare("SELECT id,type,sha256,anchored_tx,status,reason,created_at FROM documents WHERE case_id=? ORDER BY created_at,rowid").all(id) as { id: string; type: "estimate" | "interim" | "final"; sha256: string; anchored_tx: string | null; status: "parsed" | "needs_reupload"; reason: string | null; created_at: string }[];
  data.documents = docs.map(doc => {
    const old = source.documents.find(d => d.id === doc.id);
    const items = loadItems(db, doc.id);
    return { id: doc.id, type: doc.type, title: old?.title ?? `${doc.type === "final" ? "Final" : doc.type === "estimate" ? "Estimate" : "Interim"} bill`, by: old?.by ?? "Case member", ts: doc.created_at, status: doc.status, reason: doc.reason ?? undefined, items: items.length, total: doc.type === "estimate" ? null : items.reduce((s, i) => s + i.lineTotal, 0), sha256: doc.sha256, anchoredTx: doc.anchored_tx };
  });
  if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='web_replacements'").get()) {
    const replaced=new Set((db.prepare("SELECT old_id FROM web_replacements").all() as {old_id:string}[]).map(r=>r.old_id));
    data.documents=data.documents.filter(d=>!replaced.has(d.id));
  }
  type RequestRow = { id: string; payee_id: string; amount: number; purpose: string; status: PaymentRequest["status"]; created_at: string; expires_at: string };
  data.requests = (db.prepare("SELECT * FROM payment_requests WHERE case_id=? ORDER BY created_at DESC,rowid DESC").all(id) as RequestRow[]).map(r => {
    const approvals = db.prepare(`SELECT a.member_id memberId,m.display_name displayName,a.amount,a.status,a.ts,a.charge_ref chargeRef,q.pay_currency payCurrency,q.pay_amount payAmount,q.rate_e4 rateE4,q.fee,q.expires_at quoteExpiresAt
      FROM approvals a JOIN members m ON m.id=a.member_id LEFT JOIN fx_quotes q ON q.id=a.quote_id WHERE a.request_id=? AND a.status!='withdrawn'`).all(r.id) as (Pledge & { rateE4: number; quoteExpiresAt: string; chargeRef: string | null })[];
    const approved = approvals.filter(a => a.status === "approved" || a.status === "charged").reduce((s,a) => s+a.amount,0);
    return { id: r.id, payeeId: r.payee_id, payeeName: data.case.hospital.name, accountMasked: data.case.payees.find(p => p.id === r.payee_id)?.accountMasked ?? "Unverified account", amount: r.amount, currency: data.case.currency, approved, remaining: Math.max(0,r.amount-approved), purpose: r.purpose, status: r.status, createdAt: r.created_at, expiresAt: r.expires_at, approvals: approvals.map(a => ({ ...a, fxRate: formatRate(a.rateE4 ?? 10000) })) };
  });
  const paid = paidByMember(db,id);
  const lastBill = [...data.documents].reverse().find(d => d.type !== "estimate" && d.status === "parsed");
  data.case.totals = { paid: paid.reduce((s,p) => s+p.amount,0), billedSoFar: lastBill?.total ?? 0, currency: data.case.currency };
  const refunds = refundStatus(db,id,at);
  const final = [...data.documents].reverse().find(d => d.type === "final" && d.status === "parsed");
  data.refunds = refunds.items.length ? { demo: data.case.demo, currency: data.case.currency, finalBill: final?.total ?? 0, deposits: data.case.totals.paid, totalRefund: refunds.totalRefund, items: refunds.items.map(r => ({ ...r, paid: paid.find(p => p.memberId === r.memberId)?.amount ?? 0 })) } : null;
  const rows = db.prepare("SELECT * FROM audit_log WHERE case_id=? ORDER BY seq").all(id) as AuditRow[];
  const anchor = db.prepare("SELECT value FROM settings WHERE key=?").get(`audit_anchor:${id}`) as { value: string } | undefined;
  data.audit = { chainValid: verifyChain(db) === null, anchoredHead: anchor ? JSON.parse(anchor.value) : { hash: rows.at(-1)?.hash ?? "", tx: "" }, rows: rows.map(r => {
    const result = JSON.parse(r.result ?? "{}");
    return { seq: r.seq, ts: r.ts, actor: members.find(m => m.id === r.actor)?.displayName ?? r.actor, action: r.action, decision: r.decision === "deny" ? "deny" : "allow", hash: r.hash, check: result.check, inputSources: JSON.parse(r.input_sources), result, prevHash: r.prev_hash };
  }) };
  const status = (state: "idle" | "done" | "waiting" | "blocked", text: string) => ({ state,text,detail:text });
  data.agents.clerk = status(data.documents.length ? "done" : "idle", data.documents.length ? "Personal fields protected before AI reads" : "Waiting for the first document");
  data.agents.reader = status(data.documents.some(d => d.status === "needs_reupload") ? "blocked" : data.documents.length ? "done" : "idle", data.documents.some(d => d.status === "needs_reupload") ? "A document needs a clearer upload" : `${data.documents.length} documents on file`);
  data.agents.calculator = status(data.explanation ? "done" : "idle", data.explanation ? "Estimate and bill compared" : "Waiting for an estimate and bill");
  data.agents.second = status(data.explanation?.secondModelChecked.length ? "done" : "idle", data.explanation?.secondModelChecked.length ? `${data.explanation.secondModelChecked.length} items independently checked` : "Independent check not yet available");
  data.agents.gate = status(data.case.anomalies.some(a => !a.resolved) ? "blocked" : data.requests.some(r => r.status === "pending") ? "waiting" : "idle", data.case.anomalies.some(a => !a.resolved) ? "Verify the open warning before paying" : "Payments require each person’s approval");
  data.agents.planner = status(data.explanation ? "done" : "waiting", data.explanation ? "Bill explanation is ready" : "Ready to help with the next step");
  data.agents.auditor = status(data.audit.chainValid ? "done" : "blocked", `${rows.length} steps recorded${data.audit.chainValid ? "" : " · integrity check failed"}`);
  if (me.role === "payer") {
    data.items = {};
    data.documents=data.documents.map(d=>({...d,title:`${d.type} bill`}));
    if (data.explanation) data.explanation = { ...data.explanation, lines: data.explanation.lines.filter(l => l.type === "arithmetic_fact"), questions: [] };
    if (data.refunds) data.refunds.items = data.refunds.items.filter(r => r.memberId === me.id);
  }
  return data;
}
