"use client";

import { LocalizedText } from "@/components/i18n/LocaleProvider";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Chevron } from "@/components/landing/icons";
import { Spinner } from "./Feedback";
import { Chip } from "./ui";

// The hospital as one element: its name and verified account. Clicking it offers the two things the
// owner does with it: check the account again through the official channel, or open its directory page.

export function HospitalMenu({ name, account, source, directoryHref, busy, onVerify, canVerify }: {
  name: string; account?: string; source?: string; directoryHref: string; busy: boolean; onVerify: () => void; canVerify: boolean;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const item = "flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-mist disabled:opacity-50";
  return (
    <div ref={box} className="relative inline-block max-w-full">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu"
        className={`flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border bg-white px-4 py-2.5 text-left text-sm transition-colors ${open ? "border-serpent" : "border-line hover:border-cerulean"}`}>
        <LocalizedText>{busy ? <Spinner className="h-4 w-4 text-serpent" /> : null}</LocalizedText>
        <span className="font-semibold text-lead"><LocalizedText>{name}</LocalizedText></span>
        <LocalizedText>{account ? <><span className="text-serpent-dark"><LocalizedText>{account}</LocalizedText></span><Chip tone="ok"><LocalizedText>{source === "official_registry" ? "Official registry" : source}</LocalizedText></Chip></> : <Chip tone="warn"><LocalizedText>Account not verified</LocalizedText></Chip>}</LocalizedText>
        <Chevron className={`h-4 w-4 shrink-0 text-serpent-dark transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="pop absolute left-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-1.5 shadow-[0_22px_34px_-20px_rgba(32,33,33,0.45)]">
          {canVerify && <button role="menuitem" type="button" disabled={busy} onClick={() => { setOpen(false); onVerify(); }} className={item}>
            <span className="text-sm font-semibold text-lead"><LocalizedText>Verify hospital account</LocalizedText></span>
            <span className="text-xs text-ink-2"><LocalizedText>Fetch the hospital’s signed account list again from its official channel.</LocalizedText></span>
          </button>}
          <Link role="menuitem" href={directoryHref} className={item}>
            <span className="text-sm font-semibold text-lead"><LocalizedText>View in Hospital Directory</LocalizedText></span>
            <span className="text-xs text-ink-2"><LocalizedText>Profile, sources and review history of this institution.</LocalizedText></span>
          </Link>
        </div>
      )}
    </div>
  );
}
