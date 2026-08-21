"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ReadAnnotationsProps {
  stage: number;
}

export function ReadAnnotations({ stage }: ReadAnnotationsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <AnimatePresence>
        
        {/* Stage 1: Composition (Structural elements, geometry) */}
        {stage === 1 && (
          <motion.div
            key="composition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {/* Storefront Geometry - Vertical and horizontal repetition */}
            <div className="absolute left-[20%] top-0 bottom-0 w-[1px] bg-white/40" />
            <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-white/40" />
            <div className="absolute left-[80%] top-0 bottom-0 w-[1px] bg-white/40" />
            
            <div className="absolute top-[40%] left-0 right-0 h-[1px] bg-white/40" />
            <div className="absolute top-[65%] left-0 right-0 h-[1px] bg-white/40" />
            
            <div className="absolute top-4 left-4 text-[10px] font-mono text-white/70 tracking-widest uppercase bg-black/40 px-2 py-1 rounded-sm backdrop-blur-md">
              Structural Alignment
            </div>
          </motion.div>
        )}

        {/* Stage 2: Light (Sunlight direction, shadows) */}
        {stage === 2 && (
          <motion.div
            key="light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {/* Highlight overlay */}
            <div className="absolute top-[20%] right-[10%] w-[40%] h-[30%] border border-yellow-500/30 bg-yellow-500/10 mix-blend-color-dodge" />
            {/* Shadow overlay */}
            <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[40%] border border-blue-500/30 bg-blue-900/20 mix-blend-multiply" />
            
            {/* Direction arrow */}
            <svg className="absolute top-[10%] right-[20%] w-12 h-12 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" transform="rotate(45 12 12)" />
            </svg>

            <div className="absolute bottom-4 left-4 text-[10px] font-mono text-white/70 tracking-widest uppercase bg-black/40 px-2 py-1 rounded-sm backdrop-blur-md">
              Tonal Separation
            </div>
          </motion.div>
        )}

        {/* Stage 3: Color (Awning, warm signage) */}
        {stage === 3 && (
          <motion.div
            key="color"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {/* Color swatches extracted */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3">
              <div className="w-6 h-6 rounded-sm bg-[#3a4a3a] border border-white/20 shadow-lg" />
              <div className="w-6 h-6 rounded-sm bg-[#a87c5f] border border-white/20 shadow-lg" />
              <div className="w-6 h-6 rounded-sm bg-[#1e2328] border border-white/20 shadow-lg" />
              <div className="w-6 h-6 rounded-sm bg-[#c9c5c1] border border-white/20 shadow-lg" />
            </div>

            {/* Target boxes over color regions */}
            <div className="absolute top-[35%] left-[20%] w-12 h-12 border border-[#3a4a3a] border-opacity-70 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white/70" />
            </div>
            
            <div className="absolute top-[55%] left-[60%] w-12 h-12 border border-[#a87c5f] border-opacity-70 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white/70" />
            </div>
          </motion.div>
        )}

        {/* Stage 4: Subject (Attention hierarchy) */}
        {stage === 4 && (
          <motion.div
            key="subject"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
          >
            {/* Saliency mask */}
            <div className="absolute inset-0" style={{
              maskImage: 'radial-gradient(circle at 45% 65%, transparent 15%, black 45%)',
              WebkitMaskImage: 'radial-gradient(circle at 45% 65%, transparent 15%, black 45%)'
            }}>
              <div className="w-full h-full bg-black/50" />
            </div>

            <div className="absolute top-[65%] left-[45%] -translate-x-1/2 -translate-y-1/2 border border-white/30 w-32 h-32 rounded-full border-dashed" />
            
            <div className="absolute bottom-8 right-8 text-[10px] font-mono text-white/70 tracking-widest uppercase bg-black/40 px-2 py-1 rounded-sm backdrop-blur-md">
              Primary Focus
            </div>
          </motion.div>
        )}

        {/* Stage 5: Technical (Exposure, Focus area) */}
        {stage === 5 && (
          <motion.div
            key="technical"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <div className="absolute left-6 bottom-6 flex flex-col gap-2 font-mono text-[10px] tracking-widest uppercase text-white/60">
              <div className="flex items-center gap-3">
                <span className="w-10">ISO</span>
                <span className="text-white">400</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-10">SHUTTER</span>
                <span className="text-white">1/1000</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-10">APERTURE</span>
                <span className="text-white">f/5.6</span>
              </div>
            </div>

            {/* Focus plane grid */}
            <div className="absolute top-[50%] left-0 w-full h-[30%] bg-[linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.1)_25px)] bg-[size:25px_100%] opacity-50 mask-gradient" style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 50%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 50%, transparent)'
            }} />
          </motion.div>
        )}

        {/* Stage 6: Feeling (Clean photograph) */}
        {/* No overlays */}
        
      </AnimatePresence>
    </div>
  );
}
