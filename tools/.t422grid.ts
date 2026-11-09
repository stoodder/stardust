import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import { runMap } from '../src/balance/harness.ts';
const raw = RAW_CONTENT.maps.a2_m03;
const [count, delay, iv] = process.argv.slice(2).map(Number);
const out: string[] = [];
for (const d of [-0.2, 0, 0.2]) {
  const ws = raw.waves.map((w: any, i: number) => i !== 8 ? w : { ...w, groups: w.groups.map((g: any) => g.enemy === 'lightwing' ? { ...g, count, delaySec: delay + d, intervalSec: iv } : g) });
  const c = compileContent({ ...RAW_CONTENT, maps: { ...RAW_CONTENT.maps, a2_m03: { ...raw, waves: ws } } } as any);
  const r = runMap(c, 'a2_m03', { seeds: 1, build: 'par' });
  const par = r.runs.find((x) => x.build === 'par' && !x.repeat)!.result!;
  out.push(`${d}:${par.integrity}(${par.waves.map((x) => x.integrityLost).join('')})`);
}
console.log(count, delay, iv, out.join(' '));
