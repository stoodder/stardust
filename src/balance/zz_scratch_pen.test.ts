import { it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { KNEEL_BUILD } from '../content/maps/a2_m05/builds.ts';
import type { BuildStep, RawContent } from '../content/types.ts';
import { createBuildExecutor, createSim, type SimEvent } from '../sim/index.ts';
import type { CompiledBuild, CompiledBuildStep, CompiledContent } from '../content/compiled.ts';
import { secToTicks } from '../shared/time.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { buildFor } from './harness.ts';

function compileStep(s: BuildStep): CompiledBuildStep {
  const wave = s.wave;
  if ('build' in s) return { wave, kind: 'build', tower: s.build, tile: s.tile };
  if ('upgrade' in s) return { wave, kind: 'upgrade', tile: s.upgrade };
  if ('ability' in s) {
    const when = s.when;
    return { wave, kind: 'ability', slot: s.ability, target: s.target ?? null,
      when: when === undefined ? 'asap' : when === 'waveStart' ? when : { afterTicks: secToTicks(when.afterSec) } };
  }
  throw new Error('x');
}
function run(c: CompiledContent, label: string, diff: 'standard' | 'story', kneelSteps?: BuildStep[]) {
  const build: CompiledBuild = kneelSteps ? { loadout: KNEEL_BUILD.loadout, companion: c.maps.a2_m05.builds.parBuild.companion,
    technicianAbility: c.maps.a2_m05.builds.referenceProfile.technicianAbility, callEarly: false, steps: kneelSteps.map(compileStep) } : buildFor(label, c.maps.a2_m05, c)!;
  const sim = createSim(runConfig(c, c.maps.a2_m05, build, referenceRunProfile(c.maps.a2_m05, c, diff), 1));
  const exec = createBuildExecutor(sim, build);
  const out: SimEvent[] = [];
  let spawn = -1, broke = -1, pivot = -1, reforms = 0, minHp = 1;
  while (sim.state.outcome === 'playing') {
    exec.beforeTick(); sim.step(); sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'EnemySpawned' && e.enemy === 'sunderglass_penitent') spawn = sim.state.tick;
      if (e.type === 'BossPhase' && e.phase === 2 && broke < 0) broke = sim.state.tick;
      if (e.type === 'ShieldReformed') reforms++;
      if (e.type === 'BossEnded') pivot = sim.state.tick;
    }
    out.length = 0;
    const st = sim.state;
    for (let i = 0; i < st.enemies.used; i++) { const e = st.enemies.items[i]!; if (e.alive && e.def?.id === 'sunderglass_penitent' && pivot < 0) minHp = Math.min(minHp, e.hp / e.def.hp); }
  }
  return { o: sim.state.outcome[0], evac: sim.state.stats.evacuated, integ: sim.state.integrity, br: +((broke - spawn) / 60).toFixed(2),
    slack: +((spawn + (diff === 'story' ? 5400 : 3600) - pivot) / 60).toFixed(2), ref: reforms, minHp: +minHp.toFixed(3), pw: sim.state.stats.pivotWave };
}
it('pen variants', () => {
  const vs = JSON.parse(process.env.KP ?? '[{}]') as Record<string, number>[];
  for (const v of vs) {
    const p = RAW_CONTENT.enemies.sunderglass_penitent;
    const raw: RawContent = { ...RAW_CONTENT, enemies: { ...RAW_CONTENT.enemies, sunderglass_penitent: { ...p,
      hp: v.hp ?? p.hp, shield: { ...p.shield!, hp: v.sh ?? p.shield!.hp, regenPerSec: v.rg ?? p.shield!.regenPerSec } } } };
    const c = compileContent(raw);
    const k0 = run(c, 'k', 'standard', KNEEL_BUILD.steps as BuildStep[]);
    const at = Math.round((k0.br + 6 + 0.25) * 10) / 10;
    const ks = (KNEEL_BUILD.steps as BuildStep[]).map((s) => ('ability' in s && s.wave === 5 ? { ...s, when: { afterSec: s.ability === 1 ? at : at + 0.5 } } : s));
    const res = { kneel: run(c, 'k', 'standard', ks), at, par: run(c, 'par', 'standard'), ace: run(c, 'alwaysCallEarly', 'standard'),
      story: run(c, 'par', 'story'), cap: run(c, 'alt:capacitor', 'standard'), coil: run(c, 'alt:coil_and_hook', 'standard') };
    process.stderr.write(`P ${JSON.stringify(v)}\n${Object.entries(res).map(([k, r]) => `   ${k} ${JSON.stringify(r)}`).join('\n')}\n`);
  }
});
