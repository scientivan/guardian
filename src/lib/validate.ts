// Field rules shared by the forms and the API (zod refinements), so the browser and the server
// reject the same input with the same words. Each rule returns an error message, or null when valid.

export type Rule = (value: string) => string | null;

const LETTER = /\p{L}/u;
const DIGIT = /\d/;

/** A person's name: letters, spaces and . ' ’ - only. No digits or symbols. */
export const personName = (label = "the name"): Rule => v => {
  const s = v.trim();
  if (!s) return `Enter ${label}.`;
  if (DIGIT.test(s)) return "A name can’t contain numbers.";
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(s)) return "Use letters only. Spaces, dots, hyphens and apostrophes are fine.";
  if (s.length < 2) return "The name is too short.";
  if (s.length > 80) return "Keep the name under 80 characters.";
  return null;
};

/** A payer's display name: a person or a group such as "Masjid community fund (Jakarta)". */
export const memberName = (label = "the payer’s name"): Rule => v => {
  const s = v.trim();
  if (!s) return `Enter ${label}.`;
  if (DIGIT.test(s)) return "A name can’t contain numbers.";
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .,'’&()-]*$/u.test(s)) return "Use letters only. Spaces, dots, hyphens, & and brackets are fine.";
  if (s.length < 2) return "The name is too short.";
  if (s.length > 120) return "Keep the name under 120 characters.";
  return null;
};

/** An institution name. Digits are allowed ("Hospital 101"), but it needs letters. */
export const orgName = (label = "the hospital’s name"): Rule => v => {
  const s = v.trim();
  if (!s) return `Enter ${label}.`;
  if (!LETTER.test(s)) return "The name needs letters, not only numbers or symbols.";
  if (!/^[\p{L}\p{M}\d .,'’&()/-]+$/u.test(s)) return "Use letters, numbers, spaces and . , ' & ( ) / - only.";
  if (s.length < 3) return "The name is too short.";
  if (s.length > 160) return "Keep the name under 160 characters.";
  return null;
};

export const text = (label: string, min = 1, max = 200): Rule => v => {
  const s = v.trim();
  if (!s) return `Enter ${label}.`;
  if (s.length < min) return `Write at least ${min} characters.`;
  if (s.length > max) return `Keep it under ${max} characters.`;
  return null;
};

export const optional = (rule: Rule): Rule => v => (v.trim() ? rule(v) : null);

export const email = (label = "an email address"): Rule => v => {
  const s = v.trim();
  if (!s) return `Enter ${label}.`;
  if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return "Enter a valid email address, like name@gmail.com.";
  return null;
};

export const phone = (label = "a telephone number"): Rule => v => {
  const s = v.trim();
  if (!s) return `Enter ${label}.`;
  if (/\p{L}/u.test(s)) return "A phone number can’t contain letters.";
  if (!/^\+?[\d\s().-]+$/.test(s)) return "Use digits, spaces, + ( ) and - only.";
  const digits = s.replace(/\D/g, "").length;
  if (digits < 6 || digits > 20) return "A phone number has 6 to 20 digits.";
  return null;
};

export const httpsUrl = (label = "the website address"): Rule => v => {
  const s = v.trim();
  if (!s) return `Enter ${label}.`;
  try { const u = new URL(s); if (u.protocol !== "https:") return "Use an address that starts with https://."; if (!u.hostname.includes(".")) return "Enter a full web address."; }
  catch { return "Enter a full web address, like https://hospital.example."; }
  return null;
};

/** One HTTPS URL per line, at least one. */
export const urlList = (label = "at least one source URL"): Rule => v => {
  const lines = v.split("\n").map(s => s.trim()).filter(Boolean);
  if (!lines.length) return `Enter ${label}.`;
  const bad = lines.findIndex(l => httpsUrl()(l));
  return bad >= 0 ? `Line ${bad + 1} is not a valid https:// address.` : null;
};

/** An amount typed in major units ("1500.50"). `max` is in major units too. */
export const amount = (label = "an amount", { min = 0.01, max = 100_000_000 }: { min?: number; max?: number } = {}): Rule => v => {
  const s = v.trim();
  if (!s) return `Enter ${label}.`;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return "Use numbers only, with up to two decimals.";
  const n = Number(s);
  if (n < min) return min > 0 ? `The amount must be at least ${min}.` : "The amount can’t be negative.";
  if (n > max) return `The amount can’t be more than ${max.toLocaleString("en")}.`;
  return null;
};

export const json = (label = "the JSON"): Rule => v => {
  if (!v.trim()) return `Paste ${label}.`;
  try { JSON.parse(v); return null; } catch { return "This is not valid JSON. Paste the list exactly as received."; }
};

export const base64 = (label = "the key"): Rule => v => {
  const s = v.trim();
  if (!s) return `Paste ${label}.`;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(s) && s.length % 4 === 0 ? null : "This doesn’t look like a base64 value. Check for missing characters.";
};

/** File chosen for upload: PDF, PNG or JPEG up to 10 MB. Matches src/server/integration.ts. */
export function documentFile(file: { size: number; type: string; name: string } | null, required = false): string | null {
  if (!file) return required ? "Choose a PDF or photo." : null;
  if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) return "Choose a PDF, PNG or JPEG file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > 10 * 1024 * 1024) return "This file is larger than 10 MB. Choose a smaller one.";
  return null;
}

/** Runs every rule; returns only the failing fields. */
export function check<K extends string>(values: Record<K, string>, rules: Partial<Record<K, Rule>>): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const key of Object.keys(rules) as K[]) {
    const message = rules[key]!(values[key] ?? "");
    if (message) out[key] = message;
  }
  return out;
}

/** zod refinement adapter: `z.string().superRefine(zodRule(personName()))`. */
export const zodRule = (rule: Rule) => (value: string, ctx: { addIssue: (issue: { code: "custom"; message: string }) => void }) => {
  const message = rule(value);
  if (message) ctx.addIssue({ code: "custom", message });
};
