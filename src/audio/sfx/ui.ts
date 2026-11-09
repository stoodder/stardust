// UI sounds: crisp, quiet Everglow clicks (design/towers.md § faction look: "crisp clicks, cheerful
// startup chimes"), and the rejection buzz under every "can't do that" notice.
import type { SfxRecipe } from '../types.ts';

export const UI_SFX = {
  /** A button press. */
  ui_click: {
    gain: 0.3,
    priority: 0,
    minGapMs: 30,
    layers: [
      {
        wave: 'pulse25',
        freq: 1200,
        steps: [[0.012, 1.5]],
        env: { a: 0.001, d: 0.03, s: 0, r: 0.02 },
        gain: 0.6,
      },
    ],
  },
  /** The pointer enters a button: barely there. */
  ui_hover: {
    gain: 0.14,
    priority: 0,
    minGapMs: 60,
    maxVoices: 1,
    layers: [
      { wave: 'triangle', freq: 1760, env: { a: 0.002, d: 0.02, s: 0, r: 0.015 }, gain: 0.6 },
    ],
  },
  /** Can't afford, can't build there, locked, recharging: a low double buzz, never harsh. */
  reject: {
    gain: 0.26,
    priority: 1,
    minGapMs: 150,
    maxVoices: 1,
    layers: [
      {
        wave: 'square',
        freq: 196,
        filter: { type: 'lowpass', freq: 1400 },
        env: { a: 0.002, d: 0.02, s: 0.8, hold: 0.05, r: 0.02 },
        gain: 0.6,
      },
      {
        wave: 'square',
        at: 0.11,
        freq: 175,
        filter: { type: 'lowpass', freq: 1400 },
        env: { a: 0.002, d: 0.02, s: 0.8, hold: 0.06, r: 0.03 },
        gain: 0.6,
      },
    ],
  },
  /** Hold fire on (one turret or all): two soft clicks stepping down, a safety catch going on. */
  hold_fire_on: {
    gain: 0.24,
    priority: 1,
    minGapMs: 80,
    maxVoices: 1,
    layers: [
      {
        wave: 'pulse25',
        freq: 880,
        steps: [[0.05, 0.75]],
        filter: { type: 'lowpass', freq: 2400 },
        env: { a: 0.002, d: 0.03, s: 0.5, hold: 0.06, r: 0.03 },
        gain: 0.6,
      },
    ],
  },
  /** Hold fire off: the same two clicks stepping back up. */
  hold_fire_off: {
    gain: 0.24,
    priority: 1,
    minGapMs: 80,
    maxVoices: 1,
    layers: [
      {
        wave: 'pulse25',
        freq: 660,
        steps: [[0.05, 4 / 3]],
        filter: { type: 'lowpass', freq: 2400 },
        env: { a: 0.002, d: 0.03, s: 0.5, hold: 0.06, r: 0.03 },
        gain: 0.6,
      },
    ],
  },
  /**
   * A medal slips out of reach this run (MedalProgress forfeited; D059): a soft, warm falling
   * third on a sine, quiet and kind ("Next time!"), never a buzzer.
   */
  medal_forfeit: {
    gain: 0.2,
    priority: 1,
    minGapMs: 400,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 659.25,
        steps: [[0.12, 0.8]],
        env: { a: 0.01, d: 0.08, s: 0.6, hold: 0.16, r: 0.25 },
        gain: 0.7,
      },
      {
        wave: 'triangle',
        freq: 329.63,
        steps: [[0.12, 0.8]],
        env: { a: 0.01, d: 0.08, s: 0.5, hold: 0.16, r: 0.25 },
        gain: 0.35,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
