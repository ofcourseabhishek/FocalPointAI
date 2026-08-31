export type HeroStage = 0 | 1 | 2 | 3 | 4;

// The final body line enters after the label and headline. Keep its scroll
// offset shared with the timeline test so dwell guarantees stay truthful.
export const HERO_ANALYSIS_BODY_STAGGER = 0.006;

// The visual transition, accessibility state, and progress indicator all derive
// from these checkpoints. Even the final staggered body line stays settled for
// at least three quarters of a stage's active scroll range; Direct clears
// before the following chapter.
export const DESKTOP_HERO_TIMELINE = [
  { stage: 0, activateAt: 0, enterAt: 0, settledAt: 0, leaveAt: 0.08, endAt: 0.12 },
  { stage: 1, activateAt: 0.12, enterAt: 0.1, settledAt: 0.14, leaveAt: 0.3, endAt: 0.34 },
  { stage: 2, activateAt: 0.32, enterAt: 0.3, settledAt: 0.34, leaveAt: 0.5, endAt: 0.54 },
  { stage: 3, activateAt: 0.52, enterAt: 0.5, settledAt: 0.54, leaveAt: 0.7, endAt: 0.74 },
  { stage: 4, activateAt: 0.72, enterAt: 0.7, settledAt: 0.74, leaveAt: 0.95, endAt: 0.99 },
] as const satisfies readonly {
  stage: HeroStage;
  activateAt: number;
  enterAt: number;
  settledAt: number;
  leaveAt: number;
  endAt: number;
}[];

export function getActiveHeroStage(progress: number): HeroStage {
  for (let index = DESKTOP_HERO_TIMELINE.length - 1; index >= 0; index -= 1) {
    const checkpoint = DESKTOP_HERO_TIMELINE[index];
    if (checkpoint && progress >= checkpoint.activateAt) {
      return checkpoint.stage;
    }
  }

  return 0;
}
