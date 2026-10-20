"use client";

import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { Chevron } from "@/components/landing/icons";
import Link from "next/link";
import { useEffect, useState } from "react";

export function AccountMenu() {
  const { data } = useSession();
  const user = data?.user;
  const [admin,setAdmin]=useState(false);
  useEffect(()=>{let active=true;if(user?.mode==="google")fetch("/api/admin/access",{cache:"no-store"}).then(r=>r.json()).then(value=>{if(active)setAdmin(value.admin===true);}).catch(()=>{});else setAdmin(false);return()=>{active=false;};},[user?.id,user?.mode]);
  return (
    <details className="relative">
      <LocalizedElement as="summary" aria-label="Your profile" className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-left hover:bg-mist">
        <LocalizedText>{user?.image ? <Image src={user.image} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-firstlight font-bold text-serpent-dark"><LocalizedText>{user?.name?.slice(0, 1) ?? "G"}</LocalizedText></span>}</LocalizedText>
        <span className="hidden max-w-40 truncate text-sm font-semibold text-lead sm:block"><LocalizedText>{user?.name ?? "Your account"}</LocalizedText></span>
        <Chevron className="h-4 w-4 text-ink-2" />
      </LocalizedElement>
      <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-4 shadow-sm">
        <p className="truncate font-semibold text-lead"><LocalizedText>{user?.name}</LocalizedText></p>
        {user?.email && <p className="mt-1 truncate text-sm text-ink-2">{user.email}</p>}
        {admin&&<Link href="/admin" className="mt-3 flex min-h-10 items-center text-sm font-semibold text-serpent-dark"><LocalizedText>Verification Desk</LocalizedText></Link>}
        <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="mt-3 min-h-10 text-sm font-semibold text-serpent-dark hover:underline"><LocalizedText>Sign out</LocalizedText></button>
      </div>
    </details>
  );
}
