// What an exempted counter's absence costs (T775; D150; content/types.ts `CounterExemption`). A map
// that exempts a required counter from harness #5 and #6 pins the cost in a balance unit test
// instead, and that test asserts it here (it throws): par's margin over the no-counter build's, at
// least `minPoints`, never under COUNTER_COST_MIN_POINTS. tools/counterExemptions.test.ts checks
// that every exemption's `pinnedBy` test calls this for its map and counter, so an exemption can't
// rest on a test that only runs the build.
import type { CounterExemption } from '../../content/types.ts';

/** The least cost (margin points under par) an exempted counter's absence may be pinned at. */
export const COUNTER_COST_MIN_POINTS = 10;

/** An exempted counter's cost on a map: par's margin and the no-counter build's (0 for a loss). */
export interface CounterCost {
  readonly map: string;
  readonly counter: CounterExemption['counter'];
  readonly par: number;
  readonly without: number;
  /** The cost this map pins (margin points), at least COUNTER_COST_MIN_POINTS. */
  readonly minPoints: number;
}

/** Asserts the no-counter build pays at least `minPoints` of margin against par (see the header). */
export function expectCounterCost(c: CounterCost): void {
  const at = `${c.map} without ${c.counter}`;
  if (!(c.minPoints >= COUNTER_COST_MIN_POINTS)) {
    throw new Error(`${at}: the pinned cost ${c.minPoints} is under ${COUNTER_COST_MIN_POINTS}`);
  }
  const paid = c.par - c.without;
  if (!(paid >= c.minPoints)) {
    throw new Error(`${at}: ${paid.toFixed(1)} margin points under par, expected ≥ ${c.minPoints}`);
  }
}
