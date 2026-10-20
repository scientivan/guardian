import Database from "better-sqlite3";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Session } from "next-auth";
import type { Member } from "@/lib/demo";
import { ownerDatabase, WorkspaceStore } from "./workspace";
import { appendAudit } from "./audit";

import { ApiError } from "./errors";
export { ApiError } from "./errors";


function directory() {
  const dir = process.env.GUARDIAN_ACCOUNTS_DIR ?? join(process.cwd(), ".cache", "accounts");
  mkdirSync(dir,{recursive:true,mode:0o700});
  const db = new Database(join(dir,"access.db"));
  db.pragma("journal_mode=WAL");
  db.exec(`CREATE TABLE IF NOT EXISTS memberships (account_id TEXT, owner_id TEXT, case_id TEXT, member_id TEXT, PRIMARY KEY(account_id,owner_id,case_id));
    CREATE TABLE IF NOT EXISTS invitations (hash TEXT PRIMARY KEY,owner_id TEXT,case_id TEXT,mode TEXT,name TEXT,email TEXT,role TEXT,currency TEXT,share_limit INTEGER,expires_at TEXT,used_by TEXT);`);
  return db;
}
export function memberships(accountId: string) {
  const index=directory();
  try { return index.prepare("SELECT owner_id,case_id,member_id FROM memberships WHERE account_id=?").all(accountId) as {owner_id:string;case_id:string;member_id:string}[]; }
  finally {index.close();}
}

export function caseAccess(session: Session, caseId: string, requestedMember?: string | null) {
  let ownerId=session.user.id;
  let db=ownerDatabase(ownerId);
  let store=new WorkspaceStore(db,session.user.mode,session.user.name ?? "You");
  let memberId: string;
  if (db.prepare("SELECT id FROM cases WHERE id=?").get(caseId)) {
    memberId=(db.prepare("SELECT id FROM members WHERE case_id=? AND role='owner' LIMIT 1").get(caseId) as {id:string}).id;
  } else {
    db.close();
    const link=memberships(session.user.id).find(m=>m.case_id===caseId);
    if (!link || session.user.mode!=="google") throw new ApiError("Care case not found in your account.",404);
    ownerId=link.owner_id;
    db=ownerDatabase(ownerId);
    store=new WorkspaceStore(db,"google",session.user.name ?? "You");
    memberId=link.member_id;
  }
  if (requestedMember && session.user.mode==="demo") memberId=requestedMember;
  const member=db.prepare("SELECT id,display_name displayName,role,share_limit shareLimit,currency FROM members WHERE id=? AND case_id=?").get(memberId,caseId) as Member | undefined;
  if (!member) {db.close();throw new ApiError("You are not a member of this care case.",403,3);}
  return {session,ownerId,caseId,db,store,member,close:()=>db.close()};
}
export type CaseAccess = ReturnType<typeof caseAccess>;
export function denyAccess(c:CaseAccess,message:string):never {
  appendAudit(c.db,{caseId:c.caseId,actor:c.member.id,action:"permission.denied",inputSources:["user"],decision:"deny",result:{check:3,reason:message}});
  throw new ApiError(message,403,3);
}
export function requireOwner(c: CaseAccess) { if(c.member.role!=="owner") denyAccess(c,"Only the case owner can do this."); }

export function invite(c: CaseAccess, input: { name:string;email?:string;role:"payer"|"companion";currency:string;shareLimit:number }) {
  requireOwner(c);
  if(c.session.user.mode==="google" && !input.email) throw new ApiError("Enter the helper’s Google email address.");
  const token=randomUUID();
  const index=directory();
  try {index.prepare("INSERT INTO invitations VALUES (?,?,?,?,?,?,?,?,?,?,NULL)").run(createHash("sha256").update(token).digest("hex"),c.ownerId,c.caseId,c.session.user.mode,input.name,input.email?.trim().toLowerCase() ?? "",input.role,input.currency,input.shareLimit,new Date(Date.now()+72*3600_000).toISOString());}
  finally{index.close();}
  appendAudit(c.db,{caseId:c.caseId,actor:c.member.id,action:"member.invite",inputSources:["user"],decision:"allow",result:{name:input.name,role:input.role}});
  return token;
}

export function invitation(session: Session, token:string, accept=false) {
  const hash=createHash("sha256").update(token).digest("hex");
  const index=directory();
  type Invitation={owner_id:string;case_id:string;mode:string;name:string;email:string;role:"payer"|"companion";currency:string;share_limit:number;expires_at:string;used_by:string|null};
  try {
    const row=index.prepare("SELECT * FROM invitations WHERE hash=?").get(hash) as Invitation|undefined;
    if(!row || row.mode!==session.user.mode || (row.mode==="demo" ? row.owner_id!==session.user.id : row.email!==session.user.email?.toLowerCase())) throw new ApiError("This invitation is not available for your account.",404);
    if(row.used_by && row.used_by!==session.user.id) throw new ApiError("This invitation has already been used.",409);
    if(!row.used_by && new Date(row.expires_at).getTime()<=Date.now()) throw new ApiError("This invitation has expired. Ask the owner for a new link.",410);
    const db=ownerDatabase(row.owner_id);
    try {
      const store=new WorkspaceStore(db,session.user.mode,session.user.name ?? row.name);
      const data=store.get(row.case_id);
      if(accept && !row.used_by) {
        const memberId=`M_invite_${hash.slice(0,24)}`;
        db.prepare("INSERT OR IGNORE INTO members (id,case_id,display_name,role,share_limit,currency) VALUES (?,?,?,?,?,?)").run(memberId,row.case_id,session.user.mode==="google" ? session.user.name ?? row.name : row.name,row.role,row.share_limit,row.currency);
        index.prepare("INSERT OR REPLACE INTO memberships VALUES (?,?,?,?)").run(session.user.id,row.owner_id,row.case_id,memberId);
        index.prepare("UPDATE invitations SET used_by=? WHERE hash=?").run(session.user.id,hash);
        appendAudit(db,{caseId:row.case_id,actor:memberId,action:"member.join",inputSources:["user"],decision:"allow",result:{role:row.role}});
      }
      return {caseId:row.case_id,patientName:data.case.patient.name,hospitalName:data.case.hospital.name,role:row.role,name:row.name,expiresAt:row.expires_at,accepted:Boolean(row.used_by)||accept,memberId:`M_invite_${hash.slice(0,24)}`};
    } finally{db.close();}
  } finally{index.close();}
}
