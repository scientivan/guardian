import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { orgName, personName, zodRule } from "@/lib/validate";
import { CASE, DOCUMENTS, EXPLANATION, ITEMS, REQUESTS, REFUNDS, AUDIT } from "@/lib/demo";
import { SAMPLE_STATUS } from "@/components/office/model";
import type { AccountMode, CareCase, Workspace } from "@/lib/workspace";
import { openDb, type DB } from "./db";
import { appendAudit, verifyChain, type AuditRow } from "./audit";
import { seed } from "./seed";
import { ESTIMATE, INTERIM_ITEMS } from "./fixtures/demo-case";
import { importLegacyState, projectCase } from "./case-state";
import { linkDirectoryHospital, openHospitalDirectory } from "./hospital-directory";

export const CreateCase = z.object({
  patientName: z.string().trim().superRefine(zodRule(personName("the patient’s name"))),
  hospitalName: z.string().trim().superRefine(zodRule(orgName())),
  country: z.enum(["China", "Malaysia", "Singapore", "Thailand"]),
  currency: z.enum(["IDR", "MYR", "SGD", "AED", "USD", "CNY"]),
  ownerName: z.string().trim().superRefine(zodRule(personName("your name"))),
  hospitalDirectoryId: z.string().optional(),
});

export function ownerDatabase(accountId: string): DB {
  if (!accountId) throw new Error("Sign in to continue.");
  const dir = process.env.GUARDIAN_ACCOUNTS_DIR ?? join(process.cwd(), ".cache", "accounts");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return openDb(join(dir, `${createHash("sha256").update(accountId).digest("hex")}.db`));
}

/** Each account has a separate database. Nothing from a Google workspace is seeded. */
export class WorkspaceStore {
  constructor(readonly db: DB, readonly mode: AccountMode, readonly actor: string) {
    db.exec("CREATE TABLE IF NOT EXISTS web_cases (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL)");
    db.exec("CREATE TABLE IF NOT EXISTS web_workspace (key TEXT PRIMARY KEY)");
    if (mode === "demo" && !db.prepare("SELECT key FROM web_workspace WHERE key='initialized'").get()) {
      seed(db);
      const insert = db.prepare("INSERT OR IGNORE INTO documents (id,case_id,type,sha256,meta,created_at) VALUES (?,?,?,?,?,?)");
      insert.run("D1", "C1", "estimate", "", JSON.stringify({ estimateLow: ESTIMATE.low, estimateHigh: ESTIMATE.high, assumedStayDays: 3, estimateByCategory: ESTIMATE.byCategory, exclusions: ESTIMATE.exclusions, currency: "CNY" }), new Date().toISOString());
      insert.run("D2", "C1", "interim", "", JSON.stringify({ actualStayDays: 5, currency: "CNY", statedTotal: 3678200, statedReasons: ["The antibiotic course was extended to 5 days."] }), new Date().toISOString());
      const addItem = db.prepare("INSERT INTO bill_items (document_id,code,category,description,qty,unit_price) VALUES (?,?,?,?,?,?)");
      for (const i of INTERIM_ITEMS) addItem.run("D2", i.id, i.category, i.description, i.qty, i.unitPrice);
      const example: CareCase = structuredClone({ case: CASE, country: "China", documents: DOCUMENTS, explanation: EXPLANATION, items: ITEMS, requests: REQUESTS, refunds: REFUNDS, audit: AUDIT, agents: SAMPLE_STATUS });
      example.case.hospital.name = example.case.hospital.name.replace(" (demo)", "");
      example.requests.forEach(r => { r.payeeName = r.payeeName.replace(" (demo)", ""); });
      // The seeded story ends before any anchor: an anchor row here would claim a FISCO transaction
      // that never happened in this workspace. "Anchor audit hash" on Case History makes a real one.
      example.audit.rows = example.audit.rows.filter(row => !row.action.startsWith("Anchored"));
      for (const row of example.audit.rows) appendAudit(db, { caseId: "C1", actor: row.actor, action: row.action, inputSources: ["system"], decision: row.decision, result: {} }, new Date(row.ts));
      this.syncAudit(example);
      example.agents.auditor.text = `${example.audit.rows.length} steps recorded`;
      example.agents.auditor.detail = "Recorded the case activity in a hash-chained log.";
      this.save(example);
      db.prepare("INSERT INTO web_workspace VALUES ('initialized')").run();
    }
    importLegacyState(db, this.list().cases, mode === "demo");
  }

  list(): Workspace {
    return { mode: this.mode, cases: (this.db.prepare("SELECT snapshot FROM web_cases ORDER BY rowid DESC").all() as { snapshot: string }[]).map(r => JSON.parse(r.snapshot)) };
  }

  get(id: string): CareCase {
    const row = this.db.prepare("SELECT snapshot FROM web_cases WHERE id=?").get(id) as { snapshot: string } | undefined;
    if (!row) throw new Error("Care case not found in your account.");
    return JSON.parse(row.snapshot);
  }

  view(id: string, memberId?: string): CareCase {
    const source = this.get(id);
    const owner = this.db.prepare("SELECT id FROM members WHERE case_id=? AND role='owner' LIMIT 1").get(id) as { id: string };
    return projectCase(this.db, source, memberId ?? owner.id);
  }

  save(data: CareCase) {
    this.db.prepare("INSERT INTO web_cases VALUES (?,?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot").run(data.case.id, JSON.stringify(data));
  }

  create(input: unknown): CareCase {
    const v = CreateCase.parse(input);
    if(v.hospitalDirectoryId) {
      if(this.mode!=="google")throw new Error("Use a Google account to link a directory hospital.");
      const directory=openHospitalDirectory();
      try {
        const h=directory.hospital(v.hospitalDirectoryId);
        if(!["listed","verified"].includes(h.profileStatus))throw new Error("Choose a listed or verified hospital profile.");
        if(h.profile.country!==v.country)throw new Error("The hospital country does not match the selected country.");
        v.hospitalName=h.profile.name;
      } finally{directory.close();}
    }
    const id = `C_${randomUUID()}`;
    const hospitalId = `H_${randomUUID()}`;
    const memberId = `M_${randomUUID()}`;
    const currency = ({ China: "CNY", Malaysia: "MYR", Singapore: "SGD", Thailand: "THB" })[v.country];
    const data: CareCase = {
      case: {
        demo: this.mode === "demo", id, currency,
        patient: { name: v.patientName, token: "[PASIEN_1]" },
        hospital: { id: hospitalId, name: v.hospitalName, officialChannel: "" },
        me: { id: memberId, role: "owner" },
        members: [{ id: memberId, displayName: v.ownerName, role: "owner", shareLimit: 0, currency: v.currency }],
        payees: [], anomalies: [], totals: { paid: 0, billedSoFar: 0, currency }, closed: null,
      },
      country: v.country, documents: [], explanation: null, items: {}, requests: [], refunds: null,
      audit: { chainValid: true, anchoredHead: { hash: "", tx: "" }, rows: [] },
      agents: Object.fromEntries(Object.keys(SAMPLE_STATUS).map(id => [id, { state: "idle", text: "Ready when you are", detail: "Waiting for the first document." }])) as CareCase["agents"],
    };
    this.db.transaction(() => {
      this.db.prepare("INSERT INTO hospitals VALUES (?,?,?,?)").run(hospitalId, v.hospitalName, "", "");
      if(v.hospitalDirectoryId)linkDirectoryHospital(this.db,hospitalId,v.hospitalDirectoryId);
      this.db.prepare("INSERT INTO cases (id,patient_token,hospital_id,currency) VALUES (?,?,?,?)").run(id, "[PASIEN_1]", hospitalId, currency);
      this.db.prepare("INSERT INTO members (id,case_id,display_name,role,currency) VALUES (?,?,?,?,?)").run(memberId, id, v.ownerName, "owner", v.currency);
      this.db.prepare("INSERT INTO pii_tokens VALUES (?,?,?,?)").run(id, "[PASIEN_1]", v.patientName, "NAME");
      this.record(data, "Created care case");
    })();
    return data;
  }

  record(data: CareCase, action: string) {
    const row = appendAudit(this.db, { caseId: data.case.id, actor: this.actor, action, inputSources: ["user"], decision: "allow", result: {} });
    data.audit.rows.push({ seq: row.seq, ts: row.ts, actor: row.actor, action, decision: "allow", hash: row.hash });
    data.audit.chainValid = verifyChain(this.db) === null;
    data.audit.anchoredHead.hash = row.hash;
    data.audit.anchoredHead.tx = "";
    this.save(data);
  }

  syncAudit(data: CareCase) {
    const rows = this.db.prepare("SELECT * FROM audit_log WHERE case_id=? ORDER BY seq").all(data.case.id) as AuditRow[];
    data.audit.rows = rows.map(r => ({ seq: r.seq, ts: r.ts, actor: r.actor, action: r.action, decision: r.decision === "deny" ? "deny" : "allow", hash: r.hash }));
    data.audit.chainValid = verifyChain(this.db) === null;
    data.audit.anchoredHead = { hash: rows.at(-1)?.hash ?? "", tx: "" };
    this.save(data);
  }
}
