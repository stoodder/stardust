// The Tidybots' sweep (T410b): specks split among 1–3 drones in screen order, each drone in from the
// nearest edge, its stops vacuumed in turn (a stop's specks gone halfway through), a chime, out by
// the nearest edge (or, where the drones unload, up to the hopper, its load emptied in turn, then
// out); pause-proof because it reads ticks only.
import { describe, expect, it } from 'vitest';
import {
  edgeNear,
  planSweep,
  TIDY_CHIME_TICKS,
  TIDY_DOCK_TICKS,
  TIDY_EDGE_OUT,
  TIDY_HOP_TICKS,
  TIDY_IN_TICKS,
  TIDY_MAX_BOTS,
  TIDY_MAX_STOPS,
  TIDY_OUT_TICKS,
  TIDY_STAGGER_TICKS,
  TIDY_UNLOAD_TICKS,
  TIDY_VAC_TICKS,
  tidyPose,
  tidyTicks,
  type TidyPose,
} from './tidybotFlight.ts';

const pose = (): TidyPose => ({ x: 0, y: 0, phase: 'gone', cleared: 0 });

describe('edgeNear', () => {
  it('leaves by the nearest edge of the map, just past it', () => {
    expect(edgeNear({ x: 1, y: 5 }, 20, 12)).toEqual({ x: -TIDY_EDGE_OUT, y: 5 });
    expect(edgeNear({ x: 18, y: 5 }, 20, 12)).toEqual({ x: 20 + TIDY_EDGE_OUT, y: 5 });
    expect(edgeNear({ x: 9, y: 1 }, 20, 12)).toEqual({ x: 9, y: -TIDY_EDGE_OUT });
    expect(edgeNear({ x: 9, y: 11 }, 20, 12)).toEqual({ x: 9, y: 12 + TIDY_EDGE_OUT });
  });
});

describe('planSweep', () => {
  it('sends nobody for nothing', () => {
    expect(planSweep([], 20, 12)).toEqual({ plans: [], stopOf: [] });
  });

  it('sends one drone for a few specks and three for a crowd, never more', () => {
    const few = [
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ];
    expect(planSweep(few, 20, 12).plans).toHaveLength(1);
    const crowd = Array.from({ length: 40 }, (_, i) => ({
      x: (i % 10) * 2,
      y: Math.floor(i / 10),
    }));
    const sweep = planSweep(crowd, 20, 12);
    expect(sweep.plans).toHaveLength(TIDY_MAX_BOTS);
    for (const p of sweep.plans) {
      expect(p.stops.length).toBeGreaterThan(0);
      expect(p.stops.length).toBeLessThanOrEqual(TIDY_MAX_STOPS);
    }
    expect(sweep.plans.map((p) => p.delay)).toEqual([
      0,
      TIDY_STAGGER_TICKS,
      2 * TIDY_STAGGER_TICKS,
    ]);
  });

  it('gives every speck a stop of a drone that exists, at the centroid of its specks', () => {
    const specks = Array.from({ length: 13 }, (_, i) => ({ x: i, y: 12 - i }));
    const sweep = planSweep(specks, 20, 14);
    expect(sweep.stopOf).toHaveLength(13);
    sweep.stopOf.forEach((s, i) => {
      const bot = Math.floor(s / TIDY_MAX_STOPS);
      const stop = s % TIDY_MAX_STOPS;
      const plan = sweep.plans[bot];
      expect(plan, `speck ${i}`).toBeDefined();
      expect(plan!.stops[stop], `speck ${i}`).toBeDefined();
    });
    // Each stop sits at the mean of the specks it sweeps.
    sweep.plans.forEach((plan, bot) =>
      plan.stops.forEach((stop, k) => {
        const mine = specks.filter((_, i) => sweep.stopOf[i] === bot * TIDY_MAX_STOPS + k);
        const mx = mine.reduce((a, p) => a + p.x, 0) / mine.length;
        const my = mine.reduce((a, p) => a + p.y, 0) / mine.length;
        expect(stop.x).toBeCloseTo(mx);
        expect(stop.y).toBeCloseTo(my);
      }),
    );
  });

  it('enters and leaves by the edges nearest its first and last stops', () => {
    const plan = planSweep([{ x: 1, y: 6 }], 20, 12).plans[0]!;
    expect(plan.entry).toEqual({ x: -TIDY_EDGE_OUT, y: 6 });
    expect(plan.exit).toEqual({ x: -TIDY_EDGE_OUT, y: 6 });
  });
});

describe('tidyPose', () => {
  const plan = {
    entry: { x: -1.5, y: 2 },
    stops: [
      { x: 2, y: 2 },
      { x: 4, y: 2 },
    ],
    exit: { x: 4, y: -1.5 },
    delay: 10,
  };

  it('waits out its delay at the edge, then flies in', () => {
    expect(tidyPose(plan, 5, pose())).toMatchObject({ phase: 'waiting', x: -1.5, y: 2 });
    const mid = tidyPose(plan, 10 + TIDY_IN_TICKS / 2, pose());
    expect(mid.phase).toBe('fly');
    expect(mid.x).toBeGreaterThan(-1.5);
    expect(mid.x).toBeLessThan(2);
  });

  it('vacuums each stop, clearing its specks halfway through, then hops on', () => {
    const at = 10 + TIDY_IN_TICKS;
    expect(tidyPose(plan, at, pose())).toMatchObject({ phase: 'vacuum', x: 2, y: 2, cleared: 0 });
    expect(tidyPose(plan, at + TIDY_VAC_TICKS / 2, pose()).cleared).toBe(1);
    expect(tidyPose(plan, at + TIDY_VAC_TICKS + 1, pose())).toMatchObject({
      phase: 'fly',
      cleared: 1,
    });
    const second = at + TIDY_VAC_TICKS + TIDY_HOP_TICKS;
    expect(tidyPose(plan, second, pose())).toMatchObject({ phase: 'vacuum', x: 4, cleared: 1 });
  });

  it('chimes at its last stop, flies out, and is gone when its sweep is over', () => {
    const chime = 10 + TIDY_IN_TICKS + 2 * TIDY_VAC_TICKS + TIDY_HOP_TICKS;
    expect(tidyPose(plan, chime, pose())).toMatchObject({ phase: 'chime', x: 4, cleared: 2 });
    expect(tidyPose(plan, chime + TIDY_CHIME_TICKS, pose()).phase).toBe('fly');
    const end = tidyTicks(plan);
    expect(end).toBe(chime + TIDY_CHIME_TICKS + TIDY_OUT_TICKS);
    expect(tidyPose(plan, end - 1, pose()).phase).toBe('fly');
    expect(tidyPose(plan, end, pose())).toMatchObject({ phase: 'gone', x: 4, y: -1.5, cleared: 2 });
  });
});

describe('unloading at the plant (A2M4, T501f, T530b)', () => {
  const dock = { x: 2.5, y: 6.5 };
  const specks = Array.from({ length: 18 }, (_, i) => ({
    x: 4 + (i % 9),
    y: 2 + Math.floor(i / 9),
  }));
  const plain = planSweep(specks, 18, 12).plans;
  const docked = planSweep(specks, 18, 12, dock).plans;
  const chimeAt = (p: (typeof plain)[number]): number => {
    for (let t = 0; t < tidyTicks(p); t++) if (tidyPose(p, t, pose()).phase === 'chime') return t;
    return -1;
  };

  it('chimes on the same tick as a plain sweep (the audio rings from the same sums)', () => {
    expect(docked).toHaveLength(plain.length);
    expect(docked.map(chimeAt)).toEqual(plain.map(chimeAt));
  });

  it('rises to the hopper after its chime, unloads there at the mouth, and leaves from it', () => {
    const p = docked[0]!;
    const t0 = chimeAt(p) + TIDY_CHIME_TICKS + (p.hold ?? 0);
    const climb = tidyPose(p, t0 + TIDY_DOCK_TICKS / 2, pose());
    expect(climb.phase).toBe('fly');
    expect(climb.lift).toBeGreaterThan(0);
    expect(climb.lift).toBeLessThan(1);
    const unload = tidyPose(p, t0 + TIDY_DOCK_TICKS, pose());
    expect(unload).toMatchObject({ phase: 'unload', x: dock.x, y: dock.y, lift: 1 });
    expect(tidyPose(p, t0 + TIDY_DOCK_TICKS + TIDY_UNLOAD_TICKS, pose()).phase).toBe('fly');
    expect(p.exit).toEqual(edgeNear(dock, 18, 12));
    const end = tidyTicks(p);
    expect(end).toBe(t0 + TIDY_DOCK_TICKS + TIDY_UNLOAD_TICKS + TIDY_OUT_TICKS);
    expect(tidyPose(p, end, pose())).toMatchObject({ phase: 'gone', lift: 0 });
  });

  it('takes turns at the mouth: no two drones unload at once', () => {
    expect(docked.length).toBeGreaterThan(1);
    const end = Math.max(...docked.map(tidyTicks));
    for (let t = 0; t <= end; t++) {
      const at = docked.filter((p) => tidyPose(p, t, pose()).phase === 'unload').length;
      expect(at, `tick ${t}`).toBeLessThanOrEqual(1);
    }
    // And each one does unload.
    for (const p of docked) {
      let seen = false;
      for (let t = 0; t <= tidyTicks(p) && !seen; t++)
        seen = tidyPose(p, t, pose()).phase === 'unload';
      expect(seen).toBe(true);
    }
  });

  it('a plain sweep never unloads and never lifts', () => {
    const p = plain[0]!;
    for (let t = 0; t <= tidyTicks(p); t++) {
      const q = tidyPose(p, t, pose());
      expect(q.phase).not.toBe('unload');
      expect(q.lift).toBe(0);
    }
  });
});
