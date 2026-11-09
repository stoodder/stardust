// Run-end rewards (design/progression.md § 2 Stardust, § 3 medal and objective Intel;
// meta-runtime.md § Run end step 5). Pure: what a run pays, given the map's record before the run. The payout rates are
// first-pass tuning values from progression.md; the anti-farming clauses are rules (D006).
import type { MedalId } from '../content/types.ts';

/** Payout rates (progression.md § 2–3). Story difficulty pays the same (§ 9: no penalty for comfort). */
export const REWARD_RULES = {
  /** A replay victory pays this share of the map's first-clear Stardust (× 1 + Σ veteran bonus). */
  replayShare: 0.4,
  /** A defeat on a map not yet won pays this share, scaled by the waves resolved. */
  defeatShare: 0.25,
  /** Intel for each medal, paid the first time it is earned. */
  medalIntel: 1,
} as const;

/** How the run's Stardust was earned (each a progression.md § 2 row). */
export type StardustSource =
  /** First victory on the map: its full `stardust`. */
  | 'first_clear'
  /** A victory on a map already won: the replay share. */
  | 'replay'
  /** A defeat on a map not yet won: the defeat share of the waves resolved. */
  | 'defeat'
  /** A defeat on a map already won: nothing (the anti-farming rule, D006). */
  | 'defeat_replay';

/** The run's Stardust, with what it was computed from (the Results breakdown reads it). */
export interface StardustPayout {
  readonly source: StardustSource;
  readonly amount: number;
  /** The map's first-clear `stardust`. */
  readonly base: number;
  /** Waves resolved this run, and the map's total (the defeat share's fraction). */
  readonly wavesResolved: number;
  readonly waveCount: number;
}

/** What the payout reads about the run and the map. */
export interface PayoutInput {
  readonly won: boolean;
  /** The map was won before this run. */
  readonly wonBefore: boolean;
  /** The map's first-clear Stardust (`MapDef.stardust`). */
  readonly stardust: number;
  readonly wavesResolved: number;
  readonly waveCount: number;
  /** Σ of the veteran modifiers' Stardust bonuses (progression.md § 6; 0 until they exist). */
  readonly veteranBonus: number;
}

/**
 * The run's Stardust (progression.md § 2). Rounded to whole Stardust.
 * TODO(M3 checkpoints): after a checkpoint retry, `wavesResolved` counts only the waves resolved
 * in this attempt from `resumedFromWave` on (D006); the caller passes that count once checkpoints
 * exist.
 */
export function stardustPayout(p: PayoutInput): StardustPayout {
  const waves = Math.max(0, Math.min(p.wavesResolved, p.waveCount));
  const base = { base: p.stardust, wavesResolved: waves, waveCount: p.waveCount };
  if (p.won && !p.wonBefore) return { source: 'first_clear', amount: p.stardust, ...base };
  if (p.won) {
    const amount = Math.round(REWARD_RULES.replayShare * p.stardust * (1 + p.veteranBonus));
    return { source: 'replay', amount, ...base };
  }
  if (p.wonBefore) return { source: 'defeat_replay', amount: 0, ...base };
  const share = p.waveCount > 0 ? waves / p.waveCount : 0;
  return {
    source: 'defeat',
    amount: Math.round(REWARD_RULES.defeatShare * p.stardust * share),
    ...base,
  };
}

/** A medal the run earned, and whether it is new to the save (only new ones pay Intel). */
export interface EarnedMedal {
  readonly id: MedalId;
  readonly isNew: boolean;
  /** Intel it paid: `medalIntel` when new, else 0. */
  readonly intel: number;
}

/** The run's medals against the ones the save already holds for the map (progression.md § 3). */
export function medalPayout(
  held: readonly MedalId[],
  earned: readonly MedalId[],
): readonly EarnedMedal[] {
  const out: EarnedMedal[] = [];
  for (const id of earned) {
    if (out.some((m) => m.id === id)) continue;
    const isNew = !held.includes(id);
    out.push({ id, isNew, intel: isNew ? REWARD_RULES.medalIntel : 0 });
  }
  return out;
}

/** An optional objective the run completed (the sim's `completedObjectiveIds`) and its Intel. */
export interface CompletedObjective {
  readonly id: string;
  /** The objective's `intel` (map data). */
  readonly intel: number;
}

/** An objective the run completed, and whether it is new to the save (only new ones pay Intel). */
export interface EarnedObjective {
  readonly id: string;
  readonly isNew: boolean;
  /** Intel it paid: the objective's `intel` when new, else 0. */
  readonly intel: number;
}

/**
 * The run's completed objectives against the ones the save already holds for the map
 * (progression.md § 3, Objective Intel): like a medal, each pays its Intel the first time.
 */
export function objectivePayout(
  held: readonly string[],
  completed: readonly CompletedObjective[],
): readonly EarnedObjective[] {
  const out: EarnedObjective[] = [];
  for (const o of completed) {
    if (out.some((x) => x.id === o.id)) continue;
    const isNew = !held.includes(o.id);
    out.push({ id: o.id, isNew, intel: isNew ? Math.max(0, Math.floor(o.intel)) : 0 });
  }
  return out;
}
