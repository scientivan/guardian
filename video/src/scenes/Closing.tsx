import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { ShieldMark } from "../../../src/components/landing/icons";
import { Card, Stage, useEnter } from "../Frame";
import { C, SANS, SERIF, STAGE } from "../theme";
import type { Scene } from "../timeline";

const CY = (STAGE.h - 90) / 2;

function Stat({ x, y, w, at, big, title, note, tone = C.serpentDark }: { x: number; y: number; w: number; at: number; big: string; title: string; note: string; tone?: string }) {
  const e = useEnter(at, 26);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, ...e }}>
      <Card style={{ padding: "28px 30px", height: 250, fontFamily: SANS, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: SERIF, fontSize: 78, lineHeight: 1, color: tone }}>{big}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.lead, marginTop: 14 }}>{title}</div>
        <div style={{ marginTop: "auto", fontSize: 17, color: C.ink2 }}>{note}</div>
      </Card>
    </div>
  );
}

function Compare({ x, y, w, at, who, rows, tone }: { x: number; y: number; w: number; at: number; who: string; rows: [string, string][]; tone: string }) {
  const e = useEnter(at, 26);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, ...e }}>
      <Card style={{ padding: "24px 30px", height: 250, fontFamily: SANS }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: tone }}>{who}</div>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.line}`, padding: "13px 0", fontSize: 22 }}>
            <span style={{ color: C.ink2 }}>{k}</span><b style={{ color: C.lead }}>{v}</b>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function Results({ scene }: { scene: Scene }) {
  const [a, b, c, d] = scene.lines;
  const w = 610, gap = 40, left = (STAGE.w - (w * 2 + gap)) / 2, top = CY - 280;
  return (
    <Stage>
      <Stat x={left} y={top} w={w} at={a.from} big="125/125" title="automated tests pass" note="npm test · gateway, privacy, payments, refunds, closing" />
      <Stat x={left + w + gap} y={top} w={w} at={b.from} big="16/16" title="live tasks and attacks pass" note="Live models, Stripe test mode, FISCO BCOS · 18 Oct 2026" />
      <Compare x={left} y={top + 290} w={w} at={c.from} who="Generic chatbot" tone={C.chocolate} rows={[["Causes found (of 5)", "2–4"], ["Invented clinical cause", "3 of 3 trials"], ["Untraceable numbers", "4–8 per trial"]]} />
      <Compare x={left + w + gap} y={top + 290} w={w} at={d.from} who="Guardian" tone={C.serpentDark} rows={[["Causes found (of 5)", "5"], ["Invented clinical cause", "0"], ["Untraceable numbers", "0"]]} />
      <div style={{ position: "absolute", left: 0, width: STAGE.w, top: top + 580, textAlign: "center", fontFamily: SANS, fontSize: 18, color: C.ink2, ...useEnter(c.from, 6) }}>Same bill, same model, 3 trials, scored by code against a hand-written answer key (evidence/baseline-2026-10-18).</div>
    </Stage>
  );
}

const Word = ({ children, color }: { children: ReactNode; color?: string }) => <span style={{ color: color ?? C.lead }}>{children}</span>;

export function End({ scene }: { scene: Scene }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [scene.frames - 12, scene.frames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
        <div style={{ width: 92, height: 92, ...useEnter(0, 14) }}><ShieldMark className="fill" /></div>
        <div style={{ fontFamily: SERIF, fontSize: 70, lineHeight: 1.1, textAlign: "center", marginTop: 28, ...useEnter(4, 18) }}>
          <Word>Understand the bill.</Word><br /><Word color={C.serpent}>Pay together.</Word> <Word>Only to the </Word><Word color={C.chocolate}>hospital.</Word>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 24, color: C.ink2, marginTop: 30, ...useEnter(12, 10) }}>Guardian · Team I Could've Done It Father</div>
        <div style={{ fontFamily: SANS, fontSize: 22, color: C.serpentDark, fontWeight: 700, marginTop: 10, ...useEnter(16, 10) }}>guardian.scientivan.dev · github.com/scientivan/guardian</div>
      </div>
    </Stage>
  );
}
