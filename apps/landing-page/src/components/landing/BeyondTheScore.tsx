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
  const obsOpacity = useTransform(scrollYProgress, [0.25, 0.45], [0, 1]);

  // 45-70%: Frame 05 expands / sequence recomposes
  const editProgress = useTransform(scrollYProgress, [0.45, 0.7], [0, 1]);
  
  // Animate width instead of scale to maintain aspect ratio and trigger natural layout shifts without collapsing
  const frame5WidthDesktop = useTransform(editProgress, [0, 1], ["15%", "26%"]);
  const otherWidthDesktop = useTransform(editProgress, [0, 1], ["15%", "12.5%"]);
  
  const frame5WidthMobile = useTransform(editProgress, [0, 1], ["40vw", "60vw"]);
  const otherWidthMobile = useTransform(editProgress, [0, 1], ["40vw", "32vw"]);

  const otherOpacity = useTransform(editProgress, [0, 1], [1, 0.6]);

  // Mobile pan to keep Frame 05 in view
  const mobilePanX = useTransform(editProgress, [0, 1], ["0%", "-45%"]);

  // 70-88%: Explanation + "You waited"
  const explanationOpacity = useTransform(scrollYProgress, [0.7, 0.88], [0, 1]);
  const explanationY = useTransform(scrollYProgress, [0.7, 0.88], [10, 0]);

  // 88-100%: "A better eye stays with you"
  const finalStatementOpacity = useTransform(scrollYProgress, [0.88, 1], [0, 1]);
  const finalStatementY = useTransform(scrollYProgress, [0.88, 1], [10, 0]);

  return (
    <section 
      ref={containerRef} 
      className="relative w-full h-[250vh] bg-[#F1EFEA] text-[#171717] font-sans"
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
        <div className="w-full flex-1 flex flex-col justify-start items-center mt-12 md:mt-20 px-6 md:px-12 max-w-[1400px] mx-auto">
          
          <motion.div 
            className="flex flex-row items-end gap-2 md:gap-4 w-max md:w-full"
            style={{ x: isMobile ? mobilePanX : 0 }}
          >
            {framesData.map((frame, i) => {
              const isSelected = i === 4; // Frame 05

              return (
                <motion.div 
                  key={frame.id}
                  className="relative flex flex-col shrink-0"
                  style={{
                    width: isMobile 
                      ? (isSelected ? frame5WidthMobile : otherWidthMobile) 
                      : (isSelected ? frame5WidthDesktop : otherWidthDesktop),
                    opacity: isSelected ? 1 : otherOpacity,
                  }}
                >
                  {/* Image Frame with forced aspect ratio prevents vertical collapse */}
                  <div className="aspect-[3/4] relative w-full bg-black/5 overflow-hidden border border-black/10 shadow-sm">
                    <Image
                      src={frame.src}
                      alt={`Frame ${frame.id}`}
                      fill
                      className="object-cover object-center grayscale-[15%] contrast-[1.05]"
                      sizes="(max-width: 768px) 60vw, 25vw"
                    />
                    
                    {/* Editorial Mark attached directly to the frame's DOM */}
                    {isSelected && (
                      <motion.div 
                        className="absolute bottom-2 right-2 md:bottom-4 md:right-4 font-mono text-xs md:text-sm text-white mix-blend-difference border border-white px-2 py-0.5 rounded-sm"
                        style={{ opacity: explanationOpacity }}
                      >
                        SELECT
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Contact Sheet Labels */}
                  <div className="mt-3 font-mono text-[10px] md:text-xs tracking-wider absolute top-full left-0 w-full">
                    <div className="opacity-40">{frame.id}</div>
                    <motion.div 
                      className="opacity-90 mt-1 whitespace-nowrap" 
                      style={{ opacity: obsOpacity }}
                    >
                      {frame.obs}
                    </motion.div>
                  </div>

                  {/* Explanation Typography perfectly anchored beneath Frame 05 */}
                  {isSelected && (
                    <motion.div 
                      className="absolute top-[100%] left-0 pt-16 md:pt-20 w-[260px] md:w-[320px] pointer-events-none z-20"
                      style={{ opacity: explanationOpacity, y: explanationY }}
                    >
                      <div className="font-mono text-[10px] opacity-40 tracking-widest uppercase mb-4">
                        FRAME 05
                      </div>
                      
                      <div className="space-y-1 font-mono text-[10px] md:text-xs opacity-80 leading-relaxed mb-8">
                        <p>The subject reaches the light.</p>
                        <p>The background falls away.</p>
                        <p>The gesture completes the frame.</p>
                      </div>
                      
                      <div>
                        <div className="font-mono text-[10px] opacity-40 mb-3 uppercase tracking-widest">
                          What Changed?
                        </div>
                        <h3 className="text-2xl md:text-4xl font-medium tracking-tight mb-2">
                          You waited.
                        </h3>
                        <p className="text-[10px] md:text-xs opacity-60 font-mono tracking-wide mt-2">
                          Next time, you&apos;ll know what to wait for.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

        </div>

        {/* Final Statement (Lower left) */}
        <motion.div 
          className="absolute bottom-12 left-6 md:bottom-20 md:left-12 pointer-events-none z-30"
          style={{ opacity: finalStatementOpacity, y: finalStatementY }}
        >
          <h2 className="text-xl md:text-[32px] font-normal tracking-tight text-[#171717]">
            A better eye stays with you.
          </h2>
        </motion.div>

      </div>
    </section>
  );
}
