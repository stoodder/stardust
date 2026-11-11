// Act III, part two's sound tables (T750; pure data, read by eventSounds.ts and fieldSounds.ts
// like eventTablesAct3.ts): jamming and System Reboot, Hostile Takeover and the jettison's crash
// site, the Gathering Maw's split and merge, the Sproing's leapers, Big Glorp's puddle, the
// bearers' six notes, and the moments keyed to a map (Gerald's delivery on A3M4, the domes
// opening on A3M6). A new unit of this kind gets its sound by adding a row here, not a branch.
import type { CueId } from './music/index.ts';
import type { SfxId } from './sfx/index.ts';

/**
 * Jamming (enemies.md § 4; JamTell, TowerJammed, TowerUnjammed, JamInterrupted): each jammer's tell
 * by its kind (the Auditor's adding-machine `ring`, the Silencer's creeping `tendril`), a tower
 * jamming (static, powering down; rate-limited, so a ring catching four towers is one crackle) and
 * coming back (a small power-on blip), and an interrupted tell's fizzle (Stasis's answer always
 * sounds the same, as an Aelari tell's does). While any tower is Jammed, `static` crackles every
 * `staticEverySec` of sim time (fieldSounds.ts; one voice however many). An interrupted Hostile
 * Takeover also cuts its laser dead (`stops`). System Reboot's sound is its cast (ABILITY_SOUNDS);
 * its Rebooted, and each TowerUnjammed under it, ride the cast.
 */
export const JAM_SOUNDS = {
  tell: { ring: 'jam_ring', tendril: 'jam_tendril' },
  jammed: 'jammed',
  unjammed: 'jam_clear',
  interrupted: 'tell_fizzle',
  static: 'jam_static',
  staticEverySec: 1,
  stops: ['takeover_laser'],
} as const satisfies {
  readonly tell: Readonly<Record<'ring' | 'tendril', SfxId>>;
  readonly jammed: SfxId;
  readonly unjammed: SfxId;
  readonly interrupted: SfxId;
  readonly static: SfxId;
  readonly staticEverySec: number;
  readonly stops: readonly SfxId[];
};

/**
 * "Shareholder Value"'s Hostile Takeover (TakeoverTell: its 3 s laser charging, ending in the jams'
 * TowerJammed) and its jettison (Jettisoned: the plating lets go). Its arrival, phases, hangar and
 * ending are BOSS_SOUNDS'.
 */
export const TAKEOVER_SOUNDS = {
  laser: 'takeover_laser',
  jettison: 'jettison',
} as const satisfies Readonly<Record<'laser' | 'jettison', SfxId>>;

/**
 * A script opening a tile (TileOpened, `openTile`), by what it becomes: a jettison plate landing
 * as wreckage (`x`) crashes. Plates that land together crash one after another, `staggerSec`
 * apart (up to `maxStagger` steps, then together), so four plates are heard as four.
 */
export const OPEN_TILE_SOUNDS = {
  by: { x: 'plate_crash' } as Readonly<Partial<Record<string, SfxId>>>,
  staggerSec: 0.12,
  maxStagger: 4,
} as const;

/**
 * A boss that splits and merges (the Gathering Maw; BossSplit, BossMerged): the tear into parts,
 * and the parts sliding back together. Its phase 2 (the split's telegraph) is BOSS_SOUNDS'.
 */
export const BOSS_SPLIT_SOUNDS = {
  split: 'gmaw_split',
  merge: 'gmaw_merge',
} as const satisfies Readonly<Record<'split' | 'merge', SfxId>>;

/**
 * The Sproing Pad's leapers (towers.md; LeaperBonk, FlyerGrounded): a spring's boing on each bonk
 * (90 ms gap, two voices: a pad's volley is a bounce, not a buzz), and a dull thud when one Pins a
 * flyer to the ground, the moment ground towers can hit it. ATTACK_SOUNDS `leaper` is silent.
 */
export const LEAPER_SOUNDS = {
  bonk: 'leaper_boing',
  grounded: 'grounded_thud',
} as const satisfies Readonly<Record<'bonk' | 'grounded', SfxId>>;

/** Big Glorp's puddle spreading (PuddleSpawned): a faint acid sizzle, one voice, 400 ms gap. */
export const PUDDLE_SOUND = 'puddle_hiss' as const satisfies SfxId;

/**
 * The bearers (A3M5; BearerHome): each one home hums the next note of the six, in tune, G–C–E,
 * F–D–C (`steps`, semitones over the recipe's G4), round and round the phrase for the whole map,
 * so a group carried home sings the tune the vats hummed. Bearers home in the same frame sing
 * their notes one after another, `staggerSec` apart.
 */
export const BEARER_SOUNDS = {
  note: 'bearer_note',
  steps: [0, 5, 9, 10, 7, 5],
  staggerSec: 0.3,
} as const satisfies {
  readonly note: SfxId;
  readonly steps: readonly number[];
  readonly staggerSec: number;
};

/**
 * A neutral unit's sounds on one map, ahead of NEUTRAL_SOUNDS: on A3M4 Gerald leaves having
 * delivered the Sergeant's mail, so his exit is the delivery (`mail_delivered`: his whistle, the
 * envelope, a bell), not the cheery whistle.
 */
export const MAP_NEUTRAL_SOUNDS: Readonly<
  Partial<
    Record<string, Readonly<Partial<Record<string, { readonly hit: SfxId; readonly exit: SfxId }>>>>
  >
> = {
  a3_m04: { gerald: { hit: 'gerald_chime', exit: 'mail_delivered' } },
};

/**
 * The cue the map's first refugee to reach safety plays (RefugeeEvacuated), by map: on A3M6 the
 * domes open to let the valley in, and the first one inside is Act III's first warm cadence
 * (`domes_open`). It plays over the refugee's chirp and QUILL's `cue_sheltered`.
 */
export const FIRST_SHELTERED_CUE: Readonly<Partial<Record<string, CueId>>> = {
  a3_m06: 'domes_open',
};

/**
 * A hidden cloaked unit's sound by enemy, in place of CLOAK_SOUNDS' footsteps (fieldSounds.ts):
 * the Black Budget Operative's active camouflage shimmers. One voice per sound, on the footsteps'
 * clock.
 */
export const ENEMY_CLOAK_SOUNDS: Readonly<Partial<Record<string, SfxId>>> = {
  blackbudget: 'bb_shimmer',
};
