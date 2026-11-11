// Act III's sound tables (T650; pure data, read by eventSounds.ts, fieldSounds.ts, and
// app/audio.ts like eventTables.ts): the Gathering Maw, the rifts, the Undertow's burrow, the
// Scuttle Den's swarmlings, Underfoot's trap, the Stasis Bloom's pulse and Gravity Well, the
// revocation stamp, Bricks at the Gap, and the forced input (the SEAL). A new unit or tower of
// this kind gets its sound by adding a row here, not a branch.
import type { SfxId } from './sfx/index.ts';

/**
 * The Gathering Maw (enemies.md § 5.4; GatherTell, Gathered): the breath drawn in through its
 * tendril tell, and the swallow as it gathers. A refugee gathered is a loss: it also sounds the
 * hush landing (`hushed`: the squeak cut off and the thud, the music dipping with it), as a
 * refugee hushed on the road does.
 */
export const GATHER_SOUNDS = {
  tell: 'maw_tell',
  gathered: 'maw_gulp',
  refugee: 'hushed',
} as const satisfies Readonly<Record<'tell' | 'gathered' | 'refugee', SfxId>>;

/**
 * The rifts (maps.md § 4): a lane cracking a wave ahead (RiftOpening) and tearing open as its
 * wave starts (RiftOpened). One of each per wave however many lanes (the recipes' gaps).
 */
export const RIFT_SOUNDS = {
  opening: 'rift_crack',
  opened: 'rift_open',
} as const satisfies Readonly<Record<'opening' | 'opened', SfxId>>;

/**
 * Burrowing by enemy (fieldSounds.ts), ahead of BURROW_SOUNDS: a Hollow burrower (the Undertow)
 * sinks and rises like water closing, never the Digger's comic dig.
 */
export const ENEMY_BURROW_SOUNDS: Readonly<
  Partial<Record<string, { readonly dig: SfxId; readonly surface: SfxId }>>
> = {
  undertow: { dig: 'undertow_sink', surface: 'undertow_rise' },
};

/**
 * The Scuttle Den's swarmlings and Champions (towers.md § 8; SwarmLatch, SwarmHome): a chitter
 * and a bite as one latches on (letting go is silent), and the head-count chirp as each comes
 * home. The Den fires no shot of its own (ATTACK_SOUNDS `spawner` is silent).
 */
export const SWARM_SOUNDS = {
  latch: 'swarm_latch',
  home: 'swarm_home',
} as const satisfies Readonly<Record<'latch' | 'home', SfxId>>;

/** Underfoot's trap springing on a unit (TrapSprung); its cast is ABILITY_SOUNDS'. */
export const TRAP_SOUND = 'trap_snap' as const satisfies SfxId;

/**
 * A field or pulse tower's burst by tower id (PulseBurst), ahead of Flash Freeze's frost
 * (STASIS_SOUNDS `burst`): the Stasis Bloom's field rings a crystal chime. Stasis locking in is
 * the same for both (STASIS_SOUNDS `lock`).
 */
export const PULSE_TOWER_SOUNDS: Readonly<Partial<Record<string, SfxId>>> = {
  bloom: 'bloom_chime',
};

/** Gravity Well pulling a unit back along its road (PulledBack). */
export const PULL_SOUND = 'gravity_pull' as const satisfies SfxId;

/**
 * The revocation (towers.md § 9; TowerRevoked, AbilityRevoked): the LICENSE REVOKED stamp on each
 * tower as it folds away, one after another `staggerSec` apart (up to `maxStagger` steps, then
 * together), so a whole class revoked is heard stamped tower by tower; an equipped uplink revoked
 * ("UPLINK REVOKED") is stamped after them. The class and the modifier (ClassRevoked,
 * ModifierChanged) are silent: Sterling's lines and the stamps say it.
 */
export const REVOKE_SOUNDS = {
  stamp: 'revoke_stamp',
  staggerSec: 0.14,
  maxStagger: 6,
} as const satisfies {
  readonly stamp: SfxId;
  readonly staggerSec: number;
  readonly maxStagger: number;
};

/**
 * A blocker (Bricks at the Gap; maps.md § 5.4): a heavy shoulder check as he takes a unit on
 * (Blocked `on`). Releasing one, and his health stepping down (AllyHealthChanged), are silent:
 * the bar and QUILL's `cue_vitals` carry those.
 */
export const BLOCKER_SOUNDS = { brace: 'bricks_brace' } as const satisfies {
  readonly brace: SfxId;
};

/**
 * A forced single input (core-loop.md § 2.11) by its id: what its press sounds (ForcedInputResolved)
 * and the loops it cuts dead (app/audio.ts stops them first): A3M3's SEAL slams the door and stops
 * Bricks's hum. While an input waits (`state.pendingInput`), the music is held at `duck`, easing
 * there over `duckFadeSec`, so the hum is all there is.
 */
export const FORCED_INPUT_SOUNDS = {
  inputs: {
    seal: { press: 'door_seal', stops: ['door_hum'] },
  } as Readonly<
    Partial<Record<string, { readonly press: SfxId; readonly stops: readonly SfxId[] }>>
  >,
  duckKey: 'forced_input',
  duck: 0.12,
  duckFadeSec: 1.5,
} as const;
