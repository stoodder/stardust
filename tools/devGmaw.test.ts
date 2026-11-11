// dev_gmaw (T708; render/__fixtures__/devM7.ts): the Gathering Maw in whole sims, through
// commands. Par wins through its three phases (the wide gather, the split at 50%, the merge 12 s
// later), deterministically, with the boss's three cues on its phases; a replay of the command log
// (whole, or a prefix ending inside the split) lands on the same state with no checkpoint state;
// the harness plays its par; and a part that reaches the gate is defeat. sim/gatheringMaw.test.ts
// has the unit rules; smoke/gmaw.spec.ts plays the same map.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../src/app/battleSetup.ts';
import { runMap } from '../src/balance/harness.ts';
import { compileContent } from '../src/content/compile.ts';
import type { CompiledContent } from '../src/content/compiled.ts';
import type { IdSpace } from '../src/content/types.ts';
import { DEV_CONTENT } from '../src/render/__fixtures__/devBattle.ts';
import { bossDamage } from '../src/sim/enemyAbilities/bossPhases.ts';
import { createSim, type Sim } from '../src/sim/index.ts';
import type { Enemy } from '../src/sim/entities.ts';
import type { SimEvent } from '../src/sim/events.ts';
import type { SimState } from '../src/sim/state.ts';

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the dev ids are an IdSpace
const CONTENT = compileContent(DEV_CONTENT) as unknown as CompiledContent<IdSpace>;
const MAP = 'dev_gmaw';

function towerAt(s: Sim<IdSpace>, col: number, row: number) {
  return s.state.towers.items.find((t) => t.alive && t.col === col && t.row === row)!;
}

interface Played {
  readonly s: Sim<IdSpace>;
  readonly events: SimEvent<IdSpace>[];
  /** Each event with the tick it was drained after. */
  readonly at: Map<SimEvent<IdSpace>, number>;
  /** The state's hash after each tick in `marks`. */
  readonly hashes: Map<number, string>;
}

/** Par's steps in order (wave 1's at once), then every wave as soon as it can be called. */
function playPar(marks: readonly number[] = []): Played {
  const s = createSim(battleConfig(MAP, 1));
  const events: SimEvent<IdSpace>[] = [];
  const at = new Map<SimEvent<IdSpace>, number>();
  const hashes = new Map<number, string>();
  for (const st of s.map.builds.parBuild.steps) {
    if (st.kind === 'build') s.enqueue({ type: 'build', tower: st.tower, tile: st.tile });
    else if (st.kind === 'upgrade') {
      s.enqueue({ type: 'upgrade', towerUid: towerAt(s, ...st.tile).uid });
    } else if (st.kind === 'specialize') {
      s.enqueue({ type: 'specialize', towerUid: towerAt(s, ...st.tile).uid, spec: st.spec });
    }
    s.step();
  }
  s.enqueue({ type: 'callWave' });
  while (s.state.outcome === 'playing' && s.state.tick < 60 * 300) {
    s.step();
    const out: SimEvent<IdSpace>[] = [];
    s.drainEvents(out);
    for (const e of out) at.set(e, s.state.tick);
    events.push(...out);
    if (marks.includes(s.state.tick)) hashes.set(s.state.tick, s.hash());
    if (s.state.schedule.phase === 'countdown') s.enqueue({ type: 'callWave' });
  }
  return { s, events, at, hashes };
}

/** A fresh sim fed `log`'s commands before their ticks, stepped to `tick` (or the run's end). */
function replay(log: Sim<IdSpace>['state']['commandLog'], tick: number) {
  const s = createSim(battleConfig(MAP, 1));
  let next = 0;
  while (s.state.outcome === 'playing' && s.state.tick < tick) {
    while (next < log.length && log[next]!.tick === s.state.tick) {
      s.enqueue(log[next]!.cmd);
      next++;
    }
    s.step();
  }
  return s;
}

describe('dev_gmaw (T708): the Gathering Maw', () => {
  const played = playPar();
  const { s, events, at } = played;
  const of = <T extends SimEvent<IdSpace>['type']>(type: T) =>
    events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);

  it('par wins through its three phases, deterministically', () => {
    expect(s.state.outcome).toBe('won');
    expect(playPar().s.hash()).toBe(s.hash());
    expect(of('BossPhase').map((e) => [e.enemy, e.phase])).toEqual([
      ['gathering_maw', 1],
      ['gathering_maw', 2],
      ['gathering_maw', 3],
    ]);
    // Phase 1 gathered the Fractures that caught it up.
    const gathered = of('Gathered').filter((e) => e.victim === 'fracture');
    expect(gathered.length).toBeGreaterThan(0);
    // The merged Maw died (no ending: a split boss is beaten, not driven off).
    expect(of('BossEnded')).toEqual([]);
    expect(of('EnemyDied').filter((e) => e.enemy === 'gathering_maw')).toHaveLength(1);
  });

  it('splits as phase 2’s 1.5 s telegraph ends and merges exactly 12 s after the split', () => {
    const p2 = of('BossPhase').find((e) => e.phase === 2);
    const [split] = of('BossSplit');
    const [merged] = of('BossMerged');
    expect(split!.parts).toHaveLength(3);
    expect(at.get(split!)! - at.get(p2!)!).toBe(91); // 90 ticks invulnerable, then the split
    expect(at.get(merged!)! - at.get(split!)!).toBe(720);
  });

  it('the boss’s three cues fire the tick after each phase begins', () => {
    const cues = of('ScriptCue');
    const phases = of('BossPhase');
    expect(cues.map((c) => c.cueId)).toEqual([
      'dev_gmaw_cue_spawn',
      'dev_gmaw_cue_split',
      'dev_gmaw_cue_merge',
    ]);
    for (let i = 0; i < 3; i++) expect(at.get(cues[i]!)! - at.get(phases[i]!)!).toBe(1);
  });

  it('replays: the whole log, and a prefix ending inside the split', () => {
    const mid = at.get(of('BossSplit')[0]!)! + 300; // the parts walking, the clock running
    const tell = at.get(of('BossMerged')[0]!)! - 30; // walking together
    const marked = playPar([mid, tell]);
    const log = marked.s.state.commandLog;
    for (const tick of [mid, tell]) {
      expect(replay(log, tick).hash(), `tick ${tick}`).toBe(marked.hashes.get(tick));
    }
    expect(replay(log, Number.MAX_SAFE_INTEGER).hash()).toBe(marked.s.hash());
  });

  it('the harness plays its par to a win', () => {
    const report = runMap(CONTENT, 'dev_gmaw', { seeds: 2, build: 'par' });
    const par = report.runs.filter((r) => r.build === 'par');
    expect(par.length).toBeGreaterThan(0);
    expect(par.every((r) => r.result?.outcome === 'won')).toBe(true);
  });

  it('a part that reaches the gate is defeat (it drains everything)', () => {
    const t = createSim(battleConfig(MAP, 1));
    t.enqueue({ type: 'callWave' });
    t.step();
    t.enqueue({ type: 'callWave' }); // the boss's wave, at once
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test reaches into the live state
    const state = t.state as unknown as SimState;
    let boss: Enemy | null = null;
    while (t.state.tick < 60 * 200 && boss === null) {
      t.step();
      boss =
        state.enemies.items.find((e) => e.alive && e.def?.id === 'gathering_maw' && e.dist > 15) ??
        null;
    }
    if (boss === null) throw new Error('the boss never came 15 tiles down the road');
    bossDamage(state, boss, boss.hp - 0.5 * 12000); // no towers: split it by hand
    const out: SimEvent<IdSpace>[] = [];
    while (t.state.outcome === 'playing' && t.state.tick < 60 * 400) {
      t.step();
      t.drainEvents(out);
    }
    expect(out.some((e) => e.type === 'BossMerged')).toBe(false); // before the merge
    const leak = out.find((e) => e.type === 'EnemyLeaked' && e.enemy.startsWith('gathering'));
    expect(leak).toMatchObject({ enemy: 'gathering_maw_part' });
    expect(t.state.outcome).toBe('lost');
  });
});
