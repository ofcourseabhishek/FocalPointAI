"use client";;
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { defaultRadarColors, RadarProvider } from "./radar-context";

function RadarChartInner({
  width,
  height,
  data,
  metrics,
  levels,
  margin,
  animate,
  enterDurationMs,
  staggerScale,
  enterTransition,
  motionReplayKey,
  children,
  hoveredIndexProp,
  onHoverChange
}) {
  const [internalHoveredIndex, setInternalHoveredIndex] = useState(null);

  // Use controlled or uncontrolled hover state
  const isControlled = hoveredIndexProp !== undefined;
  const hoveredIndex = isControlled ? hoveredIndexProp : internalHoveredIndex;
  const setHoveredIndex = useCallback((index) => {
    if (isControlled) {
      onHoverChange?.(index);
    } else {
      setInternalHoveredIndex(index);
    }
  }, [isControlled, onHoverChange]);

  // Use the smaller dimension
  const size = Math.min(width, height);
  const radius = (size - margin * 2) / 2;

  // Scale for converting values (0-100) to radius
  const yScale = useCallback((value) => {
    const scale = scaleLinear({
      range: [0, radius],
      domain: [0, 100],
    });
    return scale(value) ?? 0;
  }, [radius]);

  // Get angle for a metric index (rotated so first metric is at top)
  const getAngle = useCallback((metricIndex) => {
    const step = (Math.PI * 2) / metrics.length;
    const angleOffset = -Math.PI / 2; // Rotate so first axis is at top
    return metricIndex * step + angleOffset;
  }, [metrics.length]);

  // Get x,y position for a metric at a given value
  const getPointPosition = useCallback((metricIndex, value) => {
    const angle = getAngle(metricIndex);
    const r = yScale(value);
    return {
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    };
  }, [getAngle, yScale]);

  // Get color for a data index
  const getColor = useCallback((index) => {
    const item = data[index];
    if (item?.color) {
      return item.color;
    }
    return defaultRadarColors[index % defaultRadarColors.length];
  }, [data]);

  // Early return if dimensions not ready
  if (size < 10) {
    return null;
  }

  const contextValue = {
    data,
    metrics,
    size,
    radius,
    levels,
    hoveredIndex,
    setHoveredIndex,
    animate,
    enterDurationMs,
    staggerScale,
    enterTransition,
    motionReplayKey,
    getColor,
    getAngle,
    getPointPosition,
    yScale,
  };

  return (
    <RadarProvider value={contextValue}>
      <svg
        aria-hidden="true"
        height={size}
        style={{ overflow: "visible" }}
        width={size}>
        <Group left={size / 2} top={size / 2}>
          {children}
        </Group>
      </svg>
    </RadarProvider>
  );
}

export function RadarChart({
  data,
  metrics,
  size: fixedSize,
  levels = 5,
  margin = 60,
  animate = true,
  enterDurationMs = 1100,
  staggerScale = 1,
  enterTransition,
  motionReplayKey = "",
  className = "",
  hoveredIndex,
  onHoverChange,
  children
}) {
  // If fixed size is provided, use it directly
  if (fixedSize) {
    return (
      <div
        className={cn("relative flex items-center justify-center", className)}
        style={{ width: fixedSize, height: fixedSize }}>
        <RadarChartInner
          animate={animate}
          data={data}
          enterDurationMs={enterDurationMs}
          enterTransition={enterTransition}
          height={fixedSize}
          hoveredIndexProp={hoveredIndex}
          levels={levels}
          margin={margin}
          metrics={metrics}
          motionReplayKey={motionReplayKey}
          onHoverChange={onHoverChange}
          staggerScale={staggerScale}
          width={fixedSize}>
          {children}
        </RadarChartInner>
      </div>
    );
  }

  // Otherwise use ParentSize for responsive sizing
  return (
    <div className={cn("relative aspect-square w-full", className)}>
      <ParentSize debounceTime={10}>
        {({ width, height }) => (
          <RadarChartInner
            animate={animate}
            data={data}
            enterDurationMs={enterDurationMs}
            enterTransition={enterTransition}
            height={height}
            hoveredIndexProp={hoveredIndex}
            levels={levels}
            margin={margin}
            metrics={metrics}
            motionReplayKey={motionReplayKey}
            onHoverChange={onHoverChange}
            staggerScale={staggerScale}
            width={width}>
            {children}
          </RadarChartInner>
        )}
      </ParentSize>
    </div>
  );
}

export default RadarChart;
