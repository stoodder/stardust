import { it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { runHeadless } from '../sim/index.ts';
import { referenceRunProfile, runConfig } from '../balance/profile.ts';
it('probe', () => {
  const content = compileContent(RAW_CONTENT);
  const map = content.maps.a1_m02;
  const nu = map.builds.altBuilds.no_upgrades!;
  const build = { ...nu, steps: nu.steps.filter((s) => !(s.wave === 6 && s.kind === 'build')) };
  for (const diff of ['standard', 'story'] as const) {
    const prof = referenceRunProfile(map, content, diff);
    const r = runHeadless(runConfig(content, map, build, prof as never, 1), build);
    console.log(diff, r.outcome, JSON.stringify(r.waves.map((w) => [w.wave, w.bankAtPhase, w.integrityLost])), JSON.stringify(nu.steps.map(s=>[s.wave, Object.keys(s).join()])));
  }
});
