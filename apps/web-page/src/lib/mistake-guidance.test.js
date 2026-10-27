import assert from 'node:assert/strict';
import test from 'node:test';
import { isLikelyPositive, isMistakeMetric } from './mistake-guidance.js';

test('positive words only count as whole words', () => {
  // "cr-ok-ed" used to read as "ok" and hide a crooked horizon.
  assert.equal(isLikelyPositive('Crooked horizon'), false);
  assert.equal(isLikelyPositive('Soft focus'), false);
  assert.equal(isLikelyPositive('Clean'), true);
  assert.equal(isLikelyPositive('Well-placed'), true);
  assert.equal(isLikelyPositive('Properly exposed'), true);
});

test('a crooked horizon is flagged as a mistake', () => {
  assert.equal(isMistakeMetric({ label: 'Horizon', assessment: 'Crooked horizon' }), true);
  assert.equal(isMistakeMetric({ label: 'Horizon', assessment: 'Balanced' }), false);
});
