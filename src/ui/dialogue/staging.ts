// Full-screen scene staging (D097 R3; act1.md § A1M5): what a scene shows besides its lines, by
// scene id. Act I's payoff gets two: the stinger's Rig 9 camera feed (live, static, six frames of
// something the wrong shape, static, then NO SIGNAL, before its caption) and the party's bright
// stage (the confetti cannon fires, confetti falls, and the record counter ticks). Pure: the
// timelines are data, and `frameAt` says which sprite frame shows at a moment, so the components
// (Staging.tsx) only draw. Reduced motion holds still frames (no static, no blink, no flicker).

/** A scene's staging, by kind. */
export type StagingKind = 'rig9_feed' | 'party';

/** Which scenes are staged (a UI-owned table, keyed by scene id; K6). */
export const SCENE_STAGING: Readonly<Record<string, StagingKind>> = {
  a1_m05_scene_stinger: 'rig9_feed',
  a1_m05_scene_party: 'party',
};

/** The staging for `sceneId`, or null for a plain scene. */
export function stagingOf(sceneId: string): StagingKind | null {
  return Object.hasOwn(SCENE_STAGING, sceneId) ? SCENE_STAGING[sceneId]! : null;
}

/** An animation as the sprite defines it (`def.anims[name]`). */
export interface AnimFrames {
  readonly frames: readonly string[];
  readonly fps: number;
  /** Default true. */
  readonly loop?: boolean;
}

/** One step of a timeline: an animation (or one still frame) for `ms`, or held to the end (null). */
export type Beat =
  | { readonly anim: string; readonly ms: number | null }
  | { readonly frame: string; readonly ms: number | null };

/** The sprites the stagings draw. */
export const FEED_SPRITE = 'scene.rig9_feed';
export const CANNON_SPRITE = 'prop.confetti_cannon';
export const CONFETTI_SPRITE = 'fx.confetti_burst';

/**
 * The stinger's feed: the rig at night, a burst of static, the smudge (six frames, 0.5 s), static
 * again, then NO SIGNAL held while the caption, the held beat, and QUILL's line play.
 */
export const FEED_BEATS: readonly Beat[] = [
  { anim: 'live', ms: 1500 },
  { anim: 'static', ms: 250 },
  { anim: 'smudge', ms: 500 },
  { anim: 'static', ms: 250 },
  { anim: 'no_signal', ms: null },
];

/** Under reduced motion: the rig, the smudge as one held still, then NO SIGNAL (no static). */
export const FEED_BEATS_STILL: readonly Beat[] = [
  { frame: 'live_0', ms: 1000 },
  { frame: 'smudge_3', ms: 1000 },
  { frame: 'no_signal_0', ms: null },
];

/** The party's cannon: it fires as the scene opens (`fire`, 8 fps, once), then stands idle. */
export const CANNON_BEATS: readonly Beat[] = [{ anim: 'fire', ms: null }];
export const CANNON_BEATS_STILL: readonly Beat[] = [{ frame: 'idle', ms: null }];

/** The burst over the muzzle starts with the cannon's `fire_0` (10 fps, once). */
export const BURST_BEATS: readonly Beat[] = [{ anim: 'burst', ms: null }];
/** Under reduced motion: one still of the fountain at its peak. */
export const BURST_BEATS_STILL: readonly Beat[] = [{ frame: 'burst_3', ms: null }];

/** Confetti drifting down behind the lines (`fall`, 6 fps, looping); one still under reduced motion. */
export const FALL_BEATS: readonly Beat[] = [{ anim: 'fall', ms: null }];
export const FALL_BEATS_STILL: readonly Beat[] = [{ frame: 'fall_0', ms: null }];

/** How long the party's record counter ticks up (ms; at once under reduced motion). */
export const COUNTER_TICK_MS = 1600;

/** How long the lines wait while `beats` play: the sum of the timed beats before a held one. */
export function leadInMs(beats: readonly Beat[]): number {
  let ms = 0;
  for (const b of beats) {
    if (b.ms === null) break;
    ms += b.ms;
  }
  return ms;
}

/** How long a staging holds its scene's first line back, by kind (the stinger's feed plays first). */
export function stagingLeadInMs(kind: StagingKind, still: boolean): number {
  return kind === 'rig9_feed' ? leadInMs(still ? FEED_BEATS_STILL : FEED_BEATS) : 0;
}

/**
 * How long after a staging's start Next and Esc are swallowed (ms), by kind: a scene that must not
 * be skipped past at once (T614 fills it in; 0 for every kind until then).
 */
export function stagingLockMs(_kind: StagingKind, _still: boolean): number {
  return 0;
}

/**
 * The frame on show `ms` into `beats` (anims looked up in `anims`): a looping anim cycles, a
 * one-shot holds its last frame, and past the last timed beat the held one plays on. Null for an
 * anim the sprite doesn't define.
 */
export function frameAt(
  beats: readonly Beat[],
  anims: Readonly<Record<string, AnimFrames | object>>,
  ms: number,
): string | null {
  let t = Math.max(0, ms);
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i]!;
    const last = i === beats.length - 1;
    if (b.ms !== null && t >= b.ms && !last) {
      t -= b.ms;
      continue;
    }
    if ('frame' in b) return b.frame;
    const a = anims[b.anim];
    if (a === undefined || !('frames' in a) || a.frames.length === 0) return null;
    const n = Math.floor((t * a.fps) / 1000);
    const k = a.loop === false ? Math.min(n, a.frames.length - 1) : n % a.frames.length;
    return a.frames[k]!;
  }
  return null;
}

/**
 * Whether `beats` still change after `ms` (a looping or unfinished anim, or a timed beat to come),
 * so the stage keeps redrawing; a still sequence that has reached its held frame doesn't.
 */
export function stillMoving(
  beats: readonly Beat[],
  anims: Readonly<Record<string, AnimFrames | object>>,
  ms: number,
): boolean {
  let t = Math.max(0, ms);
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i]!;
    if (b.ms !== null && t < b.ms) return true;
    if (b.ms !== null && i < beats.length - 1) {
      t -= b.ms;
      continue;
    }
    if ('frame' in b) return false;
    const a = anims[b.anim];
    if (a === undefined || !('frames' in a)) return false;
    return a.loop !== false || t < (a.frames.length * 1000) / a.fps;
  }
  return false;
}
