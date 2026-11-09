// Commands: every player action, as plain serializable data (architecture.md § Commands).
// Every M2 command is declared and live (`specialize` in specialize.ts, fire control in
// fireControl.ts). M3's `clear` is declared (T300a) and rejected `notImplemented` until T304b
// (systems/wreckage.ts); interact and scriptInput arrive with their maps (M4). `notImplemented` is
// kept for handlers declared ahead of their task.
import type { GridPos, IdSpace, LiveIds, TargetPriority } from '../content/types.ts';
import { assertNever } from '../shared/types.ts';

export type Command<K extends IdSpace = LiveIds> =
  | { readonly type: 'build'; readonly tile: GridPos; readonly tower: K['tower'] }
  /** To the next tier (1–3). */
  | { readonly type: 'upgrade'; readonly towerUid: number }
  /** Tier 3 → tier 4, choosing one of the tower's two specializations (specialize.ts). */
  | { readonly type: 'specialize'; readonly towerUid: number; readonly spec: SpecChoice }
  | { readonly type: 'sell'; readonly towerUid: number }
  | { readonly type: 'targeting'; readonly towerUid: number; readonly mode: TargetPriority }
  /**
   * Plain Hold Fire (core-loop.md § 2.7): a tower uid, or `'all'` (every tower, and towers built
   * while it's on start with it on). A holding tower keeps its auras and links (T206a).
   */
  | { readonly type: 'holdFire'; readonly target: number | 'all'; readonly on: boolean }
  /**
   * The spare-runners targeting filter (core-loop.md § 2.7): per tower, or `'all'` (inherited by
   * towers built while it's on). The tower never picks a SPARE_TAGS unit as its target (T206a).
   */
  | { readonly type: 'spareRunners'; readonly target: number | 'all'; readonly on: boolean }
  /**
   * Send the salvage drone to a wreckage tile (design/maps.md § 3): it joins the drone's queue, and
   * the tile clears 6 s of sim time after it reaches the head (systems/wreckage.ts, T304b).
   */
  | { readonly type: 'clear'; readonly tile: GridPos }
  /** Commander abilities: slot 1 the Technician's, slot 2 the companion's (T207a). */
  | { readonly type: 'ability'; readonly slot: 1 | 2; readonly target?: GridPos }
  /** Call the next wave early (or start wave 1). */
  | { readonly type: 'callWave' };
export type CommandType = Command['type'];
/** A tower's tier-4 specialization: `TowerDef.specs.a` or `.b`. */
export type SpecChoice = 'a' | 'b';

/** Why a command was rejected (the `CommandRejected` event), so the UI can explain. */
export type RejectReason =
  /** The map is won or lost. */
  | 'mapEnded'
  | 'notInLoadout'
  /** Held back until its unlock wave (towerUnlockWave). */
  | 'towerLocked'
  /** Not an integer tile on the map. */
  | 'invalidTile'
  /** Path, decor, wreckage, spawn, or core. */
  | 'notBuildable'
  | 'tileOccupied'
  | 'cantAfford'
  /** No live tower has that uid. */
  | 'noSuchTower'
  | 'maxTier'
  /** The tower picks no target (pulse and support towers). */
  | 'noTargeting'
  /** callWave while the current wave is still spawning (no countdown is running). */
  | 'waveInProgress'
  /** callWave after the last wave has started. */
  | 'noWavesLeft'
  /** No ability is equipped in that slot. */
  | 'noAbility'
  | 'abilityOnCooldown'
  /** The ability's target is missing or off the map. */
  | 'invalidTarget'
  /** specialize: the tower's specs aren't in `SimConfig.specsUnlocked`. */
  | 'specLocked'
  /** specialize: the tower has no tier-4 specializations. */
  | 'noSpecs'
  /** specialize: the tower is below tier 3. */
  | 'needsTier3'
  /** specialize: the tower is already tier 4. */
  | 'alreadySpecialized'
  /** The handler belongs to a later task (named where the command is handled). */
  | 'notImplemented';

/** One applied command, with the tick it applied at. The log plus the seed replays a run. */
export interface CommandLogEntry<K extends IdSpace = LiveIds> {
  readonly tick: number;
  readonly cmd: Command<K>;
}

/** A deep copy, so a caller reusing or mutating its command object can't change the queue. */
export function copyCommand<K extends IdSpace>(cmd: Command<K>): Command<K> {
  switch (cmd.type) {
    case 'build':
      return { type: 'build', tile: [cmd.tile[0], cmd.tile[1]], tower: cmd.tower };
    case 'upgrade':
      return { type: 'upgrade', towerUid: cmd.towerUid };
    case 'specialize':
      return { type: 'specialize', towerUid: cmd.towerUid, spec: cmd.spec };
    case 'holdFire':
      return { type: 'holdFire', target: cmd.target, on: cmd.on };
    case 'spareRunners':
      return { type: 'spareRunners', target: cmd.target, on: cmd.on };
    case 'sell':
      return { type: 'sell', towerUid: cmd.towerUid };
    case 'targeting':
      return { type: 'targeting', towerUid: cmd.towerUid, mode: cmd.mode };
    case 'ability':
      return cmd.target === undefined
        ? { type: 'ability', slot: cmd.slot }
        : { type: 'ability', slot: cmd.slot, target: [cmd.target[0], cmd.target[1]] };
    case 'callWave':
      return { type: 'callWave' };
    case 'clear':
      return { type: 'clear', tile: [cmd.tile[0], cmd.tile[1]] };
    default:
      return assertNever(cmd);
  }
}
