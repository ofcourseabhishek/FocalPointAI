"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";

type ActiveStage = 0 | 1 | 2 | 3 | 4;

interface HeroProcessOverlaysProps {
  activeStage: ActiveStage;
  shouldReduceMotion: boolean;
}

const PHOTO_WIDTH = 1600;
const PHOTO_HEIGHT = 2400;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type StageLayerProps = {
  stage: Exclude<ActiveStage, 0>;
  activeStage: ActiveStage;
  shouldReduceMotion: boolean;
  children: React.ReactNode;
};

type RevealProps = {
  active: boolean;
  shouldReduceMotion: boolean;
  delay?: number;
  children?: React.ReactNode;
};

type MarkerProps = RevealProps & {
  x: number;
  y: number;
  radius: number;
  filled?: boolean;
};

type LabelProps = RevealProps & {
  x: number;
  y: number;
  scale: number;
  align?: "start" | "end";
};

function useCoverScale(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const updateScale = () => {
      const { width, height } = svg.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setScale(Math.max(width / PHOTO_WIDTH, height / PHOTO_HEIGHT));
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [svgRef]);

  return scale;
}

function StageLayer({ stage, activeStage, shouldReduceMotion, children }: StageLayerProps) {
  const isActive = activeStage === stage;

  return (
    <motion.g
      animate={{ opacity: isActive ? 1 : 0 }}
      initial={false}
      transition={{
        duration: shouldReduceMotion ? 0 : isActive ? 0.32 : 0.14,
        ease: EASE_OUT,
      }}
    >
      {children}
    </motion.g>
  );
}

function Reveal({ active, shouldReduceMotion, delay = 0, children }: RevealProps) {
  return (
    <motion.g
      animate={{ opacity: active ? 1 : 0 }}
      initial={false}
      transition={{
        duration: shouldReduceMotion ? 0 : active ? 0.24 : 0.12,
        delay: shouldReduceMotion || !active ? 0 : delay,
        ease: EASE_OUT,
      }}
    >
      {children}
    </motion.g>
  );
}

function DrawnPath({ active, shouldReduceMotion, delay = 0, d }: RevealProps & { d: string }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      vectorEffect="non-scaling-stroke"
      animate={{ opacity: active ? 0.82 : 0, pathLength: active ? 1 : 0 }}
      initial={false}
      transition={{
        opacity: {
          duration: shouldReduceMotion ? 0 : active ? 0.2 : 0.12,
          delay: shouldReduceMotion || !active ? 0 : delay,
          ease: EASE_OUT,
        },
        pathLength: {
          duration: shouldReduceMotion ? 0 : active ? 0.28 : 0.12,
          delay: shouldReduceMotion || !active ? 0 : delay,
          ease: EASE_OUT,
        },
      }}
    />
  );
}

function Marker({ active, shouldReduceMotion, delay, x, y, radius, filled = false, children }: MarkerProps) {
  return (
    <Reveal active={active} shouldReduceMotion={shouldReduceMotion} delay={delay}>
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        vectorEffect="non-scaling-stroke"
      />
      {children}
    </Reveal>
  );
}

function Label({ active, shouldReduceMotion, delay, x, y, scale, align = "start", children }: LabelProps) {
  return (
    <Reveal active={active} shouldReduceMotion={shouldReduceMotion} delay={delay}>
      <text
        x={x}
        y={y}
        fill="currentColor"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize={11 / scale}
        fontWeight="600"
        letterSpacing={1.4 / scale}
        textAnchor={align}
      >
        {children}
      </text>
    </Reveal>
  );
}

function ObserveLayer({ activeStage, shouldReduceMotion, scale }: Omit<StageLayerProps, "stage" | "children"> & { scale: number }) {
  const active = activeStage === 1;
  const markerRadius = 3.5 / scale;

  return (
    <StageLayer stage={1} activeStage={activeStage} shouldReduceMotion={shouldReduceMotion}>
      <DrawnPath active={active} shouldReduceMotion={shouldReduceMotion} delay={0.04} d="M296 787H352V843 M1286 787H1230V843" />
      <DrawnPath active={active} shouldReduceMotion={shouldReduceMotion} delay={0.08} d="M620 1028V1082 M620 1028H674 M870 1538V1484 M870 1538H816" />
      <DrawnPath active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} d="M1278 1338H1332V1392 M226 1534H172V1480" />
      <DrawnPath active={active} shouldReduceMotion={shouldReduceMotion} delay={0.08} d="M840 850H1064V812" />
      <DrawnPath active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} d="M950 1600H998V1550" />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.06} x={840} y={850} radius={markerRadius} />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.07} x={750} y={1320} radius={markerRadius} />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.08} x={1430} y={1420} radius={markerRadius} />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.09} x={140} y={1430} radius={markerRadius} />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={950} y={1600} radius={markerRadius} />
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={1138} y={940} scale={scale}>EDGE</Label>
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={770} y={1280} scale={scale}>SUBJECT</Label>
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={1072} y={816} scale={scale}>BRIGHT REGION</Label>
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={1006} y={1554} scale={scale}>NEGATIVE SPACE</Label>
    </StageLayer>
  );
}

function PrioritizeLayer({ activeStage, shouldReduceMotion, scale }: Omit<StageLayerProps, "stage" | "children"> & { scale: number }) {
  const active = activeStage === 2;
  const markerRadius = 3.5 / scale;

  return (
    <StageLayer stage={2} activeStage={activeStage} shouldReduceMotion={shouldReduceMotion}>
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.04} x={840} y={850} radius={markerRadius} filled>
        <path d="M840 858V902H894" fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />
      </Marker>
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.08} x={902} y={907} scale={scale}>PRIMARY</Label>
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.06} x={750} y={1320} radius={markerRadius} />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.08} x={1430} y={1420} radius={markerRadius} />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={140} y={1430} radius={markerRadius} />
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={770} y={1280} scale={scale}>SECONDARY</Label>
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={1208} y={1478} scale={scale}>SUPPORT</Label>
    </StageLayer>
  );
}

function InterpretLayer({ activeStage, shouldReduceMotion, scale }: Omit<StageLayerProps, "stage" | "children"> & { scale: number }) {
  const active = activeStage === 3;
  const markerRadius = 3.5 / scale;

  return (
    <StageLayer stage={3} activeStage={activeStage} shouldReduceMotion={shouldReduceMotion}>
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.04} x={840} y={850} radius={markerRadius} filled />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.06} x={750} y={1320} radius={markerRadius} />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.08} x={1430} y={1420} radius={markerRadius} />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={770} y={580} radius={markerRadius} />
      <DrawnPath active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} d="M840 850L750 1320 M1430 1420H870V1320 M770 580L620 1030" />
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={766} y={1080} scale={scale}>LEADS TO</Label>
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={962} y={1396} scale={scale}>SUPPORTS</Label>
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={640} y={820} scale={scale}>REPEATS</Label>
    </StageLayer>
  );
}

function DirectLayer({ activeStage, shouldReduceMotion, scale }: Omit<StageLayerProps, "stage" | "children"> & { scale: number }) {
  const active = activeStage === 4;
  const markerRadius = 3.5 / scale;

  return (
    <StageLayer stage={4} activeStage={activeStage} shouldReduceMotion={shouldReduceMotion}>
      <DrawnPath active={active} shouldReduceMotion={shouldReduceMotion} delay={0.05} d="M620 1030V1084 M620 1030H674 M870 1530V1476 M870 1530H816" />
      <Marker active={active} shouldReduceMotion={shouldReduceMotion} delay={0.08} x={750} y={1320} radius={markerRadius} filled>
        <path d="M750 1328V1352H812" fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />
      </Marker>
      <Label active={active} shouldReduceMotion={shouldReduceMotion} delay={0.1} x={820} y={1357} scale={scale}>KEEP THIS ANCHOR</Label>
    </StageLayer>
  );
}

/**
 * Analysis marks share the photograph's 1600 × 2400 coordinate system.
 * `preserveAspectRatio="xMidYMid slice"` matches the parent Image's object-cover
 * crop without changing the photograph's transform or position.
 */
export function HeroProcessOverlays({ activeStage, shouldReduceMotion }: HeroProcessOverlaysProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const scale = useCoverScale(svgRef);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden text-[#f8f5ec]"
      viewBox={`0 0 ${PHOTO_WIDTH} ${PHOTO_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ObserveLayer activeStage={activeStage} shouldReduceMotion={shouldReduceMotion} scale={scale} />
      <PrioritizeLayer activeStage={activeStage} shouldReduceMotion={shouldReduceMotion} scale={scale} />
      <InterpretLayer activeStage={activeStage} shouldReduceMotion={shouldReduceMotion} scale={scale} />
      <DirectLayer activeStage={activeStage} shouldReduceMotion={shouldReduceMotion} scale={scale} />
    </svg>
  );
}
