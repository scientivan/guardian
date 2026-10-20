"use client";

import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

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
      {feedback&&<p role="status" className="rounded-xl bg-ok-soft p-4 text-sm text-ok-ink"><LocalizedText>{feedback}</LocalizedText></p>}
      <Section title="Recent Activity" agent="auditor">
        <ActivityLog rows={AUDIT.rows} caseId={care.id} limit={8} />
        <p className="mt-3 text-xs text-ink-2"><LocalizedText>Select an entry to see it in the full record below.</LocalizedText></p>
      </Section>
      {care.me.role==="owner"&&!care.closed&&<button type="button" disabled={busy} onClick={anchor} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 font-semibold text-serpent-dark"><LocalizedText>{busy?<><Spinner/><LocalizedText>Anchoring…</LocalizedText></>:"Anchor audit hash"}</LocalizedText></button>}
      <Section
        title="Full Record"
        agent="auditor"
        action={
          <>
          <Chip tone={AUDIT.chainValid ? "ok" : "danger"}><LocalizedText>{AUDIT.chainValid ? "Chain intact" : "Chain broken"}</LocalizedText></Chip>
          <LocalizedElement as="div" className="flex rounded-xl bg-white p-1 text-sm font-semibold" role="group" aria-label="Filter">
            <button type="button" aria-pressed={!onlyBlocked} onClick={() => setOnlyBlocked(false)} className={`rounded-lg px-3 py-1.5 ${!onlyBlocked ? "bg-serpent text-white" : "text-ink-2"}`}><LocalizedText>
              All </LocalizedText><LocalizedText>{AUDIT.rows.length}</LocalizedText>
            </button>
            <button type="button" aria-pressed={onlyBlocked} onClick={() => setOnlyBlocked(true)} className={`rounded-lg px-3 py-1.5 ${onlyBlocked ? "bg-serpent text-white" : "text-ink-2"}`}><LocalizedText>
              Blocked </LocalizedText><LocalizedText>{blocked}</LocalizedText>
            </button>
          </LocalizedElement>
          </>
        }
      >
        {care.me.role === "payer" && <p className="mb-4 text-sm text-ink-2"><LocalizedText>This is a filtered record with your own payment details. Other members’ details are private. The server checks integrity against the complete log.</LocalizedText></p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-ink-2">
              <tr>
                <th className="py-2 pr-3 font-medium"><LocalizedText>Step</LocalizedText></th>
                <th className="px-3 py-2 font-medium"><LocalizedText>Time</LocalizedText></th>
                <th className="px-3 py-2 font-medium"><LocalizedText>Who</LocalizedText></th>
                <th className="px-3 py-2 font-medium"><LocalizedText>What happened</LocalizedText></th>
                <th className="px-3 py-2 font-medium"><LocalizedText>Result</LocalizedText></th>
                <th className="py-2 pl-3 font-medium"><LocalizedText>Fingerprint</LocalizedText></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {rows.map((r) => (
                <tr key={r.seq} id={`step-${r.seq}`} className={`scroll-mt-24 transition-colors ${target === `step-${r.seq}` ? "bg-firstlight ring-2 ring-inset ring-serpent" : r.decision === "deny" ? "bg-danger-soft/40" : ""}`}>
                  <td className="py-3 pr-3 tabular-nums text-ink-2">#<LocalizedText>{r.seq}</LocalizedText></td>
                  <td className="px-3 py-3 tabular-nums text-ink-2"><LocalizedText>{clock(r.ts)}</LocalizedText></td>
                  <td className="px-3 py-3 font-semibold text-lead"><LocalizedText>{actorLabel(r.actor)}</LocalizedText></td>
                  <td className="px-3 py-3 text-lead"><LocalizedText>{describeAction(r.action, r.check)}</LocalizedText></td>
                  <td className="px-3 py-3">
                    {r.decision === "allow" ? <Chip tone="ok"><LocalizedText>Allowed</LocalizedText></Chip> : <Chip tone="danger"><LocalizedText>{r.check ? `Blocked, check ${r.check}` : "Blocked"}</LocalizedText></Chip>}
                  </td>
                  <td className="py-3 pl-3 font-mono text-xs text-ink-2"><LocalizedText>{r.hash}</LocalizedText></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-ink-2"><LocalizedText>
          Latest fingerprint </LocalizedText><span className="font-mono text-lead"><LocalizedText>{AUDIT.anchoredHead.hash || "No activity yet"}</LocalizedText></span>{AUDIT.anchoredHead.tx && <><LocalizedText> · FISCO BCOS </LocalizedText><span className="font-mono text-lead"><LocalizedText>{AUDIT.anchoredHead.tx}</LocalizedText></span></>}
        </p>
      </Section>

      <p className="text-sm text-ink-2"><LocalizedText>How the five payment checks and the tamper check work is explained in </LocalizedText><Link href={`/case/${care.id}/guide`} className="font-semibold text-serpent-dark underline"><LocalizedText>How It Works</LocalizedText></Link>.</p>
    </div>
  );
}
