// Run end → the results screen's data (meta-runtime.md § Run end). M1 has no saves or meta, so a
// run end only builds the RunResult; adding the count to the lifetime counter waits for T201.
import { SPEAKERS, type RadioLine } from '../content/radio/index.ts';
import { TICK_HZ } from '../shared/time.ts';
import type { SpokenLine } from '../ui/state.ts';
import type { RunResult } from '../ui/screens/state.ts';
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

/** The results of a run that ended with `outcome`. */
export function runResultOf(input: RunEndInput, outcome: RunOutcome): RunResult {
  return {
    mapId: input.mapId,
    outcome,
    // A win resolves every wave, whatever the event count says (a forced test outcome included).
    wavesSurvived:
      outcome === 'won' ? input.waveCount : Math.min(input.wavesCleared, input.waveCount),
    waveCount: input.waveCount,
    integrity: Math.max(0, input.integrity),
    maxIntegrity: input.maxIntegrity,
    pestsProcessed: input.skitterkinKilled,
    debrief: debriefLines(input.radio, outcome, input.firstLeakAgo),
  };
}
