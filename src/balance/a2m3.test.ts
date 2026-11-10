// A2M3's tuning is robust where it matters (T422). As tuned, par wins at 16/21 (76.2%) on every
// seed, its five lost late: three Lightwings in W9's big Aelari wave (before its Cloudburst lands)
// and two Motes in W11. Its click on the Peeker's rock goes in the tick after W5 starts. A player
// who holds fire on every runner group still wins, and sets `held_fire_second_look`; par and the
// Spare runners filter don't. Each no-counter build loses by W8; the all-Zapcoil alt earns Clear Skies.
// With W9's Lightwings shifted ±0.2 s (and ±1 s, checked in T422) par holds at 16/21. The waves
// and builds are documented in docs/story/campaign/act2.md § A2M3.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef } from '../content/types.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a2_m03;
const content = compileContent(RAW_CONTENT);
const PAR_INTEGRITY = 16;

/** The content with W9's Lightwings `d` s later. */
function w9LightwingsShifted(d: number): typeof content {
  const waves = raw.waves.map((w: WaveDef, i): WaveDef =>
    i !== 8
      ? w
      : {
          ...w,
          groups: w.groups.map((g) =>
            g.enemy === 'lightwing' ? { ...g, delaySec: (g.delaySec ?? 0) + d } : g,
          ),
        },
  );
  const next: RawContent = {
    ...RAW_CONTENT,
    maps: { ...RAW_CONTENT.maps, a2_m03: { ...raw, waves } },
  };
  return compileContent(next);
}

// Each test re-runs a whole map's harness (or its par): seconds, not milliseconds.
describe('A2M3 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a2_m03', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;
  const lostAt = (build: string): number => {
    const r = run(build).result!;
    expect(r.outcome).toBe('lost');
    return r.waves.findLastIndex((w) => w.spawned > 0) + 1;
  };

  it('passes every harness check as tuned, par at 16/21 with its losses late', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect([par.integrity, par.maxIntegrity]).toEqual([PAR_INTEGRITY, 21]);
    expect(par.waves.map((w) => w.integrityLost)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 2]);
    // The rescue is par's own click, the tick after W5 starts (the fallback never fires).
    const click = par.steps.find((s) => s.kind === 'interact')!;
    expect(click.error).toBeNull();
    expect(click.issuedTick - par.waves[4]!.startTick).toBe(1);
  });

  it('lets a player who spares every runner win, and only that player sets the flag', () => {
    const held = run('holdFireWhile:fleeing').result!;
    expect(held.outcome).toBe('won');
    expect(held.integrity).toBeGreaterThanOrEqual(4);
    expect(run('spareFleeing').result!.integrity).toBe(PAR_INTEGRITY);
  });

  it('makes shields, air, and splash the answers: each no-counter build loses by W8', () => {
    for (const c of ['shield', 'air', 'splash']) {
      expect(lostAt(`noCounter:${c}`)).toBeLessThanOrEqual(8);
    }
  });

  it('leaves Clear Skies to a build that holds the air: the all-Zapcoil alt earns it', () => {
    expect(run('par').result!.medals.challenge).not.toBe('earned');
    expect(run('alt:coil_and_shell').result!.medals.challenge).toBe('earned');
  });

  it('holds par at 16/21 with W9’s Lightwings ±0.2 s', () => {
    for (const d of [-0.2, 0.2]) {
      const r = runMap(w9LightwingsShifted(d), 'a2_m03', { seeds: 1, build: 'par' });
      const par = r.runs.find((x) => x.build === 'par' && !x.repeat)!.result!;
      expect({ d, par: par.integrity }).toEqual({ d, par: PAR_INTEGRITY });
    }
  });
});
