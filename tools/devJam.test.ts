// dev_silence (T702; devJam.ts): the jamming core in a whole sim, through commands. Par's run
// (deterministic, a win, the W1 teach's tendril on the Hum Choir, harness #10 inside its 25%),
// System Reboot cast with the `ability` command, a jam surviving an upgrade, and a Jammed tower
// still retargeted and sold. smoke/jam.spec.ts counts on the same map.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../src/app/battleSetup.ts';
import { jamLimitChecks } from '../src/balance/jamLimit.ts';
import { runMap } from '../src/balance/harness.ts';
import type { RunRecord } from '../src/balance/checks.ts';
import { compileContent } from '../src/content/compile.ts';
import type { CompiledContent } from '../src/content/compiled.ts';
import type { IdSpace } from '../src/content/types.ts';
import { createSim, type Sim } from '../src/sim/index.ts';
import type { SimEvent } from '../src/sim/events.ts';
import { jamTower } from '../src/sim/jam.ts';
import type { SimState } from '../src/sim/state.ts';
import { DEV_CONTENT } from '../src/render/__fixtures__/devBattle.ts';

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the dev ids are an IdSpace
const CONTENT = compileContent(DEV_CONTENT) as unknown as CompiledContent<IdSpace>;

/** The sim's state, writable (a test lands jams directly). */
function writable(s: Sim<IdSpace>): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test lands jams directly
  return s.state as unknown as SimState;
}

function sim(): Sim<IdSpace> {
  return createSim(battleConfig('dev_silence', 1));
}

function towerAt(s: Sim<IdSpace>, col: number, row: number) {
  return s.state.towers.items.find((t) => t.alive && t.col === col && t.row === row)!;
}

/** Par's steps in order (wave 1's at once), then every wave as soon as it can be called. */
function playPar(): { s: Sim<IdSpace>; events: SimEvent<IdSpace>[] } {
  const s = sim();
  const events: SimEvent<IdSpace>[] = [];
  for (const st of s.map.builds.parBuild.steps) {
    if (st.kind === 'build') s.enqueue({ type: 'build', tower: st.tower, tile: st.tile });
    else if (st.kind === 'upgrade') {
      s.enqueue({ type: 'upgrade', towerUid: towerAt(s, ...st.tile).uid });
    }
    s.step();
  }
  s.enqueue({ type: 'callWave' });
  while (s.state.outcome === 'playing' && s.state.tick < 60 * 240) {
    s.step();
    s.drainEvents(events);
    if (s.state.schedule.phase === 'countdown') s.enqueue({ type: 'callWave' });
  }
  return { s, events };
}

describe('dev_silence (T702)', () => {
  const { s, events } = playPar();

  it('is deterministic and par wins', () => {
    expect(playPar().s.hash()).toBe(s.hash());
    expect(s.state.outcome).toBe('won');
  });

  it('the Silencers tell on the Choir first, and their jams land and end', () => {
    const tells = events.filter((e) => e.type === 'JamTell');
    const choir = towerAt(s, 7, 2);
    expect(tells.length).toBeGreaterThan(0);
    expect(tells[0]).toMatchObject({ kind: 'tendril', towers: [choir.uid] });
    const jammed = events.filter((e) => e.type === 'TowerJammed');
    const freed = events.filter((e) => e.type === 'TowerUnjammed');
    expect(jammed.length).toBeGreaterThan(0);
    expect(freed.length).toBe(jammed.length); // every jam ends
    expect(s.state.stats.jammedPeak).toBeGreaterThanOrEqual(1);
    expect(s.state.stats.jamOverLimitTicks).toBe(0);
  });

  it('harness #10 passes on par, and fails a run over 25%', () => {
    const report = runMap(CONTENT, 'dev_silence', { seeds: 2, build: 'par' });
    const ten = report.checks.find((c) => c.id === '10');
    expect(ten?.ok).toBe(true);
    const [check] = jamLimitChecks(CONTENT.maps.dev_silence!, [1]);
    const over = { jammedPeak: 2, jamOverLimitTicks: 30, jammedTowerTicks: 60, towerTicks: 120 };
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a record with just the stats #10 reads
    const rec = { build: 'par', seed: 1, result: { stats: over } } as unknown as RunRecord;
    expect(check!.evaluate(() => rec)).toMatchObject({
      ok: false,
      failures: ['seed 1: 30 ticks over 25% (peak 2 jammed)'],
    });
  });

  it('System Reboot clears every jam on the cast’s tick, and the towers fire that tick', () => {
    const t = sim();
    t.enqueue({ type: 'build', tower: 'rivet', tile: [3, 2] });
    t.enqueue({ type: 'build', tower: 'choir', tile: [7, 2] });
    t.step();
    const rivet = writable(t).towers.items.find((x) => x.alive && x.col === 3 && x.row === 2)!;
    const choir = writable(t).towers.items.find((x) => x.alive && x.col === 7 && x.row === 2)!;
    jamTower(writable(t), rivet, 240, 0);
    jamTower(writable(t), choir, 240, 0);
    t.step();
    t.drainEvents([]);
    t.enqueue({ type: 'ability', slot: 1 });
    t.step();
    const out: SimEvent<IdSpace>[] = [];
    t.drainEvents(out);
    expect(out.map((e) => e.type)).toEqual([
      'AbilityUsed',
      'TowerUnjammed',
      'TowerUnjammed',
      'Rebooted',
    ]);
    expect([rivet.jamTicks, choir.jamTicks]).toEqual([0, 0]);
    expect([rivet.jamImmuneTicks, choir.jamImmuneTicks]).toEqual([359, 359]);
    expect(t.state.abilityCooldownTicks[0]).toBeGreaterThan(40 * 60 - 5);
  });

  it('a Jammed tower can still be upgraded (the jam goes on), retargeted, and sold', () => {
    const t = sim();
    t.enqueue({ type: 'build', tower: 'rivet', tile: [3, 2] });
    t.step();
    const rivet = writable(t).towers.items.find((x) => x.alive && x.col === 3 && x.row === 2)!;
    jamTower(writable(t), rivet, 240, 0);
    t.step();
    const left = rivet.jamTicks;
    t.enqueue({ type: 'upgrade', towerUid: rivet.uid });
    t.enqueue({ type: 'targeting', towerUid: rivet.uid, mode: 'strong' });
    t.step();
    expect([rivet.tier, rivet.priority, rivet.jamTicks]).toEqual([2, 'strong', left - 1]);
    t.enqueue({ type: 'sell', towerUid: rivet.uid });
    t.step();
    expect(rivet.alive).toBe(false);
  });
});
