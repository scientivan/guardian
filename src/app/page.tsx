import { Capabilities } from "@/components/landing/Capabilities";
import { CurrencyMarquee } from "@/components/landing/CurrencyMarquee";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Nav } from "@/components/landing/Nav";
import { Protection } from "@/components/landing/Protection";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <CurrencyMarquee />
        <Capabilities />
        <HowItWorks />
        <Protection />
      </main>
      <Footer />
    </>
  );
}
