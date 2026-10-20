
import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";
import Image from "next/image";

// Flags: flag-icons 7.2.3 (MIT, see public/flags/LICENSE.txt), square versions cropped to circles.
const CURRENCIES = [
  { code: "CNY", symbol: "¥", name: "Chinese yuan", flag: "cn" },
  { code: "IDR", symbol: "Rp", name: "Indonesian rupiah", flag: "id" },
  { code: "MYR", symbol: "RM", name: "Malaysian ringgit", flag: "my" },
  { code: "SGD", symbol: "S$", name: "Singapore dollar", flag: "sg" },
  { code: "THB", symbol: "฿", name: "Thai baht", flag: "th" },
  { code: "AED", symbol: "Dh", name: "UAE dirham", flag: "ae" },
  { code: "KRW", symbol: "₩", name: "Korean won", flag: "kr" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong dollar", flag: "hk" },
  { code: "USD", symbol: "$", name: "US dollar", flag: "us" },
];

export function CurrencyMarquee() {
  // The list is rendered twice and shifted by half its width, so the loop is seamless.
  // No tiles: each currency floats on the page, with a thin line between neighbours.
  const loop = [...CURRENCIES, ...CURRENCIES];
  return (
    <LocalizedElement as="section" aria-label="Currencies payers can pay in" className="mx-auto mt-6 max-w-6xl px-6">
      {/* Left and right halves mark the edges the strip runs between. */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <p className="font-serif text-2xl text-lead"><LocalizedText>Payers pay in their own currency.</LocalizedText></p>
        <p className="text-ink-2 sm:text-right"><LocalizedText>The hospital receives its own.</LocalizedText></p>
      </div>
      <div className="marquee mt-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <ul className="marquee-track flex w-max items-center py-6">
          {loop.map((c, i) => (
            <li key={`${c.code}-${i}`} aria-hidden={i >= CURRENCIES.length} className="flex shrink-0 items-center">
              <span className="flex items-center gap-4 px-9">
                <Image
                  src={`/flags/${c.flag}.svg`}
                  alt=""
                  width={52}
                  height={52}
                  unoptimized
                  className="h-13 w-13 shrink-0 rounded-full object-cover shadow-[0_12px_18px_-10px_rgba(32,33,33,0.55)] ring-1 ring-black/10"
                />
                <span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-serif text-[1.7rem] leading-none text-lead"><LocalizedText>{c.code}</LocalizedText></span>
                    <span className="font-serif text-xl leading-none text-serpent"><LocalizedText>{c.symbol}</LocalizedText></span>
                  </span>
                  <span className="mt-1.5 block whitespace-nowrap text-sm text-ink-2"><LocalizedText>{c.name}</LocalizedText></span>
                </span>
              </span>
              <span className="h-12 w-px bg-line" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </div>
    </LocalizedElement>
  );
}
