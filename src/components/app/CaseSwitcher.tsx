"use client";

import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MemberAvatar } from "./people";
import { useCaseData, useWorkspace } from "./WorkspaceProvider";
import { Check, Chevron, Plus } from "@/components/landing/icons";

// The case name in the header doubles as a switcher: the account's other care cases, opened on the
// same tab (Bill Review stays Bill Review), plus the dashboard and "Start a care case".

export function CaseSwitcher() {
  const { case: current } = useCaseData();
  const { cases } = useWorkspace();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const tab = pathname.slice(`/case/${current.id}`.length).split(/[?#]/)[0];
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div ref={box} className="relative min-w-0">
      <LocalizedElement as="button" type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Switch care case"
        className={`flex max-w-full items-center gap-2 rounded-xl px-2 py-1 text-left transition-colors ${open ? "bg-firstlight" : "hover:bg-mist"}`}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-lead">{current.patient.name}<LocalizedText>’s care case</LocalizedText></span>
          <span className="block truncate text-xs text-ink-2">{current.hospital.name}</span>
        </span>
        <Chevron className={`h-4 w-4 shrink-0 text-serpent-dark transition-transform ${open ? "rotate-180" : ""}`} />
      </LocalizedElement>
      {open && (
        <div role="menu" className="pop absolute left-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-2 shadow-[0_22px_34px_-20px_rgba(32,33,33,0.45)]">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-ink-2"><LocalizedText>Your care cases</LocalizedText></p>
          <ul className="max-h-80 overflow-y-auto">
            {cases.map(({ case: c, country }) => {
              const on = c.id === current.id;
              return (
                <li key={c.id}>
                  <Link role="menuitem" href={`/case/${c.id}${tab}`} aria-current={on ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${on ? "bg-firstlight" : "hover:bg-mist"}`}>
                    <MemberAvatar id="PATIENT" className="h-9 w-9 shrink-0 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-lead">{c.patient.name}<LocalizedText>’s treatment in </LocalizedText><LocalizedText>{country}</LocalizedText></span>
                      <span className="block truncate text-xs text-ink-2">{c.hospital.name}<LocalizedText> · you are the </LocalizedText><LocalizedText>{c.me.role}</LocalizedText></span>
                    </span>
                    {on && <Check className="h-4 w-4 shrink-0 text-serpent" />}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-line px-3 pb-1 pt-2.5 text-sm font-semibold">
            <Link role="menuitem" href="/projects" className="text-serpent-dark hover:underline"><LocalizedText>Dashboard</LocalizedText></Link>
            <Link role="menuitem" href="/projects/new" className="inline-flex items-center gap-1 text-serpent-dark hover:underline"><Plus className="h-4 w-4" /><LocalizedText>Start a care case</LocalizedText></Link>
          </div>
        </div>
      )}
    </div>
  );
}
