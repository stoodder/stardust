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
  // Capacitor Bank's discharge (T407b, T450): its crack and thump; the charge's hum climbs to it
  // (CHARGE_SOUNDS, fieldSounds.ts).
  charge: { fire: 'capacitor_discharge', land: null },
  // The Harpoon's Skewer (T408, T550): its harpoon tearing down the line.
  line: { fire: 'skewer_shot', land: null },
  // A beam locking a target (T504, T550; ProjectileFired kind 'beam', once per lock, not per beam
  // tick): the Prism's glass "ting-ting". While it holds, the beam hums (BEAM_SOUNDS).
  beam: { fire: 'prism_lock', land: null },
  // The Scuttle Den (T604) fires no shot: its swarmlings latch (SwarmLatch: their chitter and
  // bite, SWARM_SOUNDS in eventTablesAct3.ts). The row keeps the table whole.
  spawner: { fire: null, land: null },
  // The Sproing Pad (T704) fires no shot either: its leapers bonk (LeaperBonk: LEAPER_SOUNDS'
  // boing, eventTablesAct3b.ts).
  leaper: { fire: null, land: null },
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

/**
 * Each enemy's death pitch (semitones), whatever its death sound (a pop, a sad squeak, a shatter,
 * an unravel; eventTablesAct2.ts): small and quick is high, big and slow is low.
 */
export const ENEMY_POP_PITCH: Readonly<Partial<Record<string, number>>> = {
  nibbler: 0,
  zoomer: 4,
  chonk: -6,
  hauler: -9,
  puffwing: 7,
  bunchling: -3,
  digger: -2,
  elder: -8,
  mote: 9,
  glimmer: 5,
  weft_warden: -5,
  lightwing: 8,
  // M5's units (T550): their faction's death sound at a size's pitch.
  veilwalker: 3,
  blinkstrider: 2,
  cantor: -4,
  glimmer_shard: 6,
  fracture: -4,
  fracture_shard: 4,
  riftmoth: 6,
  // M6's units (T650): pitched by size like the rest (Everglow's shut down, enemies.md § 8; the
  // Hollow's die silent under Act III's dials, and unravel at this pitch under any other's).
  maw: -6,
  undertow: -5,
  compliance: 1,
  expediter: -1,
  // M7's units (T750): Everglow Security's shut down at a size's pitch (the Liability lowest);
  // the Silencer and the Gathering Maw are Hollow (silent in Act III, unravelling at this pitch
  // under any other act's dials).
  silencer: -4,
  associate: 0,
  liability: -8,
  gunship: -3,
  blackbudget: 2,
  auditor: -2,
  gathering_maw: -10,
  gathering_maw_part: -6,
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
 * (BossEnded: the retreat, then the `endCue` sting). Bosses without a row use DEFAULT_BOSS_SOUNDS.
 * Its pulse and blink are the Aelari's (eventTablesAct2.ts).
 */
export interface BossSounds {
  readonly arrive: SfxId;
  readonly phase: SfxId;
  readonly spawnTell: SfxId | null;
  readonly spawn: SfxId | null;
  readonly end: SfxId;
  /** The sting after `end`, or null for an ending that stays hushed (the Penitent's pivot). */
  readonly endCue: CueId | null;
  /**
   * A later phase's own sound in place of `phase`, by phase number (null: silent, when the
   * phase's own event sounds it: the Maw's merge, the platform's jettison).
   */
  readonly phases?: Readonly<Partial<Record<number, SfxId | null>>>;
  /**
   * A boss beaten with no BossEnded (the Gathering Maw: its merged body dies, enemies.md § 6.1):
   * the sting its death plays (EnemyDied of this enemy id), unless the map has already ended.
   */
  readonly beaten?: CueId;
}
/**
 * The default ending's sting: "Everglow Bright" triumphant, stopping a step short of home (Act
 * I's held breath: the Quiet Wave follows; act1.md § A1M5).
 */
export const DEFAULT_BOSS_SOUNDS: BossSounds = {
  arrive: 'boss_arrive',
  phase: 'boss_phase',
  spawnTell: null,
  spawn: null,
  end: 'boss_retreat',
  endCue: 'boss_sting',
};
export const BOSS_SOUNDS: Readonly<Partial<Record<string, BossSounds>>> = {
  chitterbloom: { ...DEFAULT_BOSS_SOUNDS, spawnTell: 'sneeze_tell', spawn: 'sneeze' },
  // Glass, not a tuba (T450): she withdraws to the fanfare's minor turn, `witch_sting`.
  glass_witch: {
    arrive: 'witch_arrive',
    phase: 'witch_phase',
    spawnTell: null,
    spawn: null,
    end: 'witch_retreat',
    endCue: 'witch_sting',
  },
  // The Penitent (T550): the Witch's chord an octave down, its shield bursting into shards at
  // phase 2 (the shield-broken phase), and its only ending, the pivot, a hushed kneel with no
  // sting (the pivot's cue speaks over it; sfx/act2b.ts).
  sunderglass_penitent: {
    arrive: 'penitent_arrive',
    phase: 'penitent_break',
    spawnTell: null,
    spawn: null,
    end: 'penitent_kneel',
    endCue: null,
  },
  // "Shareholder Value" (T750; sfx/act3b.ts): hydraulics and Sterling's sparkle on its PA as it
  // arrives; the hangar door grinding open through its launch's tell, and the drones whooshing
  // out; Hostile Takeover arming (phase 2, the lens and the PA's bing-bong); phase 3 is the
  // jettison's own (Jettisoned, TAKEOVER_SOUNDS); driven off, its engines limp away and the PA
  // stutters its chime in a panic (`pa_frantic`).
  shareholder_value: {
    arrive: 'sv_arrive',
    phase: 'sv_takeover',
    spawnTell: 'sv_hangar',
    spawn: 'sv_launch',
    end: 'sv_retreat',
    endCue: 'pa_frantic',
    phases: { 3: null },
  },
  // The Gathering Maw (T750): three wrong voices swelling; phase 2 (the split's telegraph) strains
  // them apart, BossSplit tears them (BOSS_SPLIT_SOUNDS) and phase 3's merge slides them back
  // (BossMerged sounds it). It ends with no BossEnded: its merged body's death plays `beaten`,
  // the Hollow's voices finishing the phrase in tune. (`end` is never sent.)
  gathering_maw: {
    arrive: 'gmaw_arrive',
    phase: 'gmaw_strain',
    spawnTell: null,
    spawn: null,
    end: 'gmaw_strain',
    endCue: null,
    phases: { 3: null },
    beaten: 'gmaw_beaten',
  },
  // Its parts are born mid-fight (no BossPhase of their own); they die silent, the Hollow's way.
  gathering_maw_part: {
    arrive: 'gmaw_arrive',
    phase: 'gmaw_strain',
    spawnTell: null,
    spawn: null,
    end: 'gmaw_strain',
    endCue: null,
  },
  // The Unsung (T850; sfx/fin.ts): many wrong voices rising from the Halls humming G–C–E (phase
  // 1, the gather); its split (phase 2) and its rising again (phase 3) are BossSplit's and
  // BossRisen's (eventTablesFin.ts BOSS_MOMENT_SOUNDS); phase 4, the Song, its voices bending
  // toward the tune; laid to rest, they slide into a C major chord. No sting: Dawn's music and
  // the light (DawnBroke) follow it.
  unsung: {
    arrive: 'unsung_arrive',
    phase: 'unsung_song',
    spawnTell: null,
    spawn: null,
    end: 'unsung_rest',
    endCue: null,
    phases: { 2: null, 3: null },
  },
  // Its split's parts (T808): born mid-fight with no BossPhase; they keep the Gathering Maw's
  // parts' voices (a part laid to rest rings the song's chime, eventTablesFin.ts).
  unsung_part: {
    arrive: 'gmaw_arrive',
    phase: 'gmaw_strain',
    spawnTell: null,
    spawn: null,
    end: 'gmaw_strain',
    endCue: null,
  },
};

/** A boss's sounds by enemy id. */
export function bossSounds(enemy: string): BossSounds {
  return (
    (Object.hasOwn(BOSS_SOUNDS, enemy) ? BOSS_SOUNDS[enemy] : undefined) ?? DEFAULT_BOSS_SOUNDS
  );
}

/**
 * Sounds that loop while a kind of enemy is on the field (fieldSounds.ts), every `everySec` of
 * sim time while one is (one voice however many): a Puffwing flock's wingbeats (subtle); an
 * Aelari formation's faint glass hum; and the Hollow humming the jingle wrong over the music's
 * steady duck (HOLLOW_DUCK; bible §8; the recipe's gap and single voice keep a mixed wave to one
 * hum at a time).
 */
export const ENEMY_LOOPS: Readonly<
  Partial<Record<string, { readonly id: SfxId; readonly everySec: number }>>
> = {
  puffwing: { id: 'wing_flap', everySec: 0.45 },
  glimmer: { id: 'aelari_hum', everySec: 1.8 },
  weft_warden: { id: 'aelari_hum', everySec: 1.8 },
  lightwing: { id: 'aelari_hum', everySec: 1.8 },
  mote: { id: 'hollow_hum', everySec: 9 },
  // M5's (T550): the Cantor sings; the uncloaked Aelari hum (a cloaked one's tell is its
  // footsteps, CLOAK_SOUNDS); the Hollow's new units hum the jingle wrong like the Mote.
  cantor: { id: 'cantor_song', everySec: 2.4 },
  blinkstrider: { id: 'aelari_hum', everySec: 1.8 },
  fracture: { id: 'hollow_hum', everySec: 9 },
  fracture_shard: { id: 'hollow_hum', everySec: 9 },
  riftmoth: { id: 'hollow_hum', everySec: 9 },
  // M6's (T650): the Hollow's hum the jingle wrong like the Mote; Everglow's machines walk on
  // servos, and the Expediter's haste aura ticks like a metronome, so a hasted rush is heard.
  maw: { id: 'hollow_hum', everySec: 9 },
  undertow: { id: 'hollow_hum', everySec: 9 },
  compliance: { id: 'compliance_step', everySec: 0.8 },
  expediter: { id: 'haste_tick', everySec: 0.5 },
  // M7's (T750): the Silencer and the Gathering Maw hum the jingle wrong like every Hollow unit;
  // Everglow Security's Liability stomps on hydraulics, the Gunship's rotor chops (one voice for
  // the flight), and the Maintenance Associate's repair aura hums with a small rising chime, so
  // the healer can be found by ear. (A hidden Black Budget shimmers: ENEMY_CLOAK_SOUNDS.)
  silencer: { id: 'hollow_hum', everySec: 9 },
  gathering_maw: { id: 'hollow_hum', everySec: 9 },
  gathering_maw_part: { id: 'hollow_hum', everySec: 9 },
  // The finale's (T850): the Unsung and its parts hum the jingle wrong like every Hollow unit.
  unsung: { id: 'hollow_hum', everySec: 9 },
  unsung_part: { id: 'hollow_hum', everySec: 9 },
  liability: { id: 'liability_stomp', everySec: 1.1 },
  gunship: { id: 'gunship_rotor', everySec: 0.4 },
  associate: { id: 'associate_hum', everySec: 1.6 },
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
  // A wide sonar ping as the zone goes down (each unit it reveals pings too, CLOAK_SOUNDS).
  scanner_sweep: { cast: 'scan_ping', land: [] },
  // Ves'thara's Stillness (T550): her held breath as it's cast; the freeze locks in on its
  // StasisArea (STASIS_SOUNDS' lock, as Flash Freeze's does).
  stillness: { cast: 'stillness_cast', land: [] },
  // Bramble's Underfoot (T650): the warren digging the trap in, three quick chitters; each unit
  // it catches snaps it (TrapSprung, TRAP_SOUND in eventTablesAct3.ts).
  underfoot: { cast: 'underfoot_cast', land: [] },
  // System Reboot (T750): a CRT going dark and booting with a chime, every jam cleared at once.
  system_reboot: { cast: 'reboot', land: [] },
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
