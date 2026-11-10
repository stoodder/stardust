// Story moments' music (T550; pure data, read by app/audio.ts): what plays outside a battle's
// events when the story says so. The PA's shift change in its arrangement (a flow scene's
// `jingles`, content/dialogue/resultsFlow.ts), C2's sting as its choice is taken on the Results
// card, and a line that is sung rather than spoken (its cue plays in place of the speaker's blip).
import type { JingleVariant } from '../content/presentation.ts';
import type { CueId } from './music/index.ts';

/**
 * The colony jingle played by the PA outside a battle, by arrangement (app/audio.ts
 * `playJingle`): the minor shift change that closes Act II (A2M6's stinger) has its own PA
 * arrangement. A variant without a row plays its wave-clear cue (WAVE_CLEAR_CUE).
 */
export const PA_JINGLE_CUE: Readonly<Partial<Record<JingleVariant, CueId>>> = {
  minor: 'pa_shift_minor',
};

/**
 * C2's sting by the choice taken on the Results card (Zibzab's Price; `stardust_choice`): sold
 * shrugs in minor, carried home plays the home motif. `none` (nothing to trade) has no choice to
 * take and plays nothing.
 */
export const C2_STINGS: Readonly<Record<'sold' | 'returned' | 'none', CueId | null>> = {
  sold: 'c2_sold',
  returned: 'c2_returned',
  none: null,
};

/** A line that's sung (a cue in place of its speaker's blip). */
export interface LineCue {
  /** The scene. */
  readonly scene: string;
  /** Which of its lines, counting from 0 in the order they play (silences count too). */
  readonly line: number;
  readonly cue: CueId;
  /** The typewriter's ticks hold off this long (ms), so the cue is heard alone. */
  readonly quietMs: number;
  /**
   * The music sits at this level from the line until the next spoken line or the scene's end
   * (the silences after it stay hushed).
   */
  readonly musicDuck: number;
}

/**
 * Sung lines: Pebble's hum in A2M6's whistle scene (act2.md § A2M6, `base_a2_whistle`: "Hm.
 * Hm-hm. Hmmm."), the home motif's first hum (HOME_MOTIF), over a hushed base.
 */
export const LINE_CUES: readonly LineCue[] = [
  { scene: 'a2_m06_base_whistle', line: 3, cue: 'home_hum', quietMs: 3000, musicDuck: 0.2 },
];

/** The cue sung on line `line` of scene `scene`, or null for a spoken line. */
export function lineCue(scene: string, line: number): LineCue | null {
  return LINE_CUES.find((c) => c.scene === scene && c.line === line) ?? null;
}
