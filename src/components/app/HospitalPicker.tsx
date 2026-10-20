"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { HospitalReview, PublicHospital } from "@/lib/hospitals";
import { check, orgName, text } from "@/lib/validate";
import { Spinner, useTask, readResponse, request, type Work } from "./Feedback";
import { FieldError, INVALID, useFieldErrors } from "./FieldError";
import { INPUT } from "./EntryFrame";
import { PRIMARY, SECONDARY } from "./ui";

// Hospital step of the care case wizard. The hospital must come from the Hospital Directory: typing
// only filters the list. A missing hospital is added with its name and location; AI drafts the rest
// and the verification team reviews it before it can be chosen.

export type PickedHospital = { id: string; name: string; city: string; status: string };
export type PendingHospital = { hospitalId: string; reviewId: string; name: string; city: string; country: string };

/** The seeded demo case's hospital; demo accounts cannot add directory hospitals. */
const DEMO: PickedHospital = { id: "demo", name: "Shenzhen International Hospital", city: "Shenzhen", status: "demo" };

const ADDING: Work = { title: "Adding the hospital", steps: [
  { agent: "reader", text: "Looking up the hospital’s public pages" },
  { agent: "second", text: "Collecting address, phone and official website with sources" },
  { agent: "auditor", text: "Sending it to the verification team" },
] };

type Directory = { hospitals: PublicHospital[]; proposals: Pick<HospitalReview, "id" | "hospitalId" | "status" | "decisionNotes">[] };

export function HospitalPicker({ country, mode, value, pending, onSelect, onPending, invalid, describedBy }: {
  country: string; mode: "google" | "demo"; value: PickedHospital | null; pending: PendingHospital | null;
  onSelect: (h: PickedHospital | null) => void; onPending: (p: PendingHospital | null) => void; invalid?: boolean; describedBy?: string;
}) {
  const [data, setData] = useState<Directory | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const list = useId();
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try { setData(await readResponse<Directory>(await request("/api/hospitals", { cache: "no-store" }))); setLoadError(""); }
    catch { setLoadError("The hospital list couldn’t be loaded. Check your connection and try again."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  // While a hospital waits for review, check again now and then, so the step unlocks by itself.
  useEffect(() => {
    if (!pending) return;
    const refresh = () => void load();
    const timer = setInterval(refresh, 20_000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [pending, load]);
  useEffect(() => { setQuery(value?.name ?? ""); }, [value?.name]);

  const options = useMemo<PickedHospital[]>(() => {
    const fromDirectory = (data?.hospitals ?? [])
      .filter(h => h.profile.country === country && ["listed", "verified"].includes(h.profileStatus))
      .map(h => ({ id: h.id, name: h.profile.name, city: [h.profile.branch, h.profile.city].filter(Boolean).join(" · "), status: h.profileStatus }));
    const all = mode === "demo" && country === "China" ? [DEMO, ...fromDirectory] : fromDirectory;
    const q = query.trim().toLowerCase();
    return q && q !== value?.name.toLowerCase() ? all.filter(o => `${o.name} ${o.city}`.toLowerCase().includes(q)) : all;
  }, [data, country, mode, query, value?.name]);

  // The pending hospital passed review: select it and clear the waiting state.
  const approved = pending && data?.hospitals.find(h => h.id === pending.hospitalId && ["listed", "verified"].includes(h.profileStatus));
  useEffect(() => {
    if (approved) { onSelect({ id: approved.id, name: approved.profile.name, city: approved.profile.city, status: approved.profileStatus }); onPending(null); }
  }, [approved, onSelect, onPending]);
  const review = pending && data?.proposals.find(r => r.id === pending.reviewId);

  function pick(o: PickedHospital) { onSelect(o); setQuery(o.name); setOpen(false); }
  function keys(e: KeyboardEvent<HTMLInputElement>) {
    const count = options.length + 1; // + "Add a hospital"
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive(a => (a + 1) % count); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setActive(a => (a - 1 + count) % count); }
    else if (e.key === "Enter" && open) { e.preventDefault(); if (active < options.length) pick(options[active]); else startAdd(); }
    else if (e.key === "Escape") { setOpen(false); setQuery(value?.name ?? ""); }
  }
  function startAdd() { setOpen(false); setAdding(true); }

  if (pending && pending.country === country && !approved) {
    const status = review?.status ?? "pending";
    return (
      <div className={`rounded-2xl p-5 ${status === "rejected" ? "bg-danger-soft" : "bg-white"}`} role="status">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-2">{status === "rejected" ? "Not approved" : status === "needs_information" ? "More information needed" : "Waiting for review"}</p>
        <p className="mt-1 text-lg font-bold text-lead">{pending.name}</p>
        <p className="text-sm text-ink-2">{pending.city}, {pending.country}</p>
        {status === "pending" && <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-serpent-dark"><Spinner className="mt-1 h-3.5 w-3.5" />The verification team is checking this hospital’s identity and contacts. You can leave this page: your draft is saved, and this step unlocks by itself once it’s approved.</p>}
        {status === "needs_information" && <p className="mt-3 text-sm leading-relaxed text-warn-ink">{review?.decisionNotes} Add the missing evidence in the <Link href="/hospitals" className="font-semibold underline">Hospital Directory</Link>.</p>}
        {status === "rejected" && <p className="mt-3 text-sm leading-relaxed text-danger-ink">{review?.decisionNotes} Choose another hospital or add it again with the correct name and city.</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={SECONDARY} onClick={() => void load()}>Check again</button>
          <button type="button" className="text-sm font-semibold text-ink-2 hover:underline" onClick={() => onPending(null)}>Choose a different hospital</button>
        </div>
      </div>
    );
  }

  if (adding) return <AddHospital country={country} mode={mode} initialName={query} onCancel={() => setAdding(false)} onAdded={p => { setAdding(false); onSelect(null); onPending(p); void load(); }} />;

  return (
    <div ref={box} className="relative" onBlur={e => { if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <input
        id="wizard-hospital" role="combobox" aria-expanded={open} aria-controls={list} aria-autocomplete="list" autoComplete="off"
        aria-activedescendant={open ? `${list}-${active}` : undefined} aria-invalid={invalid || undefined} aria-describedby={describedBy}
        value={query} placeholder={data ? "Type to search hospitals in the directory" : "Loading hospitals…"}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); if (value) onSelect(null); }}
        onFocus={() => setOpen(true)} onKeyDown={keys}
        className={`${INPUT} ${invalid ? INVALID : ""}`}
      />
      {value && <p className="mt-1.5 text-sm text-ok-ink">Selected from the directory{value.status === "listed" ? " · listed from public sources, identity review pending" : value.status === "verified" ? " · verified" : ""}.</p>}
      {loadError && <FieldError id="hospital-load-error" message={loadError} />}
      {open && (
        <ul id={list} role="listbox" className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_22px_34px_-20px_rgba(32,33,33,0.45)]">
          {!data && !loadError && <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink-2"><Spinner className="h-3.5 w-3.5" />Loading hospitals…</li>}
          {data && options.length === 0 && <li className="px-3 py-2.5 text-sm text-ink-2">No hospital in {country} matches “{query.trim()}”.</li>}
          {options.map((o, i) => (
            <li key={o.id} id={`${list}-${i}`} role="option" aria-selected={value?.id === o.id} tabIndex={-1}
              onMouseDown={e => e.preventDefault()} onClick={() => pick(o)} onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-xl px-3 py-2.5 ${i === active ? "bg-firstlight" : ""}`}>
              <span className="block font-semibold text-lead">{o.name}</span>
              <span className="block text-xs text-ink-2">{o.city}{o.status === "listed" ? " · listed, review pending" : o.status === "verified" ? " · verified" : o.status === "demo" ? " · demo hospital" : ""}</span>
            </li>
          ))}
          <li id={`${list}-${options.length}`} role="option" aria-selected={false} tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={startAdd} onMouseEnter={() => setActive(options.length)}
            className={`cursor-pointer rounded-xl border-t border-line px-3 py-2.5 font-semibold text-serpent-dark ${active === options.length ? "bg-firstlight" : ""}`}>
            + Can’t find it? Add {query.trim() && !value ? `“${query.trim()}”` : "a hospital"}
          </li>
        </ul>
      )}
    </div>
  );
}

function AddHospital({ country, mode, initialName, onCancel, onAdded }: { country: string; mode: "google" | "demo"; initialName: string; onCancel: () => void; onAdded: (p: PendingHospital) => void }) {
  const [form, setForm] = useState({ name: initialName.trim(), city: "" });
  const v = useFieldErrors(check(form, { name: orgName(), city: text("the city or regency", 2, 120) }), "add-hospital");
  const { busy, run } = useTask();
  async function submit() {
    if (!v.submit()) return;
    const result = await run(async () => {
      const response = await request("/api/hospitals/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name.trim(), country, city: form.city.trim() }) });
      return readResponse<{ review: { id: string; hospitalId: string } }>(response, "The hospital couldn’t be added. Please try again.");
    }, { work: ADDING, retry: true });
    if (result) onAdded({ hospitalId: result.review.hospitalId, reviewId: result.review.id, name: form.name.trim(), city: form.city.trim(), country });
  }
  if (mode !== "google") return (
    <div className="rounded-2xl bg-white p-5">
      <p className="font-semibold text-lead">Adding a hospital needs a Google account</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">The demo account can use the demo hospital or a hospital already in the directory. Sign in with Google to add a new one for review.</p>
      <button type="button" className={`${SECONDARY} mt-4`} onClick={onCancel}>Back to the list</button>
    </div>
  );
  return (
    <div className="space-y-4 rounded-2xl bg-white p-5">
      <div>
        <p className="font-semibold text-lead">Add a hospital</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">Give its name and where it is. Our AI finds the address, phone and official website from public sources, then the verification team reviews it. You can continue once it’s approved.</p>
      </div>
      <div className="text-sm font-medium text-ink-2"><label htmlFor="add-hospital-name">Hospital name</label><input id="add-hospital-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`${INPUT} ${v.invalid("name") ? INVALID : ""}`} {...v.field("name")} />{v.error("name")}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm font-medium text-ink-2"><span>Country</span><p className={`${INPUT} bg-mist`}>{country}</p></div>
        <div className="text-sm font-medium text-ink-2"><label htmlFor="add-hospital-city">City or regency</label><input id="add-hospital-city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={`${INPUT} ${v.invalid("city") ? INVALID : ""}`} {...v.field("city")} />{v.error("city")}</div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={PRIMARY} disabled={busy} onClick={() => void submit()}>{busy ? <><Spinner />Adding…</> : "Add for review"}</button>
        <button type="button" className={SECONDARY} disabled={busy} onClick={onCancel}>Back to the list</button>
      </div>
    </div>
  );
}
