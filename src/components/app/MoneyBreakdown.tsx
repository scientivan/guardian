"use client";

import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

import { useState } from "react";
import { money, share } from "@/lib/format";
import type { Item } from "@/lib/demo";
import { Chip, MoneyFigure } from "./ui";

// "Where the money went": one big bar split by group of the bill. Hover or focus a group to
// read it; click to open the bill lines inside it. Bars grow in when the page opens.

const GROUPS: { id: string; label: string; color: string; ink: string }[] = [
  { id: "procedure", label: "Operation and anaesthesia", color: "#4875a1", ink: "#ffffff" },
  { id: "room", label: "Room and daily care", color: "#6e5e52", ink: "#ffffff" },
  { id: "drug", label: "Medicines", color: "#375d84", ink: "#ffffff" },
  { id: "lab", label: "Laboratory and imaging", color: "#abc1cf", ink: "#202121" },
  { id: "consumable", label: "Consumables", color: "#c9b9ab", ink: "#202121" },
  { id: "other", label: "Other", color: "#91999c", ink: "#202121" },
];

const FLAG: Record<string, string> = { duplicate: "Billed twice?", basic_item_billed: "Basic item", above_reference: "Above reference" };

/** `onQuestion`: lets a case member send a line to the independent second reader (PRD F6). */
export function MoneyBreakdown({ byCategory, total, currency, items, checked = [], onQuestion, busy = false }: { byCategory: Record<string, number>; total: number; currency: string; items: Item[]; checked?: string[]; onQuestion?: (itemId: string) => void; busy?: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const active = hover ?? open;
  const group = GROUPS.find((g) => g.id === active);
  const groups = GROUPS.filter((g) => byCategory[g.id]);
  const lines = open ? items.filter((i) => i.category === open).sort((a, b) => b.lineTotal - a.lineTotal) : [];

  return (
    <div onMouseLeave={() => setHover(null)}>
      {/* Headline follows the group under the pointer, or the total. */}
      <div key={active ?? "total"} className="step-in min-h-[4.5rem]">
        <p className="text-sm text-ink-2"><LocalizedText>{group ? group.label : "The whole bill"}</LocalizedText></p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
          <MoneyFigure minor={group ? byCategory[group.id] : total} currency={currency} />
          {group && <span className="text-lg text-ink-2"><LocalizedText>{Math.round(share(byCategory[group.id], total))}</LocalizedText><LocalizedText>% of the bill</LocalizedText></span>}
        </p>
      </div>

      <LocalizedElement as="div" className="mt-5 flex h-24 gap-1.5" role="group" aria-label="Groups of the bill">
        {groups.map((g, i) => {
          const pct = share(byCategory[g.id], total);
          const dim = active && active !== g.id;
          return (
            <LocalizedElement as="button"
              key={g.id}
              type="button"
              onMouseEnter={() => setHover(g.id)}
              onFocus={() => setHover(g.id)}
              onBlur={() => setHover(null)}
              onClick={() => setOpen(open === g.id ? null : g.id)}
              aria-pressed={open === g.id}
              aria-label={`${g.label}, ${money(byCategory[g.id], currency)}`}
              className="grow-x relative min-w-[1.25rem] overflow-hidden rounded-2xl text-left transition-[opacity,translate] duration-300 hover:-translate-y-1 motion-reduce:hover:translate-y-0"
              style={{ flexGrow: pct, flexBasis: 0, background: g.color, color: g.ink, opacity: dim ? 0.35 : 1, animationDelay: `${i * 90}ms` }}
            >
              {pct > 12 && (
                <span className="absolute bottom-3 left-4 right-3 leading-tight">
                  <span className="block truncate text-sm font-semibold"><LocalizedText>{g.label}</LocalizedText></span>
                  <span className="text-xs opacity-90"><LocalizedText>{Math.round(pct)}</LocalizedText>%</span>
                </span>
              )}
            </LocalizedElement>
          );
        })}
      </LocalizedElement>

      <ul className="mt-5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {groups.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onMouseEnter={() => setHover(g.id)}
              onClick={() => setOpen(open === g.id ? null : g.id)}
              aria-pressed={open === g.id}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${open === g.id ? "bg-white" : "hover:bg-white/70"}`}
            >
              <span className="h-4 w-4 shrink-0 rounded-[5px]" style={{ background: g.color }} />
              <span className="min-w-0 flex-1 truncate text-sm text-lead"><LocalizedText>{g.label}</LocalizedText></span>
              <span className="font-num text-sm font-bold tabular-nums text-serpent-dark"><LocalizedText>{money(byCategory[g.id], currency)}</LocalizedText></span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div key={open} className="step-in mt-4 rounded-2xl bg-white p-4 sm:p-5">
          <p className="text-sm font-semibold text-lead">
            <LocalizedText>{lines.length}</LocalizedText><LocalizedText> lines in </LocalizedText><LocalizedText>{GROUPS.find((g) => g.id === open)?.label.toLowerCase()}</LocalizedText>
          </p>
          <ul className="mt-2 divide-y divide-line/80">
            {lines.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="w-9 text-xs tabular-nums text-ink-2"><LocalizedText>{l.id}</LocalizedText></span>
                <span className="min-w-0 flex-1 text-lead"><LocalizedText>{l.description}</LocalizedText></span>
                {l.flags.map((f) => (
                  <Chip key={f} tone="warn">
                    <LocalizedText>{FLAG[f] ?? f}</LocalizedText>
                  </Chip>
                ))}
                <span className="tabular-nums text-ink-2">
                  <LocalizedText>{l.qty}</LocalizedText> × <LocalizedText>{money(l.unitPrice, currency)}</LocalizedText>
                </span>
                <b className="w-24 text-right font-num tabular-nums text-serpent-dark"><LocalizedText>{money(l.lineTotal, currency)}</LocalizedText></b>
                <LocalizedText>{checked.includes(l.id) ? <Chip tone="ok" className="w-28 justify-end"><LocalizedText>Second check done</LocalizedText></Chip>
                  : onQuestion ? <LocalizedElement as="button" type="button" disabled={busy} onClick={() => onQuestion(l.id)} title="Ask an independent second AI reader to re-read this line" className="w-28 shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-serpent-dark hover:border-cerulean hover:bg-mist disabled:opacity-50"><LocalizedText>Double-check</LocalizedText></LocalizedElement> : null}</LocalizedText>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
