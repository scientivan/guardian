"use client";

import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";

import { useState } from "react";
import { Chip, Section } from "@/components/app/ui";
import { clock } from "@/lib/format";
import { CHECKS } from "@/lib/demo";
import { Spinner, useTask, WORK } from "@/components/app/Feedback";

// Security log (TASKS 2.9), mainly for the judges: every step in order, whether the gateway
// allowed it, and the chain status with its FISCO BCOS anchor.

export default function LogPage() {
  const { audit: AUDIT,case:care } = useCaseData();
  const {call}=useWorkspace();
  const [feedback,setFeedback]=useState("");
  const {busy,run}=useTask();
  async function anchor(){setFeedback("");const done=await run(()=>call(`/cases/${care.id}/audit/anchor`,"POST",{},care.id),{work:WORK.anchor,retry:true});if(done)setFeedback("Audit hash anchored on FISCO BCOS.");}
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const rows = onlyBlocked ? AUDIT.rows.filter((r) => r.decision === "deny") : AUDIT.rows;
  const blocked = AUDIT.rows.filter((r) => r.decision === "deny").length;

  return (
    <div className="space-y-12">
      {feedback&&<p role="status" className="rounded-xl bg-ok-soft p-4 text-sm text-ok-ink">{feedback}</p>}
      {care.me.role==="owner"&&<button type="button" disabled={busy} onClick={anchor} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 font-semibold text-serpent-dark">{busy?<><Spinner/>Anchoring…</>:"Anchor audit hash"}</button>}
      <Section
        title="All Steps"
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
                <tr key={r.seq} className={r.decision === "deny" ? "bg-danger-soft/40" : undefined}>
                  <td className="py-3 pr-3 tabular-nums text-ink-2">#{r.seq}</td>
                  <td className="px-3 py-3 tabular-nums text-ink-2">{clock(r.ts)}</td>
                  <td className="px-3 py-3 font-semibold text-lead">{r.actor}</td>
                  <td className="px-3 py-3 text-lead">{r.action}</td>
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

      <Section title="The Five Checks" agent="gate">
        <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {Object.entries(CHECKS).map(([n, t]) => (
            <li key={n} className="flex gap-3">
              <span className="w-5 text-lg font-extrabold leading-7 tabular-nums text-serpent">{n}</span>
              <span className="leading-7 text-lead">{t}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
