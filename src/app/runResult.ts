// Run end → the results screen's data (meta-runtime.md § Run end). The router reads the finished
// battle into a RunEndInput; app/save.ts folds it into the save in play (meta's runEnd) and returns
// what it paid; this module turns both into the results card's RunResult.
import { SPEAKERS, type RadioLine } from '../content/radio/index.ts';
import type { RunEndInput as MetaRunEndInput, RunEndSummary } from '../meta/index.ts';
import { TICK_HZ } from '../shared/time.ts';
import { PERFECT_CORE_MEDAL_ID, VICTORY_MEDAL_ID } from '../sim/index.ts';
import type { SpokenLine } from '../ui/state.ts';
import type { MedalResult, RunResult, RunRewards } from '../ui/screens/state.ts';
import type { RunOutcome } from './testHookTypes.ts';

/**
 * A first leak this recent (ms of real time) when the map ends puts its radio line on the results
 * card too (D028): the ticker may not have shown it yet, and it's the first darkness seed.
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
  /** The map's radio table (content/radio), for the debrief and the first-leak line. */
  readonly radio: readonly RadioLine[];
  /** From the battle's first leak to the map's end; null if nothing leaked. */
  readonly firstLeakAgo: LeakAgo | null;
  /** The map's first-clear Stardust (`MapDef.stardust`). */
  readonly stardust: number;
  /** The map's medals in display order, with their names (`offeredMedals`). */
  readonly medals: readonly MapMedal[];
  /** The medal ids the sim settled as earned (`earnedMedalIds`; D042). */
  readonly earnedMedals: readonly string[];
}

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
    skitterkinKilled: input.skitterkinKilled,
    meter: Math.max(0, input.integrity),
  };
}

/** meta's run end, as the results card shows it: every medal the map offers, and the payouts. */
export function runRewardsOf(input: RunEndInput, summary: RunEndSummary): RunRewards {
  const medals = input.medals.map((m): MedalResult => {
    const won = summary.medals.find((e) => e.id === m.id);
    return { id: m.id, name: m.name, earned: won !== undefined, isNew: won?.isNew ?? false };
  });
  const { source, amount, base, waveCount } = summary.stardust;
  return {
    medals,
    stardust: { source, amount, base, wavesResolved: summary.stardust.wavesResolved, waveCount },
    intel: summary.intel,
    lifetimePests: summary.pestsProcessed.lifetime,
  };
}

function spoken(l: RadioLine): SpokenLine {
  const look = SPEAKERS[l.speaker];
  return { name: look.name, color: look.color, text: l.text };
}

/**
 * The results card's spoken lines (D028): the `firstLeak` line when the first leak came within
 * FIRST_LEAK_RECENT_MS (and FIRST_LEAK_RECENT_TICKS) of the end, then the debrief (`mapWon` or
 * `mapLost` lines), in table order.
 */
export function debriefLines(
  radio: readonly RadioLine[],
  outcome: RunOutcome,
  firstLeakAgo: LeakAgo | null,
): SpokenLine[] {
  const recent =
    firstLeakAgo !== null &&
    firstLeakAgo.ms <= FIRST_LEAK_RECENT_MS &&
    firstLeakAgo.ticks <= FIRST_LEAK_RECENT_TICKS;
  const trigger = outcome === 'won' ? 'mapWon' : 'mapLost';
  return [
    ...(recent ? radio.filter((l) => l.on === 'firstLeak').slice(0, 1) : []),
    ...radio.filter((l) => l.on === trigger),
  ].map(spoken);
}

/**
 * The results of a run that ended with `outcome`; `summary` is what the save in play recorded
 * (null outside a campaign, so the card shows no rewards).
 */
export function runResultOf(
  input: RunEndInput,
  outcome: RunOutcome,
  summary: RunEndSummary | null = null,
): RunResult {
  return {
    mapId: input.mapId,
    outcome,
    wavesSurvived: wavesResolved(input, outcome),
    waveCount: input.waveCount,
    integrity: Math.max(0, input.integrity),
    maxIntegrity: input.maxIntegrity,
    pestsProcessed: input.skitterkinKilled,
    debrief: debriefLines(input.radio, outcome, input.firstLeakAgo),
    rewards: summary === null ? null : runRewardsOf(input, summary),
  };
}
