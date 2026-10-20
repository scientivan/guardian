import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, SANS, SPEAKER, STAGE, shadow } from "./theme";
import type { TimedLine } from "./timeline";

/** Light grid paper, as on Guardian's own pages. */
export function Background() {
  return (
    <AbsoluteFill style={{ backgroundColor: C.mist, backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`, backgroundSize: "48px 48px", backgroundPosition: "-1px -1px" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 38% 45%, rgba(243,247,249,0) 0%, rgba(243,247,249,0.55) 70%, rgba(243,247,249,0.9) 100%)" }} />
    </AbsoluteFill>
  );
}

/** Two 16:9 frames on the right for the presenters' own videos (left empty until supplied). */
export function SpeakerFrames({ speaker1Src, speaker2Src, names }: { speaker1Src?: string; speaker2Src?: string; names: [string, string] }) {
  const top = (1080 - (SPEAKER.h * 2 + SPEAKER.gap)) / 2;
  const box = (i: number, src?: string) => (
    <div key={i} style={{ position: "absolute", left: SPEAKER.x, top: top + i * (SPEAKER.h + SPEAKER.gap), width: SPEAKER.w, height: SPEAKER.h, borderRadius: 22, overflow: "hidden", background: C.white, boxShadow: shadow, border: `1px solid ${C.line}` }}>
      {src ? <OffthreadVideo src={src.startsWith("http") ? src : staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: C.firstlight }}>
            <span style={{ fontFamily: SANS, fontSize: 20, fontWeight: 600, color: C.serpentDark, opacity: 0.55 }}>Presenter video</span>
          </div>}
      <span style={{ position: "absolute", left: 14, bottom: 12, fontFamily: SANS, fontSize: 17, fontWeight: 700, color: C.white, background: "rgba(32,33,33,0.72)", padding: "5px 12px", borderRadius: 999 }}>{names[i]}</span>
    </div>
  );
  return <>{box(0, speaker1Src)}{box(1, speaker2Src)}</>;
}

/** One full sentence per subtitle, one line, centred under the stage. */
export function Subtitles({ lines }: { lines: TimedLine[] }) {
  return (
    <>
      {lines.map((l) => (
        <Sequence key={l.id} from={l.from} durationInFrames={l.frames + 8} layout="none">
          <Audio src={staticFile(`tts/${l.id}.wav`)} />
          <SubtitleLine text={l.text} />
        </Sequence>
      ))}
    </>
  );
}

function SubtitleLine({ text }: { text: string }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: STAGE.x, width: STAGE.w, bottom: 44, display: "flex", justifyContent: "center", opacity: o }}>
      <span style={{ fontFamily: SANS, fontSize: 31, fontWeight: 600, color: C.white, background: "rgba(32,33,33,0.86)", padding: "10px 22px", borderRadius: 14, whiteSpace: "nowrap", letterSpacing: -0.1 }}>{text}</span>
    </div>
  );
}

/** Spring-in helper for cards: returns style with fade and lift. */
export function useEnter(delay = 0, distance = 24): CSSProperties {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 200, mass: 0.9 } });
  return { opacity: s, transform: `translateY(${(1 - s) * distance}px)` };
}

/** The product's card look: white, rounded, soft shadow. */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: C.white, borderRadius: 28, boxShadow: shadow, border: `1px solid ${C.line}`, ...style }}>{children}</div>;
}

/** The stage area that holds scene content (and later the screen recording). */
export function Stage({ children }: { children: ReactNode }) {
  return <div style={{ position: "absolute", left: STAGE.x, top: STAGE.y, width: STAGE.w, height: STAGE.h - 90 }}>{children}</div>;
}
