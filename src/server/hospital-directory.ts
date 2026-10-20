import { createPublicKey, randomUUID, verify } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Session } from "next-auth";
import { z } from "zod";
import type { HospitalProfile, HospitalSource, HospitalRecord, HospitalReview, HospitalTrust, HospitalAIReview, HospitalVerification, PublicHospital } from "@/lib/hospitals";
import { openDb, type DB } from "./db";
import { ApiError } from "./errors";
import { requireAdmin } from "./admin-access";
import { appendAudit, sha256, verifyChain, type AuditRow } from "./audit";
import { canonicalPayload, portalPublicKey } from "./portal";
import { hasConfusable, hasInvisible, normalizeName } from "./normalize";
import { anchorHash } from "./anchor";
import { isIP } from "node:net";
import { isPublicAddress } from "./public-web";

const text = (max = 200) => z.string().trim().max(max);
export const httpsUrl = z.string().trim().url().max(2000).refine(value => {
  const url = new URL(value);
  const host=url.hostname.replace(/^\[|\]$/g,"");
  return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
    (isIP(host)?isPublicAddress(host):host.includes(".")&&!/\.(local|localhost|internal)$/.test(host));
}, "Use a public HTTPS URL without credentials or a custom port.");
export const ProfileSchema = z.object({
  name: text(160).min(2), branch: text(160).default(""), country: z.enum(["China","Malaysia","Singapore","Thailand"]),
  city: text(120).min(1), address: text(500).min(5), phone: text(80).min(5), website: httpsUrl,
  billingEmail: z.union([z.literal(""), z.string().email().max(160)]).default(""), billingPhone: text(80).default(""),
});
export const SourceSchema = z.object({url: httpsUrl, title: text(200).min(1), retrievedAt: z.string().datetime(), excerpt: text(4000).default("")});
export const TrustSchema = z.object({
  officialChannel: httpsUrl, publicKey: text(2000).min(20), bankName: text(160).min(2),
  rotationSignature: text(1000).optional(),
  signedList: z.object({hospitalId: text(100).min(1), issuedAt: z.string().datetime(), signature: text(1000).min(1),
    payees: z.array(z.object({id: z.string().regex(/^[\w-]{1,100}$/), name: text(160).min(2), account: z.string().trim().regex(/^[A-Za-z0-9 -]{5,80}$/)})).min(1).max(20)}),
});
const ProofSchema = z.object({
  confirmationChannel: text(500).min(5), independentSource: httpsUrl, notes: text(4000).min(20),
  identityChecked: z.literal(true), ownershipChecked: z.literal(true), recovery: z.boolean().default(false),
});

function requireGoogle(session: Session) {
  if (session.user.mode !== "google") throw new ApiError("Use a Google account to submit a hospital for verification.", 403);
}

export function openHospitalDirectory(): HospitalDirectory {
  const dir = process.env.GUARDIAN_ACCOUNTS_DIR ?? join(process.cwd(), ".cache", "accounts");
  mkdirSync(dir, {recursive:true, mode:0o700});
  return new HospitalDirectory(openDb(join(dir,"hospital-directory.db")));
}

export class HospitalDirectory {
  constructor(readonly db: DB) {
    db.exec(`CREATE TABLE IF NOT EXISTS directory_hospitals (
      id TEXT PRIMARY KEY, profile TEXT NOT NULL, profile_status TEXT NOT NULL DEFAULT 'draft',
      payment_status TEXT NOT NULL DEFAULT 'unverified', profile_version INTEGER NOT NULL DEFAULT 0,
      trust_version INTEGER NOT NULL DEFAULT 0, trust TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS directory_reviews (
      id TEXT PRIMARY KEY, hospital_id TEXT NOT NULL REFERENCES directory_hospitals(id), kind TEXT NOT NULL,
      base_version INTEGER NOT NULL, payload TEXT NOT NULL, sources TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, discovery_model TEXT, ai TEXT,
      decision_by TEXT, decision_notes TEXT, proof TEXT);
      CREATE TABLE IF NOT EXISTS directory_verifications (
      id TEXT PRIMARY KEY,hospital_id TEXT NOT NULL,review_id TEXT NOT NULL,hash TEXT NOT NULL,payload TEXT NOT NULL,
      tx TEXT,anchor_error TEXT,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS directory_limits (actor TEXT, operation TEXT, ts INTEGER, PRIMARY KEY(actor,operation));
      CREATE TABLE IF NOT EXISTS directory_discoveries (id TEXT PRIMARY KEY, actor TEXT NOT NULL, model TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL);`);
  }
  close() { this.db.close(); }
  record(actor: string, action: string, hospitalId: string | null, result: unknown) {
    appendAudit(this.db,{caseId:hospitalId,actor,action,inputSources:["admin"],decision:"info",result});
  }
  hospital(id: string): HospitalRecord {
    const r = this.db.prepare("SELECT * FROM directory_hospitals WHERE id=?").get(id) as {id:string;profile:string;profile_status:HospitalRecord["profileStatus"];payment_status:HospitalRecord["paymentStatus"];profile_version:number;trust_version:number;trust:string|null;created_at:string;updated_at:string}|undefined;
    if (!r) throw new ApiError("Hospital not found.",404);
    return {id:r.id,profile:JSON.parse(r.profile),profileStatus:r.profile_status,paymentStatus:r.payment_status,profileVersion:r.profile_version,trustVersion:r.trust_version,trust:r.trust?JSON.parse(r.trust):null,createdAt:r.created_at,updatedAt:r.updated_at};
  }
  hospitals() {return (this.db.prepare("SELECT id FROM directory_hospitals ORDER BY updated_at DESC,rowid DESC").all() as {id:string}[]).map(r=>this.hospital(r.id));}
  published(): PublicHospital[] {return this.hospitals().filter(h=>h.profileVersion>0 || h.profileStatus==="listed").map(h=>({id:h.id,profile:h.profile,profileStatus:h.profileStatus,paymentStatus:h.paymentStatus,profileVersion:h.profileVersion,trustVersion:h.trustVersion,createdAt:h.createdAt,updatedAt:h.updatedAt}));}
  // Operator-only import. Public source evidence never establishes payment authority.
  seedListing(id: string, profile: HospitalProfile, sources: HospitalSource[]): boolean {
    const parsed=ProfileSchema.parse(profile);
    const evidence=z.array(SourceSchema).min(1).max(12).parse(sources);
    return this.db.transaction(()=>{
      const existing=this.db.prepare("SELECT id FROM directory_hospitals WHERE id=? OR (json_extract(profile,'$.name')=? AND json_extract(profile,'$.country')=? AND json_extract(profile,'$.city')=?)").get(id,parsed.name,parsed.country,parsed.city);
      if(existing)return false;
      const now=new Date().toISOString(),reviewId=`HR_${randomUUID()}`;
      this.db.prepare("INSERT INTO directory_hospitals (id,profile,profile_status,created_at,updated_at) VALUES (?,?,'listed',?,?)").run(id,JSON.stringify(parsed),now,now);
      this.db.prepare("INSERT INTO directory_reviews (id,hospital_id,kind,base_version,payload,sources,created_by,created_at,updated_at) VALUES (?,?,'profile',0,?,?,?,?,?)").run(reviewId,id,JSON.stringify(parsed),JSON.stringify(evidence),"system:public-source-seed",now,now);
      this.record("system:public-source-seed","hospital.listed",id,{reviewId,sourceUrls:evidence.map(s=>s.url),paymentAuthority:false});
      return true;
    })();
  }
  review(id: string): HospitalReview {
    const r = this.db.prepare("SELECT * FROM directory_reviews WHERE id=?").get(id) as {id:string;hospital_id:string;kind:HospitalReview["kind"];base_version:number;payload:string;sources:string;status:HospitalReview["status"];created_by:string;created_at:string;updated_at:string;discovery_model:string|null;ai:string|null;decision_by:string|null;decision_notes:string|null;proof:string|null}|undefined;
    if (!r) throw new ApiError("Review not found.",404);
    return {id:r.id,hospitalId:r.hospital_id,kind:r.kind,baseVersion:r.base_version,payload:JSON.parse(r.payload),sources:JSON.parse(r.sources),status:r.status,createdBy:r.created_by,createdAt:r.created_at,updatedAt:r.updated_at,discoveryModel:r.discovery_model,ai:r.ai?JSON.parse(r.ai):null,decisionBy:r.decision_by,decisionNotes:r.decision_notes,proof:r.proof?JSON.parse(r.proof):null};
  }
  reviews() {return (this.db.prepare("SELECT id FROM directory_reviews ORDER BY created_at DESC,rowid DESC").all() as {id:string}[]).map(r=>this.review(r.id));}
  verifications(id?: string): HospitalVerification[] {
    const rows = this.db.prepare(`SELECT id,hospital_id hospitalId,review_id reviewId,hash,payload,tx,anchor_error anchorError,created_at createdAt FROM directory_verifications${id?" WHERE hospital_id=?":""} ORDER BY rowid DESC`);
    return (id?rows.all(id):rows.all()) as HospitalVerification[];
  }
  limit(actor: string, operation: string, seconds = 20) {
    this.db.transaction(()=>{
      const old=this.db.prepare("SELECT ts FROM directory_limits WHERE actor=? AND operation=?").get(actor,operation) as {ts:number}|undefined;
      if(old && Date.now()-old.ts<seconds*1000)throw new ApiError("Please wait a moment before running this check again.",429);
      this.db.prepare("INSERT INTO directory_limits VALUES (?,?,?) ON CONFLICT(actor,operation) DO UPDATE SET ts=excluded.ts").run(actor,operation,Date.now());
    })();
  }
  saveDiscovery(session:Session,result:{model:string}) {
    requireGoogle(session);const id=`HS_${randomUUID()}`;
    this.db.prepare("INSERT INTO directory_discoveries VALUES (?,?,?,?,?)").run(id,session.user.id,result.model,JSON.stringify(result),Date.now());
    return id;
  }
  propose(session: Session, input: unknown, discoveryModel: string | null = null) {
    requireGoogle(session);
    const v = z.object({hospitalId:z.string().optional(),discoveryId:z.string().optional(),kind:z.enum(["profile","payment"]).default("profile"),payload:z.unknown(),sources:z.array(SourceSchema).min(1).max(12)}).parse(input);
    if(v.discoveryId) {
      const found=this.db.prepare("SELECT model FROM directory_discoveries WHERE id=? AND actor=? AND created_at>?").get(v.discoveryId,session.user.id,Date.now()-3600_000) as {model:string}|undefined;
      if(!found)throw new ApiError("This search draft has expired or belongs to another account. Search again or submit manually.",409);
      discoveryModel=found.model;
    }
    if(v.kind==="payment")requireAdmin(session);
    const payload = v.kind==="profile" ? ProfileSchema.parse(v.payload) : TrustSchema.parse(v.payload);
    const at=new Date().toISOString(); const id=`HR_${randomUUID()}`;
    return this.db.transaction(()=>{
      let hospitalId=v.hospitalId;
      if(!hospitalId) {
        if(v.kind!=="profile")throw new ApiError("Create and verify a hospital profile first.",409);
        hospitalId=`HD_${randomUUID()}`;
        this.db.prepare("INSERT INTO directory_hospitals (id,profile,created_at,updated_at) VALUES (?,?,?,?)").run(hospitalId,JSON.stringify(payload),at,at);
      }
      const hospital=this.hospital(hospitalId);
      if(v.kind==="payment" && hospital.profileStatus!=="verified")throw new ApiError("Verify the hospital profile before submitting payment details.",409);
      const base=v.kind==="profile"?hospital.profileVersion:hospital.trustVersion;
      this.db.prepare("INSERT INTO directory_reviews (id,hospital_id,kind,base_version,payload,sources,created_by,created_at,updated_at,discovery_model) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(id,hospitalId,v.kind,base,JSON.stringify(payload),JSON.stringify(v.sources),session.user.email??session.user.id,at,at,discoveryModel);
      this.record(session.user.email??session.user.id,"hospital.proposed",hospitalId,{reviewId:id,kind:v.kind,baseVersion:base});
      return this.review(id);
    })();
  }
  revise(session: Session, id: string, input: unknown) {
    requireGoogle(session);const review=this.review(id);
    if(review.createdBy!==session.user.email && review.createdBy!==session.user.id)requireAdmin(session);
    if(review.status!=="needs_information")throw new ApiError("Only a review awaiting more information can be resubmitted.",409);
    return this.propose(session,{...z.object({payload:z.unknown(),sources:z.array(SourceSchema).min(1).max(12)}).parse(input),hospitalId:review.hospitalId,kind:review.kind},review.discoveryModel);
  }
  saveAI(session: Session, id: string, report: HospitalAIReview) {
    requireAdmin(session);const review=this.review(id);
    if(!["pending","needs_information"].includes(review.status))throw new ApiError("This review already has a decision.",409);
    this.db.prepare("UPDATE directory_reviews SET ai=?,updated_at=? WHERE id=?").run(JSON.stringify(report),new Date().toISOString(),id);
    this.record(session.user.email!,"hospital.ai_checked",review.hospitalId,{reviewId:id,model:report.model,unavailable:!!report.unavailable});
    return this.review(id);
  }
  validateTrust(trust: HospitalTrust, hospitalId: string) {
    if(trust.publicKey===portalPublicKey("H1"))throw new ApiError("The public demo signing key cannot establish authority in the shared hospital directory.",409);
    if(trust.signedList.hospitalId!==hospitalId)throw new ApiError("The signed list is for a different hospital.",409);
    const age=Date.now()-new Date(trust.signedList.issuedAt).getTime();
    if(age < -300_000 || age>7*86400_000)throw new ApiError("Use a signed account list issued within the last seven days.",409);
    if(new Set(trust.signedList.payees.map(p=>p.id)).size!==trust.signedList.payees.length)throw new ApiError("Account identifiers must be unique.",409);
    for(const p of trust.signedList.payees)if(hasInvisible(p.name)||hasConfusable(p.name))throw new ApiError("The account holder name contains ambiguous characters.",409);
    let valid=false;
    try {const key=createPublicKey({key:Buffer.from(trust.publicKey,"base64"),format:"der",type:"spki"});valid=key.asymmetricKeyType==="ed25519" && verify(null,canonicalPayload(trust.signedList),key,Buffer.from(trust.signedList.signature,"base64"));}catch{}
    if(!valid)throw new ApiError("The account list signature does not match the supplied Ed25519 public key.",409);
  }
  decide(session: Session, id: string, input: unknown) {
    requireAdmin(session);
    const v=z.object({decision:z.enum(["approve","reject","request_information"]),notes:text(4000).min(10),proof:z.unknown().optional()}).parse(input);
    return this.db.transaction(()=>{
      const r=this.review(id);const h=this.hospital(r.hospitalId);
      if(r.status!=="pending")throw new ApiError("This review has already been processed. Refresh the queue.",409);
      if(v.decision==="approve") {
        if(verifyChain(this.db)!==null)throw new ApiError("The verification audit chain failed its integrity check. Resolve it before approving new trust.",409);
        if(r.baseVersion!==(r.kind==="profile"?h.profileVersion:h.trustVersion))throw new ApiError("The approved record changed. Submit a fresh review against the current version.",409);
        const proof=ProofSchema.parse(v.proof);
        const previous=[h.profile.phone,h.profile.billingPhone,h.profile.billingEmail,h.profile.website,h.trust?.officialChannel].filter(Boolean) as string[];
        const normalize=(s:string)=>s.toLowerCase().replace(/[\s()+-]/g,"").replace(/\/$/,"");
        const known=previous.some(value=>normalize(value)===normalize(proof.confirmationChannel));
        // The initial draft is untrusted. Later critical changes must use an established channel or explicit recovery.
        if((r.kind==="payment" || h.profileVersion>0) && !known && !proof.recovery)throw new ApiError("Confirm through a previously verified channel, or document identity recovery.",409);
        if(proof.recovery && proof.notes.length<60)throw new ApiError("Describe the independent identity recovery in at least 60 characters.",400);
        const proposedWebsite=r.kind==="profile"?(r.payload as HospitalProfile).website:(r.payload as HospitalTrust).officialChannel;
        if((h.profileVersion===0 || proof.recovery) && new URL(proof.independentSource).hostname===new URL(proposedWebsite).hostname)throw new ApiError("Use an independent institutional source outside the proposed domain for initial verification or recovery.",409);
        if(!r.sources.some(s=>s.url===proof.independentSource))throw new ApiError("Add the independent verification source to the evidence list before approving.",409);
        if(r.kind==="payment") {
          if(h.profileStatus!=="verified")throw new ApiError("The hospital profile must be verified before account activation.",409);
          const next=TrustSchema.parse(r.payload);
          this.validateTrust(next,h.id);
          if(h.trust && h.trust.publicKey!==next.publicKey && !proof.recovery) {
            let rotated=false;
            try {const oldKey=createPublicKey({key:Buffer.from(h.trust.publicKey,"base64"),format:"der",type:"spki"});rotated=verify(null,keyRotationPayload(h.id,next),oldKey,Buffer.from(next.rotationSignature??"","base64"));}catch{}
            if(!rotated)throw new ApiError("A key change requires a rotation statement signed by the previous key, or documented independent identity recovery.",409);
          }
          this.db.prepare("UPDATE directory_hospitals SET trust=?,payment_status='active',trust_version=trust_version+1,updated_at=? WHERE id=?").run(JSON.stringify(r.payload),new Date().toISOString(),h.id);
        } else {
          const next=r.payload as HospitalProfile;
          if(h.profileVersion>0 && ["name","branch","country"].some(key=>next[key as keyof HospitalProfile]!==h.profile[key as keyof HospitalProfile])) {
            this.db.prepare("UPDATE directory_hospitals SET payment_status='suspended',trust_version=trust_version+1 WHERE id=?").run(h.id);
          }
          this.db.prepare("UPDATE directory_hospitals SET profile=?,profile_status='verified',profile_version=profile_version+1,updated_at=? WHERE id=?").run(JSON.stringify(r.payload),new Date().toISOString(),h.id);
        }
        const snapshot={schema:"guardian.hospital-verification.v1",hospitalId:h.id,reviewId:r.id,kind:r.kind,profileVersion:this.hospital(h.id).profileVersion,trustVersion:this.hospital(h.id).trustVersion,payload:r.payload,sources:r.sources,proof,reviewedBy:session.user.email,reviewedAt:new Date().toISOString()};
        const payload=JSON.stringify(snapshot);
        this.db.prepare("INSERT INTO directory_verifications (id,hospital_id,review_id,hash,payload,created_at) VALUES (?,?,?,?,?,?)").run(`HV_${randomUUID()}`,h.id,r.id,sha256(payload),payload,snapshot.reviewedAt);
        this.db.prepare("UPDATE directory_reviews SET proof=? WHERE id=?").run(JSON.stringify(proof),id);
      }
      const status=v.decision==="approve"?"approved":v.decision==="reject"?"rejected":"needs_information";
      this.db.prepare("UPDATE directory_reviews SET status=?,decision_by=?,decision_notes=?,updated_at=? WHERE id=?").run(status,session.user.email,v.notes,new Date().toISOString(),id);
      this.record(session.user.email!,`hospital.${status}`,h.id,{reviewId:id,kind:r.kind,notes:v.notes});
      return this.review(id);
    })();
  }
  suspend(session: Session,id: string,input: unknown) {
    requireAdmin(session);this.hospital(id);
    const v=z.object({target:z.enum(["profile","payment"]),reason:text(2000).min(10),revoke:z.boolean().default(false)}).parse(input);
    this.db.transaction(()=>{
      if(v.target==="profile")this.db.prepare("UPDATE directory_hospitals SET profile_status='suspended',payment_status='suspended',profile_version=profile_version+1,trust_version=trust_version+1,updated_at=? WHERE id=?").run(new Date().toISOString(),id);
      else this.db.prepare("UPDATE directory_hospitals SET payment_status=?,trust_version=trust_version+1,updated_at=? WHERE id=?").run(v.revoke?"revoked":"suspended",new Date().toISOString(),id);
      this.record(session.user.email!,v.revoke?"hospital.payment_revoked":`hospital.${v.target}_suspended`,id,{reason:v.reason});
    })();
    return this.hospital(id);
  }
  async anchor(session: Session,id: string, write=anchorHash) {
    requireAdmin(session);
    const row=this.db.prepare("SELECT hospital_id hospitalId,hash,payload,tx FROM directory_verifications WHERE id=?").get(id) as {hospitalId:string;hash:string;payload:string;tx:string|null}|undefined;
    if(!row)throw new ApiError("Verification record not found.",404);
    if(sha256(row.payload)!==row.hash)throw new ApiError("The verification payload failed its integrity check. Do not anchor this record.",409);
    if(row.tx)return {hash:row.hash,tx:row.tx};
    let tx:string|null;
    try {tx=await write(row.hash,"hospital.verification");if(!tx)throw new Error("not configured");}
    catch {this.db.prepare("UPDATE directory_verifications SET anchor_error=? WHERE id=?").run("Blockchain service unavailable. Verification remains recorded locally.",id);throw new ApiError("Blockchain anchoring is unavailable. The verification record is saved locally.",503);}
    // Do not invent a transaction hash when another process already anchored this digest.
    if(tx==="already-anchored")return {hash:row.hash,tx:null,alreadyAnchored:true};
    this.db.prepare("UPDATE directory_verifications SET tx=?,anchor_error=NULL WHERE id=?").run(tx,id);
    this.record(session.user.email!,"hospital.verification_anchored",row.hospitalId,{verificationId:id,hash:row.hash,tx});
    return {hash:row.hash,tx};
  }
  audit() {
    const rows=this.db.prepare("SELECT * FROM audit_log ORDER BY seq DESC LIMIT 300").all() as AuditRow[];
    return {valid:verifyChain(this.db)===null,rows:rows.map(r=>({seq:r.seq,ts:r.ts,actor:r.actor,action:r.action,hospitalId:r.case_id,hash:r.hash,result:JSON.parse(r.result)}))};
  }
}

export function keyRotationPayload(hospitalId:string,next:HospitalTrust) {
  return Buffer.from(JSON.stringify(["guardian.hospital-key-rotation.v1",hospitalId,next.officialChannel,next.publicKey,next.signedList.issuedAt]));
}

/** Apply the current registry state at read and payment gates, never just at enrollment. */
export function syncDirectoryHospital(db: DB,localId: string) {
  const link=db.prepare("SELECT directory_id FROM hospital_directory_links WHERE hospital_id=?").get(localId) as {directory_id:string}|undefined;
  if(!link)return;
  const directory=openHospitalDirectory();
  try {
    const h=directory.hospital(link.directory_id);
    const active=h.profileStatus==="verified" && h.paymentStatus==="active" && h.trust;
    db.transaction(()=>{
      db.prepare("UPDATE hospitals SET name=?,official_channel=?,public_key=? WHERE id=?").run(h.profile.name,active?h.trust!.officialChannel:"",active?h.trust!.publicKey:"",localId);
      db.prepare("UPDATE payees SET source='revoked' WHERE hospital_id=?").run(localId);
      if(active)for(const p of h.trust!.signedList.payees) {
        const id=`DR_${sha256(`${h.id}:${h.trustVersion}:${p.id}`).slice(0,40)}`;
        db.prepare("INSERT INTO payees (id,hospital_id,account,name_normalized,source,verified_at) VALUES (?,?,?,?,'official_registry',?) ON CONFLICT(id) DO UPDATE SET source='official_registry'").run(id,localId,p.account,normalizeName(p.name),h.updatedAt);
      }
      const stale=db.prepare("SELECT id,case_id FROM payment_requests WHERE status='pending' AND case_id IN (SELECT id FROM cases WHERE hospital_id=?) AND payee_id NOT IN (SELECT id FROM payees WHERE hospital_id=? AND source='official_registry')").all(localId,localId) as {id:string;case_id:string}[];
      for(const r of stale) {
        db.prepare("UPDATE payment_requests SET status='cancelled' WHERE id=?").run(r.id);
        db.prepare("UPDATE approvals SET status='withdrawn',withdrawn_at=? WHERE request_id=? AND status='approved'").run(new Date().toISOString(),r.id);
        appendAudit(db,{caseId:r.case_id,actor:"hospital_registry",action:"request.recipient_invalidated",inputSources:["official_registry"],decision:"deny",result:{requestId:r.id,reason:"Hospital payment authority changed. Create a new request and obtain fresh approvals."}});
      }
    })();
  } finally {directory.close();}
}

export function linkDirectoryHospital(db: DB, localId: string,directoryId: string) {
  const old=db.prepare("SELECT directory_id FROM hospital_directory_links WHERE hospital_id=?").get(localId) as {directory_id:string}|undefined;
  if(old && old.directory_id!==directoryId)throw new ApiError("This case is already linked to a different hospital. Start a new case to change institutions.",409);
  const directory=openHospitalDirectory();
  try {
    const hospital=directory.hospital(directoryId);
    if(!["listed","verified"].includes(hospital.profileStatus))throw new ApiError("Choose a listed or verified hospital profile.",409);
    const currency=({China:"CNY",Malaysia:"MYR",Singapore:"SGD",Thailand:"THB"} as Record<string,string>)[hospital.profile.country];
    const care=db.prepare("SELECT currency FROM cases WHERE hospital_id=? LIMIT 1").get(localId) as {currency:string}|undefined;
    if(care && care.currency!==currency)throw new ApiError("Choose a hospital in the care case’s selected country.",409);
  }finally{directory.close();}
  db.prepare("INSERT INTO hospital_directory_links VALUES (?,?) ON CONFLICT(hospital_id) DO UPDATE SET directory_id=excluded.directory_id").run(localId,directoryId);
  syncDirectoryHospital(db,localId);
}
