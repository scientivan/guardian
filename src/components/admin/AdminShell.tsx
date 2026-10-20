"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { ShieldMark } from "@/components/landing/icons";
import { AccountMenu } from "@/components/auth/AccountMenu";
import type { HospitalRecord, HospitalReview, HospitalVerification, HospitalAudit } from "@/lib/hospitals";
import { Loading, Notice, useHospitalResource } from "@/components/hospitals/shared";
import { SECONDARY } from "@/components/app/ui";

export type AdminData={hospitals:HospitalRecord[];reviews:HospitalReview[];verifications:HospitalVerification[];audit:{valid:boolean;rows:HospitalAudit[]}};
const Context=createContext<{data:AdminData;refresh:()=>Promise<void>}|null>(null);
export function useAdminData(){const value=useContext(Context);if(!value)throw new Error("Admin data is unavailable.");return value;}
const links=[["/admin","Overview"],["/admin/hospitals","Hospital Directory"],["/admin/reviews","Review Queue"],["/admin/audit","Audit History"]];

export function AdminShell({children}:{children:ReactNode}) {
  const path=usePathname();const {data,error,refresh}=useHospitalResource<AdminData>("/admin");
  return <div className="min-h-dvh bg-mist/40">
    <header className="border-b border-line bg-white"><div className="flex min-h-20 items-center gap-4 px-5 sm:px-8"><Link href="/admin" className="flex items-center gap-3"><ShieldMark className="h-8 w-8"/><span className="font-serif text-3xl">Guardian</span></Link><span className="hidden border-l border-line pl-4 text-sm font-semibold text-ink-2 sm:block">Verification Desk</span><div className="ml-auto flex items-center gap-4"><Link href="/projects" className="hidden min-h-10 items-center text-sm font-semibold text-serpent-dark sm:inline-flex">Care Cases ↗</Link><AccountMenu/></div></div></header>
    <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="border-b border-line bg-white p-4 lg:min-h-[calc(100dvh-5rem)] lg:border-b-0 lg:border-r"><p className="mb-4 px-3 text-xs font-bold uppercase tracking-widest text-ink-2">Human verification</p><nav aria-label="Administrator sections" className="flex gap-1 overflow-x-auto lg:flex-col">{links.map(([href,label])=>{const on=href==="/admin"?path===href:path.startsWith(href);return <Link key={href} href={href} aria-current={on?"page":undefined} className={`flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold ${on?"bg-firstlight text-serpent-dark":"text-ink-2 hover:bg-mist"}`}>{label}</Link>;})}</nav><p className="mt-8 hidden px-3 text-xs leading-relaxed text-ink-2 lg:block">AI prepares evidence.<br/>People establish trust.<br/>The gateway enforces it.</p></aside>
      <main className="min-w-0 p-5 sm:p-8 xl:p-10">{error&&<div className="mb-5 space-y-3"><Notice error>{error}</Notice><button type="button" onClick={()=>void refresh()} className={SECONDARY}>Retry loading records</button></div>}{data?<Context.Provider value={{data,refresh}}>{children}</Context.Provider>:!error?<Loading/>:null}</main>
    </div>
  </div>;
}
