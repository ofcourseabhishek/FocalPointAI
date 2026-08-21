import { Hero } from "@/components/landing/Hero";
import { TheRead } from "@/components/landing/TheRead";
import { LearnToSee } from "@/components/landing/LearnToSee";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* 
        Wrap main content in a container with a background color and higher z-index 
        so it smoothly scrolls over the sticky footer revealing it from underneath.
      */}
      <div className="z-10 bg-[#0a0a0a] w-full flex flex-col relative">
        <Hero />
        <TheRead />
        <LearnToSee />
      </div>
      
      <Footer />
    </main>
  );
}
