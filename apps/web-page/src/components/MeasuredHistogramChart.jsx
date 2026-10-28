import { Area, AreaChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from 'recharts';

// Camera look: bright outlines over dark fills. Drawn with screen blending on a black panel,
// the dark fills add up, so where all three channels overlap the area turns grey.
const CHANNELS = [
  // Fills sum to roughly #616161 where all three overlap: a mid grey, as on a camera screen.
  { key: 'r', stroke: '#ff5252', fill: '#3d1212' },
  { key: 'g', stroke: '#4ade80', fill: '#123d18' },
  { key: 'b', stroke: '#3b8bff', fill: '#12244d' },
];
const GOLD = '#b8924a';
// A clip zone turns gold once at least this share of the photo is clipped there.
const CLIPPED_PERCENT = 1;

// Bins become points at their centre tone on a 0-255 axis, so clip zones line up with the
// exact grayscale levels the backend counts as clipped.
function toPoints(series, keys) {
  const count = series[keys[0]].length;
  return Array.from({ length: count }, (_, index) => ({
    tone: ((index + 0.5) * 256) / count,
    ...Object.fromEntries(keys.map((key) => [key, series[key][index]])),
  }));
}

/**
 * Tonal-range histogram. view="tonal" draws one luminance area in the current text colour;
 * view="rgb" draws camera-style R, G and B channels (render it on a black panel).
 * Shaded zones mark the clipping levels in both views.
 */
export default function MeasuredHistogramChart({ view = 'tonal', rgb, luminance, clipLevels, shadowClipping, highlightClipping }) {
  const showRgb = view === 'rgb' && rgb;
  const data = showRgb ? toPoints(rgb, ['r', 'g', 'b']) : toPoints({ l: luminance }, ['l']);
  const zone = (percent) => ({ fill: GOLD, fillOpacity: percent >= CLIPPED_PERCENT ? 0.28 : 0.08 });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="tone" type="number" domain={[0, 255]} hide />
        <YAxis domain={[0, 100]} hide />
        <ReferenceArea x1={0} x2={clipLevels.shadow} ifOverflow="hidden" {...zone(shadowClipping ?? 0)} />
        <ReferenceArea x1={clipLevels.highlight} x2={255} ifOverflow="hidden" {...zone(highlightClipping ?? 0)} />
        {showRgb
          ? CHANNELS.map(({ key, stroke, fill }) => (
            <Area key={key} dataKey={key} type="monotone" stroke={stroke} strokeWidth={2} fill={fill} fillOpacity={1} isAnimationActive={false} />
          ))
          : <Area dataKey="l" type="monotone" stroke="currentColor" strokeWidth={1.5} fill="currentColor" fillOpacity={0.25} isAnimationActive={false} />}
      </AreaChart>
    </ResponsiveContainer>
  );
}
