// The demo reference FX table (not market rates), shared by the server and the forms.
// Rate = units of the other currency per 1 unit of the hospital currency, scaled by 1e4. All
// amounts are minor units x100, so the scale cancels out.

export const DEMO_RATES_E4: Record<string, Record<string, number>> = {
  CNY: { IDR: 22_950_000, MYR: 5_900, AED: 5_100, SGD: 1_800, USD: 1_400, CNY: 10_000 },
};

/** Currencies a helper can pay a case in: the ones with a reference rate from its hospital currency. */
export function payCurrencies(caseCurrency: string): string[] {
  return Object.keys(DEMO_RATES_E4[caseCurrency] ?? { [caseCurrency]: 10_000 });
}

/** Hospital-currency amount for an amount in `from`, rounded down so a limit never grows. Null when no rate. */
export function toCaseCurrency(amount: number, from: string, caseCurrency: string): number | null {
  if (from === caseCurrency) return amount;
  const rate = DEMO_RATES_E4[caseCurrency]?.[from];
  return rate ? Math.floor((amount * 10_000) / rate) : null;
}

/** Amount in `to` for a hospital-currency amount. Null when no rate. */
export function fromCaseCurrency(amount: number, caseCurrency: string, to: string): number | null {
  if (to === caseCurrency) return amount;
  const rate = DEMO_RATES_E4[caseCurrency]?.[to];
  return rate ? Math.round((amount * rate) / 10_000) : null;
}
