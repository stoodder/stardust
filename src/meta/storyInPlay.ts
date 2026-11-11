// What the save's story changes in a battle (meta-runtime.md § Story transactions; D146): C4's
// effects in play (`C4_IN_PLAY`: Purge's −2 Everglow armor from A3M5 on, QUILL offline on A3M5
// under Rewrite), and the Technician abilities slot 1 can't hold on a map (its `lockedAbilities`
// whose condition holds over the save's flags: System Reboot on A3M5 under Rewrite; and slot 2's
// own ability, so an inherited one never doubles its companion's). Pure; app/battleSetup.ts and
// the loadout screen read it.
import { CAMPAIGN_PLAN_IDS } from '../content/campaign.ts';
import type { ConditionDef, IdSpace } from '../content/types.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
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
  return (
    save !== null && mapId === off.map && evaluateCondition(off.when, baseStoryContext(save))
  );
}

/**
 * Whether a map condition holds over the save's script flags before the battle: its `flag` atoms
 * and `all`/`any`/`not` over them; every run atom (a stat, a leak, a tower count) is false, since
 * nothing has run yet.
 */
function flagsHold(cond: ConditionDef<IdSpace>, flags: Readonly<Record<string, unknown>>): boolean {
  if ('flag' in cond) return flags[cond.flag] === cond.eq;
  if ('all' in cond) return cond.all.every((c) => flagsHold(c, flags));
  if ('any' in cond) return cond.any.some((c) => flagsHold(c, flags));
  if ('not' in cond) return !flagsHold(cond.not, flags);
  return false;
}

/**
 * The Technician abilities slot 1 can't hold on `map` for `save`: each `lockedAbilities` row whose
 * condition holds over the save's flags (System Reboot on A3M5 under Rewrite), and slot 2's ability
 * (`slot2`), so an inherited companion ability never doubles its companion's.
 */
export function abilitiesOffOn(
  map: {
    readonly lockedAbilities: readonly {
      readonly ability: string;
      readonly when: ConditionDef<IdSpace>;
    }[];
  },
  save: SaveData,
  slot2: string | null = null,
): string[] {
  const flags: Readonly<Record<string, unknown>> = scriptFlagsOf(save.story.flags);
  const out = map.lockedAbilities.filter((l) => flagsHold(l.when, flags)).map((l) => l.ability);
  if (slot2 !== null && !out.includes(slot2)) out.push(slot2);
  return out;
}
