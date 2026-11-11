// System 5: abilities. Commander ability cooldowns and effects (design/core-loop.md §3): slot 1 is
// the Technician's (Orbital Strike; Scanner Sweep, T406), slot 2 the companion's (Suppressing
// Fire, T207a; Time Dilation and Clearance Sale, T304d). Enemy abilities are their own system (enemyAbilities/).
//
// - `applyAbilityCommand` (called by applyCommands) validates an `ability` command, puts the slot on
//   cooldown, and applies the effect: a strike or segment opens its zone(s) at the target tile;
//   Time Dilation opens a map-wide `field` zone; Clearance Sale loads its discount charges
//   (`state.discountCharges`, spent per purchase by economy.ts `pay`). The last two take no target.
// - Cooldowns are in ticks (`abilityCooldownTicks`) or, for Clearance Sale, in waves
//   (`abilityCooldownWaves`: waves still to start before it's ready). A wave that starts on the
//   cast's tick before the cast doesn't count, one that starts after it in the same tick does.
// - Ready Room (`freeCast` modifiers): the first cast of each slot during a listed wave (from that
//   wave's start to the next wave's) starts no cooldown at all (`state.freeCastWave`).
// - Each tick, `abilities` counts the cooldowns down and runs the zones:
//   - A **strike** lands exactly `delayTicks` after the tick it was cast, before that tick's
//     movement, and hits every ground enemy whose center is within its radius (inclusive, like
//     splash) through `applyDamage`. Its victims are chosen before any damage lands.
//   - A **segment** (Suppressing Fire) covers the clicked path tile ±`reachTiles` along each ground
//     route through it (D031), for `durationTicks` from the cast tick. Every tick, each enemy on
//     it is Chilled by `slowPct` (refreshed each tick, so it ends one movement tick after the
//     enemy leaves); every SEGMENT_TICK_TICKS it takes `damage × DEFAULT_BEAM_TICK_SEC` as a beam
//     tick (armor prorated, enemies.md §2.3), the last on the zone's final tick. It covers ground
//     units only: Gerald flies the ground path but is an air unit, so it passes him by (D072).
//   - A **field** (Time Dilation) Chills every live enemy on the map (air, burrowed, and cloaked
//     included: it is map-wide, not aimed; never a neutral unit) by `slowPct` each tick for
//     `durationTicks` from the cast tick, so units that spawn during it are slowed too. A boss
//     takes it at half strength through `applyChill` (enemies.md § 6), the content's `bossSlowPct`.
//   - A **reveal** zone (Scanner Sweep, T406) lives `durationTicks` ticks from the cast tick at the
//     target tile; systems/detection.ts Reveals the cloaked units inside it on each of those ticks.
//   - **Stillness** (`stasisArea`, T507) opens no zone: it lands on the cast's tick, after
//     AbilityUsed (sim/abilities/stillness.ts: Stasis in a circle, then StasisArea).
//   - **System Reboot** (`reboot`, T702) opens no zone and takes no target: it lands on the cast's
//     tick, after AbilityUsed (sim/abilities/reboot.ts: every jam cleared, then its immunity).
//   - **Underfoot** (`pathTrap`, T604) opens a `trap` zone on its ground path tile
//     (abilities/underfoot.ts `openTrap`); the traps system springs it after movement, so this
//     pass leaves it alone.
//   - A unit out of reach (cloaked out, burrowed, Phased, or leaving; enemyAbilities/layers.ts
//     `untargetable`) is untouchable: a strike or segment tick deals it nothing (the damage
//     pipeline's `immune`), and a segment doesn't slow it (T507 widened that from cloaks alone).
//     Time Dilation is map-wide, not aimed, so its field still slows them.
// - Modifiers (`abilityStat`, by ability id or '*') change cooldowns (Ability Coolant, Companion
//   Rapport) and radii (Orbital Strike Mk II; any strike, reveal, or Stillness): `abilityStats`.
// - Cooldowns run on sim time, so pausing doesn't advance them, and an ability aimed while paused
//   lands when play resumes (core-loop §3.1). An early wave call cuts them (`reduceAbilityCooldowns`).
import type {
  CompiledAbilityDef,
  CompiledAbilityEffect,
  CompiledRoute,
} from '../../content/compiled.ts';
import { DEFAULT_BEAM_TICK_SEC } from '../../content/rules.ts';
import type { GridPos, IdSpace } from '../../content/types.ts';
import { secToTicks, TICK_HZ } from '../../shared/time.ts';
import { applyChill, applyDamage, PLAIN_HIT, type HitMods } from '../combat/damage.ts';
import type { Command, RejectReason } from '../commands.ts';
import type { Modifier, SimConfig } from '../config.ts';
import { castReboot } from '../abilities/reboot.ts';
import { castStillness } from '../abilities/stillness.ts';
import { openTrap } from '../abilities/underfoot.ts';
import { untargetable } from '../enemyAbilities/layers.ts';
import { ZONE_BLANK, type Zone } from '../entities.ts';
import type { DamageSource } from '../events.ts';
import { tileIndex } from '../grid.ts';

import { poolAlloc, poolKill } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

type AbilityCommand = Extract<Command<IdSpace>, { type: 'ability' }>;
type SegmentEffect = Extract<CompiledAbilityEffect, { kind: 'segment' }>;

/** The damage source each slot's hits name (frozen constants, so resolving allocates nothing). */
const SLOT_SOURCES: readonly DamageSource[] = Object.freeze([
  Object.freeze({ kind: 'ability', slot: 1 } as const),
  Object.freeze({ kind: 'ability', slot: 2 } as const),
]);

/** A segment's damage lands in beam ticks (enemies.md §2.3): every 0.25 s, 15 ticks. */
export const SEGMENT_TICK_TICKS = secToTicks(DEFAULT_BEAM_TICK_SEC);
/** A segment tick is a beam tick: armor applies at `armor × DEFAULT_BEAM_TICK_SEC`. */
const SEGMENT_HIT: HitMods = Object.freeze({
  armorPierce: 0,
  ignoresArmor: false,
  beamTickSec: DEFAULT_BEAM_TICK_SEC,
});

/**
 * The ability equipped in a slot, or null: slot 1 is the Technician's; slot 2 holds the
 * companion's only while the companion is `present` (an `absent` companion's slot is shown dark
 * and can't be used, core-loop.md § 3.1).
 */
export function abilityInSlot(ctx: TickContext, slot: 1 | 2): CompiledAbilityDef | null {
  const a = ctx.config.abilities;
  const id = slot === 1 ? a.slot1 : a.slot2State === 'present' ? a.slot2 : null;
  return id === null ? null : (ctx.content.abilities[id] ?? null);
}

/** An ability's numbers after modifiers. */
export interface AbilityStats {
  /** The cooldown each cast starts, in ticks (at least 1); 0 for a cooldown counted in waves. */
  readonly cooldownTicks: number;
  /** The cooldown each cast starts, in waves (Clearance Sale; at least 1); else 0. */
  readonly cooldownWaves: number;
  /** A strike's, reveal's, or Stillness's radius in tiles; 0 for effects without one (a segment). */
  readonly radiusTiles: number;
}

/**
 * An ability's cooldown and radius under `abilityStat` modifiers naming it (or '*'), by the
 * stacking formula `(base + Σ flat) × (1 + Σ pct)` (towers.md §4): a cooldown `flat` is in
 * seconds. Companion Rapport is cooldown −15% on its companion's ability, Ability Coolant −5% on
 * every ability, Orbital Strike Mk II radius +0.5 flat (progression.md §7.3). A cooldown counted
 * in waves takes the percentages only, `round(waves × (1 + Σ pct))` and at least 1 (a flat number
 * of seconds means nothing in waves): Coolant leaves Clearance Sale's 4 waves at 4, and a
 * Rapport's −15% makes it 3. The HUD reads it for the cooldown wipe and the reticle's size.
 */
export function abilityStats(
  def: CompiledAbilityDef,
  modifiers: readonly Modifier<IdSpace>[],
): AbilityStats {
  let cdFlatSec = 0;
  let cdPct = 0;
  let rFlat = 0;
  let rPct = 0;
  for (const m of modifiers) {
    if (m.kind !== 'abilityStat' || (m.ability !== '*' && m.ability !== def.id)) continue;
    if (m.stat === 'cooldown') {
      cdFlatSec += m.flat ?? 0;
      cdPct += m.pct ?? 0;
    } else {
      rFlat += m.flat ?? 0;
      rPct += m.pct ?? 0;
    }
  }
  const e = def.effect;
  const radius = hasRadiusEffect(e) ? (e.radiusTiles + rFlat) * (1 + rPct) : 0;
  const radiusTiles = radius > 0 ? radius : 0;
  if (def.cooldownWaves > 0) {
    const cooldownWaves = Math.max(1, Math.round(def.cooldownWaves * (1 + cdPct)));
    return { cooldownTicks: 0, cooldownWaves, radiusTiles };
  }
  const cdSec = (def.cooldownTicks / TICK_HZ + cdFlatSec) * (1 + cdPct);
  const cooldownTicks = Math.max(1, secToTicks(cdSec > 0 ? cdSec : 0));
  return { cooldownTicks, cooldownWaves: 0, radiusTiles };
}

/** A slot is off cooldown, in ticks and in waves (the HUD and the harness ask before casting). */
export function abilityReady(
  state: {
    readonly abilityCooldownTicks: readonly number[];
    readonly abilityCooldownWaves: readonly number[];
  },
  slot: 1 | 2,
): boolean {
  return (
    (state.abilityCooldownTicks[slot - 1] ?? 0) <= 0 &&
    (state.abilityCooldownWaves[slot - 1] ?? 0) <= 0
  );
}

/**
 * A cast from `slot` right now would be Ready Room's free one (`freeCast` modifiers): the current
 * wave is one a modifier names, and the slot hasn't used that wave's free cast. The HUD can badge
 * the slot with it.
 */
export function freeCastReady(
  state: { readonly wave: number; readonly freeCastWave: readonly number[] },
  modifiers: readonly Modifier<IdSpace>[],
  slot: 1 | 2,
): boolean {
  const wave = state.wave;
  if (wave <= 0 || state.freeCastWave[slot - 1] === wave) return false;
  for (let i = 0; i < modifiers.length; i++) {
    const m = modifiers[i]!; // i < length
    if (m.kind === 'freeCast' && m.wave === wave) return true;
  }
  return false;
}

/** The wave that started on this very tick (1-based), or 0. */
function waveStartedNow(state: SimState): number {
  const w = state.wave;
  return w > 0 && state.schedule.startTick[w - 1] === state.tick ? w : 0;
}

/**
 * Config problems with the ability slots (validateConfig reports them):
 * - Slot 2 is the companion's: with no companion it is `none` and empty; with one it isn't `none`,
 *   a `present` companion's slot holds an ability, and the ability is that companion's.
 * - `abilityStat` modifiers name a known ability (or '*'), and a `radius` one names a strike.
 */
export function abilityConfigErrors(cfg: SimConfig<IdSpace>): string[] {
  const out: string[] = [];
  const { slot2, slot2State } = cfg.abilities;
  const defs = cfg.content.abilities;
  if (cfg.companion === null) {
    if (slot2 !== null || slot2State !== 'none') {
      out.push("abilities: slot 2 is the companion's; with no companion it is 'none' and empty");
    }
  } else {
    if (slot2State === 'none')
      out.push(`abilities.slot2State: companion '${cfg.companion}' needs a slot`);
    if (slot2State === 'present' && slot2 === null) {
      out.push(`abilities.slot2: companion '${cfg.companion}' is present but slot 2 is empty`);
    }
    const def = slot2 === null || !Object.hasOwn(defs, slot2) ? undefined : defs[slot2];
    if (def !== undefined && def.companion !== cfg.companion) {
      out.push(`abilities.slot2: '${def.id}' is not companion '${cfg.companion}'s ability`);
    }
  }
  for (const m of cfg.modifiers) {
    if (m.kind !== 'abilityStat' || m.ability === '*') continue;
    if (!Object.hasOwn(defs, m.ability)) {
      out.push(`modifiers: abilityStat (${m.source}) names unknown ability '${m.ability}'`);
    } else if (m.stat === 'radius' && !hasRadius(defs[m.ability]!)) {
      out.push(
        `modifiers: abilityStat (${m.source}) changes the radius of '${m.ability}', which has none`,
      );
    }
  }
  return out;
}

/** Whether an ability has a radius a modifier may change (a strike, a reveal, or Stillness). */
function hasRadius(def: CompiledAbilityDef): boolean {
  return hasRadiusEffect(def.effect);
}

function hasRadiusEffect(
  e: CompiledAbilityEffect,
): e is Extract<CompiledAbilityEffect, { kind: 'strike' | 'reveal' | 'stasisArea' }> {
  return e.kind === 'strike' || e.kind === 'reveal' || e.kind === 'stasisArea';
}

/**
 * Validates and applies an `ability` command: the slot holds an ability, it is off cooldown (in
 * ticks and in waves), and a targeted one's target is a tile on the map (a strike, a reveal, or
 * Stillness may land on any tile; a segment or Underfoot's trap needs a tile of a ground route). Time Dilation and Clearance Sale take no
 * target and ignore one if given. Returns null on success, else why it was rejected.
 */
export function applyAbilityCommand(
  state: SimState,
  ctx: TickContext,
  cmd: AbilityCommand,
): RejectReason | null {
  const def = abilityInSlot(ctx, cmd.slot);
  if (def === null) return 'noAbility';
  if (!abilityReady(state, cmd.slot)) return 'abilityOnCooldown';
  const e = def.effect;
  let uid = 0;
  let target: GridPos | null = null;
  if (e.kind === 'slowAll') {
    const zone = poolAlloc(state.zones, ZONE_BLANK, takeUid(state));
    zone.kind = 'field';
    zone.ticksLeft = e.durationTicks;
    zone.abilitySlot = cmd.slot;
    zone.slowPct = e.slowPct;
    uid = zone.uid;
  } else if (e.kind === 'discount') {
    // A new sale replaces any charges left (a Ready Room recast), never adds to them.
    state.discountCharges = e.charges;
    state.discountPct = e.pct;
  } else if (e.kind === 'reboot') {
    // System Reboot (T702): no target, no zone; it lands after AbilityUsed, below.
  } else if (e.kind === 'stasisArea') {
    // Stillness (T507): instant, so it opens no zone; it lands after AbilityUsed, below.
    const t = cmd.target;
    if (t === undefined || tileIndex(ctx.map, t[0], t[1]) < 0) return 'invalidTarget';
    target = [t[0], t[1]];
  } else {
    const t = cmd.target;
    if (t === undefined || tileIndex(ctx.map, t[0], t[1]) < 0) return 'invalidTarget';
    target = [t[0], t[1]];
    uid = openTargeted(state, ctx, def, t[0], t[1], cmd.slot);
    if (uid === 0) return 'invalidTarget';
  }
  startCooldown(state, ctx, def, cmd.slot);
  state.stats.abilityUses++;
  emit(state, { type: 'AbilityUsed', slot: cmd.slot, uid, ability: def.id, target });
  if (e.kind === 'stasisArea' && target !== null) {
    const radius = abilityStats(def, ctx.config.modifiers).radiusTiles;
    castStillness(state, e, target[0], target[1], radius, cmd.slot);
  }
  if (e.kind === 'reboot') castReboot(state, e);
  return null;
}

/**
 * Puts a slot on its cooldown after a cast (`abilityStats`), unless the cast is Ready Room's free
 * one. A wave cooldown cast on the tick its wave started gets one more, which the abilities
 * system takes back this tick, so that wave doesn't count.
 */
function startCooldown(
  state: SimState,
  ctx: TickContext,
  def: CompiledAbilityDef,
  slot: 1 | 2,
): void {
  const modifiers = ctx.config.modifiers;
  if (freeCastReady(state, modifiers, slot)) {
    state.freeCastWave[slot - 1] = state.wave;
    return;
  }
  const stats = abilityStats(def, modifiers);
  state.abilityCooldownTicks[slot - 1] = stats.cooldownTicks;
  if (stats.cooldownWaves > 0) {
    state.abilityCooldownWaves[slot - 1] =
      stats.cooldownWaves + (waveStartedNow(state) > 0 ? 1 : 0);
  }
}

/**
 * Opens a strike's, reveal's, or segment's zone(s) at tile (col, row); returns the first uid, or 0
 * if none.
 */
function openTargeted(
  state: SimState,
  ctx: TickContext,
  def: CompiledAbilityDef,
  col: number,
  row: number,
  slot: 1 | 2,
): number {
  const e = def.effect;
  if (e.kind === 'segment') return openSegments(state, ctx, e, col, row, slot);
  // Underfoot (T604): a trap on one ground path tile; abilities/underfoot.ts springs it.
  if (e.kind === 'pathTrap') return openTrap(state, ctx, e, col, row, slot);
  if (e.kind === 'strike') {
    const radius = abilityStats(def, ctx.config.modifiers).radiusTiles;
    const zone = poolAlloc(state.zones, ZONE_BLANK, takeUid(state));
    zone.x = col + 0.5;
    zone.y = row + 0.5;
    zone.radiusSq = radius * radius;
    zone.ticksLeft = e.delayTicks;
    zone.damage = e.damage;
    zone.damageType = e.type;
    zone.abilitySlot = slot;
    return zone.uid;
  }
  if (e.kind === 'reveal') {
    const radius = abilityStats(def, ctx.config.modifiers).radiusTiles;
    const zone = poolAlloc(state.zones, ZONE_BLANK, takeUid(state));
    zone.kind = 'reveal';
    zone.x = col + 0.5;
    zone.y = row + 0.5;
    zone.radiusSq = radius * radius;
    zone.ticksLeft = e.durationTicks;
    zone.abilitySlot = slot;
    return zone.uid;
  }
  return 0; // an untargeted effect opens nothing here (the caller handles slowAll and discount)
}

/** The stretch of one route a segment covers (`segmentSpan`). */
export interface SegmentSpan {
  /** The first and last route tile indices covered (`route.tiles[lo..hi]`, `hi − lo = 2 × reach`). */
  lo: number;
  hi: number;
  /** The covered route distance (tiles): padded by half a tile at each end, clamped to the route. */
  distFrom: number;
  distTo: number;
}

/**
 * The stretch of `route` a segment cast at tile (col, row) covers: the route's tile there
 * ±`reachTiles`, shifted inward at the route's ends so it keeps its length (D031), and padded by
 * half a tile at each end so it covers those tiles whole. Writes it into `out` and returns true,
 * or returns false (leaving `out` alone) when `route` is an air route or doesn't cross the tile.
 * The sim opens its zones with it, and the HUD's aiming preview draws exactly the same tiles.
 */
export function segmentSpan(
  route: CompiledRoute,
  col: number,
  row: number,
  reachTiles: number,
  out: SegmentSpan,
): boolean {
  if (route.kind === 'air') return false;
  const tiles = route.tiles;
  let at = -1;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]!; // i < length
    if (t[0] === col && t[1] === row) {
      at = i;
      break;
    }
  }
  if (at < 0) return false;
  const last = tiles.length - 1;
  const hi = Math.min(last, Math.max(at + reachTiles, 2 * reachTiles));
  const lo = Math.max(0, hi - 2 * reachTiles);
  out.lo = lo;
  out.hi = hi;
  out.distFrom = Math.max(0, route.cumLenTiles[lo]! - 0.5); // lo ≤ last
  out.distTo = Math.min(route.lengthTiles, route.cumLenTiles[hi]! + 0.5); // hi ≤ last
  return true;
}

/** Scratch for openSegments (no allocation per cast). */
const span: SegmentSpan = { lo: 0, hi: 0, distFrom: 0, distTo: 0 };

/**
 * Opens one segment zone per ground route (paths and rift lanes, in the map's route order) whose
 * tiles include (col, row), over its `segmentSpan`. Returns the first zone's uid, or 0 if no
 * ground route crosses the tile.
 */
function openSegments(
  state: SimState,
  ctx: TickContext,
  e: SegmentEffect,
  col: number,
  row: number,
  slot: 1 | 2,
): number {
  let first = 0;
  const routes = ctx.map.routeList;
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]!; // i < length
    if (!segmentSpan(route, col, row, e.reachTiles, span)) continue;
    const zone = poolAlloc(state.zones, ZONE_BLANK, takeUid(state));
    zone.kind = 'segment';
    zone.x = col + 0.5;
    zone.y = row + 0.5;
    zone.ticksLeft = e.durationTicks;
    zone.damage = e.damagePerSec;
    zone.damageType = e.type;
    zone.abilitySlot = slot;
    zone.route = route;
    zone.distFrom = span.distFrom;
    zone.distTo = span.distTo;
    zone.slowPct = e.slowPct;
    if (first === 0) first = zone.uid;
  }
  return first;
}

/**
 * An early wave call (core-loop §2.4) cuts every ability's remaining cooldown by `ticks`
 * (0.25 × the countdown's seconds left; the caller computes it). Never below 0.
 */
export function reduceAbilityCooldowns(state: SimState, ticks: number): void {
  const cds = state.abilityCooldownTicks;
  for (let i = 0; i < cds.length; i++) {
    const left = cds[i]! - ticks; // i < length
    cds[i] = left > 0 ? left : 0;
  }
}

export function abilities(state: SimState, ctx: TickContext): void {
  const cds = state.abilityCooldownTicks;
  for (let i = 0; i < cds.length; i++) {
    if (cds[i]! > 0) cds[i]!--; // i < length
  }
  if (waveStartedNow(state) > 0) {
    const waves = state.abilityCooldownWaves;
    for (let i = 0; i < waves.length; i++) {
      if (waves[i]! > 0) waves[i]!--; // i < length
    }
  }
  const zones = state.zones;
  for (let i = 0; i < zones.used; i++) {
    const z = zones.items[i]!; // i < used ≤ items.length
    // A trap (Underfoot) is the traps system's, after movement (abilities/underfoot.ts).
    if (!z.alive || z.abilitySlot === 0 || z.kind === 'trap') continue;
    if (z.kind === 'segment') {
      z.ticksLeft--;
      suppress(state, ctx, z, z.ticksLeft % SEGMENT_TICK_TICKS === 0);
      if (z.ticksLeft <= 0) poolKill(zones, z);
      continue;
    }
    if (z.kind === 'field') {
      z.ticksLeft--;
      dilate(state, z);
      if (z.ticksLeft <= 0) poolKill(zones, z);
      continue;
    }
    if (z.kind === 'reveal') {
      // Alive for detection on `durationTicks` ticks: the cast tick's and the ones after.
      if (z.ticksLeft <= 0) poolKill(zones, z);
      else z.ticksLeft--;
      continue;
    }
    if (z.ticksLeft > 0) {
      z.ticksLeft--;
      continue;
    }
    strike(state, ctx, z);
    poolKill(zones, z);
  }
}

/** Lands a strike: every live ground enemy within the radius, in ascending slot order. */
function strike(state: SimState, ctx: TickContext, z: Zone): void {
  const enemies = state.enemies;
  const victims = ctx.scratch.slots;
  victims.length = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    // Ground only: the strike isn't an air answer (rules.ts COUNTER_ANSWERS).
    if (!e.alive || e.def === null || e.def.layer === 'air') continue;
    const dx = e.x - z.x;
    const dy = e.y - z.y;
    if (dx * dx + dy * dy <= z.radiusSq) victims.push(i);
  }
  const source = SLOT_SOURCES[z.abilitySlot - 1]!; // abilitySlot is 1 or 2
  for (let k = 0; k < victims.length; k++) {
    const e = enemies.items[victims[k]!]!; // collected slots < used
    applyDamage(state, e, z.damage, z.damageType, source, PLAIN_HIT);
  }
  victims.length = 0;
}

/**
 * One tick of a segment: slows every live enemy on its stretch of its route (inclusive at both
 * ends), and on a damage tick hits each of them with one beam tick, in ascending slot order.
 */
function suppress(state: SimState, ctx: TickContext, z: Zone, damageTick: boolean): void {
  const enemies = state.enemies;
  const victims = ctx.scratch.slots;
  victims.length = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null || e.route !== z.route) continue;
    // Ground units only: Gerald flies the ground route but is an air unit (D072).
    if (e.def.layer === 'air') continue;
    if (e.dist < z.distFrom || e.dist > z.distTo) continue;
    // Out of reach (cloaked out, burrowed, Phased, or leaving; enemyAbilities/layers.ts): no
    // slow, and its damage tick would deal nothing (T507: the docs' reach rule, enemies.md § 2.6).
    if (untargetable(e)) continue;
    applyChill(e, z.slowPct, 1);
    if (damageTick) victims.push(i);
  }
  if (victims.length === 0) return;
  const source = SLOT_SOURCES[z.abilitySlot - 1]!; // abilitySlot is 1 or 2
  const amount = z.damage * DEFAULT_BEAM_TICK_SEC;
  for (let k = 0; k < victims.length; k++) {
    const e = enemies.items[victims[k]!]!; // collected slots < used
    applyDamage(state, e, amount, z.damageType, source, SEGMENT_HIT);
  }
  victims.length = 0;
}

/**
 * One tick of a field (Time Dilation): Chills every live enemy by its `slowPct` for this movement
 * tick (refreshed each tick, like a segment). Neutral units (Gerald) aren't enemies, so it passes
 * them by. A boss gets half through `applyChill`.
 */
function dilate(state: SimState, z: Zone): void {
  const enemies = state.enemies;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null || e.def.neutral) continue;
    applyChill(e, z.slowPct, 1);
  }
}
