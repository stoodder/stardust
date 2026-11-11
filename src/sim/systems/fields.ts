// Control fields (design/towers.md § Stasis Bloom; T608): each live tower whose tier has a `field`
// (the Stasis Bloom) holds the ground round it. Runs after the status system and before the links
// and the enemy abilities (tick.ts), so a pulse's Stasis interrupts a tell this tick and the field's
// chill slows this tick's step. In ascending tower slot order, then enemy slot order.
// - **Reach:** an enemy is in the field when its centre lies within the field's radius of the
//   tower's tile centre: the tier's `radiusTiles`, plus Pinned Down's +0.3 (`linkFieldRadiusTiles`),
//   × its radius tune-up (`supportStat` radius: `Tower.detectPct`, which systems/links.ts sets on
//   every tower). No high ground, darkness, or range bonus: a field is ground held, like a Lullaby's
//   radius, not a shot. The field takes what the tier's layers reach (ground and air; a pinned
//   flyer counts as ground), never a burrowed, Phased, leaving, or unrevealed cloaked unit, and it
//   passes a neutral unit (Gerald) by, as a pulse does (combat/neutral.ts).
// - **The chill:** every tick, each enemy in the field is Chilled `chillPct` × (1 + its aura
//   tune-up: `supportStat` aura, rank 1) for one tick: the one-chill rule (combat/damage.ts
//   `applyChill`: only the strongest, half on a boss, the 70% cap), so it holds while the unit stays
//   inside and lapses one step after it leaves.
// - **The pulse:** `Tower.cooldownTicks` is the pulse's timer (a field tower has no attack, so the
//   towers system leaves it alone). Like a pulse attack's, it starts ready, goes off on a tick that
//   starts at 0 with an enemy in the field, then waits `pulseEveryTicks` less Stillmind's
//   `linkPulseSoonerTicks` (never under 1 tick). No fire-rate bonus touches it (a power node, an
//   Overclock Rig or Rally Chorus aura), as none touches Flash Freeze's burst. Each enemy in the
//   field takes Stasis for `stasisTicks` (systems/status.ts `applyStasis`: it interrupts and blocks
//   abilities; Stasis immunity, 2× the Stasis, keeps a second Bloom from chaining it; a boss takes
//   Chilled 50% instead). The pulse emits PulseBurst (the frost ring and its sound).
// - **Gravity Well** (spec A, `pullBackTiles` > 0): the pulse first pulls each enemy in the field
//   back `pullBackTiles` along its route (a flyer along its air lane; never past the route's start),
//   unless it's a boss or still pull-immune: a pulled unit is immune for `pullBackCooldownTicks`
//   (`Enemy.pullImmuneTicks`, counted down by the status pass), whichever Bloom pulses it, so
//   stacked Wells pull a unit once every 20 s. PulledBack per unit. A pull that carries a unit a
//   Maw holds out of the Maw's radius loses the gather's tell (enemyAbilities/gather.ts); one Bricks
//   holds walks back to him (sim/blocker.ts).
// - **Hold Fire** quiets the field: no chill and no pulse while the tower holds, its pulse timer
//   still counting down (the towers system's rule), so it pulses the tick it's released. With the
//   spare-runners filter the field acts only on a tick an unspared unit is inside, and then on
//   everyone inside (a pulse's rule, systems/towers.ts).
// - Its first pulse sets `firstFiredTick` (the misclick grace ends, core-loop.md § 2.3).
import type { CompiledField } from '../../content/compiled.ts';
import { applyChill } from '../combat/damage.ts';
import { isNeutral } from '../combat/neutral.ts';
import { canHit, distSqTo } from '../combat/targeting.ts';
import type { Enemy, Tower } from '../entities.ts';
import { isSpared } from '../fireControl.ts';
import { pointAt } from '../path.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { supportPct } from './detection.ts';
import { applyStasis } from './status.ts';

/** What a field's reach reads of its tower. */
export type FieldTower = Pick<Tower, 'linkFieldRadiusTiles' | 'detectPct'>;

/**
 * A field's reach in tiles: its radius plus Pinned Down's extra, × its radius tune-up (the
 * header's rule; render draws the ground disc at it).
 */
export function fieldReachTiles(f: Pick<CompiledField, 'radiusTiles'>, t: FieldTower): number {
  return (f.radiusTiles + t.linkFieldRadiusTiles) * (1 + t.detectPct);
}

/** A field's pulse period in ticks: the tier's, less Stillmind's, never under 1 tick. */
export function fieldPulseTicks(
  f: Pick<CompiledField, 'pulseEveryTicks'>,
  t: Pick<Tower, 'linkPulseSoonerTicks'>,
): number {
  const p = f.pulseEveryTicks - t.linkPulseSoonerTicks;
  return p > 1 ? p : 1;
}

export function fields(state: SimState, ctx: TickContext): void {
  const towers = state.towers;
  for (let j = 0; j < towers.used; j++) {
    const t = towers.items[j]!; // j < used ≤ items.length
    if (!t.alive || t.def === null || t.tierDef === null || t.tierDef.field === null) continue;
    if (t.cooldownTicks > 0) t.cooldownTicks--;
    if (t.holdFire) continue;
    fieldTick(state, ctx, t, t.tierDef.field);
  }
}

/** One field's tick: its chill on everyone inside, and its pulse when ready. */
function fieldTick(state: SimState, ctx: TickContext, t: Tower, f: CompiledField): void {
  const enemies = state.enemies;
  const layers = t.tierDef!.targets; // fields checked tierDef
  const reach = fieldReachTiles(f, t);
  const reachSq = reach * reach;
  const victims = ctx.scratch.slots;
  victims.length = 0;
  let unspared = !t.spareRunners;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!canHit(e, layers) || isNeutral(e) || distSqTo(t.x, t.y, e) > reachSq) continue;
    victims.push(i);
    if (!unspared && !isSpared(e.tags)) unspared = true;
  }
  if (victims.length === 0 || !unspared) {
    victims.length = 0;
    return;
  }
  const strength = supportPct(ctx.config.modifiers, t.def!.id, 'aura'); // fields checked def
  const chill = f.chillPct * (1 + strength);
  for (let k = 0; k < victims.length; k++) {
    applyChill(enemies.items[victims[k]!]!, chill, 1); // collected slots < used
  }
  if (t.cooldownTicks === 0) pulse(state, t, f, reach, victims);
  victims.length = 0;
}

/** The pulse (the header's rule): Gravity Well's pull, then Stasis on everyone inside. */
function pulse(
  state: SimState,
  t: Tower,
  f: CompiledField,
  reach: number,
  victims: readonly number[],
): void {
  const enemies = state.enemies;
  let frozen = 0;
  for (let k = 0; k < victims.length; k++) {
    const e = enemies.items[victims[k]!]!; // collected slots < used
    if (f.pullBackTiles > 0) pullBack(state, t, f, e);
    if (applyStasis(e, f.stasisTicks)) frozen++;
  }
  t.cooldownTicks = fieldPulseTicks(f, t);
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
  emit(state, {
    type: 'PulseBurst',
    towerUid: t.uid,
    x: t.x,
    y: t.y,
    radiusTiles: reach,
    frozen,
  });
}

/** Gravity Well's pull on `e`: back along its route, unless a boss or still pull-immune. */
function pullBack(state: SimState, t: Tower, f: CompiledField, e: Enemy): void {
  const route = e.route;
  if (route === null || e.def === null || e.def.boss !== null || e.pullImmuneTicks > 0) return;
  const fromX = e.x;
  const fromY = e.y;
  const from = e.dist;
  const to = from > f.pullBackTiles ? from - f.pullBackTiles : 0;
  e.dist = to;
  e.seg = pointAt(route, to, e, e.seg);
  e.pullImmuneTicks = f.pullBackCooldownTicks;
  emit(state, {
    type: 'PulledBack',
    uid: e.uid,
    towerUid: t.uid,
    fromX,
    fromY,
    x: e.x,
    y: e.y,
    tiles: from - to,
  });
}
