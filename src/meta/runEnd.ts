// Run end (docs/tech/meta-runtime.md § Run end): a finished run folded into the save, in the
// documented order, plus a summary of what it paid for the results screen. Pure: it returns a new
// save (the input is untouched) and never reads the clock; the app writes the result to its slot.
import type { MapId, MedalId } from '../content/types.ts';
import {
  medalPayout,
  stardustPayout,
  type EarnedMedal,
  type StardustPayout,
} from './rewards.ts';
import type { MapRecord, SaveData } from './saveData.ts';

/** What a run end reads from the finished battle. */
export interface RunEndInput {
  readonly mapId: MapId;
  readonly outcome: 'won' | 'lost';
  /** The map's first-clear Stardust (`MapDef.stardust`). */
  readonly mapStardust: number;
  readonly waveCount: number;
  /** Waves resolved this run (all of them on a win). */
  readonly wavesResolved: number;
  /** The medals the sim settled as earned (`earnedMedalIds(state, map)`; D042). */
  readonly earnedMedals: readonly MedalId[];
  /** The run's `stats.skitterkinKilled`: this run's Pests Processed. */
  readonly skitterkinKilled: number;
  /** The final meter reading (integrity on a defend map). */
  readonly meter: number;
  /** Σ veteran Stardust bonuses (progression.md § 6). Default 0: veteran modifiers are M3+. */
  readonly veteranBonus?: number;
}

/** What a run end paid and recorded, for the results screen. */
export interface RunEndSummary {
  readonly outcome: 'won' | 'lost';
  /** The map was won before this run (a replay). */
  readonly wonBefore: boolean;
  readonly stardust: StardustPayout;
  /** The medals this run earned, in the sim's order; `isNew` ones paid Intel. */
  readonly medals: readonly EarnedMedal[];
  /** Intel paid in all (new medals; objectives join in M3). */
  readonly intel: number;
  /** This run's Pests Processed, and the lifetime total after it. */
  readonly pestsProcessed: { readonly run: number; readonly lifetime: number };
}

export interface RunEndResult {
  readonly save: SaveData;
  readonly summary: RunEndSummary;
}

function emptyRecord(): MapRecord {
  return { completed: false, medals: [], bestMeter: 0 };
}

/**
 * Ends a run: folds it into a copy of `save` in meta-runtime.md's order and says what it paid.
 * Steps not built yet are marked with their milestone.
 */
export function runEnd(save: SaveData, input: RunEndInput): RunEndResult {
  const won = input.outcome === 'won';
  const old = save.campaign.maps[input.mapId];
  const wonBefore = old?.completed === true;
  const kills = Math.max(0, input.skitterkinKilled);

  // 1. Pests Processed: every run counts, replays and losses included (core-loop.md § 6.2).
  const pestsProcessed = save.stats.pestsProcessed + kills;

  // 2. Story run-end flag rules: TODO(T206b) with the story flags (story-runtime.md § Flags).
  // 3. Revoked towers and abilities: TODO(M3) when a map script can revoke (A3M2).

  // 4. Medals: the sim settled them (D042). TODO(M3 checkpoints): a run with `usedCheckpoint` keeps
  //    Victory only.
  const heldMedals = old?.medals ?? [];
  const medals = won ? medalPayout(heldMedals, input.earnedMedals) : [];
  const record: MapRecord = {
    ...(old ?? emptyRecord()),
    completed: wonBefore || won,
    medals: [...heldMedals, ...medals.filter((m) => m.isNew).map((m) => m.id)],
    bestMeter: won
      ? Math.max(old?.bestMeter ?? 0, Math.max(0, input.meter))
      : (old?.bestMeter ?? 0),
  };

  // 5. Rewards (progression.md § 2–3). TODO(M3): objective Intel.
  const stardust = stardustPayout({
    won,
    wonBefore,
    stardust: input.mapStardust,
    wavesResolved: input.wavesResolved,
    waveCount: input.waveCount,
    veteranBonus: input.veteranBonus ?? 0,
  });
  const intel = medals.reduce((sum, m) => sum + m.intel, 0);

  // 6. The map's story transactions: TODO(M3) with the story runtime. The caller saves.
  const next: SaveData = {
    ...save,
    campaign: { maps: { ...save.campaign.maps, [input.mapId]: record } },
    currencies: {
      stardust: save.currencies.stardust + stardust.amount,
      intel: save.currencies.intel + intel,
    },
    stats: { pestsProcessed, runs: save.stats.runs + 1 },
  };
  return {
    save: next,
    summary: {
      outcome: input.outcome,
      wonBefore,
      stardust,
      medals,
      intel,
      pestsProcessed: { run: kills, lifetime: pestsProcessed },
    },
  };
}
