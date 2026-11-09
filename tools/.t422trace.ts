import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import { buildFor } from '../src/balance/harness.ts';
import { referenceRunProfile, runConfig } from '../src/balance/profile.ts';
import { createSim } from '../src/sim/sim.ts';
import { createBuildExecutor } from '../src/sim/headless.ts';
const content = compileContent(RAW_CONTENT);
const map = content.maps.a2_m03;
const build = buildFor(process.argv[2] ?? 'par', map, content)!;
const W = Number(process.argv[3] ?? 2);
const sim = createSim(runConfig(content, map, build, referenceRunProfile(map, content), 1));
const exec = createBuildExecutor(sim, build);
const out: any[] = [];
while (sim.state.outcome === 'playing' && sim.state.wave <= W) {
  exec.beforeTick(); out.length = 0; sim.drainEvents(out);
  for (const e of out) if (e.type.startsWith('Tower') || e.type==='CommandRejected') console.log(sim.state.tick, sim.state.wave, JSON.stringify(e).slice(0, 140));
  sim.step(); out.length = 0; sim.drainEvents(out);
  for (const e of out) if (e.type.startsWith('Tower') || e.type==='CommandRejected') console.log(sim.state.tick, sim.state.wave, JSON.stringify(e).slice(0, 140));
  if (sim.state.wave === W && sim.state.tick % 30 === 0) {
    const st: any = sim.state;
    const es = [];
    for (let i = 0; i < st.enemies.used; i++) { const e = st.enemies.items[i]; if (e.alive) es.push(`${e.def.id}@${e.x.toFixed(1)},${e.y.toFixed(1)} hp${Math.round(e.hp)} sh${Math.round(e.shieldHp ?? e.shield?.hp ?? -1)}`); }
    if (es.length) console.log(st.tick, es.join(' | '));
  }
}
