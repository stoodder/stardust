// The "incoming" flags (T326): which spawns carry one, when, and what a click on one does.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { createSim, type SimState } from '../../sim/index.ts';
import { resolveClick, hoverLook } from '../input/intents.ts';
import { emptyTileFacts, fillTileFacts } from '../input/tileFacts.ts';
import { spawnFlagAlpha, spawnFlagImage } from '../vfx/spawnFlagPixels.ts';
import { incomingAt, incomingSpawns, incomingWave } from './spawnFlags.ts';

/** The sim's state, writable (tests set it up directly). */
function mut(s: { readonly state: unknown }): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return s.state as SimState;
}

describe('incoming flags (core-loop.md § 2.2, § 2.4)', () => {
  it("stand on wave 1's spawn in the setup, and none while it spawns", () => {
    const sim = createSim(battleConfig('a1_m01', 1));
    const out: number[] = [];
    expect(incomingWave(sim.map, sim.state)).toBe(1);
    expect(incomingSpawns(sim.map, sim.state, out)).toBe(1);
    const first = sim.map.waves[0]!.groups[0]!.route.tiles[0]!;
    expect(out[0]).toBe(first[1] * sim.map.cols + first[0]);
    expect(incomingAt(sim.map, sim.state, out[0]!)).toBe(true);
    sim.enqueue({ type: 'callWave' });
    sim.step();
    expect(sim.state.schedule.phase).toBe('spawning');
    expect(incomingSpawns(sim.map, sim.state, out)).toBe(0);
  });

  it("stand on each spawn the next wave uses, once (A1M2's two)", () => {
    const sim = createSim(battleConfig('a1_m02', 1));
    const s = mut(sim);
    const out: number[] = [];
    const spawnsOf = (w: number): Set<string> =>
      new Set(
        sim.map.waves[w - 1]!.groups.filter((g) => g.route.kind !== 'air').map(
          (g) => `${g.route.tiles[0]![0]},${g.route.tiles[0]![1]}`,
        ),
      );
    for (let w = 2; w <= sim.map.waves.length; w++) {
      s.schedule.phase = 'countdown';
      s.schedule.countdownWave = w;
      const n = incomingSpawns(sim.map, s, out);
      expect(n).toBe(spawnsOf(w).size);
    }
    s.outcome = 'won';
    expect(incomingSpawns(sim.map, s, out)).toBe(0);
  });

  it('never stand before the Quiet Wave, which comes in its own time (D097)', () => {
    const sim = createSim(battleConfig('a1_m05', 1));
    const s = mut(sim);
    const quiet = sim.map.waves.findIndex((w) =>
      w.groups.some((g) => g.tags.includes('quiet_wave')),
    );
    expect(quiet).toBeGreaterThanOrEqual(0);
    s.schedule.phase = 'countdown';
    s.schedule.countdownWave = quiet + 1;
    expect(incomingWave(sim.map, s)).toBe(0);
  });

  it('call the wave on a plain click, with the hand over them', () => {
    const sim = createSim(battleConfig('a1_m01', 1));
    const out: number[] = [];
    incomingSpawns(sim.map, sim.state, out);
    const tile = fillTileFacts(sim, out[0]!, emptyTileFacts());
    expect(tile.incoming).toBe(true);
    expect(resolveClick(tile, 'left', null)).toEqual({ kind: 'callWave' });
    // Armed, it's a spawn tile like any other (nothing builds there).
    expect(resolveClick(tile, 'left', 'rivet')).toEqual({ kind: 'cantBuild' });
    expect(hoverLook(tile, null, false).clickable).toBe(true);
  });

  it('is a pennant on a pole that pulses, steady under reduced motion', () => {
    const img = spawnFlagImage();
    expect([img.w, img.h]).toEqual([9, 12]);
    expect(spawnFlagAlpha(true, false)).toBe(1);
    expect(spawnFlagAlpha(false, false)).toBeLessThan(1);
    expect(spawnFlagAlpha(false, true)).toBe(1);
  });
});
