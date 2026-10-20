
import { LocalizedText } from "@/components/i18n/LocaleProvider";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { authOptions } from "@/server/auth";
import { AppSession } from "./AppSession";

export async function ProtectedApp({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <AppSession session={session}><LocalizedText>{children}</LocalizedText></AppSession>;
}
