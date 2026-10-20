"use client";

import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/app/WorkspaceProvider";

function SessionGuard({ children }: { children: ReactNode }) {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      const destination = window.location.pathname + window.location.search;
      window.location.replace(`/login?callbackUrl=${encodeURIComponent(destination)}`);
    },
  });
  if (status === "loading") return <p role="status" className="p-6 text-ink-2">Checking your session…</p>;
  return children;
}

export function AppSession({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionProvider session={session} refetchInterval={60} refetchOnWindowFocus><SessionGuard><WorkspaceProvider>{children}</WorkspaceProvider></SessionGuard></SessionProvider>;
}
