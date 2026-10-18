"use client";

import type { ReactNode } from "react";
import { Desk, FocusRing, Glass, Plant, Screen, Seated, Shelf, Standing, Tag, Vault, VaultSign, seat, type Spot } from "@/components/landing/AgentOffice";
import { AGENT_BY_ID, AGENTS, type AgentId } from "@/components/landing/agents";
import { H, IsoBox, P, floorMatrix, leftFaceMatrix, pts, rightFaceMatrix, shade } from "@/components/landing/iso";
import { ROOMS, type AgentState, type AgentStatus, type RoomId } from "./model";

// The case office: the landing page's agents, grown into five rooms on one floor plus the
// coordination den hanging beneath the front-right corner. World units as in iso.tsx; the
// main floor is 21 × 12. What an agent is doing comes in through `status` (in the app: the
// case's audit log). Nothing here animates as "work" on its own.

const DEN = 5; // the den's floor sits 5 units below the main floor

const DESK: Record<AgentId, Spot> = {
  clerk: { dx: 0.6, dy: 2.4 },
  reader: { dx: 4.0, dy: 1.2 },
  calculator: { dx: 7.9, dy: 0.9 },
  second: { dx: 11.0, dy: 0.9 },
  gate: { dx: 14.9, dy: 1.0 },
  auditor: { dx: 11.6, dy: 7.0 },
  planner: { dx: 13.2, dy: 10.15 },
};

// Monitor picture per state: 0 = start, 1 = in progress, 2 = result (see Screen in AgentOffice).
const SCREEN_STATE: Record<AgentState, number> = { idle: 0, waiting: 0, working: 1, done: 2, blocked: 2 };

const quad = (x0: number, y0: number, x1: number, y1: number, z = 0) => pts([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)]);

/* ---------- Building ---------- */

const WALL = { color: "#f2eee9", top: "#fbfaf8", left: "#eee8e1", right: "#ddd3c8" };

function Partition({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  return <IsoBox x={x} y={y} w={w} d={d} h={1.1} color={WALL.color} top={WALL.top} left={WALL.left} right={WALL.right} />;
}

/** A window drawn flat (100 × 70) and mapped onto a wall face. */
function WindowPane() {
  return (
    <>
      <rect x={0} y={0} width={100} height={70} rx={4} fill="#ffffff" />
      <rect x={6} y={6} width={88} height={58} rx={2} fill="#dae7ee" />
      <path d="M6 44 Q30 30 52 40 T94 34 V64 H6 Z" fill="#abc1cf" fillOpacity={0.55} />
      <rect x={48} y={6} width={4} height={58} fill="#ffffff" />
      <rect x={6} y={33} width={88} height={3} fill="#ffffff" />
    </>
  );
}

// Back rooms are named on the back wall, above their window (their floor is hidden behind the partition).
const BACK_ROOMS: { x: number; name: string }[] = [
  { x: 1.4, name: "Intake" },
  { x: 8.6, name: "Analysis" },
  { x: 15.3, name: "Vault" },
];

function BackWalls() {
  return (
    <g>
      {/* Back wall (along x) and left wall (along y): only their inside faces and ends show. */}
      <IsoBox x={-0.3} y={-0.3} w={21.3} d={0.3} h={3.8} color={WALL.color} top={WALL.top} left={WALL.left} right={WALL.right} />
      {BACK_ROOMS.map(({ x, name }) => (
        <g key={x}>
          <g transform={leftFaceMatrix(x, 0, 2.7, 2.2, 1.4)}>
            <WindowPane />
          </g>
          <g transform={leftFaceMatrix(x, 0, 3.6, 2.6, 0.7, 130, 35)}>
            <text x={0} y={27} fontSize={27} fontWeight={800} fill="#375d84">
              {name}
            </text>
          </g>
        </g>
      ))}
      <IsoBox x={-0.3} y={0} w={0.3} d={12} h={3.8} color={WALL.color} top={WALL.top} left={WALL.left} right="#f6f2ee" />
      {[2.6, 7.6].map((y) => (
        <g key={y} transform={rightFaceMatrix(0, y, 2.7, 2.2, 1.4)}>
          <WindowPane />
        </g>
      ))}
    </g>
  );
}

function Floor({ selectedRoom, onSelectRoom }: { selectedRoom?: RoomId; onSelectRoom?: (id: RoomId) => void }) {
  return (
    <g>
      <IsoBox x={0} y={0} z={-0.6} w={21} d={12} h={0.6} color="#efe9e2" top="#f7f4f0" left="#e6ddd3" right="#d6cbbf" />
      {(Object.keys(ROOMS) as RoomId[])
        .filter((id) => id !== "den")
        .map((id) => {
          const r = ROOMS[id];
          const on = id === selectedRoom;
          return (
            <polygon
              key={id}
              points={quad(r.x0 + 0.15, r.y0 + 0.15, r.x1 - 0.15, r.y1 - 0.15)}
              fill={r.floor}
              stroke={on ? "#4875a1" : "none"}
              strokeWidth={on ? 1.6 : 0}
              onClick={onSelectRoom ? () => onSelectRoom(id) : undefined}
              className={onSelectRoom ? "cursor-pointer" : undefined}
            />
          );
        })}
      {/* Warm light falling in from the windows. */}
      {[
        [1.6, 0.2, 3.8, 3.4],
        [8.8, 0.2, 11.0, 3.2],
        [15.5, 0.2, 17.7, 3.0],
      ].map(([x0, y0, x1, y1]) => (
        <polygon key={x0} points={quad(x0, y0, x1, y1)} fill="#fff6ea" fillOpacity={0.7} />
      ))}
      <polygon points={pts([P(0.2, 2.6), P(3.2, 3.4), P(3.2, 5.6), P(0.2, 4.8)])} fill="#fff6ea" fillOpacity={0.6} />
      <polygon points={pts([P(0.2, 7.6), P(3.4, 8.4), P(3.4, 10.6), P(0.2, 9.8)])} fill="#fff6ea" fillOpacity={0.6} />
    </g>
  );
}

function FloorLabel({ x, y, text, color = "#375d84" }: { x: number; y: number; text: string; color?: string }) {
  return (
    <g transform={floorMatrix(x, y)}>
      <text x={0} y={0} fontSize={7.5} fontWeight={800} fill={color} fillOpacity={0.75}>
        {text}
      </text>
    </g>
  );
}

/* ---------- Library ---------- */

function DecisionBoard() {
  const [x, y, w, d] = [6.3, 6.3, 3.0, 0.15];
  return (
    <g>
      <IsoBox x={x + 0.2} y={y} w={0.1} d={0.1} h={0.6} color="#8f7f72" />
      <IsoBox x={x + w - 0.3} y={y} w={0.1} d={0.1} h={0.6} color="#8f7f72" />
      <IsoBox x={x} y={y} z={0.6} w={w} d={d} h={1.9} color="#ffffff" left="#ffffff" right="#e3e9ec" top="#f3f7f9" />
      <g transform={leftFaceMatrix(x, y + d, 2.5, w, 1.9, 150, 95)}>
        <text x={8} y={14} fontSize={9} fontWeight={800} fill="#202121">
          Questions for the hospital
        </text>
        <rect x={8} y={20} width={134} height={16} rx={3} fill="#f6ecdc" />
        <text x={13} y={31} fontSize={7.5} fontWeight={700} fill="#9a6212">
          I35 pillow cases billed separately
        </text>
        <text x={8} y={52} fontSize={9} fontWeight={800} fill="#202121">
          Reviewed
        </text>
        <rect x={8} y={58} width={134} height={14} rx={3} fill="#e4f0e9" />
        <text x={13} y={68} fontSize={7.5} fontWeight={700} fill="#3f7d5c">
          Bill D2 explained, 3 changes
        </text>
        <rect x={8} y={76} width={134} height={14} rx={3} fill="#e4f0e9" />
        <text x={13} y={86} fontSize={7.5} fontWeight={700} fill="#3f7d5c">
          Estimate D1 read
        </text>
      </g>
    </g>
  );
}

/** One folder per document of the case, on the reading table. Thicker folder = more items. */
function DocumentTable() {
  const [x, y, w, d, h] = [2.0, 8.6, 3.8, 1.6, 0.75];
  return (
    <g>
      <IsoBox x={x + 0.15} y={y + 0.15} w={0.15} d={0.15} h={h} color="#8f7f72" />
      <IsoBox x={x + w - 0.3} y={y + d - 0.3} w={0.15} d={0.15} h={h} color="#8f7f72" />
      <IsoBox x={x} y={y} z={h - 0.1} w={w} d={d} h={0.1} color="#c9b9ab" top="#d8cbbf" />
      <IsoBox x={x + 0.25} y={y + 0.25} z={h} w={0.95} d={1.1} h={0.12} color="#abc1cf" />
      <IsoBox x={x + 1.45} y={y + 0.2} z={h} w={0.95} d={1.15} h={0.3} color="#4875a1" />
      <polygon points={quad(x + 2.7, y + 0.25, x + 3.6, y + 1.35, h)} fill="none" stroke="#91999c" strokeWidth={0.8} strokeDasharray="2 2" />
    </g>
  );
}

/* ---------- Records ---------- */

function ChainRack({ x }: { x: number }) {
  const [y, w, d, h] = [6.35, 1.1, 0.8, 2.1];
  return (
    <g>
      <IsoBox x={x} y={y} w={w} d={d} h={h} color="#6e5e52" top="#857467" />
      <g transform={leftFaceMatrix(x, y + d, h, w, h, 60, 100)}>
        {[12, 40, 68].map((yy, i) => (
          <g key={yy}>
            <rect x={14} y={yy} width={32} height={18} rx={3} fill={i === 2 ? "#dae7ee" : "#b9aca2"} />
            {i < 2 && <rect x={29} y={yy + 18} width={2} height={10} fill="#dae7ee" />}
          </g>
        ))}
      </g>
    </g>
  );
}

function Hatch() {
  // The opening in the Records floor that leads down to the den.
  const [x0, y0, x1, y1] = [11.7, 10.1, 13.7, 11.6];
  return (
    <g>
      <polygon points={quad(x0, y0, x1, y1)} fill="#3a4650" />
      <polygon points={quad(x0 + 0.2, y0 + 0.1, x1, y0 + 0.5, -0.2)} fill="#56636d" />
      <IsoBox x={x0} y={y0 - 0.06} w={x1 - x0} d={0.06} h={0.7} color="#91999c" />
      <IsoBox x={x0 - 0.06} y={y0} w={0.06} d={y1 - y0} h={0.7} color="#91999c" />
    </g>
  );
}

/* ---------- Coordination den ---------- */

function CoordinationScreen() {
  const [x, y, w, d, z, h] = [16.5, 10.0, 3.2, 0.15, -DEN + 0.6, 1.75];
  const steps = [
    { t: "Intake", c: "#3f7d5c" },
    { t: "Analysis", c: "#3f7d5c" },
    { t: "Pledges", c: "#4875a1" },
    { t: "Pay", c: "#91999c" },
  ];
  return (
    <g>
      <IsoBox x={x + 0.3} y={y} z={-DEN} w={0.12} d={0.12} h={0.6} color="#3b4144" />
      <IsoBox x={x + w - 0.4} y={y} z={-DEN} w={0.12} d={0.12} h={0.6} color="#3b4144" />
      <IsoBox x={x} y={y} z={z} w={w} d={d} h={h} color="#2a2f32" top="#3b4144" />
      <g transform={leftFaceMatrix(x, y + d, z + h, w, h, 160, 88)}>
        <rect x={4} y={4} width={152} height={80} rx={3} fill="#fbfdfe" />
        <text x={10} y={18} fontSize={9} fontWeight={800} fill="#202121">
          Case C1 plan
        </text>
        {steps.map((s, i) => (
          <g key={s.t}>
            <rect x={10 + i * 36} y={28} width={32} height={6} rx={3} fill={s.c} />
            <text x={10 + i * 36} y={46} fontSize={7} fontWeight={700} fill="#4e5659">
              {s.t}
            </text>
          </g>
        ))}
        <text x={10} y={66} fontSize={8} fontWeight={700} fill="#202121">
          Pledged CNY 45,000 of 50,000
        </text>
        <rect x={10} y={71} width={140} height={4} rx={2} fill="#e3e9ec" />
        <rect x={10} y={71} width={126} height={4} rx={2} fill="#4875a1" />
      </g>
    </g>
  );
}

function Den({ lit, children }: { lit: boolean; children: ReactNode }) {
  const wall = lit ? "#9db3c4" : "#5d6b75";
  const floor = lit ? "#d9e3ea" : "#4b5761";
  return (
    <g style={{ filter: lit ? "none" : "brightness(0.78) saturate(0.85)", transition: "filter 400ms" }}>
      <IsoBox x={10.7} y={8.7} z={-DEN - 0.2} w={10.6} d={3.3} h={0.2} color={floor} top={floor} />
      <IsoBox x={10.7} y={8.7} z={-DEN} w={10.6} d={0.3} h={DEN - 0.6} color={wall} />
      <IsoBox x={10.7} y={9} z={-DEN} w={0.3} d={3} h={DEN - 0.6} color={wall} />
      {lit && <ellipse cx={P(16, 10.8, -DEN)[0]} cy={P(16, 10.8, -DEN)[1]} rx={120} ry={30} fill="#fff6ea" fillOpacity={0.7} />}
      {children}
      <IsoBox x={21} y={9} z={-DEN - 0.2} w={0.3} d={3} h={DEN - 0.4} color={shade(wall, 0.92)} />
    </g>
  );
}

/* ---------- Scene ---------- */

export type OfficeSceneProps = {
  status: Record<AgentId, AgentStatus>;
  selected?: AgentId | null;
  /** Agents to ring without expanding their tag (e.g. the ones working on the current page). */
  highlight?: AgentId[];
  selectedRoom?: RoomId;
  denLit?: boolean;
  viewBox?: string;
  onSelectAgent?: (id: AgentId) => void;
  onSelectRoom?: (id: RoomId) => void;
};

export function OfficeScene({ status, selected = null, highlight = [], selectedRoom, denLit = false, viewBox = "-245 -98 660 588", onSelectAgent, onSelectRoom }: OfficeSceneProps) {
  const st = (id: AgentId) => SCREEN_STATE[status[id].state];
  const deskOf = (id: AgentId) => (
    <Desk spot={DESK[id]} standing={id === "second"}>
      <Screen id={id} state={st(id)} />
    </Desk>
  );
  const sit = (id: AgentId, delay: number) => <Seated agent={AGENT_BY_ID[id]} at={seat(DESK[id])} delay={delay} />;
  const ring = (id: AgentId) => (selected === id || highlight.includes(id)) && <FocusRing at={seat(DESK[id])} />;
  const denShift = `translate(0 ${DEN * H})`;

  // Name tags float above everything; the selected agent's tag also says what it is doing.
  const tagZ: Partial<Record<AgentId, number>> = { reader: 3.05, second: 2.6, planner: 2.45 - DEN };
  const tags = AGENTS.map((a) => {
    const [sx, sy] = seat(DESK[a.id]);
    const [x, y] = P(sx, sy, tagZ[a.id] ?? 2.45);
    return { id: a.id, x, y };
  });

  return (
    <svg
      viewBox={viewBox}
      className="h-full w-full"
      role="img"
      aria-label="The case office: Intake, Analysis, Vault, Library and Records rooms, with the coordination den underneath."
    >
      <Den lit={denLit || selected === "planner" || selectedRoom === "den"}>
        <g transform={denShift}>
          {ring("planner")}
          {deskOf("planner")}
          {sit("planner", 0.4)}
        </g>
        <CoordinationScreen />
      </Den>

      <Floor selectedRoom={selectedRoom} onSelectRoom={onSelectRoom} />
      <BackWalls />
      <FloorLabel x={0.5} y={11.6} text="Library" color="#6e5e52" />
      <FloorLabel x={14.5} y={11.6} text="Records" color="#6e5e52" />

      {/* Intake */}
      {ring("clerk")}
      {deskOf("clerk")}
      {sit("clerk", 0.3)}
      {ring("reader")}
      {deskOf("reader")}
      {sit("reader", 1.5)}
      <Glass at={[3.7, 0.9]} />
      <Plant at={[6.3, 5.2]} />
      <Partition x={6.88} y={0} w={0.24} d={2.2} />
      <Partition x={6.88} y={3.8} w={0.24} d={2.2} />

      {/* Analysis */}
      {ring("calculator")}
      {deskOf("calculator")}
      {sit("calculator", 0.7)}
      {ring("second")}
      {deskOf("second")}
      <Standing agent={AGENT_BY_ID.second} at={seat(DESK.second)} legA={null} legB={null} />
      <Partition x={13.88} y={0} w={0.24} d={2.2} />
      <Partition x={13.88} y={3.8} w={0.24} d={2.2} />

      {/* Vault */}
      {ring("gate")}
      {deskOf("gate")}
      {sit("gate", 1.1)}
      <Vault at={[18.4, 0.5]} blocked={status.gate.state === "blocked"} />
      <Plant at={[20.4, 5.2]} />

      {/* Wall between the back rooms and the front rooms, with doors. */}
      <Partition x={0} y={5.88} w={2.6} d={0.24} />
      <Partition x={4.4} y={5.88} w={7.2} d={0.24} />
      <Partition x={13.4} y={5.88} w={3.6} d={0.24} />
      <Partition x={18.8} y={5.88} w={2.2} d={0.24} />

      {/* Library */}
      <Shelf at={[0.5, 6.25]} />
      <Shelf at={[3.3, 6.25]} />
      <DecisionBoard />
      <DocumentTable />
      <Plant at={[9.3, 11.3]} />
      <Partition x={9.88} y={6} w={0.24} d={2} />
      <Partition x={9.88} y={9.6} w={0.24} d={2.4} />

      {/* Records */}
      {ring("auditor")}
      {deskOf("auditor")}
      {sit("auditor", 0.9)}
      <ChainRack x={16.0} />
      <ChainRack x={17.4} />
      <ChainRack x={18.8} />
      <IsoBox x={19.9} y={8.2} w={0.7} d={0.7} h={1.2} color="#375d84" />
      <Hatch />

      {tags.map(({ id, x, y }) => {
        const s = status[id];
        return (
          <Tag
            key={id}
            x={x}
            y={y}
            name={AGENT_BY_ID[id].name}
            text={s.text}
            focused={selected === id}
            warn={s.state === "blocked"}
          />
        );
      })}
      <VaultSign at={[19.5, 1.3]} blocked={status.gate.state === "blocked"} />
      <Tag x={P(3.4, 9.3, 1.4)[0]} y={P(3.4, 9.3, 1.4)[1]} name="Estimate D1, bill D2" text="" focused={false} />
      <Tag x={P(20.25, 8.55, 1.85)[0]} y={P(20.25, 8.55, 1.85)[1]} name="FISCO BCOS" text="" focused={false} />
      <Tag x={P(19.6, 12.3, -1.6)[0]} y={P(19.6, 12.3, -1.6)[1]} name="Coordination den" text="" focused={false} />

      {/* Click targets over each agent and their name tag (the team list is the keyboard path). */}
      {onSelectAgent &&
        tags.map(({ id, x, y }) => {
          const [sx, sy] = seat(DESK[id]);
          const [fx, fy] = P(sx, sy, id === "planner" ? -DEN : 0);
          return (
            <g key={`hit-${id}`} onClick={() => onSelectAgent(id)} className="cursor-pointer" aria-hidden="true">
              <rect x={fx - 17} y={fy - 46} width={34} height={56} fill="transparent" />
              <rect x={x - 44} y={y - 26} width={88} height={22} fill="transparent" />
            </g>
          );
        })}
    </svg>
  );
}
