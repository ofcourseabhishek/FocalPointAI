"use client";

import { useRef, useState, useEffect } from "react";
import { useScroll, motion } from "framer-motion";
import { ReadImage } from "./ReadImage";

const content = [
  {
    stage: 0,
    label: "THE READ",
    statement: "One photograph.\nSix ways to understand it.",
    description: "A photograph is more than a score.\n\nSnapgrade examines the choices\nthat make an image work."
  },
  {
    stage: 1,
    index: "01",
    category: "COMPOSITION",
    description: "How elements are arranged\nand how the frame guides attention."
  },
  {
    stage: 2,
    index: "02",
    category: "LIGHT",
    description: "How brightness, contrast,\nand shadows influence perception."
  },
  {
    stage: 3,
    index: "03",
    category: "COLOR",
    description: "How color relationships\nshape mood and hierarchy."
  },
  {
    stage: 4,
    index: "04",
    category: "SUBJECT",
    description: "How visual focus\ncreates meaning."
  },
  {
    stage: 5,
    index: "05",
    category: "TECHNICAL",
    description: "How camera decisions\nshape the final image."
  },
  {
    stage: 6,
    index: "06",
    category: "FEELING",
    description: "How every decision combines\ninto visual impact."
  }
];

export function TheRead() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    return scrollYProgress.onChange((latest) => {
      // 7 items total.
      const current = Math.min(Math.floor(latest * 7), 6);
      setActiveStage(current);
    });
  }, [scrollYProgress]);

  return (
    <section ref={containerRef} className="relative w-full bg-[#0a0a0a] text-[#e4e4e2] font-sans">
      <div className="max-w-[90rem] mx-auto px-6 md:px-12 lg:px-20 flex flex-col md:flex-row relative">
        
        {/* Left Column - Scrolling Text */}
        <div className="w-full md:w-[45%] flex flex-col relative z-20 pb-[50vh]">
          {content.map((item, i) => (
            <div key={i} className="h-[100vh] flex flex-col justify-center pr-8">
              <motion.div
                initial={{ opacity: 0.2 }}
                animate={{ opacity: activeStage === i ? 1 : 0.2 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6 md:gap-8 max-w-[500px]"
              >
                {item.stage === 0 ? (
                  <>
                    <span className="text-[14px] font-medium tracking-[0.15em] uppercase text-white/70">
                      {item.label}
                    </span>
                    <h2 className="text-[40px] md:text-[64px] lg:text-[80px] font-medium leading-[0.95] tracking-tight whitespace-pre-line text-white">
                      {item.statement}
                    </h2>
                    <p className="text-[18px] md:text-[22px] lg:text-[28px] font-normal leading-[1.3] text-white/70 whitespace-pre-line mt-4 md:mt-8">
                      {item.description}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-3">
                      <span className="text-[14px] md:text-[18px] font-normal text-white/40">
                        {item.index}
                      </span>
                      <span className="text-[14px] font-medium tracking-[0.15em] uppercase text-white/70">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[24px] md:text-[28px] lg:text-[32px] font-normal leading-[1.2] whitespace-pre-line text-white mt-2">
                      {item.description}
                    </p>
                  </>
                )}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Right Column - Sticky Image */}
        <div className="w-full md:w-[50%] h-[50vh] md:h-screen sticky top-0 flex items-center justify-center pt-8 md:pt-0">
          <ReadImage stage={activeStage} />
        </div>
        
      </div>
      
      {/* Background gradients to blend with Hero and next section */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#0a0a0a] to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-black to-transparent pointer-events-none z-20" />
    </section>
  );
}
