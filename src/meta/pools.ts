// What a save can bring into a map (meta-runtime.md § Meta, Pools): the towers, Technician
// abilities, and Field Protocols the loadout screen (T201) offers, and the protocol slots.
// Owned minus revoked, in ownership order. A map's own exclusions (its `lockedAbilities` under the
// save's flags, A3M5's System Reboot under C4 Rewrite, and slot 2's ability; meta/storyInPlay.ts
// `abilitiesOffOn`) leave the ability pool when the caller passes them (T710).
import { ABILITIES } from '../content/abilities/index.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { AbilityId, ProtocolId, TowerId } from '../content/types.ts';
import { abilityRefusal, towerRefusal } from '../sim/gates.ts';
import { LIVE_CATALOG, protocolSlots, type MetaCatalog } from './modifiers.ts';
import { isSystemUnlocked, type MetaSystem } from './progress.ts';
import type { SaveData } from './saveData.ts';

/**
 * The towers the loadout can hold: owned and not revoked (A3M2 until the jailbreak), and played by
 * the sim today. A tower whose attack the sim still refuses (sim/gates.ts `towerRefusal`: Zapcoil
 * until T304b) stays out, so a save that runs ahead of the sim (the all_unlocked dev save) plays
 * rather than throws.
 */
export function towerPool(save: SaveData): TowerId[] {
  return save.unlocks.towers.filter(
    (t) => !save.unlocks.revokedTowers.includes(t) && towerRefusal(TOWERS[t]) === null,
  );
}

/**
 * The Technician abilities slot 1 can hold: owned, not revoked, played by the sim today, and not
 * among `off` (the map's exclusions, `abilitiesOffOn`).
 */
export function abilityPool(save: SaveData, off: readonly string[] = []): AbilityId[] {
  return save.unlocks.abilities.filter(
    (a) =>
      !save.unlocks.revokedAbilities.includes(a) &&
      !off.includes(a) &&
      abilityRefusal(ABILITIES[a]) === null,
  );
}

/** The Field Protocols the player can equip: every one owned. */
export function protocolPool(save: SaveData): ProtocolId[] {
  return [...save.unlocks.protocols];
}

/**
 * The Field Protocol slots a save has (design/progression.md § 5): none before Zibzab's shop
 * opens (after A1M3), then 1, plus R&D's slots 2 and 3.
 */
export function protocolSlotCount(
  save: SaveData,
  devUnlocks: readonly MetaSystem[] = [],
  catalog: MetaCatalog = LIVE_CATALOG,
): number {
  return isSystemUnlocked(save, 'shop', devUnlocks) ? protocolSlots(save.upgrades, catalog) : 0;
}
