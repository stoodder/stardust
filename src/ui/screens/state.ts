// View models for the full-screen menus (Title, Results). The router (app/router.ts) writes them;
// the screens read them and act through app/navigation.ts.
import { signal } from '@preact/signals';
import type { RunOutcome } from '../../app/testHookTypes.ts';
import type { SpokenLine } from '../state.ts';

/** A finished run, as the results screen shows it (built by app/runResult.ts at run end). */
export interface RunResult {
  readonly mapId: string;
  readonly outcome: RunOutcome;
  /** Waves resolved this run (all of them on a win). */
  readonly wavesSurvived: number;
  readonly waveCount: number;
  /** Core integrity left, and the map's starting integrity. */
  readonly integrity: number;
  readonly maxIntegrity: number;
  /**
   * Pests Processed: this run's `stats.skitterkinKilled`. M1 has no saves, so the lifetime counter
   * (design/core-loop.md §6.2) is the run's count until `meta/` lands (T201).
   */
  readonly pestsProcessed: number;
  /**
   * The card's spoken lines, in order (D028): the first leak's radio line if it was still fresh
   * when the map ended, then the map's debrief for this outcome. Empty for a map with no radio.
   */
  readonly debrief: readonly SpokenLine[];
}

/** The last finished run, or null before any run has ended. */
export const runResult = signal<RunResult | null>(null);
