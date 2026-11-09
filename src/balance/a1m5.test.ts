// A1M5's tuning is robust where it matters (T304g). As tuned, par wins at 17/21 (81.0%, below
// A1M4's 85) on every seed: its only leaks are W7's second warren Hauler (3), which its Mk I strike
// leaves to the gate, and W6's lone Puffwing round the east edge (1), the lane's first showing (par
// covers W8's with a Skyhook). Orbital Strike Mk II and
// Bricks's Rapport each save that Hauler (T228), the Matriarch is driven off before the banner line
// (Party Pooper Prevention), and the Quiet Wave is free to spare: holding fire through it costs Old
// Thrum's 2 integrity and nothing else, and sets `spared_quiet_wave` (holding fire only after she
// falls doesn't). Par without its Cluster spec (`alt:no_spec`, under-built) stays gradual. With
// W5's Spires groups, W7's and W8's warren convoys, W4's and W7's Bunchlings, or W8's Chonks
// shifted ±0.2 s, every harness verdict holds and par stays at 81.0 (T304g also checked W5's
// warren Hauler, W6's flocks, and W7–W8's Zoomers; trimmed here for the gate's time). The waves
// and builds are documented in docs/story/campaign/act1.md § A1M5.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveDef, WaveGroup } from '../content/types.ts';
import { createBuildExecutor, createSim } from '../sim/index.ts';
import { evaluateFlagRule, flagRule, type FlagRuleStats } from '../story/flags.ts';
import { runMap } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a1_m05;
const content = compileContent(RAW_CONTENT);
const PAR_INTEGRITY = 17;

/** The content with each group of wave `wave` (1-based) that `pick` selects shifted `d` s later. */
function shifted(wave: number, pick: (g: WaveGroup) => boolean, d: number): typeof content {
  const ws = raw.waves.map((w: WaveDef, i): WaveDef =>
    i + 1 !== wave
      ? w
      : {
          ...w,
          groups: w.groups.map((g) =>
            pick(g) ? { ...g, delaySec: Math.max(0, (g.delaySec ?? 0) + d) } : g,
          ),
        },
  );
  const next: RawContent = {
    ...RAW_CONTENT,
    maps: { ...RAW_CONTENT.maps, a1_m05: { ...raw, waves: ws } },
  };
  return compileContent(next);
}

/** Every failing check, and par's integrity left on the seed. */
function judge(c: typeof content): { failed: string[]; par: number } {
  const report = runMap(c, 'a1_m05', { seeds: 1 });
  const par = report.runs.find((r) => r.build === 'par' && !r.repeat)?.result?.integrity ?? -1;
  return { failed: report.checks.filter((k) => !k.ok).map((k) => `#${k.id} ${k.title}`), par };
}

const convoyKinds = new Set(['hauler', 'elder', 'nibbler']);
/** A warren convoy's groups: its Haulers, Elders, and Nibblers (W8's from 32 s in). */
const warrenConvoy =
  (from = 0) =>
  (g: WaveGroup): boolean =>
    g.route === 'warren' && convoyKinds.has(g.enemy) && (g.delaySec ?? 0) >= from;
const enemy =
  (id: string) =>
  (g: WaveGroup): boolean =>
    g.enemy === id;
const route =
  (id: string) =>
  (g: WaveGroup): boolean =>
    g.route === id;

// Each test re-runs a whole map's harness (with its R&D picks): seconds, not milliseconds.
describe('A1M5 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a1_m05', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it('passes every harness check as tuned, par at 17/21 with Party Pooper Prevention', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect(par.integrity).toBe(PAR_INTEGRITY);
    expect(par.maxIntegrity).toBe(21); // Reinforced Core 1
    expect(par.medals.challenge).toBe('earned');
    // Mk II and Rapport each save W7's second warren Hauler.
    expect(run('par@rnd:orbital_strike_mk2').result?.integrity).toBe(PAR_INTEGRITY + 3);
    expect(run('par@rnd:rapport_bricks').result?.integrity).toBe(PAR_INTEGRITY + 3);
  });

  it('lets the player spare the Quiet Wave for Old Thrum’s 2 integrity, or clear it', () => {
    const rule = flagRule('spared_quiet_wave')!;
    const cleared = run('par').result!;
    expect(cleared.stats.tagKilled.quiet_wave).toBe(7);
    expect(evaluateFlagRule(rule.value, cleared.stats)).toBe(false);
    const spared = run('holdFireWhile:quiet_wave').result!;
    expect(spared.outcome).toBe('won');
    expect(spared.stats.tagLeaked.quiet_wave).toBe(7);
    expect(spared.integrity).toBe(PAR_INTEGRITY - 2);
    expect(evaluateFlagRule(rule.value, spared.stats)).toBe(true);
    // Sparing them never costs a medal: Victory and the Challenge stand.
    expect(spared.medals.victory).toBe('earned');
    expect(spared.medals.challenge).toBe('earned');
  });

  it('counts holding fire only after Old Thrum falls as clearing it, not sparing it (D097)', () => {
    // Par to W10, then the player fires until Thrum is down and holds fire on the younglings.
    const map = content.maps.a1_m05;
    const build = map.builds.parBuild;
    const sim = createSim(runConfig(content, map, build, referenceRunProfile(map, content), 1));
    const exec = createBuildExecutor(sim, build);
    const st = sim.state.stats;
    let held = false;
    while (sim.state.outcome === 'playing' && sim.state.tick < 200_000) {
      exec.beforeTick();
      const thrumDown = st.tagKilled.quiet_wave > st.tagKilled.youngling;
      if (!held && thrumDown) {
        held = true;
        sim.enqueue({ type: 'holdFire', target: 'all', on: true });
      }
      sim.step();
      sim.drainEvents([]);
    }
    expect(sim.state.outcome).toBe('won');
    expect(held).toBe(true);
    // Most of the younglings walk home, but Old Thrum didn't: the flag stays false.
    expect(st.tagLeaked.youngling / st.tagSpawned.youngling).toBeGreaterThanOrEqual(0.75);
    const stats: FlagRuleStats = { ...st };
    expect(evaluateFlagRule(flagRule('spared_quiet_wave')!.value, stats)).toBe(false);
  });

  it('tags every youngling quiet_wave too, as the flag rule’s `except` needs', () => {
    for (const w of raw.waves) {
      for (const g of w.groups) {
        if (g.tags?.includes('youngling') === true) expect(g.tags).toContain('quiet_wave');
      }
    }
  });

  it.each([
    ['W5’s Spires groups', 5, route('spires')],
    ['W7’s warren convoy', 7, warrenConvoy()],
    ['W8’s warren convoy', 8, warrenConvoy(32)],
  ] as const)('holds with %s ±0.2 s', (_name, wave, pick) => {
    for (const d of [-0.2, 0.2]) {
      expect({ d, ...judge(shifted(wave, pick, d)) }).toEqual({
        d,
        failed: [],
        par: PAR_INTEGRITY,
      });
    }
  });

  it.each([
    [4, 'bunchling'],
    [7, 'bunchling'],
    [8, 'chonk'],
  ] as const)('holds with W%i’s %s groups ±0.2 s', (wave, id) => {
    for (const d of [-0.2, 0.2]) {
      expect({ d, ...judge(shifted(wave, enemy(id), d)) }).toEqual({
        d,
        failed: [],
        par: PAR_INTEGRITY,
      });
    }
  });
});
