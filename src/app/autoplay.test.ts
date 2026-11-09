import { describe, expect, it } from 'vitest';
import { createSim } from '../sim/index.ts';
import { buildNames, namedBuild, startAutoplay } from './autoplay.ts';
import { battleConfig, DEFAULT_MAP_ID } from './battleSetup.ts';
import { createHost } from './host.ts';

/** A1M1 through the host at 1×, paused, with a fake clock (no performance.now in Node tests). */
function a1m1Host() {
  return createHost(createSim(battleConfig(DEFAULT_MAP_ID, 1)), { now: () => 0, speed: 0 });
}

describe('autoplay', () => {
  it('names the builds a smoke test can play', () => {
    const { sim } = a1m1Host();
    expect(buildNames(sim.map)).toEqual(['par', 'none', 'alwaysCallEarly', 'rivet_only']);
    expect(namedBuild(sim.map, 'par')).toBe(sim.map.builds.parBuild);
    expect(namedBuild(sim.map, 'none')?.steps).toEqual([]);
    expect(namedBuild(sim.map, 'alwaysCallEarly')?.callEarly).toBe(true);
    expect(namedBuild(sim.map, 'rivet_only')).toBe(sim.map.builds.altBuilds.rivet_only);
    expect(namedBuild(sim.map, 'toString')).toBeNull();
    expect(() => startAutoplay(a1m1Host(), 'nope')).toThrow(/no build 'nope'.*known: par/);
  });

  it("plays par through the host's fastForward to act1.md's win at 95", () => {
    const host = a1m1Host();
    const exec = startAutoplay(host, 'par');
    let won = 0;
    host.bus.on('MapWon', () => won++);
    while (host.sim.state.outcome === 'playing' && host.sim.state.tick < 60 * 60 * 10) {
      host.fastForward(600);
    }
    expect(host.sim.state.outcome).toBe('won');
    expect(won).toBe(1);
    expect(host.sim.state.integrity).toBe(19);
    expect(host.sim.state.stats.skitterkinKilled).toBeGreaterThan(0);
    expect(exec.steps.every((s) => s.error === null && !s.late)).toBe(true);
  });

  it("plays 'none' to a loss", () => {
    const host = a1m1Host();
    startAutoplay(host, 'none');
    while (host.sim.state.outcome === 'playing' && host.sim.state.tick < 60 * 60 * 10) {
      host.fastForward(600);
    }
    expect(host.sim.state.outcome).toBe('lost');
  });
});
