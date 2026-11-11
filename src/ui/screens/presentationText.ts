// The screens' copy that reads the presentation dials (core-loop.md § 6.7; T410b): the Results
// card's kicker and headline per counter style, its counter as a screen reader hears it, and the
// Title's loading tip. Copy: story/style-guide.md § 2. DOM-free, so it's unit-tested.
import type { RunOutcome } from '../../app/testHookTypes.ts';
import type { CounterStyle } from '../../content/presentation.ts';
import { formatCount, type ResultsCounter } from '../../story/counter.ts';
import { loadingTip, presentationBetweenMaps, presentationFor } from '../../story/presentation.ts';
import type { SlotView } from './state.ts';

/**
 * The headline in Everglow's voice, the same in every act: the system's cheer never changes, only
 * what the player knows (style-guide.md § 3, *curdle by repetition*). A loss is never scolded: it
 * is a "minor operational hiccup", the euphemism dictionary's word for a catastrophe (story/races.md
 * § Everglow Dynamics).
 */
const HEADLINE: Readonly<Record<RunOutcome, string>> = {
  won: 'PERIMETER SECURED!',
  lost: 'MINOR OPERATIONAL HICCUP',
};

/**
 * Where the act's exclamation budget has run out (style-guide.md § 2: from Act III only Sterling and
 * Pebble exclaim; the finale's belong to Pebble, Sterling's last line, and the final lyric), the
 * system's cheer loses its "!" and keeps its words (*curdle by repetition*): Act III's and the
 * finale's card, by their counter styles.
 */
const NO_EXCLAMATION: ReadonlySet<CounterStyle> = new Set(['meter', 'remembered']);

/** Drops a trailing "!" where `style`'s act has no exclamations to spend ("!" becomes "."). */
function spent(style: CounterStyle, text: string): string {
  return NO_EXCLAMATION.has(style) && text.endsWith('!') ? `${text.slice(0, -1)}.` : text;
}

/**
 * The kicker above it, by the map's counter style (its presentation dial, core-loop.md § 6.7;
 * copy: style-guide.md § 2): Act I's report is "Exemplary!" (D026); from Act II the report is only
 * "Filed", the card's one cheer gone with the star. Act III's and the finale's cards (M6) read Act
 * II's until they're written.
 */
const KICKER: Readonly<Record<CounterStyle, Readonly<Record<RunOutcome, string>>>> = {
  starred: { won: 'Shift report · Exemplary!', lost: 'Shift report · Incident logged' },
  plain: { won: 'Shift report · Filed', lost: 'Shift report · Incident logged' },
  meter: { won: 'Shift report · Filed', lost: 'Shift report · Incident logged' },
  remembered: { won: 'Shift report · Filed', lost: 'Shift report · Incident logged' },
};

/** The card's kicker and headline for `outcome` in counter style `style`. */
export function resultsHeader(
  style: CounterStyle,
  outcome: RunOutcome,
): { kicker: string; headline: string } {
  return {
    kicker: spent(style, KICKER[style][outcome]),
    headline: spent(style, HEADLINE[outcome]),
  };
}

/** The marks on a medal or objective row: a first-time one, and one not earned this run. */
export interface MedalMarks {
  /** Beside a first-time medal or objective: "NEW!" (Acts I–II), "New" (Act III, the finale). */
  readonly new: string;
  /** In place of one not earned: "Next time!" (Acts I–II), "Next time." (Act III, the finale). */
  readonly nextTime: string;
}

/** The medal and objective rows' marks in counter style `style` (style-guide.md § 2). */
export function medalMarks(style: CounterStyle): MedalMarks {
  return NO_EXCLAMATION.has(style)
    ? { new: 'New', nextTime: 'Next time.' }
    : { new: 'NEW!', nextTime: 'Next time!' };
}

/** The counter as a screen reader hears it: Act I's brag after a comma, never the star. */
export function spokenCounter(c: ResultsCounter): string {
  return c.brag === null || c.n === null ? c.line : `${c.label} ${formatCount(c.n)}, ${c.brag}`;
}

/**
 * The Title's loading tip: from the presentation dials of the slot Continue would open (the Title
 * closes the campaign in play, so the slot is all it has): its next map's, or the post-game's once
 * the finale is won. With none, Act I's. The slot's maps won pick the tip from the act's pool, so
 * it stays put while the screen is up.
 */
export function titleTip(views: readonly SlotView[], continueFrom: 1 | 2 | 3 | null): string {
  const view = views.find((v) => v.slot === continueFrom);
  if (view === undefined || view.status !== 'ok') return loadingTip(presentationFor(null), 0);
  return loadingTip(presentationBetweenMaps(view.frontier), view.mapsWon);
}
