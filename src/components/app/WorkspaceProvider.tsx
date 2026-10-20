"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import type { CareCase, NewCareCase, Workspace } from "@/lib/workspace";
import { explainError, readResponse, request, Spinner } from "./Feedback";
import { PRIMARY } from "./ui";

type WorkspaceValue = Workspace & {
  refresh: () => Promise<void>;
  createCase: (input: NewCareCase) => Promise<CareCase>;
  act: (id: string, body: object | FormData) => Promise<unknown>;
  call: (path:string,method?:string,body?:object|FormData,caseId?:string) => Promise<unknown>;
  selectMember:(caseId:string,memberId:string)=>Promise<void>;
};
const Context = createContext<WorkspaceValue | null>(null);

const result = (response: Response) => readResponse<never>(response);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [selectedMembers,setSelectedMembers]=useState<Record<string,string>>({});
  const refresh = useCallback(async () => {
    setError(null);
    try {
      const loaded:Workspace=await result(await request("/api/workspace", { cache: "no-store" }));
      if(loaded.mode==="demo")for(const [id,member] of Object.entries(selectedMembers)) {
        if(loaded.cases.some(c=>c.case.id===id)) {
          const view=await result(await request(`/api/cases/${encodeURIComponent(id)}`,{cache:"no-store",headers:{"x-member-id":member}}));
          loaded.cases=loaded.cases.map(c=>c.case.id===id?view:c);
        }
      }
      setWorkspace(loaded);
    }
    catch (e) { setError(e); }
  }, [selectedMembers]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(()=>{
    const focus=()=>{void refresh();};
    const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},10000);
    window.addEventListener("focus",focus);
    return()=>{clearInterval(timer);window.removeEventListener("focus",focus);};
  },[refresh]);

  async function createCase(input: NewCareCase) {
    const item: CareCase = await result(await request("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
    setWorkspace(w => w && { ...w, cases: [item, ...w.cases] });
    return item;
  }
  async function act(id: string, body: object | FormData) {
    if(body instanceof FormData)return call(`/cases/${id}/documents`,"POST",body,id);
    const value=body as Record<string,unknown>;
    const base=`/cases/${encodeURIComponent(id)}`;
    if(value.action==="chat")return call(`${base}/chat`,"POST",{message:value.text},id);
    if(value.action==="invite")return call(`${base}/invitations`,"POST",value,id);
    if(value.action==="remind")return call(`${base}/follow-up`,"POST",value,id);
    if(value.action==="withdraw")return call(`/payment-requests/${value.requestId}/approvals/me`,"DELETE",undefined,id);
    if(value.action==="pledge")return call(`/payment-requests/${value.requestId}/approvals`,"POST",value,id);
    throw new Error("This action is not available.");
  }

  const call=useCallback(async (path:string,method="GET",body?:object|FormData,caseId?:string) => {
    const headers:Record<string,string>={};
    if(caseId && selectedMembers[caseId])headers["x-member-id"]=selectedMembers[caseId];
    if(body instanceof FormData&&body.get("file") instanceof File) {
      const file=body.get("file") as File;
      const prepared=await request(`/api${path}/upload-ticket`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({name:file.name,mime:file.type,size:file.size})});
      if(prepared.status!==404) {
        const ticket=await readResponse<{signedUrl:string;receipt:string}>(prepared);
        const uploaded=await fetch(ticket.signedUrl,{method:"PUT",headers:{"Content-Type":file.type,"x-upsert":"false"},body:file});
        if(!uploaded.ok)throw new Error("The private file upload failed. Try again.");
        body={receipt:ticket.receipt,...Object.fromEntries([...body.entries()].filter(([key])=>key!=="file"))};
      }
    }
    if(body && !(body instanceof FormData))headers["Content-Type"]="application/json";
    try{return await result(await request(`/api${path}`,{method,headers,cache:"no-store",...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}));}
    finally {if(method!=="GET")await refresh();}
  },[refresh,selectedMembers]);
  async function selectMember(caseId:string,memberId:string) {
    if(workspace?.mode!=="demo")return;
    const view=await result(await request(`/api/cases/${encodeURIComponent(caseId)}`,{headers:{"x-member-id":memberId},cache:"no-store"}));
    setSelectedMembers(m=>({...m,[caseId]:memberId}));
    setWorkspace(w=>w&&({...w,cases:w.cases.map(c=>c.case.id===caseId?view:c)}));
  }

  if (error && !workspace) {
    const x = explainError(error);
    return <div role="alert" className="mx-auto mt-16 max-w-md space-y-3 rounded-[1.75rem] bg-firstlight p-7"><h1 className="font-serif text-2xl text-lead">{x.title}</h1><p className="text-lead">{x.body}</p><p className="text-sm text-ink-2">{x.hint}</p>{x.action ? <a href={x.action.href} className={PRIMARY}>{x.action.label}</a> : <button type="button" onClick={refresh} className={PRIMARY}>Try again</button>}</div>;
  }
  if (!workspace) return <p role="status" className="flex items-center gap-3 p-6 text-ink-2"><Spinner className="h-5 w-5 text-serpent" />Opening your care cases…</p>;
  return <Context.Provider value={{ ...workspace, refresh, createCase, act,call,selectMember }}>{children}</Context.Provider>;
}

export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace provider is missing.");
  return value;
}

export function useCaseData(): CareCase {
  const { caseId } = useParams<{ caseId: string }>();
  const { cases } = useWorkspace();
  const data = cases.find(c => c.case.id === caseId);
  if (!data) throw new Error("Care case not found in your account.");
  return data;
}

export function CaseAccess({ caseId, children }: { caseId: string; children: ReactNode }) {
  const { cases } = useWorkspace();
  if (!cases.some(c => c.case.id === caseId)) return <div className="p-8"><h1 className="font-serif text-3xl text-lead">Care case not found</h1><p className="mt-3 text-ink-2">This care case isn’t available in your account.</p><a href="/projects" className="mt-4 inline-block font-semibold text-serpent-dark underline">Back to dashboard</a></div>;
  return children;
}
