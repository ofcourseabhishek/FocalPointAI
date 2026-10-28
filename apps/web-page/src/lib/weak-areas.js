// Parts of the photograph scoring under this are "the most work"; below that line we still
// show the weakest few, because every photograph has room to improve.
export const WEAK_BELOW = 60;
export const MIN_SHOWN = 3;

const byScore = (a, b) => a.score - b.score;
// A shooting tip that only says the part is already fine teaches nothing here.
const NO_CHANGE = /no change (?:is )?needed|nothing to change/i;
const shootingTip = (metric) => (metric.try && !NO_CHANGE.test(metric.try) ? metric.try : '');

/**
 * What holds the photograph back, worst first, using only the analysis's own words: each area's
 * note and its next-time shooting tip (edit fixes belong to the Actions section).
 * Prefers scored metrics; a read with no metric scores falls back to the scored categories and
 * their written read. Every area under WEAK_BELOW is included, never fewer than MIN_SHOWN when
 * that many exist, plus any `include`d areas (problems Actions says can't be fixed in post and
 * sends here), matched by area and label.
 */
export function weakAreas(categories = [], { include = [] } = {}) {
  const metrics = categories.flatMap((category) => (category.metrics || [])
    .filter((metric) => metric.score != null)
    .map((metric) => ({
      id: `${category.id}-${metric.id || metric.label}`,
      area: category.label,
      label: metric.label,
      score: metric.score,
      note: metric.saw || metric.observation || '',
      tip: shootingTip(metric),
    })))
    .filter((area) => area.note || area.tip);
  const pool = (metrics.length ? metrics : categories
    .filter((category) => category.score != null && category.hasReading !== false && category.interpretation)
    .map((category) => ({ id: category.id, area: category.label, label: category.label, score: category.score, note: category.interpretation, tip: '' })))
    .sort(byScore);
  const below = pool.filter((area) => area.score < WEAK_BELOW).length;
  const must = new Set(include.map(({ area, label }) => `${area}|${label}`));
  const shown = pool.slice(0, Math.max(below, MIN_SHOWN));
  const extra = pool.filter((area) => must.has(`${area.area}|${area.label}`) && !shown.includes(area));
  return { areas: [...shown, ...extra].sort(byScore), hasWeak: below > 0 };
}
