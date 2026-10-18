import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";

export default async function CaseLayout({ children, params }: { children: ReactNode; params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <AppShell caseId={caseId}>{children}</AppShell>;
}
