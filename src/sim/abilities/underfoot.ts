// Underfoot's trap (design/core-loop.md § 3.2: Bramble's; T604). The cast (systems/abilities.ts
// `applyAbilityCommand`, through `openTrap`) opens a `trap` zone on its target tile, which must be
// a tile of a ground route (a path or a rift lane, as Suppressing Fire's): else the cast is
// rejected (`invalidTarget`) and starts no cooldown. The zone lives `durationTicks` passes of this
// system from the cast's tick (6 s). Each pass, after movement, so a crossing is judged on this
// tick's step:
// - every live ground enemy (`layer` ground: a flyer never, even a pinned one or Gerald on the
//   ground path; neutral units never) whose centre is on the tile (within half a tile of its centre
//   on both axes) is sprung on, once per enemy per trap (`state.trapSprung` holds the pairs):
//   TrapSprung, then the hit (`damage` of its type, plain armor, through `applyDamage` credited to
//   the slot), then Pinned `pinTicks` (systems/status.ts `applyPin`: not on a unit already pinned
//   or immune; a boss takes Chilled 50% instead). On-hit statuses land after the damage.
// - It reaches burrowed units (combat/damage.ts `reachesBurrowed`; a Pin holds one underground),
//   but never a Phased, leaving, or cloaked-out unit.
// When the zone runs out it's freed and its pairs pruned.
import type { CompiledAbilityEffect, CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { applyDamage, type HitMods } from '../combat/damage.ts';
import { isNeutral } from '../combat/neutral.ts';
import { cloakedOut } from '../enemyAbilities/cloak.ts';
import { ZONE_BLANK, type Enemy, type Zone } from '../entities.ts';
import type { DamageSource } from '../events.ts';
import { poolAlloc, poolKill } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import { applyPin } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';

type PathTrapEffect = Extract<CompiledAbilityEffect, { kind: 'pathTrap' }>;

/** The trap's hit: plain armor, and it reaches a burrowed unit. */
const TRAP_HIT: HitMods = Object.freeze({
  armorPierce: 0,
  ignoresArmor: false,
  reachesBurrowed: true,
});

/** The damage source each slot's trap names (frozen, so springing allocates nothing). */
const SLOT_SOURCES: readonly DamageSource[] = Object.freeze([
  Object.freeze({ kind: 'ability', slot: 1 } as const),
  Object.freeze({ kind: 'ability', slot: 2 } as const),
]);

/** Whether tile (col, row) is a tile of any ground route (a path or a rift lane). */
export function onGroundRoute(map: CompiledMapDef<IdSpace>, col: number, row: number): boolean {
  const routes = map.routeList;
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]!; // i < length
    if (route.kind === 'air') continue;
    const tiles = route.tiles;
    for (let j = 0; j < tiles.length; j++) {
      const t = tiles[j]!; // j < length
      if (t[0] === col && t[1] === row) return true;
    }
  }
  return false;
}

/** Opens Underfoot's trap on tile (col, row) from `slot`; returns its uid, or 0 off the road. */
export function openTrap(
  state: SimState,
  ctx: TickContext,
  e: PathTrapEffect,
  col: number,
  row: number,
  slot: 1 | 2,
): number {
  if (!onGroundRoute(ctx.map, col, row)) return 0;
  const zone = poolAlloc(state.zones, ZONE_BLANK, takeUid(state));
  zone.kind = 'trap';
  zone.x = col + 0.5;
  zone.y = row + 0.5;
  zone.ticksLeft = e.durationTicks;
  zone.damage = e.damage;
  zone.damageType = e.type;
  zone.abilitySlot = slot;
  zone.pinTicks = e.pinTicks;
  return zone.uid;
}

/** Whether `e` crosses trap `z` now: a reachable ground enemy whose centre is on the tile. */
function crosses(z: Zone, e: Enemy): boolean {
  if (!e.alive || e.def === null || e.def.layer === 'air' || isNeutral(e)) return false;
  if (e.phased || e.leaving || cloakedOut(e)) return false;
  const dx = e.x - z.x;
  const dy = e.y - z.y;
  return dx <= 0.5 && dx >= -0.5 && dy <= 0.5 && dy >= -0.5;
}

/** Whether trap `zoneUid` has sprung on enemy `enemyUid` already. */
function sprung(pairs: readonly number[], zoneUid: number, enemyUid: number): boolean {
  for (let i = 0; i < pairs.length; i += 2) {
    if (pairs[i] === zoneUid && pairs[i + 1] === enemyUid) return true;
  }
  return false;
}

/** Drops trap `zoneUid`'s pairs, in place. */
function prune(pairs: number[], zoneUid: number): void {
  let w = 0;
  for (let r = 0; r < pairs.length; r += 2) {
    if (pairs[r] === zoneUid) continue;
    pairs[w++] = pairs[r]!; // r < length
    pairs[w++] = pairs[r + 1]!; // pairs come whole
  }
  pairs.length = w;
}

export function traps(state: SimState, _ctx: TickContext): void {
  const zones = state.zones;
  const enemies = state.enemies;
  const pairs = state.trapSprung;
  for (let i = 0; i < zones.used; i++) {
    const z = zones.items[i]!; // i < used ≤ items.length
    if (!z.alive || z.kind !== 'trap') continue;
    const source = SLOT_SOURCES[z.abilitySlot - 1]!; // abilitySlot is 1 or 2
    for (let j = 0; j < enemies.used; j++) {
      const e = enemies.items[j]!; // j < used ≤ items.length
      if (!crosses(z, e) || sprung(pairs, z.uid, e.uid)) continue;
      pairs.push(z.uid, e.uid);
      emit(state, { type: 'TrapSprung', zoneUid: z.uid, enemyUid: e.uid, x: e.x, y: e.y });
      applyDamage(state, e, z.damage, z.damageType, source, TRAP_HIT);
      if (e.alive) applyPin(e, z.pinTicks);
    }
    if (--z.ticksLeft <= 0) {
      poolKill(zones, z);
      prune(pairs, z.uid);
    }
  }
}
