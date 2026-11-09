// Frame CPU time for `__sd.perf()` (conventions.md § Performance rules): the wall time from
// Phaser's pre-step to its post-render, smoothed, so idle time between frames isn't counted.
import * as Phaser from 'phaser';

/** Smoothing for the frame-time average (exponential, per frame). */
const SMOOTHING = 0.1;

export interface FrameMeter {
  /** Mean CPU time of recent frames, in ms. */
  frameMs(): number;
}

/** Starts measuring a game's frames. */
export function meterFrames(game: Phaser.Game): FrameMeter {
  let start = 0;
  let mean = 0;
  game.events.on(Phaser.Core.Events.PRE_STEP, () => {
    start = performance.now();
  });
  game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    const ms = performance.now() - start;
    mean = mean === 0 ? ms : mean + (ms - mean) * SMOOTHING;
  });
  return { frameMs: () => mean };
}
