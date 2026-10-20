import Link from "next/link";
import { AgentOffice } from "./AgentOffice";
import { Arrow } from "./icons";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-12 pt-14 lg:grid-cols-[1fr_1.25fr] lg:pt-20">
      <div>
        <p className="font-serif text-xl italic text-serpent sm:text-2xl">Understand the bill. Control each payment.</p>
        <h1 className="mt-4 text-balance font-serif text-5xl leading-[1.04] text-lead sm:text-6xl">Pay a hospital abroad without the worry.</h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
          Guardian’s AI team reads the hospital bill, explains why it changed from the estimate, and lets the people helping a patient pay
          towards a verified hospital recipient, each person choosing what they can give.
        </p>
        <p className="mt-3 text-sm text-ink-2">Prototype with sandbox and Stripe test charges. No real transfers or hospital bank settlement.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-full bg-serpent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-serpent-dark"
          >
            Open App <Arrow className="h-4 w-4" />
          </Link>
          <a
            href="#how"
            className="inline-flex items-center rounded-full border border-line bg-white px-6 py-3.5 font-semibold text-lead transition-colors hover:border-cerulean hover:bg-mist"
          >
            See how it works
          </a>
        </div>
      </div>
      <AgentOffice />
    </section>
  );
}
