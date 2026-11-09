// Entity shapes, one pool each (architecture.md § Entity model). Every field is initialized in the
// blank, so objects stay monomorphic. Rules for every kind:
// - Positions are in tiles; tile (c, r) has its center at (c + 0.5, r + 0.5).
// - Entities refer to each other by uid (0 = none), never by object reference, so sim state has
//   no cycles and hash() can walk it. Compiled definitions are held by direct reference.
// - The task that implements a kind's behavior adds the fields it needs here (T103 movement,
//   T105a combat, T105b economy, T113 abilities).
import type {
  CompiledEffect,
  CompiledEnemyDef,
  CompiledRoute,
  CompiledTier,
  CompiledTowerDef,
} from '../content/compiled.ts';
import type { DamageType, TargetPriority, WaveTag } from '../content/types.ts';
import type { PoolEntity } from './pool.ts';

const NO_TAGS: readonly WaveTag[] = Object.freeze([]);
const NO_EFFECTS: readonly CompiledEffect[] = Object.freeze([]);

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
  /** Ticks until the tower may fire again; it fires on a tick that starts at 0. */
  cooldownTicks: number;
  /** The current target (0 = none) and its enemy-pool slot, a hint checked against the uid. */
  targetUid: number;
  targetSlot: number;
  /** Spin-up ticks left before it may fire; reset to the attack's spin-up when it has no target. */
  spinTicks: number;
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
  targetSlot: -1,
  spinTicks: 0,
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
  /** Current HP. Fractional: the damage pipeline multiplies (design/enemies.md §2.3). */
  hp: number;
  shieldHp: number;
  /** Ticks until the shield starts regenerating; reset by shield damage. */
  shieldRegenDelayTicks: number;
  /** Distance traveled along the route, in tiles. */
  dist: number;
  /** The route segment `dist` lies on: cumLenTiles[seg] ≤ dist < cumLenTiles[seg + 1]. */
  seg: number;
  /** Position in tiles, derived from (seg, dist) by movement each tick (sim/path.ts). */
  x: number;
  y: number;
  /**
   * Chilled (design/enemies.md §2.4): the strongest active source's fraction (0 = none), the
   * speed multiplier it gives (1 = none; movement reads it), and the movement ticks it has left.
   */
  chillPct: number;
  chillMul: number;
  chillTicks: number;
  /** Soaked: active while > 0. */
  soakedTicks: number;
  /** Corroded: −1 armor per stack; every stack expires together when the timer runs out. */
  corrodedStacks: number;
  corrodedTicks: number;
  /** Marked: +markPct damage taken from all sources (highest only), active while markTicks > 0. */
  markPct: number;
  markTicks: number;
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
  chillPct: 0,
  chillMul: 1,
  chillTicks: 0,
  soakedTicks: 0,
  corrodedStacks: 0,
  corrodedTicks: 0,
  markPct: 0,
  markTicks: 0,
  spawnTick: 0,
});

/**
 * A shot in flight. M1 has lobbed shells only (the Thumper): fired at a fixed ground point and
 * landing after a fixed flight time. Everything the impact needs is copied in at fire time, so
 * selling or upgrading the tower mid-flight doesn't change the shell.
 */
export interface Projectile extends PoolEntity {
  towerUid: number;
  /** 0 for shots aimed at a point (lobbed). */
  targetUid: number;
  /** Where it was fired from, and its ground point now (moves linearly to the target point). */
  originX: number;
  originY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  /** The whole flight, and the ticks left until impact: it lands on the tick that starts at 0. */
  flightTicks: number;
  ticksLeft: number;
  damage: number;
  damageType: DamageType;
  armorPierce: number;
  ignoresArmor: boolean;
  /** Squared splash radius in tiles; 0 for single-target shots. */
  splashSq: number;
  /** The layers its splash hits (the firing tier's targets). */
  hitsGround: boolean;
  hitsAir: boolean;
  /** On-hit statuses (the firing tier's effects). */
  effects: readonly CompiledEffect[];
}

export const PROJECTILE_BLANK: Readonly<Projectile> = Object.freeze({
  slot: 0,
  uid: 0,
  alive: false,
  towerUid: 0,
  targetUid: 0,
  originX: 0,
  originY: 0,
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  flightTicks: 0,
  ticksLeft: 0,
  damage: 0,
  damageType: 'kinetic',
  armorPierce: 0,
  ignoresArmor: false,
  splashSq: 0,
  hitsGround: false,
  hitsAir: false,
  effects: NO_EFFECTS,
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
  /**
   * The commander ability slot that made it (its damage source), or 0. Not `slot`: that's the
   * pool index every PoolEntity has.
   */
  abilitySlot: number;
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
  abilitySlot: 0,
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
