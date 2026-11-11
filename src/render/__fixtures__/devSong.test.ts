// dev_song (T805; devM8.ts): the Leaving Song end to end. The choir walks up the road with Phase 2
// set as W1 starts, so every Mote broken outside the song scatters and re-forms once (4 s, 50% HP,
// no bounty again), every one broken inside is laid to rest, the trickle keeps the countdown
// moving, and at p = 1 Dawn's event lays every Hollow unit to rest and wins the map. C4's
// multiplier speeds it up (Rewrite) or slows it down (Purge). The smoke flow (smoke/song.spec.ts)
// counts on all of it. The rules one at a time: src/sim/song.test.ts.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { compileContent } from '../../content/compile.ts';
import type {
  ConditionDef,
  FlagValue,
  IdSpace,
  MapDef,
  RawContent,
  ScriptedEvent,
} from '../../content/types.ts';
import { validate } from '../../content/validate.ts';
import {
  createBuildExecutor,
  createSim,
  type Sim,
  type SimConfig,
  type SimEvent,
} from '../../sim/index.ts';
import { DEV_CONTENT, type DevIds } from './devBattle.ts';
import { songMap } from './devM8.ts';

const MAP = 'dev_song';

function config(quill: FlagValue = 'keep', content?: SimConfig<IdSpace>['content']) {
  const base = battleConfig(MAP, 1);
  return {
    ...base,
    ...(content === undefined ? {} : { content }),
    scriptFlags: { ...base.scriptFlags, quill_choice: quill },
  };
}

function patchedRaw(patch: Partial<MapDef<DevIds>>): RawContent<IdSpace> {
  return { ...DEV_CONTENT, maps: { ...DEV_CONTENT.maps, dev_song: { ...songMap, ...patch } } };
}

/** Plays par (or nothing built) to the end; every event, with the tick it came on. */
function play(sim: Sim<IdSpace>, build = true): { tick: number; e: SimEvent<IdSpace> }[] {
  const par = sim.map.builds.parBuild;
  const exec = createBuildExecutor(sim, build ? par : { ...par, steps: [] });
  const all: { tick: number; e: SimEvent<IdSpace> }[] = [];
  const out: SimEvent<IdSpace>[] = [];
  for (let t = 0; t < 30_000 && sim.state.outcome === 'playing'; t++) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) all.push({ tick: sim.state.tick, e });
  }
  return all;
}

/** An event list with one cue guarded by condition `c` (validation's probe). */
const when = (c: ConditionDef<DevIds>): ScriptedEvent<DevIds>[] => [
  { id: 'probe', on: { wave: 1, phase: 'start' }, when: c, actions: [{ cue: 'x' }] },
];

const count = (evs: { e: SimEvent<IdSpace> }[], type: string): number =>
  evs.filter((x) => x.e.type === type).length;

describe('dev_song: the song end to end', () => {
  it('runs (createSim refuses nothing of the song)', () => {
    expect(() => createSim(config())).not.toThrow();
  });

  it('par under each C4: scatter and re-form outside, rest inside, Dawn at p = 1', () => {
    const ends: Record<string, number> = {};
    for (const q of ['keep', 'purge', 'rewrite'] as const) {
      const sim = createSim(config(q));
      const evs = play(sim);
      const s = sim.state;
      expect(s.outcome, q).toBe('won');
      expect(s.restPoints, q).toBe(s.restTarget);
      expect(s.phase, q).toBe(2);
      // Wave 1 meets the choir far up the road: Motes broken out of the song scatter, re-form.
      expect(count(evs, 'Scattered'), q).toBeGreaterThan(0);
      expect(count(evs, 'Reformed'), q).toBe(count(evs, 'Scattered'));
      expect(s.stats.scatteredKills, q).toBeGreaterThanOrEqual(count(evs, 'Scattered'));
      // Laid to rest: each kill's points are restValue × the multiplier; Dawn's are 0.
      const mul = { keep: 1.25, purge: 1, rewrite: 1.5 }[q];
      const rested = evs.filter((x) => x.e.type === 'LaidToRest');
      const kills = rested.filter((x) => x.e.type === 'LaidToRest' && x.e.points > 0);
      expect(kills.length, q).toBe(s.stats.restedKills);
      for (const k of kills) expect(k.e).toMatchObject({ points: mul });
      // Dawn: the tick p reached 1, every live Hollow unit laid to rest, then the win.
      const won = evs.find((x) => x.e.type === 'MapWon')!;
      const dawn = rested.filter((x) => x.e.type === 'LaidToRest' && x.e.points === 0);
      for (const d of dawn) expect(d.tick, q).toBe(won.tick);
      expect(s.enemies.live, q).toBe(0);
      ends[q] = won.tick;
    }
    expect(ends.rewrite!).toBeLessThan(ends.keep!);
    expect(ends.keep!).toBeLessThan(ends.purge!);
  });

  it('a no-kill Phase 2 still reaches Dawn on the trickle alone', () => {
    // One Mote far behind, so nothing dies: only the trickle moves the countdown.
    const content = compileContent(
      patchedRaw({
        waves: [{ groups: [{ enemy: 'mote', count: 1, route: 'a', delaySec: 600 }] }],
      }),
    );
    for (const q of ['keep', 'purge', 'rewrite'] as const) {
      const sim = createSim(config(q, content));
      const evs = play(sim, false);
      expect(sim.state.outcome, q).toBe('won');
      expect(sim.state.stats).toMatchObject({ restedKills: 0, scatteredKills: 0 });
      const mul = { keep: 1.25, purge: 1, rewrite: 1.5 }[q];
      const won = evs.find((x) => x.e.type === 'MapWon')!.tick;
      const trickleTicks = 12 / ((0.2 / 60) * mul); // restTarget ÷ the trickle per tick
      expect(won, q).toBeGreaterThanOrEqual(trickleTicks);
      expect(won, q).toBeLessThan(trickleTicks + 3);
      expect(count(evs, 'EnemyDied'), q).toBe(0);
    }
  });

  it('in Phase 1 the song is silent: kills behave as in Act III', () => {
    const content = compileContent(
      patchedRaw({ events: songMap.events!.filter((e) => e.id !== 'song') }),
    );
    const sim = createSim(config('keep', content));
    const evs = play(sim);
    expect(sim.state.phase).toBe(1);
    expect(count(evs, 'Scattered') + count(evs, 'LaidToRest')).toBe(0);
    expect(sim.state.restPoints).toBe(0);
    expect(sim.state.stats).toMatchObject({ restedKills: 0, scatteredKills: 0 });
    expect(count(evs, 'EnemyDied')).toBeGreaterThan(0);
  });

  it('is deterministic: the same config gives the same hash', () => {
    const a = createSim(config('rewrite'));
    const b = createSim(config('rewrite'));
    play(a);
    play(b);
    expect(a.hash()).toBe(b.hash());
  });

  it('validates the Laid to Rest atom: a share in (0, 1], on a map with a song', () => {
    const bad = patchedRaw({ events: when({ restedPct: 1.5 }) });
    expect(validate(bad).filter((e) => e.includes('restedPct'))).toEqual([
      '[condition] maps.dev_song.events[0].when.restedPct: 1.5 must be in (0, 1]',
    ]);
    const { song: _gone, ...noSong } = songMap;
    const raw: RawContent<IdSpace> = {
      ...DEV_CONTENT,
      maps: {
        ...DEV_CONTENT.maps,
        dev_song: { ...noSong, events: when({ restedPct: 0.9 }) }, // the atom on a songless map
      },
    };
    expect(validate(raw).filter((e) => e.includes('restedPct'))).toEqual([
      '[condition] maps.dev_song.events[0].when.restedPct: reads the song: the map has no `song`',
    ]);
  });
});
