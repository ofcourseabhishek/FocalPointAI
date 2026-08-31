export type ReadStage = 0 | 1 | 2 | 3 | 4 | 5;

export const READ_STAGE_COUNT = 6;

// These values are scroll distances in viewport lengths. Keeping them in one
// model means the physical pin distance and the selected reading can never
// slowly diverge as the scene is tuned.
export const READ_ENTRY_HOLD_VIEWPORTS = 0.18;
export const READ_STAGE_DURATION_VIEWPORTS = 0.48;
export const READ_STAGE_SETTLE_VIEWPORTS = 0.12;
export const READ_FINAL_DWELL_VIEWPORTS = 0.38;

export const READ_PIN_SCROLL_VIEWPORTS =
  READ_ENTRY_HOLD_VIEWPORTS +
  READ_STAGE_COUNT * READ_STAGE_DURATION_VIEWPORTS +
  READ_FINAL_DWELL_VIEWPORTS;

// A sticky element needs one viewport of physical height before its scroll
// distance begins. ReadSection uses this directly as its track height.
export const READ_PIN_TRACK_HEIGHT_VIEWPORTS = 1 + READ_PIN_SCROLL_VIEWPORTS;

export const READ_TIMELINE = Array.from({ length: READ_STAGE_COUNT }, (_, stage) => {
  const startAt = READ_ENTRY_HOLD_VIEWPORTS + stage * READ_STAGE_DURATION_VIEWPORTS;
  const endAt = startAt + READ_STAGE_DURATION_VIEWPORTS;

  return {
    stage: stage as ReadStage,
    startAt,
    settledAt: startAt + READ_STAGE_SETTLE_VIEWPORTS,
    endAt,
  };
});

export const READ_INTENT_SETTLED_AT_VIEWPORTS = READ_TIMELINE[5].settledAt;
export const READ_FINAL_DWELL_START_VIEWPORTS = READ_TIMELINE[5].endAt;

function clampProgress(progress: number) {
  return Math.min(1, Math.max(0, progress));
}

export function getReadStageAtProgress(progress: number): ReadStage {
  const scrollPosition = clampProgress(progress) * READ_PIN_SCROLL_VIEWPORTS;

  for (let index = READ_TIMELINE.length - 1; index >= 0; index -= 1) {
    const checkpoint = READ_TIMELINE[index];
    if (scrollPosition >= checkpoint.startAt) return checkpoint.stage;
  }

  return 0;
}

export function getReadStageSeekProgress(stage: ReadStage): number {
  const checkpoint = READ_TIMELINE[stage];
  const midpoint = checkpoint.startAt + READ_STAGE_DURATION_VIEWPORTS / 2;
  return midpoint / READ_PIN_SCROLL_VIEWPORTS;
}

export function isReadIntentSettled(progress: number): boolean {
  return clampProgress(progress) >= READ_INTENT_SETTLED_AT_VIEWPORTS / READ_PIN_SCROLL_VIEWPORTS;
}
