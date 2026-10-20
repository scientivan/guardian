"use client";

import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { AGENTS, AGENT_BY_ID, type Agent, type AgentId } from "./agents";
import { IsoBox, P, floorMatrix, leftFaceMatrix, pts, shade, type Pt } from "./iso";
import { Minifig } from "./Minifig";

// Landing-page preview of the agent team. For now the activity is a scripted loop;
// inside the app it can follow the audit log (GET /api/cases/:caseId/audit).

const TICK_MS = 2600;

export type Spot = { dx: number; dy: number };

// Desk positions in world units. Floor is 16 × 12, split by aisles at x = 8 and y = 6:
// 1 Intake (left), 2 Analysis (back), 3 Vault (right), 4 Records (front).
const DESKS: Record<Exclude<AgentId, "second">, Spot> = {
  planner: { dx: 0.8, dy: 0.8 },
  calculator: { dx: 4.6, dy: 0.8 },
  clerk: { dx: 0.8, dy: 7.0 },
  reader: { dx: 4.4, dy: 7.6 },
  gate: { dx: 9.2, dy: 2.4 },
  auditor: { dx: 11.2, dy: 7.2 },
};
const SECOND_DESK: Spot = { dx: 1.4, dy: 3.6 };
// Second Opinion walks from their standing desk to the Calculator and back.
const WALK_FROM: Pt = [2.95, 5.25];
const WALK_TO: Pt = [7.5, 3.4];

export const seat = (s: Spot): Pt => [s.dx + 1.55, s.dy + 1.65];

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

export function AgentOffice() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  const focus = AGENTS[tick % AGENTS.length];
  const stateOf = (id: AgentId) => {
    const i = AGENTS.findIndex((a) => a.id === id);
    return Math.floor((tick + i) / 2) % 3;
  };
  const gateBlocked = stateOf("gate") === 2;

  const seated: Exclude<AgentId, "second">[] = ["planner", "calculator", "gate", "clerk", "reader", "auditor"];
  const tagAt = (id: Exclude<AgentId, "second">): Pt => {
    const [x, y] = seat(DESKS[id]);
    return P(x, y, id === "reader" ? 3.05 : 2.45);
  };

  return (
    <div
      className="relative aspect-[3/2] w-full overflow-hidden rounded-[2rem] border border-line"
      style={{ background: "linear-gradient(180deg, #f1f6f8 0%, #dae7ee 100%)" }}
    >
      <LocalizedElement as="svg"
        viewBox="-240 -48 557 380"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Guardian’s seven AI agents at work in an office: Privacy Clerk, Reader, Calculator, Second Opinion, Planner, Payment Gate and Auditor."
      >
        <Floor />

        {seated.includes(focus.id as Exclude<AgentId, "second">) && (
          <FocusRing at={seat(DESKS[focus.id as Exclude<AgentId, "second">])} />
        )}

        {/* 2 · Analysis */}
        <Desk spot={DESKS.planner}>
          <Screen id="planner" state={stateOf("planner")} />
        </Desk>
        <Seated agent={AGENT_BY_ID.planner} at={seat(DESKS.planner)} delay={0} />
        <Plant at={[0.75, 4.95]} />
        <Desk spot={SECOND_DESK} standing>
          <Screen id="second" state={stateOf("second")} />
        </Desk>
        <Desk spot={DESKS.calculator}>
          <Screen id="calculator" state={stateOf("calculator")} />
        </Desk>
        <Seated agent={AGENT_BY_ID.calculator} at={seat(DESKS.calculator)} delay={0.7} />
        <Walker
          agent={AGENT_BY_ID.second}
          focused={focus.id === "second"}
          label={AGENT_BY_ID.second.activity[stateOf("second")]}
          reduce={reduce}
        />

        {/* 3 · Vault */}
        <Desk spot={DESKS.gate}>
          <Screen id="gate" state={stateOf("gate")} />
        </Desk>
        <Seated agent={AGENT_BY_ID.gate} at={seat(DESKS.gate)} delay={1.1} />
        <Vault blocked={gateBlocked} />
        <Plant at={[15.25, 4.9]} />

        {/* 1 · Intake */}
        <Desk spot={DESKS.clerk}>
          <Screen id="clerk" state={stateOf("clerk")} />
        </Desk>
        <Seated agent={AGENT_BY_ID.clerk} at={seat(DESKS.clerk)} delay={0.3} />
        <Desk spot={DESKS.reader}>
          <Screen id="reader" state={stateOf("reader")} />
        </Desk>
        <Seated agent={AGENT_BY_ID.reader} at={seat(DESKS.reader)} delay={1.5} />
        <Glass />

        {/* 4 · Records */}
        <Shelf />
        <Desk spot={DESKS.auditor}>
          <Screen id="auditor" state={stateOf("auditor")} />
        </Desk>
        <Seated agent={AGENT_BY_ID.auditor} at={seat(DESKS.auditor)} delay={0.9} />

        {/* Name tags float above everything */}
        {seated.map((id) => {
          const [x, y] = tagAt(id);
          const a = AGENT_BY_ID[id];
          const st = stateOf(id);
          return (
            <Tag
              key={id}
              x={x}
              y={y}
              name={a.name}
              text={a.activity[st]}
              focused={focus.id === id}
              warn={id === "gate" && st === 2}
            />
          );
        })}
        <VaultSign blocked={gateBlocked} />
      </LocalizedElement>

      <div className="absolute right-4 top-4 rounded-full border border-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink-2 shadow-sm"><LocalizedText>
        7 agents on case C1
      </LocalizedText></div>

      <FocusCard agent={focus} state={stateOf(focus.id)} />
    </div>
  );
}

/* ---------- Room ---------- */

function rug(x0: number, y0: number, x1: number, y1: number) {
  return pts([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)]);
}

function Floor() {
  const [hx, hy] = P(8, 6);
  return (
    <g>
      <IsoBox x={0} y={0} z={-0.8} w={16} d={12} h={0.8} color="#e6edf1" top="#f8fafb" left="#dbe4e9" right="#c7d2d8" />
      <polygon points={rug(0.2, 6.3, 7.7, 11.8)} fill="#dae7ee" />
      <polygon points={rug(0.2, 0.2, 7.7, 5.7)} fill="#abc1cf" fillOpacity={0.5} />
      <polygon points={rug(8.3, 0.2, 15.8, 5.7)} fill="#4875a1" fillOpacity={0.2} />
      <polygon points={rug(8.3, 6.3, 15.8, 11.8)} fill="#6e5e52" fillOpacity={0.15} />

      <polyline
        points={pts([P(8, 0.3), P(8, 11.7)])}
        className="flow-line"
        fill="none"
        stroke="#4875a1"
        strokeOpacity={0.5}
        strokeWidth={1.2}
        strokeDasharray="3 4"
      />
      <polyline
        points={pts([P(0.3, 6), P(15.7, 6)])}
        className="flow-line"
        fill="none"
        stroke="#4875a1"
        strokeOpacity={0.5}
        strokeWidth={1.2}
        strokeDasharray="3 4"
      />

      <ellipse cx={hx} cy={hy} rx={30} ry={17.3} fill="#ffffff" stroke="#4875a1" strokeWidth={1.2} />
      <text x={hx} y={hy - 1} textAnchor="middle" fontSize={7} fontWeight={800} fill="#375d84"><LocalizedText>
        Case C1
      </LocalizedText></text>
      <text x={hx} y={hy + 6.5} textAnchor="middle" fontSize={5.4} fontWeight={600} fill="#4e5659"><LocalizedText>
        [PASIEN_1]
      </LocalizedText></text>

      <ZoneLabel x={0.7} y={6.95} text="Intake" color="#375d84" />
      <ZoneLabel x={0.7} y={0.75} text="Analysis" color="#375d84" />
      <ZoneLabel x={8.7} y={0.75} text="Vault" color="#2f4f70" />
      <ZoneLabel x={8.7} y={6.95} text="Records" color="#6e5e52" />
    </g>
  );
}

function ZoneLabel({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  return (
    <g transform={floorMatrix(x, y)}>
      <text x={0} y={0} fontSize={6.4} fontWeight={800} fill={color} fillOpacity={0.8}>
        <LocalizedText>{text}</LocalizedText>
      </text>
    </g>
  );
}

export function Desk({ spot, standing = false, children }: { spot: Spot; standing?: boolean; children?: ReactNode }) {
  const { dx, dy } = spot;
  const top = standing ? 1.15 : 0.85;
  const mx = dx + 0.2;
  const my = dy + 0.12;
  const mw = 1.6;
  const md = 0.12;
  const mh = 1.1;
  const mz = top + 0.42;
  return (
    <g>
      <IsoBox x={dx} y={dy} w={0.12} d={1.2} h={top} color="#cdd5da" />
      <IsoBox x={dx + 2.08} y={dy} w={0.12} d={1.2} h={top} color="#cdd5da" />
      <IsoBox x={dx} y={dy} z={top} w={2.2} d={1.2} h={0.1} color="#ffffff" top="#ffffff" left="#e3e9ec" right="#d0d9de" />
      <IsoBox x={dx + 0.92} y={dy + 0.22} z={top + 0.1} w={0.16} d={0.12} h={0.32} color="#3b4144" />
      <IsoBox x={mx} y={my} z={mz} w={mw} d={md} h={mh} color="#2a2f32" top="#3b4144" left="#2a2f32" right="#1f2326" />
      <g transform={leftFaceMatrix(mx, my + md, mz + mh, mw, mh)}><LocalizedText>{children}</LocalizedText></g>
      <IsoBox x={dx + 0.55} y={dy + 0.6} z={top + 0.1} w={0.9} d={0.3} h={0.035} color="#4a5053" />
    </g>
  );
}

export function Glass({ at = [4.1, 7.3] }: { at?: Pt }) {
  const [x, y] = at;
  const [w, d, h] = [2.8, 2.8, 2.8];
  return (
    <g>
      <IsoBox x={x} y={y} w={w} d={d} h={h} color="#abc1cf" top="#dae7ee" left="#abc1cf" right="#9fb6c5" fillOpacity={0.3} stroke="#4875a1" />
      <g transform={leftFaceMatrix(x, y + d, h, w, h, 100, 100)}>
        <text x={50} y={12} textAnchor="middle" fontSize={7.5} fontWeight={800} fill="#375d84"><LocalizedText>
          No tools
        </LocalizedText></text>
      </g>
    </g>
  );
}

export function Vault({ blocked, at = [13.2, 0.6] }: { blocked: boolean; at?: Pt }) {
  const [x, y] = at;
  const [w, d, h] = [2.2, 1.6, 2.4];
  return (
    <g>
      <IsoBox x={x} y={y} w={w} d={d} h={h} color="#375d84" top="#5b84ad" left="#3f6891" right="#2f5274" />
      <g transform={leftFaceMatrix(x, y + d, h, w, h, 100, 100)}>
        <rect x={8} y={8} width={84} height={84} rx={6} fill="none" stroke="#dae7ee" strokeOpacity={0.5} strokeWidth={2} />
        <circle cx={50} cy={50} r={20} fill="none" stroke="#dae7ee" strokeWidth={4} />
        <path d="M50 30 V70 M30 50 H70" stroke="#dae7ee" strokeWidth={3} />
        <circle cx={50} cy={50} r={5} fill={blocked ? "#b4443c" : "#dae7ee"} />
      </g>
    </g>
  );
}

export function VaultSign({ blocked, at = [14.3, 1.4] }: { blocked: boolean; at?: Pt }) {
  const [x, y] = P(at[0], at[1], 2.75);
  const w = blocked ? 80 : 104;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <rect x={-w / 2} y={-16} width={w} height={16} rx={8} fill={blocked ? "#b4443c" : "#ffffff"} stroke={blocked ? "none" : "#dfe6ea"} strokeWidth={0.8} />
      <text x={0} y={-5.2} textAnchor="middle" fontSize={7.4} fontWeight={800} fill={blocked ? "#ffffff" : "#375d84"}>
        <LocalizedText>{blocked ? "Not in registry" : "Official accounts only"}</LocalizedText>
      </text>
    </g>
  );
}

export function Shelf({ at = [13.0, 6.45] }: { at?: Pt }) {
  const [x, y] = at;
  const [w, d, h] = [2.6, 0.5, 2.2];
  const spines = ["#dae7ee", "#abc1cf", "#4875a1", "#f3ece4", "#91999c", "#c9b9ab", "#6e5e52"];
  return (
    <g>
      <IsoBox x={x} y={y} w={w} d={d} h={h} color="#8f7f72" top="#a89a8e" left="#7d6e62" right="#6a5c51" />
      <g transform={leftFaceMatrix(x, y + d, h, w, h, 100, 100)}>
        {[10, 40, 70].map((row) => (
          <g key={row}>
            <rect x={6} y={row} width={88} height={24} fill="#5e5047" />
            {spines.map((c, i) => (
              <rect key={c} x={10 + i * 12} y={row + 4 + (i % 3)} width={8} height={20 - (i % 3)} fill={c} />
            ))}
          </g>
        ))}
      </g>
    </g>
  );
}

export function Plant({ at }: { at: Pt }) {
  const [x, y] = at;
  const [fx, fy] = P(x, y, 0.85);
  return (
    <g>
      <IsoBox x={x - 0.25} y={y - 0.25} w={0.5} d={0.5} h={0.45} color="#c9b9ab" />
      <circle cx={fx - 3} cy={fy + 2} r={8} fill="#3f7d5c" />
      <circle cx={fx + 4} cy={fy} r={7} fill="#4f9070" />
      <circle cx={fx} cy={fy - 5} r={6.5} fill="#5fa07f" />
    </g>
  );
}

/* ---------- People ---------- */

export function Head({ agent, x, y, z }: { agent: Agent; x: number; y: number; z: number }) {
  if (agent.hijab) {
    return (
      <>
        <IsoBox x={x - 0.33} y={y - 0.3} z={z - 0.23} w={0.66} d={0.6} h={0.32} color={agent.hair} />
        <IsoBox x={x - 0.29} y={y - 0.29} z={z} w={0.58} d={0.58} h={0.6} color={agent.hair} />
      </>
    );
  }
  // Seen from behind: the back of the head (front-left face) and the top are hair.
  return (
    <>
      <IsoBox x={x - 0.27} y={y - 0.27} z={z} w={0.54} d={0.54} h={0.52} color={agent.skin} top={agent.hair} left={agent.hair} right={shade(agent.skin, 0.82)} />
      <IsoBox x={x - 0.29} y={y - 0.29} z={z + 0.47} w={0.58} d={0.58} h={0.12} color={agent.hair} />
    </>
  );
}

export function Seated({ agent, at, delay }: { agent: Agent; at: Pt; delay: number }) {
  const [x, y] = at;
  const sleeve = shade(agent.color, 0.9);
  return (
    <g>
      <IsoBox x={x - 0.4} y={y - 0.05} z={0.45} w={0.8} d={0.65} h={0.1} color="#5d666b" />
      <IsoBox x={x - 0.44} y={y - 0.42} z={1.0} w={0.12} d={0.5} h={0.4} color={sleeve} />
      <IsoBox x={x - 0.32} y={y - 0.22} z={0.55} w={0.64} d={0.44} h={0.95} color={agent.color} />
      <IsoBox x={x + 0.32} y={y - 0.42} z={1.0} w={0.12} d={0.5} h={0.4} color={sleeve} />
      <IsoBox x={x - 0.4} y={y + 0.55} z={0.55} w={0.8} d={0.1} h={0.55} color="#5d666b" />
      <g className="agent-bob" style={{ animationDelay: `${delay}s` }}>
        <Head agent={agent} x={x} y={y} z={1.55} />
      </g>
    </g>
  );
}

export function Standing({ agent, at, legA, legB }: { agent: Agent; at: Pt; legA: Ref<SVGGElement>; legB: Ref<SVGGElement> }) {
  const [x, y] = at;
  const sleeve = shade(agent.color, 0.9);
  return (
    <g>
      <g ref={legA}>
        <IsoBox x={x - 0.24} y={y - 0.12} w={0.2} d={0.24} h={0.82} color="#3b4144" />
      </g>
      <g ref={legB}>
        <IsoBox x={x + 0.04} y={y - 0.12} w={0.2} d={0.24} h={0.82} color="#3b4144" />
      </g>
      <IsoBox x={x - 0.42} y={y - 0.12} z={1.0} w={0.12} d={0.24} h={0.7} color={sleeve} />
      <IsoBox x={x - 0.3} y={y - 0.2} z={0.82} w={0.6} d={0.4} h={0.92} color={agent.color} />
      <IsoBox x={x + 0.3} y={y - 0.12} z={1.0} w={0.12} d={0.24} h={0.7} color={sleeve} />
      <IsoBox x={x + 0.44} y={y - 0.2} z={1.1} w={0.05} d={0.42} h={0.5} color="#ffffff" />
      <Head agent={agent} x={x} y={y} z={1.78} />
    </g>
  );
}

function Walker({ agent, focused, label, reduce }: { agent: Agent; focused: boolean; label: string; reduce: boolean }) {
  const group = useRef<SVGGElement>(null);
  const legA = useRef<SVGGElement>(null);
  const legB = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reduce) return;
    const [ax, ay] = P(WALK_FROM[0], WALK_FROM[1]);
    const [bx, by] = P(WALK_TO[0], WALK_TO[1]);
    const period = 9000;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = ((now - t0) % period) / period;
      let k = 0;
      let walking = false;
      if (t >= 0.1 && t < 0.42) {
        k = (t - 0.1) / 0.32;
        walking = true;
      } else if (t >= 0.42 && t < 0.6) {
        k = 1;
      } else if (t >= 0.6 && t < 0.92) {
        k = 1 - (t - 0.6) / 0.32;
        walking = true;
      }
      group.current?.setAttribute("transform", `translate(${((bx - ax) * k).toFixed(2)} ${((by - ay) * k).toFixed(2)})`);
      const s = walking ? Math.sin(now / 85) * 1.5 : 0;
      legA.current?.setAttribute("transform", `translate(0 ${(-Math.max(0, s)).toFixed(2)})`);
      legB.current?.setAttribute("transform", `translate(0 ${(-Math.max(0, -s)).toFixed(2)})`);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const [tx, ty] = P(WALK_FROM[0], WALK_FROM[1], 2.6);
  return (
    <g ref={group}>
      {focused && <FocusRing at={WALK_FROM} />}
      <Standing agent={agent} at={WALK_FROM} legA={legA} legB={legB} />
      <Tag x={tx} y={ty} name={agent.name} text={label} focused={focused} inline />
    </g>
  );
}

/* ---------- Labels ---------- */

export function FocusRing({ at }: { at: Pt }) {
  const [cx, cy] = P(at[0], at[1]);
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={20} ry={11.6} fill="#4875a1" fillOpacity={0.14} stroke="#4875a1" strokeWidth={1.1} />
    </g>
  );
}

/**
 * Name pill above an agent. The agent in focus (or a blocked gate) expands to show what it is doing.
 * `inline` keeps a single line and swaps the name for the activity when focused (used for the walker).
 */
export function Tag({
  x,
  y,
  name,
  text,
  focused,
  warn = false,
  inline = false,
}: {
  x: number;
  y: number;
  name: string;
  text: string;
  focused: boolean;
  warn?: boolean;
  inline?: boolean;
}) {
  const strong = warn || focused;
  const expanded = strong && !inline;
  const label = inline && focused ? text : name;
  const labelW = 18 + label.length * 4.9;
  const w = expanded ? Math.max(labelW, 18 + text.length * 4.9) : labelW;
  const h = expanded ? 31 : 17;
  const top = -6 - h;
  const fill = warn ? "#b4443c" : focused ? "#4875a1" : "#ffffff";
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <g style={{ filter: "drop-shadow(0 2px 3px rgba(32,33,33,0.16))" }}>
        <rect x={-w / 2} y={top} width={w} height={h} rx={8.5} fill={fill} stroke={strong ? "none" : "#dfe6ea"} strokeWidth={0.8} />
        <path d="M-4.5 -6.4 L0 -1.4 L4.5 -6.4 Z" fill={fill} />
      </g>
      <text x={-w / 2 + 9} y={top + 11.6} fontSize={8.2} fontWeight={inline && focused ? 700 : 800} fill={strong ? "#ffffff" : "#202121"}>
        <LocalizedText>{label}</LocalizedText>
      </text>
      {expanded && (
        <text x={-w / 2 + 9} y={top + 24.5} fontSize={8} fontWeight={600} fill="rgba(255,255,255,0.9)">
          <LocalizedText>{text}</LocalizedText>
        </text>
      )}
    </g>
  );
}

function FocusCard({ agent, state }: { agent: Agent; state: number }) {
  const blocked = agent.id === "gate" && state === 2;
  return (
    <div
      className={`absolute bottom-4 left-4 hidden w-[min(310px,calc(100%-2rem))] sm:flex items-center gap-3 rounded-2xl border bg-white/95 p-3 pr-4 shadow-[0_14px_30px_-14px_rgba(32,33,33,0.4)] ${
        blocked ? "border-danger/40" : "border-line"
      }`}
    >
      <Minifig skin={agent.skin} hair={agent.hair} hijab={agent.hijab} shirt={agent.color} className="h-12 w-12 shrink-0 rounded-xl bg-mist" />
      <div className="min-w-0">
        <p className={`text-xs font-medium ${blocked ? "text-danger" : "text-ink-2"}`}><LocalizedText>{blocked ? "Payment blocked in case C1" : "Working on case C1"}</LocalizedText></p>
        <p className="mt-0.5 font-semibold text-lead"><LocalizedText>{agent.name}</LocalizedText></p>
        <p className={`text-sm leading-snug ${blocked ? "text-danger" : "text-ink-2"}`}><LocalizedText>{agent.detail[state]}</LocalizedText></p>
      </div>
    </div>
  );
}

/* ---------- Monitor screens (drawn flat, then mapped onto the screen face) ---------- */

function Check({ x, y }: { x: number; y: number }) {
  return <path d={`M${x} ${y} l6 6 l12 -14`} stroke="#3f7d5c" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}

export function Screen({ id, state }: { id: AgentId; state: number }) {
  let body: ReactNode = null;
  switch (id) {
    case "clerk":
      body = (
        <>
          <rect x={10} y={10} width={40} height={5} rx={1} fill="#91999c" />
          {[20, 30, 40].map((yy, i) => (
            <g key={yy}>
              <rect x={10} y={yy} width={26} height={4} rx={1} fill="#c7d0d5" />
              <rect x={40} y={yy - 1} width={i === state ? 46 : 34} height={6} rx={1} fill="#202121" />
            </g>
          ))}
          <rect x={10} y={51} width={46} height={9} rx={4.5} fill="#4875a1" />
          <text x={14} y={58} fontSize={6.5} fontWeight={700} fill="#ffffff"><LocalizedText>
            [PASIEN_1]
          </LocalizedText></text>
        </>
      );
      break;
    case "reader":
      body = (
        <>
          <rect x={10} y={10} width={30} height={5} rx={1} fill="#4875a1" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x={10} y={20 + i * 7.5} width={42} height={4} rx={1} fill="#c7d0d5" />
              <rect x={66} y={20 + i * 7.5} width={20} height={4} rx={1} fill="#91999c" />
            </g>
          ))}
          <rect x={10} y={59} width={76} height={3} rx={1.5} fill="#e3e9ec" />
          <rect x={10} y={59} width={[30, 56, 76][state]} height={3} rx={1.5} fill="#3f7d5c" />
        </>
      );
      break;
    case "calculator":
      body = (
        <>
          <rect x={10} y={13} width={56} height={9} rx={2} fill="#abc1cf" />
          <rect x={10} y={27} width={72} height={9} rx={2} fill="#4875a1" />
          <rect x={66} y={27} width={16} height={9} rx={2} fill={state === 2 ? "#9a6212" : "#375d84"} />
          <text x={10} y={55} fontSize={12} fontWeight={800} fill="#202121">
            +¥3,000
          </text>
        </>
      );
      break;
    case "second":
      body = (
        <>
          <text x={16} y={24} fontSize={10} fontWeight={800} fill="#4e5659"><LocalizedText>
            A
          </LocalizedText></text>
          <text x={60} y={24} fontSize={10} fontWeight={800} fill="#4e5659"><LocalizedText>
            B
          </LocalizedText></text>
          <Check x={12} y={42} />
          <LocalizedText>{state === 2 ? (
            <text x={58} y={52} fontSize={22} fontWeight={800} fill="#9a6212">
              ≠
            </text>
          ) : (
            <Check x={56} y={42} />
          )}</LocalizedText>
        </>
      );
      break;
    case "planner":
      body = (
        <>
          <rect x={8} y={10} width={54} height={14} rx={6} fill="#e3e9ec" />
          <rect x={38} y={29} width={54} height={14} rx={6} fill="#4875a1" />
          <rect x={8} y={48} width={state === 1 ? 46 : 32} height={12} rx={6} fill="#e3e9ec" />
        </>
      );
      break;
    case "gate": {
      const c = state === 2 ? "#b4443c" : state === 1 ? "#3f7d5c" : "#4875a1";
      body = (
        <>
          <path d="M50 9 L68 16 V30 C68 42 60 51 50 55 C40 51 32 42 32 30 V16 Z" fill={c} />
          <LocalizedText>{state === 2 ? (
            <path d="M43 25 L57 39 M57 25 L43 39" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
          ) : (
            <path d="M42 32 l6 6 l11 -12" stroke="#ffffff" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}</LocalizedText>
          <text x={50} y={64} fontSize={7} fontWeight={700} textAnchor="middle" fill="#4e5659">
            <LocalizedText>{state === 2 ? "•••• 9071" : "•••• 2222"}</LocalizedText>
          </text>
        </>
      );
      break;
    }
    case "auditor":
      body = (
        <>
          {[8, 38, 68].map((xx, i) => (
            <g key={xx}>
              <rect x={xx} y={16} width={24} height={20} rx={3} fill={i === 2 ? "#6e5e52" : "#b9aca2"} />
              {i < 2 && <rect x={xx + 24} y={25} width={6} height={2} fill="#91999c" />}
            </g>
          ))}
          <text x={8} y={55} fontSize={9} fontWeight={800} fill="#6e5e52">
            <LocalizedText>{state === 2 ? "FISCO ✓" : `#4${state + 1}`}</LocalizedText>
          </text>
        </>
      );
      break;
  }
  return (
    <>
      <rect x={4} y={4} width={92} height={62} rx={2} fill="#fbfdfe" />
      <LocalizedText>{body}</LocalizedText>
      <rect x={84} y={58} width={6} height={2.4} fill="#4875a1" className="blink" />
    </>
  );
}
