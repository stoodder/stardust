// Events: the sim's output (architecture.md § Events). Systems push them into `state.events`
// during a tick; the host drains them after each frame. Systems never read events: inside the
// sim, systems communicate through state. This is the M1 subset; each event's owning task may
// add payload fields.
import type { GridPos, IdSpace, LiveIds, RouteId } from '../content/types.ts';
import type { Command, RejectReason } from './commands.ts';

export type SimEvent<K extends IdSpace = LiveIds> =
  | {
      readonly type: 'EnemySpawned';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly route: RouteId;
      readonly wave: number;
    }
  | {
      readonly type: 'EnemyDied';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly bounty: number;
    }
  | {
      readonly type: 'EnemyLeaked';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly leak: number;
    }
  | { readonly type: 'ProjectileFired'; readonly uid: number; readonly towerUid: number }
  | { readonly type: 'ProjectileHit'; readonly uid: number; readonly towerUid: number }
  | {
      readonly type: 'TowerBuilt';
      readonly uid: number;
      readonly tower: K['tower'];
      readonly tile: GridPos;
      readonly cost: number;
    }
  | {
      readonly type: 'TowerUpgraded';
      readonly uid: number;
      readonly tier: number;
      readonly cost: number;
    }
  | { readonly type: 'TowerSold'; readonly uid: number; readonly refund: number }
  | { readonly type: 'TowerClassUnlocked'; readonly tower: K['tower'] }
  | { readonly type: 'WaveStarted'; readonly wave: number; readonly early: boolean }
  | { readonly type: 'WaveCleared'; readonly wave: number }
  | {
      readonly type: 'AbilityUsed';
      readonly slot: 1 | 2;
      readonly ability: K['ability'];
      readonly target: GridPos | null;
    }
  | { readonly type: 'MapWon' }
  | { readonly type: 'MapLost' }
  | { readonly type: 'CommandRejected'; readonly cmd: Command<K>; readonly reason: RejectReason };
export type SimEventType = SimEvent['type'];
