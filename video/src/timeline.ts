import narration from "../narration.json";
import durations from "../public/tts/durations.json";
import { FPS } from "./theme";

// Builds the timeline from the narration: each scene lasts as long as its spoken lines, with
// short pauses, so subtitles, voice and visuals stay in sync after any text change.

export type Line = { id: string; scene: string; text: string; say?: string; role?: string; callout?: [string, string] };
export type TimedLine = Line & { from: number; frames: number };
export type Scene = { id: string; from: number; frames: number; lines: TimedLine[] };

const LEAD = 0.35; // seconds before the first line of a scene
const GAP = 0.45; // between lines
const TAIL: Record<string, number> = { disclaimer: 0.5, problem: 0.8, intro: 1.0, setup: 0.6, bill: 0.6, pay: 0.8, refund: 0.6, security: 0.8, close: 0.8, results: 1.4, end: 2.2 };

const lines = narration as Line[];
const secs = durations as Record<string, number>;
const order = [...new Set(lines.map((l) => l.scene))];

export const SCENES: Scene[] = [];
let cursor = 0;
for (const id of order) {
  const own = lines.filter((l) => l.scene === id);
  let t = LEAD;
  const timed: TimedLine[] = own.map((l) => {
    const from = Math.round(t * FPS);
    const frames = Math.round(secs[l.id] * FPS);
    t += secs[l.id] + GAP;
    return { ...l, from, frames };
  });
  const frames = Math.round((t - GAP + (TAIL[id] ?? 0.8)) * FPS);
  SCENES.push({ id, from: cursor, frames, lines: timed });
  cursor += frames;
}
export const TOTAL = cursor;
export const scene = (id: string) => SCENES.find((s) => s.id === id)!;
