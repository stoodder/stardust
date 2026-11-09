// Run end → the results screen's data (meta-runtime.md § Run end). The router reads the finished
// battle into a RunEndInput; app/save.ts folds it into the save in play (meta's runEnd) and returns
// what it paid; this module turns both into the results card's RunResult.
import { barksFor, SCENES, SPEAKER_DEFS } from '../content/dialogue/index.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
import type { SpeakerId } from '../content/dialogue/types.ts';
import {
  baseStoryContext,
  type RunEndInput as MetaRunEndInput,
  type RunEndSummary,
  type SaveData,
} from '../meta/index.ts';
import { TICK_HZ } from '../shared/time.ts';
import { evaluateCondition, runContextOf, type StoryContext } from '../story/conditions.ts';
import type { FlagRuleStats } from '../story/flags.ts';
import { linesUntilChoice } from '../story/runner.ts';
import { resolveText, type TextContext } from '../story/text.ts';
import { PERFECT_CORE_MEDAL_ID, VICTORY_MEDAL_ID } from '../sim/index.ts';
import type { SpokenLine } from '../ui/state.ts';
import type { MedalResult, RunResult, RunRewards } from '../ui/screens/state.ts';
import { towerName } from './hudText.ts';
import type { RunOutcome } from './testHookTypes.ts';

/**
 * A first leak this recent (ms of real time) when the map ends puts its bark on the results card
 * too (D028): the comms panel may not have shown it yet, and it's the first darkness seed.
 */
export const FIRST_LEAK_RECENT_MS = 4000;
/**
 * The same window in sim ticks, at the fastest game speed (2×). Both must hold, so a leak long
 * ago in game time never counts as recent because time was fast-forwarded (a test, a debugger).
 */
export const FIRST_LEAK_RECENT_TICKS = (FIRST_LEAK_RECENT_MS / 1000) * TICK_HZ * 2;

/** How long before the map's end the first leak came: real ms and sim ticks. */
export interface LeakAgo {
  readonly ms: number;
  readonly ticks: number;
}

/** What a run end reads from the finished battle. */
export interface RunEndInput {
  readonly mapId: string;
  readonly waveCount: number;
  readonly maxIntegrity: number;
  readonly integrity: number;
  readonly skitterkinKilled: number;
  /** `WaveCleared` events seen this run. */
  readonly wavesCleared: number;
  /**
   * What the debrief reads (the save in play after the run's end: flags, seen, the profile);
   * absent outside a campaign, so lines read the flags' defaults and no profile.
   */
  readonly story?: DebriefStory;
  /** From the battle's first leak to the map's end; null if nothing leaked. */
  readonly firstLeakAgo: LeakAgo | null;
  /** The map's first-clear Stardust (`MapDef.stardust`). */
  readonly stardust: number;
  /** The map's medals in display order, with their names (`offeredMedals`). */
  readonly medals: readonly MapMedal[];
  /** The medal ids the sim settled as earned (`earnedMedalIds`; D042). */
  readonly earnedMedals: readonly string[];
  /** The optional objectives the sim settled as done, with their Intel (T304f; paid on a win). */
  readonly completedObjectives?: readonly { readonly id: string; readonly intel: number }[];
  /** The run's `state.stats`, for the story run-end flag rules (meta's runEnd, step 2). */
  readonly stats?: FlagRuleStats;
}

/** What the debrief's conditions and tokens read. `run` and `map` come from the run itself. */
export interface DebriefStory {
  readonly story: Omit<StoryContext, 'map' | 'run'>;
  readonly text: TextContext;
}

/** The debrief's story from the save in play (none outside a campaign). */
export function debriefStoryOf(save: SaveData | null): { story?: DebriefStory } {
  if (save === null) return {};
  const base = baseStoryContext(save);
  return {
    story: {
      story: { flags: base.flags, pestsProcessed: base.pestsProcessed, seen: base.seen },
      text: { profile: save.profile, pestsProcessed: base.pestsProcessed, evacuated: null },
    },
  };
}

const NO_STORY: DebriefStory = {
  story: { flags: {}, pestsProcessed: 0, seen: [] },
  text: { profile: null, pestsProcessed: 0, evacuated: null },
};

/** One of a map's medals: its save id and the name the results card shows. */
export interface MapMedal {
  readonly id: string;
  readonly name: string;
}

/** The names of the two medals every map has (design/progression.md § 3). */
export const MEDAL_NAMES = { victory: 'Victory', perfectCore: 'Perfect Core' } as const;

/**
 * A map's medals in display order (`mapMedalIds`' order): Victory, Perfect Core, and its Challenge
 * under the Challenge's own name.
 */
export function offeredMedals(map: {
  readonly medals: { readonly challenge: { readonly id: string; readonly name: string } } | null;
}): MapMedal[] {
  const out: MapMedal[] = [
    { id: VICTORY_MEDAL_ID, name: MEDAL_NAMES.victory },
    { id: PERFECT_CORE_MEDAL_ID, name: MEDAL_NAMES.perfectCore },
  ];
  if (map.medals !== null) {
    out.push({ id: map.medals.challenge.id, name: map.medals.challenge.name });
  }
  return out;
}

/** Waves resolved this run: all of them on a win, whatever the event count says. */
export function wavesResolved(input: RunEndInput, outcome: RunOutcome): number {
  return outcome === 'won' ? input.waveCount : Math.min(input.wavesCleared, input.waveCount);
}

/** What meta's run end reads from the battle (the map id is checked by app/save.ts recordRun). */
export function metaRunEndOf(
  input: RunEndInput,
  outcome: RunOutcome,
): Omit<MetaRunEndInput, 'mapId'> & { readonly mapId: string } {
  return {
    mapId: input.mapId,
    outcome,
    mapStardust: input.stardust,
    waveCount: input.waveCount,
    wavesResolved: wavesResolved(input, outcome),
    earnedMedals: input.earnedMedals,
    ...(input.completedObjectives === undefined
      ? {}
      : { completedObjectives: input.completedObjectives }),
    ...(input.stats === undefined ? {} : { stats: input.stats }),
    skitterkinKilled: input.skitterkinKilled,
    meter: Math.max(0, input.integrity),
  };
}

/** What app/save.ts `recordRun` adds to meta's summary (absent in tests of meta's alone). */
interface RecordStatus {
  readonly writeFailed?: string | null;
  readonly stardustNote?: string | null;
}

/** meta's run end, as the results card shows it: every medal the map offers, and the payouts. */
export function runRewardsOf(
  input: RunEndInput,
  summary: RunEndSummary & RecordStatus,
): RunRewards {
  const medals = input.medals.map((m): MedalResult => {
    const won = summary.medals.find((e) => e.id === m.id);
    return {
      id: m.id,
      name: m.name,
      earned: won !== undefined,
      isNew: won?.isNew ?? false,
      intel: won?.intel ?? 0,
    };
  });
  const { source, amount, base, waveCount } = summary.stardust;
  return {
    medals,
    stardust: { source, amount, base, wavesResolved: summary.stardust.wavesResolved, waveCount },
    intel: summary.intel,
    lifetimePests: summary.pestsProcessed.lifetime,
    issued: summary.issued.map(towerName),
    stardustNote: summary.stardustNote ?? null,
    saveNotice: summary.writeFailed ?? null,
  };
}

function spoken(speaker: SpeakerId, text: string, story: DebriefStory): SpokenLine {
  const def = SPEAKER_DEFS[speaker];
  return { name: def.name, color: def.color, text: resolveText(text, story.text) };
}

/**
 * The results card's spoken lines (D028): the map's `first_leak` bark when the first leak came
 * within FIRST_LEAK_RECENT_MS (and FIRST_LEAK_RECENT_TICKS) of the end and the bark could play
 * this run (its `when` holds; a once-per-campaign bark not already in the save's seen list), then
 * the map's `<map>_debrief` scene as the run's outcome plays it, up to any choice (T316's).
 */
export function debriefLines(
  input: Pick<RunEndInput, 'mapId' | 'firstLeakAgo' | 'stats' | 'story'>,
  outcome: RunOutcome,
): SpokenLine[] {
  const map = input.mapId;
  if (!isCampaignMapId(map)) return [];
  const story = input.story ?? NO_STORY;
  const run =
    input.stats === undefined
      ? { outcome, ruleFlags: {} }
      : runContextOf(map, outcome, input.stats);
  const ctx: StoryContext = { ...story.story, map, run };
  const ago = input.firstLeakAgo;
  const recent =
    ago !== null && ago.ms <= FIRST_LEAK_RECENT_MS && ago.ticks <= FIRST_LEAK_RECENT_TICKS;
  const leak = recent
    ? barksFor(map).find(
        (b) =>
          b.trigger.on === 'first_leak' &&
          !(b.once === 'campaign' && ctx.seen.includes(b.id)) &&
          (b.when === undefined || evaluateCondition(b.when, ctx)),
      )
    : undefined;
  const debrief = SCENES[`${map}_debrief`];
  return [
    ...(leak === undefined ? [] : [spoken(leak.speaker, leak.text, story)]),
    ...(debrief === undefined ? [] : linesUntilChoice(debrief, ctx)).map((l) =>
      spoken(l.speaker, l.text, story),
    ),
  ];
}

/**
 * The results of a run that ended with `outcome`; `summary` is what the save in play recorded
 * (null outside a campaign, so the card shows no rewards).
 */
export function runResultOf(
  input: RunEndInput,
  outcome: RunOutcome,
  summary: (RunEndSummary & RecordStatus) | null = null,
): RunResult {
  return {
    mapId: input.mapId,
    outcome,
    wavesSurvived: wavesResolved(input, outcome),
    waveCount: input.waveCount,
    integrity: Math.max(0, input.integrity),
    maxIntegrity: input.maxIntegrity,
    pestsProcessed: input.skitterkinKilled,
    debrief: debriefLines(input, outcome),
    rewards: summary === null ? null : runRewardsOf(input, summary),
  };
}
