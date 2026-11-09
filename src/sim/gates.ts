// Feature gates: what createSim refuses until its task lands (architecture.md § Sim public API).
// D013's rule is "refuse, don't ignore": a config the sim can't simulate yet throws, so a run (or
// the balance harness) never silently plays a different game than its config describes.
//
// One row per feature, valued with the task that lifts it. That task sets its own row to `null`
// when its behavior is live (and never touches another row), so the sim tasks can land in any
// order without sharing more than one line of this file.
import type { IdSpace } from '../content/types.ts';
import type { EconomyStat, Modifier, SimConfig } from './config.ts';

/** A task id from tasks.md (`T202a`), or a later milestone (`M3`) for features with no M2 task. */
export type GateOwner = `T${number}${string}` | `M${number}`;

export type Feature =
  /** A companion (`SimConfig.companion`) and its ally post: the allies system. */
  | 'companion'
  /** Commander ability slot 2 (`abilities.slot2` / `slot2State`). */
  | 'abilitySlot2'
  /** A non-empty `specsUnlocked` (the `specialize` command). */
  | 'specs'
  /** `difficulty: 'story'` (its effects arrive as modifiers; this proves they're applied). */
  | 'storyDifficulty'
  | 'modifier.towerStat'
  | 'modifier.towerCost'
  | 'modifier.enemyStat'
  | 'modifier.economy.startCredits'
  | 'modifier.economy.coreIntegrity'
  | 'modifier.economy.bounty'
  | 'modifier.economy.earlyCallBonus'
  | 'modifier.economy.salvage'
  | 'modifier.economy.clearSpeed'
  | 'modifier.sellRefund'
  | 'modifier.abilityStat'
  | 'modifier.countdown'
  | 'modifier.linkBonus'
  | 'modifier.tileBonus'
  | 'modifier.leakAbsorb'
  | 'modifier.firstBuildFree'
  | 'modifier.freeCast';

/**
 * Refused features and the task that lifts each; `null` once it's simulated. Map-script refusals
 * (triggers, actions, `when` conditions) are separate: `unsupportedScript` in systems/triggers.ts.
 */
export const FEATURE_GATES: Readonly<Record<Feature, GateOwner | null>> = Object.freeze({
  companion: null,
  abilitySlot2: null,
  specs: 'T202b',
  storyDifficulty: 'T204b',
  'modifier.towerStat': null,
  'modifier.towerCost': null,
  // Applied at spawn (systems/waves.ts); Story difficulty needs it.
  'modifier.enemyStat': 'T204b',
  'modifier.economy.startCredits': null,
  'modifier.economy.coreIntegrity': null,
  'modifier.economy.bounty': null,
  'modifier.economy.earlyCallBonus': null,
  'modifier.economy.salvage': 'M3',
  'modifier.economy.clearSpeed': 'M3',
  'modifier.sellRefund': null,
  'modifier.abilityStat': null,
  // Applied by systems/waves.ts; Story difficulty needs it.
  'modifier.countdown': 'T204b',
  'modifier.linkBonus': null,
  'modifier.tileBonus': null,
  'modifier.leakAbsorb': null,
  'modifier.firstBuildFree': 'M3',
  'modifier.freeCast': 'M3',
});

/** The gate a modifier needs open. */
export function modifierFeature(m: Modifier<IdSpace>): Feature {
  return m.kind === 'economy' ? economyFeature(m.stat) : `modifier.${m.kind}`;
}

function economyFeature(stat: EconomyStat): Feature {
  return `modifier.economy.${stat}`;
}

/** What `cfg` uses that a closed gate refuses: one message per feature, in the order first used. */
export function gateRefusals(
  cfg: SimConfig<IdSpace>,
  gates: Readonly<Record<Feature, GateOwner | null>> = FEATURE_GATES,
): string[] {
  const used = new Map<Feature, string>();
  const use = (f: Feature, what: string): void => {
    if (!used.has(f)) used.set(f, what);
  };
  if (cfg.companion !== null) use('companion', `companion '${cfg.companion}'`);
  const { slot2, slot2State } = cfg.abilities;
  if (slot2 !== null || slot2State !== 'none') use('abilitySlot2', 'ability slot 2');
  if (cfg.specsUnlocked.length > 0) use('specs', 'tier-4 specializations');
  if (cfg.difficulty === 'story') use('storyDifficulty', 'Story difficulty');
  for (const m of cfg.modifiers) {
    const f = modifierFeature(m);
    use(f, `a '${f.slice('modifier.'.length)}' modifier (${m.source})`);
  }
  const out: string[] = [];
  for (const [f, what] of used) {
    const owner = gates[f];
    if (owner !== null) out.push(`${what} is not simulated until ${owner}`);
  }
  return out;
}
