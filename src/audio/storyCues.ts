// Story moments' music (T550, T650; pure data, read by app/audio.ts): what plays outside a
// battle's events when the story says so. The PA's shift change in its arrangement (a flow scene's
// `jingles`, content/dialogue/resultsFlow.ts), C2's sting as its choice is taken (on the Results
// card or at the base), a line that is sung rather than spoken (its cue plays in place of the
// speaker's blip), and a cue that holds the music down while it shows (Sterling's Clean Exit).
import { parseSceneId } from '../content/dialogue/rules.ts';
import type { SpeakerId } from '../content/dialogue/types.ts';
import type { JingleVariant } from '../content/presentation.ts';
import type { CueId } from './music/index.ts';
import type { SfxId } from './sfx/index.ts';

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
 * - The finale (finale.md § FIN; music/fin.ts): Pebble at the memorial hums Bricks's half
 *   phrase low (`memorial_hum`); at the mouth of the Halls her six notes, the choir coming in on
 *   the last (`halls_hum`), before the hymn; for Thrum's echo, her six notes with her
 *   grandmother's voice answering in tenths that land on C (`echo_hum`); and in the Dawn scene,
 *   "Everyone sings it." is the jingle in C major, sung (`dawn_sung`).
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
  // The finale (T850; music/fin.ts).
  {
    scene: 'fin_m01_cue_memorial',
    speaker: 'pebble',
    text: "(hum, low) That's Bricks's. That's yours.",
    cue: 'memorial_hum',
    quietMs: 3000,
    musicDuck: 0.3,
  },
  {
    scene: 'fin_m01_cue_phase2',
    speaker: 'pebble',
    text: '(hum, six notes, loud)',
    cue: 'halls_hum',
    quietMs: 4000,
    musicDuck: 0.2,
  },
  {
    scene: 'fin_m01_cue_echo',
    speaker: 'pebble',
    text: 'Grandmother. (hum, six notes) She heard.',
    cue: 'echo_hum',
    quietMs: 4000,
    musicDuck: 0.25,
  },
  {
    scene: 'fin_m01_scene_dawn',
    speaker: 'narrator',
    text: '(The hushed ones wake. The jingle comes round again, in a major key. Everyone sings it.)',
    cue: 'dawn_sung',
    quietMs: 0,
    musicDuck: 0.2,
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

/**
 * A silence (a line with no words in an absent speaker's dark frame) that holds the music down
 * while it shows, by speaker (T750): Bricks's silences in Act III are truly silent, the music
 * falling away to nothing (`musicDuck` 0) in `fadeSec` and the battle's small sounds held back
 * (`sfxDuck`, the `underSpeech` bus), so his absence is heard. Released as the line ends, the
 * music easing back over `backSec`. Other silences keep the radio's duck.
 */
export const SILENCE_HUSHES: Readonly<
  Partial<
    Record<
      SpeakerId,
      {
        readonly musicDuck: number;
        readonly sfxDuck: number;
        readonly fadeSec: number;
        readonly backSec: number;
      }
    >
  >
> = {
  bricks: { musicDuck: 0, sfxDuck: 0.3, fadeSec: 0.3, backSec: 1.2 },
};

/** The hush a silence line by `speaker` holds (SILENCE_HUSHES), or null. */
export function silenceHush(speaker: SpeakerId) {
  return Object.hasOwn(SILENCE_HUSHES, speaker) ? (SILENCE_HUSHES[speaker] ?? null) : null;
}

/**
 * A spoken line that plays a sound effect of its own as it starts, its blip `blipDelaySec` later
 * (T750): Pebble's "Knock knock!" on A3M6's radio knocks twice on a dome's door, then squeaks (her
 * blip). A radio line carries no scene id, so these match by speaker and text.
 */
export interface LineSfx {
  readonly speaker: SpeakerId;
  /** The line's text as written. */
  readonly text: string;
  readonly sfx: SfxId;
  readonly blipDelaySec: number;
}

export const LINE_SFX: readonly LineSfx[] = [
  { speaker: 'pebble', text: 'Knock knock! (squeak)', sfx: 'knock_knock', blipDelaySec: 0.45 },
];

/** The sound effect line `speaker`/`text` plays as it starts (LINE_SFX), or null. */
export function lineSfx(speaker: SpeakerId, text: string): LineSfx | null {
  return LINE_SFX.find((l) => l.speaker === speaker && l.text === text) ?? null;
}

/**
 * The Waykeeper sting (act3.md § A3M6, *Debrief*; T750): in A3M6's debrief, `cue` plays as the
 * callsign plate turns (T714's ui/screens/waykeeper.ts `plateTurned`: Pebble's naming line whole,
 * then its hold), so the name and the music land together.
 */
export const WAYKEEPER_STING = { scene: 'a3_m06_debrief', cue: 'waykeeper' } as const satisfies {
  readonly scene: string;
  readonly cue: CueId;
};

/**
 * A scene that plays a sound effect as it opens, by scene id (T750): A3M4's mail scene opens on
 * Gerald's delivery (`mail_delivered`), the envelope he carried arriving on the table.
 */
export const SCENE_OPEN_SFX: Readonly<Partial<Record<string, SfxId>>> = {
  a3_m04_scene_mail: 'mail_delivered',
};
