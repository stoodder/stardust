// The Asset Yield Log (act3.md § A3M2, `a3_m02_scene_confession`; T614): QUILL's Directive 3
// record of every pest processed, which fills the screen and scrolls after A3M2's Results. Its
// header is `ASSET YIELD LOG · ENTRIES: 41,206 + {pests_processed}`; each entry is a number, a
// timestamp, a tile, a yield, and the technician who logged it; the 41,206 from before you arrived
// are other technicians', and every entry after them is yours (#ED-447), lit as it passes. The
// scroll leads the scene's lines in (its staging's lead-in) and keeps going under them, speeding
// up, until the log runs out. Pure: the rows are a function of the entry number, so the scroll is
// the same on every viewing and only the count is the player's. Reduced motion holds one still
// page: the last of the others' entries, then yours, lit.
//
// Skippable after its first pass (T614): within each viewing, Next and Esc do nothing until the
// scroll has run YIELD_LOG_LOCK_MS (`stagingLockMs`; app/dialogue.ts swallows them), then cut its
// lead-in short. Your entries light as they cross the reading line (`litAt`).

/** The entries logged before the player arrived (act3.md § A3M2; characters.md, Directive 3). */
export const PRIOR_ENTRIES = 41_206;

/** The player's technician number (#ED-447: characters.md, the onboarding form). */
export const PLAYER_TECH = '#ED-447';

/** The other technicians whose entries come before yours (never #ED-447, never Bricks's #ED-112). */
const OTHER_TECHS = ['#ED-203', '#ED-268', '#ED-309', '#ED-351', '#ED-388', '#ED-402', '#ED-431'];

/** The others' entries the scroll shows before yours begin. */
export const PRIOR_SHOWN = 16;

/** How long the scroll holds still before it starts (ms): the header lands first. */
export const SCROLL_HOLD_MS = 1200;
/** The scroll's speed as it starts, and how fast it gathers pace (rows/s, rows/s²), up to its cap. */
export const SCROLL_START_ROWS_PER_SEC = 6;
export const SCROLL_ACCEL = 1.2;
export const SCROLL_MAX_ROWS_PER_SEC = 40;

/** The first pass: Next and Esc wait this long (ms) from the scroll's start (`stagingLockMs`). */
export const YIELD_LOG_LOCK_MS = 9000;
/** The scene's lines wait this long (ms; `stagingLeadInMs`): the scroll alone first. */
export const YIELD_LOG_LEAD_IN_MS = 15_000;
/** Under reduced motion: one still page, read, then the lines (no scroll to sit through). */
export const YIELD_LOG_LOCK_STILL_MS = 3000;
export const YIELD_LOG_LEAD_IN_STILL_MS = 5000;

/** One entry of the log. */
export interface YieldRow {
  /** Its entry number, from 1. */
  readonly n: number;
  /** "000,001", zero-padded to six digits with a thousands comma. */
  readonly number: string;
  /** "D1961 06:12:09": the day since the log began, and the time. */
  readonly time: string;
  /** "14,07": the tile (column, row). */
  readonly tile: string;
  /** "0.38". */
  readonly yieldText: string;
  readonly tech: string;
  /** Logged under the player's number (lit as it passes). */
  readonly yours: boolean;
}

/** A stable 32-bit mix of `k` (no state, so every viewing scrolls the same log). */
function hash(k: number): number {
  let h = Math.imul(k ^ 0x5bd1e995, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x165667b1);
  h ^= h >>> 13;
  return h >>> 0;
}

/** Seconds since the log began at entry `n` (monotonic: the others' sparse, yours dense). */
function secondsAt(n: number): number {
  const jitter = hash(n) % 17;
  if (n <= PRIOR_ENTRIES) return n * 4111 + jitter;
  return PRIOR_ENTRIES * 4111 + (n - PRIOR_ENTRIES) * 23 + jitter;
}

const pad = (v: number, w: number): string => String(v).padStart(w, '0');

/** "041,207" for 41,207. */
export function entryNumber(n: number): string {
  const s = pad(n, 6);
  return `${s.slice(0, 3)},${s.slice(3)}`;
}

/** Entry `n` (from 1) of a log whose last `yours` entries are the player's. */
export function yieldRow(n: number, yours: number): YieldRow {
  const sec = secondsAt(n);
  const day = Math.floor(sec / 86_400);
  const t = sec % 86_400;
  const h = hash(n * 31 + 7);
  const mine = n > PRIOR_ENTRIES && n <= PRIOR_ENTRIES + yours;
  return {
    n,
    number: entryNumber(n),
    time: `D${pad(day, 4)} ${pad(Math.floor(t / 3600), 2)}:${pad(Math.floor(t / 60) % 60, 2)}:${pad(t % 60, 2)}`,
    tile: `${pad(h % 22, 2)},${pad((h >>> 8) % 14, 2)}`,
    yieldText: `0.${pad(18 + ((h >>> 16) % 60), 2)}`,
    tech: mine ? PLAYER_TECH : OTHER_TECHS[(h >>> 4) % OTHER_TECHS.length]!,
    yours: mine,
  };
}

/** The first entry the scroll shows: the last PRIOR_SHOWN of the others'. */
export const FIRST_SHOWN = PRIOR_ENTRIES - PRIOR_SHOWN + 1;

/** How many entries the scroll has to show: the others' tail, then all of yours. */
export function rowsInLog(yours: number): number {
  return PRIOR_SHOWN + Math.max(0, yours);
}

/** The header: `ASSET YIELD LOG · ENTRIES: 41,206 + {pests_processed}` (act3.md § A3M2). */
export function yieldLogHeader(yours: number): string {
  return `ASSET YIELD LOG · ENTRIES: ${formatThousands(PRIOR_ENTRIES)} + ${formatThousands(Math.max(0, yours))}`;
}

/** "41,206" (locale-independent, as story/counter.ts's formatCount). */
function formatThousands(n: number): string {
  return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * How many rows the scroll has moved `ms` after its staging starts (fractional: the view moves
 * whole pixels): held for SCROLL_HOLD_MS, then gathering pace from SCROLL_START_ROWS_PER_SEC by
 * SCROLL_ACCEL up to SCROLL_MAX_ROWS_PER_SEC, and never past `maxRows` (where the log ends).
 */
export function scrolledRows(ms: number, maxRows: number): number {
  const t = Math.max(0, ms - SCROLL_HOLD_MS) / 1000;
  const v0 = SCROLL_START_ROWS_PER_SEC;
  const tCap = (SCROLL_MAX_ROWS_PER_SEC - v0) / SCROLL_ACCEL;
  const rows =
    t <= tCap
      ? v0 * t + 0.5 * SCROLL_ACCEL * t * t
      : v0 * tCap + 0.5 * SCROLL_ACCEL * tCap * tCap + SCROLL_MAX_ROWS_PER_SEC * (t - tCap);
  return Math.min(Math.max(0, maxRows), rows);
}

/**
 * The rows on screen at a scroll of `scrolled` rows, `visible` tall: entries from
 * FIRST_SHOWN + floor(scrolled) on, at most `visible + 1` (one more slides in as the view moves),
 * never past the log's last entry.
 */
export function rowsOnScreen(scrolled: number, visible: number, yours: number): YieldRow[] {
  const first = FIRST_SHOWN + Math.floor(Math.max(0, scrolled));
  const last = PRIOR_ENTRIES + Math.max(0, yours);
  const out: YieldRow[] = [];
  for (let n = first; n <= last && out.length <= visible; n++) out.push(yieldRow(n, yours));
  return out;
}

/** How far a viewer scrolls so the log's last row sits at the bottom of `visible` rows. */
export function maxScroll(yours: number, visible: number): number {
  return Math.max(0, rowsInLog(yours) - visible);
}

/**
 * Under reduced motion, the still page's scroll: the others' last few rows, then yours, so the
 * lit entries fill most of the page (the whole page with none of yours left out of a short log).
 */
export function stillScroll(yours: number, visible: number): number {
  return Math.min(maxScroll(yours, visible), Math.max(0, PRIOR_SHOWN - 4));
}

/** The lock (ms) before Next and Esc cut the scroll short (`stagingLockMs` for `yield_log`). */
export function yieldLogLockMs(still: boolean): number {
  return still ? YIELD_LOG_LOCK_STILL_MS : YIELD_LOG_LOCK_MS;
}

/** How long the scroll leads the lines (ms; `stagingLeadInMs` for `yield_log`). */
export function yieldLogLeadInMs(still: boolean): number {
  return still ? YIELD_LOG_LEAD_IN_STILL_MS : YIELD_LOG_LEAD_IN_MS;
}

/** The screen reader's account of the scroll (it is aria-hidden; the lines speak for themselves). */
export function yieldLogLabel(yours: number): string {
  const mine = formatThousands(Math.max(0, yours));
  return `Asset Yield Log, ${formatThousands(PRIOR_ENTRIES)} entries from before you arrived, then ${mine} logged under ${PLAYER_TECH}, each lit as it scrolls past.`;
}

/** The reading line, as a share of the log's height from its top: your rows light as they cross it. */
export const READ_LINE = 0.55;

/** Whether a row `y` px from the log's top (of `height`) has crossed the reading line. */
export function litAt(y: number, height: number): boolean {
  return y <= height * READ_LINE;
}
