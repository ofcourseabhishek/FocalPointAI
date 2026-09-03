import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CURTAIN_ACCENT_DELAY_MS,
  CURTAIN_ANGLE_DEGREES,
  CURTAIN_EASING,
  CURTAIN_PHASE_DURATION_MS,
  RESULT_VIEW_ORDER,
  curtainClipFrames,
  curtainCopyFrames,
  curtainDirection,
} from './result-curtain.js';

function points(clipPath) {
  return [...clipPath.matchAll(/(-?[\d.]+)px\s+(-?[\d.]+)px/g)].map(([, x, y]) => [Number(x), Number(y)]);
}

test('exposes the result navigation and motion constants', () => {
  assert.deepEqual(RESULT_VIEW_ORDER, ['overview', 'evidence', 'frame']);
  assert.equal(CURTAIN_ANGLE_DEGREES, 9);
  assert.equal(CURTAIN_PHASE_DURATION_MS, 400);
  assert.equal(CURTAIN_ACCENT_DELAY_MS, 32);
  assert.equal(CURTAIN_EASING, 'cubic-bezier(0.77, 0, 0.175, 1)');
});

test('derives every cross-page navigation direction from result view order', () => {
  const cases = [
    ['overview', 'evidence', 'forward'],
    ['overview', 'frame', 'forward'],
    ['evidence', 'overview', 'backward'],
    ['evidence', 'frame', 'forward'],
    ['frame', 'overview', 'backward'],
    ['frame', 'evidence', 'backward'],
  ];

  for (const [from, to, expected] of cases) {
    assert.equal(curtainDirection(from, to), expected, `${from} -> ${to}`);
  }
  assert.equal(curtainDirection('evidence', 'evidence'), null);
  assert.equal(curtainDirection('missing', 'frame'), null);
});

test('builds 9° forward clip frames with a full-stage cover and four vertices per polygon', () => {
  const width = 1000;
  const height = 800;
  const edge = Number((Math.tan(Math.PI / 20) * height).toFixed(6));
  const frames = curtainClipFrames('forward', width, height);

  // Forward now enters from the right (like Motion reference)
  assert.deepEqual(points(frames.cover[0].clipPath), [[width * 2, 0], [width + edge, 0], [width, height], [width * 2, height]]);
  assert.deepEqual(points(frames.cover[1].clipPath), [[width, 0], [0, 0], [-edge, height], [width, height]]);
  assert.deepEqual(points(frames.reveal[0].clipPath), [[0, 0], [width, 0], [width + edge, height], [0, height]]);
  assert.deepEqual(points(frames.reveal[1].clipPath), [[-width, 0], [-edge, 0], [0, height], [-width, height]]);

  for (const frame of [...frames.cover, ...frames.reveal]) {
    assert.equal(points(frame.clipPath).length, 4);
  }
});

test('mirrors backward clip frames and continues every reveal through the opposite edge', () => {
  const width = 1000;
  const height = 800;
  const edge = Number((Math.tan(Math.PI / 20) * height).toFixed(6));
  const backward = curtainClipFrames('backward', width, height);

  // After direction swap, backward uses what was the old forward geometry
  // Backward cover starts from off-screen LEFT, sweeps right
  assert.deepEqual(points(backward.cover[0].clipPath), [[-width, 0], [-edge, 0], [0, height], [-width, height]]);
  assert.deepEqual(points(backward.cover[1].clipPath), [[0, 0], [width, 0], [width + edge, height], [0, height]]);
  // Backward reveal sweeps off to the right  
  assert.deepEqual(points(backward.reveal[0].clipPath), [[width, 0], [0, 0], [-edge, height], [width, height]]);
  assert.deepEqual(points(backward.reveal[1].clipPath), [[width * 2, 0], [width + edge, 0], [width, height], [width * 2, height]]);
});

test('uses opposite transform-only copy travel for each direction', () => {
  const forward = curtainCopyFrames('forward');
  const backward = curtainCopyFrames('backward');

  assert.deepEqual(forward, {
    cover: [{ transform: 'translateX(24px)' }, { transform: 'translateX(0px)' }],
    reveal: [{ transform: 'translateX(0px)' }, { transform: 'translateX(-24px)' }],
  });
  assert.deepEqual(backward, {
    cover: [{ transform: 'translateX(-24px)' }, { transform: 'translateX(0px)' }],
    reveal: [{ transform: 'translateX(0px)' }, { transform: 'translateX(24px)' }],
  });
  for (const frame of [...forward.cover, ...forward.reveal, ...backward.cover, ...backward.reveal]) {
    assert.deepEqual(Object.keys(frame), ['transform']);
  }
});

test('returns no frames for a neutral direction and rejects invalid stage dimensions', () => {
  assert.equal(curtainClipFrames(null, 100, 100), null);
  assert.equal(curtainCopyFrames(null), null);
  assert.throws(() => curtainClipFrames('forward', 0, 100), RangeError);
  assert.throws(() => curtainClipFrames('backward', 100, Number.NaN), RangeError);
});
