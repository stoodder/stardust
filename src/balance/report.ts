// Harness reports (conventions.md § Balance sims, Report): the console summary printed on every
// run, and the Markdown report `--report` writes beside reports/balance.json. Pure strings; the
// CLI does the printing and writing.
import { describeRun, fmtPct, type RunRecord } from './checks.ts';
import type { HeadlessResult, TowerSummary } from '../sim/index.ts';
import type { CampaignReport, MapReport } from './harness.ts';
import { medalMarks } from './medals.ts';

const fmtSec = (ms: number): string => `${(ms / 1000).toFixed(2)} s`;
const TICKS_PER_SEC = 60;

/** Each link's uptime as a share of the run ("crossfire 78%"), or "—" with none. */
export function linkUptime(r: HeadlessResult | null): string {
  if (r === null || r.ticks <= 0) return '—';
  const links = Object.entries(r.stats.linkTicks);
  if (links.length === 0) return '—';
  return links.map(([id, ticks]) => `${id} ${Math.round((ticks / r.ticks) * 100)}%`).join(', ');
}

/** A tower's average damage per second from its build to its sale (or the end of the run). */
export function towerDps(t: TowerSummary, endTick: number): number {
  const ticks = (t.soldTick < 0 ? endTick : t.soldTick) - t.builtTick;
  return ticks <= 0 ? 0 : (t.damage * TICKS_PER_SEC) / ticks;
}
const runName = (r: RunRecord): string => `${r.build}${r.repeat ? ' (again)' : ''}`;

/** The first run of each build, in the order they ran (seed 1 for almost all of them). */
function firstRuns(map: MapReport): RunRecord[] {
  const seen = new Set<string>();
  return map.runs.filter((r) => {
    if (r.repeat || seen.has(r.build)) return false;
    seen.add(r.build);
    return true;
  });
}

/** The console summary: a verdict per map, each check, leaks per wave, and the totals. */
export function formatText(report: CampaignReport): string {
  const lines: string[] = [];
  for (const map of report.maps) {
    const band = map.band === null ? 'no band' : `band ${map.band.lo}–${map.band.hi}`;
    lines.push(
      `${map.mapId} (act ${map.act}, ${map.objective}) · ${band} · ${map.runs.length} runs · ${fmtSec(map.ms)} · ${map.ok ? 'PASS' : 'FAIL'}`,
    );
    for (const c of map.checks) {
      lines.push(`  ${c.ok ? 'ok  ' : 'FAIL'} #${c.id} ${c.title}: ${c.summary}`);
      for (const f of c.failures) lines.push(`         ${f}`);
    }
    const runs = firstRuns(map).filter((r) => r.result !== null);
    if (runs.length > 0) {
      const waves = runs[0]!.result!.waves.length; // filtered to runs with results
      const width = Math.max(...runs.map((r) => runName(r).length));
      lines.push(`  leaks per wave (first seed):`);
      lines.push(
        `    ${''.padEnd(width)}  ${Array.from({ length: waves }, (_, i) => `W${i + 1}`.padStart(3)).join(' ')}  result`,
      );
      for (const r of runs) {
        const cells = r.result!.waves.map((w) => `${w.leaked}`.padStart(3)).join(' '); // has a result
        lines.push(
          `    ${runName(r).padEnd(width)}  ${cells}  ${describeRun(r)}, ${r.result!.credits} credits left, medals ${medalMarks(r.result)}`,
        );
      }
    }
    for (const n of map.notChecked) lines.push(`  not checked: ${n}`);
  }
  const failed = report.maps.flatMap((m) => m.checks.filter((c) => !c.ok));
  lines.push(
    `sim: ${report.maps.length} map${report.maps.length === 1 ? '' : 's'} · ${fmtSec(report.ms)} · ${report.ok ? 'PASS' : `FAIL (${failed.length} failed check${failed.length === 1 ? '' : 's'})`}`,
  );
  return lines.join('\n');
}

const row = (cells: readonly (string | number)[]): string => `| ${cells.join(' | ')} |`;

/** The Markdown report: checks, runs, and per-wave and per-tower tables for each build. */
export function formatMarkdown(report: CampaignReport): string {
  const out: string[] = [
    '# Balance report',
    '',
    `${report.ok ? 'PASS' : 'FAIL'} · ${report.maps.length} map(s) · seeds 1–${report.seeds}${report.build === null ? '' : ` · build ${report.build}`} · ${fmtSec(report.ms)}`,
  ];
  for (const map of report.maps) {
    out.push('', `## ${map.mapId} · ${map.ok ? 'PASS' : 'FAIL'}`, '');
    out.push(
      `Act ${map.act}, ${map.objective}; par band ${map.band === null ? 'none' : `${map.band.lo}–${map.band.hi}`}.`,
      '',
    );
    out.push(row(['#', 'Check', 'Result', 'Summary']), row(['---', '---', '---', '---']));
    for (const c of map.checks) {
      const why = c.failures.length === 0 ? '' : `<br>${c.failures.join('<br>')}`;
      out.push(row([c.id, c.title, c.ok ? 'ok' : '**FAIL**', `${c.summary}${why}`]));
    }
    if (map.notChecked.length > 0) out.push('', `Not checked: ${map.notChecked.join('; ')}.`);

    out.push('', '### Runs', '');
    out.push('Medals: V Victory, P Perfect Core, C Challenge; `·` not earned.', '');
    out.push(
      row([
        'Build',
        'Seed',
        'Result',
        'Margin %',
        'Ticks',
        'Credits left',
        'Late steps',
        'Medals',
        'Link uptime',
        'Hash',
        'ms',
      ]),
      row(['---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---']),
    );
    for (const r of map.runs) {
      const res = r.result;
      out.push(
        row([
          runName(r),
          r.seed,
          describeRun(r),
          res === null ? '—' : fmtPct(r.marginPct),
          res?.ticks ?? '—',
          res?.credits ?? '—',
          res === null ? '—' : res.steps.filter((s) => s.late).length,
          medalMarks(res),
          linkUptime(res),
          res?.hash ?? '—',
          Math.round(r.ms),
        ]),
      );
    }

    for (const r of firstRuns(map)) {
      const res = r.result;
      if (res === null) continue;
      out.push('', `### ${runName(r)} · seed ${r.seed}: per wave`, '');
      out.push(
        row([
          'Wave',
          'Spawned',
          'Killed',
          'Leaked',
          'Integrity lost',
          'Bank at phase open',
          'Unspent at start',
          'Early bonus',
          'Late steps',
        ]),
        row(['---', '---', '---', '---', '---', '---', '---', '---', '---']),
      );
      for (const w of res.waves) {
        const late = res.steps.filter((s) => s.late && s.wave === w.wave).length;
        out.push(
          row([
            `W${w.wave}`,
            w.spawned,
            w.killed,
            w.leaked,
            w.integrityLost,
            w.bankAtPhase < 0 ? '—' : w.bankAtPhase,
            w.startTick < 0 ? '—' : w.unspentAtStart,
            w.early ? w.earlyBonus : '—',
            late,
          ]),
        );
      }
      if (res.towers.length > 0) {
        out.push(
          '',
          row(['Tower', 'Tile', 'Tier', 'Built (tick)', 'Shots', 'Kills', 'Damage', 'DPS']),
          row(['---', '---', '---', '---', '---', '---', '---', '---']),
        );
        for (const t of res.towers) {
          out.push(
            row([
              t.tower,
              `(${t.tile[0]}, ${t.tile[1]})`,
              t.tier,
              t.builtTick,
              t.shots,
              t.kills,
              Math.round(t.damage),
              towerDps(t, res.ticks).toFixed(1),
            ]),
          );
        }
        out.push(
          '',
          `Ability kills: ${res.abilityKills}. Ally kills: ${res.allyKills}. Link uptime: ${linkUptime(res)}. Jam uptime: none yet (no jammers).`,
        );
      }
    }
  }
  return `${out.join('\n')}\n`;
}
