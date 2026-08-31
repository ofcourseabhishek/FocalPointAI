"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

export function SmoothScrolling({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <ReactLenis
      root
      options={{
        lerp: shouldReduceMotion ? 1 : 0.05,
        duration: shouldReduceMotion ? 0 : 1.5,
        smoothWheel: !shouldReduceMotion,
      }}
    >
      {children}
    </ReactLenis>
  );
}
