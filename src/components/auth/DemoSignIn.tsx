"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { SECONDARY } from "@/components/app/ui";

export function DemoSignIn() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function enter() {
    setPending(true);
    setError("");
    try { await signIn("demo", { callbackUrl: "/projects" }); }
    catch { setError("Couldn’t open the account. Please try again."); setPending(false); }
  }
  return <div><button type="button" disabled={pending} onClick={enter} className={`${SECONDARY} min-h-12 !px-6`}>{pending ? "Opening account…" : "Use demo account"}</button>{error && <p role="alert" className="mt-2 text-sm text-danger-ink">{error}</p>}</div>;
}
