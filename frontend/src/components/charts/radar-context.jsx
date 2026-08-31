"use client";;
import { createContext, useContext, useMemo } from "react";

// CSS variable references for radar chart theming
export const radarCssVars = {
  background: "var(--chart-background)",
  foreground: "var(--chart-foreground)",
  foregroundMuted: "var(--chart-foreground-muted)",
  label: "var(--chart-label, oklch(0.65 0.01 260))",
  grid: "var(--chart-grid)",
  border: "var(--border)",
  // Default radar colors from chart palette
  area1: "var(--chart-1)",
  area2: "var(--chart-2)",
  area3: "var(--chart-3)",
  area4: "var(--chart-4)",
  area5: "var(--chart-5)",
};

// Default radar color palette
export const defaultRadarColors = [
  radarCssVars.area1,
  radarCssVars.area2,
  radarCssVars.area3,
  radarCssVars.area4,
  radarCssVars.area5,
];

const RadarStableContext = createContext(null);
const RadarHoverContext = createContext(null);

export function RadarProvider({
  children,
  value
}) {
  const stable = useMemo(() => ({
    data: value.data,
    metrics: value.metrics,
    size: value.size,
    radius: value.radius,
    levels: value.levels,
    animate: value.animate,
    enterDurationMs: value.enterDurationMs,
    staggerScale: value.staggerScale,
    enterTransition: value.enterTransition,
    motionReplayKey: value.motionReplayKey,
    getColor: value.getColor,
    getAngle: value.getAngle,
    getPointPosition: value.getPointPosition,
    yScale: value.yScale,
  }), [
    value.data,
    value.metrics,
    value.size,
    value.radius,
    value.levels,
    value.animate,
    value.enterDurationMs,
    value.staggerScale,
    value.enterTransition,
    value.motionReplayKey,
    value.getColor,
    value.getAngle,
    value.getPointPosition,
    value.yScale,
  ]);

  const hover = useMemo(() => ({
    hoveredIndex: value.hoveredIndex,
    setHoveredIndex: value.setHoveredIndex,
  }), [value.hoveredIndex, value.setHoveredIndex]);

  return (
    <RadarStableContext.Provider value={stable}>
      <RadarHoverContext.Provider value={hover}>
        {children}
      </RadarHoverContext.Provider>
    </RadarStableContext.Provider>
  );
}

export function useRadarStable() {
  const context = useContext(RadarStableContext);
  if (!context) {
    throw new Error("useRadarStable must be used within a RadarProvider. " +
      "Make sure your component is wrapped in <RadarChart>.");
  }
  return context;
}

export function useRadarHover() {
  const context = useContext(RadarHoverContext);
  if (!context) {
    throw new Error("useRadarHover must be used within a RadarProvider. " +
      "Make sure your component is wrapped in <RadarChart>.");
  }
  return context;
}

export function useRadar() {
  return { ...useRadarStable(), ...useRadarHover() };
}

export default RadarStableContext;
