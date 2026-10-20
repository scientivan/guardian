"use client";

import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Chevron } from "@/components/landing/icons";

// A scrolling box that shows it scrolls: soft fades at the edges that have more content, and a
// small button that moves one page further. Used for the team, activity and next-steps lists.

export function ScrollArea({ axis = "y", label, className = "", boxClassName = "", fade = "from-white", children }: { axis?: "x" | "y"; label: string; className?: string; boxClassName?: string; fade?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const pos = axis === "y" ? el.scrollTop : el.scrollLeft;
    const max = axis === "y" ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
    setEdges({ start: pos > 4, end: pos < max - 4 });
  }, [axis]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure, children]);
  function page(direction: 1 | -1) {
    const el = box.current;
    if (!el) return;
    const by = (axis === "y" ? el.clientHeight : el.clientWidth) * 0.8 * direction;
    el.scrollBy({ [axis === "y" ? "top" : "left"]: by, behavior: "smooth" });
  }
  const vertical = axis === "y";
  const button = "absolute z-10 grid place-items-center rounded-full bg-white text-serpent-dark shadow-[0_6px_16px_-6px_rgba(32,33,33,0.5)] ring-1 ring-line transition-opacity hover:bg-firstlight";
  return (
    <div className={`relative min-h-0 ${className}`}>
      <LocalizedElement as="div" ref={box} onScroll={measure} tabIndex={0} aria-label={label} className={`h-full overscroll-contain ${vertical ? "overflow-y-auto" : "overflow-x-auto"} ${boxClassName}`}>
        <LocalizedText>{children}</LocalizedText>
      </LocalizedElement>
      {/* Edge fades say "there is more this way". */}
      <div aria-hidden="true" className={`pointer-events-none absolute transition-opacity ${vertical ? "inset-x-0 top-0 h-6 bg-gradient-to-b" : "inset-y-0 left-0 w-10 bg-gradient-to-r"} ${fade} to-transparent ${edges.start ? "opacity-100" : "opacity-0"}`} />
      <div aria-hidden="true" className={`pointer-events-none absolute transition-opacity ${vertical ? "inset-x-0 bottom-0 h-10 bg-gradient-to-t" : "inset-y-0 right-0 w-10 bg-gradient-to-l"} ${fade} to-transparent ${edges.end ? "opacity-100" : "opacity-0"}`} />
      <LocalizedText>{vertical ? (
        edges.end && <LocalizedElement as="button" type="button" onClick={() => page(1)} aria-label="Scroll for more" title="Scroll for more" className={`${button} bottom-1.5 right-1.5 h-7 w-7`}>
          <Chevron className="h-4 w-4" />
        </LocalizedElement>
      ) : <>
        {edges.start && <LocalizedElement as="button" type="button" onClick={() => page(-1)} aria-label="Scroll left" className={`${button} left-1 top-1/2 h-8 w-8 -translate-y-1/2`}><Chevron className="h-4 w-4 rotate-90" /></LocalizedElement>}
        {edges.end && <LocalizedElement as="button" type="button" onClick={() => page(1)} aria-label="Scroll right" className={`${button} right-1 top-1/2 h-8 w-8 -translate-y-1/2`}><Chevron className="h-4 w-4 -rotate-90" /></LocalizedElement>}
      </>}</LocalizedText>
    </div>
  );
}
