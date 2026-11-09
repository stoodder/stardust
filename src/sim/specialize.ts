// The `specialize` command: tier 3 → tier 4, choosing spec A or B (design/towers.md § 3.1). The
// choice is permanent for that tower in that map; another tower of the type can take the other.
// A tower's specs are offered only once its pair is unlocked (`SimConfig.specsUnlocked`; one R&D
// purchase unlocks both, design/progression.md § 7.1).
import { MAX_TIER_BEFORE_SPEC } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import type { Command, RejectReason } from './commands.ts';
import { pay } from './economy.ts';
import { poolFind } from './pool.ts';
import { emit, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';

type SpecializeCommand = Extract<Command<IdSpace>, { type: 'specialize' }>;

/**
 * Validates and applies a `specialize` command; returns null on success, else why it was
 * rejected, checked in this order: `noSuchTower`, `noSpecs` (the type has none authored, or the
 * command's spec key is neither 'a' nor 'b'),
 * `specLocked` (not in `specsUnlocked`), `alreadySpecialized`, `needsTier3`, `cantAfford`.
 *
 * On success it pays `pay(…, 'spec')` (Specialist's tier-4 discount; a Clearance Sale charge),
 * adds it to `invested` (the sell value's base), sets `spec`, tier 4, and its tier def, and sets
 * `state.linksDirty`. Bonuses don't depend on tier, so the new stats apply at once. Its cooldown
 * carries over, and a spin-up (Rivet Storm) starts from the top: the new barrels spin up even
 * mid-fight. A spec with its own default priority (Railspike's Strong) switches the tower to it;
 * otherwise the player's chosen priority stays. Emits TowerSpecialized.
 */
export function applySpecialize(
  state: SimState,
  ctx: TickContext,
  cmd: SpecializeCommand,
): RejectReason | null {
  const tower = poolFind(state.towers, cmd.towerUid);
  if (tower === null || tower.def === null) return 'noSuchTower';
  const def = tower.def;
  // A spec key other than 'a' or 'b' (a hand-built or replayed command) names no spec either.
  if (def.specs === null || (cmd.spec !== 'a' && cmd.spec !== 'b')) return 'noSpecs';
  if (!ctx.config.specsUnlocked.includes(def.id)) return 'specLocked';
  if (tower.spec !== null) return 'alreadySpecialized';
  if (tower.tier < MAX_TIER_BEFORE_SPEC) return 'needsTier3';
  const tier = def.specs[cmd.spec];
  const cost = pay(state, ctx.config.modifiers, def.id, tier.cost, 'spec');
  if (cost < 0) return 'cantAfford';

  const before = def.tiers[2].defaultPriority; // tier 3's
  tower.tier = MAX_TIER_BEFORE_SPEC + 1;
  tower.spec = cmd.spec;
  tower.tierDef = tier;
  tower.invested += cost;
  tower.spinTicks = tier.attack?.spinUpTicks ?? 0;
  if (tier.defaultPriority !== before) tower.priority = tier.defaultPriority;
  state.linksDirty = true;
  emit(state, { type: 'TowerSpecialized', uid: tower.uid, spec: cmd.spec, cost });
  return null;
}
