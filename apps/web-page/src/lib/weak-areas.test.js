import assert from 'node:assert/strict';
import test from 'node:test';

import { weakAreas } from './weak-areas.js';

const metric = (label, score, text = `${label} note`) => ({ label, score, saw: text, improve: `${label} fix` });

test('lists every area under 60, worst first', () => {
  const { areas, hasWeak } = weakAreas([
    { id: 'light', label: 'Lighting', metrics: [metric('Shadows', 58), metric('Brightness', 40), metric('Contrast', 99)] },
    { id: 'color', label: 'Color', metrics: [metric('Saturation', 41), metric('Warmth', 30)] },
  ]);
  assert.equal(hasWeak, true);
  assert.deepEqual(areas.map((area) => area.score), [30, 40, 41, 58]);
});

test('a strong photograph still shows its three weakest areas', () => {
  const { areas, hasWeak } = weakAreas([
    { id: 'light', label: 'Lighting', metrics: [metric('Brightness', 49), metric('Shadows', 66), metric('Ambiance', 80)] },
    { id: 'color', label: 'Color', metrics: [metric('Saturation', 75), metric('Colour', 82)] },
  ]);
  assert.equal(hasWeak, true);
  assert.deepEqual(areas.map((area) => area.label), ['Brightness', 'Shadows', 'Saturation']);

  const allGood = weakAreas([{ id: 'c', label: 'Composition', metrics: [metric('Crop', 90), metric('Balance', 70), metric('Lines', 85), metric('Space', 95)] }]);
  assert.equal(allGood.hasWeak, false);
  assert.deepEqual(allGood.areas.map((area) => area.score), [70, 85, 90]);
});

test('skips areas with nothing to say', () => {
  const { areas } = weakAreas([{ id: 'c', label: 'Composition', metrics: [{ label: 'Silent', score: 10 }, metric('Crop', 50)] }]);
  assert.deepEqual(areas.map((area) => area.label), ['Crop']);
});

test('falls back to scored categories when no metric has a score', () => {
  const { areas, hasWeak } = weakAreas([
    { id: 'focus', label: 'Focus', score: 79, interpretation: 'Detail is held centrally.', metrics: [{ label: 'Detail level', value: 'Moderate' }] },
    { id: 'color', label: 'Color', score: 88, interpretation: 'Warm and cool fields.' },
    { id: 'light', label: 'Lighting', score: 82, interpretation: 'Soft contained light.' },
    { id: 'empty', label: 'Subject', score: 60, hasReading: false, interpretation: 'No reading was returned.' },
  ]);
  assert.equal(hasWeak, false);
  assert.deepEqual(areas.map((area) => area.label), ['Focus', 'Lighting', 'Color']);
  assert.equal(areas[0].note, 'Detail is held centrally.');
});
