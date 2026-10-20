import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import type { CareCase } from "@/lib/workspace";
import { type CaseAccess, ApiError, requireOwner, denyAccess } from "./access";
import { now, advanceClock } from "./clock";
import { ingestDocument } from "./documents";
import { analyse, loadItems } from "./analysis";
import { explain } from "./explain";
import { secondCheck } from "./secondcheck";
import { handleMessage } from "./agent";
import { AskContext, answerAbout } from "./case-answers";
import { paymentPlan } from "@/lib/payment-plan";
import { toCaseCurrency } from "@/lib/fx-rates";
import { createQuote, formatRate } from "./fx";
import { recordApproval, withdrawApproval, resolvePayee } from "./gateway";
import { createPaymentRequest, cancelRequest, executeRequest, type Charger } from "./payments";
import { openRefunds, setRefundStatus, type RefundStatus } from "./refunds";
import { anchorHash } from "./anchor";
import { appendAudit } from "./audit";
import { enrollFromSignedList, resolvePayeeAnomalies } from "./enrollment";
import { fetchSignedPayeeList, type SignedPayeeList } from "./portal";
import { PORTAL_PAYEES } from "./seed";
import { stripeCharger } from "./stripe";
import { scrub } from "./pii";
import { syncDirectoryHospital } from "./hospital-directory";

function gate<T extends {ok:boolean;reason?:string;check?:number}>(value:T):T {
  if(!value.ok) throw new ApiError(value.reason ?? "This action could not be completed.",409,value.check);
  return value;
}
const amountSchema=z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export class Integration {
  constructor(readonly c:CaseAccess, readonly dependencies: {fetchImpl?:typeof fetch;charger?:Charger}={}) {
    c.db.exec("CREATE TABLE IF NOT EXISTS web_explanations (document_id TEXT PRIMARY KEY,payload TEXT); CREATE TABLE IF NOT EXISTS web_messages (id TEXT PRIMARY KEY,case_id TEXT,member_id TEXT,question TEXT,reply TEXT,actions TEXT,ts TEXT); CREATE TABLE IF NOT EXISTS web_uploads (document_id TEXT PRIMARY KEY,filename TEXT,mime TEXT,bytes BLOB); CREATE TABLE IF NOT EXISTS web_replacements(old_id TEXT PRIMARY KEY,new_id TEXT)");
  }
  view() { return this.c.store.view(this.c.caseId,this.c.member.id); }
  request(id:string) {
    const row=this.c.db.prepare("SELECT case_id FROM payment_requests WHERE id=?").get(id) as {case_id:string}|undefined;
    if(row?.case_id!==this.c.caseId) throw new ApiError("Payment request not found.",404);
    return this.view().requests.find(r=>r.id===id)!;
  }
  document(id:string) {
    if(!this.c.db.prepare("SELECT id FROM documents WHERE id=? AND case_id=?").get(id,this.c.caseId))throw new ApiError("Document not found.",404);
    return { ...this.view().documents.find(d=>d.id===id),currency:this.view().case.currency,items:this.c.member.role==="payer" ? [] : loadItems(this.c.db,id).map(i=>({...i,id:i.code,flags:[]})) };
  }
  async explanation(documentId:string,force=false) {
    this.document(documentId);
    const cached=this.c.db.prepare("SELECT payload FROM web_explanations WHERE document_id=?").get(documentId) as {payload:string}|undefined;
    if(cached && !force) return this.presentExplanation(JSON.parse(cached.payload));
    const analysis=analyse(this.c.db,this.c.caseId,documentId,this.c.session.user.mode==="google"?[]:undefined);
    if("error" in analysis)throw new ApiError(analysis.error,409);
    const reading=await secondCheck(this.c.db,analysis,[],{...this.dependencies,waitForCooldownMs:0,totalTimeoutMs:15_000});
    const result=await explain(analysis,"en",{...this.dependencies,totalTimeoutMs:20_000});
    const explanation:NonNullable<CareCase["explanation"]>={...result,documentId,demo:this.c.session.user.mode==="demo",secondModelChecked:reading.checked,questions:[...result.questions,...reading.disagreements],referenceNote:this.c.session.user.mode==="google"?"No external reference-price table is configured for this hospital.":"Reference prices are indicative, not regulated prices."};
    this.c.db.prepare("INSERT INTO web_explanations VALUES (?,?) ON CONFLICT(document_id) DO UPDATE SET payload=excluded.payload").run(documentId,JSON.stringify(explanation));
    const data=this.c.store.get(this.c.caseId);
    data.explanation=explanation;
    data.items=Object.fromEntries(analysis.items.map(i=>[i.code,{...i,id:i.code,flags:analysis.questions.filter(q=>q.itemIds.includes(i.code)).map(q=>q.kind)}]));
    data.secondCheckStatus=reading.skipped??`${reading.checked.length} items independently checked`;
    this.c.store.save(data);
    appendAudit(this.c.db,{caseId:this.c.caseId,actor:this.c.member.id,action:"bill.explain",inputSources:["hospital_doc","system"],decision:"allow",result:{documentId,lines:explanation.lines.length,secondModelChecked:reading.checked}});
    return this.presentExplanation(explanation);
  }
  /**
   * PRD F6 / ARCHITECTURE §3.5: a family member questions bill items, and a second model from a
   * different provider re-reads just those. A disagreement becomes a question for the hospital.
   */
  async questionItems(documentId:string,itemIds:unknown) {
    if(this.c.member.role==="payer")denyAccess(this.c,"Only the owner or companion can ask for a second check.");
    const ids=z.array(z.string().max(20)).min(1).max(10).parse(itemIds);
    this.document(documentId);
    const analysis=analyse(this.c.db,this.c.caseId,documentId,this.c.session.user.mode==="google"?[]:undefined);
    if("error" in analysis)throw new ApiError(analysis.error,409);
    const known=new Set(analysis.items.map(i=>i.code));
    const asked=ids.filter(id=>known.has(id));
    if(!asked.length)throw new ApiError("Those lines are not on this bill.",404);
    const reading=await secondCheck(this.c.db,analysis,asked,{...this.dependencies,waitForCooldownMs:0,totalTimeoutMs:20_000});
    const data=this.c.store.get(this.c.caseId);
    if(data.explanation?.documentId===documentId) {
      const have=new Set(data.explanation.questions.map(q=>q.text));
      data.explanation={...data.explanation,secondModelChecked:[...new Set([...data.explanation.secondModelChecked,...reading.checked])],questions:[...data.explanation.questions,...reading.disagreements.filter(q=>!have.has(q.text))]};
      this.c.db.prepare("INSERT INTO web_explanations VALUES (?,?) ON CONFLICT(document_id) DO UPDATE SET payload=excluded.payload").run(documentId,JSON.stringify(data.explanation));
    }
    data.secondCheckStatus=reading.skipped??`${reading.checked.length} items independently checked`;
    this.c.store.save(data);
    appendAudit(this.c.db,{caseId:this.c.caseId,actor:this.c.member.id,action:"document.second_check",inputSources:["user","hospital_doc"],decision:"info",result:{documentId,questioned:asked,checked:reading.checked,disagreements:reading.disagreements.length,skipped:reading.skipped??null}});
    return {checked:reading.checked,disagreements:reading.disagreements,unavailable:Boolean(reading.skipped)&&!reading.checked.length,reason:reading.skipped??null};
  }
  private presentExplanation(explanation:NonNullable<CareCase["explanation"]>) {
    return this.c.member.role==="payer" ? {...explanation,lines:explanation.lines.filter(l=>l.type==="arithmetic_fact"),questions:[]}:explanation;
  }
  async upload(file:File,type:"estimate"|"interim"|"final",replacementId?:string) {
    if(this.c.member.role==="payer")denyAccess(this.c,"Only the owner or companion can upload documents.");
    if(file.size===0 || file.size>10*1024*1024)throw new ApiError("Choose a photo or PDF up to 10 MB.");
    if(!["application/pdf","image/png","image/jpeg"].includes(file.type))throw new ApiError("Choose a PDF, PNG or JPEG document.");
    if(replacementId){const old=this.document(replacementId);if(old.status!=="needs_reupload")throw new ApiError("Only an unreadable document can be replaced.",409);}
    const bytes=new Uint8Array(await file.arrayBuffer());
    const result=await ingestDocument(this.c.db,{caseId:this.c.caseId,actor:this.c.member.id,type,data:bytes,mime:file.type,anchor:true,interactive:true},now(this.c.db));
    this.c.db.prepare("INSERT INTO web_uploads VALUES (?,?,?,?)").run(result.documentId,file.name,file.type,Buffer.from(bytes));
    if(replacementId && result.status==="parsed")this.c.db.prepare("INSERT INTO web_replacements VALUES (?,?) ON CONFLICT(old_id) DO UPDATE SET new_id=excluded.new_id").run(replacementId,result.documentId);
    const data=this.c.store.get(this.c.caseId);
    data.documents.push({id:result.documentId,type,title:file.name,by:this.c.member.displayName,ts:now(this.c.db).toISOString(),status:result.status,items:0,total:null,sha256:result.sha256,anchoredTx:result.anchoredTx,reason:result.reason});
    this.c.store.save(data);
    // Recompute a bill even when the estimate was uploaded after the bill.
    const selected=type==="estimate"?this.view().documents.filter(d=>d.type!=="estimate"&&d.status==="parsed").at(-1)?.id:result.documentId;
    if(result.status==="parsed" && selected) {
      try {await this.explanation(selected,true);}catch(e){if(!(e instanceof ApiError && e.status===409))throw e;}
    }
    return {...result,demo:this.c.session.user.mode==="demo"};
  }
  createRequest(input:unknown) {
    requireOwner(this.c);
    const v=z.object({payeeId:z.string().min(1),amount:amountSchema,purpose:z.string().trim().min(1).max(200),expiresInMinutes:z.number().int().min(5).max(10080).default(120),documentId:z.string().optional()}).parse(input);
    if(v.documentId) {
      // Amounts tied to a document must match what the documents say (src/lib/payment-plan.ts):
      // a deposit is the estimate's lower or upper end; a bill payment is at most the latest bill's
      // balance after every live request. The payee still comes only from the registry (A8).
      this.document(v.documentId);
      const plan=paymentPlan(this.view());
      if(plan.deposit?.documentId===v.documentId) {
        if(plan.deposit.requestedId)throw new ApiError("A deposit from this estimate was already requested. Open that request instead of making another one.",409,4);
        if(![plan.deposit.low,plan.deposit.high].includes(v.amount))throw new ApiError("A deposit from the estimate is its lower or upper end.",409,4);
      } else if(plan.bill?.documentId===v.documentId) {
        if(plan.bill.openId)throw new ApiError("A request for this bill is still open. Finish or cancel it before asking again.",409,4);
        if(plan.bill.balance<=0)throw new ApiError("Deposits already cover this bill. Any difference comes back as a refund.",409,4);
        if(v.amount>plan.bill.balance)throw new ApiError(`This bill has ${(plan.bill.balance/100).toLocaleString("en",{minimumFractionDigits:2})} left to pay. Ask for that amount or less.`,409,4);
      } else throw new ApiError(plan.superseded.some(b=>b.documentId===v.documentId)?"A newer bill replaces this one. Pay from the latest bill.":"Choose the estimate or the latest bill that has been read.",409);
    }
    gate(resolvePayee(this.c.db,this.c.caseId,this.c.member.id,{payeeId:v.payeeId,source:"official_registry"}));
    return gate(createPaymentRequest(this.c.db,{...v,caseId:this.c.caseId,actor:this.c.member.id},now(this.c.db)));
  }
  quote(requestId:string,amount:unknown) {
    this.request(requestId);
    if(this.c.member.role==="companion")denyAccess(this.c,"Companions cannot approve payments.");
    const q=createQuote(this.c.db,requestId,this.c.member.id,amountSchema.parse(amount),now(this.c.db));
    appendAudit(this.c.db,{caseId:this.c.caseId,actor:this.c.member.id,action:"fx.quote",inputSources:["system"],decision:"allow",result:{quoteId:q.id,requestId,amount:q.amount,payAmount:q.payAmount,fee:q.fee,expiresAt:q.expiresAt}});
    return {...q,quoteId:q.id,fxRate:formatRate(q.rateE4),expiresInMinutes:15};
  }
  approve(requestId:string,input:unknown) {
    this.request(requestId);
    const v=z.object({amount:amountSchema,quoteId:z.string().min(1)}).parse(input);
    const result=this.c.db.transaction(()=>recordApproval(this.c.db,requestId,this.c.member.id,v.amount,v.quoteId,now(this.c.db)))();
    return {...gate(result),...this.request(requestId)};
  }
  withdraw(requestId:string) {this.request(requestId);return gate(withdrawApproval(this.c.db,requestId,this.c.member.id,now(this.c.db)));}
  cancel(requestId:string) {requireOwner(this.c);this.request(requestId);return gate(cancelRequest(this.c.db,requestId,this.c.member.id,now(this.c.db)));}
  async execute(requestId:string) {
    requireOwner(this.c);this.request(requestId);
    const sandbox:Charger=async input=>({ok:true,ref:`sandbox_${createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0,24)}`});
    const charge=this.dependencies.charger ?? (this.c.session.user.mode==="demo"?sandbox:stripeCharger());
    const result=await executeRequest(this.c.db,requestId,this.c.member.id,charge,now(this.c.db));
    if(!result.ok && !result.status)gate(result);
    return result;
  }
  async verifyPayees() {
    requireOwner(this.c);
    const data=this.c.store.get(this.c.caseId);
    let list:SignedPayeeList;
    const linked=this.c.db.prepare("SELECT directory_id FROM hospital_directory_links WHERE hospital_id=?").get(data.case.hospital.id);
    if(linked) {
      syncDirectoryHospital(this.c.db,data.case.hospital.id);
      const payees=this.view().case.payees;
      if(!payees.length)throw new ApiError("The hospital profile or payment authority is not active. Ask the verification team to review it.",409,1);
      // The directory's reviewed account list is the official channel for linked hospitals.
      const resolvedAnomalies=resolvePayeeAnomalies(this.c.db,this.c.caseId);
      appendAudit(this.c.db,{caseId:this.c.caseId,actor:this.c.member.id,action:"payee.enroll",inputSources:["official_registry"],decision:"allow",result:{enrolled:payees.map(p=>p.id),source:"hospital_directory",resolvedAnomalies}});
      return {ok:true,enrolled:payees.map(p=>p.id),resolvedAnomalies};
    }
    if(this.c.session.user.mode==="demo" && data.case.hospital.id==="H1") list=fetchSignedPayeeList("H1",PORTAL_PAYEES,now(this.c.db).toISOString());
    else {
      const hospital=this.c.db.prepare("SELECT official_channel,public_key FROM hospitals WHERE id=?").get(data.case.hospital.id) as {official_channel:string;public_key:string};
      if(!hospital.public_key || !hospital.official_channel.startsWith("https://"))throw new ApiError("The hospital’s official billing channel and verification key have not been enrolled yet.",409,1);
      // The channel is pinned server-side, never supplied by an invoice or request body.
      const response=await fetch(`${hospital.official_channel.replace(/\/$/,"")}/payees`,{signal:AbortSignal.timeout(8000),redirect:"error"});
      if(!response.ok)throw new ApiError("The hospital’s official billing channel is unavailable.",503);
      list=z.object({hospitalId:z.string(),issuedAt:z.string().datetime(),signature:z.string(),payees:z.array(z.object({id:z.string(),name:z.string(),account:z.string()})).max(50)}).parse(await response.json());
    }
    const result=enrollFromSignedList(this.c.db,this.c.caseId,this.c.member.id,list,now(this.c.db));
    if(!result.ok)throw new ApiError(result.reason,409,1);
    return result;
  }
  async chat(text:unknown,context?:unknown) {
    const message=z.string().trim().min(1).max(2000).parse(text);
    if(context!==undefined) {
      // An "Ask" button about one thing on screen: answered by code from the case's facts.
      const about=AskContext.parse(context);
      const result=answerAbout(this.view(),about);
      const seq=appendAudit(this.c.db,{caseId:this.c.caseId,actor:this.c.member.id,action:"chat",inputSources:["user","system"],decision:"info",result:{context:about.kind,actions:result.actions.map(a=>a.type)}},now(this.c.db)).seq;
      this.c.db.prepare("INSERT INTO web_messages VALUES (?,?,?,?,?,?,?)").run(randomUUID(),this.c.caseId,this.c.member.id,scrub(message).text,result.reply,JSON.stringify(result.actions),now(this.c.db).toISOString());
      return {...result,auditSeq:seq,model:null};
    }
    const result=await handleMessage(this.c.db,this.c.caseId,this.c.member.id,message,this.dependencies,now(this.c.db));
    this.c.db.prepare("INSERT INTO web_messages VALUES (?,?,?,?,?,?,?)").run(randomUUID(),this.c.caseId,this.c.member.id,scrub(message).text,result.reply,JSON.stringify(result.actions),now(this.c.db).toISOString());
    return result;
  }
  messages() {return this.c.db.prepare("SELECT question,reply,actions,ts FROM web_messages WHERE case_id=? AND member_id=? ORDER BY rowid").all(this.c.caseId,this.c.member.id);}
  /** PRD §2: the owner sets each helper's share limit; given in the owner's currency, stored in the hospital's. */
  setShareLimit(memberId:string,input:unknown) {
    requireOwner(this.c);
    const v=z.object({shareLimit:z.number().int().nonnegative().max(100_000_000_00),limitCurrency:z.string().max(5).optional()}).parse(input);
    const m=this.c.db.prepare("SELECT role FROM members WHERE id=? AND case_id=?").get(memberId,this.c.caseId) as {role:string}|undefined;
    if(!m)throw new ApiError("Member not found.",404);
    if(m.role!=="payer")throw new ApiError("Only helpers have a share limit.",409);
    const caseCurrency=this.view().case.currency;
    const limit=toCaseCurrency(v.shareLimit,v.limitCurrency??caseCurrency,caseCurrency);
    if(limit===null)throw new ApiError(`There is no reference rate from ${v.limitCurrency} to ${caseCurrency}.`,409);
    this.c.db.prepare("UPDATE members SET share_limit=? WHERE id=? AND case_id=?").run(limit,memberId,this.c.caseId);
    appendAudit(this.c.db,{caseId:this.c.caseId,actor:this.c.member.id,action:"member.limit",inputSources:["user"],decision:"allow",result:{memberId,shareLimit:limit}});
    return {ok:true,shareLimit:limit};
  }
  reconcile(documentId:string) {requireOwner(this.c);this.document(documentId);const r=openRefunds(this.c.db,this.c.caseId,documentId,now(this.c.db));if(!r.ok)throw new ApiError(r.reason,409);return r;}
  setRefund(memberId:string,status:RefundStatus) {requireOwner(this.c);if(this.c.session.user.mode!=="demo")throw new ApiError("Only an authenticated hospital integration can update refund settlement.",403);return gate(setRefundStatus(this.c.db,this.c.caseId,memberId,status,now(this.c.db)));}
  remind(memberId?:string) {
    if(this.c.member.role!=="owner" && memberId && memberId!==this.c.member.id)throw new ApiError("You can only request follow-up for your own share.",403,3);
    const target=memberId??this.c.member.id;
    this.c.db.prepare("UPDATE refunds SET reminded_at=? WHERE case_id=? AND member_id=?").run(now(this.c.db).toISOString(),this.c.caseId,target);
    appendAudit(this.c.db,{caseId:this.c.caseId,actor:this.c.member.id,action:"followup.request",inputSources:["user"],decision:"allow",result:{memberId:target}});
    return {ok:true,message:"Follow-up recorded in the case activity."};
  }
  advance(days:number) {requireOwner(this.c);if(this.c.session.user.mode!=="demo")throw new ApiError("The clock can only be advanced in a demo account.",403);return {now:advanceClock(this.c.db,z.number().int().min(1).max(365).parse(days)*86400_000).toISOString()};}
  async anchor() {
    requireOwner(this.c);
    const hash=this.view().audit.rows.at(-1)?.hash;
    if(!hash)throw new ApiError("No case activity is available to anchor.",409);
    let tx:string|null;
    try{tx=await anchorHash(hash,`audit:${this.c.caseId}`);}catch{throw new ApiError("The local audit chain is intact, but the blockchain service is unavailable. Try again later.",503);}
    if(!tx)throw new ApiError("Blockchain anchoring is not configured. The local audit chain remains available.",503);
    if(tx!=="already-anchored")this.c.db.prepare("INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(`audit_anchor:${this.c.caseId}`,JSON.stringify({hash,tx}));
    return {hash,tx};
  }
}
