import React from 'react';
import { cn } from "@/lib/utils";

/**
 * A highly refined, industrial-utilitarian photo metadata strip.
 * Designed with precise typography, intentional negative space, and strict grid alignment.
 *
 * @param {Object} props
 * @param {string} [props.camera] - Camera make/model
 * @param {string} [props.lens] - Lens details
 * @param {string} [props.focalLength] - e.g., "35mm"
 * @param {string} [props.aperture] - e.g., "f/1.4"
 * @param {string} [props.shutterSpeed] - e.g., "1/500s"
 * @param {string} [props.iso] - e.g., "400"
 * @param {string} [props.date] - Date taken
 * @param {string} [props.location] - Location info
 * @param {string} [props.className] - Additional classes
 */
export function PhotoMetaStrip({
  camera,
  lens,
  focalLength,
  aperture,
  shutterSpeed,
  iso,
  date,
  location,
  className
}) {
  const metaGroups = [
    {
      group: "Equipment",
      items: [
        { label: "CAM", value: camera },
        { label: "LENS", value: lens }
      ]
    },
    {
      group: "Exposure",
      items: [
        { label: "F", value: focalLength },
        { label: "A", value: aperture },
        { label: "S", value: shutterSpeed },
        { label: "ISO", value: iso }
      ]
    },
    {
      group: "Context",
      items: [
        { label: "DAT", value: date },
        { label: "LOC", value: location }
      ]
    }
  ];

  const hasData = metaGroups.some(g => g.items.some(i => i.value));
  if (!hasData) return null;

  return (
    <div
      className={cn(
        "w-full overflow-hidden border-y border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 font-mono text-[11px] uppercase tracking-wider",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-neutral-300 dark:divide-neutral-800">
        {metaGroups.map((group, groupIdx) => {
          const validItems = group.items.filter(item => item.value);
          if (validItems.length === 0) return null;
          
          return (
            <div
              key={group.group}
              className="flex-1 min-w-[200px] flex flex-col justify-between p-3 sm:p-5 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors duration-500 ease-out group/meta"
              style={{ animation: `meta-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${groupIdx * 0.15}s both` }}
            >
              <div className="flex items-center gap-2 mb-6 sm:mb-12">
                <div className="w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full group-hover/meta:bg-neutral-500 transition-colors duration-500" />
                <span className="text-neutral-400 dark:text-neutral-600 font-semibold leading-none">
                  {group.group}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-5">
                {validItems.map((item) => (
                  <div key={item.label} className="flex flex-col gap-1.5">
                    <span className="text-neutral-500 dark:text-neutral-500 text-[9px] font-bold tracking-[0.2em]">
                      {item.label}
                    </span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium whitespace-nowrap">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes meta-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
