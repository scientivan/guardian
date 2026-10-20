import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { authOptions } from "@/server/auth";
import { isAdmin } from "@/server/admin-access";
import { AppSession } from "@/components/auth/AppSession";
import { EntryFrame } from "@/components/app/EntryFrame";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({children}:{children:ReactNode}) {
  const session=await getServerSession(authOptions);
  if(!session)redirect("/login?callbackUrl=%2Fadmin");
  return <AppSession session={session}>{isAdmin(session)?<AdminShell>{children}</AdminShell>:<EntryFrame title="Administrator access" profile><h1 className="text-2xl font-bold">This account is not an administrator</h1><p className="leading-relaxed text-ink-2">Hospital verification is restricted to Google accounts assigned by the Guardian operator. Ask the operator to authorize your account, then sign in again.</p><Link href="/projects" className="inline-flex min-h-11 items-center font-semibold text-serpent-dark underline">Return to dashboard</Link></EntryFrame>}</AppSession>;
}
