export const RESULT_VIEW_ORDER = ['overview', 'evidence', 'frame'];
export const CURTAIN_ANGLE_DEGREES = 9;
export const CURTAIN_PHASE_DURATION_MS = 400;
export const CURTAIN_ACCENT_DELAY_MS = 32;
export const CURTAIN_EASING = 'cubic-bezier(0.77, 0, 0.175, 1)';

const COPY_TRAVEL_PX = 24;

function formatPx(value) {
  const rounded = Number(value.toFixed(6));
  return `${Object.is(rounded, -0) ? 0 : rounded}px`;
}

function polygon(points) {
  return `polygon(${points.map(([x, y]) => `${formatPx(x)} ${formatPx(y)}`).join(', ')})`;
}

function stageDimensions(width, height) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError('Curtain dimensions must be finite positive numbers.');
  }

  return { width, height, edge: Math.tan(CURTAIN_ANGLE_DEGREES * Math.PI / 180) * height };
}

function isDirection(direction) {
  return direction === 'forward' || direction === 'backward';
}

/**
 * Returns the ordered navigation direction, or null when no transition is needed.
 */
export function curtainDirection(from, to) {
  const fromIndex = RESULT_VIEW_ORDER.indexOf(from);
  const toIndex = RESULT_VIEW_ORDER.indexOf(to);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null;
  return toIndex > fromIndex ? 'forward' : 'backward';
}

/**
 * WAAPI frames for a fixed, full-stage curtain panel. The advancing edge is a 9° diagonal.
 */
export function curtainClipFrames(direction, width, height) {
  if (!isDirection(direction)) return null;

  const stage = stageDimensions(width, height);
  const forwardStart = polygon([
    [-stage.width, 0],
    [-stage.edge, 0],
    [0, stage.height],
    [-stage.width, stage.height],
  ]);
  const forwardEnd = polygon([
    [0, 0],
    [stage.width, 0],
    [stage.width + stage.edge, stage.height],
    [0, stage.height],
  ]);
  const backwardStart = polygon([
    [stage.width * 2, 0],
    [stage.width + stage.edge, 0],
    [stage.width, stage.height],
    [stage.width * 2, stage.height],
  ]);
  const backwardEnd = polygon([
    [stage.width, 0],
    [0, 0],
    [-stage.edge, stage.height],
    [stage.width, stage.height],
  ]);
  const forwardRevealEnd = polygon([
    [stage.width * 2, 0],
    [stage.width + stage.edge, 0],
    [stage.width, stage.height],
    [stage.width * 2, stage.height],
  ]);
  const backwardRevealEnd = forwardStart;

  return direction === 'forward'
    ? {
      cover: [{ clipPath: backwardStart }, { clipPath: backwardEnd }],
      reveal: [{ clipPath: forwardEnd }, { clipPath: backwardRevealEnd }],
    }
    : {
      cover: [{ clipPath: forwardStart }, { clipPath: forwardEnd }],
      reveal: [{ clipPath: backwardEnd }, { clipPath: forwardRevealEnd }],
    };
}

/**
 * WAAPI frames for curtain copy, aligned with the directional clip-path sweep.
 */
export function curtainCopyFrames(direction) {
  if (!isDirection(direction)) return null;

  const sign = direction === 'forward' ? -1 : 1;
  const start = `translateX(${-sign * COPY_TRAVEL_PX}px)`;
  const end = `translateX(${sign * COPY_TRAVEL_PX}px)`;

  return {
    cover: [{ transform: start }, { transform: 'translateX(0px)' }],
    reveal: [{ transform: 'translateX(0px)' }, { transform: end }],
  };
}

/**
 * Executes the curtain WAAPI state machine.
 */
export async function executeCurtainTransition({
  direction,
  stageElement,
  surfaceElement,
  accentElement,
  copyElement,
  onPhaseChange,
  onCovered,
  onComplete,
  onFallback,
}) {
  const animations = [];
  try {
    if (!stageElement || !surfaceElement || !accentElement || !copyElement) {
      onFallback();
      return;
    }

    onPhaseChange('cover');
    const bounds = stageElement.getBoundingClientRect();
    const clipFrames = curtainClipFrames(direction, bounds.width, bounds.height);
    const copyFrames = curtainCopyFrames(direction);
    const phaseOptions = {
      duration: CURTAIN_PHASE_DURATION_MS,
      easing: CURTAIN_EASING,
      fill: 'both',
    };

    const run = (el, frames, options) => {
      const animation = el.animate(frames, options);
      animations.push(animation);
      return animation.finished;
    };

    await Promise.all([
      run(accentElement, clipFrames.cover, phaseOptions),
      run(surfaceElement, clipFrames.cover, { ...phaseOptions, delay: CURTAIN_ACCENT_DELAY_MS }),
      run(copyElement, copyFrames.cover, { ...phaseOptions, delay: CURTAIN_ACCENT_DELAY_MS }),
    ]);

    onPhaseChange('swap');
    await onCovered();

    onPhaseChange('reveal');
    await Promise.all([
      run(surfaceElement, clipFrames.reveal, phaseOptions),
      run(copyElement, copyFrames.reveal, phaseOptions),
      run(accentElement, clipFrames.reveal, { ...phaseOptions, delay: CURTAIN_ACCENT_DELAY_MS }),
    ]);
  } catch {
    onFallback();
  } finally {
    animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // Ignore cancel errors
      }
    });
    onComplete();
  }
}
