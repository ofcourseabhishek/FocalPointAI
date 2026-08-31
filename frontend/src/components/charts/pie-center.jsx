"use client";;
import { cn } from "@/lib/utils";
import {
  chartCenterContainerClassName,
  chartCenterLabelClassName,
  chartCenterValueClassName,
} from "./chart-center-typography";
import { ChartStatFlow, defaultChartStatFlowFormat } from "./chart-stat-flow";
import { usePieHover, usePieStable } from "./pie-context";

/**
 * PieCenter displays content in the center of a donut/pie chart.
 *
 * This component renders as pure HTML (not inside SVG foreignObject) to avoid
 * Safari's WebKit bug #23113 where HTML content with CSS transforms/opacity
 * inside foreignObject renders at incorrect positions.
 *
 * The parent PieChart uses CSS Grid stacking to overlay this HTML content
 * on top of the SVG slices.
 */
export function PieCenter({
  defaultLabel = "Total",
  formatOptions = defaultChartStatFlowFormat,
  children,
  className = "",
  valueClassName = chartCenterValueClassName,
  labelClassName = chartCenterLabelClassName,
  prefix,
  suffix
}) {
  const { data, totalValue, innerRadius, geometryScrubbing } = usePieStable();
  const { hoveredIndex } = usePieHover();

  const effectiveHoveredIndex = geometryScrubbing ? null : hoveredIndex;
  const hoveredData =
    effectiveHoveredIndex === null ? null : data[effectiveHoveredIndex];
  const displayValue = hoveredData ? hoveredData.value : totalValue;
  const displayLabel = hoveredData ? hoveredData.label : defaultLabel;

  // Calculate center area size based on inner radius
  // Leave some padding so text doesn't touch the inner edge
  const centerSize = innerRadius * 2 - 16;

  // Don't render if there's no inner radius (solid pie, not donut)
  if (innerRadius <= 0) {
    return null;
  }

  // If custom render function is provided, use it
  if (children && hoveredData) {
    return (
      <div
        className={cn(
          chartCenterContainerClassName,
          "flex items-center justify-center",
          className
        )}
        style={{ width: centerSize, height: centerSize }}>
        {children({
          value: displayValue,
          label: displayLabel,
          isHovered: effectiveHoveredIndex !== null,
          data: hoveredData,
        })}
      </div>
    );
  }

  // Default center content with NumberFlow animations
  // Now renders as pure HTML, avoiding Safari's foreignObject bugs
  return (
    <div
      className={cn(
        chartCenterContainerClassName,
        "flex flex-col items-center justify-center text-center",
        className
      )}
      style={{ width: centerSize, height: centerSize }}>
      <ChartStatFlow
        formatOptions={formatOptions}
        label={displayLabel}
        labelClassName={labelClassName}
        prefix={prefix}
        suffix={suffix}
        value={displayValue}
        valueClassName={valueClassName} />
    </div>
  );
}

PieCenter.displayName = "PieCenter";

export default PieCenter;
