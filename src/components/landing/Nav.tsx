
import { LanguageSwitch, LocalizedText } from "@/components/i18n/LocaleProvider";

import Link from "next/link";
import { ShieldMark } from "./icons";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Guardian" className="flex items-center gap-2.5">
          <ShieldMark className="h-7 w-7" />
          <span className="hidden font-serif text-2xl text-lead sm:inline"><LocalizedText>Guardian</LocalizedText></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-2 md:flex">
          <a href="#features" className="transition-colors hover:text-lead"><LocalizedText>
            What you can do
          </LocalizedText></a>
          <a href="#how" className="transition-colors hover:text-lead"><LocalizedText>
            How it works
          </LocalizedText></a>
          <a href="#security" className="transition-colors hover:text-lead"><LocalizedText>
            Security
          </LocalizedText></a>
        </nav>
        <div className="flex items-center gap-2"><LanguageSwitch />
        <Link
          href="/app"
          className="whitespace-nowrap rounded-full bg-serpent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-serpent-dark sm:px-5"
        ><LocalizedText>
          Open App
        </LocalizedText></Link>
        </div>
      </div>
    </header>
  );
}
