import { Hero } from "@/components/landing/Hero";
import { ReadSection } from "@/components/landing/ReadSection";
import { ObservationToDirection } from "@/components/landing/ObservationToDirection";
import { CallToAction } from "@/components/landing/CallToAction";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      {/* The foreground preserves the footer's curtain reveal. */}
      <main className="relative z-10 flex min-h-screen w-full flex-col bg-[#0a0a0a]">
        <Hero />
        <ReadSection />
        <ObservationToDirection />
        <CallToAction />
      </main>
      
      <Footer />
    </>
  );
}
