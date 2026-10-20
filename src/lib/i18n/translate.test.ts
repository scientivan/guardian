import { describe, expect, it } from "vitest";
import messages from "./zh-CN.json";
import { parseLocale, translateText } from "./translate";

describe("interface localization", () => {
  it("accepts only supported cookie values", () => {
    expect(parseLocale("zh-CN")).toBe("zh-CN");
    for (const value of [undefined, "en", "zh", "<script>"]) expect(parseLocale(value)).toBe("en");
  });
  it("keeps English and unknown source text verbatim", () => {
    expect(translateText("en", "  Open App  ")).toBe("  Open App  ");
    for (const text of ["Budi Santoso", "<b>original source</b>", "constructor", "__proto__", "CNY 9,000.00"]) expect(translateText("zh-CN", text)).toBe(text);
  });
  it("translates interface copy with surrounding spacing intact", () => {
    expect(translateText("zh-CN", " Open App ")).toBe(" 打开应用 ");
    expect(translateText("zh-CN", "\nStill missing CNY 9,000.00\n")).toBe("\n仍缺失 CNY 9,000.00\n");
  });
  it("retains dynamic amounts and identifiers without interpreting markup", () => {
    const result = translateText("zh-CN", "Deposits paid were CNY 45,000 and the final bill is CNY 36,000, so CNY 9,000 comes back.");
    for (const amount of ["CNY 45,000", "CNY 36,000", "CNY 9,000"]) expect(result).toContain(amount);
    expect(translateText("zh-CN", "Ask for <script>example</script>")).toBe("请求 <script>example</script>");
  });
  it("preserves every catalogue number, currency code and placeholder", () => {
    const numbers = (text: string) => text.replace(/\{\d+\}/g, "").match(/\d+(?:[.,]\d+)*/g)?.sort() ?? [];
    const slots = (text: string) => text.match(/\{\d+\}/g)?.sort() ?? [];
    for (const [english, chinese] of Object.entries(messages)) {
      expect(numbers(chinese), english).toEqual(numbers(english));
      expect(slots(chinese), english).toEqual(slots(english));
      for (const currency of english.match(/\b(?:CNY|IDR|USD|MYR|SGD|THB|AED|JPY|HKD|EUR)\b/g) ?? []) expect(chinese, english).toContain(currency);
    }
  });
  it("keeps test payment and privacy warnings explicit", () => {
    expect(translateText("zh-CN", "Guardian never holds money: there is no wallet, vault or escrow. A share limit is only a ceiling, not an amount that is taken. Payments in this version run in a sandbox or Stripe test mode, and exchange rates come from a reference table.")).toContain("Stripe 测试模式");
    expect(translateText("zh-CN", "Guardian only pays the hospital’s verified account.")).toContain("已核验账户");
  });
});
