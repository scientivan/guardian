"use client";

import { useEffect, useRef, useState } from "react";
import { fromCaseCurrency } from "@/lib/fx-rates";
import { Select } from "./Select";
import { AGENT_BY_ID } from "@/components/landing/agents";
import { Minifig } from "@/components/landing/Minifig";
import { money } from "@/lib/format";
import { Spinner } from "./Feedback";
import { PRIMARY, SECONDARY } from "./ui";

export type InvitationBrief = {
  id: string;
  caseId: string;
  patientName: string;
  hospitalName: string;
  country: string;
  caseCurrency: string;
  inviter: string;
  role: "payer" | "companion";
  name: string;
  currency: string;
  /** Currencies this helper can pay in (those with a reference rate for the case). */
  currencies?: string[];
  shareLimit: number;
  delivery: "email" | "link";
  expiresAt: string;
  accepted: boolean;
  memberId?: string;
};

const ROLE: Record<InvitationBrief["role"], { label: string; can: string; cannot: string }> = {
  payer: { label: "Helper", can: "See the bill summary and approve or withdraw your own share.", cannot: "You can’t see full medical documents or approve for anyone else." },
  companion: { label: "Companion", can: "Upload estimates and bills and ask the assistant questions.", cannot: "You can’t approve payments." },
};

/** Brief information about a care case invitation, with Accept. Shared by Dashboard and /join links. */
export function InvitationDialog({ invitation, busy, onAccept, onClose, closeLabel = "Not now", onDecline }: { invitation: InvitationBrief; busy: boolean; onAccept: (currency: string) => void; onClose: () => void; closeLabel?: string; onDecline?: () => void }) {
  const choices = invitation.currencies?.length ? invitation.currencies : [invitation.caseCurrency];
  const [pays, setPays] = useState(invitation.currency && choices.includes(invitation.currency) ? invitation.currency : choices.includes("IDR") ? "IDR" : choices[0]);
  const inPays = fromCaseCurrency(invitation.shareLimit, invitation.caseCurrency, pays);
  const ref = useRef<HTMLDialogElement>(null);
  const accept = useRef<HTMLButtonElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) { d.showModal(); accept.current?.focus(); } }, []);
  const a = AGENT_BY_ID.clerk;
  const role = ROLE[invitation.role];
  const rows: [string, string][] = [
    ["Patient", invitation.patientName],
    ["Hospital", `${invitation.hospitalName}, ${invitation.country}`],
    ["Invited by", invitation.inviter],
    ["Your role", role.label],
    ...(invitation.role === "payer" ? [["Your share limit", `${money(invitation.shareLimit, invitation.caseCurrency)}${inPays !== null && pays !== invitation.caseCurrency ? ` (about ${money(inPays, pays)})` : ""} per request`] as [string, string]] : []),
    ["Invitation expires", new Date(invitation.expiresAt).toLocaleString()],
  ];
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="invite-title" className="m-auto w-[calc(100%-2rem)] max-w-md overflow-visible rounded-[1.75rem] bg-white p-0 text-lead shadow-[0_30px_60px_-30px_rgba(32,33,33,0.55)] backdrop:bg-lead/40 backdrop:backdrop-blur-[2px]">
      <div className="pop flex items-end gap-3 rounded-t-[1.75rem] bg-serpent-dark px-6 pt-5 text-white">
        <Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} className="-mb-1 h-16 w-16" />
        <div className="pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cerulean">Care case invitation</p>
          <h2 id="invite-title" className="font-serif text-2xl">Help with {invitation.patientName}’s treatment</h2>
        </div>
      </div>
      <div className="space-y-4 px-6 py-5">
        <dl className="divide-y divide-line text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-ink-2">{k}</dt><dd className="text-right font-semibold text-lead">{v}</dd></div>)}</dl>
        {invitation.role === "payer" && !invitation.accepted && <div className="text-sm text-ink-2"><span>Currency you’ll pay in</span><Select up label="Currency you’ll pay in" className="mt-1" value={pays} onChange={setPays} options={choices.map(c => ({ value: c, label: c, hint: c === invitation.caseCurrency ? "The hospital’s currency, no conversion" : `Converted from ${invitation.caseCurrency} at the reference rate` }))} /></div>}
        <p className="rounded-xl bg-firstlight p-3 text-sm leading-relaxed text-serpent-dark"><b>As {role.label.toLowerCase()}: </b>{role.can} {role.cannot}{invitation.role === "payer" ? " Nothing is paid until you approve your own share." : ""}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">
        {onDecline && <button type="button" disabled={busy} onClick={onDecline} className="mr-auto text-sm font-semibold text-danger-ink hover:underline">Decline</button>}
        <button type="button" disabled={busy} onClick={() => ref.current?.close()} className={SECONDARY}>{closeLabel}</button>
        <button ref={accept} type="button" disabled={busy} onClick={() => onAccept(pays)} className={PRIMARY}>{busy ? <><Spinner />Joining…</> : invitation.accepted ? "Open care case" : "Accept invitation"}</button>
      </div>
    </dialog>
  );
}
