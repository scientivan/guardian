import Database from "better-sqlite3";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Session } from "next-auth";
import type { Member } from "@/lib/demo";
import { ownerDatabase, WorkspaceStore } from "./workspace";
import { appendAudit } from "./audit";
import { payCurrencies, toCaseCurrency } from "@/lib/fx-rates";

import { ApiError } from "./errors";
export { ApiError } from "./errors";


function directory() {
  const dir = process.env.GUARDIAN_ACCOUNTS_DIR ?? join(process.cwd(), ".cache", "accounts");
  mkdirSync(dir,{recursive:true,mode:0o700});
  const db = new Database(join(dir,"access.db"));
  db.pragma("journal_mode=WAL");
  db.exec(`CREATE TABLE IF NOT EXISTS memberships (account_id TEXT, owner_id TEXT, case_id TEXT, member_id TEXT, PRIMARY KEY(account_id,owner_id,case_id));
    CREATE TABLE IF NOT EXISTS invitations (hash TEXT PRIMARY KEY,owner_id TEXT,case_id TEXT,mode TEXT,name TEXT,email TEXT,role TEXT,currency TEXT,share_limit INTEGER,expires_at TEXT,used_by TEXT);`);
  // Added 20 Oct: how the invite was sent, who sent it, and a payer's "not now".
  const columns=new Set((db.prepare("PRAGMA table_info(invitations)").all() as {name:string}[]).map(c=>c.name));
  if(!columns.has("delivery"))db.exec("ALTER TABLE invitations ADD COLUMN delivery TEXT NOT NULL DEFAULT 'email'");
  if(!columns.has("inviter"))db.exec("ALTER TABLE invitations ADD COLUMN inviter TEXT NOT NULL DEFAULT ''");
  if(!columns.has("declined_by"))db.exec("ALTER TABLE invitations ADD COLUMN declined_by TEXT");
  // Added 20 Oct: the member's Google address, for payment-request notifications.
  if(!(db.prepare("PRAGMA table_info(memberships)").all() as {name:string}[]).some(c=>c.name==="email"))db.exec("ALTER TABLE memberships ADD COLUMN email TEXT");
  return db;
}
/** Google addresses of the members who joined a case, by member id. */
export function memberEmails(ownerId: string, caseId: string): Record<string, string> {
  const index=directory();
  try { return Object.fromEntries((index.prepare("SELECT member_id,email FROM memberships WHERE owner_id=? AND case_id=? AND email IS NOT NULL").all(ownerId,caseId) as {member_id:string;email:string}[]).map(r=>[r.member_id,r.email])); }
  finally { index.close(); }
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
  if(!c.db.prepare("SELECT 1 FROM case_closure WHERE case_id=?").get(c.caseId))appendAudit(c.db,{caseId:c.caseId,actor:c.member.id,action:"permission.denied",inputSources:["user"],decision:"deny",result:{check:3,reason:message}});
  throw new ApiError(message,403,3);
}
export function requireOwner(c: CaseAccess) { if(c.member.role!=="owner") denyAccess(c,"Only the case owner can do this."); }

export type Delivery="email"|"link";

/**
 * Creates an invitation. "email" invites are bound to one Google address and appear in that
 * account's Invitation Requests. "link" invites carry no email: the first Google account that opens
 * the link and accepts it joins, once, within 72 hours. The token is returned for the share link.
 */
/**
 * `shareLimit` is in `limitCurrency` (the owner's own currency by default) and is stored in the
 * hospital currency at the reference rate, rounded down. The payer picks the currency they pay in
 * when accepting; `currency` is only kept for older callers.
 */
export function invite(c: CaseAccess, input: { name:string;email?:string;role:"payer"|"companion";currency?:string;shareLimit:number;limitCurrency?:string;delivery?:Delivery }) {
  requireOwner(c);
  const caseCurrency=c.store.get(c.caseId).case.currency;
  const limit=input.role==="payer"?toCaseCurrency(input.shareLimit,input.limitCurrency??caseCurrency,caseCurrency):0;
  if(limit===null) throw new ApiError(`There is no reference rate from ${input.limitCurrency} to ${caseCurrency}. Enter the limit in ${caseCurrency}.`);
  const delivery:Delivery=input.delivery ?? "email";
  const email=input.email?.trim().toLowerCase() ?? "";
  if(c.session.user.mode==="google" && delivery==="email" && !email) throw new ApiError("Enter the payer’s Google email address.");
  if(email && email===c.session.user.email?.toLowerCase()) throw new ApiError("You can’t invite your own account.");
  const token=randomUUID();
  const index=directory();
  try {
    index.prepare("INSERT INTO invitations (hash,owner_id,case_id,mode,name,email,role,currency,share_limit,expires_at,used_by,delivery,inviter) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,?)")
      .run(hashToken(token),c.ownerId,c.caseId,c.session.user.mode,input.name,delivery==="email"?email:"",input.role,input.currency??"",limit,new Date(Date.now()+72*3600_000).toISOString(),delivery,c.member.displayName);
  } finally{index.close();}
  appendAudit(c.db,{caseId:c.caseId,actor:c.member.id,action:"member.invite",inputSources:["user"],decision:"allow",result:{name:input.name,role:input.role,delivery}});
  return token;
}

const hashToken=(token:string)=>createHash("sha256").update(token).digest("hex");
type Invitation={hash:string;owner_id:string;case_id:string;mode:string;name:string;email:string;role:"payer"|"companion";currency:string;share_limit:number;expires_at:string;used_by:string|null;delivery:Delivery;inviter:string;declined_by:string|null};

/** Whether this signed-in account may see and accept the invitation. */
function addressedTo(row:Invitation,session:Session) {
  if(row.mode!==session.user.mode) return false;
  if(row.mode==="demo") return row.owner_id===session.user.id;
  return row.email ? row.email===session.user.email?.toLowerCase() : row.delivery==="link";
}

/** Open, accept or decline an invitation by its link token. */
export function invitation(session: Session, token:string, accept=false, currency?:string) {
  return invitationById(session,hashToken(token),accept?"accept":"view",currency);
}

/** Same, by invitation id (the token's hash). Used by the Invitation Requests list. */
export function invitationById(session: Session, hash:string, action:"view"|"accept"|"decline"="view", currency?:string) {
  const index=directory();
  try {
    const row=index.prepare("SELECT * FROM invitations WHERE hash=?").get(hash) as Invitation|undefined;
    if(!row || !addressedTo(row,session)) throw new ApiError("This invitation is not available for your account.",404);
    if(row.used_by && row.used_by!==session.user.id) throw new ApiError("This invitation has already been used.",409);
    if(!row.used_by && new Date(row.expires_at).getTime()<=Date.now()) throw new ApiError("This invitation has expired. Ask the owner for a new link.",410);
    if(row.declined_by===session.user.id && action==="view" && !row.used_by) throw new ApiError("You declined this invitation. Ask the owner for a new one if you changed your mind.",410);
    const db=ownerDatabase(row.owner_id);
    try {
      const store=new WorkspaceStore(db,session.user.mode,session.user.name ?? row.name);
      const data=store.get(row.case_id);
      const memberId=`M_invite_${hash.slice(0,24)}`;
      const choices=payCurrencies(data.case.currency);
      if(action==="accept" && !row.used_by) {
        // The payer chooses the currency they pay in; it must have a reference rate for this case.
        const pays=currency ?? (row.currency || data.case.currency);
        if(!choices.includes(pays)) throw new ApiError(`Choose one of: ${choices.join(", ")}.`);
        db.prepare("INSERT OR IGNORE INTO members (id,case_id,display_name,role,share_limit,currency) VALUES (?,?,?,?,?,?)").run(memberId,row.case_id,session.user.mode==="google" ? session.user.name ?? row.name : row.name,row.role,row.share_limit,pays);
        index.prepare("INSERT OR REPLACE INTO memberships (account_id,owner_id,case_id,member_id,email) VALUES (?,?,?,?,?)").run(session.user.id,row.owner_id,row.case_id,memberId,session.user.email??row.email??null);
        index.prepare("UPDATE invitations SET used_by=?, declined_by=NULL WHERE hash=?").run(session.user.id,hash);
        appendAudit(db,{caseId:row.case_id,actor:memberId,action:"member.join",inputSources:["user"],decision:"allow",result:{role:row.role,delivery:row.delivery}});
      }
      if(action==="decline" && !row.used_by) index.prepare("UPDATE invitations SET declined_by=? WHERE hash=?").run(session.user.id,hash);
      return {id:hash,caseId:row.case_id,patientName:data.case.patient.name,hospitalName:data.case.hospital.name,country:data.country,caseCurrency:data.case.currency,inviter:row.inviter||"The case owner",role:row.role,name:row.name,currency:row.currency,currencies:choices,shareLimit:row.share_limit,delivery:row.delivery,expiresAt:row.expires_at,accepted:Boolean(row.used_by)||action==="accept",declined:action==="decline",memberId};
    } finally{db.close();}
  } finally{index.close();}
}

/** Pending email invitations addressed to this account (Dashboard → Invitation Requests). */
export function receivedInvitations(session: Session) {
  const index=directory();
  let rows:Invitation[];
  try {
    rows=(session.user.mode==="google"
      ? index.prepare("SELECT * FROM invitations WHERE mode='google' AND delivery='email' AND email=? AND used_by IS NULL AND (declined_by IS NULL OR declined_by<>?) AND expires_at>? ORDER BY expires_at DESC").all(session.user.email?.toLowerCase() ?? "",session.user.id,new Date().toISOString())
      : index.prepare("SELECT * FROM invitations WHERE mode='demo' AND owner_id=? AND delivery='email' AND used_by IS NULL AND declined_by IS NULL AND expires_at>? ORDER BY expires_at DESC").all(session.user.id,new Date().toISOString())) as Invitation[];
  } finally{index.close();}
  return rows.flatMap(r=>{try{return [invitationById(session,r.hash)];}catch{return [];}});
}
