// Scratch debug (T422): per-wave leaks by enemy and bank for one build of a2_m03.
import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import { buildFor } from '../src/balance/harness.ts';
import { referenceRunProfile, runConfig, fullCatalogProfile } from '../src/balance/profile.ts';
import { createSim } from '../src/sim/sim.ts';
import { createBuildExecutor } from '../src/sim/headless.ts';

const content = compileContent(RAW_CONTENT);
const mapId = (process.argv[2] ?? 'a2_m03') as 'a2_m03';
const label = process.argv[3] ?? 'par';
const map = content.maps[mapId];
const build = buildFor(label.replace('@fullCatalog', '').replace('@story',''), map, content)!;
const prof = label.endsWith('@fullCatalog')
  ? fullCatalogProfile(map, content)
  : referenceRunProfile(map, content, label.endsWith('@story') ? 'story' : 'standard');
const sim = createSim(runConfig(content, map, build, prof, 1));
const exec = createBuildExecutor(sim, build);
const out: any[] = [];
const leaks: Record<number, Record<string, number>> = {};
const lost: Record<number, number> = {};
const bank: Record<number, number> = {};
let lastWave = 0;
while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 60 * 30) {
  exec.beforeTick();
  out.length = 0; sim.drainEvents(out);
  sim.step();
  out.length = 0; sim.drainEvents(out);
  const w = sim.state.wave;
  if (w !== lastWave) { bank[w] = sim.state.credits; lastWave = w; }
  for (const e of out) {
    if (process.env.TRACE && (e.type === 'TowerBuilt' || e.type === 'TowerUpgraded' || e.type === 'CommandRejected' || ((e.type === 'EnemyLeaked' || e.type==='EnemySpawned') && String(e.enemy) === process.env.TRACE))) console.log(sim.state.tick, w, e.type, JSON.stringify(e).slice(0,160));
    if (e.type === 'EnemyLeaked') {
      const id = e.enemy as string;
      (leaks[w] ??= {})[id] = ((leaks[w] ??= {})[id] ?? 0) + 1;
      lost[w] = (lost[w] ?? 0) + (e.leak ?? 0);
    }
  }
}
console.log(label, sim.state.outcome, 'integrity', sim.state.integrity, 'tick', sim.state.tick, 'min', (sim.state.tick/3600).toFixed(1));
for (let w = 1; w <= map.waves.length; w++) {
  console.log(`W${w} bank@start ${bank[w] ?? '-'} lost ${lost[w] ?? 0} leaks ${JSON.stringify(leaks[w] ?? {})}`);
}
for (const t of (sim as any).state.towers.items ?? []) {}
const bad = exec.steps.filter((s: any) => s.error !== null || s.issuedTick === null);
for (const s of bad) console.log('step', JSON.stringify(s));
