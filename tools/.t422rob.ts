import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import { runMap } from '../src/balance/harness.ts';
const raw = RAW_CONTENT.maps.a2_m03;
function shifted(wave: number, pick: (g: any) => boolean, d: number) {
  const ws = raw.waves.map((w: any, i: number) => i + 1 !== wave ? w : { ...w, groups: w.groups.map((g: any) => pick(g) ? { ...g, delaySec: Math.max(0, (g.delaySec ?? 0) + d) } : g) });
  return compileContent({ ...RAW_CONTENT, maps: { ...RAW_CONTENT.maps, a2_m03: { ...raw, waves: ws } } } as any);
}
const cases: [string, number, (g: any) => boolean][] = [
  ['W9 LW', 9, (g) => g.enemy === 'lightwing'],
  ['W9 all', 9, () => true],
  ['W11 all', 11, () => true],
  ['W11 LW', 11, (g) => g.enemy === 'lightwing'],
  ['W7 all', 7, () => true],
  ['W5 all', 5, () => true],
];
for (const [name, w, pick] of cases) for (const d of [-0.2, 0.2]) {
  const r = runMap(shifted(w, pick, d), 'a2_m03', { seeds: 1 });
  const par = r.runs.find((x) => x.build === 'par' && !x.repeat)!.result!;
  const hold = r.runs.find((x) => x.build === 'holdFireWhile:fleeing')?.result;
  console.log(name, d, 'par', par.integrity, par.waves.map((x) => x.integrityLost).join(''), 'hold', hold?.outcome, hold?.integrity, 'failed', r.checks.filter((k) => !k.ok).map((k) => k.id + ' ' + k.title).join(' | '));
}
