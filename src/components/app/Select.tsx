"use client";

import { useLocale, LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { translateText } from "@/lib/i18n/translate";
import { Check, Chevron } from "@/components/landing/icons";

// Guardian's dropdown. The browser's own <select> list can't be styled, so this draws the list in
// the site's look (white card, rounded rows, first-light highlight) with listbox keyboard support:
// arrows, Home/End, Enter/Space, Escape and type-to-find.

export type Option = { value: string; label: string; hint?: string; disabled?: boolean; original?: boolean };

export function Select({ value, onChange, options, id, label, className = "", disabled = false, invalid = false, placeholder = "Choose…", up = false, strong = false }: {
  value: string; onChange: (value: string) => void; options: Option[]; id?: string; label?: string;
  className?: string; disabled?: boolean; invalid?: boolean; placeholder?: string;
  /** Open the list above the field (inside dialogs or near the bottom of a panel). */
  up?: boolean;
  /** Filled serpent look, for a switcher that should stand out. */
  strong?: boolean;
}) {
  const { locale } = useLocale();
  const generated = useId();
  const listId = `${id ?? generated}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex(o => o.value === value)));
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, options, value]);
  useEffect(() => { if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" }); }, [open, active]);

  function choose(i: number) {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange(o.value);
    setOpen(false);
  }
  function move(from: number, step: number) {
    for (let i = from + step; i >= 0 && i < options.length; i += step) if (!options[i].disabled) return i;
    return from;
  }
  function keys(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive(a => move(a, e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Home" || e.key === "End") { e.preventDefault(); setOpen(true); setActive(e.key === "Home" ? move(-1, 1) : move(options.length, -1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (open) choose(active); else setOpen(true); }
    else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const hit = options.findIndex(o => !o.disabled && (o.original ? o.label : translateText(locale, o.label)).toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) { if (open) setActive(hit); else onChange(options[hit].value); }
    }
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      <LocalizedElement as="button"
        id={id} type="button" disabled={disabled} onClick={() => setOpen(o => !o)} onKeyDown={keys}
        role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={label} aria-invalid={invalid || undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        className={`flex min-h-11 w-full items-center gap-3 rounded-xl border ${strong ? "" : "bg-white text-lead"} py-2.5 pl-3.5 pr-3 text-left text-sm outline-none transition-colors focus-visible:border-serpent disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink-2 ${strong ? "border-serpent bg-serpent font-semibold text-white hover:bg-serpent-dark" : invalid ? "border-danger" : open ? "border-serpent" : "border-line hover:border-cerulean"}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected || strong ? "" : "text-ink-2"}`}>{selected?.original ? selected.label : <LocalizedText>{selected ? selected.label : placeholder}</LocalizedText>}</span>
        <Chevron className={`h-4 w-4 shrink-0 ${strong ? "text-white" : "text-serpent-dark"} transition-transform ${open ? "rotate-180" : ""}`} />
      </LocalizedElement>
      {open && (
        <LocalizedElement as="ul" ref={list} id={listId} role="listbox" aria-label={label} className={`pop absolute left-0 right-0 z-40 ${up ? "bottom-full mb-2" : "mt-2"} max-h-72 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_22px_34px_-20px_rgba(32,33,33,0.45)]`}>
          {options.map((o, i) => {
            const on = o.value === value;
            return (
              <li key={o.value} id={`${listId}-${i}`} role="option" aria-selected={on} aria-disabled={o.disabled || undefined}
                onMouseDown={e => e.preventDefault()} onClick={() => choose(i)} onMouseEnter={() => !o.disabled && setActive(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${o.disabled ? "cursor-not-allowed text-ink-2/60" : i === active ? "bg-firstlight text-serpent-dark" : "text-lead"}`}>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${on ? "font-semibold" : ""}`}>{o.original ? o.label : <LocalizedText>{o.label}</LocalizedText>}</span>
                  {o.hint && <span className="block truncate text-xs text-ink-2"><LocalizedText>{o.hint}</LocalizedText></span>}
                </span>
                {on && <Check className="h-4 w-4 shrink-0 text-serpent" />}
              </li>
            );
          })}
        </LocalizedElement>
      )}
    </div>
  );
}

/** Same list for plain string options. */
export const options = (values: readonly string[]): Option[] => values.map(v => ({ value: v, label: v }));
