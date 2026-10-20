import { Minifig } from "../../../src/components/landing/Minifig";
import { AGENTS, FAMILY } from "../../../src/components/landing/agents";
import { Building } from "../../../src/components/landing/icons";
import { OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import offsets from "../../public/rec/offsets.json";
import { C, FPS, SANS, STAGE, shadow } from "../theme";
import type { Scene, TimedLine } from "../timeline";

// A product scene: the screen recording in the stage, the role badge and a short callout in the
// strip above it (never on top of the recording).

const STRIP = 72;
const REC = { x: STAGE.x, y: STAGE.y + STRIP + 14, w: STAGE.w, h: Math.round((STAGE.w * 900) / 1440) };
type Mark = { start: number; end: number };
const OFF = offsets as unknown as Record<string, number | Record<string, Mark>>;

const ROLE_LOOK: Record<string, { look: { skin: string; hair: string; hijab?: boolean; shirt: string } | null; name: string }> = {
  Owner: { look: FAMILY[0], name: "Rina" },
  Payer: { look: null, name: "Mosque fund" },
  Companion: { look: { skin: "#e3b48c", hair: "#5d4a5a", hijab: true, shirt: "#91999c" }, name: "Dewi" },
};
const AGENT_FOR: Record<string, string> = { "Payment Gate": "gate", "Blocked at check 5": "gate", Calculator: "calculator", "Cited lines": "calculator", Questions: "planner", "Case Assistant": "planner", Auditor: "auditor", Privacy: "clerk", Upload: "clerk", "FX quote": "gate", Receipts: "gate", "Sandbox checkout": "gate", "Hospital invoice": "auditor", "Closing documents": "auditor", "Closing checklist": "auditor", Refunds: "auditor", "Refund tracking": "auditor", Attack: "gate" };

function segments(scene: Scene) {
  const marks = (OFF[`${scene.id}:marks`] ?? {}) as Record<string, Mark>;
  return scene.lines.map((l, i) => {
    const next = scene.lines[i + 1];
    const from = i === 0 ? 0 : l.from;
    const to = next ? next.from : scene.frames;
    const frames = to - from;
    const m = marks[l.id];
    const lead = i === 0 ? l.from / FPS : 0;
    // Show the result of the line's actions: start at the action, or later if the action ran long.
    const start = m ? Math.max(m.start - lead, m.end + 0.9 - frames / FPS) : (OFF[scene.id] as number) + l.from / FPS;
    return { line: l, from, frames, startFrom: Math.max(0, Math.round(start * FPS)) };
  });
}

function RoleBadge({ role }: { role: string }) {
  const who = ROLE_LOOK[role];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.serpentDark, color: C.white, borderRadius: 999, padding: "6px 20px 6px 6px", fontFamily: SANS, boxShadow: shadow }}>
      {who && <div style={{ width: 44, height: 44, borderRadius: 999, background: C.firstlight, overflow: "hidden", display: "grid", placeItems: "center", color: C.chocolate }}>{who.look ? <Minifig {...who.look} className="fill" /> : <div style={{ width: 26, height: 26 }}><Building className="fill" /></div>}</div>}
      <span style={{ fontSize: 22, fontWeight: 700 }}>{who ? `${who.name} · ${role}` : role}</span>
    </div>
  );
}

function Callout({ line }: { line: TimedLine }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 200 } });
  if (!line.callout) return null;
  const [label, text] = line.callout;
  const agent = AGENTS.find((a) => a.id === (AGENT_FOR[label] ?? "gate"))!;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: C.white, borderRadius: 18, padding: "8px 22px 8px 8px", border: `1px solid ${C.line}`, boxShadow: shadow, fontFamily: SANS, opacity: s, transform: `translateY(${(1 - s) * -8}px)` }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: C.firstlight, overflow: "hidden" }}><Minifig skin={agent.skin} hair={agent.hair} hijab={agent.hijab} shirt={agent.color} className="fill" /></div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.serpent, letterSpacing: 0.2 }}>{label}</div>
        <div style={{ fontSize: 23, fontWeight: 700, color: C.lead, lineHeight: 1.15 }}>{text}</div>
      </div>
    </div>
  );
}

export function Recorded({ scene }: { scene: Scene }) {
  const f = useCurrentFrame();
  const enter = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const exit = interpolate(f, [scene.frames - 8, scene.frames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <>
      <div style={{ position: "absolute", left: REC.x, top: REC.y, width: REC.w, height: REC.h, borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 60px -30px rgba(32,33,33,0.45), 0 0 0 1px rgba(32,33,33,0.08)", background: C.white, opacity: Math.min(enter, exit) }}>
        {segments(scene).map((s) => (
          <Sequence key={s.line.id} from={s.from} durationInFrames={s.frames} layout="none">
            <OffthreadVideo src={staticFile(`rec/${scene.id}.webm`)} startFrom={s.startFrom} muted style={{ width: "100%", height: "100%", display: "block" }} />
          </Sequence>
        ))}
      </div>
      {segments(scene).map((s) => (
        <Sequence key={`${s.line.id}-top`} from={s.from} durationInFrames={s.frames} layout="none">
          <div style={{ position: "absolute", left: STAGE.x, top: STAGE.y, width: STAGE.w, height: STRIP, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {s.line.role ? <RoleBadge role={s.line.role} /> : <span />}
            <Callout line={s.line} />
          </div>
        </Sequence>
      ))}
    </>
  );
}
