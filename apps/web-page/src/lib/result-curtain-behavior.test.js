import test from 'node:test';
import assert from 'node:assert/strict';
import { executeCurtainTransition } from './result-curtain.js';

function createMockElement(id) {
  return {
    id,
    dataset: {},
    getBoundingClientRect: () => ({ width: 1000, height: 800 }),
    animate: function (keyframes, options) {
      const animation = {
        keyframes,
        options,
        cancel: () => {
          this.canceled = true;
        },
      };
      
      this.animations = this.animations || [];
      this.animations.push(animation);

      // Return a promise that we can manually resolve or reject in tests
      let resolveFinished, rejectFinished;
      animation.finished = new Promise((res, rej) => {
        resolveFinished = res;
        rejectFinished = rej;
      });
      animation.resolve = resolveFinished;
      animation.reject = rejectFinished;
      
      return animation;
    },
  };
}

function createMockHarness() {
  const stageElement = createMockElement('stage');
  const surfaceElement = createMockElement('surface');
  const accentElement = createMockElement('accent');
  const copyElement = createMockElement('copy');

  const log = [];
  
  return {
    stageElement,
    surfaceElement,
    accentElement,
    copyElement,
    log,
    onPhaseChange: (phase) => log.push(`phase:${phase}`),
    onCovered: async () => {
      log.push('covered');
      // simulate the rAF wait
      await new Promise(r => setImmediate(r));
    },
    onComplete: () => log.push('completed'),
    onFallback: () => log.push('fallback'),
  };
}

async function waitForLogEntry(log, entry) {
  for (let attempt = 0; attempt < 20 && !log.includes(entry); attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

test('curtain behavior - happy path', async () => {
  const harness = createMockHarness();
  
  const promise = executeCurtainTransition({
    direction: 'forward',
    ...harness,
  });

  // Wait a microtask for the cover phase to start
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(harness.log, ['phase:cover']);

  // Resolve cover animations
  harness.accentElement.animations[0].resolve();
  harness.surfaceElement.animations[0].resolve();
  harness.copyElement.animations[0].resolve();

  // Wait for cover promise to resolve, phase to change, and onCovered to finish
  await waitForLogEntry(harness.log, 'phase:reveal');
  
  // It should transition to swap, run onCovered, then reveal
  assert.deepEqual(harness.log, ['phase:cover', 'phase:swap', 'covered', 'phase:reveal']);

  // Resolve reveal animations
  harness.surfaceElement.animations[1].resolve();
  harness.copyElement.animations[1].resolve();
  harness.accentElement.animations[1].resolve();

  await promise;
  assert.deepEqual(harness.log, ['phase:cover', 'phase:swap', 'covered', 'phase:reveal', 'completed']);
});

test('curtain behavior - missing DOM fallback', async () => {
  const harness = createMockHarness();
  
  // Omit stageElement to trigger fallback
  await executeCurtainTransition({
    direction: 'forward',
    ...harness,
    stageElement: null,
  });

  assert.deepEqual(harness.log, ['fallback', 'completed']);
});

test('curtain behavior - animation failure recovery', async () => {
  const harness = createMockHarness();
  
  const promise = executeCurtainTransition({
    direction: 'forward',
    ...harness,
  });

  await new Promise(r => setImmediate(r));
  assert.deepEqual(harness.log, ['phase:cover']);

  // Reject one of the cover animations to simulate failure
  harness.accentElement.animations[0].reject(new Error('Animation aborted'));

  await promise;
  
  // Should trigger fallback and still complete
  assert.deepEqual(harness.log, ['phase:cover', 'fallback', 'completed']);
  
  // Should cancel other animations
  assert.equal(harness.surfaceElement.canceled, true);
  assert.equal(harness.copyElement.canceled, true);
});
