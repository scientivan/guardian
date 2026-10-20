"use client";
import { createContext, useContext, useEffect, useState, createElement, type ReactNode, type ComponentPropsWithRef } from "react";
import { translateText, type Locale } from "@/lib/i18n/translate";
const Context = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: "en", setLocale: () => {} });
export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "zh-CN" ? "Guardian，押金与账单守护助手" : "Guardian, the deposit and bill guardian";
  }, [locale]);
  function setLocale(next: Locale) {
    document.cookie = `guardian-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    updateLocale(next);
  }
  return <Context.Provider value={{ locale, setLocale }}>{children}</Context.Provider>;
}
export function useLocale() { return useContext(Context); }
export function LocalizedText({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  return typeof children === "string" ? translateText(locale, children) : children;
}
export function LocalizedElement<T extends keyof React.JSX.IntrinsicElements>({ as, ...props }: { as: T } & ComponentPropsWithRef<T>) {
  const { locale } = useLocale();
  const localized = { ...props } as Record<string, unknown>;
  for (const key of ["title", "aria-label", "aria-description", "placeholder", "alt"]) if (typeof localized[key] === "string") localized[key] = translateText(locale, localized[key]);
  return createElement(as, localized);
}
export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  return <div role="group" aria-label={locale === "en" ? "Language" : "语言"} className="inline-flex shrink-0 rounded-full border border-line bg-white p-0.5 text-xs font-semibold">
    {([ ["en", "English"], ["zh-CN", "中文"] ] as const).map(([value, label]) => <button key={value} type="button" lang={value} aria-pressed={locale === value} onClick={() => setLocale(value)} className={`min-h-9 rounded-full px-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-serpent ${locale === value ? "bg-serpent text-white" : "text-ink-2 hover:bg-mist"}`}>{label}</button>)}
  </div>;
}
