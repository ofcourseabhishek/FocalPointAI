// Plain-language meaning and verdict for the raw measurements the analysis returns, so a
// photographer reads "a little highlight detail lost" instead of "Highlight clipping 1.4".
// ponytail: thresholds are rules of thumb, not calibrated per camera or genre; move them to the
// backend if verdicts need to depend on the photo's style (a low-key portrait is meant to be dark).

const toNumber = (value) => {
  const number = Number.parseFloat(String(value ?? '').replace('%', ''));
  return Number.isFinite(number) ? number : null;
};
const isNo = (value) => value === false || /^(no|false)$/i.test(String(value).trim());

const GUIDES = [
  {
    match: /mean luminance|brightness/i,
    meaning: 'How bright the photo is on average, from 0 (pure black) to 1 (pure white).',
    verdict: (n) => n < 0.3 ? 'Dark overall: a moody low-key look, or underexposed.'
      : n > 0.7 ? 'Bright overall: an airy high-key look, or close to overexposed.'
        : 'Balanced brightness, neither murky nor washed out.',
  },
  {
    match: /highlight clipping/i,
    meaning: 'The share of the photo so bright it turned pure white, with no detail left to recover.',
    verdict: (n) => n < 1 ? 'Almost no highlight detail lost.'
      : n < 5 ? 'A little highlight detail lost, usually fine.'
        : 'Noticeable areas blown out to pure white.',
  },
  {
    match: /shadow clipping/i,
    meaning: 'The share of the photo so dark it turned pure black, with no detail left to recover.',
    verdict: (n) => n < 1 ? 'Almost no shadow detail lost.'
      : n < 5 ? 'A little shadow detail lost, usually fine.'
        : 'Noticeable areas crushed to pure black.',
  },
  {
    match: /sharpness/i,
    meaning: 'How much fine edge detail the camera captured. Higher is crisper; around 100 and up usually reads as sharp.',
    verdict: (n) => n < 50 ? 'Soft: likely camera shake, motion blur or missed focus.'
      : n < 100 ? 'Slightly soft; fine at small sizes.'
        : 'Crisp, well-resolved detail.',
  },
  {
    match: /detail level/i,
    meaning: 'How much texture and fine detail the frame holds overall.',
  },
  {
    match: /primary area|focus area/i,
    meaning: 'Where the sharpest detail sits in the frame, which is usually where the eye lands first.',
  },
  {
    match: /subject cent(er|r)ed/i,
    meaning: 'Whether the main subject sits in the middle of the frame.',
    verdict: (_, value) => isNo(value) ? 'Off-centre, which gives the frame more tension and movement.'
      : 'Centred, which reads calm, direct and symmetrical.',
    raw: true,
  },
];

/**
 * `{ meaning, verdict }` for a measurement. `verdict` is '' when the value is already words
 * (e.g. "Moderate") or the label is unknown; `meaning` is '' for unknown labels.
 */
export function describeMetric(label, value) {
  const guide = GUIDES.find((item) => item.match.test(String(label || '')));
  if (!guide) return { meaning: '', verdict: '' };
  const number = toNumber(value);
  const verdict = guide.verdict && (guide.raw || number !== null) ? guide.verdict(number, value) : '';
  return { meaning: guide.meaning, verdict };
}
