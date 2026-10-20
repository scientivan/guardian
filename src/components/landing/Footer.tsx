import Link from "next/link";
import { AGENTS, FAMILY } from "./agents";
import { Arrow, ShieldMark } from "./icons";
import { Minifig } from "./Minifig";

// The closing band runs edge to edge; its content stays on the hero's edges.
// The whole cast, agents and family, stands along the bottom of it.
const CAST = [...AGENTS.map((a) => ({ name: a.name, skin: a.skin, hair: a.hair, hijab: a.hijab, shirt: a.color })), ...FAMILY];

export function Footer() {
  return (
    <footer className="bg-firstlight">
      <div className="mx-auto max-w-6xl px-6 pt-24">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h2 className="text-balance font-serif text-5xl leading-[1.05] text-lead sm:text-6xl">Put your family’s care in clearer view.</h2>
            <p className="mt-4 max-w-md text-lg text-ink-2">Understand the bill, coordinate family contributions, and keep every step together.</p>
          </div>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 justify-self-start rounded-full bg-serpent px-7 py-4 text-lg font-semibold text-white transition-colors hover:bg-serpent-dark lg:justify-self-end"
          >
            Open App <Arrow className="h-5 w-5" />
          </Link>
        </div>

        <ul className="mt-16 grid grid-cols-11 items-end gap-1 sm:gap-3" aria-hidden="true">
          {CAST.map((p) => (
            <li key={p.name} title={p.name} className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 motion-reduce:transition-none">
              <Minifig {...p} className="h-auto w-full" />
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-cerulean">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldMark className="h-6 w-6" />
            <span className="font-serif text-xl text-lead">Guardian</span>
            <span>Deposit and bill guardian for treatment abroad</span>
          </div>
          <p className="max-w-md sm:text-right">
            Built for families managing hospital bills across borders.
          </p>
        </div>
      </div>
    </footer>
  );
}
