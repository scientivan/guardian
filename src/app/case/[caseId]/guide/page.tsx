"use client";

import { Fragment } from "react";
import { FoldSection, Section } from "@/components/app/ui";
import { AskButton } from "@/components/app/Assistant";
import { AGENT_BY_ID, type AgentId } from "@/components/landing/agents";
import { Arrow } from "@/components/landing/icons";
import { Minifig } from "@/components/landing/Minifig";
import { CHECKS } from "@/lib/demo";

// How It Works: the product's explanations in one place (they used to sit at the bottom of the
// upload and log pages). Plain words first; the rules match docs/ARCHITECTURE.md and docs/PRD.md.

const TEAM: { id: AgentId; does: string; never: string }[] = [
  { id: "clerk", does: "Replaces names, passport and card numbers with tokens before any AI reads a document.", never: "Sends personal details to an AI model." },
  { id: "reader", does: "Reads the lines of an estimate or bill into a fixed form, and checks they add up to the stated total.", never: "Takes actions. It has no tools, so a hidden instruction in a document can’t make it do anything." },
  { id: "calculator", does: "Compares the bill with the estimate: longer stay, items outside the estimate, duplicates, prices above a reference.", never: "Lets AI do the maths. Every total and difference is computed by code." },
  { id: "second", does: "A second AI from a different provider re-reads flagged or expensive items.", never: "Picks a side. If the two disagree, it becomes a question for the hospital." },
  { id: "planner", does: "Writes the explanation and answers your questions, citing the bill lines.", never: "Approves or pays. It can only prepare a request for you to check." },
  { id: "gate", does: "Runs five checks before any payment and charges each approved share separately.", never: "Lets anyone override a failed check, not even the case owner." },
  { id: "auditor", does: "Writes every step into a log where each entry is chained to the one before.", never: "Hides a blocked attempt. Denials are recorded too." },
];

const BILL_FLOW: { id: AgentId; text: string }[] = [
  { id: "clerk", text: "Hides names" },
  { id: "reader", text: "Reads the items" },
  { id: "calculator", text: "Checks the sums" },
  { id: "planner", text: "Explains the bill" },
];

const CHECK_WHY: Record<number, string> = {
  1: "Only accounts from the hospital’s signed list, never one typed in chat or printed on an invoice.",
  2: "Look-alike letters and hidden characters in the account name are rejected.",
  3: "Owners create requests, payers approve their own share, companions can’t approve.",
  4: "No one approves more than their limit, and approvals never pass 100% of the request.",
  5: "A suspicious message, such as “our account changed”, pauses every payment until the hospital confirms.",
};

export default function GuidePage() {
  return (
    <div className="space-y-12">
      <p className="max-w-3xl leading-relaxed text-ink-2">Guardian works for the patient’s family. It explains foreign hospital bills and pays deposits only to the hospital’s verified account, after each person approves their own share. This page explains how, in plain words.</p>

      <Section title="What Happens to a Bill" agent="reader">
        <ol className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
          {BILL_FLOW.map((p, i) => {
            const a = AGENT_BY_ID[p.id];
            return (
              <Fragment key={p.id}>
                {i > 0 && <li aria-hidden="true" className="flex justify-center text-serpent sm:mt-8"><Arrow className="h-8 w-8 rotate-90 sm:rotate-0" /></li>}
                <li className="flex flex-1 items-center gap-3 sm:flex-col sm:text-center">
                  <Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} className="h-20 w-20 shrink-0 rounded-2xl bg-white" />
                  <span><span className="block font-semibold text-lead">{p.text}</span><span className="text-sm text-ink-2">{a.name}</span></span>
                </li>
              </Fragment>
            );
          })}
        </ol>
        <p className="mt-6 leading-relaxed text-lead">Each reason in Bill Review is one of three kinds: <b>calculated</b> from the bill by code, <b>stated</b> in the hospital’s documents, or a <b>question for the hospital</b> when the documents don’t say. Guardian never invents a medical reason, and a high price is a question, not an accusation.</p>
      </Section>

      <Section title="How Payments Are Protected" agent="gate" action={<AskButton question="How does Guardian make sure money only goes to the real hospital?" label="Ask about this" />}>
        <ol className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {Object.entries(CHECKS).map(([n, t]) => (
            <li key={n} className="flex gap-3">
              <span className="w-5 text-lg font-extrabold leading-7 tabular-nums text-serpent">{n}</span>
              <span><span className="block font-semibold leading-7 text-lead">{t}</span><span className="text-sm leading-relaxed text-ink-2">{CHECK_WHY[Number(n)]}</span></span>
            </li>
          ))}
        </ol>
        <p className="mt-6 rounded-xl bg-white p-4 text-sm leading-relaxed text-lead">If any check fails, the payment stops and the reason is shown and recorded. There is no override button. The way forward is to confirm with the hospital through its official billing channel.</p>
      </Section>

      <Section title="How the Money Moves" agent="gate">
        <ol className="space-y-4 leading-relaxed text-lead">
          <li><b>1. A request.</b> The owner asks for an amount the hospital needs, such as a deposit or an emergency guarantee.</li>
          <li><b>2. Pledges.</b> Each payer chooses their own share, up to their limit, in their own currency. They see the exchange rate and fee first. Nothing is charged yet, and a pledge can be withdrawn.</li>
          <li><b>3. Payment.</b> When the pledges cover 100%, the owner confirms. Each share is charged separately and goes <b>straight to the hospital’s verified account</b>. Every payer gets their own receipt.</li>
          <li><b>4. Refund.</b> If the final bill is lower than the deposits, the hospital returns the difference, split by what each person paid. Guardian tracks it and reminds when it’s late.</li>
        </ol>
        <p className="mt-5 text-sm leading-relaxed text-ink-2">Guardian never holds money: there is no wallet, vault or escrow. A share limit is only a ceiling, not an amount that is taken. Payments in this version run in a sandbox or Stripe test mode, and exchange rates come from a reference table.</p>
      </Section>

      <Section title="Your Agent Team" agent="planner">
        <ul className="grid gap-4 lg:grid-cols-2">
          {TEAM.map(t => {
            const a = AGENT_BY_ID[t.id];
            return (
              <li key={t.id} className="flex gap-4 rounded-2xl bg-white p-4">
                <Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} className="h-14 w-14 shrink-0 rounded-xl bg-mist" />
                <div className="min-w-0 text-sm leading-relaxed">
                  <p className="text-base font-semibold text-lead">{a.name}</p>
                  <p className="text-lead">{t.does}</p>
                  <p className="mt-1 text-ink-2"><b className="font-semibold">Never:</b> {t.never}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <FoldSection title="Your Privacy" agent="clerk">
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-lead">
          <li>Names, passport, medical record and card numbers are replaced with tokens such as [PASIEN_1] before any AI reads a document.</li>
          <li>Payers see the bill summary and their own share, not full medical documents or ID numbers. Only the owner sees card numbers.</li>
          <li>Medicine and procedure names stay visible so the bill can be explained, so a diagnosis could still be guessed. That is why role limits are the second layer of protection.</li>
        </ul>
      </FoldSection>

      <FoldSection title="What the Records Prove" agent="auditor">
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-lead">
          <li>Every step is written to Case History with a fingerprint linked to the step before. Editing any past entry breaks the chain, and Case History shows “Chain broken”.</li>
          <li>Document fingerprints and the latest log fingerprint can be anchored on a FISCO BCOS blockchain.</li>
          <li>An anchor proves a file or the log hasn’t changed since. It does not prove who issued a bill or that the bill is correct.</li>
        </ul>
      </FoldSection>
    </div>
  );
}
