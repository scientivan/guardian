import { cookies } from "next/headers";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { parseLocale } from "@/lib/i18n/translate";
import type { Metadata } from "next";
import { DM_Serif_Display, Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const serif = DM_Serif_Display({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-dm-serif",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

// Money and other figures. Never the serif (UI-RULES).
const figures = Plus_Jakarta_Sans({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const englishMetadata: Metadata = {
  title: "Guardian, the deposit and bill guardian",
  description:
    "An AI agent team that explains foreign hospital bills and pays deposits only to the hospital’s verified account, with each payer choosing what they can give.",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get("guardian-language")?.value);
  return locale === "zh-CN" ? { title: "Guardian，押金与账单守护助手", description: "AI 助手团队帮助您理解境外医院账单，仅向医院已核验账户支付押金，并由每位付款人自主决定出资额度。" } : englishMetadata;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = parseLocale((await cookies()).get("guardian-language")?.value);
  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable} ${figures.variable}`}>
      <body className="bg-white font-sans text-lead antialiased"><LocaleProvider initialLocale={locale}>{children}</LocaleProvider></body>
    </html>
  );
}
