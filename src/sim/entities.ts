// Entity shapes, one pool each (architecture.md § Entity model). Every field is initialized in the
// blank, so objects stay monomorphic. Rules for every kind:
// - Positions are in tiles; tile (c, r) has its center at (c + 0.5, r + 0.5).
// - Entities refer to each other by uid (0 = none), never by object reference, so sim state has
//   no cycles and hash() can walk it. Compiled definitions are held by direct reference.
// - Fields are scalars (or frozen content): poolAlloc resets a slot with Object.assign from the
//   frozen blank, so a mutable object or array in a blank would be shared by every entity.
// - The task that implements a kind's behavior adds the fields it needs here (T103 movement,
//   T105a combat, T105b economy, T113 abilities). T200 added the M2 seams ahead of their tasks
//   (specs T202b, links and bonuses T202a, fire control T206a, segment zones and allies T207a),
//   T300a the M3 ones (enemy abilities and bosses T304c), and T400a the M4 ones (the hush rule,
//   Skittish, and Heavy T402; shield pulses T403; blink T404; detection and reveal zones T406;
//   Stasis T407a; homing and charge attacks T407b; Pinned and link kill credits T408); until then
//   they keep their blank values.
import type {
  CompiledBomblets,
  CompiledEffect,
  CompiledEnemyDef,
  CompiledRoute,
  CompiledTier,
  CompiledTowerDef,
} from '../content/compiled.ts';
import type { AllyKind, DamageType, TargetPriority, WaveTag } from '../content/types.ts';
import type { SpecChoice } from './commands.ts';
import type { PoolEntity } from './pool.ts';

const NO_TAGS: readonly WaveTag[] = Object.freeze([]);
const NO_EFFECTS: readonly CompiledEffect[] = Object.freeze([]);

export interface Tower extends PoolEntity {
  def: CompiledTowerDef | null;
  /** 1–3, or 4 once specialized (`spec`). */
  tier: number;
  /** The tier-4 specialization taken, or null below tier 4 (T202b). */
  spec: SpecChoice | null;
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
  /** Hold Fire (core-loop.md § 2.7): it doesn't attack, but keeps its auras and links (T206a). */
  holdFire: boolean;
  /** The spare-runners targeting filter: never picks a SPARE_TAGS unit as its target (T206a). */
  spareRunners: boolean;
  /**
   * Its active synergy links (design/towers.md § 6), as a bit mask: bit i is the i-th link in the
   * compiled link registry (T202a). Each link type counts once per tower.
   */
  linkMask: number;
  /**
   * Every bonus on the tower summed per stat (architecture.md § Sim public API, stacking): static
   * `towerStat` modifiers, links, auras, and tiles; flat, then percent as a fraction (uncapped:
   * the cap applies when a stat is read, sim/bonuses.ts). The links system recomputes them only
   * when something changes, never per tick. They don't depend on the tier, so an upgrade or spec
   * takes effect at once.
   */
  flatDamage: number;
  flatRate: number;
  flatRange: number;
  pctDamage: number;
  pctRate: number;
  pctRange: number;
  /**
   * A conditional damage bonus from a link (`vsStatus`, Sitting Ducks): against an enemy with
   * any status in the mask (content/rules.ts STATUS_BITS), `vsStatusPct` adds to `pctDamage`.
   * 0 / 0 for none.
   */
  vsStatusMask: number;
  vsStatusPct: number;
  /**
   * Link extras (Conductive; T304b), recomputed with the bonuses: `bonusJumps` whole jumps added
   * to a chain attack (attacks/chain.ts), and `linkSoakedTicks` a Soaked its hits apply at any
   * tier (systems/status.ts `applyLinkStatuses`). 0 for none.
   */
  bonusJumps: number;
  linkSoakedTicks: number;
  /**
   * More link extras (T400a seams): `bonusDetectTiles` added to its detection radius (Overwatch,
   * Skywatch; T406) and `linkKillCredits` paid per kill it makes (Reel It In; T408). 0 for none.
   */
  bonusDetectTiles: number;
  linkKillCredits: number;
  /** A charge attack's progress on its target, in ticks (Capacitor Bank; T407b). */
  chargeTicks: number;
  /**
   * Ticks until a pulse's burst may go off again (Flash Freeze; T407a): like `cooldownTicks`, it
   * goes off on a tick that starts at 0 with an enemy in range, then waits `burst.everyTicks`.
   */
  burstTicks: number;
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
  spec: null,
  holdFire: false,
  spareRunners: false,
  linkMask: 0,
  flatDamage: 0,
  flatRate: 0,
  flatRange: 0,
  pctDamage: 0,
  pctRate: 0,
  pctRange: 0,
  vsStatusMask: 0,
  vsStatusPct: 0,
  bonusJumps: 0,
  linkSoakedTicks: 0,
  bonusDetectTiles: 0,
  linkKillCredits: 0,
  chargeTicks: 0,
  burstTicks: 0,
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
  // Enemy abilities (sim/enemyAbilities/; T300a seams, run by T304c). Blank until then.
  /**
   * Ticks until its next ability step (a dig, a surfacing, a sneeze), or a leaving unit's ticks
   * left to reach the map edge; 0: nothing pending.
   */
  abilityTicks: number;
  /** Uses left of a counted ability: a boss phase's burrows. */
  abilityCount: number;
  /**
   * Its abilities' speed multiplier this tick (1 = none): a burrow's `speedMul`, a huddle
   * leader's pace, a boss phase's haste. enemyAbilities sets it before movement, which reads it.
   */
  paceMul: number;
  /** Burrowing: underground, so untargetable but for burrow answers (enemies.md § 2.6). */
  burrowed: boolean;
  /** Huddle: the uid of the leader whose pace it matches this tick (0 = none). */
  huddleUid: number;
  /** A boss's current phase (1-based; `def.boss.phases[bossPhase − 1]`); 0 for a non-boss. */
  bossPhase: number;
  /** A boss's phase-change invulnerability left, in ticks (at most 2 s; enemies.md § 6). */
  invulnerableTicks: number;
  /**
   * A boss ending (`driveOff`, `retreat`): untargetable, heading off the map by the nearest edge;
   * it never leaks (enemies.md § 6.1).
   */
  leaving: boolean;
  // Act II enemy state (T400a seams; enemies.md § 3, § 5.4). Blank until each task runs it.
  /**
   * The hush rule (T402): the hush tell's ticks left (0: not hushing), and the uid of the unit
   * it is hushing. `heavy` once it has hushed (its one hush): base speed × HUSH_SPEED_MUL.
   */
  hushTicks: number;
  hushUid: number;
  heavy: boolean;
  /** Skittish (T402): ticks of its Haste left (0: none). */
  skittishTicks: number;
  /** A shield pulse (T403) or blink (T404): ticks until the next one fires (its tell is the last part). */
  pulseTicks: number;
  blinkTicks: number;
  /** Revealed (T406): ticks it stays Revealed (detection or a Scanner Sweep, plus linger); 0: not. */
  revealedTicks: number;
  /**
   * Stasis (T407a; systems/status.ts): ticks left, and the immunity that follows (set to 2× the
   * Stasis when it lands, counting down once it's over). Pinned (T408): the same pair.
   */
  stasisTicks: number;
  stasisImmuneTicks: number;
  pinnedTicks: number;
  pinImmuneTicks: number;
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
  abilityTicks: 0,
  abilityCount: 0,
  paceMul: 1,
  burrowed: false,
  huddleUid: 0,
  bossPhase: 0,
  invulnerableTicks: 0,
  leaving: false,
  hushTicks: 0,
  hushUid: 0,
  heavy: false,
  skittishTicks: 0,
  pulseTicks: 0,
  blinkTicks: 0,
  revealedTicks: 0,
  stasisTicks: 0,
  stasisImmuneTicks: 0,
  pinnedTicks: 0,
  pinImmuneTicks: 0,
});

/**
 * A shot in flight: a lobbed shell (the Thumper) or a bomblet it scattered, fired at a fixed
 * ground point and landing after a fixed flight time. Everything the impact needs is copied in at
 * fire time, so selling, upgrading, or specializing the tower mid-flight doesn't change the shell.
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
  /**
   * The damage against a victim with any status in `vsStatusMask` (a link's conditional bonus,
   * checked per victim on impact); equal to `damage` when the mask is 0.
   */
  damageVs: number;
  vsStatusMask: number;
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
  /**
   * The bomblets it scatters on impact (Cluster Thumper; null for none, and for a bomblet), with
   * their damage under the tower's bonuses at fire time (`bombletDamageVs` as `damageVs`).
   */
  bomblets: CompiledBomblets | null;
  bombletDamage: number;
  bombletDamageVs: number;
  /** It steers to `targetUid` each tick (Seeker Swarm; T407b). */
  homing: boolean;
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
  damageVs: 0,
  vsStatusMask: 0,
  damageType: 'kinetic',
  armorPierce: 0,
  ignoresArmor: false,
  splashSq: 0,
  hitsGround: false,
  hitsAir: false,
  effects: NO_EFFECTS,
  bomblets: null,
  bombletDamage: 0,
  bombletDamageVs: 0,
  homing: false,
});

/**
 * What a zone does: `strike` lands once on every ground enemy in its radius (Orbital Strike);
 * `segment` covers a stretch of one route for its duration (Suppressing Fire, T207a); `field`
 * covers the whole map for its duration (Time Dilation, T304d: `slowPct` on every enemy; it has
 * no position or route, and render tints the battlefield while it lives); `reveal` Reveals the
 * cloaked enemies in its radius for its duration (Scanner Sweep; T406).
 */
export type ZoneKind = 'strike' | 'segment' | 'field' | 'reveal';

/** Ground effects and ability areas (the Orbital Strike reticle, T113). */
export interface Zone extends PoolEntity {
  kind: ZoneKind;
  x: number;
  y: number;
  radiusSq: number;
  /** Ticks until it resolves or expires. */
  ticksLeft: number;
  /** Per hit for a strike; per second for a segment. */
  damage: number;
  damageType: DamageType;
  /**
   * The commander ability slot that made it (its damage source), or 0. Not `slot`: that's the
   * pool index every PoolEntity has.
   */
  abilitySlot: number;
  /** A segment's route, and the stretch of it covered: `distFrom ≤ dist ≤ distTo` (tiles). */
  route: CompiledRoute | null;
  distFrom: number;
  distTo: number;
  /** A segment's or field's slow on the enemies inside it, as a fraction (0.5 = −50% speed). */
  slowPct: number;
}

export const ZONE_BLANK: Readonly<Zone> = Object.freeze({
  slot: 0,
  uid: 0,
  alive: false,
  kind: 'strike',
  x: 0,
  y: 0,
  radiusSq: 0,
  ticksLeft: 0,
  damage: 0,
  damageType: 'kinetic',
  abilitySlot: 0,
  route: null,
  distFrom: 0,
  distTo: 0,
  slowPct: 0,
});

/** How an ally moves (architecture.md § Entity model). */
export type AllyMode = 'post' | 'route' | 'owner' | 'stationary';
/** Who can hurt an ally: nobody, the Hollow's hush, or a scripted timeline (Bricks in A3M3). */
export type AllyVulnerability = 'never' | 'hush' | 'scripted';

/**
 * Friendly non-tower units (design/maps.md § 5.4): Bricks at his post, militia, refugees, the
 * choir, swarmlings. The allies system runs them (T207a); M2 has Bricks's post only. Allies with
 * an attack never target `quiet_wave`, `youngling`, or `fleeing` units.
 */
export interface Ally extends PoolEntity {
  kind: AllyKind | null;
  mode: AllyMode;
  vulnerability: AllyVulnerability;
  /** Position in tiles (a post's tile center). */
  x: number;
  y: number;
  /** For `route` allies: the route and the distance along it (as enemies, sim/path.ts). */
  route: CompiledRoute | null;
  dist: number;
  seg: number;
  /** For `owner` allies (swarmlings): the owning tower's uid; else 0. */
  ownerUid: number;
  /** The attack, if any (damage 0: none): per hit, every `periodTicks`, within the range. */
  damage: number;
  damageType: DamageType;
  periodTicks: number;
  rangeSq: number;
  /** The layers its attack hits. */
  hitsGround: boolean;
  hitsAir: boolean;
  /** Ticks until it may attack again (fires on a tick that starts at 0, like a tower). */
  cooldownTicks: number;
  /** The current target (0 = none) and its enemy-pool slot hint. */
  targetUid: number;
  targetSlot: number;
  /** Health as a fraction of full (1); scripted allies follow their map's timeline. */
  health: number;
}

export const ALLY_BLANK: Readonly<Ally> = Object.freeze({
  slot: 0,
  uid: 0,
  alive: false,
  kind: null,
  mode: 'post',
  vulnerability: 'never',
  x: 0,
  y: 0,
  route: null,
  dist: 0,
  seg: 0,
  ownerUid: 0,
  damage: 0,
  damageType: 'kinetic',
  periodTicks: 0,
  rangeSq: 0,
  hitsGround: false,
  hitsAir: false,
  cooldownTicks: 0,
  targetUid: 0,
  targetSlot: -1,
  health: 1,
});
