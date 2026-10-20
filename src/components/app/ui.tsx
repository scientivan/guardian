import type { ReactNode } from "react";
import { AGENT_BY_ID, type AgentId } from "@/components/landing/agents";
import { Chevron } from "@/components/landing/icons";
import { Minifig } from "@/components/landing/Minifig";
import type { AgentState } from "@/components/office/model";
import { money } from "@/lib/format";

// Small building blocks shared by the case screens.

export type Tone = "ok" | "warn" | "danger" | "info" | "muted" | "brown";

const TONES: Record<Tone, string> = {
  ok: "text-ok-ink",
  warn: "text-warn-ink",
  danger: "text-danger-ink",
  info: "text-serpent-dark",
  muted: "text-ink-2",
  brown: "text-chocolate",
};

/** A status word: plain bold coloured text, no box around it (Aurel: tinted pill labels look AI-made). */
export function Chip({ tone = "muted", className = "", children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap text-xs font-bold ${TONES[tone]} ${className}`}>{children}</span>;
}

/**
 * A key figure: a small grey currency code, then big extra-bold digits in Plus Jakarta Sans.
 * Every key amount on every tab uses this, at one size, so money is the first thing you see.
 */
export function Figure({ code, value, tone = "text-serpent-dark", className = "" }: { code?: string; value: string; tone?: string; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 whitespace-nowrap font-num tabular-nums ${className}`}>
      {code && <span className="text-base font-bold text-ink-2">{code}</span>}
      <span className={`text-4xl font-extrabold tracking-tight ${tone}`}>{value}</span>
    </span>
  );
}

/** Figure for an amount in minor units. */
export function MoneyFigure({ minor, currency, tone }: { minor: number; currency: string; tone?: string }) {
  const [code, ...rest] = money(minor, currency).split(" ");
  return <Figure code={code} value={rest.join(" ")} tone={tone} />;
}

// Section titles come in two looks:
//  - "ribbon" (main column, default): a short piece of the dark-blue tab band that starts at the
//    line by the sidebar and ends in a rounded tip after the title, with the agent who made the
//    section standing on it. The section's buttons sit to the right of the ribbon.
//  - "band" (agents panel, project wizard): a full-width First Light band; `inset` keeps it inside
//    a narrow page. Other looks Aurel may want later: src/app/mockup/titles (F, I, J).
const BLEED_LEFT = "-ml-4 pl-4 sm:-ml-6 sm:pl-6 lg:-ml-8 lg:pl-8";
const RIBBON = `${BLEED_LEFT} inline-flex items-center gap-3 rounded-r-full bg-serpent-dark py-3 pr-4 text-lg font-bold text-white`;
const BAND = "flex flex-wrap items-center gap-x-4 gap-y-2 bg-firstlight py-3";
const BLEED = "-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8";
const INSET = "rounded-[1.25rem] px-5";
const BAND_TITLE = "text-lg font-semibold text-serpent-dark";

// "bubble": the agent who made the section stands at the left and "says" the title in a
// dark-blue speech bubble. MAIN_LOOK picks which look the main column uses (Aurel is trying them).
const BUBBLE = "relative mb-5 rounded-2xl rounded-bl-md bg-serpent-dark px-5 py-2.5 text-lg font-bold text-white transition-colors after:absolute after:-bottom-2 after:left-0 after:h-4 after:w-4 after:bg-serpent-dark after:transition-colors after:[clip-path:polygon(0_0,100%_0,0_100%)]";
const MAIN_LOOK: "ribbon" | "bubble" | "folder" = "folder";

// "folder" (Aurel's folder-icon reference): a dark-blue tab with the title (and the section's
// agent) sticks up at the top left; the folder's back shows as a thin dark strip; the content
// sits on the light-blue front panel, like documents filed in a folder.
const FOLDER_TAB =
  "relative inline-flex items-center gap-3 rounded-t-2xl bg-serpent-dark py-2.5 pl-5 pr-3 text-lg font-bold text-white after:absolute after:-right-4 after:bottom-0 after:h-full after:w-8 after:origin-bottom-left after:skew-x-[28deg] after:rounded-tr-2xl after:bg-serpent-dark";
const FOLDER_BACK = "bg-serpent-dark pt-2 shadow-[0_22px_34px_-26px_rgba(32,33,33,0.6)]";

function FolderTab({ title, agent }: { title: string; agent?: AgentId }) {
  return (
    <span className={FOLDER_TAB}>
      <span className="relative z-10">{title}</span>
      <RibbonAgent id={agent} className="relative z-10 -mt-7 -mb-2.5 h-12 w-12 shrink-0" />
    </span>
  );
}

type Look = { variant?: "ribbon" | "bubble" | "folder" | "band"; agent?: AgentId; inset?: boolean };

function RibbonAgent({ id, className = "-my-6 h-14 w-14 shrink-0" }: { id?: AgentId; className?: string }) {
  if (!id) return null;
  const a = AGENT_BY_ID[id];
  return <Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} label={a.name} className={className} />;
}

function Bubble({ title, agent, hover = false }: { title: string; agent?: AgentId; hover?: boolean }) {
  return (
    <span className="flex items-end gap-2">
      <RibbonAgent id={agent} className="h-14 w-14 shrink-0" />
      <span className={`${BUBBLE} ${hover ? "group-hover:bg-[#2f5274] group-hover:after:bg-[#2f5274]" : ""}`}>{title}</span>
    </span>
  );
}

export function Section({ title, action, children, className = "", variant = MAIN_LOOK, agent, inset = false }: Look & { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  if (variant === "band") {
    return (
      <section className={className}>
        <div className={`${BAND} ${inset ? INSET : BLEED}`}>
          <h2 className={BAND_TITLE}>{title}</h2>
          {action && <div className="ml-auto flex flex-wrap items-center gap-2">{action}</div>}
        </div>
        <div className="mt-6">{children}</div>
      </section>
    );
  }
  if (variant === "folder") {
    return (
      <section className={className}>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <h2>
            <FolderTab title={title} agent={agent} />
          </h2>
          {action && <div className="mb-2 flex flex-wrap items-center gap-2">{action}</div>}
        </div>
        <div className={`${FOLDER_BACK} rounded-b-[1.75rem] rounded-tr-[1.75rem]`}>
          <div className="rounded-[1.5rem] bg-firstlight p-5 sm:p-7">{children}</div>
        </div>
      </section>
    );
  }
  if (variant === "bubble") {
    return (
      <section className={className}>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <h2>
            <Bubble title={title} agent={agent} />
          </h2>
          {action && <div className="mb-5 ml-auto flex flex-wrap items-center gap-2">{action}</div>}
        </div>
        <div className="mt-3">{children}</div>
      </section>
    );
  }
  return (
    <section className={className}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h2 className={RIBBON}>
          {title}
          <RibbonAgent id={agent} />
        </h2>
        {action && <div className="ml-auto flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

/** Same title as a Section, folded away until someone opens it. */
export function FoldSection({ title, children, variant = MAIN_LOOK, agent, inset = false }: Look & { title: string; children: ReactNode }) {
  if (variant === "band") {
    return (
      <details className="group">
        <summary className={`${BAND} ${inset ? INSET : BLEED} cursor-pointer list-none transition-colors hover:bg-cerulean/50`}>
          <span className={BAND_TITLE}>{title}</span>
          <Chevron className="ml-auto h-5 w-5 text-serpent-dark transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-6">{children}</div>
      </details>
    );
  }
  if (variant === "folder") {
    return (
      <details className="group">
        <summary className="cursor-pointer list-none">
          <span className="flex">
            <FolderTab title={title} agent={agent} />
          </span>
          <span className={`${FOLDER_BACK} block rounded-b-[1.75rem] rounded-tr-[1.75rem] group-open:rounded-b-none group-open:shadow-none`}>
            <span className="flex items-center justify-between rounded-[1.5rem] bg-firstlight px-5 py-4 transition-colors group-hover:bg-cerulean/60 group-open:rounded-b-none sm:px-7">
              <span className="text-sm font-semibold text-serpent-dark">
                <span className="group-open:hidden">Open folder</span>
                <span className="hidden group-open:inline">Close folder</span>
              </span>
              <Chevron className="h-6 w-6 text-serpent-dark transition-transform group-open:rotate-180" />
            </span>
          </span>
        </summary>
        <div className="rounded-b-[1.5rem] bg-firstlight px-5 pb-7 pt-1 shadow-[0_22px_34px_-26px_rgba(32,33,33,0.6)] sm:px-7">{children}</div>
      </details>
    );
  }
  if (variant === "bubble") {
    return (
      <details className="group">
        <summary className="flex cursor-pointer list-none items-end gap-4">
          <Bubble title={title} agent={agent} hover />
          <Chevron className="mb-7 ml-auto h-6 w-6 text-serpent-dark transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3">{children}</div>
      </details>
    );
  }
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-4">
        <span className={`${RIBBON} transition-colors group-hover:bg-[#2f5274]`}>
          {title}
          <RibbonAgent id={agent} />
        </span>
        <Chevron className="ml-auto h-6 w-6 text-serpent-dark transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-7">{children}</div>
    </details>
  );
}

export const STATE_CHIP: Record<AgentState, { label: string; tone: Tone }> = {
  working: { label: "Working", tone: "info" },
  waiting: { label: "Waiting", tone: "warn" },
  idle: { label: "Idle", tone: "muted" },
  done: { label: "Done", tone: "ok" },
  blocked: { label: "Blocked", tone: "danger" },
};

export const BUTTON = "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const PRIMARY = `${BUTTON} bg-serpent text-white hover:bg-serpent-dark`;
export const SECONDARY = `${BUTTON} border border-line bg-white text-lead hover:border-cerulean hover:bg-mist`;
