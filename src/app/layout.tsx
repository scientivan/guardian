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

export const metadata: Metadata = {
  title: "Guardian, the deposit and bill guardian",
  description:
    "An AI agent team that explains foreign hospital bills and pays deposits only to the hospital’s verified account, with each payer choosing what they can give.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${figures.variable}`}>
      <body className="bg-white font-sans text-lead antialiased">{children}</body>
    </html>
  );
}
