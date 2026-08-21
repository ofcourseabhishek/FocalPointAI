"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ReadAnnotations } from "./ReadAnnotations";

interface ReadImageProps {
  stage: number;
}

export function ReadImage({ stage }: ReadImageProps) {
  // New selected image: storefront / street scene
  const imageUrl = "https://images.unsplash.com/photo-1787187230218-45bf7aabf025?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDN8eEh4WVRNSExnT2N8fGVufDB8fHx8fA%3D%3D";

  // Subtle transformations to make the photograph participate without turning into a wild animation
  const scale = stage === 0 ? 1 
              : stage === 1 ? 1.02 // Composition
              : stage === 2 ? 1.04 // Light
              : stage === 3 ? 1.06 // Color
              : stage === 4 ? 1.08 // Subject
              : stage === 5 ? 1.1  // Technical
              : 1;                 // Feeling

  const y = stage === 0 ? "0%" 
          : stage === 1 ? "1%" 
          : stage === 2 ? "0%" 
          : stage === 3 ? "-1%" 
          : stage === 4 ? "-2%" 
          : stage === 5 ? "-1%" 
          : "0%";

  // Gentle filters to support the active analysis layer
  const filter = stage === 2 ? "contrast(1.15) brightness(0.9)" // Light
               : stage === 3 ? "saturate(1.2) contrast(1.05)"   // Color
               : "contrast(1) brightness(1) saturate(1)";

  return (
    <div className="relative w-full aspect-[4/5] md:aspect-[3/4] md:max-h-[85vh] bg-[#050505] rounded-sm overflow-hidden border border-white/5 shadow-2xl">
      <motion.div 
        className="w-full h-full relative origin-center"
        animate={{ scale, y, filter }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image 
          src={imageUrl} 
          alt="Evaluation canvas" 
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-black/5 mix-blend-overlay pointer-events-none" />
      </motion.div>
      
      {/* Annotations overlay based on stage */}
      <ReadAnnotations stage={stage} />
    </div>
  );
}
