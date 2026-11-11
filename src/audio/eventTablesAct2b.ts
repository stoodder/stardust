// Act II, part two's sound tables (T550, T501h; pure data, read by eventSounds.ts, fieldSounds.ts,
// and app/audio.ts like eventTables.ts): towers with a voice of their own, beams, phasing, the
// Hollow's splits, the pivot, the Escort, Sundown, income, and the meters' alarm. A new unit or
// tower of this kind gets its sound by adding a row here, not a branch.
import type { EnemyFaction } from '../content/types.ts';
import type { SfxId } from './sfx/index.ts';

/**
 * Towers whose shots have their own sound, ahead of their attack kind's (ATTACK_SOUNDS), by tower
 * id and then attack kind: a Mindspike's psionic shot, the Seer's Lantern's eye opening as its
 * beam locks (the Prism's lock is the `beam` kind's own), and Magnet Crane's grab (the Crane's
 * only attack). The binder looks the firing tower's id up from its uid (EnemyLookup `tower`).
 */
export const TOWER_SOUNDS: Readonly<
  Partial<
    Record<
      string,
      Partial<Record<string, { readonly fire: SfxId | null; readonly land: SfxId | null }>>
    >
  >
> = {
  mindspike: { hitscan: { fire: 'mindspike_shot', land: null } },
  lantern: { beam: { fire: 'lantern_lock', land: null } },
  crane: { hitscan: { fire: 'magnet_grab', land: null } },
};

/**
 * Beams (T504; design/towers.md § 2): the lock is ATTACK_SOUNDS `beam` (or the tower's own), once
 * per lock. While any tower beams, one sound plays however many beams (fieldSounds.ts): as the
 * strongest ramp climbs, `hum` every `everySec` of sim time, a semitone step higher for each
 * `maxPitch`-th of the climb (the top step only at the cap); once that ramp has capped, `bed` at
 * the top step every `bedEverySec`, slow swells that overlap into a held tone (R16: a Prism held
 * through a 12-minute map stays present, never a 2 Hz pulse). A ramp that starts over (a new
 * target) brings the climbing hum straight back. A beam ticks every 0.25 s, so its "wrong tool"
 * plinks (armor, or a hit that took nothing) sound once per lock, not once per tick: the first
 * tells the player, the rest would nag.
 */
export const BEAM_SOUNDS = {
  hum: 'beam_hum',
  everySec: 0.5,
  maxPitch: 5,
  bed: 'beam_bed',
  bedEverySec: 2.3,
} as const satisfies {
  readonly hum: SfxId;
  readonly everySec: number;
  readonly maxPitch: number;
  readonly bed: SfxId;
  readonly bedEverySec: number;
};

/**
 * Phasing (PhaseShift; T503, the Rift Moth): the flicker as the tell starts, the fall as it goes
 * Phased, the return, and the same fizzle as every interrupted tell (Stasis or Unnerved cut it
 * short; PULSE_SOUNDS), so an interrupt always sounds alike. Not placed: the Hollow's quiet keeps
 * its own sounds.
 */
export const PHASE_SOUNDS = {
  tell: 'phase_tell',
  in: 'phase_in',
  out: 'phase_out',
  interrupted: 'tell_fizzle',
} as const satisfies Readonly<Record<'tell' | 'in' | 'out' | 'interrupted', SfxId>>;

/**
 * A splitter's split by faction (after its death sound; SPLIT_SOUND's delay): the Hollow's
 * Fracture and Shard crack violet. A faction without a row plays SPLIT_SOUND (the Bunchling's
 * pop). The Hollow's quiet keeps the crack (HOLLOW_QUIET `keep`).
 */
export const FACTION_SPLIT_SOUNDS: Readonly<Partial<Record<EnemyFaction, SfxId>>> = {
  hollow: 'void_crack',
};

/**
 * The pivot's other sounds (T506; the Penitent's own are BOSS_SOUNDS): every hostile standing
 * down breathes out once (StoodDown; one voice for the faction), and a shield-broken boss's
 * shield coming back while a shard lives (ShieldReformed).
 */
export const PIVOT_SOUNDS = {
  standDown: 'stand_down',
  reformed: 'shield_reform',
} as const satisfies Readonly<Record<'standDown' | 'reformed', SfxId>>;

/**
 * The Escort (T305c): a refugee reaching the safe exit chirps (Pebble her own happy squeak), and
 * an enemy taking a sheltered one at the exit (RefugeeLost `exit`) sounds the Escort's alarm. A
 * refugee hushed on the road (`hushed`) is the hush's sound (Hushed), not this.
 */
export const ESCORT_SOUNDS = {
  evacuated: 'refugee_safe',
  pebble: 'pebble_safe',
  taken: 'refugee_taken',
} as const satisfies Readonly<Record<'evacuated' | 'pebble' | 'taken', SfxId>>;

/** Echo Spike's echo (EchoBurst), where it rings out. */
export const ECHO_SOUND = 'echo_burst' as const satisfies SfxId;

/**
 * Sundown (T505; maps.md § 5.1): `fall` as a wave's DarknessShift takes the dark deeper; while
 * `state.dark` is at least `airFrom`, the night's `air` every `airEverySec` of sim time at a
 * level of the dark (fieldSounds.ts); and the music sits back as the dark does, held under `duck`
 * at 1 − `duckDepth` × dark (in `duckStep` steps, easing over `duckFadeSec`), released as the map
 * ends. At full dark it's about −3 dB, gentler than the Hollow's duck, which wins where both hold.
 */
export const DARK_SOUNDS = {
  fall: 'dusk_fall',
  air: 'night_air',
  airEverySec: 2.5,
  airFrom: 0.25,
  duck: 'dark',
  duckDepth: 0.3,
  duckStep: 0.05,
  duckFadeSec: 1.5,
} as const satisfies {
  readonly fall: SfxId;
  readonly air: SfxId;
  readonly airEverySec: number;
  readonly airFrom: number;
  readonly duck: string;
  readonly duckDepth: number;
  readonly duckStep: number;
  readonly duckFadeSec: number;
};

/** A tower's income (TowerIncome; T408): a coin, a kill's a few steps brighter than a wave's. */
export const INCOME_SOUNDS = { coin: 'income_coin', killPitch: 3 } as const satisfies {
  readonly coin: SfxId;
  readonly killPitch: number;
};

/**
 * A map meter's alarm (T501h): the core's low-integrity klaxon also sounds, once per crossing, as
 * a Protect map's asset enters its `critical` band (sim `assetDamage`: half the meter, one rig of
 * two) and as an Escort's losses reach its low mark (story/meters.ts `escortLow`, the meter's own
 * alarm). One alarm voice means one thing: your meter is low.
 */
export const METER_ALARM = 'low_integrity' as const satisfies SfxId;
