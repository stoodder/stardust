// Pests Processed presentation (docs/design/core-loop.md § 6.2; docs/story/style-guide.md § 2;
// docs/design/maps.md § 5.5): the counter's number format, its live in-map value, the results
// line per act, and the finale's countdown display. Pure; the lifetime count itself is save data
// (meta adds a run's kills when it ends).
import type { StoryAct } from '../content/dialogue/types.ts';

/** A non-negative integer with comma thousands separators ("1,234,567"), locale-independent. */
export function formatCount(n: number): string {
  const whole = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** `{pests_processed}` inside a map: the save's lifetime count plus the run's kills so far. */
export function livePestsProcessed(lifetime: number, runKills: number): number {
  return lifetime + runKills;
}

/** An Act III map's meter, which replaces the counter on its results screen. */
export type ResultsMeter =
  | { readonly kind: 'evacuated' | 'sheltered'; readonly n: number }
  | { readonly kind: 'held' };

/** What the results screen shows for the counter. */
export interface ResultsCounter {
  /** The headline counter line. */
  readonly line: string;
  /** The lifetime line under it ("Career total: 1,234"), or null where the act hides it. */
  readonly career: string | null;
  /** Whether the cheerful star rating shows (Act I only). */
  readonly stars: boolean;
}

/**
 * The results counter for `act` (core-loop.md § 6.2): Act I "PESTS PROCESSED: {n} ★ Top 5% of
 * Technicians!" with stars and the career line; Act II "Pests processed: {n}." with the career
 * line and no stars; Act III the map's meter line ("Evacuated: {n}.", "Held.", "Sheltered: {n}.";
 * "Held." when the map has no meter) and nothing else; the finale "REMEMBERED: {n}" over the
 * lifetime count. `run` is this run's kills; `lifetime` the save's total after this run.
 */
export function resultsCounter(
  act: StoryAct,
  run: number,
  lifetime: number,
  meter: ResultsMeter | null = null,
): ResultsCounter {
  const career = `Career total: ${formatCount(lifetime)}`;
  switch (act) {
    case 1:
      return {
        line: `PESTS PROCESSED: ${formatCount(run)} ★ Top 5% of Technicians!`,
        career,
        stars: true,
      };
    case 2:
      return { line: `Pests processed: ${formatCount(run)}.`, career, stars: false };
    case 3:
      return { line: meterLine(meter), career: null, stars: false };
    case 'finale':
      return { line: `REMEMBERED: ${formatCount(lifetime)}`, career: null, stars: false };
  }
}

function meterLine(meter: ResultsMeter | null): string {
  if (meter === null || meter.kind === 'held') return 'Held.';
  const label = meter.kind === 'evacuated' ? 'Evacuated' : 'Sheltered';
  return `${label}: ${formatCount(meter.n)}.`;
}

/**
 * The finale's Phase 2 countdown (maps.md § 5.5): `round(N × (1 − restPoints / restTarget))`,
 * from the lifetime count `lifetime` at 0 rest down to 0 at the target. Progress is clamped to
 * [0, 1]; a target of 0 or less reads as done.
 */
export function countdownDisplay(lifetime: number, restPoints: number, restTarget: number): number {
  const p = restTarget > 0 ? Math.min(1, Math.max(0, restPoints / restTarget)) : 1;
  return Math.round(lifetime * (1 - p));
}
