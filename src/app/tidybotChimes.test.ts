import { describe, expect, it } from 'vitest';
import { MAPS } from '../content/maps/index.ts';
import type { Vec2 } from '../render/iso.ts';
import {
  planSweep,
  TIDY_DOCK_TICKS,
  TIDY_MAX_SPECKS,
  TIDY_UNLOAD_TICKS,
  tidyPose,
  tidyTicks,
  UNLOAD_MARKER,
  type TidyPose,
} from '../render/vfx/tidybotFlight.ts';
import { presentationOfMap } from '../story/presentation.ts';
import { createTidyChimes, tidyDock } from './tidybotChimes.ts';

/** Render's sweep of `n` specks (spread over a 12 × 8 map), unloading at `dock` if given. */
function sweepOf(n: number, dock: Vec2 | null = null) {
  const specks = Array.from({ length: n }, (_, i) => ({ x: i % 7, y: Math.floor(i / 7) }));
  return planSweep(specks, 12, 8, dock);
}

/** The ticks (after the sweep began) each drone of a sweep of `n` specks starts its chime. */
function chimeStarts(n: number, dock: Vec2 | null = null): number[] {
  const pose: TidyPose = { x: 0, y: 0, phase: 'gone', cleared: 0 };
  return sweepOf(n, dock).plans.map((plan) => {
    for (let t = 0; t < tidyTicks(plan); t++)
      if (tidyPose(plan, t, pose).phase === 'chime') return t;
    return -1;
  });
}

/** When render's sweep of `n` specks is over (its last drone gone), in ticks after it began. */
function sweepTicks(n: number, dock: Vec2 | null = null): number {
  return Math.max(...sweepOf(n, dock).plans.map((plan) => tidyTicks(plan)));
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

  it("unloads where render's drones do (A2M4's Intake B), chimes before, and waits it out", () => {
    // The dock as render finds it: the marker TidybotView names, on a map whose dial unloads.
    const a2m4 = MAPS.a2_m04;
    const markers = a2m4.markers ?? {};
    const dock = tidyDock(presentationOfMap(a2m4).tidybots, markers);
    const at = markers[UNLOAD_MARKER]!;
    expect(dock).toEqual({ x: at[0] + 0.5, y: at[1] + 0.5 });
    expect(tidyDock('on', markers)).toBeNull();
    expect(tidyDock('unloading', {})).toBeNull();
    for (const n of [1, 5, 13, 30]) {
      const c = createTidyChimes(true, 10, dock);
      for (let i = 0; i < n; i++) c.died();
      c.cleared(2, 100);
      const starts = chimeStarts(n, dock);
      expect(ring(c, 100, 2000).toSorted((a, b) => a[1] - b[1])).toEqual(
        starts.map((t, bot) => [100 + t, bot]),
      );
    }
    // Three drones take turns at the hopper: the sweep runs past the plain one by at least one
    // drone's rise and emptying, and a wave clearing in that window starts no sweep (render's is
    // still under way).
    const n = 13;
    const plain = sweepTicks(n);
    const unloading = sweepTicks(n, dock);
    expect(unloading).toBeGreaterThanOrEqual(plain + TIDY_DOCK_TICKS + TIDY_UNLOAD_TICKS);
    const c = createTidyChimes(true, 10, dock);
    for (let i = 0; i < n; i++) c.died();
    c.cleared(1, 0);
    ring(c, 0, plain);
    c.died();
    c.cleared(2, plain);
    expect(ring(c, plain, unloading)).toEqual([]);
    // The frame at `unloading` saw the last drone gone: the next clear sweeps the speck that waited.
    c.cleared(3, unloading + 1);
    expect(ring(c, unloading + 1, unloading + 1000)).toEqual(
      chimeStarts(1, dock).map((t, bot) => [unloading + 1 + t, bot]),
    );
  });

  it("counts no more specks than render's pool holds", () => {
    const c = createTidyChimes(true, 10);
    for (let i = 0; i < TIDY_MAX_SPECKS + 20; i++) c.died();
    c.cleared(1, 0);
    expect(ring(c, 0, 2000)).toHaveLength(chimeStarts(TIDY_MAX_SPECKS).length);
  });
});
