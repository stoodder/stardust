// Act II's sound tables (T450; pure data, read by eventSounds.ts and fieldSounds.ts like
// eventTables.ts): how each faction dies, the Aelari's shields, pulses and blinks, the hush, the
// Hollow's quiet, detection, Stasis, the M4 tower specs, the asset, checkpoints, and the Tidybots.
// A new Act II-style unit gets its sound by adding a row here, not a branch.
import type { EnemyFaction } from '../content/types.ts';
import type { SkitterkinDeath } from '../content/presentation.ts';
import type { SfxId } from './sfx/index.ts';

/**
 * How a Skitterkin dies, by the map's `skitterkinDeath` dial (design/enemies.md § 8; core-loop.md
 * § 6.7): Act I's confetti pop; Act II's muffled pop and small, sad squeak; Act III's still body
 * and the finale's none make no sound (Act III's is M6's to confirm).
 */
export const SKITTERKIN_DEATH_SOUNDS: Readonly<Record<SkitterkinDeath, SfxId | null>> = {
  confetti: 'enemy_pop',
  sad_squeak: 'sad_squeak',
  linger: null,
  none: null,
};

/**
 * How the other factions die (enemies.md § 8), whatever the Skitterkin dial: the Aelari shatter
 * into chiming shards, the Hollow unravel into static. A faction without a row pops (Everglow's
 * own, later). Act III's Hollow die with no sound (§ 8): M6 silences them with its maps.
 */
export const FACTION_DEATH_SOUNDS: Readonly<Partial<Record<EnemyFaction, SfxId>>> = {
  aelari: 'aelari_shatter',
  hollow: 'hollow_unravel',
  // Everglow Security's clean shutdown (T600a stub row: the plain pop until T650 draws its own).
  everglow: 'enemy_pop',
};

/**
 * Shields (ShieldHit; D106): a hit landing on one ripples, a hit breaking one shatters. A hit the
 * shield took whole plays the ripple instead of the nothing-plink (`invuln_plink` stays for a boss
 * between phases): an Energy hit stripping a shield isn't the wrong tool.
 */
export const SHIELD_SOUNDS = {
  ripple: 'shield_ripple',
  shatter: 'shield_shatter',
} as const satisfies {
  readonly ripple: SfxId;
  readonly shatter: SfxId;
};

/**
 * A shield pulse by its phase (ShieldPulse; D106): the swelling tell, the ring as it fires, and
 * the fizzle when Stasis cuts the tell short. A blink the same way (BlinkTell, Blinked,
 * BlinkInterrupted; D110): one fizzle for every interrupted tell, so Stasis reads as one answer.
 */
export const PULSE_SOUNDS = {
  tell: 'pulse_tell',
  fired: 'pulse_fire',
  interrupted: 'tell_fizzle',
} as const satisfies Readonly<Record<'tell' | 'fired' | 'interrupted', SfxId>>;
export const BLINK_SOUNDS = {
  tell: 'blink_tell',
  blinked: 'blink',
  interrupted: 'tell_fizzle',
} as const satisfies Readonly<Record<'tell' | 'blinked' | 'interrupted', SfxId>>;

/**
 * The hush (D109): the breath drawn in as its tell starts (HushStarted), the hush landing
 * (Hushed; TurnedHeavy follows silently), and a Skittish runner's panic squeak as it bolts
 * (SkittishBolt).
 */
export const HUSH_SOUNDS = {
  tell: 'hush_tell',
  hushed: 'hushed',
  bolt: 'panic_squeak',
} as const satisfies Readonly<Record<'tell' | 'hushed' | 'bolt', SfxId>>;

/**
 * The Hollow's quiet (design/enemies.md § 5.4: "wrong in every channel"; story/bible.md: the
 * Quiet): a low-priority sound (≤ `maxPriority`: a shot, a hit, a pop) placed within `radiusTiles`
 * of a live Hollow unit is dropped, so the small sounds around one fall away. Its own sounds
 * (`keep`) still play. Alarms, speech, and the moments (priority ≥ 2) are never dropped.
 */
export const HOLLOW_QUIET = {
  faction: 'hollow',
  radiusTiles: 1.5,
  maxPriority: 1,
  keep: ['hollow_unravel', 'void_crack'],
} as const satisfies {
  readonly faction: EnemyFaction;
  readonly radiusTiles: number;
  readonly maxPriority: number;
  readonly keep: readonly SfxId[];
};

/**
 * The Hollow's duck (D134, R7): while any Hollow unit is on the field (fieldSounds' `hollowLive`,
 * the same units that keep the quiet), the music sits steadily `level` down (about −4 dB), easing
 * there and back over `fadeSec`: one long held breath under the hum, never a dip per hum.
 */
export const HOLLOW_DUCK = {
  key: 'hollow',
  level: 0.63,
  fadeSec: 0.4,
} as const satisfies {
  readonly key: string;
  readonly level: number;
  readonly fadeSec: number;
};

/**
 * Detection (T406): a hidden cloaked unit's footsteps, every `everySec` of sim time while one
 * walks (one voice however many; design/enemies.md § 3 "footsteps sound"), and the ping as one is
 * Revealed (Revealed; slipping back into the cloak, Cloaked, is silent).
 */
export const CLOAK_SOUNDS = {
  steps: 'cloak_steps',
  everySec: 0.55,
  reveal: 'reveal_ping',
} as const satisfies {
  readonly steps: SfxId;
  readonly everySec: number;
  readonly reveal: SfxId;
};

/**
 * Flash Freeze's burst (PulseBurst; D112): its frost, then, when it froze anything (`frozen` > 0),
 * Stasis locking in `lockAfterSec` later.
 */
export const STASIS_SOUNDS = {
  burst: 'frost_burst',
  lock: 'stasis_lock',
  lockAfterSec: 0.05,
} as const satisfies { readonly burst: SfxId; readonly lock: SfxId; readonly lockAfterSec: number };

/**
 * Shots whose projectile sprite has its own sound, ahead of their attack kind's (ATTACK_SOUNDS):
 * the Seeker Swarm's volley (a `projectile` attack with `homing`, D120). The four missiles of a
 * volley fire in one tick; `seeker_launch`'s gap makes them one launch.
 */
export const PROJECTILE_SOUNDS: Readonly<
  Partial<Record<string, { readonly fire: SfxId | null; readonly land: SfxId | null }>>
> = {
  'projectile.skyhook_seeker': { fire: 'seeker_launch', land: 'flak_burst' },
};

/**
 * A charge attack charging (the Capacitor Bank, D120; fieldSounds.ts reads `chargeTicks`): the
 * hum plays as the charge starts and at each of its `steps` (quarters), `pitchPerStep` semitones
 * higher each time, so the whine climbs to the discharge (ATTACK_SOUNDS `charge`). A charge that
 * fizzles (its target escaped, or nothing is left in range) or is vented (Hold Fire) collapses
 * with `fizzle` (T501h), once it had reached `fizzleFrom` of its full charge: a blip of a charge
 * that barely started says nothing.
 */
export const CHARGE_SOUNDS = {
  hum: 'capacitor_hum',
  steps: 4,
  pitchPerStep: 3,
  fizzle: 'charge_fizzle',
  fizzleFrom: 0.25,
} as const satisfies {
  readonly hum: SfxId;
  readonly steps: number;
  readonly pitchPerStep: number;
  readonly fizzle: SfxId;
  readonly fizzleFrom: number;
};

/** A leak hitting the asset (AssetHit; D111); the asset lost (AssetLost) is the loss cue's. */
export const ASSET_HIT_SOUND = 'asset_hit' as const satisfies SfxId;

/** A retry checkpoint taken (CheckpointReached; D118), with the HUD's "Checkpoint" cue. */
export const CHECKPOINT_SOUND = 'checkpoint' as const satisfies SfxId;

/**
 * A Tidybot's chime as it finishes its sweep (D126; app/tidybotChimes.ts times it from render's
 * sweep plan): each drone of a sweep `pitchPerBot` semitones above the one before, a little
 * rising round.
 */
export const TIDYBOT_SOUNDS = { chime: 'tidybot_chime', pitchPerBot: 3 } as const satisfies {
  readonly chime: SfxId;
  readonly pitchPerBot: number;
};
