"use client";

import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ActivityLog } from "@/components/app/TeamPanel";
import { Chip, Section } from "@/components/app/ui";
import { clock } from "@/lib/format";
import { actorLabel, describeAction } from "@/lib/audit-labels";
import { Spinner, useTask, WORK } from "@/components/app/Feedback";

// Case History (was "Security log", TASKS 2.9): what happened lately in plain words, then every
// step in order with whether the gateway allowed it, the tamper check and its FISCO BCOS anchor.
// Recent Activity entries elsewhere link here as #step-<seq>.

export default function LogPage() {
  const { audit: AUDIT,case:care } = useCaseData();
  const {call}=useWorkspace();
  const [feedback,setFeedback]=useState("");
  const {busy,run}=useTask();
  async function anchor(){setFeedback("");const done=await run(()=>call(`/cases/${care.id}/audit/anchor`,"POST",{},care.id),{work:WORK.anchor,retry:true});if(done)setFeedback("Audit hash anchored on FISCO BCOS.");}
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const rows = onlyBlocked ? AUDIT.rows.filter((r) => r.decision === "deny") : AUDIT.rows;
  const blocked = AUDIT.rows.filter((r) => r.decision === "deny").length;
  // Opening a linked step (#step-12): show all rows, then bring that row into view.
  const [target, setTarget] = useState<string>("");
  useEffect(() => {
    const read = () => { const id = window.location.hash.slice(1); if (id.startsWith("step-")) { setOnlyBlocked(false); setTarget(id); setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "smooth" }), 50); } };
    read(); window.addEventListener("hashchange", read); return () => window.removeEventListener("hashchange", read);
  }, []);

  return (
    <div className="space-y-12">
      {feedback&&<p role="status" className="rounded-xl bg-ok-soft p-4 text-sm text-ok-ink">{feedback}</p>}
      <Section title="Recent Activity" agent="auditor">
        <ActivityLog rows={AUDIT.rows} caseId={care.id} limit={8} />
        <p className="mt-3 text-xs text-ink-2">Select an entry to see it in the full record below.</p>
      </Section>
      {care.me.role==="owner"&&!care.closed&&<button type="button" disabled={busy} onClick={anchor} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 font-semibold text-serpent-dark">{busy?<><Spinner/>Anchoring…</>:"Anchor audit hash"}</button>}
      <Section
        title="Full Record"
        agent="auditor"
        action={
          <>
          <Chip tone={AUDIT.chainValid ? "ok" : "danger"}>{AUDIT.chainValid ? "Chain intact" : "Chain broken"}</Chip>
          <div className="flex rounded-xl bg-white p-1 text-sm font-semibold" role="group" aria-label="Filter">
            <button type="button" aria-pressed={!onlyBlocked} onClick={() => setOnlyBlocked(false)} className={`rounded-lg px-3 py-1.5 ${!onlyBlocked ? "bg-serpent text-white" : "text-ink-2"}`}>
              All {AUDIT.rows.length}
            </button>
            <button type="button" aria-pressed={onlyBlocked} onClick={() => setOnlyBlocked(true)} className={`rounded-lg px-3 py-1.5 ${onlyBlocked ? "bg-serpent text-white" : "text-ink-2"}`}>
              Blocked {blocked}
            </button>
          </div>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-ink-2">
              <tr>
                <th className="py-2 pr-3 font-medium">Step</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Who</th>
                <th className="px-3 py-2 font-medium">What happened</th>
                <th className="px-3 py-2 font-medium">Result</th>
                <th className="py-2 pl-3 font-medium">Fingerprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {rows.map((r) => (
                <tr key={r.seq} id={`step-${r.seq}`} className={`scroll-mt-24 transition-colors ${target === `step-${r.seq}` ? "bg-firstlight ring-2 ring-inset ring-serpent" : r.decision === "deny" ? "bg-danger-soft/40" : ""}`}>
                  <td className="py-3 pr-3 tabular-nums text-ink-2">#{r.seq}</td>
                  <td className="px-3 py-3 tabular-nums text-ink-2">{clock(r.ts)}</td>
                  <td className="px-3 py-3 font-semibold text-lead">{actorLabel(r.actor)}</td>
                  <td className="px-3 py-3 text-lead">{describeAction(r.action, r.check)}</td>
                  <td className="px-3 py-3">
                    {r.decision === "allow" ? <Chip tone="ok">Allowed</Chip> : <Chip tone="danger">{r.check ? `Blocked, check ${r.check}` : "Blocked"}</Chip>}
                  </td>
                  <td className="py-3 pl-3 font-mono text-xs text-ink-2">{r.hash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-ink-2">
          Latest fingerprint <span className="font-mono text-lead">{AUDIT.anchoredHead.hash || "No activity yet"}</span>{AUDIT.anchoredHead.tx && <> · FISCO BCOS <span className="font-mono text-lead">{AUDIT.anchoredHead.tx}</span></>}
        </p>
      </Section>

      <p className="text-sm text-ink-2">How the five payment checks and the tamper check work is explained in <Link href={`/case/${care.id}/guide`} className="font-semibold text-serpent-dark underline">How It Works</Link>.</p>
    </div>
  );
}
