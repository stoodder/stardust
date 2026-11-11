// The Asset Yield Log (yieldLog.ts; act3.md § A3M2; T614): the header with the player's count, the
// rows (the others' before, then yours, every entry a number, timestamp, tile, yield, and
// technician), a scroll that holds, gathers pace, and stops at the log's end, the reading line
// that lights yours, the still page under reduced motion, and the staging's lead-in and its
// first-pass lock (stagingLockMs: Next and Esc wait for it; every other staging takes them at once).
import { describe, expect, it } from 'vitest';
import { stagingLeadInMs, stagingLockMs, stagingOf, type StagingKind } from './staging.ts';
import {
  FIRST_SHOWN,
  PLAYER_TECH,
  PRIOR_ENTRIES,
  PRIOR_SHOWN,
  SCROLL_HOLD_MS,
  SCROLL_MAX_ROWS_PER_SEC,
  YIELD_LOG_LEAD_IN_MS,
  YIELD_LOG_LOCK_MS,
  entryNumber,
  litAt,
  maxScroll,
  rowsOnScreen,
  scrolledRows,
  stillScroll,
  yieldLogHeader,
  yieldLogLabel,
  yieldRow,
} from './yieldLog.ts';

describe('the Asset Yield Log', () => {
  it("the header is act3.md's: 41,206 + {pests_processed}", () => {
    expect(yieldLogHeader(1234)).toBe('ASSET YIELD LOG · ENTRIES: 41,206 + 1,234');
    expect(yieldLogHeader(0)).toBe('ASSET YIELD LOG · ENTRIES: 41,206 + 0');
    expect(yieldLogLabel(7)).toContain('41,206 entries from before you arrived, then 7');
  });

  it('every entry after the 41,206 is yours, and none before', () => {
    expect(yieldRow(PRIOR_ENTRIES, 50)).toMatchObject({ yours: false });
    expect(yieldRow(PRIOR_ENTRIES).tech).not.toBe(PLAYER_TECH);
    expect(yieldRow(PRIOR_ENTRIES + 1, 50)).toMatchObject({ yours: true, tech: PLAYER_TECH });
    expect(yieldRow(PRIOR_ENTRIES + 50, 50).yours).toBe(true);
    expect(yieldRow(PRIOR_ENTRIES + 51, 50).yours).toBe(false);
    // Nobody's entries carry Bricks's number (#ED-112).
    for (let n = FIRST_SHOWN; n <= PRIOR_ENTRIES; n++)
      expect(yieldRow(n, 0).tech).not.toBe('#ED-112');
  });

  it('each entry is a number, a timestamp, a tile, and a yield, the same on every viewing', () => {
    const r = yieldRow(PRIOR_ENTRIES + 1, 10);
    expect(r.number).toBe('041,207');
    expect(r.time).toMatch(/^D\d{4} \d\d:\d\d:\d\d$/);
    expect(r.tile).toMatch(/^\d\d,\d\d$/);
    expect(r.yieldText).toMatch(/^0\.\d\d$/);
    expect(yieldRow(PRIOR_ENTRIES + 1, 10)).toEqual(r);
    expect(entryNumber(5)).toBe('000,005');
    // Time only moves forward down the log.
    for (let n = FIRST_SHOWN; n < PRIOR_ENTRIES + 40; n++) {
      expect(yieldRow(n + 1).time >= yieldRow(n).time).toBe(true);
    }
  });

  it('the scroll holds, gathers pace up to its cap, and stops where the log ends', () => {
    expect(scrolledRows(SCROLL_HOLD_MS, 1000)).toBe(0);
    const a = scrolledRows(SCROLL_HOLD_MS + 1000, 1e9);
    const b = scrolledRows(SCROLL_HOLD_MS + 2000, 1e9) - a;
    expect(b).toBeGreaterThan(a);
    const late = scrolledRows(SCROLL_HOLD_MS + 120_000, 1e9);
    const later = scrolledRows(SCROLL_HOLD_MS + 121_000, 1e9);
    expect(later - late).toBeCloseTo(SCROLL_MAX_ROWS_PER_SEC, 6);
    expect(scrolledRows(1e9, 25)).toBe(25);
  });

  it('shows the others’ last rows, then yours, never past the log’s last entry', () => {
    const rows = rowsOnScreen(0, 34, 5);
    expect(rows[0]!.n).toBe(FIRST_SHOWN);
    expect(rows.filter((r) => !r.yours)).toHaveLength(PRIOR_SHOWN);
    expect(rows.filter((r) => r.yours)).toHaveLength(5);
    expect(rows.at(-1)!.n).toBe(PRIOR_ENTRIES + 5);
    expect(rowsOnScreen(3.6, 34, 1000)[0]!.n).toBe(FIRST_SHOWN + 3);
    expect(rowsOnScreen(0, 34, 1000)).toHaveLength(35);
    expect(maxScroll(1000, 34)).toBe(PRIOR_SHOWN + 1000 - 34);
    expect(maxScroll(3, 34)).toBe(0);
  });

  it('yours light as they cross the reading line; the still page holds them in view', () => {
    expect(litAt(0, 300)).toBe(true);
    expect(litAt(165, 300)).toBe(true);
    expect(litAt(166, 300)).toBe(false);
    const still = rowsOnScreen(stillScroll(500, 34), 34, 500);
    expect(still.filter((r) => r.yours).length).toBeGreaterThan(still.length / 2);
    expect(still.some((r) => !r.yours)).toBe(true);
  });
});

describe('the yield_log staging', () => {
  it("stages A3M2's confession scene (and its dev twin)", () => {
    expect(stagingOf('a3_m02_scene_confession')).toBe('yield_log');
    expect(stagingOf('a1_m01_scene_dev_yield_log')).toBe('yield_log');
  });

  it('leads the lines in with the scroll, and takes Next or Esc only after its first pass', () => {
    expect(stagingLeadInMs('yield_log', false)).toBe(YIELD_LOG_LEAD_IN_MS);
    expect(stagingLockMs('yield_log', false)).toBe(YIELD_LOG_LOCK_MS);
    expect(stagingLockMs('yield_log', false)).toBeLessThan(stagingLeadInMs('yield_log', false));
    // Reduced motion: a still page, shorter, still read before it can be skipped.
    expect(stagingLockMs('yield_log', true)).toBeGreaterThan(0);
    expect(stagingLockMs('yield_log', true)).toBeLessThan(stagingLeadInMs('yield_log', true));
    expect(stagingLeadInMs('yield_log', true)).toBeLessThan(YIELD_LOG_LEAD_IN_MS);
  });

  it('every other staging takes Next and Esc at once', () => {
    for (const k of ['rig9_feed', 'party'] as const satisfies readonly StagingKind[]) {
      expect(stagingLockMs(k, false)).toBe(0);
      expect(stagingLockMs(k, true)).toBe(0);
    }
  });
});
