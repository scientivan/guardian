"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import type { CareCase, NewCareCase, Workspace } from "@/lib/workspace";

type WorkspaceValue = Workspace & {
  refresh: () => Promise<void>;
  createCase: (input: NewCareCase) => Promise<CareCase>;
  act: (id: string, body: object | FormData) => Promise<unknown>;
  call: (path:string,method?:string,body?:object|FormData,caseId?:string) => Promise<unknown>;
  selectMember:(caseId:string,memberId:string)=>Promise<void>;
};
const Context = createContext<WorkspaceValue | null>(null);

async function result(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Couldn’t save your changes. Please try again.");
  return data;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [selectedMembers,setSelectedMembers]=useState<Record<string,string>>({});
  const refresh = useCallback(async () => {
    setError("");
    try {
      const loaded:Workspace=await result(await fetch("/api/workspace", { cache: "no-store" }));
      if(loaded.mode==="demo")for(const [id,member] of Object.entries(selectedMembers)) {
        if(loaded.cases.some(c=>c.case.id===id)) {
          const view=await result(await fetch(`/api/cases/${encodeURIComponent(id)}`,{cache:"no-store",headers:{"x-member-id":member}}));
          loaded.cases=loaded.cases.map(c=>c.case.id===id?view:c);
        }
      }
      setWorkspace(loaded);
    }
    catch (e) { setError((e as Error).message); }
  }, [selectedMembers]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(()=>{
    const focus=()=>{void refresh();};
    const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},10000);
    window.addEventListener("focus",focus);
    return()=>{clearInterval(timer);window.removeEventListener("focus",focus);};
  },[refresh]);

  async function createCase(input: NewCareCase) {
    const item: CareCase = await result(await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
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
    if(body && !(body instanceof FormData))headers["Content-Type"]="application/json";
    try{return await result(await fetch(`/api${path}`,{method,headers,cache:"no-store",...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}));}
    finally {if(method!=="GET")await refresh();}
  },[refresh,selectedMembers]);
  async function selectMember(caseId:string,memberId:string) {
    if(workspace?.mode!=="demo")return;
    const view=await result(await fetch(`/api/cases/${encodeURIComponent(caseId)}`,{headers:{"x-member-id":memberId},cache:"no-store"}));
    setSelectedMembers(m=>({...m,[caseId]:memberId}));
    setWorkspace(w=>w&&({...w,cases:w.cases.map(c=>c.case.id===caseId?view:c)}));
  }

  if (error && !workspace) return <div role="alert" className="p-6 text-danger-ink">{error}<button type="button" onClick={refresh} className="ml-4 underline">Try again</button></div>;
  if (!workspace) return <p role="status" className="p-6 text-ink-2">Opening your care cases…</p>;
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
  if (!cases.some(c => c.case.id === caseId)) return <div className="p-8"><h1 className="font-serif text-3xl text-lead">Care case not found</h1><p className="mt-3 text-ink-2">This care case isn’t available in your account.</p><a href="/projects" className="mt-4 inline-block font-semibold text-serpent-dark underline">Back to your care cases</a></div>;
  return children;
}
