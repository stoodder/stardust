// The finale's end, as built for FIN (T821) and pinned on dev_phases (render/__fixtures__/devM8.ts,
// its Unsung's HP cut so the fixture's towers carry it through): waves of a script phase
// (`WaveDef.inPhase`: held before it, never started after it), the scripted win (`winBy:
// 'script'`: Dawn's 8 s hold), Dawn waking the hushed singers (`restAll`: DawnBroke, Voices back,
// `stats.voicesMin` kept), the `{ echoArrived }` trigger, the hush allowance (`ChoirDef.maxHushed`),
// and the build executor's rebuild of a class the script restored (sim/headless.ts).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../src/content/compile.ts';
import type { CompiledContent } from '../src/content/compiled.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import type { IdSpace, MapDef, RawContent, WaveDef } from '../src/content/types.ts';
import { validate } from '../src/content/validate.ts';
import { DEV_CONTENT } from '../src/render/__fixtures__/devBattle.ts';
import { flagsFor } from '../src/balance/checks.ts';
import { buildFor } from '../src/balance/harness.ts';
import { referenceRunProfile, runConfig } from '../src/balance/profile.ts';
import {
  createBuildExecutor,
  createSim,
  minVoicesOf,
  runHeadless,
  type Sim,
  type SimConfig,
} from '../src/sim/index.ts';
import type { SimEvent } from '../src/sim/events.ts';

const MAP = 'dev_phases';
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the dev ids are an IdSpace
const RAW = DEV_CONTENT as unknown as RawContent<IdSpace>;

/** dev_phases with the Unsung's HP cut, and `patch` over the map. */
function content(patch: Partial<MapDef<IdSpace>> = {}): CompiledContent<IdSpace> {
  const unsung = { ...RAW.enemies.unsung!, hp: 3000 };
  const map = { ...RAW.maps[MAP]!, ...patch };
  return compileContent({
    ...RAW,
    enemies: { ...RAW.enemies, unsung },
    maps: { ...RAW.maps, [MAP]: map },
  });
}

function config(c: CompiledContent<IdSpace>, flags: SimConfig<IdSpace>['scriptFlags']) {
  const map = c.maps[MAP]!;
  return {
    content: c,
    mapId: MAP,
    seed: 1,
    loadout: map.builds.parBuild.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
    specsUnlocked: [],
    scriptFlags: flags,
  } satisfies SimConfig<IdSpace>;
}

const RING = [
  [8, 1],
  [8, 5],
  [4, 5],
  [1, 3],
  [11, 3],
] as const;

interface Played {
  readonly s: Sim<IdSpace>;
  readonly events: SimEvent<IdSpace>[];
  readonly at: Map<SimEvent<IdSpace>, number>;
  /** callWave rejections while a wave was held. */
  readonly heldCalls: string[];
}

/** Par's towers and a Rivet ring; every wave called once it can be; "Who's there?" pressed. */
function play(c: CompiledContent<IdSpace>, flags: SimConfig<IdSpace>['scriptFlags']): Played {
  const s = createSim(config(c, flags));
  for (const st of s.map.builds.parBuild.steps) {
    if (st.kind === 'build') s.enqueue({ type: 'build', tower: st.tower, tile: st.tile });
    s.step();
  }
  for (const [col, row] of RING) {
    s.enqueue({ type: 'build', tower: 'rivet', tile: [col, row] });
    s.step();
  }
  s.enqueue({ type: 'callWave' });
  const events: SimEvent<IdSpace>[] = [];
  const at = new Map<SimEvent<IdSpace>, number>();
  const heldCalls: string[] = [];
  while (s.state.outcome === 'playing' && s.state.tick < 60 * 400) {
    const held = s.state.schedule.phase === 'held';
    if (held && s.state.tick % 60 === 0) s.enqueue({ type: 'callWave' });
    s.step();
    const out: SimEvent<IdSpace>[] = [];
    s.drainEvents(out);
    for (const e of out) {
      at.set(e, s.state.tick);
      if (e.type === 'ForcedInputRequested') s.enqueue({ type: 'scriptInput', id: e.id });
      if (held && e.type === 'CommandRejected' && e.cmd.type === 'callWave') {
        heldCalls.push(e.reason);
      }
    }
    events.push(...out);
    if (s.state.tick % 60 === 0 && s.state.credits >= 200) {
      const t = s.state.towers.items.find((x) => x.alive && x.tier < 3 && x.def?.id === 'rivet');
      if (t !== undefined) s.enqueue({ type: 'upgrade', towerUid: t.uid });
    }
    if (s.state.schedule.phase === 'countdown') s.enqueue({ type: 'callWave' });
  }
  return { s, events, at, heldCalls };
}

function of<T extends SimEvent<IdSpace>['type']>(events: SimEvent<IdSpace>[], type: T) {
  return events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);
}

describe("Dawn's hold (winBy: 'script') and Dawn waking the choir", () => {
  const { s, events, at } = play(content(), { quill_choice: 'rewrite', spared_quiet_wave: false });

  it('is won 8 s after Dawn by its endMap, not as the last wave resolves', () => {
    expect(s.state.outcome).toBe('won');
    const dawn = of(events, 'PhaseChanged').find((e) => e.phase === 3)!;
    const won = of(events, 'MapWon')[0]!;
    // Every wave resolved at Dawn (the Unsung laid to rest), yet the win waits for the light.
    const lastCleared = of(events, 'WaveCleared').at(-1)!;
    expect(at.get(lastCleared)! - at.get(dawn)!).toBeLessThanOrEqual(1);
    expect(at.get(won)! - at.get(dawn)!).toBe(8 * 60);
  });

  it('wakes every hushed singer at Dawn (DawnBroke), keeping the low point as the score', () => {
    const hushed = of(events, 'SingerHushed');
    expect(hushed.length).toBeGreaterThan(0); // the digs (no burrow answer here)
    const broke = of(events, 'DawnBroke');
    expect(broke).toHaveLength(1);
    expect(s.state.choir.voices).toBe(s.state.choir.singers);
    expect(s.state.stats.voicesMin).toBe(s.state.choir.singers - hushed.length);
  });

  it('a map with no winBy still wins as its last wave resolves', () => {
    const plain = play(content({ winBy: undefined, events: noWin() }), {
      quill_choice: 'rewrite',
      spared_quiet_wave: false,
    });
    expect(plain.s.state.outcome).toBe('won');
    const dawn = of(plain.events, 'PhaseChanged').find((e) => e.phase === 3)!;
    expect(plain.at.get(of(plain.events, 'MapWon')[0]!)! - plain.at.get(dawn)!).toBeLessThan(60);
  });
});

/** dev_phases' events without its `endMap` win. */
function noWin(): MapDef<IdSpace>['events'] {
  return (RAW.maps[MAP]!.events ?? []).filter((e) => !e.actions.some((a) => 'endMap' in a));
}

describe('waves of a script phase (inPhase)', () => {
  const base = RAW.maps[MAP]!.waves;
  // W3 (the Unsung) belongs to Phase 2, and a W4 of Motes after it.
  const w4: WaveDef<IdSpace> = {
    countdownSec: 600,
    inPhase: 2,
    groups: [{ enemy: 'mote', count: 2, route: 'a' }],
  };
  const waves = [base[0]!, base[1]!, { ...base[2]!, inPhase: 2 }, w4];
  const c = content({ waves });
  const { s, events, at, heldCalls } = play(c, { quill_choice: 'keep', spared_quiet_wave: true });

  it('holds the countdown until the phase begins, and refuses a call while held', () => {
    const p2 = at.get(of(events, 'PhaseChanged').find((e) => e.phase === 2)!)!;
    const w2Spawned = of(events, 'CountdownStarted').find((e) => e.wave === 3);
    const w3 = of(events, 'WaveStarted').find((e) => e.wave === 3)!;
    expect(w2Spawned).toBeDefined();
    expect(at.get(w2Spawned!)!).toBeGreaterThanOrEqual(p2); // no countdown while held
    expect(at.get(w3)!).toBeGreaterThan(p2);
    expect(heldCalls.length).toBeGreaterThan(0);
    expect(new Set(heldCalls)).toEqual(new Set(['waveInProgress']));
  });

  it('never starts a wave of a phase the map has passed (the schedule ends at Dawn)', () => {
    expect(s.state.outcome).toBe('won');
    expect(of(events, 'WaveStarted').some((e) => e.wave === 4)).toBe(false);
    expect(s.state.schedule.phase).toBe('done');
  });

  it('validates: a whole phase ≥ 2 some setPhase reaches, not on wave 1 nor with bossEnded', () => {
    const bad = (ws: WaveDef<IdSpace>[]): string[] =>
      validate({ ...RAW, maps: { ...RAW.maps, [MAP]: { ...RAW.maps[MAP]!, waves: ws } } })
        .map(String)
        .filter((m) => m.includes('inPhase'));
    expect(bad([{ ...base[0]!, inPhase: 2 }, base[1]!, base[2]!])[0]).toContain(
      'wave 1 is started by the player',
    );
    expect(bad([base[0]!, { ...base[1]!, inPhase: 1 }, base[2]!])[0]).toContain('≥ 2');
    expect(bad([base[0]!, { ...base[1]!, inPhase: 5 }, base[2]!])[0]).toContain(
      'no setPhase action reaches phase 5',
    );
    expect(
      bad([base[0]!, base[1]!, { ...base[2]!, inPhase: 2, countdownAfter: 'bossEnded' }])[0],
    ).toContain("can't wait for a phase and a boss");
  });
});

describe('the echoArrived trigger', () => {
  const events = [
    ...(RAW.maps[MAP]!.events ?? []),
    { id: 'she_heard', on: { echoArrived: 'thrum' }, actions: [{ cue: 'heard' }] },
  ];
  const played = play(content({ events }), { quill_choice: 'rewrite', spared_quiet_wave: false });

  it('fires the tick after the echo reaches the song, once', () => {
    const arrived = of(played.events, 'EchoArrived');
    const cue = of(played.events, 'ScriptCue').filter((e) => e.cueId === 'heard');
    expect(arrived).toHaveLength(1);
    expect(cue).toHaveLength(1);
    expect(played.at.get(cue[0]!)! - played.at.get(arrived[0]!)!).toBe(1);
    expect(played.s.state.echoesArrived).toEqual(['thrum']);
  });

  it('validates that some spawnEcho sends the echo it names', () => {
    const bad = validate({
      ...RAW,
      maps: {
        ...RAW.maps,
        [MAP]: {
          ...RAW.maps[MAP]!,
          events: [...events, { id: 'x', on: { echoArrived: 'nobody' }, actions: [] }],
        },
      },
    }).map(String);
    expect(bad.some((m) => m.includes("echoArrived 'nobody': no spawnEcho sends that echo"))).toBe(
      true,
    );
  });
});

describe('the hush allowance (ChoirDef.maxHushed)', () => {
  it('sets the floor at the run’s choir − maxHushed (at least 1), in every cell', () => {
    const fin = compileContent(RAW_CONTENT).maps.fin_m01;
    const floor = (singers: number): number | null =>
      minVoicesOf({ choir: { singers } } as Parameters<typeof minVoicesOf>[0], fin);
    expect(fin.choir!.maxHushed).toBe(14);
    expect(floor(20)).toBe(6);
    expect(floor(28)).toBe(14);
    expect(floor(16)).toBe(2);
    expect(floor(17)).toBe(3); // Thrum walks: +1 singer, never hushed
    expect(floor(10)).toBe(1);
  });

  it('validates: a whole number, and instead of minVoices/minVoicesPct', () => {
    const voices = RAW.maps.dev_voices!;
    const errs = (patch: Partial<MapDef<IdSpace>>): string[] =>
      validate({ ...RAW, maps: { ...RAW.maps, dev_voices: { ...voices, ...patch } } })
        .map(String)
        .filter((m) => m.startsWith('[choir]'));
    const choir = { ...voices.choir!, maxHushed: 5 };
    expect(errs({ choir })).toEqual([
      '[choir] maps.dev_voices.minVoices: a choir map gives one of minVoices, minVoicesPct, or choir.maxHushed',
    ]);
    expect(errs({ choir, minVoicesPct: undefined })).toEqual([]);
    expect(errs({ choir: { ...choir, maxHushed: 2.5 }, minVoicesPct: undefined })).toEqual([
      '[choir] maps.dev_voices.choir.maxHushed: must be a whole number ≥ 1',
    ]);
  });
});

describe('the executor rebuilds a class the script restored (Directive 0)', () => {
  const live = compileContent(RAW_CONTENT);
  const fin = live.maps.fin_m01;
  const run = (label: string) => {
    const build = buildFor(label, fin, live)!;
    const flags = flagsFor(label, fin) ?? {};
    const profile = referenceRunProfile(fin, live, 'standard', undefined, flags);
    const sim = createSim(runConfig(live, fin, build, profile, 1, flags));
    const exec = createBuildExecutor(sim, build);
    const folded: number[] = [];
    while (sim.state.outcome === 'playing' && sim.state.phase < 3) {
      exec.beforeTick();
      sim.step();
      const out: SimEvent[] = [];
      sim.drainEvents(out);
      for (const e of out) if (e.type === 'TowerRevoked') folded.push(e.uid);
    }
    return { sim, exec, folded };
  };

  it("under Keep, re-issues every command on the folded towers' tiles, in order, once", () => {
    const { sim, exec, folded } = run('flag:quill_choice=keep');
    expect(folded.length).toBeGreaterThan(0);
    const builds = exec.rebuilt.filter((r) => r.kind === 'build');
    expect(builds).toHaveLength(folded.length);
    expect(exec.rebuilt.every((r) => r.error === null)).toBe(true);
    // The class stands again on its tiles.
    for (const r of builds) {
      const idx = r.tile[1] * fin.cols + r.tile[0];
      const t = sim.state.towers.items[sim.state.towerAtTile[idx]!];
      expect(t?.alive && t.def?.id).toBe('mindspike');
    }
    // Later par steps still ran in order.
    expect(exec.steps.every((st) => st.error === null)).toBe(true);
  });

  it('is inert without a restore: A3M2 (a revocation, no restore) and FIN under Rewrite', () => {
    const a3m2 = live.maps.a3_m02;
    const build = a3m2.builds.parBuild;
    const profile = referenceRunProfile(a3m2, live, 'standard');
    const sim = createSim(runConfig(live, a3m2, build, profile, 1, {}));
    const exec = createBuildExecutor(sim, build);
    while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 60 * 30) {
      exec.beforeTick();
      sim.step();
    }
    expect(sim.state.stats.revocations).toBeGreaterThan(0);
    expect(exec.rebuilt).toEqual([]);
    expect(run('flag:quill_choice=rewrite').exec.rebuilt).toEqual([]);
    // And a headless run's result doesn't depend on it (no field reads it).
    expect(runHeadless(runConfig(live, a3m2, build, profile, 1, {}), build).outcome).toBe(
      sim.state.outcome,
    );
  });
});
