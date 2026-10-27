import assert from 'node:assert/strict';
import test from 'node:test';
import { describeMetric } from './metric-guide.js';

test('describeMetric turns raw measurements into plain-language verdicts', () => {
  assert.match(describeMetric('Mean luminance', '0.47').verdict, /Balanced/);
  assert.match(describeMetric('Mean luminance', 0.2).verdict, /Dark overall/);
  assert.match(describeMetric('Highlight clipping', '1.4%').verdict, /A little highlight/);
  assert.match(describeMetric('Highlight clipping', 1.4).verdict, /A little highlight/);
  assert.match(describeMetric('Shadow clipping', '0.6%').verdict, /Almost no shadow/);
  assert.match(describeMetric('Shadow clipping', 12).verdict, /crushed/);
  assert.match(describeMetric('Sharpness index', '286.4').verdict, /Crisp/);
  assert.match(describeMetric('Sharpness index', 30).verdict, /Soft/);
  assert.match(describeMetric('Subject centered', false).verdict, /Off-centre/);
  assert.match(describeMetric('Subject centered', 'Yes').verdict, /Centred/);
});

test('describeMetric explains word values without inventing a verdict, and ignores unknown labels', () => {
  const detail = describeMetric('Detail level', 'Moderate');
  assert.match(detail.meaning, /texture/);
  assert.equal(detail.verdict, '');
  assert.deepEqual(describeMetric('Mystery metric', 3), { meaning: '', verdict: '' });
});
