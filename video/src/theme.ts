import { continueRender, delayRender, staticFile } from "remotion";

// Guardian's own palette and fonts (src/app/globals.css, src/app/layout.tsx).

export const C = {
  lead: "#202121",
  ink2: "#4e5659",
  serpent: "#4875a1",
  serpentDark: "#375d84",
  chocolate: "#6e5e52",
  cerulean: "#abc1cf",
  firstlight: "#dae7ee",
  mist: "#f3f7f9",
  line: "#dfe6ea",
  ok: "#3f7d5c",
  warn: "#9a6212",
  danger: "#b4443c",
  white: "#ffffff",
};

// Same font files as the app (Manrope variable, DM Serif Display), bundled locally.
export const SANS = "Manrope";
export const SERIF = "DM Serif Display";
if (typeof document !== "undefined") {
  const handle = delayRender("fonts");
  Promise.all([
    new FontFace(SANS, `url(${staticFile("fonts/manrope.woff2")}) format("woff2")`, { weight: "200 800" }).load(),
    new FontFace(SERIF, `url(${staticFile("fonts/dm-serif-display.woff2")}) format("woff2")`).load(),
  ]).then((faces) => { faces.forEach((f) => document.fonts.add(f)); continueRender(handle); });
}

export const FPS = 30;
export const W = 1920;
export const H = 1080;

/** Left stage for the product, right column for the two speaker frames. */
export const STAGE = { x: 56, y: 48, w: 1290, h: 984 };
export const SPEAKER = { x: 1400, w: 464, h: 261, gap: 28 };

export const shadow = "0 18px 40px -22px rgba(32,33,33,0.35), 0 2px 6px rgba(32,33,33,0.06)";
