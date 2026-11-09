// Run end → the results screen's data (meta-runtime.md § Run end). M1 has no saves or meta, so a
// run end only builds the RunResult; adding the count to the lifetime counter waits for T201.
import type { RunResult } from '../ui/screens/state.ts';
import type { RunOutcome } from './testHookTypes.ts';

/** What a run end reads from the finished battle. */
export interface RunEndInput {
  readonly mapId: string;
  readonly waveCount: number;
  readonly maxIntegrity: number;
  readonly integrity: number;
  readonly skitterkinKilled: number;
  /** `WaveCleared` events seen this run. */
  readonly wavesCleared: number;
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
  };
}
