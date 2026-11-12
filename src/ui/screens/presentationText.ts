// The screens' copy that reads the presentation dials (core-loop.md § 6.7; T410b): the Results
// card's kicker and headline per counter style, its counter as a screen reader hears it, and the
// Title's loading tip. Copy: story/style-guide.md § 2. DOM-free, so it's unit-tested.
import type { RunOutcome } from '../../app/testHookTypes.ts';
import type { CounterStyle } from '../../content/presentation.ts';
import { formatCount, type ResultsCounter } from '../../story/counter.ts';
import {
  exclamationsSpent,
  loadingTip,
  presentationBetweenMaps,
  presentationFor,
} from '../../story/presentation.ts';
import type { ResultsTransaction, SlotView } from './state.ts';

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
 * Drops a trailing "!" where `style`'s act has no exclamations to spend ("!" becomes ".";
 * story/presentation.ts `exclamationsSpent`): the system's cheer loses its "!" and keeps its
 * words (*curdle by repetition*), on Act III's and the finale's card.
 */
function spent(style: CounterStyle, text: string): string {
  return exclamationsSpent(style) && text.endsWith('!') ? `${text.slice(0, -1)}.` : text;
}

/**
 * The kicker above it, by the map's counter style (its presentation dial, core-loop.md § 6.7;
 * copy: style-guide.md § 2): Act I's report is "Exemplary!" (D026); from Act II the report is only
 * "Filed", the card's one cheer gone with the star; in Act III nobody files it any more: the report
 * is "Auto-filed", a win's and a loss's alike (the headline still tells them apart). The finale's
 * card follows Act III's until M8 writes its own.
 */
const ACT_THREE_KICKER: Readonly<Record<RunOutcome, string>> = {
  won: 'Shift report · Auto-filed',
  lost: 'Shift report · Auto-filed',
};
const KICKER: Readonly<Record<CounterStyle, Readonly<Record<RunOutcome, string>>>> = {
  starred: { won: 'Shift report · Exemplary!', lost: 'Shift report · Incident logged' },
  plain: { won: 'Shift report · Filed', lost: 'Shift report · Incident logged' },
  meter: ACT_THREE_KICKER,
  remembered: ACT_THREE_KICKER,
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

/**
 * The finale's win headline (D156): the counter as Dawn left it. The first REMEMBERED is the
 * epilogue's flip (epilogue.ts `COUNTER_ZERO` flips from this same line).
 */
export const FINALE_HEADLINE = 'PESTS PROCESSED: 0';

/** The campaign's last map: its win is the card's last beat (T810, T803e). */
export const FINALE_MAP = 'fin_m01';

/**
 * Whether the card's headline is the counter instead of Everglow's cheer: the finale's win (T810,
 * D156: `FINALE_HEADLINE`, the counter at 0 as Dawn left it), where the system has nothing left to
 * say. No counter line repeats under it. Only the finale's own map: a
 * post-game challenge in the finale's dials keeps the cheer, its count the counter line (T803e).
 * That card is also the campaign's last beat, so its way on is Continue alone.
 */
export function counterIsHeadline(style: CounterStyle, outcome: RunOutcome, map: string): boolean {
  return style === 'remembered' && outcome === 'won' && map === FINALE_MAP;
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
  return exclamationsSpent(style)
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

/**
 * A companion ability's handover on the Results card, or null: Gerald's mail is an inheritance
 * ("Inherited: Suppressing Fire", Bricks's), C4 Keep a loan, since QUILL is still there (D150;
 * story/bible.md § 9 C4: QUILL *lends* Time Dilation).
 */
export function handoverLine(t: ResultsTransaction): string | null {
  if (t.kind === 'inherit') return `Inherited: ${t.ability} · Technician ability`;
  if (t.kind === 'c4' && t.inherited !== null)
    return `Lent by QUILL: ${t.inherited} · Technician ability`;
  return null;
}
