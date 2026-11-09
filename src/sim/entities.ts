// Entity shapes, one pool each (architecture.md § Entity model). Every field is initialized in the
// blank, so objects stay monomorphic. Rules for every kind:
// - Positions are in tiles; tile (c, r) has its center at (c + 0.5, r + 0.5).
// - Entities refer to each other by uid (0 = none), never by object reference, so sim state has
//   no cycles and hash() can walk it. Compiled definitions are held by direct reference.
// - The task that implements a kind's behavior adds the fields it needs here (T103 movement,
//   T105a combat, T105b economy, T113 abilities).
import type {
  CompiledEnemyDef,
  CompiledRoute,
  CompiledTier,
  CompiledTowerDef,
} from '../content/compiled.ts';
import type { DamageType, TargetPriority, WaveTag } from '../content/types.ts';
import type { PoolEntity } from './pool.ts';

const NO_TAGS: readonly WaveTag[] = Object.freeze([]);

export interface Tower extends PoolEntity {
  def: CompiledTowerDef | null;
  /** 1–3 (4 once specs land, T202). */
  tier: number;
  /** The current tier, resolved once (`def.tiers[tier - 1]`), so hot loops don't index. */
  tierDef: CompiledTier | null;
  col: number;
  row: number;
  /** Tile center. */
  x: number;
  y: number;
  /** null for towers that pick no target (pulse and support). */
  priority: TargetPriority | null;
  /** Ticks until the tower may fire again. */
  cooldownTicks: number;
  targetUid: number;
  /** Credits paid for the build and every upgrade (the sell value's base, T105b). */
  invested: number;
  builtTick: number;
  /** −1 until the tower first fires (misclick-grace refund, design/core-loop.md §2.3). */
  firstFiredTick: number;
}

export const TOWER_BLANK: Readonly<Tower> = Object.freeze({
  slot: 0,
  uid: 0,
  alive: false,
  def: null,
  tier: 0,
  tierDef: null,
  col: 0,
  row: 0,
  x: 0,
  y: 0,
  priority: null,
  cooldownTicks: 0,
  targetUid: 0,
  invested: 0,
  builtTick: 0,
  firstFiredTick: -1,
});

export interface Enemy extends PoolEntity {
  def: CompiledEnemyDef | null;
  route: CompiledRoute | null;
  /** The wave it spawned in (1-based). */
  wave: number;
  /** Its wave group's tags. */
  tags: readonly WaveTag[];
  hp: number;
  shieldHp: number;
  /** Ticks until the shield starts regenerating. */
  shieldRegenDelayTicks: number;
  /** Distance traveled along the route, in tiles. */
  dist: number;
  /** The route segment `dist` lies on: cumLenTiles[seg] ≤ dist < cumLenTiles[seg + 1]. */
  seg: number;
  /** Position in tiles, derived from (seg, dist) by movement each tick (sim/path.ts). */
  x: number;
  y: number;
  /** Speed multiplier from Chilled (1 = none) and its remaining ticks. */
  chillMul: number;
  chillTicks: number;
  spawnTick: number;
}

export const ENEMY_BLANK: Readonly<Enemy> = Object.freeze({
  slot: 0,
  uid: 0,
  alive: false,
  def: null,
  route: null,
  wave: 0,
  tags: NO_TAGS,
  hp: 0,
  shieldHp: 0,
  shieldRegenDelayTicks: 0,
  dist: 0,
  seg: 0,
  x: 0,
  y: 0,
  chillMul: 1,
  chillTicks: 0,
  spawnTick: 0,
});

export interface Projectile extends PoolEntity {
  towerUid: number;
  /** 0 for shots aimed at a point (lobbed). */
  targetUid: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  /** Ticks until impact (lobbed) or until it expires. */
  ticksLeft: number;
  damage: number;
  damageType: DamageType;
  armorPierce: number;
  /** Squared splash radius in tiles; 0 for single-target shots. */
  splashSq: number;
}

export const PROJECTILE_BLANK: Readonly<Projectile> = Object.freeze({
  slot: 0,
  uid: 0,
  alive: false,
  towerUid: 0,
  targetUid: 0,
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  ticksLeft: 0,
  damage: 0,
  damageType: 'kinetic',
  armorPierce: 0,
  splashSq: 0,
});

/** Ground effects and ability areas (the Orbital Strike reticle, T113). */
export interface Zone extends PoolEntity {
  x: number;
  y: number;
  radiusSq: number;
  /** Ticks until it resolves or expires. */
  ticksLeft: number;
  damage: number;
  damageType: DamageType;
}

export const ZONE_BLANK: Readonly<Zone> = Object.freeze({
  slot: 0,
  uid: 0,
  alive: false,
  x: 0,
  y: 0,
  radiusSq: 0,
  ticksLeft: 0,
  damage: 0,
  damageType: 'kinetic',
});

/** Friendly non-tower units. A placeholder until allies land (T207); the pool stays empty in M1. */
export interface Ally extends PoolEntity {
  x: number;
  y: number;
}

export const ALLY_BLANK: Readonly<Ally> = Object.freeze({
  slot: 0,
  uid: 0,
  alive: false,
  x: 0,
  y: 0,
});
