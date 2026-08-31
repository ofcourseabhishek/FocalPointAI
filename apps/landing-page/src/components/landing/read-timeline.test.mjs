import assert from "node:assert/strict";
import test from "node:test";

import {
  READ_ENTRY_HOLD_VIEWPORTS,
  READ_FINAL_DWELL_START_VIEWPORTS,
  READ_FINAL_DWELL_VIEWPORTS,
  READ_INTENT_SETTLED_AT_VIEWPORTS,
  READ_PIN_SCROLL_VIEWPORTS,
  READ_PIN_TRACK_HEIGHT_VIEWPORTS,
  READ_STAGE_COUNT,
  READ_TIMELINE,
  getReadStageAtProgress,
  getReadStageSeekProgress,
  isReadIntentSettled,
} from "./read-timeline.ts";

test("selects all six readings at their forward and reverse checkpoints", () => {
  const checkpoints = READ_TIMELINE.map(({ startAt }) => startAt / READ_PIN_SCROLL_VIEWPORTS);

  assert.deepEqual(checkpoints.map(getReadStageAtProgress), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual([...checkpoints].reverse().map(getReadStageAtProgress), [5, 4, 3, 2, 1, 0]);
});

test("keeps the preceding reading selected immediately before every boundary", () => {
  const epsilon = 0.000_001;
  const boundaries = READ_TIMELINE.slice(1).map(({ startAt }) => (startAt - epsilon) / READ_PIN_SCROLL_VIEWPORTS);

  assert.deepEqual(boundaries.map(getReadStageAtProgress), [0, 1, 2, 3, 4]);
  assert.equal(getReadStageAtProgress(READ_ENTRY_HOLD_VIEWPORTS / READ_PIN_SCROLL_VIEWPORTS), 0);
});

test("does not release the pin until Intent settles and its dedicated dwell completes", () => {
  assert.equal(READ_TIMELINE.length, READ_STAGE_COUNT);
  assert.ok(READ_INTENT_SETTLED_AT_VIEWPORTS < READ_FINAL_DWELL_START_VIEWPORTS);
  assert.ok(Math.abs(
    READ_PIN_SCROLL_VIEWPORTS - READ_FINAL_DWELL_START_VIEWPORTS - READ_FINAL_DWELL_VIEWPORTS,
  ) < 0.000_001, "the final dwell must be the last pin distance");
  assert.ok(READ_FINAL_DWELL_VIEWPORTS > 0);
  assert.equal(getReadStageAtProgress(1), 5);
  const intentSettleProgress = READ_INTENT_SETTLED_AT_VIEWPORTS / READ_PIN_SCROLL_VIEWPORTS;
  assert.equal(isReadIntentSettled(intentSettleProgress - 0.000_001), false);
  assert.equal(isReadIntentSettled(intentSettleProgress), true);
  assert.equal(isReadIntentSettled(1), true);
});

test("derives seek points and physical track height from the same scroll distance", () => {
  const seeks = READ_TIMELINE.map(({ stage }) => getReadStageSeekProgress(stage));

  assert.ok(seeks.every((seek, index) => seek > 0 && seek < 1 && (index === 0 || seek > seeks[index - 1])));
  assert.ok(Math.abs(READ_PIN_TRACK_HEIGHT_VIEWPORTS - 1 - READ_PIN_SCROLL_VIEWPORTS) < 0.000_001);
});
