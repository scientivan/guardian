// Display payers. Money arrives from the API as an integer in minor units (fen, cents;
// rupiah is stored ×100 too). The frontend only formats it and never does money math (docs/API.md).

export function money(minor: number, currency: string): string {
  const whole = minor % 100 === 0;
  const n = new Intl.NumberFormat("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(minor / 100);
  return `${currency} ${n}`;
}

/** A conversion, paid amount first and the amount it covers in brackets: "IDR 78,030,000 (CNY 34,000)". */
export function converted(payMinor: number, payCurrency: string, minor: number, currency: string): string {
  return payCurrency === currency ? money(minor, currency) : `${money(payMinor, payCurrency)} (${money(minor, currency)})`;
}

/** The rate behind a conversion: "1 CNY = 2,295 IDR". `rate` is units of `payCurrency` per 1 `currency`. */
export function rateLine(rate: number | string, currency: string, payCurrency: string): string {
  return `1 ${currency} = ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number(rate))} ${payCurrency}`;
}

// Times are shown in hospital time (Shenzhen). A fixed time zone keeps server and browser output identical.
const CLOCK = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" });
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Shanghai" });

export const clock = (iso: string) => CLOCK.format(new Date(iso));
export const day = (iso: string) => DAY.format(new Date(iso));

/** Ratio for progress bars only (display, not money math). */
export const share = (part: number, whole: number) => (whole > 0 ? Math.min(100, (part / whole) * 100) : 0);
