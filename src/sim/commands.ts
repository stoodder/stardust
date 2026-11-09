// Commands: every player action, as plain serializable data (architecture.md § Commands).
// This is the M1 subset; specialize, holdFire, spareRunners, clear, interact, and scriptInput
// arrive with their tasks (T202, T206, M3).
import type { GridPos, IdSpace, LiveIds, TargetPriority } from '../content/types.ts';
import { assertNever } from '../shared/types.ts';

export type Command<K extends IdSpace = LiveIds> =
  | { readonly type: 'build'; readonly tile: GridPos; readonly tower: K['tower'] }
  /** To the next tier. */
  | { readonly type: 'upgrade'; readonly towerUid: number }
  | { readonly type: 'sell'; readonly towerUid: number }
  | { readonly type: 'targeting'; readonly towerUid: number; readonly mode: TargetPriority }
  /** Commander abilities. M1 has slot 1 only (Orbital Strike); slot 2 is the companion (T207). */
  | { readonly type: 'ability'; readonly slot: 1 | 2; readonly target?: GridPos }
  /** Call the next wave early (or start wave 1). */
  | { readonly type: 'callWave' };
export type CommandType = Command['type'];

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
    default:
      return assertNever(cmd);
  }
}
