// Events: the sim's output (architecture.md § Events). Systems push them into `state.events`
// during a tick; the host drains them after each frame. Systems never read events: inside the
// sim, systems communicate through state. This is the M1 subset; each event's owning task may
// add payload fields.
import type { AttackKind, GridPos, IdSpace, LiveIds, RouteId, SpriteId } from '../content/types.ts';
import type { Command, RejectReason } from './commands.ts';

/**
 * Who dealt a hit (the damage pipeline's `source`, sim/combat/damage.ts): a tower by uid, or a
 * commander ability by slot. EnemyDied names the killer with it.
 */
export type DamageSource =
  | { readonly kind: 'tower'; readonly uid: number }
  | { readonly kind: 'ability'; readonly slot: 1 | 2 };

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
      /** The credits the kill paid (already credited): the bounty, 0 for younglings, 1 if fleeing. */
      readonly bounty: number;
      readonly killer: DamageSource;
      /** Where it died, in tiles. */
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: 'EnemyLeaked';
      readonly uid: number;
      readonly enemy: K['enemy'];
      /**
       * The core integrity this leak actually cost: the enemy's `leak`, 0 for a fleeing unit, and
       * never more than the integrity that was left.
       */
      readonly leak: number;
    }
  | {
      /**
       * A tower attacked: once per shot or pulse. `uid` is the projectile's (lobbed shells); 0
       * for attacks with no projectile entity (hitscan lands the same tick, a pulse hits around
       * the tower). From (x, y) at (targetX, targetY): the target's position, a shell's aim
       * point, or the tower itself for a pulse. Tiles.
       */
      readonly type: 'ProjectileFired';
      readonly uid: number;
      readonly towerUid: number;
      readonly kind: AttackKind;
      /** The primary target; 0 for a pulse. */
      readonly targetUid: number;
      readonly x: number;
      readonly y: number;
      readonly targetX: number;
      readonly targetY: number;
      /** The projectile's sprite (the firing tier's, fixed at fire time); null with none. */
      readonly sprite: SpriteId | null;
      /** A lobbed shell's flight time in ticks (it lands that many ticks later); else 0. */
      readonly flightTicks: number;
    }
  | {
      /**
       * An attack landed: a hitscan shot (same tick as ProjectileFired), a shell's impact, or a
       * pulse. `uid` as in ProjectileFired. (x, y) is the impact point in tiles; `hits` counts
       * the enemies it damaged (0: a shell that landed on nothing).
       */
      readonly type: 'ProjectileHit';
      readonly uid: number;
      readonly towerUid: number;
      readonly x: number;
      readonly y: number;
      readonly hits: number;
    }
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
  | {
      /** Wave `wave` began spawning. `early`: called during its countdown, paying `bonus`. */
      readonly type: 'WaveStarted';
      readonly wave: number;
      readonly early: boolean;
      /** The early-call bonus credited (core-loop.md § 2.4); 0 when not called early. */
      readonly bonus: number;
    }
  | {
      /**
       * Wave `wave` resolved: every enemy in it died or leaked (core-loop.md § 2.1). Waves can
       * overlap, so they can resolve out of order. `bonus` is the clear bonus credited.
       */
      readonly type: 'WaveCleared';
      readonly wave: number;
      readonly bonus: number;
    }
  | {
      /** A wave-phase trigger is reached: wave `wave`'s build-phase countdown began (W1: setup). */
      readonly type: 'CountdownStarted';
      readonly wave: number;
      /** The countdown's length in ticks; 0 for wave 1 (the setup phase has no countdown). */
      readonly ticks: number;
    }
  /** A map-script cue (story binds it to a scene or bark). */
  | { readonly type: 'ScriptCue'; readonly cueId: string }
  | {
      readonly type: 'AbilityUsed';
      readonly slot: 1 | 2;
      /**
       * The strike zone's uid (render draws its reticle until the zone resolves); 0 when the
       * ability makes no zone.
       */
      readonly uid: number;
      readonly ability: K['ability'];
      readonly target: GridPos | null;
    }
  | { readonly type: 'MapWon' }
  | { readonly type: 'MapLost' }
  | { readonly type: 'CommandRejected'; readonly cmd: Command<K>; readonly reason: RejectReason };
export type SimEventType = SimEvent['type'];
