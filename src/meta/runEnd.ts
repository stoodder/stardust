// Run end (docs/tech/meta-runtime.md § Run end): a finished run folded into the save, in the
// documented order, plus a summary of what it paid for the results screen. Pure: it returns a new
// save (the input is untouched) and never reads the clock; the app writes the result to its slot.
import { FLAG_RULES, type FlagRule, type FlagSet } from '../content/dialogue/flags.ts';
import type { CodexId } from '../content/codex/index.ts';
import type { MemoId } from '../content/memos/index.ts';
import type { MapId, MedalId, TowerId } from '../content/types.ts';
import { runEndFlags, type FlagRuleStats } from '../story/flags.ts';
import { MAPS } from '../content/maps/index.ts';
import { withIssuedTowers } from './issued.ts';
import { isMapWon } from './progress.ts';
import {
  medalPayout,
  objectivePayout,
  stardustPayout,
  type CompletedObjective,
  type EarnedMedal,
  type EarnedObjective,
  type StardustPayout,
} from './rewards.ts';
import type { MapRecord, SaveData } from './saveData.ts';
import { enemiesMet, isEnemyId, withStoryUnlocks } from './story.ts';
import { clampCurrency } from './validate.ts';

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
  /**
   * The optional objectives the sim settled as done (`completedObjectiveIds`, with each one's
   * `intel` from map data; T304f). Paid on a win only. Default none.
   */
  readonly completedObjectives?: readonly CompletedObjective[];
  /** The run's `stats.skitterkinKilled`: this run's Pests Processed. */
  readonly skitterkinKilled: number;
  /** The final meter reading (integrity on a defend map). */
  readonly meter: number;
  /** Σ veteran Stardust bonuses (progression.md § 6). Default 0: veteran modifiers are M3+. */
  readonly veteranBonus?: number;
  /**
   * The run's `state.stats`, which the story run-end flag rules read (step 2). Without them no
   * rule is applied (unit tests of the other steps).
   */
  readonly stats?: FlagRuleStats;
  /**
   * The enemy types that actually spawned this run (its `EnemySpawned` events, in order; D097):
   * what step 8 adds to the seen list, so quitting before a wave never spends its NEW badge,
   * first bark, or codex entry. Without it, step 8 estimates them from the map's waves
   * (`enemiesMet`; tests and the results fixture).
   */
  readonly met?: readonly string[];
  /**
   * The run resumed from a checkpoint at least once (core-loop.md § 2.12): it still earns Victory
   * and the first-clear rewards but forfeits Perfect Core and the Challenge medal. Default false.
   * Not read yet: T305b applies the rule.
   */
  readonly usedCheckpoint?: boolean;
  /**
   * The wave of the checkpoint this attempt resumed from (the latest retry's), or null for an
   * attempt from wave 1. A defeat pays defeat Stardust only for the waves resolved beyond it
   * (progression.md § 2). Default null. Not read yet: T305b applies the rule.
   */
  readonly resumedFromWave?: number | null;
}

/**
 * The `story.seen` id that marks the first payday as shown (D097): the app adds it when a Results
 * card shows the payday, so a run that never reaches Results can't use it up.
 */
export const FIRST_PAYDAY_SEEN_ID = 'results_first_payday';

/**
 * `save` with FIRST_PAYDAY_SEEN_ID added when it has already won a map that pays Stardust (D098),
 * so a save from before the id existed (pre-M3, or an M3 build before D097) doesn't see FIRST
 * PAYDAY twice: every such win reached a payday under the rule of its day. Applied to every save
 * the app reads (decodeEnvelope: load and import). Never read from the bank, so a defeat stipend
 * still can't use the payday up. Returns `save` itself when nothing changes.
 */
export function withFirstPaydayCaughtUp(
  save: SaveData,
  maps: Readonly<Record<string, { readonly stardust: number }>> = MAPS,
): SaveData {
  if (save.story.seen.includes(FIRST_PAYDAY_SEEN_ID)) return save;
  const paid = Object.keys(maps).some((id) => maps[id]!.stardust > 0 && isMapWon(save, id));
  if (!paid) return save;
  return { ...save, story: { ...save.story, seen: [...save.story.seen, FIRST_PAYDAY_SEEN_ID] } };
}

/** What a run end paid and recorded, for the results screen. */
export interface RunEndSummary {
  readonly outcome: 'won' | 'lost';
  /** The map was won before this run (a replay). */
  readonly wonBefore: boolean;
  readonly stardust: StardustPayout;
  /**
   * The save's first payday (T235; D097): a win that pays Stardust while `story.seen` lacks
   * FIRST_PAYDAY_SEEN_ID, which the app adds once a Results card has shown it. Never read from the
   * bank balance, so an abandoned run's stipend can't use it up.
   */
  readonly firstPayday: boolean;
  /** The medals this run earned, in the sim's order; `isNew` ones paid Intel. */
  readonly medals: readonly EarnedMedal[];
  /** The objectives this run completed (on a win), in map order; `isNew` ones paid Intel. */
  readonly objectives: readonly EarnedObjective[];
  /** Intel paid in all: new medals and new objectives. */
  readonly intel: number;
  /** This run's Pests Processed, and the lifetime total after it. */
  readonly pestsProcessed: { readonly run: number; readonly lifetime: number };
  /** Story flags the run-end rules set (step 2); results never show them (C1 is silent). */
  readonly flags: FlagSet;
  /** Towers this run's win issued (meta/issued.ts), in issue order; empty on most runs. */
  readonly issued: readonly TowerId[];
  /** Memos this run delivered to the Inbox (step 8), in delivery order; usually the map's one. */
  readonly memos: readonly MemoId[];
  /** Codex entries with a version this run unlocked (step 8), in codex order. */
  readonly codex: readonly CodexId[];
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
 * Steps not built yet are marked with their milestone. `rules` are the story run-end flag rules
 * (tests pass their own).
 */
export function runEnd(
  save: SaveData,
  input: RunEndInput,
  rules: readonly FlagRule[] = FLAG_RULES,
): RunEndResult {
  const won = input.outcome === 'won';
  const old = save.campaign.maps[input.mapId];
  const wonBefore = old?.completed === true;
  const kills = Math.max(0, input.skitterkinKilled);

  // 1. Pests Processed: every run counts, replays and losses included (core-loop.md § 6.2).
  const pestsProcessed = save.stats.pestsProcessed + kills;

  // 2. Story run-end flag rules (story-runtime.md § Flags): only the run that first completes the
  //    map sets them (true or false); replays and losses leave them as they are.
  const flags: FlagSet =
    won && !wonBefore && input.stats !== undefined
      ? runEndFlags(input.mapId, input.stats, rules)
      : {};

  // 3. Revoked towers and abilities: TODO(M3) when a map script can revoke (A3M2; the sim has no
  //    `state.revoked` yet).

  // 4. Medals: the sim settled them (D042). TODO(M3 checkpoints): a run with `usedCheckpoint` keeps
  //    Victory only.
  const heldMedals = old?.medals ?? [];
  const medals = won ? medalPayout(heldMedals, input.earnedMedals) : [];
  // Optional objectives settle like medals: a win records each newly completed one (T304f).
  const heldObjectives = old?.objectives ?? [];
  const objectives = won ? objectivePayout(heldObjectives, input.completedObjectives ?? []) : [];
  const newObjectives = objectives.filter((o) => o.isNew).map((o) => o.id);
  const record: MapRecord = {
    ...(old ?? emptyRecord()),
    completed: wonBefore || won,
    medals: [...heldMedals, ...medals.filter((m) => m.isNew).map((m) => m.id)],
    bestMeter: won
      ? Math.max(old?.bestMeter ?? 0, Math.max(0, input.meter))
      : (old?.bestMeter ?? 0),
    ...(newObjectives.length > 0 ? { objectives: [...heldObjectives, ...newObjectives] } : {}),
  };

  // 5. Rewards (progression.md § 2–3): Stardust, then medal and objective Intel.
  const stardust = stardustPayout({
    won,
    wonBefore,
    stardust: input.mapStardust,
    wavesResolved: input.wavesResolved,
    waveCount: input.waveCount,
    veteranBonus: input.veteranBonus ?? 0,
  });
  const intel =
    medals.reduce((sum, m) => sum + m.intel, 0) + objectives.reduce((sum, o) => sum + o.intel, 0);

  // 6. The map's story transactions (meta-runtime.md § Story transactions): TODO(M3); no M2 map
  //    has one (the first is A2M4's Q3 Bonus). The caller saves.
  // 7. Towers the win issues for the next map (meta/issued.ts; the Sprinkler after A1M1).
  const folded: SaveData = {
    ...save,
    story: { ...save.story, flags: { ...save.story.flags, ...flags } },
    campaign: { ...save.campaign, maps: { ...save.campaign.maps, [input.mapId]: record } },
    currencies: {
      stardust: clampCurrency(save.currencies.stardust + stardust.amount),
      intel: clampCurrency(save.currencies.intel + intel),
    },
    stats: { pestsProcessed, runs: save.stats.runs + 1 },
  };
  const withTowers = withIssuedTowers(folded);
  const issued = withTowers.unlocks.towers.filter((t) => !folded.unlocks.towers.includes(t));
  // 8. Story unlocks (meta/story.ts): the enemies this run met join the seen list, the memos now
  //    due are delivered with their gifts, and the codex versions now unlocked are added. After
  //    step 7, so an issued tower's entry unlocks with it.
  const met = input.met ?? enemiesMet(input.mapId, won, input.wavesResolved);
  const story = withStoryUnlocks(withTowers, met.filter(isEnemyId));
  return {
    save: story.save,
    summary: {
      outcome: input.outcome,
      wonBefore,
      stardust,
      firstPayday: won && stardust.amount > 0 && !save.story.seen.includes(FIRST_PAYDAY_SEEN_ID),
      medals,
      objectives,
      intel,
      pestsProcessed: { run: kills, lifetime: pestsProcessed },
      flags,
      issued,
      memos: story.memos,
      codex: story.codex,
    },
  };
}
