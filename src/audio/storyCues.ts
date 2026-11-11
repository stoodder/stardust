// Story moments' music (T550, T650; pure data, read by app/audio.ts): what plays outside a
// battle's events when the story says so. The PA's shift change in its arrangement (a flow scene's
// `jingles`, content/dialogue/resultsFlow.ts), C2's sting as its choice is taken (on the Results
// card or at the base), a line that is sung rather than spoken (its cue plays in place of the
// speaker's blip), and a cue that holds the music down while it shows (Sterling's Clean Exit).
import { parseSceneId } from '../content/dialogue/rules.ts';
import type { SpeakerId } from '../content/dialogue/types.ts';
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
 * C2's sting by the choice taken, on the Results card or at the base (Zibzab's Price; D138's
 * `stardust_choice` offered again at the base when the card was never answered): sold
 * shrugs in minor, carried home plays the home motif. `none` (nothing to trade) has no choice to
 * take and plays nothing.
 */
export const C2_STINGS: Readonly<Record<'sold' | 'returned' | 'none', CueId | null>> = {
  sold: 'c2_sold',
  returned: 'c2_returned',
  none: null,
};

/**
 * A line that's sung (a cue in place of its speaker's blip), or a player's pick that is (the
 * Leaving Song's "(hum along)").
 */
export interface LineCue {
  /** The scene (a comms cue's lines carry no scene id, so they match by speaker and text). */
  readonly scene: string;
  readonly speaker: SpeakerId;
  /** The line's text as written (no tokens), or the pick's option text. */
  readonly text: string;
  /**
   * The cue, or null for a line sung over a loop already sounding (A3M3's door hum: no blip, and
   * no cue over it).
   */
  readonly cue: CueId | null;
  /** The typewriter's ticks hold off this long (ms), so the cue is heard alone. */
  readonly quietMs: number;
  /**
   * The music sits at this level from the line until the next spoken line or the scene's end
   * (the silences after it stay hushed).
   */
  readonly musicDuck: number;
}

/**
 * Sung lines:
 * - Pebble's hum in A2M6's whistle scene (act2.md § A2M6, `base_a2_whistle`: "Hm. Hm-hm.
 *   Hmmm."), the home motif (HOME_MOTIF) as she first hums it, over a hushed base. (The motif is
 *   first heard on glass in C2's carried-home sting, D137.)
 * - The Leaving Song (act3.md § A3M1, `a3_m01_scene_song`): Pebble hums the six notes of
 *   "Everglow Bright" alone; Old Thrum, if she lived, hums with her (her cue takes over from
 *   Pebble's, from the top, the two voices in tenths); and the player's "(hum along)" joins
 *   Pebble an octave under her.
 * - The SEAL (act3.md § A3M3, `a3_m03_cue_seal`): Bricks's and Pebble's hums are the door hum
 *   itself (`door_hum`, struck while the SEAL waits), so their lines play no blip and no cue.
 */
export const LINE_CUES: readonly LineCue[] = [
  {
    scene: 'a2_m06_base_whistle',
    speaker: 'pebble',
    text: 'Hm. Hm-hm. Hmmm.',
    cue: 'home_hum',
    quietMs: 3000,
    musicDuck: 0.2,
  },
  {
    scene: 'a3_m01_scene_song',
    speaker: 'pebble',
    text: '(hum, six notes)',
    cue: 'leaving_hum',
    quietMs: 4000,
    musicDuck: 0.2,
  },
  {
    scene: 'a3_m01_scene_song',
    speaker: 'thrum',
    text: '(hum, six notes)',
    cue: 'leaving_hum_two',
    quietMs: 4000,
    musicDuck: 0.2,
  },
  {
    scene: 'a3_m01_scene_song',
    speaker: 'player',
    text: '(hum along)',
    cue: 'leaving_hum_along',
    quietMs: 4000,
    musicDuck: 0.2,
  },
  {
    scene: 'a3_m03_cue_seal',
    speaker: 'bricks',
    text: '(hum, six notes, slow)',
    cue: null,
    quietMs: 3000,
    musicDuck: 0.12,
  },
  {
    scene: 'a3_m03_cue_seal',
    speaker: 'pebble',
    text: '(hum, six notes, along)',
    cue: null,
    quietMs: 3000,
    musicDuck: 0.12,
  },
];

/**
 * The sung line `speaker` says with `text` in scene `scene` (null: a comms line, whose scene isn't
 * known; only cue scenes, `<map>_cue_<name>`, play on the comms panel), or null for a spoken line.
 */
export function lineCue(scene: string | null, speaker: SpeakerId, text: string): LineCue | null {
  return (
    LINE_CUES.find(
      (c) =>
        c.speaker === speaker &&
        c.text === text &&
        (scene === null ? c.scene.includes('_cue_') : c.scene === scene),
    ) ?? null
  );
}

/**
 * Cues whose scene holds the music down while it shows, by cue name (`<map>_cue_<name>`; content/
 * dialogue's scene ids): Sterling's Clean Exit (A3M2's `revoke`, a pausing panel) lets the music
 * fall away under her cheerful voice, so her held beat (a 2 s silence) is silence. Released as the
 * scene closes.
 */
export const CUE_HUSHES: Readonly<
  Partial<Record<string, { readonly musicDuck: number; readonly fadeSec: number }>>
> = {
  revoke: { musicDuck: 0.05, fadeSec: 1 },
};

/** The music hush scene `sceneId` holds while it shows (CUE_HUSHES), or null. */
export function cueHush(
  sceneId: string,
): { readonly musicDuck: number; readonly fadeSec: number } | null {
  const slot = parseSceneId(sceneId)?.slot;
  return slot?.kind === 'cue' ? (CUE_HUSHES[slot.name] ?? null) : null;
}
