import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { CaseAccess } from "@/components/app/WorkspaceProvider";
import { ProtectedApp } from "@/components/auth/ProtectedApp";

export default async function CaseLayout({ children, params }: { children: ReactNode; params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <ProtectedApp><CaseAccess caseId={caseId}><AppShell caseId={caseId}>{children}</AppShell></CaseAccess></ProtectedApp>;
}
