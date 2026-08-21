"use client";

import { motion } from "framer-motion";

interface DecisionMarkerProps {
  stage: number;
  activeStage: number;
}

export function DecisionMarkers({ activeStage }: DecisionMarkerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden text-white/90">
      {/* Stage 1: Composition Marker */}
      <div className="absolute top-[20%] left-[10%] flex flex-col items-start">
        <div className="flex items-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: activeStage >= 1 ? 1 : 0 }}
            className="w-1.5 h-1.5 bg-white rounded-full border border-black/20 z-10" 
          />
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: activeStage >= 1 ? 1 : 0 }}
            style={{ originX: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-[1px] w-24 bg-white/40" 
          />
        </div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: activeStage >= 1 ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-4 ml-2 px-3 py-2 rounded-lg"
          style={{ 
            background: 'rgba(0,0,0,0.15)', 
            backdropFilter: 'blur(4px)',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
          }}
        >
          <span className="block font-mono text-[10px] tracking-widest uppercase text-white/80">01 / Composition</span>
          <p className="mt-1 font-sans text-xs md:text-sm font-light leading-snug">
            The architecture creates<br />
            a natural frame.
          </p>
        </motion.div>
      </div>

      {/* Stage 2: Light Marker */}
      <div className="absolute top-[45%] right-[10%] flex flex-col items-end">
        <div className="flex items-center">
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: activeStage >= 2 ? 1 : 0 }}
            style={{ originX: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-[1px] w-32 bg-white/40" 
          />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: activeStage >= 2 ? 1 : 0 }}
            className="w-1.5 h-1.5 bg-white rounded-full border border-black/20 z-10" 
          />
        </div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: activeStage >= 2 ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-4 mr-2 text-right px-3 py-2 rounded-lg"
          style={{ 
            background: 'rgba(0,0,0,0.15)', 
            backdropFilter: 'blur(4px)',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
          }}
        >
          <span className="block font-mono text-[10px] tracking-widest uppercase text-white/80">02 / Light</span>
          <p className="mt-1 font-sans text-xs md:text-sm font-light leading-snug">
            Shadow and sunlight<br />
            create separation.
          </p>
        </motion.div>
      </div>

      {/* Stage 3: Scale Marker */}
      <div className="absolute bottom-[25%] left-[20%] flex flex-col items-start">
        <div className="flex items-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: activeStage >= 3 ? 1 : 0 }}
            className="w-1.5 h-1.5 bg-white rounded-full border border-black/20 z-10" 
          />
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: activeStage >= 3 ? 1 : 0 }}
            style={{ originX: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-[1px] w-16 bg-white/40" 
          />
        </div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: activeStage >= 3 ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-4 ml-2 px-3 py-2 rounded-lg"
          style={{ 
            background: 'rgba(0,0,0,0.15)', 
            backdropFilter: 'blur(4px)',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
          }}
        >
          <span className="block font-mono text-[10px] tracking-widest uppercase text-white/80">03 / Scale</span>
          <p className="mt-1 font-sans text-xs md:text-sm font-light leading-snug">
            A single figure creates<br />
            a sense of space.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
