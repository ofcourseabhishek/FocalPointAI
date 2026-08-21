"use client";

import { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import Image from "next/image";

export function LearnToSee() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Reduced to 500vh to prevent the "scroll is broken" feeling from dead zones, 
  // but kept long enough to allow for a reflective pace.

  // Scene 1: Photograph fades in immediately (0 to 0.08) to prevent black voids.
  const imageOpacity = useTransform(scrollYProgress, [0, 0.08, 0.9, 1], [0, 1, 1, 0.2]);
  
  // Scene 1: Headline reveals just after the image starts appearing
  const headlineOpacity = useTransform(scrollYProgress, [0.05, 0.12, 0.25, 0.28], [0, 1, 1, 0]);
  const headlineY = useTransform(scrollYProgress, [0.05, 0.12, 0.25, 0.28], [20, 0, 0, -20]);

  // Scene 2: Insights (Light, Composition, Timing, Emotion)
  const insight1Opacity = useTransform(scrollYProgress, [0.3, 0.35, 0.45, 0.48], [0, 1, 1, 0]);
  const insight2Opacity = useTransform(scrollYProgress, [0.48, 0.53, 0.63, 0.66], [0, 1, 1, 0]);
  const insight3Opacity = useTransform(scrollYProgress, [0.66, 0.71, 0.81, 0.84], [0, 1, 1, 0]);
  const insight4Opacity = useTransform(scrollYProgress, [0.84, 0.88, 0.93, 0.95], [0, 1, 1, 0]);

  // Subtle Visual Emphasis Overlays for the photograph
  const overlayLightOpacity = useTransform(scrollYProgress, [0.3, 0.35, 0.45, 0.48], [0, 0.6, 0.6, 0]);
  const overlayCompOpacity = useTransform(scrollYProgress, [0.48, 0.53, 0.63, 0.66], [0, 0.8, 0.8, 0]);
  const imageScale = useTransform(scrollYProgress, [0.66, 0.95], [1, 1.04]);
  const overlayEmotionOpacity = useTransform(scrollYProgress, [0.84, 0.88, 0.93, 0.95], [0, 0.5, 0.5, 0]);

  // Scene 3: Final Statement appears
  const finalOpacity = useTransform(scrollYProgress, [0.95, 0.98, 1], [0, 1, 1]);
  const finalY = useTransform(scrollYProgress, [0.95, 0.98, 1], [20, 0, 0]);

  // A striking, cinematic portrait/street photograph
  const imageUrl = "https://images.unsplash.com/photo-1703088066010-af61bb552da4?w=1200&auto=format&fit=crop&q=80";

  return (
    <section ref={containerRef} className="relative w-full h-[500vh] bg-[#0a0a0a] text-[#e4e4e2] font-sans selection:bg-white/20">
      <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden">
        
        <div className="absolute inset-0 bg-[#0a0a0a] z-0" />
        
        {/* The Photograph */}
        <motion.div 
          className="relative z-10 w-[90vw] md:w-[50vw] max-w-[700px] h-[65vh] md:h-[75vh] overflow-hidden rounded-sm mt-12"
          style={{ opacity: imageOpacity, scale: imageScale }}
        >
          <Image 
            src={imageUrl}
            alt="Cinematic street photography"
            fill
            className="object-cover mix-blend-luminosity opacity-80 transition-opacity duration-1000"
            priority
            sizes="(max-width: 768px) 90vw, 50vw"
          />
          
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          
          {/* Subtle Visual Emphasis: Light */}
          <motion.div 
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{ 
              opacity: overlayLightOpacity,
              background: 'radial-gradient(circle at 65% 30%, rgba(255, 240, 220, 0.15) 0%, transparent 60%)'
            }} 
          />
          
          {/* Subtle Visual Emphasis: Composition */}
          <motion.div 
            className="absolute inset-0 pointer-events-none mix-blend-multiply"
            style={{ 
              opacity: overlayCompOpacity,
              background: 'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.6) 100%)'
            }} 
          />
          
          {/* Subtle Visual Emphasis: Emotion */}
          <motion.div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              opacity: overlayEmotionOpacity,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%)'
            }} 
          />
        </motion.div>

        {/* Scene 1: Introduction Headline - Scaled down for editorial balance */}
        <motion.div 
          className="absolute z-20 w-full px-6 flex flex-col items-center top-[12%] md:top-[15%] pointer-events-none"
          style={{ opacity: headlineOpacity, y: headlineY }}
        >
          <div className="flex flex-col items-center w-full max-w-[1000px]">
            <h2 className="text-[42px] md:text-[80px] lg:text-[100px] font-normal leading-none tracking-tight text-white drop-shadow-2xl text-center text-balance">
              The best photographers<br />
              <span className="text-white/70">don&apos;t see more.</span>
            </h2>
            <p className="text-[32px] md:text-[60px] lg:text-[72px] font-medium text-white/90 mt-12 md:mt-16 drop-shadow-xl text-center">
              They notice more.
            </p>
          </div>
        </motion.div>

        {/* Scene 2: Insights */}
        <motion.div 
          className="absolute z-20 left-[5%] top-[25%] md:left-[15%] md:top-[30%] max-w-[220px]"
          style={{ opacity: insight1Opacity }}
        >
          <p className="text-[16px] md:text-[18px] font-normal tracking-[0.01em] leading-relaxed text-white drop-shadow-lg">
            The light creates the mood.
          </p>
        </motion.div>

        <motion.div 
          className="absolute z-20 right-[5%] bottom-[35%] md:right-[15%] md:bottom-[40%] max-w-[220px]"
          style={{ opacity: insight2Opacity }}
        >
          <p className="text-[16px] md:text-[18px] font-normal tracking-[0.01em] leading-relaxed text-white drop-shadow-lg">
            The frame guides your eye.
          </p>
        </motion.div>

        <motion.div 
          className="absolute z-20 left-[5%] bottom-[20%] md:left-[15%] md:bottom-[25%] max-w-[220px]"
          style={{ opacity: insight3Opacity }}
        >
          <p className="text-[16px] md:text-[18px] font-normal tracking-[0.01em] leading-relaxed text-white drop-shadow-lg">
            The moment was waited for.
          </p>
        </motion.div>

        <motion.div 
          className="absolute z-20 right-[5%] top-[25%] md:right-[15%] md:top-[30%] max-w-[220px]"
          style={{ opacity: insight4Opacity }}
        >
          <p className="text-[16px] md:text-[18px] font-normal tracking-[0.01em] leading-relaxed text-white drop-shadow-lg">
            The silence was captured.
          </p>
        </motion.div>

        {/* Scene 3: Final Statement - Scaled down */}
        <motion.div 
          className="absolute z-30 w-full px-6 flex flex-col items-center justify-center inset-0 pointer-events-none"
          style={{ opacity: finalOpacity, y: finalY }}
        >
          <div className="text-center max-w-[900px]">
            <h2 className="text-[42px] md:text-[80px] lg:text-[96px] font-normal leading-none tracking-tight text-white mb-12 md:mb-16 drop-shadow-2xl text-balance">
              Every photograph<br />is a decision.
            </h2>
            <p className="text-[32px] md:text-[56px] lg:text-[64px] text-white/90 font-medium tracking-wide drop-shadow-xl">
              Learn to see them.
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
