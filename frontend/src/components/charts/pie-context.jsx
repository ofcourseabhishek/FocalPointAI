"use client";;
import { createContext, useContext, useMemo } from "react";

// CSS variable references for pie chart theming
export const pieCssVars = {
  background: "var(--chart-background)",
  foreground: "var(--chart-foreground)",
  foregroundMuted: "var(--chart-foreground-muted)",
  label: "var(--chart-label)",
  // Default slice colors from chart palette
  slice1: "var(--chart-1)",
  slice2: "var(--chart-2)",
  slice3: "var(--chart-3)",
  slice4: "var(--chart-4)",
  slice5: "var(--chart-5)",
};

// Default slice color palette
export const defaultPieColors = [
  pieCssVars.slice1,
  pieCssVars.slice2,
  pieCssVars.slice3,
  pieCssVars.slice4,
  pieCssVars.slice5,
];

const PieStableContext = createContext(null);
const PieHoverContext = createContext(null);

export function PieProvider({
  children,
  value
}) {
  const stable = useMemo(() => ({
    data: value.data,
    arcs: value.arcs,
    size: value.size,
    center: value.center,
    outerRadius: value.outerRadius,
    innerRadius: value.innerRadius,
    padAngle: value.padAngle,
    cornerRadius: value.cornerRadius,
    hoverOffset: value.hoverOffset,
    animationKey: value.animationKey,
    isLoaded: value.isLoaded,
    enterTransition: value.enterTransition,
    enterStaggerScale: value.enterStaggerScale,
    containerRef: value.containerRef,
    totalValue: value.totalValue,
    getColor: value.getColor,
    getFill: value.getFill,
    geometryScrubbing: value.geometryScrubbing,
    scrubSlicePaths: value.scrubSlicePaths,
  }), [
    value.data,
    value.arcs,
    value.size,
    value.center,
    value.outerRadius,
    value.innerRadius,
    value.padAngle,
    value.cornerRadius,
    value.hoverOffset,
    value.animationKey,
    value.isLoaded,
    value.enterTransition,
    value.enterStaggerScale,
    value.containerRef,
    value.totalValue,
    value.getColor,
    value.getFill,
    value.geometryScrubbing,
    value.scrubSlicePaths,
  ]);

  const hover = useMemo(() => ({
    hoveredIndex: value.hoveredIndex,
    setHoveredIndex: value.setHoveredIndex,
  }), [value.hoveredIndex, value.setHoveredIndex]);

  return (
    <PieStableContext.Provider value={stable}>
      <PieHoverContext.Provider value={hover}>
        {children}
      </PieHoverContext.Provider>
    </PieStableContext.Provider>
  );
}

export function usePieStable() {
  const context = useContext(PieStableContext);
  if (!context) {
    throw new Error("usePieStable must be used within a PieProvider. " +
      "Make sure your component is wrapped in <PieChart>.");
  }
  return context;
}

export function usePieHover() {
  const context = useContext(PieHoverContext);
  if (!context) {
    throw new Error("usePieHover must be used within a PieProvider. " +
      "Make sure your component is wrapped in <PieChart>.");
  }
  return context;
}

export function usePie() {
  return { ...usePieStable(), ...usePieHover() };
}

export default PieStableContext;
