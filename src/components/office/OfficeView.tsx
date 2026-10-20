"use client";

import { useCaseData } from "@/components/app/WorkspaceProvider";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ActivityLog, TeamList } from "@/components/app/TeamPanel";
import { type AgentId } from "@/components/landing/agents";
import { Arrow, Door, Minus, Plus } from "@/components/landing/icons";

import { AGENT_ROOM, FULL_VIEW, ROOMS, ROOM_GRID, roomView, type RoomId } from "./model";
import { OfficeScene } from "./OfficeScene";
import { NextSteps } from "./NextSteps";

type View = [number, number, number, number];

const ARROWS: Record<string, "left" | "right" | "up" | "down"> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
const CONTROL = "grid h-10 w-10 place-items-center rounded-xl text-lead transition-colors hover:bg-mist disabled:opacity-35";

/**
 * The whole case office: zoom (wheel, pinch or buttons), right-drag to pan (one finger on touch),
 * "Step inside" a room with arrow keys between rooms, click an agent or a room.
 * During a gesture the view box is written straight to the SVG; React state catches up at the end.
 */
export function OfficeView() {
  const { audit: AUDIT, agents: SAMPLE_STATUS } = useCaseData();
  const [selected, setSelected] = useState<AgentId | null>(null);
  const [room, setRoom] = useState<RoomId | null>(null);
  const [inside, setInside] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [view, setView] = useState<View>(FULL_VIEW);

  const box = useRef<HTMLElement>(null);
  const current = useRef<View>(FULL_VIEW);
  const frame = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const paint = useCallback((v: View) => {
    current.current = v;
    box.current?.querySelector("svg")?.setAttribute("viewBox", v.map((n) => n.toFixed(1)).join(" "));
  }, []);

  const animateTo = useCallback(
    (target: View) => {
      cancelAnimationFrame(frame.current);
      const from = current.current;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const t0 = performance.now();
      const dur = reduce ? 1 : 450;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        paint(from.map((f, i) => f + (target[i] - f) * e) as View);
        if (k < 1) frame.current = requestAnimationFrame(step);
        else setView(target);
      };
      frame.current = requestAnimationFrame(step);
    },
    [paint],
  );

  /** Zoom by `factor` (<1 zooms in) around a point given as fractions of the box. */
  const zoomAt = useCallback(
    (factor: number, fx = 0.5, fy = 0.5) => {
      const [x, y, w, h] = current.current;
      const nw = Math.min(900, Math.max(140, w * factor));
      const f = nw / w;
      const cx = x + w * fx;
      const cy = y + h * fy;
      const next: View = [cx - (cx - x) * f, cy - (cy - y) * f, nw, h * f];
      paint(next);
      setView(next);
    },
    [paint],
  );

  const enterRoom = useCallback(
    (r: RoomId) => {
      setRoom(r);
      setInside(true);
      animateTo(roomView(r));
    },
    [animateTo],
  );
  const leave = useCallback(() => {
    setInside(false);
    animateTo(FULL_VIEW);
  }, [animateTo]);

  // Wheel zoom needs a non-passive listener so the page doesn't scroll at the same time.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // The "What to do next" panel scrolls normally instead of zooming the office.
      if ((e.target as Element | null)?.closest("[data-office-panel]")) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY > 0 ? 1.12 : 1 / 1.12, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Arrow keys walk between rooms while inside; Escape steps back out.
  useEffect(() => {
    if (!inside || !room) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return leave();
      const dir = ARROWS[e.key];
      const next = dir && ROOM_GRID[room][dir];
      if (next) {
        e.preventDefault();
        enterRoom(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inside, room, enterRoom, leave]);

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 2) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  function onPointerMove(e: ReactPointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !box.current) return;
    // Capture only once the pointer really moves, so a plain tap still selects the agent under it.
    const el = e.currentTarget as HTMLElement;
    if (!el.hasPointerCapture(e.pointerId)) {
      if (Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 4) return;
      el.setPointerCapture(e.pointerId);
    }
    const r = box.current.getBoundingClientRect();
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.entries()];
      const other = a[0] === e.pointerId ? b[1] : a[1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (after > 0) zoomAt(before / after, ((e.clientX + other.x) / 2 - r.left) / r.width, ((e.clientY + other.y) / 2 - r.top) / r.height);
    } else {
      const [x, y, w, h] = current.current;
      paint([x - ((e.clientX - prev.x) * w) / r.width, y - ((e.clientY - prev.y) * h) / r.height, w, h]);
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  function onPointerUp(e: ReactPointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setView(current.current);
  }

  function selectAgent(id: AgentId) {
    setSelected(id);
    setRoom(AGENT_ROOM[id]);
    if (inside) enterRoom(AGENT_ROOM[id]);
  }
  function selectRoom(id: RoomId) {
    setRoom(id);
    if (inside) enterRoom(id);
  }

  const working = Object.values(SAMPLE_STATUS).filter((s) => s.state === "working").length;
  const waiting = Object.values(SAMPLE_STATUS).filter((s) => s.state === "waiting").length;
  const neighbours = inside && room ? ROOM_GRID[room] : null;

  return (
    <div className="relative isolate flex h-full min-h-0 flex-col overflow-hidden bg-mist">
      <header className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line bg-white/90 px-3 py-2 sm:px-5 sm:py-3 [@media(max-height:600px)]:py-1">
        <div>
          <h1 className="font-serif text-xl text-lead sm:text-2xl">Agent Office</h1>
          <p className="hidden text-xs sm:block [@media(max-height:600px)]:hidden">
            <span className="font-semibold text-serpent-dark">{working} working</span>
            <span className="text-ink-2"> · </span>
            <span className="font-semibold text-warn-ink">{waiting} waiting</span>
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex rounded-xl bg-mist p-0.5 text-xs font-semibold sm:text-sm" role="group" aria-label="View">
            <button type="button" aria-pressed={!inside} onClick={leave} className={`min-h-10 rounded-lg px-2 sm:px-3 ${!inside ? "bg-serpent text-white" : "text-ink-2 hover:text-lead"}`}>
              Whole office
            </button>
            <button type="button" aria-pressed={inside} onClick={() => enterRoom(room ?? (selected ? AGENT_ROOM[selected] : "intake"))} className={`flex min-h-10 items-center gap-1 rounded-lg px-2 sm:px-3 ${inside ? "bg-serpent text-white" : "text-ink-2 hover:text-lead"}`}>
              <Door className="h-4 w-4" />
              <span className="hidden sm:inline">Step inside</span>
              <span className="sm:hidden">Inside</span>
            </button>
          </div>
          <div className="hidden rounded-xl bg-mist p-0.5 sm:flex" role="group" aria-label="Zoom">
            <button type="button" aria-label="Zoom out" className={CONTROL} onClick={() => zoomAt(1.2)}><Minus className="h-5 w-5" /></button>
            <button type="button" aria-label="Zoom in" className={CONTROL} onClick={() => zoomAt(1 / 1.2)}><Plus className="h-5 w-5" /></button>
          </div>
          <button type="button" aria-expanded={teamOpen} aria-controls="office-team" onClick={() => setTeamOpen((open) => !open)} className="min-h-10 rounded-xl bg-firstlight px-3 text-xs font-semibold text-serpent-dark md:hidden">{teamOpen ? "Close" : "Team"}</button>
        </div>
      </header>

      <div className="relative grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          ref={box}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="relative h-full min-h-0 min-w-0 touch-none select-none overflow-hidden"
          style={{ background: "radial-gradient(120% 80% at 30% 10%, #fffaf3 0%, #eef3f6 55%, #dae7ee 100%)" }}
          aria-label="The case office"
        >
          {!inside && <NextSteps />}
          <OfficeScene status={SAMPLE_STATUS} selected={selected} selectedRoom={room ?? undefined} viewBox={view.join(" ")} onSelectAgent={selectAgent} onSelectRoom={selectRoom} />
          {inside && room && neighbours && (
            <div className="absolute bottom-4 left-1/2 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1 rounded-2xl bg-white/95 p-1 pl-3 shadow-sm sm:gap-2 sm:p-2 sm:pl-4">
              <span className="truncate text-sm font-bold text-lead">{ROOMS[room].name}</span>
              <div className="flex">
                {(["left", "up", "down", "right"] as const).map((d) => (
                  <button key={d} type="button" disabled={!neighbours[d]} onClick={() => neighbours[d] && enterRoom(neighbours[d]!)} aria-label={neighbours[d] ? `Go to ${ROOMS[neighbours[d]!].name}` : `No room ${d}`} className={CONTROL}>
                    <Arrow className={`h-4 w-4 ${d === "left" ? "rotate-180" : d === "up" ? "-rotate-90" : d === "down" ? "rotate-90" : ""}`} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {!inside && (
            <p className="pointer-events-none absolute bottom-3 left-4 right-4 text-xs text-ink-2">
              <span className="hidden sm:inline">Scroll to zoom, right-drag to move. Movement is decoration.</span>
              <span className="sm:hidden">Pinch to zoom, drag to move.</span>
            </p>
          )}
        </section>

        <aside id="office-team" aria-labelledby="office-team-title" className={`${teamOpen ? "absolute inset-y-0 right-0 z-20 flex w-72 max-w-[calc(100%-1rem)] shadow-lg" : "hidden"} min-h-0 flex-col border-l border-line bg-white/95 backdrop-blur md:static md:flex md:w-auto md:max-w-none md:shadow-none`}>
          <div className="flex shrink-0 items-center justify-between border-b border-line bg-firstlight px-4 py-3">
            <h2 id="office-team-title" className="font-semibold text-serpent-dark">The Team</h2>
            <span className="text-xs text-ink-2">7 agents</span>
          </div>
          <div tabIndex={0} aria-label="Agent team members" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            <TeamList status={SAMPLE_STATUS} selected={selected} onSelect={selectAgent} brief />
          </div>
        </aside>
      </div>

      <section aria-labelledby="office-activity-title" className="z-10 min-w-0 shrink-0 border-t border-line bg-firstlight/70 px-3 pb-1 pt-2 sm:px-5 sm:pt-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="office-activity-title" className="text-sm font-semibold text-serpent-dark">Recent Activity</h2>

        </div>
        <ActivityLog rows={AUDIT.rows} horizontal />
      </section>
    </div>
  );
}
