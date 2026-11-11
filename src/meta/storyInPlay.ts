// What the save's story changes in a battle (meta-runtime.md § Story transactions; D146): C4's
// effects in play (`C4_IN_PLAY`: Purge's −2 Everglow armor from A3M5 on, QUILL offline on A3M5
// under Rewrite), and the Technician abilities slot 1 can't hold on a map (its `lockedAbilities`
// whose condition holds over the run's flags: System Reboot on A3M5 under Rewrite). Pure;
// app/battleSetup.ts and the loadout screen read it.
import { CAMPAIGN_PLAN_IDS } from '../content/campaign.ts';
import type { CompiledMapDef } from '../content/compiled.ts';
import { flagConditionHolds } from '../content/flagConditions.ts';
import type { IdSpace } from '../content/types.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
import { gatedFlagDefaults } from '../sim/escort.ts';
import type { Modifier } from '../sim/index.ts';
import { evaluateCondition } from '../story/conditions.ts';
import { scriptFlagsOf } from '../story/flags.ts';
import type { SaveData } from './saveData.ts';
import { baseStoryContext } from './story.ts';
import { C4_IN_PLAY } from './storyTransactions.ts';

/**
 * Whether map `mapId` comes at or after `from` on the campaign plan. A map off the plan (a dev
 * battle) counts as after: it plays the save as it now stands.
 */
export function onOrAfter(mapId: string, from: string): boolean {
  if (!isCampaignMapId(mapId)) return true;
  const plan: readonly string[] = CAMPAIGN_PLAN_IDS;
  return plan.indexOf(mapId) >= plan.indexOf(from);
}

/** The modifiers the save's story adds to a battle on `mapId`: C4 Purge's armor, from A3M5 on. */
export function storyModifiers(mapId: string, save: SaveData): Modifier<IdSpace>[] {
  const purge = C4_IN_PLAY.purgeArmor;
  if (!onOrAfter(mapId, C4_IN_PLAY.from)) return [];
  if (!evaluateCondition(purge.when, baseStoryContext(save))) return [];
  return [{ ...purge.modifier }];
}

/**
 * Whether QUILL is offline on `mapId` (C4 Rewrite on A3M5; core-loop.md § 2.11): her barks and
 * radio slots silent, the threat intel `system`'s, no R&D tip at the base (presentation, T713).
 */
export function quillOffline(mapId: string, save: SaveData | null): boolean {
  const off = C4_IN_PLAY.quillOffline;
  return save !== null && mapId === off.map && evaluateCondition(off.when, baseStoryContext(save));
}

/** What `abilitiesOffOn` reads of a map: its locks, and what gates its flags' defaults. */
export type LockingMap = Pick<CompiledMapDef<IdSpace>, 'lockedAbilities' | 'escort' | 'builds'> &
  Partial<Pick<CompiledMapDef<IdSpace>, 'allies'>>;

/**
 * The Technician abilities slot 1 can't hold on `map` for `save`: each `lockedAbilities` row whose
 * condition holds (System Reboot on A3M5 under Rewrite). Judged as createSim judges it (D151), by
 * `flagConditionHolds` over the run's script flags: the save's, over the map's gated defaults
 * (`gatedFlagDefaults`), so the loadout never offers what the sim refuses.
 */
export function abilitiesOffOn(map: LockingMap, save: SaveData): string[] {
  const flags = gatedFlagDefaults(map, scriptFlagsOf(save.story.flags));
  return map.lockedAbilities.filter((l) => flagConditionHolds(l.when, flags)).map((l) => l.ability);
}
