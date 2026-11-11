// A3M6's beats as one run shows them (balance/a3m6*.test.ts; T722): the waves' and countdowns'
// ticks, each refugee group's release, the first refugee sheltered and lost, QUILL's sheltered cue,
// the rifts, the Gathering Maw's spawn, split, merge and death (and how much road it had left), and
// the Operatives that reached the gate, by wave.
import { expect } from 'vitest';
import type { CompiledBuild, CompiledContent } from '../../content/compiled.ts';
import { GROUPS } from '../../content/maps/a3_m06/map.ts';
import { BOSS_COUNTDOWN, BOSS_SEC } from '../../content/maps/a3_m06/waves.ts';
import { createBuildExecutor, createSim, type Command, type SimEvent } from '../../sim/index.ts';
import { flagsFor } from '../checks.ts';
import { buildFor } from '../harness.ts';
import { referenceRunProfile, runConfig } from '../profile.ts';

export const TICK_HZ = 60;

export interface A3m6Beats {
  readonly outcome: string;
  readonly ticks: number;
  readonly evacuated: number;
  readonly lost: number;
  /** Each event's ticks by key: `WaveStarted N`, `CountdownStarted N`, `cue <id>`, and so on. */
  readonly at: Readonly<Record<string, readonly number[]>>;
  /** The ticks refugees set off on (one per group; two groups on one tick count once). */
  readonly releases: readonly number[];
  /** The first spawn tick on each rift lane. */
  readonly firstOnRift: Readonly<Record<string, number>>;
  /** Operatives that reached the gate, by wave. */
  readonly operativesLeaked: Readonly<Record<number, number>>;
  /** Road left (tiles) when the merged Gathering Maw died, or null if it didn't. */
  readonly mawRoadLeft: number | null;
  /** A boss (the Maw or a part) reached the gate. */
  readonly bossAtGate: boolean;
}

/**
 * Plays `label` (a harness label; `@story` for Story) on `c`, logging the beats. `afterSplit`: the
 * commands sent the tick the Maw splits (the part-at-the-gate test holds fire then).
 */
export function a3m6Beats(
  c: CompiledContent,
  label: string,
  opts: { readonly build?: CompiledBuild; readonly afterSplit?: readonly Command[] } = {},
): A3m6Beats {
  const map = c.maps.a3_m06;
  const story = label.endsWith('@story');
  const base = story ? label.slice(0, -'@story'.length) : label;
  const build = opts.build ?? buildFor(base, map, c)!;
  const flags = flagsFor(base, map) ?? {};
  const profile = referenceRunProfile(map, c, story ? 'story' : 'standard', undefined, flags);
  const sim = createSim(runConfig(c, map, build, profile, 1, flags));
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  const at: Record<string, number[]> = {};
  const releases: number[] = [];
  const firstOnRift: Record<string, number> = {};
  const operativesLeaked: Record<number, number> = {};
  const waveOf = new Map<number, number>();
  const routeLen = map.routes.road!.lengthTiles;
  let merged = -1;
  let mergedDist = 0;
  let mawRoadLeft: number | null = null;
  let bossAtGate = false;
  const push = (key: string): void => {
    (at[key] ??= []).push(st.tick);
  };
  while (st.outcome === 'playing' && st.tick < TICK_HZ * 60 * 30) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'WaveStarted') push(`WaveStarted ${e.wave}`);
      else if (e.type === 'CountdownStarted') push(`CountdownStarted ${e.wave}`);
      else if (e.type === 'ScriptCue') push(`cue ${e.cueId}`);
      else if (e.type === 'RefugeeEvacuated' && !e.pebble) push('evacuated');
      else if (e.type === 'RefugeeLost') push('lost');
      else if (e.type === 'RiftOpening' || e.type === 'RiftOpened') push(`${e.type} ${e.route}`);
      else if (e.type === 'BossPhase' && e.enemy === 'gathering_maw') push(`BossPhase ${e.phase}`);
      else if (e.type === 'BossSplit') {
        push('BossSplit');
        for (const cmd of opts.afterSplit ?? []) sim.enqueue(cmd);
      } else if (e.type === 'BossMerged') {
        push('BossMerged');
        merged = e.uid;
      } else if (e.type === 'AllySpawned' && e.kind === 'refugee') {
        if (releases.at(-1) !== st.tick) releases.push(st.tick);
      } else if (e.type === 'EnemySpawned') {
        waveOf.set(e.uid, e.wave);
        if (e.enemy === 'gathering_maw' && merged === -1 && at['MawSpawned'] === undefined) {
          push('MawSpawned');
        }
        if (e.route.startsWith('rift_')) firstOnRift[e.route] ??= st.tick;
      } else if (e.type === 'EnemyLeaked') {
        if (e.enemy === 'blackbudget') {
          const w = waveOf.get(e.uid) ?? 0;
          operativesLeaked[w] = (operativesLeaked[w] ?? 0) + 1;
        }
        if (e.enemy.startsWith('gathering_maw')) bossAtGate = true;
      } else if (e.type === 'EnemyDied' && e.uid === merged) {
        push('MawDied');
        mawRoadLeft = routeLen - mergedDist;
      }
    }
    if (merged !== -1) {
      const m = st.enemies.items.find((x) => x.alive && x.uid === merged);
      if (m !== undefined) mergedDist = m.dist;
    }
  }
  return {
    outcome: st.outcome,
    ticks: st.tick,
    evacuated: st.stats.evacuated,
    lost: st.stats.refugeesLost,
    at,
    releases,
    firstOnRift,
    operativesLeaked,
    mawRoadLeft,
    bossAtGate,
  };
}

/** The road the merged Maw has left when par kills it (tiles), at least. */
export const MAW_ROAD_LEFT_MIN = 3;
/** The same for the alts and alwaysCallEarly: dead before the gate's last tile. */
export const ALT_ROAD_LEFT_MIN = 0.5;

/** The beats every winning reference run lands. */
export function expectBeats(b: A3m6Beats, label: string, roadLeftMin = MAW_ROAD_LEFT_MIN): void {
  const one = (k: string): number => {
    expect(b.at[k], `${label}: ${k}`).toHaveLength(1);
    return b.at[k]![0]!;
  };
  const start = (w: number): number => one(`WaveStarted ${w}`);
  expect(b.outcome, label).toBe('won');
  // Each group sets off on its wave (the second W13 group 8 s in: its own tick).
  expect(b.releases, label).toEqual(
    [...new Set(GROUPS.map(([, wave, , sec]) => start(wave) + sec * TICK_HZ))].toSorted(
      (x, y) => x - y,
    ),
  );
  // The first refugee home before W2's countdown, QUILL's cue on the same tick, nobody lost before.
  const sheltered = b.at['evacuated']![0]!;
  expect(sheltered, label).toBeLessThan(one('CountdownStarted 2'));
  expect(one('cue a3_m06_cue_sheltered') - sheltered, label).toBe(1); // the trigger's next tick
  expect(b.at['lost']?.[0] ?? Infinity, label).toBeGreaterThan(sheltered);
  // The rifts crack as W11 starts and open as W12 does; nothing walks one before.
  for (const r of ['rift_w', 'rift_e']) {
    expect(one(`RiftOpening ${r}`), label).toBe(start(11));
    expect(one(`RiftOpened ${r}`), label).toBe(start(12));
    expect(b.firstOnRift[r]!, label).toBeGreaterThanOrEqual(start(12));
  }
  // The Maw: in W16's preview from its countdown, a wave ahead; then the split 91 ticks after its
  // phase 2 begins (90 invulnerable), the merge 12 s after that, and the merged Maw dead in time.
  const maw = one('MawSpawned');
  // (±0.2 s when a shift moves it.)
  expect(Math.abs(maw - start(16) - BOSS_SEC * TICK_HZ), label).toBeLessThanOrEqual(12);
  expect(maw - one('CountdownStarted 16'), label).toBeGreaterThanOrEqual(30 * TICK_HZ);
  expect(one('BossSplit') - one('BossPhase 2'), label).toBe(91);
  expect(one('BossMerged') - one('BossSplit'), label).toBe(12 * TICK_HZ);
  expect(one('MawDied'), label).toBeGreaterThan(one('BossMerged'));
  expect(b.mawRoadLeft!, label).toBeGreaterThanOrEqual(roadLeftMin);
  expect(b.bossAtGate, label).toBe(false);
  // W17's road fills only as the merged Maw reaches the last bend.
  expect(start(17) - maw, label).toBeGreaterThanOrEqual((BOSS_COUNTDOWN - BOSS_SEC) * TICK_HZ);
}
