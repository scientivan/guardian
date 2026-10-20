import { NextRequest, NextResponse } from "next/server";
import { dispatch } from "@/server/api";

// Compatibility adapter. All operations now pass through the same backend permissions.
export const maxDuration=180;
export async function POST(request:NextRequest,{params}:{params:Promise<{caseId:string}>}) {
  const {caseId}=await params;
  if(request.headers.get("content-type")?.includes("multipart/form-data"))return dispatch(request,["cases",caseId,"documents"]);
  let value:Record<string,unknown>;
  try{value=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
  let path:string[];let method="POST";let body:unknown=value;
  switch(value.action) {
    case "chat":path=["cases",caseId,"chat"];body={message:value.text};break;
    case "invite":path=["cases",caseId,"invitations"];break;
    case "remind":path=["cases",caseId,"follow-up"];break;
    case "pledge":path=["payment-requests",String(value.requestId),"approvals"];break;
    case "withdraw":path=["payment-requests",String(value.requestId),"approvals","me"];method="DELETE";body=undefined;break;
    default:return NextResponse.json({error:"This action is not available."},{status:400});
  }
  const headers=new Headers(request.headers);headers.delete("content-length");
  return dispatch(new NextRequest(request.url,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),path);
}
