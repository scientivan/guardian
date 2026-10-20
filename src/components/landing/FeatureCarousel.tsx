"use client";

import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Arrow } from "./icons";

export type Tone = "firstlight" | "serpent" | "chocolate" | "cerulean" | "serpent-dark" | "wolverine";
export type Slide = { title: string; text: string; visual: ReactNode; tone: Tone };

const TONES: Record<Tone, string> = {
  firstlight: "bg-firstlight",
  serpent: "bg-serpent",
  chocolate: "bg-chocolate",
  cerulean: "bg-cerulean",
  "serpent-dark": "bg-serpent-dark",
  wolverine: "bg-wolverine",
};

// A deck in perspective: the current card faces you, the next ones queue to the right,
// smaller and turned away (Glide-style); cards already seen fall back and fade out to the left.
// Transform origin is each card's left edge, so offsets are in card widths.
function place(d: number) {
  if (d < 0) return { transform: "translateX(-16%) scale(0.88) rotateY(-12deg)", opacity: 0, zIndex: 40, filter: "blur(3px)" };
  if (d === 0) return { transform: "translateX(0) scale(1) rotateY(0deg)", opacity: 1, zIndex: 30, filter: "blur(0px)" };
  if (d === 1) return { transform: "translateX(calc(100% + 20px)) scale(0.8) rotateY(16deg)", opacity: 1, zIndex: 20, filter: "blur(0px)" };
  if (d === 2) return { transform: "translateX(calc(177% + 40px)) scale(0.66) rotateY(22deg)", opacity: 0.85, zIndex: 10, filter: "blur(0.5px)" };
  if (d === 3) return { transform: "translateX(calc(238% + 60px)) scale(0.55) rotateY(26deg)", opacity: 0.6, zIndex: 5, filter: "blur(1px)" };
  return { transform: "translateX(calc(290% + 80px)) scale(0.48) rotateY(28deg)", opacity: 0, zIndex: 0, filter: "blur(2px)" };
}

export function FeatureCarousel({ slides, label }: { slides: Slide[]; label: string }) {
  const n = slides.length;
  const [active, setActive] = useState(0);
  // Wraps at both ends: after the last step the deck rewinds to the first.
  const go = (i: number) => setActive(((i % n) + n) % n);
  const current = slides[active];

  // Swipe: a horizontal drag of more than 40px moves one card. `dragged` stops the
  // click that follows a drag from also selecting the card under the pointer.
  const startX = useRef<number | null>(null);
  const dragged = useRef(false);
  function onPointerDown(e: PointerEvent) {
    startX.current = e.clientX;
    dragged.current = false;
  }
  function onPointerUp(e: PointerEvent) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) {
      dragged.current = true;
      go(active + (dx < 0 ? 1 : -1));
    }
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(active - 1);
    }
  }

  return (
    <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-8">
      {/* The step, big, on the left: people read the number first. */}
      <div className="flex flex-col lg:col-span-4">
        <div className="flex items-end gap-3" aria-hidden="true">
          <span key={active} className="step-in text-[7rem] font-extrabold leading-[0.8] tracking-tighter tabular-nums text-serpent sm:text-[9rem]">
            <LocalizedText>{active + 1}</LocalizedText>
          </span>
          <span className="pb-2 text-2xl font-bold tabular-nums text-ink-2"><LocalizedText>of </LocalizedText><LocalizedText>{n}</LocalizedText></span>
        </div>
        <div key={`text-${active}`} className="step-in mt-6 min-h-[9.5rem] [animation-delay:60ms]">
          <h3 className="text-balance font-serif text-3xl leading-tight text-lead"><LocalizedText>{current.title}</LocalizedText></h3>
          <p className="mt-3 text-lg leading-relaxed text-ink-2"><LocalizedText>{current.text}</LocalizedText></p>
        </div>
        <div className="mt-6 flex items-center gap-3 lg:mt-auto">
          <LocalizedElement as="button"
            type="button"
            onClick={() => go(active - 1)}
            aria-label="Previous step"
            className="grid h-11 w-14 place-items-center rounded-full border border-line bg-white text-lead transition-colors hover:border-cerulean hover:bg-firstlight/50"
          >
            <Arrow className="h-4 w-4 rotate-180" />
          </LocalizedElement>
          <LocalizedElement as="button"
            type="button"
            onClick={() => go(active + 1)}
            aria-label="Next step"
            className="grid h-11 w-14 place-items-center rounded-full bg-serpent text-white transition-colors hover:bg-serpent-dark"
          >
            <Arrow className="h-4 w-4" />
          </LocalizedElement>
          <div className="ml-2 flex items-center">
            {slides.map((s, i) => (
              <LocalizedElement as="button"
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === active ? "step" : undefined}
                className="group px-1 py-4"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-500 motion-reduce:transition-none ${
                    i === active ? "w-8 bg-serpent" : i < active ? "w-4 bg-serpent/45" : "w-4 bg-cerulean group-hover:bg-wolverine"
                  }`}
                />
              </LocalizedElement>
            ))}
          </div>
        </div>
      </div>

      <LocalizedElement as="div"
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (startX.current = null)}
        className="grid touch-pan-y select-none rounded-[2rem] [perspective:1600px] lg:col-span-8"
      >
        {slides.map((slide, i) => {
          const d = i - active;
          return (
            <LocalizedElement as="div"
              key={slide.title}
              role="group"
              aria-roledescription="slide"
              aria-label={`Step ${i + 1} of ${n}: ${slide.title}`}
              aria-hidden={d !== 0}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                if (d !== 0) go(i);
              }}
              className={`col-start-1 row-start-1 w-[min(400px,80vw)] origin-left justify-self-start transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                d > 0 && d < 4 ? "cursor-pointer" : ""
              } ${d < 0 || d > 3 ? "pointer-events-none" : ""}`}
              style={place(d)}
            >
              {/* The explanation fills the card; the card colour shows as a frame around it. */}
              <article
                className={`flex h-full min-h-[26rem] flex-col rounded-[2rem] p-2.5 shadow-[0_34px_50px_-34px_rgba(32,33,33,0.55)] sm:p-3 ${TONES[slide.tone]}`}
              >
                <LocalizedText>{slide.visual}</LocalizedText>
              </article>
            </LocalizedElement>
          );
        })}
      </LocalizedElement>

      <p className="sr-only" aria-live="polite"><LocalizedText>{`Step ${active + 1} of ${n}: ${current.title}`}</LocalizedText></p>
    </div>
  );
}
