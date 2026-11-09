// System 5: abilities. Commander ability cooldowns and effects (design/core-loop.md §3; M1: Orbital
// Strike only, in slot 1). Enemy abilities join this system with their first enemy (M3+).
//
// - `applyAbilityCommand` (called by applyCommands) validates an `ability` command, puts the slot on
//   cooldown, and opens a strike zone at the target tile: the reticle the player sees.
// - Each tick, `abilities` counts the cooldowns down and resolves the zones. A strike lands exactly
//   `delayTicks` after the tick it was cast, before that tick's movement, and hits every ground
//   enemy whose center is within its radius (inclusive, like splash) through `applyDamage`. Its
//   victims are chosen before any damage lands.
// - Cooldowns run on sim time, so pausing doesn't advance them, and a strike aimed while paused
//   fires when play resumes (core-loop §3.1). An early wave call cuts them (`reduceAbilityCooldowns`).
import type { CompiledAbilityDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { applyDamage, PLAIN_HIT } from '../combat/damage.ts';
import type { Command, RejectReason } from '../commands.ts';
import { ZONE_BLANK, type Zone } from '../entities.ts';
import type { DamageSource } from '../events.ts';
import { tileIndex } from '../grid.ts';
import { poolAlloc, poolKill } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

type AbilityCommand = Extract<Command<IdSpace>, { type: 'ability' }>;

/** The damage source each slot's hits name (frozen constants, so resolving allocates nothing). */
const SLOT_SOURCES: readonly DamageSource[] = Object.freeze([
  Object.freeze({ kind: 'ability', slot: 1 } as const),
  Object.freeze({ kind: 'ability', slot: 2 } as const),
]);

/** The ability equipped in a slot, or null. M1 has slot 1 only; slot 2 is the companion (T207). */
export function abilityInSlot(ctx: TickContext, slot: 1 | 2): CompiledAbilityDef | null {
  // createSim refuses slot 2 until T207, so it is always empty here.
  const id = slot === 1 ? ctx.config.abilities.slot1 : null;
  return id === null ? null : (ctx.content.abilities[id] ?? null);
}

/**
 * Validates and applies an `ability` command: the slot holds an ability, it is off cooldown, and
 * its target is a tile on the map (any tile: a strike may land anywhere). Returns null on success,
 * else why it was rejected.
 */
export function applyAbilityCommand(
  state: SimState,
  ctx: TickContext,
  cmd: AbilityCommand,
): RejectReason | null {
  const def = abilityInSlot(ctx, cmd.slot);
  if (def === null) return 'noAbility';
  if ((state.abilityCooldownTicks[cmd.slot - 1] ?? 0) > 0) return 'abilityOnCooldown';
  const target = cmd.target;
  if (target === undefined || tileIndex(ctx.map, target[0], target[1]) < 0) return 'invalidTarget';

  const e = def.effect;
  const zone = poolAlloc(state.zones, ZONE_BLANK, takeUid(state));
  zone.x = target[0] + 0.5;
  zone.y = target[1] + 0.5;
  zone.radiusSq = e.radiusSq;
  zone.ticksLeft = e.delayTicks;
  zone.damage = e.damage;
  zone.damageType = e.type;
  zone.abilitySlot = cmd.slot;
  state.abilityCooldownTicks[cmd.slot - 1] = def.cooldownTicks;
  state.stats.abilityUses++;
  emit(state, {
    type: 'AbilityUsed',
    slot: cmd.slot,
    uid: zone.uid,
    ability: def.id,
    target: [target[0], target[1]],
  });
  return null;
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
  const zones = state.zones;
  for (let i = 0; i < zones.used; i++) {
    const z = zones.items[i]!; // i < used ≤ items.length
    if (!z.alive || z.abilitySlot === 0) continue;
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
