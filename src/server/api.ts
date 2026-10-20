import { getServerSession, type Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "./auth";
import { ownerDatabase, WorkspaceStore } from "./workspace";
import { caseAccess, ApiError, memberships, invitation, invitationById, invite, receivedInvitations, type CaseAccess } from "./access";
import { email as emailRule, memberName, zodRule } from "@/lib/validate";
import { Integration } from "./integration";
import { recap } from "./recap";
import type { CareCase } from "@/lib/workspace";
import { hospitalDispatch } from "./hospital-api";
import { linkDirectoryHospital } from "./hospital-directory";
import { requireOwner, denyAccess } from "./access";
import { clientIp, LLM_LIMITS, spendsModelQuota, take } from "./rate-limit";

export async function accountWorkspace(session:Session,selectedMember?:string|null) {
  const db=ownerDatabase(session.user.id);
  let cases:CareCase[];
  try {
    const store=new WorkspaceStore(db,session.user.mode,session.user.name??"You");
    cases=store.list().cases.map(c=>store.view(c.case.id,session.user.mode==="demo" ? selectedMember??undefined:undefined));
  } finally{db.close();}
  if(session.user.mode==="google") for(const link of memberships(session.user.id)) {
    if(cases.some(c=>c.case.id===link.case_id))continue;
    const c=caseAccess(session,link.case_id);
    try{cases.push(c.store.view(link.case_id,c.member.id));}finally{c.close();}
  }
  return {mode:session.user.mode,cases};
}

function resourceCase(session:Session,table:"documents"|"payment_requests",id:string):string {
  const db=ownerDatabase(session.user.id);
  try {
    new WorkspaceStore(db,session.user.mode,session.user.name??"You");
    const row=db.prepare(`SELECT case_id FROM ${table} WHERE id=?`).get(id) as {case_id:string}|undefined;
    if(row)return row.case_id;
  } finally{db.close();}
  if(session.user.mode==="google") for(const link of memberships(session.user.id)) {
    const shared=ownerDatabase(link.owner_id);
    try{if(shared.prepare(`SELECT 1 FROM ${table} WHERE id=? AND case_id=?`).get(id,link.case_id))return link.case_id;}finally{shared.close();}
  }
  throw new ApiError("Resource not found in your account.",404);
}

export async function dispatch(request:NextRequest,path:string[]) {
  try {
    const session=await getServerSession(authOptions);
    if(!session?.user.id)throw new ApiError("Sign in to continue.",401);
    const mutate=request.method!=="GET";
    if(mutate && request.headers.get("origin")!==new URL(request.url).origin)throw new ApiError("Invalid request origin.",403);
    if(spendsModelQuota(request.method,path)) {
      const wait=take([{key:`account:${session.user.id}`,windows:LLM_LIMITS.account},{key:`ip:${clientIp(request.headers)}`,windows:LLM_LIMITS.ip}]);
      if(wait)return NextResponse.json({error:`Too many AI requests in a short time. Try again in ${wait} seconds.`,code:"RATE_LIMITED",retryAfter:wait},{status:429,headers:{"Retry-After":String(wait)}});
    }
    if(path[0]==="admin" || path[0]==="hospitals")return await hospitalDispatch(request,path,session);
    const selected=request.headers.get("x-member-id");
    const body=async()=>request.json();
    const scope:{current?:CaseAccess}={};
    const reply=(value:unknown)=>{
      const head=mutate&&scope.current?scope.current.db.prepare("SELECT MAX(seq) seq FROM audit_log WHERE case_id=?").get(scope.current.caseId) as {seq:number|null}:undefined;
      return NextResponse.json(value&&typeof value==="object"&&!Array.isArray(value)&&head?{...value,auditSeq:head.seq}:value,{headers:{"Cache-Control":"no-store"}});
    };

    if(path[0]==="invitations" && path.length===1 && request.method==="GET")return reply({invitations:receivedInvitations(session)});
    if(path[0]==="invitations" && path[1]==="id" && path[2]) {
      const v=request.method==="POST"?z.object({action:z.enum(["accept","decline"]),currency:z.string().max(5).optional()}).parse(await body()):{action:"view" as const,currency:undefined};
      return reply(invitationById(session,path[2],v.action,v.currency));
    }
    if(path[0]==="invitations" && path[1])return reply(invitation(session,path[1],request.method==="POST",request.method==="POST"?z.object({currency:z.string().max(5).optional()}).parse(await request.json().catch(()=>({}))).currency:undefined));
    if(path[0]==="cases" && path.length===1 && request.method==="GET")return reply(await accountWorkspace(session,selected));
    if(path[0]==="cases" && path.length===1 && request.method==="POST") {
      const db=ownerDatabase(session.user.id);
      try {const input=await body();if(session.user.mode==="google"&&!input?.hospitalDirectoryId)throw new ApiError("Choose a hospital from the directory, or add it and wait for its review.");const store=new WorkspaceStore(db,session.user.mode,session.user.name??"You");const created=store.create(input);return reply(store.view(created.case.id));}finally{db.close();}
    }
    let caseId:string;
    if(path[0]==="cases" && path[1])caseId=path[1];
    else if(path[0]==="documents" && path[1])caseId=resourceCase(session,"documents",path[1]);
    else if(path[0]==="payment-requests" && path[1])caseId=resourceCase(session,"payment_requests",path[1]);
    else if(path[0]==="demo"&&path[1]==="clock") {if(session.user.mode!=="demo")throw new ApiError("This operation requires a demo account.",403);caseId="C1";}
    else throw new ApiError("Endpoint not found.",404);
    const c=caseAccess(session,caseId,selected);
    scope.current=c;
    try {
      const api=new Integration(c);
      if(mutate&&path[2]!=="chat"&&api.closed())throw new ApiError("This care case is closed. Everyone can still read it, but nothing can be changed.",409);
      if(sectionIsHospital(path) && request.method==="POST") {
        requireOwner(c);
        if(session.user.mode!=="google")throw new ApiError("Hospital directory linking requires a Google account.",403);
        const value=z.object({directoryId:z.string().min(1)}).parse(await body());
        linkDirectoryHospital(c.db,c.store.get(c.caseId).case.hospital.id,value.directoryId);
        return reply(api.view());
      }
      if(path[0]==="demo"&&path[1]==="clock"&&request.method==="POST")return reply(api.advance((await body()).advanceDays));
      if(path[0]==="documents" && request.method==="GET") {
        api.document(path[1]);
        if(path[2]==="file") {
          if(c.member.role==="payer")denyAccess(c,"Your role can read the bill summary, not the original document.");
          const file=c.db.prepare("SELECT filename,mime,bytes FROM web_uploads WHERE document_id=?").get(path[1]) as {filename:string;mime:string;bytes:Buffer}|undefined;
          if(!file)throw new ApiError("The original file is not available for this seeded document.",404);
          return new NextResponse(new Uint8Array(file.bytes),{headers:{"Content-Type":file.mime,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,"Cache-Control":"no-store"}});
        }
        return reply(api.document(path[1]));
      }
      if(path[0]==="payment-requests") {
        const id=path[1];api.request(id);
        if(path[2]==="fx-quote" && request.method==="POST")return reply(api.quote(id,(await body()).amount));
        if(path[2]==="approvals" && request.method==="POST")return reply(api.approve(id,await body()));
        if(path[2]==="approvals" && path[3]==="me" && request.method==="DELETE")return reply(api.withdraw(id));
        if(path[2]==="execute" && request.method==="POST")return reply(await api.execute(id));
        if(path[2]==="cancel" && request.method==="POST")return reply(api.cancel(id));
        if(path[2]==="invoices" && !path[3] && request.method==="POST") {
          const form=await request.formData();const file=form.get("file");
          if(!(file instanceof File))throw new ApiError("Choose a photo or PDF.");
          return reply(await api.addInvoice(id,file));
        }
        if(path[2]==="invoices" && path[3] && request.method==="GET") {
          const f=api.invoiceFile(id,path[3]);
          return new NextResponse(new Uint8Array(f.bytes),{headers:{"Content-Type":f.mime,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(f.filename)}`,"Cache-Control":"no-store"}});
        }
      }
      const section=path[2];
      if(path[0]==="cases" && !section && request.method==="GET")return reply(api.view());
      if(section==="documents" && request.method==="POST") {
        const form=await request.formData();const file=form.get("file");
        if(!(file instanceof File))throw new ApiError("Choose a photo or PDF.");
        return reply(await api.upload(file,z.enum(["estimate","interim","final"]).parse(form.get("type")),typeof form.get("replacementDocumentId")==="string"?String(form.get("replacementDocumentId")):undefined));
      }
      if(section==="explanation") {
        const doc=request.nextUrl.searchParams.get("documentId")??api.view().documents.filter(d=>d.type!=="estimate"&&d.status==="parsed").at(-1)?.id;
        if(!doc)throw new ApiError("Upload an estimate and a bill first.",409);
        return reply(await api.explanation(doc,request.method==="POST"));
      }
      if(section==="close" && request.method==="POST")return reply(api.closeCase());
      if(section==="members" && path[3] && request.method==="POST")return reply(api.setShareLimit(path[3],await body()));
      if(section==="second-check" && request.method==="POST"){const b=z.object({documentId:z.string(),itemIds:z.array(z.string())}).parse(await body());return reply(await api.questionItems(b.documentId,b.itemIds));}
      if(section==="payment-requests" && request.method==="GET")return reply(api.view().requests);
      if(section==="payment-requests" && request.method==="POST") {
        const created=api.createRequest(await body()) as {id:string};
        return reply({...created,notified:await api.notifyRequest(created.id,process.env.NEXTAUTH_URL??request.nextUrl.origin)});
      }
      if(section==="payees" && path[3]==="verify" && request.method==="POST")return reply(await api.verifyPayees());
      if(section==="chat" && request.method==="POST"){const b=await body();return reply(await api.chat(b.message,b.context));}
      if(section==="chat" && request.method==="GET")return reply(api.messages());
      if(section==="invitations" && request.method==="POST") {
        const v=z.object({name:z.string().trim().superRefine(zodRule(memberName())),email:z.string().trim().superRefine(zodRule(emailRule())).optional(),delivery:z.enum(["email","link"]).default("email"),role:z.enum(["payer","companion"]),currency:z.enum(["IDR","MYR","SGD","AED","USD","CNY"]).optional(),limitCurrency:z.enum(["IDR","MYR","SGD","AED","USD","CNY","THB"]).optional(),shareLimit:z.number().int().nonnegative().max(100_000_000_00).default(0)}).parse(await body());
        return reply({link:`${request.nextUrl.origin}/join/${invite(c,v)}`});
      }
      if(section==="refunds" && request.method==="GET")return reply(api.view().refunds);
      if(section==="refunds" && path[3]==="reconcile" && request.method==="POST")return reply(api.reconcile(z.string().parse((await body()).documentId)));
      if(section==="refunds" && path[3]==="status" && request.method==="POST") {const v=z.object({memberId:z.string(),status:z.enum(["requested","processing","received"])}).parse(await body());return reply(api.setRefund(v.memberId,v.status));}
      if(section==="follow-up" && request.method==="POST")return reply(api.remind((await body()).memberId));
      if(section==="clock" && request.method==="POST")return reply(api.advance((await body()).advanceDays));
      if(section==="recap" && request.method==="GET") {
        const memberId=request.nextUrl.searchParams.get("memberId")??c.member.id;
        if(c.member.role!=="owner" && memberId!==c.member.id)denyAccess(c,"You can only read your own payment record.");
        const data=recap(c.db,c.caseId,memberId);if(!data)throw new ApiError("Member not found.",404);return reply({...data,demo:session.user.mode==="demo"});
      }
      if(section==="audit" && request.method==="GET")return reply(api.view().audit);
      if(section==="audit" && path[3]==="anchor" && request.method==="POST")return reply(await api.anchor());
      throw new ApiError("Endpoint not found.",404);
    } finally{c.close();}
  } catch(e) {
    if(e instanceof ApiError)return NextResponse.json({error:e.message,code:"ACTION_REJECTED",check:e.check},{status:e.status});
    if(e instanceof z.ZodError)return NextResponse.json({error:e.issues.find(i=>i.code==="custom")?.message??"Check the submitted fields and try again.",code:"INVALID_INPUT"},{status:400});
    return NextResponse.json({error:"The service is temporarily unavailable. Refresh the case before trying again.",code:"SERVICE_UNAVAILABLE"},{status:503});
  }
}

function sectionIsHospital(path:string[]) {return path[0]==="cases" && path[2]==="hospital" && path.length===3;}
