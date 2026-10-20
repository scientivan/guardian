"use client";

import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Action } from "@/server/agent";
import type { AskContext } from "@/server/case-answers";
import { AGENT_BY_ID } from "@/components/landing/agents";
import { ChatBubble, Cross } from "@/components/landing/icons";
import { Minifig } from "@/components/landing/Minifig";
import { Dots, Spinner, useFeedback, useTask } from "./Feedback";
import { PRIMARY, SECONDARY } from "./ui";
import { useCaseData, useWorkspace } from "./WorkspaceProvider";

// The case assistant as a small window at the bottom left of every case page (it replaced the
// Case Assistant tab). "Ask" buttons next to bill and payment information open it with their
// question; those are answered by code from the case facts (src/server/case-answers.ts).

const PLANNER = AGENT_BY_ID.planner;
type Message = { from: "me" | "agent"; text: string; actions?: Action[] };
type Value = { isOpen: boolean; open: () => void; toggle: () => void; ask: (question: string, context?: AskContext) => void };
const Context = createContext<Value | null>(null);

export function useAssistant() {
  const value = useContext(Context);
  if (!value) throw new Error("Assistant provider is missing.");
  return value;
}

/** Small "Ask" button placed next to a piece of information. */
export function AskButton({ question, context, label = "Ask", className = "" }: { question: string; context?: AskContext; label?: string; className?: string }) {
  const { ask } = useAssistant();
  return (
    <LocalizedElement as="button" type="button" onClick={() => ask(question, context)} title={question} aria-label={`Ask the assistant: ${question}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-serpent-dark transition-colors hover:border-cerulean hover:bg-mist ${className}`}>
      <ChatBubble className="h-3.5 w-3.5" /><LocalizedText>{label}</LocalizedText>
    </LocalizedElement>
  );
}

/** `raised`: the page has a bottom strip of its own (Agent Office), so the window sits above it. */
export function AssistantProvider({ children, raised = false }: { children: ReactNode; raised?: boolean }) {
  const { case: care } = useCaseData();
  const { call } = useWorkspace();
  const router = useRouter();
  const { showError } = useFeedback();
  const { busy, run } = useTask();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const list = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // History loads the first time the window opens, and again when the acting member changes.
  useEffect(() => { setLoaded(false); setMessages([]); }, [care.id, care.me.id]);
  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    call(`/cases/${care.id}/chat`, "GET", undefined, care.id)
      .then(rows => { if (active) setMessages((rows as { question: string; reply: string; actions: string }[]).flatMap(r => [{ from: "me" as const, text: r.question }, { from: "agent" as const, text: r.reply, actions: JSON.parse(r.actions) }])); })
      .catch(e => { if (active) showError(e); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [open, loaded, care.id, call, showError]);
  useEffect(() => { list.current?.lastElementChild?.scrollIntoView({ block: "end" }); }, [messages, pending, open]);

  const send = useCallback(async (text: string, context?: AskContext) => {
    if (!text.trim()) return;
    setOpen(true); setPending(text); setDraft("");
    const response = await run(() => call(`/cases/${care.id}/chat`, "POST", { message: text, ...(context ? { context } : {}) }, care.id) as Promise<{ reply: string; actions: Action[] }>, { retry: true });
    setPending(null);
    if (response) setMessages(m => [...m, { from: "me", text }, { from: "agent", text: response.reply, actions: response.actions }]);
    else if (!context) setDraft(text);
  }, [call, care.id, run]);

  const value: Value = {
    isOpen: open,
    toggle: () => (open ? setOpen(false) : value.open()),
    open: () => { setOpen(true); setTimeout(() => input.current?.focus(), 50); },
    ask: (question, context) => { if (!busy) void send(question, context); },
  };

  async function prepare(a: Extract<Action, { type: "prepare_payment" }>) {
    const done = await run(() => call(`/cases/${care.id}/payment-requests`, "POST", { payeeId: a.payeeId, documentId: a.documentId, amount: a.amount, purpose: "Hospital bill payment", expiresInMinutes: 120 }, care.id));
    if (done) router.push(`/case/${care.id}/pledges`);
  }
  const previous = (i: number) => [...messages.slice(0, i)].reverse().find(m => m.from === "me")?.text ?? "";

  return (
    <Context.Provider value={value}>
      <LocalizedText>{children}</LocalizedText>
      {/* Phones: floats above the tab bar. Wide screens: opens from the bottom of the left sidebar. */}
      <div className={`fixed left-3 z-40 flex flex-col items-start gap-3 lg:bottom-3 ${raised ? "bottom-[calc(14.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"}`}>
        {open && (
          <LocalizedElement as="section" aria-label="Case assistant" className={`pop flex ${raised ? "h-[min(30rem,calc(100dvh-20rem))]" : "h-[min(34rem,calc(100dvh-9rem))]"} w-[min(25rem,calc(100vw-1.5rem))] lg:h-[min(40rem,calc(100dvh-5.5rem))] lg:w-[25rem] flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_30px_60px_-28px_rgba(32,33,33,0.6)] ring-1 ring-line`}>
            <header className="flex shrink-0 items-end gap-3 bg-serpent-dark px-5 pt-3 text-white">
              <Minifig skin={PLANNER.skin} hair={PLANNER.hair} hijab={PLANNER.hijab} shirt={PLANNER.color} className="-mb-1 h-12 w-12" />
              <div className="min-w-0 flex-1 pb-3">
                <h2 className="font-serif text-xl leading-tight"><LocalizedText>Case Assistant</LocalizedText></h2>
                <p className="text-xs text-cerulean"><LocalizedText>Explains and prepares. You always approve payments.</LocalizedText></p>
              </div>
              <LocalizedElement as="button" type="button" onClick={() => setOpen(false)} aria-label="Close the assistant" className="mb-3 grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"><Cross className="h-4 w-4" /></LocalizedElement>
            </header>
            <ol ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
              {!loaded && <li role="status" className="flex items-center gap-2 text-sm text-ink-2"><Spinner className="h-4 w-4 text-serpent" /><LocalizedText>Loading your conversation…</LocalizedText></li>}
              {loaded && !messages.length && !pending && <li className="text-sm leading-relaxed text-ink-2"><LocalizedText>Ask about a bill, a payment or a refund, or press </LocalizedText><b><LocalizedText>Ask</LocalizedText></b><LocalizedText> next to anything in Bill Review.</LocalizedText></li>}
              {messages.map((m, i) => (
                <li key={i} className={m.from === "me" ? "ml-auto max-w-[85%]" : "max-w-[92%]"}>
                  {!(m.from === "agent" && m.actions?.some(a => a.type === "warning" && a.text === m.text)) && <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.from === "me" ? "bg-serpent text-white" : "bg-mist text-lead"}`}>{m.text}</div>}
                  {!!m.actions?.length && <div className="mt-2 flex flex-wrap gap-2">{m.actions.map((a, j) => {
                    const small = `${SECONDARY} !px-3 !py-1.5 !text-xs`;
                    if (a.type === "warning") return <p key={j} className="rounded-xl bg-danger-soft p-3 text-sm text-danger-ink"><LocalizedText>{a.text}</LocalizedText></p>;
                    if (a.type === "explain_bill") return <Link key={j} className={small} href={`/case/${care.id}/bill?documentId=${encodeURIComponent(a.documentId)}`}><LocalizedText>Open Bill Review</LocalizedText></Link>;
                    if (a.type === "request_approval") return <Link key={j} className={small} href={`/case/${care.id}/pledges?requestId=${encodeURIComponent(a.requestId)}`}><LocalizedText>Review your pledge</LocalizedText></Link>;
                    if (a.type === "track_refund") return <Link key={j} className={small} href={`/case/${care.id}/refunds`}><LocalizedText>View refunds</LocalizedText></Link>;
                    if (a.type === "ask_hospital") return a.channel.startsWith("https://") ? <a key={j} className={small} href={a.channel} target="_blank" rel="noreferrer"><LocalizedText>Official billing channel</LocalizedText></a> : null;
                    if (a.type === "prepare_payment") return <button key={j} type="button" disabled={busy || care.me.role !== "owner"} onClick={() => prepare(a)} className={small}><LocalizedText>Prepare payment request</LocalizedText></button>;
                    if (a.type === "ask_clarification") return a.options.map(o => <button key={o.value} type="button" disabled={busy} className={small} onClick={() => void send(a.question === "amount" ? `${previous(i)} Pay ${Number(o.value) / 100} ${care.currency}.` : a.question === "which_request" ? `Approve my share of request ${o.value}` : `${previous(i)} Bill ${o.value}.`)}><LocalizedText>{o.label}</LocalizedText></button>);
                    return null;
                  })}</div>}
                </li>
              ))}
              {pending && <li className="ml-auto max-w-[85%]"><div className="rounded-2xl bg-serpent px-3.5 py-2.5 text-sm leading-relaxed text-white opacity-80">{pending}</div></li>}
              {pending && <li role="status" className="flex items-center gap-2 text-sm text-ink-2"><Dots /><LocalizedText>{PLANNER.name}</LocalizedText><LocalizedText> is thinking</LocalizedText></li>}
            </ol>
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); void send(draft); }} className="flex shrink-0 gap-2 border-t border-line p-3">
              <LocalizedElement as="input" ref={input} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask about your care case" aria-label="Message to the assistant" maxLength={2000} className="min-w-0 flex-1 rounded-full border border-line px-4 py-2.5 text-sm text-lead outline-none focus:border-serpent" />
              <button type="submit" disabled={busy || !draft.trim()} className={`${PRIMARY} !px-4`}><LocalizedText>{busy ? <Spinner /> : "Send"}</LocalizedText></button>
            </form>
          </LocalizedElement>
        )}
        <button type="button" onClick={value.toggle} aria-expanded={open} className="flex items-center lg:hidden gap-2 rounded-full bg-serpent-dark py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white shadow-[0_16px_30px_-16px_rgba(32,33,33,0.7)] transition-colors hover:bg-[#2f5274]">
          <Minifig skin={PLANNER.skin} hair={PLANNER.hair} hijab={PLANNER.hijab} shirt={PLANNER.color} className="h-9 w-9 rounded-full bg-white" />
          <LocalizedText>{open ? "Close assistant" : "Ask the assistant"}</LocalizedText>
        </button>
      </div>
    </Context.Provider>
  );
}

/** The assistant's place in the left sidebar on wide screens: opens and closes the window. */
export function AssistantLauncher() {
  const { isOpen, toggle } = useAssistant();
  return (
    <button type="button" onClick={toggle} aria-expanded={isOpen}
      className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${isOpen ? "bg-serpent-dark text-white" : "bg-firstlight text-serpent-dark hover:bg-cerulean/60"}`}>
      <Minifig skin={PLANNER.skin} hair={PLANNER.hair} hijab={PLANNER.hijab} shirt={PLANNER.color} className="h-10 w-10 shrink-0 rounded-xl bg-white" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold"><LocalizedText>Case Assistant</LocalizedText></span>
        <span className={`block text-xs ${isOpen ? "text-cerulean" : "text-ink-2"}`}><LocalizedText>{isOpen ? "Close the window" : "Ask about bills and payments"}</LocalizedText></span>
      </span>
      <ChatBubble className="h-5 w-5 shrink-0" />
    </button>
  );
}
