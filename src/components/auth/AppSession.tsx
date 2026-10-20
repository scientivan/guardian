"use client";

import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/app/WorkspaceProvider";
import { FeedbackProvider, Spinner } from "@/components/app/Feedback";

function SessionGuard({ children }: { children: ReactNode }) {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      const destination = window.location.pathname + window.location.search;
      window.location.replace(`/login?callbackUrl=${encodeURIComponent(destination)}`);
    },
  });
  if (status === "loading") return <p role="status" className="flex items-center gap-3 p-6 text-ink-2"><Spinner className="h-5 w-5 text-serpent" />Checking your session…</p>;
  return children;
}

export function AppSession({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionProvider session={session} refetchInterval={60} refetchOnWindowFocus><SessionGuard><FeedbackProvider><WorkspaceProvider>{children}</WorkspaceProvider></FeedbackProvider></SessionGuard></SessionProvider>;
}
