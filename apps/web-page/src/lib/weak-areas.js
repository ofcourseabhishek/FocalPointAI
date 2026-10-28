// Parts of the photograph scoring under this are "the most work"; below that line we still
// show the weakest few, because every photograph has room to improve.
export const WEAK_BELOW = 60;
export const MIN_SHOWN = 3;

const byScore = (a, b) => a.score - b.score;

/**
 * What holds the photograph back, worst first, using only the analysis's own words.
 * Prefers scored metrics (each with its note and fix); a read with no metric scores falls back
 * to the scored categories and their written read. Every area under WEAK_BELOW is included,
 * and never fewer than MIN_SHOWN when that many exist.
 */
export function weakAreas(categories = []) {
  const metrics = categories.flatMap((category) => (category.metrics || [])
    .filter((metric) => metric.score != null)
    .map((metric) => ({
      id: `${category.id}-${metric.id || metric.label}`,
      area: category.label,
      label: metric.label,
      score: metric.score,
      note: metric.saw || metric.observation || '',
      fix: metric.improve || metric.try || '',
    })))
    .filter((area) => area.note || area.fix);
  const pool = (metrics.length ? metrics : categories
    .filter((category) => category.score != null && category.hasReading !== false && category.interpretation)
    .map((category) => ({ id: category.id, area: category.label, label: category.label, score: category.score, note: category.interpretation, fix: '' })))
    .sort(byScore);
  const below = pool.filter((area) => area.score < WEAK_BELOW).length;
  return { areas: pool.slice(0, Math.max(below, MIN_SHOWN)), hasWeak: below > 0 };
}
