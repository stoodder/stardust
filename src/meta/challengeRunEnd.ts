// A challenge map's run end (design/maps.md § 8; T862's maps, recorded since T803d). A challenge
// pays Intel for its medals (Victory, Perfect Core, its Challenge medal: 1 each, the first time)
// and never Stardust, and it never advances or alters the campaign: no story flags, no
// revocations, no story transactions, no issued towers, no memos or codex, no veteran bonus, no
// Pests Processed. What it keeps is the map's own record, in the campaign record's shape
// (`save.campaign.maps[ch_m0N]`: completed, the medals held, the best meter), which the post-game
// plate reads (app/postGameView.ts). The medal rules are the campaign's (meta/runEnd.ts step 4): a
// checkpoint retry keeps Victory only, and only a medal new to the save pays. Pure.
import type { MapId } from '../content/types.ts';
import { VICTORY_MEDAL_ID } from '../sim/medals.ts';
import { medalPayout, objectivePayout, stardustPayout } from './rewards.ts';
import type { RunEndInput, RunEndResult } from './runEnd.ts';
import type { MapRecord, SaveData } from './saveData.ts';
import { clampCurrency } from './validate.ts';

/**
 * Ends a challenge run: the map's record and the Intel its new medals (and objectives, if it ever
 * has any) pay, with the summary the results card reads. Stardust is always 0 (`mapStardust` is
 * ignored). Returns a new save; `save` is untouched.
 */
export function challengeRunEnd(
  save: SaveData,
  input: Omit<RunEndInput, 'mapId'> & { readonly mapId: MapId },
): RunEndResult {
  const won = input.outcome === 'won';
  const old: MapRecord | undefined = save.campaign.maps[input.mapId];
  const wonBefore = old?.completed === true;
  const heldMedals = old?.medals ?? [];
  const earned =
    input.usedCheckpoint === true
      ? input.earnedMedals.filter((m) => m === VICTORY_MEDAL_ID)
      : input.earnedMedals;
  const medals = won ? medalPayout(heldMedals, earned) : [];
  const heldObjectives = old?.objectives ?? [];
  const objectives = won ? objectivePayout(heldObjectives, input.completedObjectives ?? []) : [];
  const newObjectives = objectives.filter((o) => o.isNew).map((o) => o.id);
  const record: MapRecord = {
    ...(old ?? { completed: false, medals: [], bestMeter: 0 }),
    completed: wonBefore || won,
    medals: [...heldMedals, ...medals.filter((m) => m.isNew).map((m) => m.id)],
    bestMeter: won
      ? Math.max(old?.bestMeter ?? 0, Math.max(0, input.meter))
      : (old?.bestMeter ?? 0),
    ...(newObjectives.length > 0 ? { objectives: [...heldObjectives, ...newObjectives] } : {}),
  };
  const intel =
    medals.reduce((sum, m) => sum + m.intel, 0) + objectives.reduce((sum, o) => sum + o.intel, 0);
  // No Stardust, ever: the payout of a map that pays none (its source still says what the run was).
  const stardust = stardustPayout({
    won,
    wonBefore,
    stardust: 0,
    wavesResolved: input.wavesResolved,
    waveCount: input.waveCount,
    veteranBonus: 0,
    resumedFromWave: input.resumedFromWave ?? null,
  });
  const next: SaveData = {
    ...save,
    campaign: { ...save.campaign, maps: { ...save.campaign.maps, [input.mapId]: record } },
    currencies: { ...save.currencies, intel: clampCurrency(save.currencies.intel + intel) },
  };
  return {
    save: next,
    summary: {
      outcome: input.outcome,
      wonBefore,
      stardust,
      firstPayday: false,
      medals,
      objectives,
      intel,
      // The campaign's lifetime count is the campaign's: a challenge's kills don't join it.
      pestsProcessed: {
        run: Math.max(0, input.skitterkinKilled),
        lifetime: save.stats.pestsProcessed,
      },
      flags: {},
      issued: [],
      memos: [],
      codex: [],
      transactions: [],
      revocations: [],
    },
  };
}
