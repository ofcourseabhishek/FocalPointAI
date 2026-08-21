"use client";

import { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import Image from "next/image";

const framesData = [
  { id: "01", src: "/beyonthescore/frames/frame-01.webp", obs: "too early" },
  { id: "02", src: "/beyonthescore/frames/frame-02.webp", obs: "subject enters" },
  { id: "03", src: "/beyonthescore/frames/frame-03.webp", obs: "forms overlap" },
  { id: "04", src: "/beyonthescore/frames/frame-04.webp", obs: "separation appears" },
  { id: "05", src: "/beyonthescore/frames/frame-05.webp", obs: "moment resolves" },
  { id: "06", src: "/beyonthescore/frames/frame-06.webp", obs: "moment passes" },
];

export function BeyondTheScore() {
  const containerRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // 0-25%: Contact sheet visible
  // 25-45%: Observations appear
  const obsOpacity = useTransform(scrollYProgress, [0, 0.25, 0.45, 1], [0, 0, 1, 1]);

  // 45-60%: Neighbours create space
  const neighbourShiftProgress = useTransform(scrollYProgress, [0, 0.45, 0.6, 1], [0, 0, 1, 1]);
  // 50-65%: Frame 05 expands into the created space
  const frame5ScaleProgress = useTransform(scrollYProgress, [0, 0.5, 0.65, 1], [0, 0, 1, 1]);
  
  // Scale Frame 5 up (reduced slightly to give text more balance)
  const frame5Scale = useTransform(frame5ScaleProgress, [0, 1], [1, 1.30]);
  
  // Inverse scale for explanation text so typography remains sharp and stable
  const explanationScale = useTransform(frame5Scale, (s) => 1 / s);

  // Frame 05 shifts left to perfectly center itself + text on desktop
  const frame5Shift = useTransform(neighbourShiftProgress, [0, 1], ["0vw", "-40vw"]); 
  const frame5ShiftMobile = useTransform(neighbourShiftProgress, [0, 1], [0, 0]);

  // Left neighbours (01-04) shift further left to create a massive gap and slice Frame 04 on the left edge
  const leftNeighbourShift = useTransform(neighbourShiftProgress, [0, 1], ["0vw", "-60vw"]); 
  const leftNeighbourShiftMobile = useTransform(neighbourShiftProgress, [0, 1], [0, -40]);

  // Right neighbour (06) shifts right to create a gap and slice Frame 06 on the right edge
  const rightNeighbourShift = useTransform(neighbourShiftProgress, [0, 1], ["0vw", "12vw"]); 
  const rightNeighbourShiftMobile = useTransform(neighbourShiftProgress, [0, 1], [0, 40]);

  // Opacity for unselected frames
  const otherOpacity = useTransform(neighbourShiftProgress, [0, 1], [1, 0.6]);

  // 60-65%: Selection mark appears (after scale finishes)
  const markOpacity = useTransform(scrollYProgress, [0, 0.6, 0.65, 1], [0, 0, 1, 1]);

  // Staggered Text Reveal (65-80%)
  // Mapping explicitly up to 1.0 at both boundaries guarantees no extrapolation fading
  const text1Opacity = useTransform(scrollYProgress, [0, 0.65, 0.68, 1], [0, 0, 1, 1]);
  const text1Y = useTransform(scrollYProgress, [0, 0.65, 0.68, 1], [8, 8, 0, 0]);

  const text2Opacity = useTransform(scrollYProgress, [0, 0.68, 0.72, 1], [0, 0, 1, 1]);
  const text2Y = useTransform(scrollYProgress, [0, 0.68, 0.72, 1], [8, 8, 0, 0]);

  const text3Opacity = useTransform(scrollYProgress, [0, 0.72, 0.75, 1], [0, 0, 1, 1]);
  const text3Y = useTransform(scrollYProgress, [0, 0.72, 0.75, 1], [8, 8, 0, 0]);

  const text4Opacity = useTransform(scrollYProgress, [0, 0.75, 0.78, 1], [0, 0, 1, 1]);
  const text4Y = useTransform(scrollYProgress, [0, 0.75, 0.78, 1], [8, 8, 0, 0]);
  
  const text5Opacity = useTransform(scrollYProgress, [0, 0.78, 0.81, 1], [0, 0, 1, 1]);
  const text5Y = useTransform(scrollYProgress, [0, 0.78, 0.81, 1], [8, 8, 0, 0]);

  // LONG PAUSE (0.81 - 0.92) to let "You waited." hold as the emotional payoff

  // 92-96%: "A better eye stays with you" appears
  const finalStatementOpacity = useTransform(scrollYProgress, [0, 0.92, 0.96, 1], [0, 0, 1, 1]);
  const finalStatementY = useTransform(scrollYProgress, [0, 0.92, 0.96, 1], [10, 10, 0, 0]);

  // Mobile pan to keep Frame 05 in view
  const mobilePanX = useTransform(neighbourShiftProgress, [0, 1], ["0%", "-60%"]);

  return (
    <section 
      ref={containerRef} 
      className="relative w-full h-[350vh] bg-[#F1EFEA] text-[#171717] font-sans"
    >
      <div className="sticky top-0 w-full h-screen overflow-hidden flex flex-col pt-12 md:pt-20">
        
        {/* Header */}
        <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 flex justify-between items-start pointer-events-none z-10 shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-medium tracking-tight uppercase">Beyond the Score</h2>
            <p className="font-mono text-[10px] md:text-xs opacity-50 mt-2 uppercase tracking-widest">
              One shoot &middot; Six frames &middot; One lesson
            </p>
          </div>
          <div className="font-mono text-sm opacity-40">04</div>
        </div>

        {/* Contact Sheet Area */}
        <div className="w-full flex-1 flex flex-col justify-center items-start md:items-center px-6 md:px-12 max-w-[1400px] mx-auto relative pb-12 md:pt-[10vh]">
          
          <motion.div 
            className="flex flex-row items-start md:items-end gap-2 md:gap-4 w-max md:w-full"
            style={{ x: isMobile ? mobilePanX : 0 }}
          >
            {framesData.map((frame, i) => {
              const isSelected = i === 4; // Frame 05

              // Apply shifting to siblings AND Frame 05 itself to center it
              let shiftDesktop;
              let shiftMobile;
              if (i < 4) { // Frames 01-04 shift far left
                shiftDesktop = leftNeighbourShift;
                shiftMobile = leftNeighbourShiftMobile;
              } else if (i === 4) { // Frame 05 shifts left just enough to center
                shiftDesktop = frame5Shift;
                shiftMobile = frame5ShiftMobile;
              } else { // Frame 06 shifts far right
                shiftDesktop = rightNeighbourShift;
                shiftMobile = rightNeighbourShiftMobile;
              }

              return (
                <motion.div 
                  key={frame.id}
                  className="relative flex flex-col shrink-0"
                  style={{
                    width: isMobile ? "40vw" : "15%",
                    opacity: isSelected ? 1 : otherOpacity,
                    scale: isSelected ? frame5Scale : 1,
                    x: isMobile ? shiftMobile : shiftDesktop,
                    originY: 1, 
                    originX: 0,
                    zIndex: isSelected ? 20 : 1,
                  }}
                >
                  
                  {/* Image Frame */}
                  <div className="aspect-[3/4] relative w-full overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.06)] bg-black/5">
                    <Image
                      src={frame.src}
                      alt={`Frame ${frame.id}`}
                      fill
                      className="object-cover object-center grayscale-[15%] contrast-[1.05]"
                      sizes="(max-width: 768px) 60vw, 25vw"
                    />
                    
                    {/* Editorial Crop Marks for Selection */}
                    {isSelected && (
                      <motion.div 
                        className="absolute inset-0 pointer-events-none"
                        style={{ opacity: markOpacity }}
                      >
                        <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-white/60 mix-blend-difference" />
                        <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-white/60 mix-blend-difference" />
                        <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-white/60 mix-blend-difference" />
                        <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-white/60 mix-blend-difference" />
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Contact Sheet Labels */}
                  <div className="mt-4 font-mono text-[10px] md:text-xs tracking-wider absolute top-full left-0 w-full">
                    <div className="opacity-40">{frame.id} / 06</div>
                    <motion.div 
                      className="opacity-90 mt-1 whitespace-nowrap" 
                      style={{ opacity: obsOpacity }}
                    >
                      {frame.obs}
                    </motion.div>
                  </div>

                  {/* Explanation Typography 
                      Desktop: beside Frame 05
                      Mobile: below Frame 05 
                  */}
                  {isSelected && (
                    <motion.div 
                      className="absolute top-[100%] left-0 pt-16 w-[260px] md:top-auto md:bottom-0 md:left-[100%] md:pt-0 md:pl-8 lg:pl-12 md:w-[470px] pointer-events-none z-20 flex flex-col"
                      style={{ 
                        scale: explanationScale,
                        originX: 0,
                        originY: 1,
                      }}
                    >
                      
                      {/* Step 4: Reveal FRAME 05 */}
                      <motion.div 
                        style={{ opacity: text1Opacity, y: text1Y }}
                        className="font-mono text-xs md:text-sm tracking-widest uppercase mb-4"
                      >
                        FRAME 05
                      </motion.div>
                      
                      {/* Step 5: Reveal Description */}
                      <motion.div 
                        style={{ opacity: text2Opacity, y: text2Y }}
                        className="space-y-1 font-mono text-xs md:text-sm leading-relaxed mb-8 max-w-[420px]"
                      >
                        <p>The subject reaches the light.</p>
                        <p>The background falls away.</p>
                        <p>The gesture completes the frame.</p>
                      </motion.div>
                      
                      {/* Step 6: Reveal WHAT CHANGED */}
                      <motion.div 
                        style={{ opacity: text3Opacity, y: text3Y }}
                        className="mb-1 font-mono text-xs md:text-sm uppercase tracking-widest"
                      >
                        What Changed?
                      </motion.div>

                      {/* Step 7: Reveal You Waited */}
                      <motion.div 
                        style={{ opacity: text4Opacity, y: text4Y }}
                      >
                        <h3 className="text-4xl md:text-6xl font-medium tracking-tight mb-4 font-sans">
                          You waited.
                        </h3>
                      </motion.div>
                        
                      <motion.div
                        style={{ opacity: text5Opacity, y: text5Y }}
                      >
                        <p className="text-xs md:text-sm font-mono tracking-wide max-w-[360px]">
                          Next time, you&apos;ll know what to wait for.
                        </p>
                      </motion.div>

                      {/* Final Statement anchored logically below the lesson */}
                      <motion.div 
                        style={{ opacity: finalStatementOpacity, y: finalStatementY }}
                        className="mt-8 md:mt-12 pt-6 border-t border-black/10"
                      >
                        <h2 className="text-2xl md:text-[32px] font-normal tracking-tight leading-tight text-[#171717]">
                          A better eye stays with you.
                        </h2>
                      </motion.div>

                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
