import assert from "node:assert/strict";
import test from "node:test";

import {
  DESKTOP_HERO_TIMELINE,
  getActiveHeroStage,
  HERO_ANALYSIS_BODY_STAGGER,
} from "./hero-timeline.ts";

test("selects every processing stage at its activation checkpoint in both scroll directions", () => {
  const checkpoints = DESKTOP_HERO_TIMELINE.map(({ activateAt }) => activateAt);

  assert.deepEqual(
    checkpoints.map(getActiveHeroStage),
    [0, 1, 2, 3, 4],
  );
  assert.deepEqual([...checkpoints].reverse().map(getActiveHeroStage), [4, 3, 2, 1, 0]);
});

test("keeps the preceding stage active immediately before each forward checkpoint", () => {
  assert.deepEqual(
    [0.119_999, 0.319_999, 0.519_999, 0.719_999].map(getActiveHeroStage),
    [0, 1, 2, 3],
  );
});

test("keeps all copy settled for at least 75% of each active stage's scroll range", () => {
  for (let index = 1; index < DESKTOP_HERO_TIMELINE.length; index++) {
    const stage = DESKTOP_HERO_TIMELINE[index];
    const activeEnd = DESKTOP_HERO_TIMELINE[index + 1]?.activateAt ?? stage.endAt;
    const activeInterval = activeEnd - stage.activateAt;
    const settledStart = Math.max(stage.activateAt, stage.settledAt + HERO_ANALYSIS_BODY_STAGGER);
    const settledHold = Math.min(stage.leaveAt, activeEnd) - settledStart;

    assert.ok(settledHold / activeInterval >= 0.75, `stage ${stage.stage} hold is too brief`);
  }
});

test("clears Direct before the hero completes", () => {
  const direct = DESKTOP_HERO_TIMELINE.at(-1);

  assert.equal(direct.stage, 4);
  assert.ok(direct.endAt > direct.leaveAt && direct.endAt < 1);
});
