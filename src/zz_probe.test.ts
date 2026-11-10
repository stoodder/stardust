import { it } from 'vitest';
import { compileContent } from '/home/user/stardust/src/content/compile.ts';
import { RAW_CONTENT } from '/home/user/stardust/src/content/registry.ts';
import { runHeadless } from '/home/user/stardust/src/sim/index.ts';
import { buildFor } from '/home/user/stardust/src/balance/harness.ts';
import { referenceRunProfile, runConfig } from '/home/user/stardust/src/balance/profile.ts';
it('probe', () => {
  const c = compileContent(RAW_CONTENT);
  const map = c.maps.a2_m03;
  const build = buildFor('par', map, c)!;
  const r = runHeadless(runConfig(c, map, build, referenceRunProfile(map, c), 1), build);
  console.log(JSON.stringify(r.waves.slice(2, 6).map((w) => ({ w: w.wave, s: w.startTick, c: w.clearedTick }))));
  console.log(JSON.stringify(r.steps.filter((s) => s.wave >= 4 && s.wave <= 5)));
}, 60000);
