// Harness #10, the jam limit (conventions.md § Balance sims; design/enemies.md § 4's wave-design
// limit; D146; T702): on a map whose waves send a jammer (rules.ts JAMMER_ENEMIES), the par build
// never has more than JAM_MAX_TOWER_SHARE (25%) of its live towers Jammed at once, on every seed.
// The sim tallies it each tick (sim/jam.ts: `stats.jamOverLimitTicks`, the ticks over the share;
// `jammedPeak`; `jammedTowerTicks` / `towerTicks`, the jam uptime the report prints).
import type { CompiledMapDef } from '../content/compiled.ts';
import { JAM_MAX_TOWER_SHARE, JAMMER_ENEMIES } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { fmtPct, perRun, type CheckSpec } from './checks.ts';

type JamStats = Pick<
  HeadlessResult['stats'],
  'jammedPeak' | 'jamOverLimitTicks' | 'jammedTowerTicks' | 'towerTicks'
>;

/** Whether `map`'s waves (or its script groups) send a jammer: #10 runs there. */
export function sendsJammers<K extends IdSpace>(map: CompiledMapDef<K>): boolean {
  for (const w of map.waves) {
    for (const g of w.groups) if (JAMMER_ENEMIES.includes(g.enemy.id)) return true;
  }
  for (const g of Object.values(map.scriptGroups)) {
    if (JAMMER_ENEMIES.includes(g.enemy.id)) return true;
  }
  return false;
}

/** Jam uptime: the share of tower-ticks Jammed, as a percentage (0 with no towers). */
export function jamUptimePct(stats: JamStats): number {
  return stats.towerTicks === 0 ? 0 : (100 * stats.jammedTowerTicks) / stats.towerTicks;
}

/** A run's jam line: "peak 1 jammed, uptime 2.3%, 0 ticks over 25%". */
export function jamLine(stats: JamStats): string {
  return `peak ${stats.jammedPeak} jammed, uptime ${fmtPct(jamUptimePct(stats))}%, ${stats.jamOverLimitTicks} ticks over ${100 * JAM_MAX_TOWER_SHARE}%`;
}

/** #10: par never has more than 25% of its towers Jammed at once (every seed), on a jammer map. */
export function jamLimitChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  every: readonly number[],
): CheckSpec[] {
  if (!sendsJammers(map)) return [];
  const pct = 100 * JAM_MAX_TOWER_SHARE;
  return [
    perRun(
      '10',
      `par never has more than ${pct}% of its towers jammed at once`,
      'par',
      every,
      (rec) => {
        const s = rec.result!.stats; // perRun judges runs with a result
        return s.jamOverLimitTicks === 0
          ? null
          : `${s.jamOverLimitTicks} ticks over ${pct}% (peak ${s.jammedPeak} jammed)`;
      },
      (recs) => recs.map((r) => (r.result === null ? '-' : jamLine(r.result.stats))).join(' / '),
    ),
  ];
}
