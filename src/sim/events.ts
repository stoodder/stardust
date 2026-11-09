// Events: the sim's output (architecture.md § Events). Systems push them into `state.events`
// during a tick; the host drains them after each frame. Systems never read events: inside the
// sim, systems communicate through state. Every M2 event is declared; the ones whose task hasn't
// landed are never emitted yet (each names its task). An event's owning task may add payload
// fields.
import type {
  AllyKind,
  AttackKind,
  GridPos,
  IdSpace,
  LiveIds,
  MedalKind,
  RouteId,
  SpriteId,
} from '../content/types.ts';
import type { Command, RejectReason, SpecChoice } from './commands.ts';

/**
 * Who dealt a hit (the damage pipeline's `source`, sim/combat/damage.ts): a tower by uid, a
 * commander ability by slot, or an ally (Bricks, militia; T207a) by uid. EnemyDied names the
 * killer with it.
 */
export type DamageSource =
  | { readonly kind: 'tower'; readonly uid: number }
  | { readonly kind: 'ability'; readonly slot: 1 | 2 }
  | { readonly kind: 'ally'; readonly uid: number };

/** The three medals every campaign map has (design/progression.md § 3; content/types.ts). */
export type { MedalKind };

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
      /**
       * A carrier's sack burst as it died (the Brood Hauler, `carrier` in its content; sim/
       * carrier.ts), right after its EnemyDied: `young` tiny shapes scurry back along `route`
       * from route distance `dist` toward its spawn. Render-only: they're non-hostile,
       * untargetable, and leak nothing, so the sim keeps no entity for them.
       */
      readonly type: 'SackBurst';
      readonly uid: number;
      readonly enemy: K['enemy'];
      /** Where it burst, in tiles. */
      readonly x: number;
      readonly y: number;
      readonly route: RouteId;
      /** The carrier's distance along `route` when it died, in tiles. */
      readonly dist: number;
      readonly young: number;
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
      /**
       * The area the attack covers, from the firing tier (tiles): a lobbed shell's splash radius,
       * a pulse's range; 0 for single-target attacks. Lets the renderer size its rings without
       * looking the tower up (it may be sold by the time a shell lands).
       */
      readonly radiusTiles: number;
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
      /**
       * The HP it took, summed over its victims (applyDamage's return: shield-absorbed damage and
       * overkill don't count). The emitter fills it in once the damage has landed, so the event
       * still precedes the EnemyDied events its hit causes. The harness's per-tower damage tally.
       */
      readonly damage: number;
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
  | {
      /** Tier 3 → tier 4 (T202b). */
      readonly type: 'TowerSpecialized';
      readonly uid: number;
      readonly spec: SpecChoice;
      readonly cost: number;
    }
  | {
      /** A holdFire command took effect (T206a). `target` as in the command. */
      readonly type: 'HoldFireChanged';
      readonly target: number | 'all';
      readonly on: boolean;
    }
  | {
      /** A spareRunners command took effect (T206a). `target` as in the command. */
      readonly type: 'SpareRunnersChanged';
      readonly target: number | 'all';
      readonly on: boolean;
    }
  /**
   * Story-facing: `stats.ticksSinceFiredAtSkitterkin` reached NOT_FIRING_TICKS (sim/fireControl.ts;
   * the "not firing" bark, core-loop.md § 6.3). Once per run.
   */
  | { readonly type: 'NotFiringAtSkitterkin' }
  | {
      /**
       * A synergy link became active between towers `a` and `b` (design/towers.md § 6; T202a).
       * `link` is a link id (content/links/).
       */
      readonly type: 'LinkFormed';
      readonly link: string;
      readonly a: number;
      readonly b: number;
    }
  | {
      /** An active link ended: a partner was sold or jammed (T202a). */
      readonly type: 'LinkBroken';
      readonly link: string;
      readonly a: number;
      readonly b: number;
    }
  | {
      /** An ally unit appeared (design/maps.md § 5.4; T207a). Position in tiles. */
      readonly type: 'AllySpawned';
      readonly uid: number;
      readonly kind: AllyKind;
      readonly x: number;
      readonly y: number;
    }
  | {
      /**
       * An ally attacked (Bricks's rivet cannon; T207a): from (x, y) at its target's position.
       * Its damage lands through the damage pipeline like a hitscan tower's.
       */
      readonly type: 'AllyAttacked';
      readonly uid: number;
      readonly targetUid: number;
      readonly x: number;
      readonly y: number;
      readonly targetX: number;
      readonly targetY: number;
    }
  /** An ally left the map (walked off, or its script removed it; T207a). */
  | { readonly type: 'AllyRemoved'; readonly uid: number }
  | {
      /**
       * A medal's status changed (T202c): `forfeited` the moment it can no longer be earned this
       * run (Perfect Core's first counted leak, an event condition broken), `earned` at victory.
       */
      readonly type: 'MedalProgress';
      readonly medal: MedalKind;
      readonly status: 'earned' | 'forfeited';
    }
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
