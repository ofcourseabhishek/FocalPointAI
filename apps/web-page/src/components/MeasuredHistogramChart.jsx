import { Area, AreaChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from 'recharts';

const CHANNELS = [
  { key: 'r', color: '#ef4444' },
  { key: 'g', color: '#22c55e' },
  { key: 'b', color: '#3b82f6' },
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
 * Camera-style histogram: R, G and B areas when the analysis supplies them, otherwise one
 * luminance area in the current text colour. Shaded zones mark the clipping levels.
 */
export default function MeasuredHistogramChart({ rgb, luminance, clipLevels, shadowClipping, highlightClipping }) {
  const data = rgb ? toPoints(rgb, ['r', 'g', 'b']) : toPoints({ l: luminance }, ['l']);
  const zone = (percent) => ({ fill: GOLD, fillOpacity: percent >= CLIPPED_PERCENT ? 0.28 : 0.08 });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="tone" type="number" domain={[0, 255]} hide />
        <YAxis domain={[0, 100]} hide />
        <ReferenceArea x1={0} x2={clipLevels.shadow} ifOverflow="hidden" {...zone(shadowClipping ?? 0)} />
        <ReferenceArea x1={clipLevels.highlight} x2={255} ifOverflow="hidden" {...zone(highlightClipping ?? 0)} />
        {rgb
          ? CHANNELS.map(({ key, color }) => (
            <Area key={key} dataKey={key} type="monotone" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.35} isAnimationActive={false} />
          ))
          : <Area dataKey="l" type="monotone" stroke="currentColor" strokeWidth={1.5} fill="currentColor" fillOpacity={0.25} isAnimationActive={false} />}
      </AreaChart>
    </ResponsiveContainer>
  );
}
