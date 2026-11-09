// What each thing sounds like (pure data; architecture.md § Audio): the tables eventSounds.ts and
// fieldSounds.ts read, keyed by attack kind, enemy, ability, ally, and boss. A new tower attack
// kind, enemy, or ability gets its sound by adding a row here, not a branch.
import type { CueId } from './music/index.ts';
import type { SfxId } from './sfx/index.ts';

/** What each attack kind sounds like as it fires, and as its projectile lands (if it has one). */
export const ATTACK_SOUNDS: Readonly<
  Partial<Record<string, { readonly fire: SfxId | null; readonly land: SfxId | null }>>
> = {
  hitscan: { fire: 'rivet_shot', land: null },
  lobbed: { fire: 'thumper_launch', land: 'thumper_impact' },
  pulse: { fire: 'sprinkler_pulse', land: null },
  // The Skyhook's flak: the shot, then the airburst at its intercept point (D072).
  projectile: { fire: 'flak_fire', land: 'flak_burst' },
  // The Zapcoil's arc; its jumps are CHAIN_SOUNDS.
  chain: { fire: 'zap_arc', land: null },
};

/**
 * A chain attack's jumps (D076: one ProjectileFired, then one ProjectileHit per victim in order):
 * each victim after the first crackles `jump`, `gapSec` after the last and `pitchPerJump`
 * semitones higher (up to `maxPitch`), so the arc is heard running down the line. The recipe's
 * rate limit and voice cap thin a crowd of Zapcoils out.
 */
export const CHAIN_SOUNDS = {
  jump: 'zap_jump',
  gapSec: 0.045,
  pitchPerJump: 2,
  maxPitch: 10,
} as const satisfies {
  readonly jump: SfxId;
  readonly gapSec: number;
  readonly pitchPerJump: number;
  readonly maxPitch: number;
};

/**
 * The "wrong tool" plinks (design/core-loop.md § 5): a hit that armor blunted
 * (`ProjectileHit.reduced`, D069), and a hit that did nothing at all (it struck, `hits` > 0, but
 * took no HP: a boss between phases, a shield that took it all; D073).
 */
export const PLINK_SOUNDS = {
  reduced: 'armor_plink',
  nothing: 'invuln_plink',
} as const satisfies { readonly reduced: SfxId; readonly nothing: SfxId };

/**
 * A Cluster Thumper's bomblets (a lobbed shot with no target, scattered where its shell landed):
 * no launch of their own (the shell's impact covers it), and one rate-limited crackle as they land.
 */
export const BOMBLET_SOUNDS = { fire: null, land: 'bomblet_pop' } as const satisfies {
  readonly fire: SfxId | null;
  readonly land: SfxId | null;
};

/** Each enemy's pop pitch (semitones): small and quick is high, big and slow is low. */
export const ENEMY_POP_PITCH: Readonly<Partial<Record<string, number>>> = {
  nibbler: 0,
  zoomer: 4,
  chonk: -6,
  hauler: -9,
  puffwing: 7,
  bunchling: -3,
  digger: -2,
  elder: -8,
  // M4's units (T400a placeholders; T450 gives the Hollow and the Aelari their own deaths).
  mote: 9,
  glimmer: 5,
  weft_warden: -5,
  lightwing: 8,
};

/** A splitter's death (a Bunchling, `split` in its content): this follows its pop, after `delay` s. */
export const SPLIT_SOUND = { id: 'split_pop', delay: 0.04 } as const satisfies {
  readonly id: SfxId;
  readonly delay: number;
};

/** Each neutral unit's sounds: a shot plinking off it (NeutralHit), and its exit (NeutralExited). */
export const NEUTRAL_SOUNDS: Readonly<
  Partial<Record<string, { readonly hit: SfxId; readonly exit: SfxId }>>
> = {
  gerald: { hit: 'gerald_chime', exit: 'gerald_whistle' },
};

/**
 * A boss's sounds (design/enemies.md § 6): its arrival (BossPhase 1), each later phase, the tell
 * and the sneeze of its spawn ability (fieldSounds.ts watches the timer), and its ending
 * (BossEnded: the retreat, then the sting cue). Bosses without a row use DEFAULT_BOSS_SOUNDS.
 */
export interface BossSounds {
  readonly arrive: SfxId;
  readonly phase: SfxId;
  readonly spawnTell: SfxId | null;
  readonly spawn: SfxId | null;
  readonly end: SfxId;
}
export const DEFAULT_BOSS_SOUNDS: BossSounds = {
  arrive: 'boss_arrive',
  phase: 'boss_phase',
  spawnTell: null,
  spawn: null,
  end: 'boss_retreat',
};
export const BOSS_SOUNDS: Readonly<Partial<Record<string, BossSounds>>> = {
  chitterbloom: { ...DEFAULT_BOSS_SOUNDS, spawnTell: 'sneeze_tell', spawn: 'sneeze' },
  // T400a placeholder: T450 gives the Glass Witch her chimes.
  glass_witch: DEFAULT_BOSS_SOUNDS,
};

/**
 * The sting as a boss is driven off (BossEnded): "Everglow Bright" triumphant, stopping a step
 * short of home (Act I's held breath: the Quiet Wave follows; act1.md § A1M5).
 */
export const BOSS_END_CUE: CueId = 'boss_sting';

/** A boss's sounds by enemy id. */
export function bossSounds(enemy: string): BossSounds {
  return (
    (Object.hasOwn(BOSS_SOUNDS, enemy) ? BOSS_SOUNDS[enemy] : undefined) ?? DEFAULT_BOSS_SOUNDS
  );
}

/**
 * Sounds that loop while a kind of enemy is on the field (fieldSounds.ts): a Puffwing flock's
 * wingbeats, every `everySec` of sim time while one flies (subtle; one voice however big the flock).
 */
export const ENEMY_LOOPS: Readonly<
  Partial<Record<string, { readonly id: SfxId; readonly everySec: number }>>
> = {
  puffwing: { id: 'wing_flap', everySec: 0.45 },
};

/** Burrowing (D073): digging in and surfacing, for a Digger or a burrowing boss. */
export const BURROW_SOUNDS = { dig: 'burrow_dig', surface: 'burrow_surface' } as const satisfies {
  readonly dig: SfxId;
  readonly surface: SfxId;
};

/** A huddle leader gathering its young for the first time (D073; subtle). */
export const HUDDLE_SOUND = 'huddle_coo' as const satisfies SfxId;

/**
 * The salvage drone (D076): its rotor as it flies (out, on, and home, the last pitched
 * `homePitch`), its beam every `workEverySec` of sim time while it works a tile (after the first
 * `flyFrac` of the tile's clear time, which it spends flying; render/vfx/droneFlight.ts), and the
 * clank as a tile clears (WreckageCleared).
 */
export const DRONE_SOUNDS = {
  fly: 'drone_fly',
  work: 'drone_work',
  cleared: 'drone_cleared',
  homePitch: -3,
  workEverySec: 0.75,
  flyFrac: 0.25,
} as const satisfies {
  readonly fly: SfxId;
  readonly work: SfxId;
  readonly cleared: SfxId;
  readonly homePitch: number;
  readonly workEverySec: number;
  readonly flyFrac: number;
};

/**
 * Each ability's cast sound, and the sounds when its zone lands (the binder watches the zone; the
 * Orbital Strike's beam and boom land with it, D022).
 */
export const ABILITY_SOUNDS: Readonly<
  Partial<Record<string, { readonly cast: SfxId; readonly land: readonly SfxId[] }>>
> = {
  orbital_strike: { cast: 'strike_charge', land: ['strike_beam', 'strike_boom'] },
  // The segment starts as it's cast; its end is quiet.
  suppressing_fire: { cast: 'suppress_burst', land: [] },
  // Map-wide and instant (D077): everything sags as time slows; the register rings up the sale.
  time_dilation: { cast: 'dilation_swell', land: [] },
  clearance_sale: { cast: 'sale_kaching', land: [] },
  // T400a placeholder: T450 gives Scanner Sweep its ping.
  scanner_sweep: { cast: 'dilation_swell', land: [] },
};

/** Each ally kind's sounds: as it takes its post (AllySpawned), and per shot (AllyAttacked). */
export const ALLY_SOUNDS: Readonly<
  Partial<Record<string, { readonly spawn: SfxId | null; readonly attack: SfxId | null }>>
> = {
  bricks: { spawn: 'bricks_ready', attack: 'bricks_shot' },
};

/**
 * Fire control's clicks (core-loop §2.7): Hold fire on and off, and the spare-runners filter as
 * the same clicks pitched up, so the two read as kin but never as each other.
 */
export const FIRE_CONTROL_SOUNDS = {
  on: 'hold_fire_on',
  off: 'hold_fire_off',
  sparePitch: 5,
} as const satisfies { readonly on: SfxId; readonly off: SfxId; readonly sparePitch: number };

/** Semitones an upgrade's arpeggio rises per tier above 2. */
export const UPGRADE_PITCH_PER_TIER = 2;
/** The early-call cue plays first; the wave's horn follows after this (s). */
export const HORN_AFTER_CALL_SEC = 0.25;
