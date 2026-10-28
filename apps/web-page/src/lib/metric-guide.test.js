import assert from 'node:assert/strict';
import test from 'node:test';
import { describeMetric } from './metric-guide.js';

test('describeMetric turns raw measurements into plain-language verdicts', () => {
  assert.match(describeMetric('Mean luminance', '0.47').verdict, /Balanced/);
  assert.match(describeMetric('Mean luminance', 0.2).verdict, /Dark overall/);
  assert.match(describeMetric('Highlight clipping', '1.4%').verdict, /A little highlight/);
  assert.match(describeMetric('Highlight clipping', 1.4).verdict, /A little highlight/);
  assert.match(describeMetric('Shadow clipping', '0.6%').verdict, /Almost no shadow/);
  assert.match(describeMetric('Sharpness index', '286.4').verdict, /Crisp/);
  assert.match(describeMetric('Subject centered', false).verdict, /Off-centre/);
  assert.match(describeMetric('Horizon tilt', '0.8°').verdict, /Level/);
  assert.match(describeMetric('Horizon tilt', '3.2°').verdict, /rotate about 3.2°/);
  assert.match(describeMetric('Left-right symmetry', '82/100').verdict, /Strongly mirrored/);
  assert.match(describeMetric('Negative space', '45%').verdict, /room to breathe/);
});

// A whole-frame measurement cannot tell blur from fog or a white border from blown sky, so the
// verdict names both readings instead of asserting one (seen on real test photos, 2026-10-27).
test('describeMetric does not claim a cause the measurement cannot see', () => {
  const soft = describeMetric('Sharpness index', 12).verdict;
  assert.match(soft, /soft focus/i);
  assert.match(soft, /fog|sky|water/i);
  assert.doesNotMatch(soft, /camera shake/i);
  const blown = describeMetric('Highlight clipping', '37.4%').verdict;
  assert.match(blown, /blown highlights/i);
  assert.match(blown, /border|background/i);
  const crushed = describeMetric('Shadow clipping', 37.4).verdict;
  assert.match(crushed, /crushed shadows/i);
  assert.match(crushed, /silhouette/i);
  assert.match(describeMetric('Subject centered', false).verdict, /Off-centre/);
  assert.match(describeMetric('Subject centered', 'Yes').verdict, /Centred/);
});

test('describeMetric explains word values without inventing a verdict, and ignores unknown labels', () => {
  const detail = describeMetric('Detail level', 'Moderate');
  assert.match(detail.meaning, /texture/);
  assert.equal(detail.verdict, '');
  assert.deepEqual(describeMetric('Mystery metric', 3), { meaning: '', verdict: '' });
});
