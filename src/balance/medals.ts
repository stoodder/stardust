// Medals in the balance harness: the `medals` check (a map's `parMedals` says which medals its par
// build must earn on every seed; A1M1's par must earn Teamwork) and the medal marks the
// reports print beside each run.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace, MedalKind } from '../content/types.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { describeRun, type CheckSpec } from './checks.ts';

const MARK: Readonly<Record<MedalKind, string>> = {
  victory: 'V',
  perfectCore: 'P',
  challenge: 'C',
};
const ORDER: readonly MedalKind[] = ['victory', 'perfectCore', 'challenge'];

/** "V P C" with `·` for each medal the run didn't earn; `—` without a result. */
export function medalMarks(r: HeadlessResult | null): string {
  if (r === null) return '—';
  return ORDER.map((k) => (r.medals[k] === 'earned' ? MARK[k] : '·')).join(' ');
}

/** The `medals` check: par earns every medal in `parMedals` on every seed (none: no check). */
export function medalChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  every: readonly number[],
): CheckSpec[] {
  const want = map.builds.parMedals;
  if (want.length === 0) return [];
  const needs = every.map((seed) => ({ build: 'par', seed }));
  return [
    {
      id: 'medals',
      title: `par earns ${want.join(', ')}`,
      subject: 'par',
      needs,
      evaluate(get) {
        const failures: string[] = [];
        let earned = 0;
        for (const req of needs) {
          const rec = get(req);
          const r = rec.result;
          const missing = r === null ? want : want.filter((k) => r.medals[k] !== 'earned');
          if (missing.length === 0) earned++;
          else {
            failures.push(
              `seed ${rec.seed}: ${missing.join(', ')} not earned (${r === null ? describeRun(rec) : medalMarks(r)})`,
            );
          }
        }
        return { ok: failures.length === 0, summary: `${earned}/${needs.length} earned`, failures };
      },
    },
  ];
}
