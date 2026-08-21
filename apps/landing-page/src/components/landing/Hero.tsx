"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, motion, useTransform } from "framer-motion";
import { ImageReveal } from "./ImageReveal";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const [activeStage, setActiveStage] = useState(0);

  // Map scroll progress to stages
  // 0.0 - 0.2: Stage 0 (Intro, Image visible)
  // 0.2 - 0.4: Stage 1 (Composition)
  // 0.4 - 0.6: Stage 2 (Light)
  // 0.6 - 1.0: Stage 3 (Scale, persists to end)
  useEffect(() => {
    return scrollYProgress.onChange((latest) => {
      if (latest < 0.2) setActiveStage(0);
      else if (latest < 0.4) setActiveStage(1);
      else if (latest < 0.6) setActiveStage(2);
      else setActiveStage(3);
    });
  }, [scrollYProgress]);

  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.02]);

  return (
    <section ref={containerRef} className="relative h-[200vh] bg-[#0a0a0a] text-[#e4e4e2] font-sans selection:bg-white/30 selection:text-white">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.03] mix-blend-screen bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png')] repeat" />
        <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
      </div>

      <div className="sticky top-0 h-screen w-full flex flex-col md:flex-row items-center justify-between px-8 md:px-12 lg:px-20 overflow-hidden z-10 gap-12">
        
        {/* Left column - Content */}
        <div className="w-full md:w-[45%] flex flex-col justify-center relative z-20">
          <motion.div 
            className="flex flex-col gap-6 transform-origin-top-left"
          >
            <span className="text-[10px] md:text-xs font-mono tracking-[0.3em] uppercase text-white/50 border-l border-white/20 pl-4">
              See Beyond The Frame
            </span>
            
            <h1 className="text-4xl md:text-5xl lg:text-[5.5rem] leading-[0.95] font-medium tracking-tight font-sans whitespace-nowrap">
              Every image<br />
              <span className="opacity-70">has a reason.</span>
            </h1>
            
            <p className="max-w-sm text-base md:text-lg text-white/60 leading-relaxed font-light mt-4">
              See the choices hidden<br />
              inside every frame.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button className="group relative overflow-hidden bg-white text-black px-8 py-4 text-xs uppercase tracking-widest font-mono font-semibold w-fit rounded-sm">
                <span className="relative z-10 flex items-center gap-3">
                  Explore the frame
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform group-hover:translate-x-1 transition-transform">
                    <path d="M1 6H11M11 6L6 1M11 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <div className="absolute inset-0 bg-[#e4e4e2] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.16,1,0.3,1]" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right column - Image */}
        <div className="w-full h-[60vh] md:h-[80vh] md:w-[48%] relative flex items-center justify-center">
          <motion.div style={{ scale: imageScale }} className="w-full h-full relative">
            <ImageReveal activeStage={activeStage} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
