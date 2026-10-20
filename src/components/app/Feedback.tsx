"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AGENT_BY_ID, type AgentId } from "@/components/landing/agents";
import { Minifig } from "@/components/landing/Minifig";
import { PRIMARY, SECONDARY } from "./ui";

// Error dialog and "agents at work" loading dialog shared by every app screen (TASKS 6.3).
// Server messages stay the body; the title, the next step and the agent come from the error kind,
// so a failure never shows a blank screen or a raw status code.

/** An API failure with what the server told us. `status` 0 means the request never got an answer. */
export class ClientError extends Error {
  constructor(message: string, readonly status = 0, readonly code?: string, readonly check?: number) { super(message); }
}

/** Reads a fetch response, turning every failure (JSON or not) into a ClientError. */
export async function readResponse<T = unknown>(response: Response, fallback = "Couldn’t save your changes. Please try again."): Promise<T> {
  let data: { error?: string; code?: string; check?: number } | null = null;
  try { data = await response.json(); } catch { /* proxy pages and timeouts are not JSON */ }
  if (!response.ok) throw new ClientError(data?.error ?? fallback, response.status, data?.code, data?.check);
  return data as T;
}

/** fetch that reports a lost connection as a ClientError instead of a bare TypeError. */
export async function request(input: string, init?: RequestInit) {
  try { return await fetch(input, init); }
  catch (e) {
    if ((e as Error).name === "AbortError") throw new ClientError("The request was stopped before it finished.", 408);
    throw new ClientError("We couldn’t reach Guardian.", 0, "OFFLINE");
  }
}

type Explained = { title: string; body: string; hint: string; agent: AgentId; tone: "danger" | "warn"; action?: { label: string; href: string } };

const CHECKS: Record<number, string> = {
  1: "the hospital account is not on the hospital’s verified list",
  2: "the account holder name does not exactly match the verified name",
  3: "your role in this case does not allow it",
  4: "the amount or share limit does not fit",
  5: "an open warning on this case pauses payments",
};

/** Plain-language title, body and next step for any thrown value. */
export function explainError(error: unknown): Explained {
  const e = error instanceof ClientError ? error : new ClientError(error instanceof Error ? error.message : "Something went wrong.");
  const said = e.message;
  if (e.code === "OFFLINE" || e.status === 0) return { title: "No connection", body: "We couldn’t reach Guardian. Your case is safe and nothing was changed.", hint: "Check your internet connection, then try again.", agent: "planner", tone: "warn" };
  if (e.status === 401) return { title: "Please sign in again", body: "Your session ended to keep your care case private.", hint: "Sign in, and you will come back to where you were.", agent: "clerk", tone: "warn", action: { label: "Sign in", href: `/login?callbackUrl=${encodeURIComponent(typeof window === "undefined" ? "/projects" : window.location.pathname)}` } };
  if (e.check === 5) return { title: "Payment stopped to protect you", body: "This case has an open warning, for example an account change sent in chat. All payments are paused until it is checked.", hint: "Contact the hospital through its official billing channel to confirm the account. Never use a number from chat or an invoice.", agent: "gate", tone: "danger" };
  if (e.check === 1 || e.check === 2) return { title: "Payment stopped to protect you", body: e.check === 1 ? "This account is not on the hospital’s verified account list, so Guardian will not pay it." : "The account holder name does not exactly match the hospital’s verified name.", hint: "Guardian only pays the hospital’s verified account. Confirm any account change through the hospital’s official billing channel, never through chat or an invoice.", agent: "gate", tone: "danger" };
  if (e.check === 3) return { title: "Your role can’t do this", body: said, hint: "Ask the case owner if this needs to be done.", agent: "gate", tone: "warn" };
  if (e.check === 4) return { title: "Check the amount", body: said, hint: "Each person can approve only their own share, within their limit.", agent: "gate", tone: "warn" };
  if (e.status === 413) return { title: "This file is too large", body: said.includes("large") ? "Choose a PDF or photo up to 10 MB." : said, hint: "Try a PDF exported from the hospital, or a smaller photo.", agent: "reader", tone: "warn" };
  if (e.status === 429) return { title: "Our AI helpers are busy", body: "Too many requests arrived in a short time. Nothing was lost.", hint: "Wait about a minute, then try again.", agent: "reader", tone: "warn" };
  if (e.status === 408 || e.status === 504) return { title: "This is taking longer than usual", body: "The AI reader did not finish in time. Your case is saved.", hint: "Try again in a minute. A clear, text-based PDF reads fastest.", agent: "reader", tone: "warn" };
  if (e.status >= 500) return { title: "A service is taking a break", body: said, hint: "Your case is saved. Try again in a minute.", agent: "planner", tone: "warn" };
  if (e.status === 404) return { title: "We couldn’t find that", body: said, hint: "Refresh the page. It may have been changed or removed.", agent: "auditor", tone: "warn" };
  if (e.status === 403) return { title: "This isn’t available to you", body: said, hint: "Ask the case owner if you need access.", agent: "gate", tone: "warn" };
  if (e.status === 400 || e.code === "INVALID_INPUT") return { title: "Some details need fixing", body: said, hint: "Check the highlighted fields and try again.", agent: "planner", tone: "warn" };
  return { title: "This couldn’t be completed", body: said || "Something went wrong.", hint: "Please try again. If it keeps happening, refresh the page.", agent: "planner", tone: "warn" };
}

function technical(error: unknown) {
  if (!(error instanceof ClientError)) return "";
  return [error.status ? `status ${error.status}` : "no response", error.code, error.check ? `gateway check ${error.check}${CHECKS[error.check] ? `: ${CHECKS[error.check]}` : ""}` : "", `server said: ${error.message}`].filter(Boolean).join(" · ");
}

// ---- Work in progress ------------------------------------------------------------------------

export type WorkStep = { agent: AgentId; text: string };
export type Work = { title: string; steps: WorkStep[] };

/** What each long task looks like while it runs. Steps are what the agents do, not a progress bar. */
export const WORK = {
  upload: { title: "Reading your document", steps: [
    { agent: "clerk", text: "Hiding names and ID numbers" },
    { agent: "reader", text: "Reading each line of the document" },
    { agent: "calculator", text: "Checking the lines add up to the total" },
    { agent: "second", text: "Double-checking unusual items" },
    { agent: "planner", text: "Writing a plain-language explanation" },
  ] },
  explain: { title: "Explaining the bill", steps: [
    { agent: "calculator", text: "Comparing the bill with the estimate" },
    { agent: "second", text: "Double-checking flagged items" },
    { agent: "planner", text: "Writing each reason with its bill lines" },
  ] },
  verify: { title: "Checking the hospital account", steps: [
    { agent: "gate", text: "Fetching the hospital’s signed account list" },
    { agent: "gate", text: "Checking the hospital’s signature" },
    { agent: "auditor", text: "Recording the result" },
  ] },
  execute: { title: "Paying the hospital", steps: [
    { agent: "gate", text: "Running the five safety checks" },
    { agent: "gate", text: "Charging each approved share separately" },
    { agent: "auditor", text: "Recording receipts" },
  ] },
  reconcile: { title: "Reconciling the final bill", steps: [
    { agent: "calculator", text: "Comparing the final bill with deposits" },
    { agent: "calculator", text: "Splitting any refund by what each person paid" },
    { agent: "auditor", text: "Recording the result" },
  ] },
  anchor: { title: "Anchoring the audit log", steps: [
    { agent: "auditor", text: "Checking the audit chain is intact" },
    { agent: "auditor", text: "Writing its fingerprint to FISCO BCOS" },
  ] },
  create: { title: "Setting up your care case", steps: [
    { agent: "planner", text: "Saving the patient and hospital details" },
    { agent: "auditor", text: "Starting the case record" },
  ] },
  search: { title: "Searching official sources", steps: [
    { agent: "reader", text: "Looking up the hospital’s public pages" },
    { agent: "second", text: "Collecting the source links" },
  ] },
} satisfies Record<string, Work>;

/** Small spinning ring for buttons and inline status. */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} />;
}

/** Three dots that pulse one after another, for "the agent is typing". */
export function Dots() {
  return <span aria-hidden="true" className="inline-flex gap-1">{[0, 1, 2].map(i => <span key={i} className="dot-pulse h-2 w-2 rounded-full bg-serpent" style={{ animationDelay: `${i * 160}ms` }} />)}</span>;
}

function Figure({ id, className, working = false }: { id: AgentId; className: string; working?: boolean }) {
  const a = AGENT_BY_ID[id];
  return <span className={working ? "work-hop inline-block" : "inline-block"}><Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} className={className} /></span>;
}

function WorkingCard({ work }: { work: Work }) {
  const [tick, setTick] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const step = setInterval(() => setTick(t => t + 1), 2600);
    const clock = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { clearInterval(step); clearInterval(clock); };
  }, []);
  const current = tick % work.steps.length;
  const lead = work.steps[current].agent;
  return (
    <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-[0_30px_60px_-30px_rgba(32,33,33,0.55)]">
      <div className="flex items-end gap-3 bg-serpent-dark px-6 pt-5 text-white">
        <Figure id={lead} working className="-mb-1 h-16 w-16" />
        <div className="pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cerulean">{AGENT_BY_ID[lead].name} is on it</p>
          <h2 className="font-serif text-2xl">{work.title}</h2>
        </div>
      </div>
      <div className="h-1 w-full overflow-hidden bg-firstlight"><div className="work-bar h-full w-1/3 rounded-full bg-serpent" /></div>
      <ol className="space-y-1 px-6 py-5">
        {work.steps.map((s, i) => (
          <li key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${i === current ? "bg-firstlight" : ""}`}>
            <Figure id={s.agent} className="h-8 w-8 rounded-lg bg-mist" />
            <span className={`flex-1 text-sm ${i === current ? "font-semibold text-serpent-dark" : "text-ink-2"}`}>{s.text}</span>
            {i === current && <Dots />}
          </li>
        ))}
      </ol>
      <p className="border-t border-line px-6 py-4 text-xs leading-relaxed text-ink-2">
        {seconds < 15 ? "Please keep this page open." : `Still working (${seconds}s). Free AI models can take up to a minute. Please keep this page open.`}
      </p>
    </div>
  );
}

// ---- Provider --------------------------------------------------------------------------------

type Shown = { error: unknown; retry?: () => void };
type FeedbackValue = { showError: (error: unknown, retry?: () => void) => void; startWork: (work: Work) => () => void };
const Context = createContext<FeedbackValue | null>(null);

function ErrorDialog({ shown, onClose }: { shown: Shown; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  const x = explainError(shown.error);
  // A gateway or role denial gives the same answer every time, so it never offers "Try again".
  const retry = shown.error instanceof ClientError && shown.error.check ? undefined : shown.retry;
  const detail = technical(shown.error);
  const band = x.tone === "danger" ? "bg-danger" : "bg-serpent-dark";
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="feedback-title" className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[1.75rem] bg-white p-0 text-lead shadow-[0_30px_60px_-30px_rgba(32,33,33,0.55)] backdrop:bg-lead/40 backdrop:backdrop-blur-[2px]">
      <div className={`pop flex items-end gap-3 px-6 pt-5 text-white ${band}`}>
        <Figure id={x.agent} className="-mb-1 h-16 w-16" />
        <div className="pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{AGENT_BY_ID[x.agent].name}</p>
          <h2 id="feedback-title" className="font-serif text-2xl">{x.title}</h2>
        </div>
      </div>
      <div className="space-y-3 px-6 py-5">
        <p className="leading-relaxed text-lead">{x.body}</p>
        <p className={`rounded-xl p-3 text-sm leading-relaxed ${x.tone === "danger" ? "bg-danger-soft text-danger-ink" : "bg-firstlight text-serpent-dark"}`}><b>What to do next: </b>{x.hint}</p>
        {detail && <details className="text-xs text-ink-2"><summary className="cursor-pointer">Details for support</summary><p className="mt-1 break-words">{detail}</p></details>}
      </div>
      <form method="dialog" className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">
        {x.action ? <a href={x.action.href} className={PRIMARY}>{x.action.label}</a> : retry ? <button type="submit" className={PRIMARY} onClick={() => setTimeout(() => retry(), 0)}>Try again</button> : null}
        <button type="submit" autoFocus className={x.action || retry ? SECONDARY : PRIMARY}>{x.action || retry ? "Close" : "OK, got it"}</button>
      </form>
    </dialog>
  );
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [work, setWork] = useState<{ id: number; work: Work } | null>(null);
  const counter = useRef(0);
  const showError = useCallback((error: unknown, retry?: () => void) => setShown({ error, retry }), []);
  const startWork = useCallback((next: Work) => {
    const id = ++counter.current;
    // Only show the overlay when the task is not instant, so quick saves don't flash.
    const timer = setTimeout(() => setWork({ id, work: next }), 350);
    return () => { clearTimeout(timer); setWork(w => (w?.id === id ? null : w)); };
  }, []);
  return (
    <Context.Provider value={{ showError, startWork }}>
      {children}
      {work && (
        <div role="status" aria-live="polite" aria-busy="true" className="fixed inset-0 z-50 grid place-items-center bg-lead/30 p-4 backdrop-blur-[2px]">
          <div className="pop w-full max-w-md"><WorkingCard key={work.id} work={work.work} /></div>
        </div>
      )}
      {shown && <ErrorDialog key={String(Date.now())} shown={shown} onClose={() => setShown(null)} />}
    </Context.Provider>
  );
}

export function useFeedback() {
  const value = useContext(Context);
  if (!value) throw new Error("Feedback provider is missing.");
  return value;
}

/**
 * Runs one user action: tracks `busy`, shows the working dialog for long tasks, and shows the
 * error dialog on failure. Resolves to the result, or `undefined` when it failed.
 */
export function useTask() {
  const { showError, startWork } = useFeedback();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(task: () => Promise<T>, options: { work?: Work; retry?: boolean } = {}): Promise<T | undefined> => {
    setBusy(true);
    const stop = options.work ? startWork(options.work) : () => {};
    try { return await task(); }
    catch (e) { showError(e, options.retry ? () => { void run(task, options); } : undefined); return undefined; }
    finally { stop(); setBusy(false); }
  }, [showError, startWork]);
  return { busy, run };
}
