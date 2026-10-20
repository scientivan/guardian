import messages from "./zh-CN.json";
export type Locale = "en" | "zh-CN";
export function parseLocale(value: string | undefined): Locale { return value === "zh-CN" ? "zh-CN" : "en"; }
const catalog: Record<string, string> = messages;
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const patterns = Object.entries(catalog).filter(([key]) => /\{\d+\}/.test(key) && key.replace(/\{\d+\}/g, "").trim().length >= 4).map(([key, value]) => {
  const slots: string[] = [];
  const escaped = key.split(/(\{\d+\})/g).map(part => /^\{\d+\}$/.test(part) ? (slots.push(part), "(.*?)") : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("");
  return { re: new RegExp("^" + escaped + "$"), value, slots, weight: key.length - slots.length * 3 };
}).sort((a, b) => b.weight - a.weight);
export function translateText(locale: Locale, text: string): string {
  if (locale === "en" || !text.trim()) return text;
  const key = normalize(text);
  let translated = Object.hasOwn(catalog, key) ? catalog[key] : undefined;
  if (!translated) for (const pattern of patterns) {
    const match = pattern.re.exec(key);
    if (match) { translated = pattern.value.replace(/\{\d+\}/g, slot => match[pattern.slots.indexOf(slot) + 1] ?? slot); break; }
  }
  if (!translated) {
    const counted = /^(.*?) (\(\d+\))$/.exec(key);
    if (counted && Object.hasOwn(catalog, counted[1])) translated = catalog[counted[1]] + " " + counted[2];
  }
  if (!translated) return text;
  return (text.match(/^\s*/)?.[0] ?? "") + translated + (text.match(/\s*$/)?.[0] ?? "");
}
