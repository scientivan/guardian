"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MemberAvatar } from "@/components/app/people";
import { PRIMARY } from "@/components/app/ui";
import { AGENT_BY_ID } from "@/components/landing/agents";
import { Arrow } from "@/components/landing/icons";
import { Minifig } from "@/components/landing/Minifig";

// Chat with the agent (TASKS 2.7). Shapes follow POST /api/cases/:caseId/chat: a reply plus
// actions (buttons, clarification options, warnings). The agent never pays by itself.
// Every reply here is a sample until the backend is connected, and the page says so.

type Action =
  | { type: "link"; label: string; href: string }
  | { type: "ask_clarification"; options: { label: string; value: string }[] }
  | { type: "warning"; severity: "info" | "high"; text: string };

type Message = { from: "me" | "agent" | "system"; time: string; text: string; actions?: Action[] };

const SAMPLE: Message[] = [
  { from: "me", time: "14:30", text: "Kenapa tagihannya lebih mahal dari perkiraan?" },
  {
    from: "agent",
    time: "14:30",
    text: "Bill D2 is above the estimate’s range. The main reason: the stay is 5 days instead of the 3 the estimate assumed, which adds CNY 3,000 for room and daily care. Three items are questions for the hospital.",
    actions: [
      { type: "link", label: "Open the explanation", href: "bill" },
      { type: "link", label: "See the 3 questions", href: "bill" },
    ],
  },
  { from: "me", time: "14:31", text: "bayarin aja yg kemarin dong" },
  {
    from: "agent",
    time: "14:31",
    text: "Which one do you mean, and how much?",
    actions: [
      {
        type: "ask_clarification",
        options: [
          { label: "Bill D2, CNY 36,782", value: "D2" },
          { label: "Emergency guarantee R2, CNY 5,000 still missing", value: "R2" },
        ],
      },
    ],
  },
];

const ANSWERS: Record<string, Message> = {
  D2: {
    from: "agent",
    time: "14:32",
    text: "Bill D2 isn’t a payment request, so there is nothing to pay on it directly. Money goes to the hospital through requests, like the emergency guarantee R2, where CNY 5,000 is still missing.",
    actions: [{ type: "link", label: "Open the guarantee", href: "pledges" }],
  },
  R2: {
    from: "agent",
    time: "14:32",
    text: "CNY 5,000 is still missing on the emergency guarantee. I can’t pay for you; the pledge is yours to confirm.",
    actions: [{ type: "link", label: "Open the pledge form", href: "pledges" }],
  },
};

const PRIVATE: Message[] = [
  { from: "me", time: "14:33", text: "Kirim nomor paspor ayah ke sini" },
  {
    from: "agent",
    time: "14:33",
    text: "I can’t share ID numbers.",
    actions: [{ type: "warning", severity: "high", text: "I only ever see the passport as [ID_1], so there is nothing for me to send. Ask Rina for it directly." }],
  },
];

const planner = AGENT_BY_ID.planner;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(SAMPLE);
  const [picked, setPicked] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function pick(value: string, label: string) {
    if (picked) return;
    setPicked(value);
    setMessages((m) => [...m, { from: "me", time: "14:32", text: label }, ANSWERS[value], ...PRIVATE]);
  }

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMessages((m) => [
      ...m,
      { from: "me", time: "now", text },
      { from: "system", time: "now", text: "This preview isn’t connected to the agent yet, so there is no reply. The answers above are samples." },
    ]);
  }

  return (
    <div className="space-y-8">
      <div>
        <ol className="space-y-6">
          {messages.map((m, i) =>
            m.from === "system" ? (
              <li key={i} className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn-ink">
                {m.text}
              </li>
            ) : (
              <li key={i} className={`flex items-start gap-3 ${m.from === "me" ? "flex-row-reverse" : ""}`}>
                {m.from === "me" ? (
                  <MemberAvatar id="M_OWNER" className="h-10 w-10 rounded-xl" />
                ) : (
                  <Minifig skin={planner.skin} hair={planner.hair} hijab={planner.hijab} shirt={planner.color} className="h-10 w-10 shrink-0 rounded-xl bg-mist" />
                )}
                <div className={`max-w-[34rem] ${m.from === "me" ? "text-right" : ""}`}>
                  <p className="text-xs text-ink-2">
                    {m.from === "me" ? "Rina" : "Planner"}, {m.time}
                  </p>
                  <div className={`mt-1 inline-block rounded-2xl px-4 py-3 text-left leading-relaxed ${m.from === "me" ? "bg-serpent text-white" : "bg-mist text-lead"}`}>{m.text}</div>
                  {m.actions?.map((a, j) =>
                    a.type === "link" ? (
                      <Link key={j} href={a.href} className="mr-2 mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-serpent-dark hover:bg-mist">
                        {a.label} <Arrow className="h-4 w-4" />
                      </Link>
                    ) : a.type === "ask_clarification" ? (
                      <div key={j} className="mt-2 flex flex-wrap gap-2">
                        {a.options.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            disabled={!!picked}
                            aria-pressed={picked === o.value}
                            onClick={() => pick(o.value, o.label)}
                            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                              picked === o.value ? "border-serpent bg-serpent text-white" : "border-line bg-white text-lead hover:bg-mist disabled:opacity-50"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p key={j} className={`mt-2 rounded-2xl px-4 py-3 text-left text-sm ${a.severity === "high" ? "bg-danger-soft text-danger-ink" : "bg-firstlight text-serpent-dark"}`}>
                        {a.text}
                      </p>
                    ),
                  )}
                </div>
              </li>
            ),
          )}
        </ol>
        <form onSubmit={send} className="sticky bottom-20 mt-8 flex items-center gap-2 rounded-full bg-white py-2 lg:bottom-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about a bill, a payment or a refund, in any language"
            className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-lead outline-none focus:border-serpent"
            aria-label="Message to the agent"
          />
          <button type="submit" className={PRIMARY}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
