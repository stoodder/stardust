// The shield aura's ring (T502; ShieldAuraView.ts): its dashes crawl with the sim's ticks, so the
// ring holds while paused and is steady under reduced motion; every crawl frame is a distinct
// shift of the same dashed ring.
import { describe, expect, it } from 'vitest';
import { ringImage } from '../vfx/overlayPixels.ts';
import { CRAWL_TICKS, crawlFrame, DASH_PERIOD } from './ShieldAuraView.ts';

describe('the aura ring crawl (T502)', () => {
  it('steps one frame every CRAWL_TICKS sim ticks, round DASH_PERIOD frames', () => {
    expect(crawlFrame(0, false)).toBe(0);
    expect(crawlFrame(CRAWL_TICKS - 1, false)).toBe(0);
    expect(crawlFrame(CRAWL_TICKS, false)).toBe(1);
    expect(crawlFrame(CRAWL_TICKS * DASH_PERIOD, false)).toBe(0);
    const seen = new Set<number>();
    for (let t = 0; t < CRAWL_TICKS * DASH_PERIOD; t++) seen.add(crawlFrame(t, false));
    expect([...seen].toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it('holds still under reduced motion', () => {
    for (const t of [0, 7, CRAWL_TICKS * 3, 1000]) expect(crawlFrame(t, true)).toBe(0);
  });

  it('each frame shifts the dashes: same size and origin, different pixels', () => {
    const frames = [0, 1, 2, 3, 4].map((k) => ringImage(2, 'blue.4', true, 'ink.0', k));
    const first = frames[0]!;
    for (const f of frames) {
      expect([f.image.width, f.image.height, f.cx, f.cy]).toEqual([
        first.image.width,
        first.image.height,
        first.cx,
        first.cy,
      ]);
    }
    const sigs = new Set(frames.map((f) => Array.from(f.image.data).join(',')));
    expect(sigs.size).toBe(DASH_PERIOD);
  });
});
