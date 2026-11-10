import { describe, expect, it } from 'vitest';
import {
  planSweep,
  TIDY_MAX_SPECKS,
  tidyPose,
  tidyTicks,
  type TidyPose,
} from '../render/vfx/tidybotFlight.ts';
import { createTidyChimes } from './tidybotChimes.ts';

/** The ticks (after the sweep began) each drone of a sweep of `n` specks starts its chime. */
function chimeStarts(n: number): number[] {
  const pose: TidyPose = { x: 0, y: 0, phase: 'gone', cleared: 0 };
  const specks = Array.from({ length: n }, (_, i) => ({ x: i % 7, y: Math.floor(i / 7) }));
  return planSweep(specks, 12, 8).plans.map((plan) => {
    for (let t = 0; t < tidyTicks(plan); t++)
      if (tidyPose(plan, t, pose).phase === 'chime') return t;
    return -1;
  });
}

/** Runs the chimes from `from` to `to` (inclusive), returning [tick, drone] per chime. */
function ring(c: ReturnType<typeof createTidyChimes>, from: number, to: number) {
  const rung: [number, number][] = [];
  const out: number[] = [];
  for (let t = from; t <= to; t++) {
    c.due(t, out);
    for (const bot of out) rung.push([t, bot]);
    out.length = 0;
  }
  return rung;
}

describe('Tidybot chimes', () => {
  it("rings each drone's chime as render's sweep reaches its chime frame", () => {
    for (const n of [1, 5, 13, 30]) {
      const c = createTidyChimes(true, 10);
      for (let i = 0; i < n; i++) c.died();
      c.cleared(2, 100);
      const starts = chimeStarts(n);
      expect(ring(c, 100, 1000).toSorted((a, b) => a[1] - b[1])).toEqual(
        starts.map((t, bot) => [100 + t, bot]),
      );
    }
  });

  it('sweeps nothing after the last wave, with no specks, or with the dial off', () => {
    const last = createTidyChimes(true, 7);
    last.died();
    last.cleared(7, 0);
    expect(ring(last, 0, 600)).toEqual([]);
    const empty = createTidyChimes(true, 7);
    empty.cleared(2, 0);
    expect(ring(empty, 0, 600)).toEqual([]);
    const off = createTidyChimes(false, 7);
    off.died();
    off.cleared(2, 0);
    expect(ring(off, 0, 600)).toEqual([]);
  });

  it('waits out a sweep in flight, and drops what is still to come when the map ends', () => {
    const c = createTidyChimes(true, 10);
    c.died();
    c.cleared(1, 0);
    c.died();
    c.cleared(2, 10); // a sweep is under way: this speck waits for the next
    const first = ring(c, 0, 400);
    expect(first).toHaveLength(1);
    c.cleared(3, 401);
    expect(ring(c, 401, 800)).toHaveLength(1);
    c.died();
    c.cleared(4, 900);
    c.ended();
    expect(ring(c, 900, 1400)).toEqual([]);
  });

  it("counts no more specks than render's pool holds", () => {
    const c = createTidyChimes(true, 10);
    for (let i = 0; i < TIDY_MAX_SPECKS + 20; i++) c.died();
    c.cleared(1, 0);
    expect(ring(c, 0, 2000)).toHaveLength(chimeStarts(TIDY_MAX_SPECKS).length);
  });
});
