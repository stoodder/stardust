// Run end → the results screen's data (meta-runtime.md § Run end). The router reads the finished
// battle into a RunEndInput; app/save.ts folds it into the save in play (meta's runEnd) and returns
// what it paid; this module turns both into the results card's RunResult.
import { barksFor, SCENES, SPEAKER_DEFS } from '../content/dialogue/index.ts';
import type { CampaignMapId } from '../content/campaign.ts';
import { resultsFlow } from '../content/dialogue/resultsFlow.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
import type { LineNode, SpeakerId } from '../content/dialogue/types.ts';
import {
  baseStoryContext,
  type RunEndInput as MetaRunEndInput,
  type RunEndSummary,
  type RunRevocations,
  type SaveData,
} from '../meta/index.ts';
import type { StoryAct } from '../content/dialogue/types.ts';
import type { Act, TowerId } from '../content/types.ts';
import { TICK_HZ } from '../shared/time.ts';
import {
  evaluateCondition,
  runContextOf,
  type RunContext,
  type StoryContext,
} from '../story/conditions.ts';
import type { FlagRuleStats } from '../story/flags.ts';
import { plateName } from '../story/plates.ts';
import { presentationOfMap } from '../story/presentation.ts';
import { linesUntilChoice, readThrough } from '../story/runner.ts';
import type { ResultsMeter } from '../story/counter.ts';
import { resolveText, type TextContext } from '../story/text.ts';
import { PERFECT_CORE_MEDAL_ID, VICTORY_MEDAL_ID } from '../sim/index.ts';
import type { SpokenLine } from '../ui/state.ts';
import type {
  MedalResult,
  ObjectiveResult,
  RunAsset,
  RunBearers,
  RunEscort,
  RunResult,
  RunRewards,
} from '../ui/screens/state.ts';
import { dialogueEnabled, setStoryRun, withSceneEffects } from './dialogue.ts';
import { towerName } from './hudText.ts';
import { perfectMedalName } from './hudViews.ts';
import { storyRewardsOf } from './resultsStory.ts';
import { activeSave, updateActiveSave } from './save.ts';
import { revocationView } from './storyMeta.ts';
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
  /**
   * The map's act (`MapDef.act`), which picks a non-campaign map's presentation dials (a dev
   * map's); a campaign map's come from its id (story/presentation.ts). Absent: Act I.
   */
  readonly act?: Act;
  readonly waveCount: number;
  readonly maxIntegrity: number;
  readonly integrity: number;
  /** A Protect map's asset meter at the end (T305a); absent on other maps. */
  readonly asset?: RunAsset;
  /**
   * The Escort meter at the end, when the map was an Escort as it ended (from the start or after
   * a pivot; T305c); absent otherwise. Its Evacuated count is run end's meter and `{evacuated}`.
   */
  readonly escort?: RunEscort;
  /**
   * The bearers as the map ended (A3M5; `sim/bearers.ts` `bearersCarried`): those home and lost of
   * the run's, for Act III's "Carried: {n} of {total}." line; absent on a map with none.
   */
  readonly bearers?: RunBearers;
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
  /**
   * The map's optional objectives in map order, with how the run left them (`state.objectives`;
   * T304f). The done ones pay their Intel on a win (meta's runEnd); Results lists them all (T316).
   */
  readonly objectives?: readonly RunObjective[];
  /** The run's `state.stats`, for the story run-end flag rules (meta's runEnd, step 2). */
  readonly stats?: FlagRuleStats;
  /**
   * The enemy types that spawned this run (`EnemySpawned`, in order; D097), for meta's seen list.
   * Absent: meta estimates them from the map's waves.
   */
  readonly met?: readonly string[];
  /**
   * The checkpoint wave this attempt resumed from (core-loop.md § 2.12; app/checkpoints.ts), or
   * null/absent for an attempt from wave 1. A resumed run forfeits Perfect Core and the Challenge,
   * and its defeat pays only the waves from it on (meta's runEnd). `skitterkinKilled` is then this
   * attempt's kills: the replayed ones were filed by the attempt that reached the checkpoint.
   */
  readonly resumedFromWave?: number | null;
  /** The latest checkpoint's wave, which a loss offers to retry from ("Retry from wave N"). */
  readonly checkpointWave?: number | null;
  /**
   * What the run's script revoked (the sim's `state.revoked`; app/storyMeta.ts `revokedAtEnd`):
   * meta's run end saves it on the run that first wins the map (step 3). Absent: nothing.
   */
  readonly revoked?: RunRevocations;
  /**
   * The tower type under Bricks's `{name}` plate as the map ended (A3M3; app/storyMeta.ts
   * `memorialAtEnd`), saved as `memorialTower` on the map's first win. Absent or null: none.
   */
  readonly memorialTower?: TowerId | null;
}

/** An optional objective as the run left it. */
export interface RunObjective {
  readonly id: string;
  readonly name: string;
  readonly intel: number;
  readonly status: 'open' | 'done' | 'failed';
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
      // The bank too: A2M4's debrief tests it for C2's `none` (after run end's Q3 Bonus).
      story: {
        flags: base.flags,
        pestsProcessed: base.pestsProcessed,
        seen: base.seen,
        ...(base.bank === undefined ? {} : { bank: base.bank }),
      },
      text: { profile: save.profile, pestsProcessed: base.pestsProcessed, evacuated: null },
    },
  };
}

const NO_STORY: DebriefStory = {
  story: { flags: {}, pestsProcessed: 0, seen: [] },
  text: { profile: null, pestsProcessed: 0, evacuated: null },
};

/**
 * What the card's lines read: the save's story (none outside a campaign), with `{evacuated}` the
 * run's Escort count (the map that just ended is "the current map"; null on other runs).
 */
export function debriefStory(input: Pick<RunEndInput, 'story' | 'escort'>): DebriefStory {
  const story = input.story ?? NO_STORY;
  const evacuated = input.escort?.evacuated ?? null;
  return evacuated === null ? story : { ...story, text: { ...story.text, evacuated } };
}

/** One of a map's medals: its save id and the name the results card shows. */
export interface MapMedal {
  readonly id: string;
  readonly name: string;
}

/** The names of the two medals every map has (design/progression.md § 3). */
export const MEDAL_NAMES = { victory: 'Victory', perfectCore: 'Perfect Core' } as const;

/**
 * A map's medals in display order (`mapMedalIds`' order): Victory, Perfect Core ("Perfect" on an
 * Escort, `perfectMedalName`; T613), and its Challenge under the Challenge's own name.
 */
export function offeredMedals(
  map: {
    readonly medals: { readonly challenge: { readonly id: string; readonly name: string } } | null;
  } & Parameters<typeof perfectMedalName>[0],
): MapMedal[] {
  const out: MapMedal[] = [
    { id: VICTORY_MEDAL_ID, name: MEDAL_NAMES.victory },
    { id: PERFECT_CORE_MEDAL_ID, name: perfectMedalName(map) },
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
    ...(input.objectives === undefined
      ? {}
      : {
          completedObjectives: input.objectives
            .filter((o) => o.status === 'done')
            .map((o) => ({ id: o.id, intel: o.intel })),
        }),
    ...(input.stats === undefined ? {} : { stats: input.stats }),
    ...(input.met === undefined ? {} : { met: input.met }),
    skitterkinKilled: input.skitterkinKilled,
    // The map's meter as it ended: an Escort's Evacuated count, else the core's integrity.
    meter: Math.max(0, input.escort?.evacuated ?? input.integrity),
    ...(input.resumedFromWave === undefined || input.resumedFromWave === null
      ? {}
      : { usedCheckpoint: true, resumedFromWave: input.resumedFromWave }),
    ...(input.revoked === undefined ? {} : { revoked: input.revoked }),
    ...(input.memorialTower === undefined ? {} : { memorialTower: input.memorialTower }),
  };
}

/**
 * Whether a card in act theme `theme` shows its Stardust as the warrens' gift stones (Act III and
 * the finale: progression.md § 1, "the warrens give it"; art-direction.md § 2's gift-stone icon).
 */
export function giftStones(theme: StoryAct): boolean {
  return theme === 3 || theme === 'finale';
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
  const objectives = (input.objectives ?? []).map((o): ObjectiveResult => {
    const paid = summary.objectives.find((e) => e.id === o.id);
    return {
      id: o.id,
      name: o.name,
      done: o.status === 'done',
      isNew: paid?.isNew ?? false,
      intel: paid?.intel ?? 0,
    };
  });
  const { source, amount, base, waveCount, fromWave } = summary.stardust;
  // The shop's note (set while the shop is locked) shows on the first payday only (T235).
  const note = summary.stardustNote ?? null;
  const firstPayday = summary.firstPayday && note !== null;
  return {
    medals,
    objectives,
    stardust: {
      source,
      amount,
      base,
      wavesResolved: summary.stardust.wavesResolved,
      waveCount,
      fromWave,
    },
    intel: summary.intel,
    lifetimePests: summary.pestsProcessed.lifetime,
    issued: summary.issued.map(towerName),
    stardustNote: firstPayday ? note : null,
    firstPayday,
    saveNotice: summary.writeFailed ?? null,
    ...storyRewardsOf(summary),
    revocations: summary.revocations.map(revocationView),
    stones: giftStones(presentationOfMap({ id: input.mapId, act: input.act ?? 1 }).theme),
  };
}

/**
 * A line as the card shows it: its speaker's name plate (on `map`, `plateName`: Bramble's from
 * A3M1; T613) and color, its tokens resolved.
 */
export function spoken(
  speaker: SpeakerId,
  text: string,
  story: DebriefStory,
  map: CampaignMapId | null = null,
): SpokenLine {
  const def = SPEAKER_DEFS[speaker];
  const name = plateName(speaker, { ...story.story, map, run: null });
  return { name, color: def.color, text: resolveText(text, story.text) };
}

/**
 * What the card's story reads: the save as the run left it, and the run itself (`outcome`, and
 * `thisRun` over its stats).
 */
export function runStoryContext(
  map: CampaignMapId,
  input: Pick<RunEndInput, 'stats' | 'story'>,
  outcome: RunOutcome,
): StoryContext {
  return { ...(input.story ?? NO_STORY).story, map, run: runOf(map, input.stats, outcome) };
}

/** The run that ended (`outcome`, and `thisRun` over its stats when it has them). */
function runOf(
  map: CampaignMapId,
  stats: FlagRuleStats | undefined,
  outcome: RunOutcome,
): RunContext {
  return stats === undefined ? { outcome, ruleFlags: {} } : runContextOf(map, outcome, stats);
}

/**
 * The card's story stamps (core-loop.md § 6.2), as stamped: the map's `stamps` whose `when` holds
 * over this run (content/dialogue/resultsFlow.ts), so a replay shows what that run did.
 */
export function resultStamps(
  input: Pick<RunEndInput, 'mapId' | 'stats' | 'story'>,
  outcome: RunOutcome,
): string[] {
  const map = input.mapId;
  if (!isCampaignMapId(map)) return [];
  const ctx = runStoryContext(map, input, outcome);
  return (resultsFlow(map).stamps ?? [])
    .filter((s) => evaluateCondition(s.when, ctx))
    .map((s) => s.text);
}

/**
 * The results card's spoken lines (D028): the map's `first_leak` bark when the first leak came
 * within FIRST_LEAK_RECENT_MS (and FIRST_LEAK_RECENT_TICKS) of the end and the bark could play
 * this run (its `when` holds; a once-per-campaign bark not already in the save's seen list), then
 * the map's `<map>_debrief` scene as the run's outcome plays it, up to any choice (a debrief's
 * choice isn't played yet; the first is A2M4's C2), unless a win plays it as a scene before the
 * card (`debriefAsScene`, while dialogue plays).
 */
export function debriefLines(
  input: Pick<RunEndInput, 'mapId' | 'firstLeakAgo' | 'stats' | 'story' | 'escort'>,
  outcome: RunOutcome,
): SpokenLine[] {
  const map = input.mapId;
  if (!isCampaignMapId(map)) return [];
  const story = debriefStory(input);
  const ctx = runStoryContext(map, input, outcome);
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
  // A win whose debrief plays as a scene before the card (D138: A2M6) doesn't repeat it there;
  // with dialogue off (no scene plays) the card keeps it.
  const asScene =
    outcome === 'won' && resultsFlow(map).debriefAsScene === true && dialogueEnabled();
  const debrief = asScene ? undefined : SCENES[`${map}_debrief`];
  return [
    ...(leak === undefined ? [] : [spoken(leak.speaker, leak.text, story, map)]),
    ...(debrief === undefined ? [] : linesUntilChoice(debrief, ctx)).map((l) =>
      spoken(l.speaker, l.text, story, map),
    ),
  ];
}

/**
 * The lines a won run plays on the comms panel during the results hold (D098), before the map's
 * before-Results scenes: its debrief as this run plays it (`linesUntilChoice`), on a map whose
 * results flow asks for it (`debriefOnHold`: A1M5, Bricks's C1 reaction). None otherwise.
 */
export function holdLines(
  input: Pick<RunEndInput, 'mapId' | 'stats' | 'story'>,
  outcome: RunOutcome,
): LineNode[] {
  const map = input.mapId;
  if (outcome !== 'won' || !isCampaignMapId(map) || resultsFlow(map).debriefOnHold !== true) {
    return [];
  }
  const debrief = SCENES[`${map}_debrief`];
  return debrief === undefined
    ? []
    : linesUntilChoice(debrief, runStoryContext(map, input, outcome));
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
  // The card's tone is the map's presentation dials (core-loop.md § 6.7): its counter and theme.
  const dials = presentationOfMap({ id: input.mapId, act: input.act ?? 1 });
  return {
    mapId: input.mapId,
    outcome,
    counter: dials.counter,
    theme: dials.theme,
    wavesSurvived: wavesResolved(input, outcome),
    waveCount: input.waveCount,
    integrity: Math.max(0, input.integrity),
    maxIntegrity: input.maxIntegrity,
    asset:
      input.asset === undefined ? null : { ...input.asset, value: Math.max(0, input.asset.value) },
    pestsProcessed: input.skitterkinKilled,
    debrief: debriefLines(input, outcome),
    stamps: resultStamps(input, outcome),
    rewards: summary === null ? null : runRewardsOf(input, summary),
    resumedFromWave: input.resumedFromWave ?? null,
    // "Retry from wave N" (core-loop.md § 2.12): a loss offers the run's latest checkpoint.
    retryFromWave: outcome === 'lost' ? (input.checkpointWave ?? null) : null,
    escort: input.escort ?? null,
    meter: meterOf(input),
    // The debrief's choice (C2) is app/resultsFlow.ts's `withResultsChoice`, over the save in play.
    choice: null,
    // A3M3's Holdout plays the card identically at any score: its rewards wait for the base.
    heldRewards: dials.holdRewardToasts,
  };
}

/**
 * The run's meter for the card's `meter` counter line (core-loop.md § 6.2): an Escort's or a
 * Holdout's Evacuated count (Sheltered on A3M6), the bearers carried home of the run's (A3M5), or
 * null on a map with no meter (Defend, a Protect map with no bearers).
 */
export function meterOf(input: Pick<RunEndInput, 'escort' | 'bearers'>): ResultsMeter | null {
  const e = input.escort;
  if (e !== undefined) return { kind: e.kind, n: e.evacuated };
  const b = input.bearers;
  return b === undefined ? null : { kind: 'carried', n: b.home, total: b.total };
}

/** One of the card's stat rows under the headline: "Waves survived 12 / 12". */
export interface ResultsStat {
  /** The row's id (its smoke test id is `results-<id>`). */
  readonly id: 'waves' | 'integrity' | 'escort' | 'asset';
  readonly label: string;
  readonly value: string;
  /** A quieter aside after the value (" · lost 11"), or null. */
  readonly note: string | null;
}

/**
 * The card's stat rows (core-loop.md § 6.2): the waves, then the map's meter as it ended. A map
 * that ended as an Escort (from the start, or after a pivot like A2M5's) lists its meter in Core
 * integrity's place, as the HUD did ("Evacuated 25 / 36 · lost 11"; the lost count only when one
 * was lost); a Protect map's asset joins the core.
 */
export function resultsStats(
  r: Pick<
    RunResult,
    'wavesSurvived' | 'waveCount' | 'integrity' | 'maxIntegrity' | 'escort' | 'asset'
  >,
): ResultsStat[] {
  const out: ResultsStat[] = [
    {
      id: 'waves',
      label: 'Waves survived',
      value: `${r.wavesSurvived} / ${r.waveCount}`,
      note: null,
    },
  ];
  const { escort, asset } = r;
  if (escort === null) {
    out.push({
      id: 'integrity',
      label: 'Core integrity',
      value: `${r.integrity} / ${r.maxIntegrity}`,
      note: null,
    });
  } else {
    out.push({
      id: 'escort',
      label: escort.label,
      value: `${escort.evacuated} / ${escort.total}`,
      note: escort.lost > 0 ? `lost ${escort.lost}` : null,
    });
  }
  if (asset !== null) {
    out.push({
      id: 'asset',
      label: asset.name,
      value: `${asset.value} / ${asset.max}`,
      note: null,
    });
  }
  return out;
}

/**
 * Whether the card's counter line would only repeat a stat row (D143 R13): Act III's meter line
 * ("Evacuated: 30.") under the Escort's row ("Evacuated 30 / 30"), the same label and count, with
 * no career line of its own. The card then drops the counter line; the row says it.
 */
export function counterRepeatsStat(
  counter: { readonly label: string; readonly n: number | null; readonly career: string | null },
  rows: readonly ResultsStat[],
): boolean {
  if (counter.career !== null) return false;
  const label = counter.label.replace(/:$/, '').trim().toLowerCase();
  return rows.some(
    (r) =>
      r.label.trim().toLowerCase() === label && Number(r.value.split('/')[0]?.trim()) === counter.n,
  );
}

/**
 * The save after a run's debrief (T413): a **won** run applies what its `<map>_debrief` does as
 * this run plays it (`readThrough`: its `set` nodes up to any choice; A2M2's Thorn callsign) and
 * marks it seen, once a campaign: a debrief already in `story.seen` changes nothing, so a replay
 * (or a later win after a checkpoint retry) never takes back a later callsign. A loss applies
 * nothing. Reads the save as the run left it (meta's run end applied), like the card's lines.
 */
export function withDebriefEffects(
  save: SaveData,
  input: Pick<RunEndInput, 'mapId' | 'stats'>,
  outcome: RunOutcome,
): SaveData {
  const map = input.mapId;
  if (outcome !== 'won' || !isCampaignMapId(map)) return save;
  const id = `${map}_debrief`;
  const debrief = SCENES[id];
  if (debrief === undefined || save.story.seen.includes(id)) return save;
  const story = debriefStoryOf(save).story ?? NO_STORY;
  const ctx: StoryContext = { ...story.story, map, run: runOf(map, input.stats, outcome) };
  return withSceneEffects(save, id, readThrough(debrief, ctx).cursor.effects);
}

/**
 * The story side of a run's end, once Results' lines are read (router `endRun`): the won
 * debrief's effects go into the save in play (`withDebriefEffects`), and the scenes around
 * Results read this run (`outcome`, `thisRun`; T329) until the next battle starts.
 */
export function endRunStory(
  input: Pick<RunEndInput, 'mapId' | 'stats'>,
  outcome: RunOutcome,
): void {
  const map = input.mapId;
  setStoryRun(isCampaignMapId(map) ? runOf(map, input.stats, outcome) : null);
  const save = activeSave();
  if (save === null) return;
  const next = withDebriefEffects(save, input, outcome);
  if (next !== save) updateActiveSave(() => next);
}
