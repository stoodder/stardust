import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import { runMap } from '../src/balance/harness.ts';
const content = compileContent(RAW_CONTENT);
const r = runMap(content, 'a2_m03', { seeds: 1, build: process.argv[2] ?? 'par' });
for (const run of r.runs) {
  const x = run.result; if (!x) continue;
  console.log(run.build, x.outcome, x.integrity, 'bank', x.waves.map((w) => w.bankAtPhase).join(','), 'lost', x.waves.map((w) => w.integrityLost).join(','));
  for (const s of x.steps) if (s.error || s.issuedTick === null) console.log('  step', JSON.stringify(s));
}
{
  const x = r.runs.find((q) => q.build === 'par')!.result!;
  const starts = x.waves.map((w) => w.startTick);
  for (const s of x.steps) {
    const w = starts.findLastIndex((t) => t >= 0 && t <= (s.issuedTick ?? 0)) + 1;
    console.log(`  step W${(s as any).wave ?? '?'} landed in W${w} (${s.issuedTick})`, JSON.stringify((s as any).step ?? s).slice(0, 80));
  }
}
