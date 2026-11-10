// dev_penitent (T506; devBattle.ts): A2M5's shape in six waves, the pivot both ways (D137). Par's
// Lookout and Zapcoils break the short Penitent's shield (phase 2, the shards, a re-form) and
// force the pivot at its 50% in W5 (Kneel); with nothing built, W6's start forces it. Either way
// one script event runs the objective switch and the refugees (never both), the Aelari stand down
// without a leak and W5 resolves, the Ward kneels where the Penitent stood, and the run ends the
// same way every time. A retry from the W5 checkpoint replays across the pivot to the same end.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { waveClearBonusFor } from '../../content/rules.ts';
import type { IdSpace } from '../../content/types.ts';
import {
  createSim,
  evaluateCondition,
  type CommandLogEntry,
  type Sim,
  type SimEvent,
} from '../../sim/index.ts';

const MAP = 'dev_penitent';
const LOG = new Set([
  'BossPhase',
  'ShieldReformed',
  'BossEnded',
  'StoodDown',
  'ObjectiveChanged',
  'WaveStarted',
  'WaveCleared',
  'CheckpointReached',
  'MapWon',
  'MapLost',
]);
/** Kneel (act2.md § A2M5): the pivot forced before W6 starts. */
const KNEEL = { stat: 'pivotWave', gte: 1, lte: 5 } as const;

interface Run {
  readonly log: string[];
  readonly hash: string;
  readonly outcome: string;
  readonly sim: Sim<IdSpace>;
  /** The state hash as each checkpoint was reached, by wave. */
  readonly atCheckpoint: Map<number, { tick: number; hash: string }>;
  readonly commands: readonly CommandLogEntry<IdSpace>[];
}

/** One event as a short line: the tick, its type, and what tells it apart. */
function line(tick: number, e: SimEvent<IdSpace>): string {
  const detail =
    e.type === 'BossPhase'
      ? e.phase
      : e.type === 'BossEnded'
        ? e.how
        : e.type === 'StoodDown'
          ? e.enemy
          : e.type === 'WaveStarted' || e.type === 'WaveCleared' || e.type === 'CheckpointReached'
            ? e.wave
            : e.type === 'ObjectiveChanged'
              ? e.objective
              : '';
  return `${tick} ${e.type} ${detail}`.trim();
}

/** Runs dev_penitent to its end: par's builds (or none), each wave on its own countdown. */
function play(build: boolean, replay: readonly CommandLogEntry<IdSpace>[] | null = null): Run {
  const sim = createSim(battleConfig(MAP, 1));
  if (replay === null) {
    if (build) {
      for (const s of sim.map.builds.parBuild.steps) {
        if (s.kind === 'build') sim.enqueue({ type: 'build', tower: s.tower, tile: s.tile });
      }
    }
    sim.enqueue({ type: 'callWave' });
  }
  const commands = replay ?? [];
  let next = 0;
  const log: string[] = [];
  const atCheckpoint = new Map<number, { tick: number; hash: string }>();
  const out: SimEvent<IdSpace>[] = [];
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 300) {
    for (; next < commands.length && commands[next]!.tick <= sim.state.tick; next++) {
      sim.enqueue(commands[next]!.cmd);
    }
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (LOG.has(e.type)) log.push(line(sim.state.tick, e));
      if (e.type === 'CheckpointReached') atCheckpoint.set(e.wave, { tick: e.tick, hash: '' });
    }
    for (const [wave, cp] of atCheckpoint) {
      if (cp.hash === '' && sim.state.tick === cp.tick) {
        atCheckpoint.set(wave, { tick: cp.tick, hash: sim.hash() });
      }
    }
  }
  return {
    log,
    hash: sim.hash(),
    outcome: sim.state.outcome,
    sim,
    atCheckpoint,
    commands: [...sim.state.commandLog],
  };
}

const condCtx = (r: Run) => ({
  content: r.sim.config.content,
  config: r.sim.config,
  map: r.sim.map,
});
const kinds = (r: Run): string[] => r.log.map((l) => l.split(' ').slice(1).join(' '));
const tickOf = (r: Run, what: string): number =>
  Number(r.log.find((l) => l.endsWith(what))?.split(' ')[0] ?? -1);

describe('dev_penitent', () => {
  it('par forces the pivot at 50% in W5 (Kneel): phase 2, its shards, a re-form, then the Ward', () => {
    const a = play(true);
    expect(play(true).hash).toBe(a.hash); // deterministic
    expect(a.outcome).toBe('won');
    const s = a.sim.state;
    expect(s.stats.pivotWave).toBe(5);
    expect(evaluateCondition(KNEEL, s, condCtx(a))).toBe(true);
    const k = kinds(a);
    const order = ['BossPhase 1', 'BossPhase 2', 'ShieldReformed', 'BossEnded pivot'];
    const at = order.map((o) => k.indexOf(o));
    expect(at.every((x) => x >= 0)).toBe(true);
    expect(at).toEqual(at.toSorted((x, y) => x - y));
    expect(k.filter((x) => x === 'BossEnded pivot')).toHaveLength(1);
    // The objective switches once, the tick after the 50% hit (the `bossHpPct` event); the surge's
    // event is spent without running, so one group of 4 walks.
    expect(k.filter((x) => x === 'ObjectiveChanged escort')).toHaveLength(1);
    expect(tickOf(a, 'ObjectiveChanged escort')).toBe(tickOf(a, 'BossEnded pivot') + 1);
    expect(tickOf(a, 'BossEnded pivot')).toBeLessThan(tickOf(a, 'WaveStarted 6'));
    expect(s.stats.refugeesSpawned).toBe(4);
    expect(s.objective).toBe('escort');
    // The Penitent stood down with its wave: no leak, W5 resolved (tripled) a fade later.
    expect(s.integrity).toBe(s.maxIntegrity);
    expect(k).toContain('StoodDown dev_penitent');
    expect(tickOf(a, 'WaveCleared 5') - tickOf(a, 'BossEnded pivot')).toBe(60);
    expect(waveClearBonusFor(5, true)).toBe(3 * waveClearBonusFor(5, false));
    // The Ward kneels where it stood.
    const ward = s.allies.items.slice(0, s.allies.used).find((x) => x.alive && x.kind === 'ward');
    expect(ward).toMatchObject({ group: -1, auraChillPct: 0.4, enemyId: 'dev_penitent' });
  });

  it('with nothing built, W6 starting forces the pivot (no Kneel), above 50%, once', () => {
    const a = play(false);
    const s = a.sim.state;
    expect(s.stats.pivotWave).toBe(6);
    expect(evaluateCondition(KNEEL, s, condCtx(a))).toBe(false);
    const k = kinds(a);
    expect(k).not.toContain('BossPhase 2');
    const w6 = tickOf(a, 'WaveStarted 6');
    expect(tickOf(a, 'BossEnded pivot')).toBe(w6);
    expect(tickOf(a, 'ObjectiveChanged escort')).toBe(w6);
    expect(k.filter((x) => x === 'ObjectiveChanged escort')).toHaveLength(1);
    expect(s.stats.refugeesSpawned).toBe(4);
    // W5 (the Penitent alone) resolves a fade after the pivot, with nothing leaked from it.
    expect(tickOf(a, 'WaveCleared 5') - w6).toBe(59);
    expect(s.stats.leaksByWave[4]).toBe(0);
    // Unguarded, the surge takes the refugees to `maxLost`.
    expect(a.outcome).toBe('lost');
    expect(s.stats.refugeesLost).toBe(a.sim.map.maxLost!);
  });

  it('a retry from the W5 checkpoint replays across the pivot to the same state and end', () => {
    const straight = play(true);
    const cp = straight.atCheckpoint.get(5)!;
    expect(cp.hash).not.toBe('');
    const replay = play(
      true,
      straight.commands.filter((c) => c.tick < cp.tick),
    );
    expect(replay.atCheckpoint.get(5)).toEqual(cp);
    // Past the checkpoint the retry plays on with no commands: par built everything at the start.
    expect(straight.commands.every((c) => c.tick < cp.tick)).toBe(true);
    expect(replay.hash).toBe(straight.hash);
    expect(replay.log).toEqual(straight.log);
  });
});
