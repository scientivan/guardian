import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import type {Session} from "next-auth";
import {ownerDatabase,WorkspaceStore} from "../../src/server/workspace";
import {caseAccess,invite,invitation} from "../../src/server/access";
import {Integration} from "../../src/server/integration";
async function main(){
 const accounts=mkdtempSync(join(tmpdir(),"guardian-live-mail-"));process.env.GUARDIAN_ACCOUNTS_DIR=accounts;
 const runId="guardian-live-"+randomUUID();
 const owner:Session={user:{id:"mail-owner-"+runId,name:"Guardian Verification",email:"verification-owner@example.invalid",mode:"google"},expires:"2099-01-01"};
 const payer:Session={user:{id:"mail-payer-"+runId,name:"Notification Verification",email:process.env.GMAIL_USER!,mode:"google"},expires:"2099-01-01"};
 const db=ownerDatabase(owner.user.id);new WorkspaceStore(db,"demo","Guardian Verification");db.close();
 const c=caseAccess(owner,"C1");
 try{
  const token=invite(c,{name:"Notification Verification",email:process.env.GMAIL_USER!,role:"payer",shareLimit:10000,currency:"CNY"});
  const joined=invitation(payer,token,true,"CNY");
  const api=new Integration(c);
  const request=api.createRequest({payeeId:"P1",amount:10000,purpose:"Synthetic notification verification "+runId,expiresInMinutes:120});
  const result=await api.notifyRequest(request.id!,process.env.NEXTAUTH_URL??"http://localhost:3000");
  const audit=api.view().audit.rows.at(-1);
  const report={runId,at:new Date().toISOString(),scope:"One actual product notification sent to configured Gmail sender (self). Temporary synthetic case and Google session fixtures, not a live OAuth exchange.",invitationAccepted:joined.accepted,requestId:request.id,result,auditAction:audit?.action,recipient:"configured Gmail sender (self)",subjectSearchToken:runId};
  mkdirSync("evidence/live-services-2026-10-20",{recursive:true});writeFileSync("evidence/live-services-2026-10-20/email-send.json",JSON.stringify(report,null,2)+"\n");
  api.cancel(request.id!);console.log(JSON.stringify(report));if(result.sent!==1||result.skipped)process.exitCode=1;
 }finally{c.close();rmSync(accounts,{recursive:true,force:true})}
}
main().catch(()=>{console.error("Live product notification test failed. No credentials printed.");process.exitCode=1});
