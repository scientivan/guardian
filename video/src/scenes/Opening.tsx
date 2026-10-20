import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Minifig } from "../../../src/components/landing/Minifig";
import { AGENTS, FAMILY } from "../../../src/components/landing/agents";
import { Coins, Doc, Hospital, ShieldMark } from "../../../src/components/landing/icons";
import { Card, Stage, useEnter } from "../Frame";
import { C, SANS, SERIF, STAGE } from "../theme";
import type { Scene } from "../timeline";

const CX = STAGE.w / 2;
const CY = (STAGE.h - 90) / 2;

/** Dashed connector that draws itself from a to b. */
function Link({ a, b, start }: { a: [number, number]; b: [number, number]; start: number }) {
  const f = useCurrentFrame();
  const p = interpolate(f - start, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = a[0] + (b[0] - a[0]) * p, y = a[1] + (b[1] - a[1]) * p;
  return <line x1={a[0]} y1={a[1]} x2={x} y2={y} stroke={C.lead} strokeOpacity={0.55} strokeWidth={3} strokeDasharray="12 10" strokeLinecap="round" />;
}

function Tile({ x, y, children, delay, size = 150 }: { x: number; y: number; children: ReactNode; delay: number; size?: number }) {
  const e = useEnter(delay, 18);
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, ...e }}>
      <Card style={{ width: size, height: size, borderRadius: 32, display: "grid", placeItems: "center" }}><div style={{ width: size * 0.72, height: size * 0.72 }}>{children}</div></Card>
    </div>
  );
}

const Label = ({ x, y, text, sub, delay }: { x: number; y: number; text: string; sub?: string; delay: number }) => {
  const e = useEnter(delay + 4, 10);
  return (
    <div style={{ position: "absolute", left: x - 140, top: y, width: 280, textAlign: "center", fontFamily: SANS, ...e }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.lead }}>{text}</div>
      {sub && <div style={{ fontSize: 18, color: C.ink2, marginTop: 2 }}>{sub}</div>}
    </div>
  );
};

export function Disclaimer() {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, 100, 118], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: o }}>
        <div style={{ textAlign: "center", fontFamily: SANS }}>
          <div style={{ width: 96, height: 96, margin: "0 auto 26px" }}><ShieldMark className="fill" /></div>
          <div style={{ fontSize: 34, fontWeight: 600, color: C.ink2, letterSpacing: 0.2 }}>Synthetic family and hospital · Sandbox and Stripe test mode · No real money</div>
        </div>
      </div>
    </Stage>
  );
}

const PEOPLE = [
  { look: FAMILY[0], name: "Rina", city: "Jakarta · owner", x: CX - 470, y: CY - 210 },
  { look: FAMILY[1], name: "Adi", city: "Jakarta · IDR", x: CX - 470, y: CY + 170 },
  { look: FAMILY[2], name: "Sari", city: "Kuala Lumpur · MYR", x: CX + 470, y: CY - 210 },
  { look: FAMILY[3], name: "Fajar", city: "Dubai · AED", x: CX + 470, y: CY + 170 },
];

function FamilyMap({ scene }: { scene: Scene }) {
  const f = useCurrentFrame();
  const out = scene.lines[1].from;
  const o = interpolate(f, [out - 10, out + 4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hospital: [number, number] = [CX, CY - 20];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <svg width={STAGE.w} height={STAGE.h} style={{ position: "absolute", inset: 0 }}>
        {PEOPLE.map((p, i) => <Link key={p.name} a={[p.x + (p.x < CX ? 80 : -80), p.y]} b={[hospital[0] + (p.x < CX ? -150 : 150), hospital[1]]} start={18 + i * 6} />)}
      </svg>
      <div style={{ position: "absolute", left: hospital[0] - 140, top: hospital[1] - 110, width: 280, ...useEnter(4, 16) }}>
        <div style={{ height: 220, borderRadius: 34, background: C.serpentDark, display: "grid", placeItems: "center", boxShadow: "0 0 0 10px #fff, 0 24px 50px -24px rgba(32,33,33,0.5)" }}>
          <div style={{ width: 110, height: 110, color: C.white }}><Hospital className="fill" /></div>
        </div>
      </div>
      <Label x={hospital[0]} y={hospital[1] + 130} text="Hospital in Shenzhen" sub="Bills in CNY" delay={4} />
      {PEOPLE.map((p, i) => (
        <div key={p.name}>
          <Tile x={p.x} y={p.y} delay={10 + i * 6}><Minifig {...p.look} className="fill" /></Tile>
          <Label x={p.x} y={p.y + 88} text={p.name} sub={p.city} delay={10 + i * 6} />
        </div>
      ))}
    </AbsoluteFill>
  );
}

function Fact({ i, at, icon, big, title, detail, source }: { i: number; at: number; icon: ReactNode; big: string; title: string; detail: string; source: string }) {
  const e = useEnter(at, 30);
  const w = 392, gap = 32, left = (STAGE.w - (w * 3 + gap * 2)) / 2;
  return (
    <div style={{ position: "absolute", left: left + i * (w + gap), top: CY - 250, width: w, ...e }}>
      <Card style={{ padding: "34px 32px 26px", height: 470, display: "flex", flexDirection: "column", fontFamily: SANS }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: C.firstlight, display: "grid", placeItems: "center", color: C.serpentDark }}><div style={{ width: 34, height: 34 }}>{icon}</div></div>
        <div style={{ fontFamily: SERIF, fontSize: 92, lineHeight: 1, color: C.serpentDark, marginTop: 26 }}>{big}</div>
        <div style={{ fontSize: 27, fontWeight: 700, color: C.lead, marginTop: 14, lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 21, color: C.ink2, marginTop: 10, lineHeight: 1.35 }}>{detail}</div>
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${C.line}`, fontSize: 16, color: C.ink2, lineHeight: 1.35 }}><b style={{ color: C.lead }}>Source:</b> {source}</div>
      </Card>
    </div>
  );
}

export function Problem({ scene }: { scene: Scene }) {
  const [, l2, l3, l4] = scene.lines;
  return (
    <Stage>
      <FamilyMap scene={scene} />
      <Fact i={0} at={l2.from} icon={<Doc className="fill" />} big="28%" title="of bills missed the estimate" detail="Average estimate accuracy was 72% at a Singapore private hospital in 2023." source="Hospital Management Asia, 2026, on Mount Elizabeth Novena Hospital" />
      <Fact i={1} at={l3.from} icon={<Hospital className="fill" />} big="300%" title="drug mark-up, at most" detail="Basic items such as pillowcases and alcohol swabs were billed on their own." source="Malaysia Public Accounts Committee, June 2026 (The Star, NST, Malay Mail)" />
      <Fact i={2} at={l4.from} icon={<Coins className="fill" />} big="Deposit" title="before admission" detail="Foreign patients in Malaysian public hospitals pay a deposit before they enter the ward." source="Malaysian Ministry of Health, via Bernama and Asia News Network" />
    </Stage>
  );
}

const ARC = AGENTS.map((a, i) => {
  const left = i < 4;
  const k = left ? i : i - 4;
  const n = left ? 4 : 3;
  const y = CY - 40 + (k - (n - 1) / 2) * 175;
  return { a, x: left ? CX - 450 : CX + 450, y };
});

export function Intro({ scene }: { scene: Scene }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 2, fps, config: { damping: 200 } });
  const center: [number, number] = [CX, CY - 40];
  const second = scene.lines[1].from;
  return (
    <Stage>
      <svg width={STAGE.w} height={STAGE.h} style={{ position: "absolute", inset: 0 }}>
        {ARC.map((p, i) => <Link key={p.a.id} a={[p.x + (p.x < CX ? 62 : -62), p.y]} b={[center[0] + (p.x < CX ? -170 : 170), center[1]]} start={14 + i * 4} />)}
      </svg>
      <div style={{ position: "absolute", left: center[0] - 170, top: center[1] - 130, width: 340, opacity: s, transform: `scale(${0.92 + 0.08 * s})` }}>
        <Card style={{ height: 260, borderRadius: 36, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 120, height: 120 }}><ShieldMark className="fill" /></div>
          <div style={{ fontFamily: SERIF, fontSize: 52, color: C.lead, lineHeight: 1 }}>Guardian</div>
        </Card>
      </div>
      {ARC.map((p, i) => (
        <div key={p.a.id}>
          <Tile x={p.x} y={p.y} size={112} delay={8 + i * 4}><Minifig skin={p.a.skin} hair={p.a.hair} hijab={p.a.hijab} shirt={p.a.color} className="fill" /></Tile>
          <div style={{ position: "absolute", left: p.x + (p.x < CX ? -270 : 72), top: p.y - 16, width: 190, textAlign: p.x < CX ? "right" : "left", fontFamily: SANS, fontSize: 19, fontWeight: 700, color: C.lead, ...useEnter(12 + i * 4, 8) }}>{p.a.name}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 0, width: STAGE.w, top: center[1] + 345, textAlign: "center", fontFamily: SANS, ...useEnter(second, 12) }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: C.lead }}>Understand the bill. Pay together. Only to the hospital.</div>
        <div style={{ fontSize: 21, color: C.ink2, marginTop: 8 }}>Team I Could've Done It Father · FinTechathon 2026 · Topic C</div>
      </div>
    </Stage>
  );
}
