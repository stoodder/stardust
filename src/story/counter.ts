// Pests Processed presentation (docs/design/core-loop.md § 6.2; docs/story/style-guide.md § 2;
// docs/design/maps.md § 5.5): the counter's number format, its live in-map value, the results
// line per counter style (the presentation dial, never the act; story/presentation.ts), and the
// finale's countdown display. Pure; the lifetime count itself is save data (meta adds a run's
// kills when it ends).
import type { CounterStyle } from '../content/presentation.ts';
import { assertNever } from '../shared/types.ts';

/** A non-negative integer with comma thousands separators ("1,234,567"), locale-independent. */
export function formatCount(n: number): string {
  const whole = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** `{pests_processed}` inside a map: the save's lifetime count plus the run's kills so far. */
export function livePestsProcessed(lifetime: number, runKills: number): number {
  return lifetime + runKills;
}

/**
 * An Act III map's meter, which replaces the counter on its results screen: an Escort's or a
 * Holdout's Evacuated count, A3M6's Sheltered, or A3M5's bearers carried home of the run's
 * (`carried`, with its `total`). ("Held." is the Holdout card's headline, never a meter line:
 * ui/screens/heldCard.ts.)
 */
export type ResultsMeter =
  | { readonly kind: 'evacuated' | 'sheltered'; readonly n: number }
  | { readonly kind: 'carried'; readonly n: number; readonly total: number };

/** What the results screen shows for the counter. */
export interface ResultsCounter {
  /** The whole headline counter line, as a screen reader hears it. */
  readonly line: string;
  /** The line's parts as the card draws them: the label, the number that counts up, the rest. */
  readonly label: string;
  /** The number the card counts up to, or null for a line with none. */
  readonly n: number | null;
  /**
   * What follows the number: "." (Act II, Act III's meter), " of {total}." (A3M5's Carried), or ""
   * (Act I, the finale).
   */
  readonly end: string;
  /** Act I's brag after a star ("Top 5% of Technicians!"), or null where the act has none. */
  readonly brag: string | null;
  /** The lifetime line under it ("Career total: 1,234"), or null where the act hides it. */
  readonly career: string | null;
  /** Whether the cheerful star rating shows (Act I only). */
  readonly stars: boolean;
}

/** Act I's brag: always true, and a lie nobody checks (core-loop.md § 6.2). */
export const ACT_ONE_BRAG = 'Top 5% of Technicians!';

/**
 * The results counter in the map's `counter` style (the presentation dial, core-loop.md § 6.2 and
 * § 6.7): `starred` (Act I) "PESTS PROCESSED: {n} ★ Top 5% of Technicians!" with stars and the
 * career line; `plain` (Act II) "Pests processed: {n}." with the career line and no stars; `meter`
 * (Act III) the map's meter line ("Evacuated: {n}.", "Sheltered: {n}.", A3M5's "Carried: {n} of
 * {total}.") and nothing else, or **no line at all** (null) on a map with no meter (a Defend map,
 * or a Protect map with no bearers: the counter is gone, and nothing stands in its place); `remembered` (the finale) "REMEMBERED: {n}" over the lifetime
 * count. `run` is this run's kills; `lifetime` the save's total after this run.
 */
export function resultsCounter(
  style: Exclude<CounterStyle, 'meter'>,
  run: number,
  lifetime: number,
): ResultsCounter;
export function resultsCounter(
  style: CounterStyle,
  run: number,
  lifetime: number,
  meter?: ResultsMeter | null,
): ResultsCounter | null;
export function resultsCounter(
  style: CounterStyle,
  run: number,
  lifetime: number,
  meter: ResultsMeter | null = null,
): ResultsCounter | null {
  const career = `Career total: ${formatCount(lifetime)}`;
  switch (style) {
    case 'starred':
      return {
        line: `PESTS PROCESSED: ${formatCount(run)} ★ ${ACT_ONE_BRAG}`,
        label: 'PESTS PROCESSED:',
        n: run,
        end: '',
        brag: ACT_ONE_BRAG,
        career,
        stars: true,
      };
    case 'plain':
      return {
        line: `Pests processed: ${formatCount(run)}.`,
        label: 'Pests processed:',
        n: run,
        end: '.',
        brag: null,
        career,
        stars: false,
      };
    case 'meter':
      return meter === null ? null : meterCounter(meter);
    case 'remembered':
      return {
        line: `REMEMBERED: ${formatCount(lifetime)}`,
        label: 'REMEMBERED:',
        n: lifetime,
        end: '',
        brag: null,
        career: null,
        stars: false,
      };
    default:
      return assertNever(style);
  }
}

/** The meter line's label by its kind. */
const METER_LABEL: Readonly<Record<ResultsMeter['kind'], string>> = {
  evacuated: 'Evacuated:',
  sheltered: 'Sheltered:',
  carried: 'Carried:',
};

/**
 * An Act III meter's line ("Evacuated: {n}."; A3M5's "Carried: {n} of {total}.", the bearers home
 * of the run's): no star, brag, or career line.
 */
export function meterCounter(meter: ResultsMeter): ResultsCounter {
  const label = METER_LABEL[meter.kind];
  const end = meter.kind === 'carried' ? ` of ${formatCount(meter.total)}.` : '.';
  return {
    line: `${label} ${formatCount(meter.n)}${end}`,
    label,
    n: meter.n,
    end,
    brag: null,
    career: null,
    stars: false,
  };
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
