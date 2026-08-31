const atlasTiles = [
  "composition",
  "light",
  "color",
  "focus",
  "subject",
  "intent",
] as const;

export function readAtlasTileUrl(stage: number) {
  return `/images/read/overlays/${atlasTiles[stage] ?? atlasTiles[0]}.png`;
}

/** Calibrated crops of the original atlas; no replacement artwork. */
export function ReadAtlasOverlay({ stage }: { stage: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[length:100%_100%] bg-no-repeat"
      style={{ backgroundImage: `url('${readAtlasTileUrl(stage)}')` }}
    />
  );
}
