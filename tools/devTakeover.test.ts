// dev_jam and dev_takeover (T707; render/__fixtures__/devM7.ts): the Auditor's rings and
// "Shareholder Value" in whole sims, through commands. dev_jam's par (four towers) keeps harness
// #10 inside its 25%; dev_takeover's par wins through all three phases (the hangar's drones, Hostile
// Takeover, the jettison and its four plates), deterministically, with Sterling's three cues on the
// boss's phases; a replay of the command log (whole, or a prefix ending inside phase 2 or 3)
// lands on the same state with no checkpoint state. smoke/takeover.spec.ts plays the same map.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../src/app/battleSetup.ts';
import { runMap } from '../src/balance/harness.ts';
import { compileContent } from '../src/content/compile.ts';
import type { CompiledContent } from '../src/content/compiled.ts';
import type { IdSpace } from '../src/content/types.ts';
import { createSim, type Sim } from '../src/sim/index.ts';
import type { SimEvent } from '../src/sim/events.ts';
import { DEV_CONTENT } from '../src/render/__fixtures__/devBattle.ts';

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the dev ids are an IdSpace
const CONTENT = compileContent(DEV_CONTENT) as unknown as CompiledContent<IdSpace>;

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
function playPar(mapId: string, marks: readonly number[] = []): Played {
  const s = createSim(battleConfig(mapId, 1));
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
function replay(mapId: string, log: Sim<IdSpace>['state']['commandLog'], tick: number) {
  const s = createSim(battleConfig(mapId, 1));
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

describe('dev_jam (T707): the Auditors’ rings among healed drones', () => {
  it('par wins with four towers, and harness #10 holds (one jam at a time is 25%)', () => {
    const { s } = playPar('dev_jam');
    expect(s.state.outcome).toBe('won');
    expect(s.state.towers.items.filter((t) => t.alive)).toHaveLength(4);
    const report = runMap(CONTENT, 'dev_jam', { seeds: 2, build: 'par' });
    expect(report.checks.find((c) => c.id === '10')?.ok).toBe(true);
  });
});

describe('dev_takeover (T707): "Shareholder Value"', () => {
  const played = playPar('dev_takeover');
  const { s, events, at } = played;
  const of = <T extends SimEvent<IdSpace>['type']>(type: T) =>
    events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);

  it('par wins through its three phases, deterministically', () => {
    expect(s.state.outcome).toBe('won');
    expect(playPar('dev_takeover').s.hash()).toBe(s.hash());
    expect(of('BossPhase').map((e) => e.phase)).toEqual([1, 2, 3]);
    expect(of('BossEnded')).toMatchObject([{ how: 'driveOff' }]);
    // The hangar launched drones in phase 1 (2 at a time), in the boss's wave.
    const drones = of('EnemySpawned').filter((e) => e.enemy === 'compliance');
    expect(drones.length).toBeGreaterThanOrEqual(2);
    expect(drones.length % 2).toBe(0);
  });

  it('Hostile Takeover lasers 3 s on its picks, then jams them; never past 25% (#10)', () => {
    const tells = of('TakeoverTell');
    expect(tells.length).toBeGreaterThan(0);
    const jammed = of('TowerJammed');
    for (const tell of tells) {
      expect(tell.towers).toHaveLength(1); // six towers placed: floor(1.5)
      const land = jammed.find((j) => j.source === tell.uid && at.get(j)! > at.get(tell)!)!;
      expect(at.get(land)! - at.get(tell)!).toBe(180);
      expect(land.uid).toBe(tell.towers[0]);
    }
    expect(s.state.stats.takeoverJamTicks).toBe(240); // Declined needs a Choir T3 or a Reboot
    expect(s.state.stats.jamOverLimitTicks).toBe(0);
    const report = runMap(CONTENT, 'dev_takeover', { seeds: 2, build: 'par' });
    expect(report.checks.find((c) => c.id === '10')?.ok).toBe(true);
  });

  it('the jettison: armor 0, four plates on the crash markers, never a par pad', () => {
    const [jettisoned] = of('Jettisoned');
    expect(jettisoned).toBeDefined();
    const plates = of('TileOpened');
    expect(plates.map((e) => [e.marker, e.to])).toEqual([
      ['crash_1', 'x'],
      ['crash_2', 'x'],
      ['crash_3', 'x'],
      ['crash_4', 'x'],
    ]);
    const map = s.map;
    const pads = new Set(
      map.builds.parBuild.steps.flatMap((st) =>
        'tile' in st ? [`${st.tile[0]},${st.tile[1]}`] : [],
      ),
    );
    for (const m of ['crash_1', 'crash_2', 'crash_3', 'crash_4']) {
      const [c, r] = map.markers[m]!;
      expect(map.tiles[r * map.cols + c], m).toBe('.'); // decor: nothing builds there
      expect(pads.has(`${c},${r}`), m).toBe(false);
    }
  });

  it('Sterling’s three cues fire the tick after each phase begins', () => {
    const cues = of('ScriptCue');
    const phases = of('BossPhase');
    expect(cues.map((c) => c.cueId)).toEqual([
      'dev_takeover_cue_sv_spawn',
      'dev_takeover_cue_takeover',
      'dev_takeover_cue_jettison',
    ]);
    for (let i = 0; i < 3; i++) expect(at.get(cues[i]!)! - at.get(phases[i]!)!).toBe(1);
  });

  it('replays: the whole log, and a prefix ending inside phase 2 and inside phase 3', () => {
    const p2 = at.get(of('TakeoverTell')[0]!)! + 60; // mid-laser
    const p3 = at.get(of('Jettisoned')[0]!)! + 30;
    const marked = playPar('dev_takeover', [p2, p3]);
    const log = marked.s.state.commandLog;
    for (const tick of [p2, p3]) {
      expect(replay('dev_takeover', log, tick).hash(), `tick ${tick}`).toBe(
        marked.hashes.get(tick),
      );
    }
    expect(replay('dev_takeover', log, Number.MAX_SAFE_INTEGER).hash()).toBe(marked.s.hash());
  });
});
