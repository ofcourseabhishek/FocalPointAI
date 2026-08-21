"use client";

import { motion } from "framer-motion";
import { DecisionMarkers } from "./DecisionMarkers";
import Image from "next/image";

interface ImageRevealProps {
  activeStage: number;
}

export function ImageReveal({ activeStage }: ImageRevealProps) {
  // Curated architectural image
  const imageUrl = "https://images.unsplash.com/photo-1633811126490-eb4dd98691ed?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a] rounded-xl shadow-2xl">
      <motion.div 
        className="relative w-full h-full"
        initial={{ scale: 0.98, opacity: 0.95 }}
        animate={
          activeStage >= 3
            ? { scale: [1, 1.015], opacity: 1 }
            : { scale: 1, opacity: 1 }
        }
        transition={
          activeStage >= 3
            ? { duration: 12, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }
            : { duration: 1.8, ease: [0.16, 1, 0.3, 1] }
        }
      >
        <Image 
          src={imageUrl} 
          alt="Cinematic street photography" 
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 45vw"
        />
        
        {/* Subtle grain overlay for editorial feel */}
        <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      </motion.div>

      <DecisionMarkers stage={4} activeStage={activeStage} />
    </div>
  );
}
