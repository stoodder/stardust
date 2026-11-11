// The Holdout's Results card (act3.md § A3M3; design/core-loop.md § 6.2; T614): after the SEAL the
// card reads **Held.** with the sub-line **Evacuated: {n}.** and nothing else: no kicker, stats,
// counter, payroll (its rewards are held for the base, `heldRewards`), stamps, or debrief, and only
// the way on (Continue). DOM-free, so it's unit-tested; Results.tsx draws it.
import { meterCounter } from '../../story/counter.ts';
import type { RunResult } from './state.ts';

/** The card's words. */
export interface HeldCard {
  readonly headline: string;
  readonly line: string;
}

/** The Held card for `r`, or null for any other card: a won run that ended as a Holdout. */
export function heldCard(r: Pick<RunResult, 'outcome' | 'escort'>): HeldCard | null {
  const e = r.escort;
  if (r.outcome !== 'won' || e === null || e.holdout !== true) return null;
  return {
    headline: 'Held.',
    line: meterCounter({ kind: e.kind, n: e.evacuated }).line,
  };
}
