import type { AgentId } from "@/components/landing/agents";
import { P } from "@/components/landing/iso";

// Plain data about the case office, shared by the scene (client) and server pages.

export type RoomId = "intake" | "analysis" | "vault" | "library" | "records" | "den";
export type AgentState = "working" | "waiting" | "idle" | "done" | "blocked";
/** `text` is the short line on the name tag; `detail` is the sentence in the team list. */
export type AgentStatus = { state: AgentState; text: string; detail: string };

export const ROOMS: Record<RoomId, { name: string; floor: string; x0: number; x1: number; y0: number; y1: number }> = {
  intake: { name: "Intake", floor: "#eaf1f5", x0: 0, x1: 7, y0: 0, y1: 6 },
  analysis: { name: "Analysis", floor: "#e3ebf0", x0: 7, x1: 14, y0: 0, y1: 6 },
  vault: { name: "Vault", floor: "#dfe8ef", x0: 14, x1: 21, y0: 0, y1: 6 },
  library: { name: "Library", floor: "#f1ebe5", x0: 0, x1: 10, y0: 6, y1: 12 },
  records: { name: "Records", floor: "#ebe3dc", x0: 10, x1: 21, y0: 6, y1: 12 },
  den: { name: "Coordination den", floor: "#d9e3ea", x0: 10.7, x1: 21.3, y0: 8.7, y1: 12 },
};

export const AGENT_ROOM: Record<AgentId, RoomId> = {
  clerk: "intake",
  reader: "intake",
  calculator: "analysis",
  second: "analysis",
  gate: "vault",
  auditor: "records",
  planner: "den",
};

/** Whole office in SVG units. */
export const FULL_VIEW: [number, number, number, number] = [-245, -98, 660, 588];

/** A view box that frames one room (used by "Step inside" and by the agents panel on each page). */
export function roomView(id: RoomId): [number, number, number, number] {
  const r = ROOMS[id];
  const [zLo, zHi] = id === "den" ? [-5.4, -0.2] : [0, 4.4];
  const corners = [r.x0, r.x1].flatMap((x) => [r.y0, r.y1].flatMap((y) => [zLo, zHi].map((z) => P(x, y, z))));
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const pad = 18;
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return [x, y, Math.max(...xs) + pad - x, Math.max(...ys) + pad - y];
}

/** Room order for the arrow keys in "Step inside". */
export const ROOM_GRID: Record<RoomId, { left?: RoomId; right?: RoomId; up?: RoomId; down?: RoomId }> = {
  intake: { right: "analysis", down: "library" },
  analysis: { left: "intake", right: "vault", down: "records" },
  vault: { left: "analysis", down: "records" },
  library: { up: "intake", right: "records" },
  records: { left: "library", up: "analysis", down: "den" },
  den: { up: "records" },
};

/**
 * Sample status of each agent at the demo moment (bill D2 explained, guarantee R2 open).
 * In the app this comes from the case log (GET /api/cases/:caseId/audit) and is labelled as sample until then.
 */
export const SAMPLE_STATUS: Record<AgentId, AgentStatus> = {
  clerk: { state: "done", text: "names hidden in D2", detail: "Hid the patient’s name and ID numbers in bill D2 before any AI read it." },
  reader: { state: "done", text: "read D2, 40 items", detail: "Read bill D2 behind glass: 40 items that add up to the stated total." },
  calculator: { state: "done", text: "D2 compared", detail: "Compared bill D2 with the estimate: CNY 2,782 above its top, mostly the 2 extra days." },
  second: { state: "done", text: "4 items checked", detail: "Double-checked 4 items with a second model. Both agree, 3 became questions." },
  planner: { state: "working", text: "CNY 5,000 missing", detail: "Following the emergency guarantee: CNY 5,000 still missing, 1 helper hasn’t replied." },
  gate: { state: "waiting", text: "waiting for pledges", detail: "Holding guarantee R2 until pledges cover CNY 50,000. Blocked a fake account today." },
  auditor: { state: "working", text: "19 steps recorded", detail: "Recorded 19 steps. The chain is intact and its head is anchored on FISCO BCOS." },
};
