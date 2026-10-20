import type { Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin, requireAdmin } from "./admin-access";
import { ApiError } from "./errors";
import { openHospitalDirectory, ProfileSchema, TrustSchema, httpsUrl } from "./hospital-directory";
import { orgName, text, zodRule } from "@/lib/validate";
import { checkHospitalEvidence, discoverHospital, retrieveHospitalSource } from "./hospital-ai";
import { fetchPublicText } from "./public-web";

export async function hospitalDispatch(request:NextRequest,path:string[],session:Session) {
  const admin=path[0]==="admin";
  const get=request.method==="GET";
  if(admin && path[1]==="access" && get)return NextResponse.json({admin:isAdmin(session)},{headers:{"Cache-Control":"no-store"}});
  if(admin)requireAdmin(session);
  const directory=openHospitalDirectory();
  const reply=(data:unknown)=>NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
  const body=async()=>{
    if(Number(request.headers.get("content-length")??0)>120_000)throw new ApiError("The submission is too large.",413);
    const text=await request.text();if(text.length>120_000)throw new ApiError("The submission is too large.",413);
    try{return JSON.parse(text);}catch{throw new ApiError("Enter a valid JSON submission.");}
  };
  try {
    if(admin && path.length===1 && get)return reply({hospitals:directory.hospitals(),reviews:directory.reviews(),verifications:directory.verifications(),audit:directory.audit()});
    if(!admin && path.length===1 && get)return reply({hospitals:directory.published(),proposals:session.user.mode==="google"?directory.reviews().filter(r=>r.createdBy===session.user.email).map(r=>({id:r.id,hospitalId:r.hospitalId,kind:r.kind,status:r.status,payload:r.payload,sources:r.sources,decisionNotes:r.decisionNotes,createdAt:r.createdAt})):[]});
    if(!admin && path[1]==="discover" && request.method==="POST") {
      if(session.user.mode!=="google")throw new ApiError("Sign in with Google to propose a hospital.",403);
      directory.limit(session.user.id,"discover",30);
      const result=await discoverHospital(z.string().trim().min(3).max(300).parse((await body()).query));
      return reply({...result,discoveryId:directory.saveDiscovery(session,result)});
    }
    // Care case wizard: the owner gives name, country and city; AI drafts the rest with sources,
    // and the draft goes to the human review queue. Nothing is selectable until an admin approves it.
    if(!admin && path[1]==="request" && request.method==="POST") {
      if(session.user.mode!=="google")throw new ApiError("Sign in with Google to add a hospital.",403);
      const v=z.object({name:z.string().trim().superRefine(zodRule(orgName())),country:ProfileSchema.shape.country,city:z.string().trim().superRefine(zodRule(text("the city or regency",2,120)))}).parse(await body());
      const norm=(x:string)=>x.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu," ").trim();
      const same=directory.hospitals().find(h=>h.profile.country===v.country&&norm(h.profile.name)===norm(v.name)&&norm(h.profile.city)===norm(v.city));
      if(same) {
        if(["listed","verified"].includes(same.profileStatus))throw new ApiError(`${same.profile.name} is already in the directory. Choose it from the list.`,409);
        const mine=directory.reviews().find(r=>r.hospitalId===same.id&&r.createdBy===session.user.email&&["pending","needs_information"].includes(r.status));
        if(mine)return reply({review:{id:mine.id,hospitalId:mine.hospitalId,status:mine.status},profile:mine.payload,uncertainties:[]});
        throw new ApiError("This hospital is already waiting for review. Check back after the verification team has looked at it.",409);
      }
      directory.limit(session.user.id,"discover",30);
      const result=await discoverHospital(`${v.name}, ${v.city}, ${v.country}`);
      const found=(result.profile && typeof result.profile==="object"?result.profile:{}) as Record<string,unknown>;
      const parsed=ProfileSchema.safeParse({branch:"",billingEmail:"",billingPhone:"",...found,name:typeof found.name==="string"&&found.name.trim()?found.name:v.name,city:typeof found.city==="string"&&found.city.trim()?found.city:v.city,country:v.country});
      if(!parsed.success)throw new ApiError("Our AI couldn’t find enough public details (address, phone and official website) for this hospital. Check the name and city, or suggest it with full details in the Hospital Directory.",422);
      const review=directory.propose(session,{discoveryId:directory.saveDiscovery(session,result),kind:"profile",payload:parsed.data,sources:result.sources});
      return reply({review:{id:review.id,hospitalId:review.hospitalId,status:review.status},profile:parsed.data,uncertainties:result.uncertainties});
    }
    if(!admin && path[1]==="proposals" && request.method==="POST") {
      directory.limit(session.user.id,"propose",2);
      // Discovery metadata is written only by the search operation, never trusted from a user field.
      return reply(directory.propose(session,await body()));
    }
    if(!admin && path[1]==="proposals" && path[2] && path[3]==="resubmit" && request.method==="POST")return reply(directory.revise(session,path[2],await body()));
    if(admin && path[1]==="sources" && request.method==="POST") {directory.limit(session.user.id,"source",2);return reply(await retrieveHospitalSource((await body()).url));}
    if(admin && path[1]==="payment-list" && request.method==="POST") {
      directory.limit(session.user.id,"payment-list",3);
      const channel=httpsUrl.parse((await body()).officialChannel);
      const page=await fetchPublicText(`${channel.replace(/\/$/,"")}/payees`);
      return reply(TrustSchema.shape.signedList.parse(JSON.parse(page.text)));
    }
    if(admin && path[1]==="reviews" && path[2]) {
      if(path[3]==="decision" && request.method==="POST")return reply(directory.decide(session,path[2],await body()));
      if(path[3]==="ai" && request.method==="POST") {
        directory.limit(session.user.id,"review-ai",10);
        const review=directory.review(path[2]);
        return reply(directory.saveAI(session,path[2],await checkHospitalEvidence(review)));
      }
    }
    if(admin && path[1]==="hospitals" && path[2]) {
      if(path[3]==="suspend" && request.method==="POST")return reply(directory.suspend(session,path[2],await body()));
    }
    if(admin && path[1]==="verifications" && path[2] && path[3]==="anchor" && request.method==="POST")return reply(await directory.anchor(session,path[2]));
    throw new ApiError("Hospital endpoint not found.",404);
  } finally{directory.close();}
}
