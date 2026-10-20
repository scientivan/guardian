
import { LocalizedText } from "@/components/i18n/LocaleProvider";
import Link from "next/link";
import { AgentOffice } from "./AgentOffice";
import { Arrow } from "./icons";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-12 pt-14 lg:grid-cols-[1fr_1.25fr] lg:pt-20">
      <div>
        <p className="font-serif text-xl italic text-serpent sm:text-2xl"><LocalizedText>Understand the bill. Control each payment.</LocalizedText></p>
        <h1 className="mt-4 text-balance font-serif text-5xl leading-[1.04] text-lead sm:text-6xl"><LocalizedText>Pay a hospital abroad without the worry.</LocalizedText></h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2"><LocalizedText>
          Guardian’s AI team reads the hospital bill, explains why it changed from the estimate, and lets the people helping a patient pay
          towards a verified hospital recipient, each person choosing what they can give.
        </LocalizedText></p>
        <p className="mt-3 text-sm text-ink-2"><LocalizedText>Prototype with sandbox and Stripe test charges. No real transfers or hospital bank settlement.</LocalizedText></p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-full bg-serpent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-serpent-dark"
          ><LocalizedText>
            Open App </LocalizedText><Arrow className="h-4 w-4" />
          </Link>
          <a
            href="#how"
            className="inline-flex items-center rounded-full border border-line bg-white px-6 py-3.5 font-semibold text-lead transition-colors hover:border-cerulean hover:bg-mist"
          ><LocalizedText>
            See how it works
          </LocalizedText></a>
        </div>
      </div>
      <AgentOffice />
    </section>
  );
}
