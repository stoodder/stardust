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
    // par, the two references, then every alt build the map lists, in its order.
    expect(buildNames(sim.map)).toEqual([
      'par',
      'none',
      'alwaysCallEarly',
      ...Object.keys(sim.map.builds.altBuilds),
    ]);
    expect(buildNames(sim.map)).toContain('rivet_only');
    expect(namedBuild(sim.map, 'par')).toBe(sim.map.builds.parBuild);
    expect(namedBuild(sim.map, 'none')?.steps).toEqual([]);
    expect(namedBuild(sim.map, 'alwaysCallEarly')?.callEarly).toBe(true);
    expect(namedBuild(sim.map, 'rivet_only')).toBe(sim.map.builds.altBuilds.rivet_only);
    expect(namedBuild(sim.map, 'toString')).toBeNull();
    expect(() => startAutoplay(a1m1Host(), 'nope')).toThrow(/no build 'nope'.*known: par/);
  });

  it("plays par through the host's fastForward to a win (95: one W7 leak, T125)", () => {
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

  it("replays the harness's par on a ?map= battle: A1M5 at 17/21, its Cluster spec in (T332)", () => {
    // No save: the map's reference profile (Reinforced Core 1, the Thumper's specs, the tunes and
    // Head Start), as balance/profile.ts runs par. act1.md § A1M5: par 81.0, 17/21.
    const host = createHost(createSim(battleConfig('a1_m05', 1)), { now: () => 0, speed: 0 });
    const exec = startAutoplay(host, 'par');
    while (host.sim.state.outcome === 'playing' && host.sim.state.tick < 60 * 60 * 20) {
      host.fastForward(600);
    }
    expect(host.sim.state.outcome).toBe('won');
    expect([host.sim.state.integrity, host.sim.state.maxIntegrity]).toEqual([17, 21]);
    expect(exec.steps.filter((s) => s.error !== null || s.issuedTick < 0)).toEqual([]);
    expect(exec.steps.some((s) => s.kind === 'specialize')).toBe(true);
  });

  it("lets go of Gerald's hold when another build takes over mid-pass (T335)", () => {
    const host = createHost(createSim(battleConfig('a1_m03', 1)), { now: () => 0, speed: 0 });
    startAutoplay(host, 'par');
    const st = host.sim.state;
    // Par to W4's pass: its macro holds fire while Gerald is on the field.
    while (!(st.wave === 4 && st.holdFireAll) && st.outcome === 'playing') host.fastForward(1);
    expect([st.wave, st.holdFireAll]).toEqual([4, true]);
    startAutoplay(host, 'none');
    host.fastForward(0);
    expect(st.holdFireAll).toBe(false);
    // Nobody plays on, so nothing turns it back on when Gerald comes round again.
    while (st.wave < 7 && st.outcome === 'playing') host.fastForward(60);
    expect(st.holdFireAll).toBe(false);
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
