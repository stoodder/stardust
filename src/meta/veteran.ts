// Veteran modifiers (design/progression.md § 6): the ids, their Stardust bonuses, and the Veteran
// medal's threshold, which a save's veteran records (`SaveData.veteran`) and the replay payout read.
// T800b's seam: the table and the record's shape. T860 builds the rest (each modifier's rule in the
// run's config, the briefing's picker, unlock on Victory, the medal, the star map's pip).

/** The eight modifiers, in progression.md § 6's order. */
export const VETERAN_MODIFIER_IDS = [
  'hardened_hides',
  'double_time',
  'lean_budget',
  'glass_core',
  'radio_silence',
  'short_handed',
  'no_protocols',
  'rush_hour',
] as const;
export type VeteranModifierId = (typeof VETERAN_MODIFIER_IDS)[number];

/** Each modifier's Stardust bonus on a replay victory, in percent (bonuses add). */
export const VETERAN_BONUS_PCT: Readonly<Record<VeteranModifierId, number>> = {
  hardened_hides: 40,
  double_time: 30,
  lean_budget: 30,
  glass_core: 40,
  radio_silence: 25,
  short_handed: 40,
  no_protocols: 15,
  rush_hour: 20,
};

/** A replay victory at this total bonus or more earns the Veteran medal (+1 Intel, once). */
export const VETERAN_MEDAL_PCT = 100;

/** The Veteran medal's id in a map record's `medals` (a fourth beside Victory, Perfect, Challenge). */
export const VETERAN_MEDAL_ID = 'veteran';

/** The total Stardust bonus of `mods`, in percent (each counted once). */
export function veteranBonusPct(mods: readonly VeteranModifierId[]): number {
  return [...new Set(mods)].reduce((sum, m) => sum + VETERAN_BONUS_PCT[m], 0);
}

/** The most bonus a run can carry: every modifier at once (240%). */
export const VETERAN_MAX_PCT = veteranBonusPct(VETERAN_MODIFIER_IDS);
