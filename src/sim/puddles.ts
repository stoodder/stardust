// Big Glorp's puddles and the links' Corroded (design/towers.md § 7, the Gloop Spitter; T705).
// - **Arming a shot** (`armShot`, called as the towers system launches a shell or a flak shot):
//   the shot copies its tier's `puddle`, the puddle's acid per DoT tick under the tower's damage
//   percent (tune-ups, auras, links: `stackedStat` with its cap; flat bonuses are the shell's, not
//   the acid's), and the tower's link Corroded (`linkCorrodedStacks`: Acid Rain's Thumper, Sticky
//   Flak's Skyhook), all fixed at fire time like every other shot field, so a sell or upgrade
//   mid-flight changes nothing.
// - **On impact** (systems/projectiles.ts `land`): each victim takes the link's stacks after the
//   tier's own effects (`applyLinkCorroded`), and a shot carrying a puddle leaves one at its aim
//   point (`spawnPuddle`: a `puddle` zone, PuddleSpawned), hit or miss. A bomblet carries its
//   shell's stacks and puddle (none does today: only the Thumper scatters, and it leaves none).
// - **The pass** (`puddles`, tick slot 6a2: after movement and Underfoot's traps, so it judges
//   where units stand this tick). Every live puddle ages a tick; then each enemy a ground tower
//   could touch (combat/targeting.ts `canHit` on the ground layer: a pinned flyer counts, never a
//   burrowed, Phased, leaving, or unrevealed cloaked unit) and not neutral (Gerald walks through)
//   stands in **one** puddle, the strongest whose radius holds its centre (the most acid, then the
//   strongest chill, then the lowest slot): overlapping puddles never stack, as same-kind auras
//   don't (towers.md § 4). It is Chilled the puddle's `chillPct` for a tick (the one-chill rule:
//   only the strongest, half on a boss; it lapses one step after the unit walks out), and on the
//   puddle's DoT beat (every DOT_TICK_SEC of its life, the last on its final tick) it takes the
//   acid as a DoT (armor bypassed, shields not: enemies.md § 2.3), credited to the puddle's tower.
//   A puddle lives `durationTicks` passes (3 s: 12 beats of 2.5, its 10/s), then dries.
// Allocation-free: plain loops over the pools in slot order, so replays match.
import type { CompiledPuddle, CompiledTier } from '../content/compiled.ts';
import {
  CORRODED_STACK_SEC,
  DOT_TICK_SEC,
  LINK_CORRODED_MAX_STACKS,
  stackedStat,
} from '../content/rules.ts';
import { secToTicks } from '../shared/time.ts';
import { applyChill, applyDamage, type HitMods } from './combat/damage.ts';
import { isNeutral } from './combat/neutral.ts';
import { canHit } from './combat/targeting.ts';
import { untargetable } from './enemyAbilities/layers.ts';
import { ZONE_BLANK, type Enemy, type Projectile, type Tower, type Zone } from './entities.ts';
import { poolAlloc, poolKill } from './pool.ts';
import { emit, takeUid, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';

/** A puddle's DoT beat, in ticks (DOT_TICK_SEC: 0.25 s). */
export const PUDDLE_DOT_TICKS = secToTicks(DOT_TICK_SEC);
const CORRODED_TICKS = secToTicks(CORRODED_STACK_SEC);
/** The acid: a DoT, so armor never subtracts (shields still take it first). */
const ACID_HIT: HitMods = Object.freeze({ armorPierce: 0, ignoresArmor: false, isDoT: true });
/** The layer a puddle reaches: the ground (a pinned flyer included). */
const GROUND = Object.freeze({ ground: true, air: false });

/** The acid one DoT beat of `puddle` deals from tower `t`: its base under the damage percent. */
export function puddleBeatDamage(puddle: CompiledPuddle, t: Pick<Tower, 'pctDamage'>): number {
  return stackedStat('damage', puddle.damagePerTick * PUDDLE_DOT_TICKS, 0, t.pctDamage);
}

/** Copies what a shot's impact needs of T705's onto it, at fire time (see the header). */
export function armShot(p: Projectile, t: Tower, tier: CompiledTier): void {
  const puddle = tier.puddle;
  p.puddle = puddle;
  p.puddleDamage = puddle === null ? 0 : puddleBeatDamage(puddle, t);
  p.corrodedStacks = t.linkCorrodedStacks;
}

/**
 * A link's Corroded on a victim (Acid Rain, Sticky Flak): `stacks` more, up to
 * LINK_CORRODED_MAX_STACKS (never lowering stacks a higher-max source left), refreshing the 5 s
 * timer. A plain Corroded: it never lifts Corrosive Kiss's shield slow, nor adds one.
 */
export function applyLinkCorroded(e: Enemy, stacks: number): void {
  if (stacks <= 0 || !e.alive || untargetable(e)) return;
  const sum = e.corrodedStacks + stacks;
  const capped = sum < LINK_CORRODED_MAX_STACKS ? sum : LINK_CORRODED_MAX_STACKS;
  if (capped > e.corrodedStacks) e.corrodedStacks = capped;
  e.corrodedTicks = CORRODED_TICKS;
}

/** Leaves shot `p`'s puddle at its aim point (a `puddle` zone) and emits PuddleSpawned. */
export function spawnPuddle(state: SimState, p: Projectile): void {
  const puddle = p.puddle;
  if (puddle === null) return;
  const z = poolAlloc(state.zones, ZONE_BLANK, takeUid(state));
  z.kind = 'puddle';
  z.x = p.targetX;
  z.y = p.targetY;
  z.radiusSq = puddle.radiusSq;
  z.ticksLeft = puddle.durationTicks;
  z.damage = p.puddleDamage; // per DoT beat
  z.damageType = puddle.type;
  z.chillPct = puddle.chillPct;
  z.towerUid = p.towerUid;
  emit(state, { type: 'PuddleSpawned', zoneUid: z.uid, at: [z.x, z.y] });
}

export function puddles(state: SimState, ctx: TickContext): void {
  const zones = state.zones;
  let any = false;
  for (let i = 0; i < zones.used; i++) {
    const z = zones.items[i]!; // i < used ≤ items.length
    if (!z.alive || z.kind !== 'puddle') continue;
    z.ticksLeft--;
    any = true;
  }
  if (!any) return;
  const enemies = state.enemies;
  const source = ctx.scratch.towerSource;
  for (let j = 0; j < enemies.used; j++) {
    const e = enemies.items[j]!; // j < used ≤ items.length
    if (!canHit(e, GROUND) || isNeutral(e)) continue;
    const z = strongestUnder(zones.items, zones.used, e);
    if (z === null) continue;
    applyChill(e, z.chillPct, 1);
    if (z.ticksLeft % PUDDLE_DOT_TICKS === 0 && z.damage > 0) {
      source.uid = z.towerUid;
      applyDamage(state, e, z.damage, z.damageType, source, ACID_HIT);
    }
  }
  for (let i = 0; i < zones.used; i++) {
    const z = zones.items[i]!; // i < used ≤ items.length
    if (z.alive && z.kind === 'puddle' && z.ticksLeft <= 0) poolKill(zones, z);
  }
}

/** The strongest live puddle whose radius holds `e`'s centre (the header's order), or null. */
function strongestUnder(items: readonly Zone[], used: number, e: Enemy): Zone | null {
  let best: Zone | null = null;
  for (let i = 0; i < used; i++) {
    const z = items[i]!; // i < used ≤ items.length
    if (!z.alive || z.kind !== 'puddle') continue;
    const dx = e.x - z.x;
    const dy = e.y - z.y;
    if (dx * dx + dy * dy > z.radiusSq) continue;
    if (
      best === null ||
      z.damage > best.damage ||
      (z.damage === best.damage && z.chillPct > best.chillPct)
    ) {
      best = z;
    }
  }
  return best;
}
