// T809: the finale's persisted run (D154; app/resume.ts). The finale isn't playable yet, so the
// router treats A2M2 as a map that persists its checkpoints (`persistsCheckpoints`, mocked) and
// plays it from the dev save after A2M1: the W5 checkpoint lands in the save's `pendingRun` (a
// valid save), a "closed tab" (the battle stopped with nothing filed) resumes through the router as
// the same run (no retry: its medals still to play for, its kills all its own), paused at the
// checkpoint with the state a straight run had there, and plays on to the straight run's very end
// (the same hash on the same tick). The run's end, a fresh start, and an abandon drop the pending
// run; a save that now builds another config (`configHash`) is refused with a notice.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore, validateSave } from '../meta/index.ts';
import { createSim, type CommandLogEntry, type SimConfig } from '../sim/index.ts';
import { menuNotice, runResult } from '../ui/screens/state.ts';
import { hud, screen, speed } from '../ui/state.ts';
import { startAutoplay } from './autoplay.ts';
import type { Battle, BattleStart } from './battle.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import { createHost, type Host } from './host.ts';
import {
  configHash,
  pendingResume,
  pendingRunOf,
  reloadedNotice,
  RESUME_REFUSED,
  withPendingRun,
} from './resume.ts';
import { createRouter, type Router } from './router.ts';
import { activeSave, initSaves, loadDevSave, setDifficulty } from './save.ts';

vi.mock('./battle.ts', async () => {
  const { createSim: create } = await import('../sim/index.ts');
  const { createHost: host } = await import('./host.ts');
  return {
    startBattle: (
      _game: unknown,
      cfg: SimConfig<IdSpace>,
      _hud: unknown,
      start: BattleStart = {},
    ): Partial<Battle> => {
      const h = host(create(cfg), {
        now: () => 0,
        speed: 0,
        ...(start.resume === undefined ? {} : { resume: start.resume }),
      });
      start.listen?.(h);
      h.catchUp();
      return { host: h, firstFrame: Promise.resolve(), stop: () => undefined };
    },
  };
});
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));
// A2M2 stands in for the finale (the one map that persists its checkpoints, D154).
vi.mock('./resume.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('./resume.ts')>();
  return {
    ...real,
    persistsCheckpoints: (m: { readonly id: string; readonly act: unknown }) =>
      m.id === 'a2_m02' || real.persistsCheckpoints(m),
  };
});

const fakeGame: unknown = {
  scene: { isActive: () => false, start: () => undefined, stop: () => undefined },
};
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the parts the router uses
const game = fakeGame as Phaser.Game;

type H = Host<IdSpace>;
type Log = readonly CommandLogEntry<IdSpace>[];
const MAP = 'a2_m02';
const SEED = 7;
const TIMEOUT_MS = 120_000;

function stepUntil(host: H, done: () => boolean, max = 60 * 60 * 20): void {
  for (let i = 0; i < max; i++) {
    if (done()) return;
    host.fastForward(1);
  }
  throw new Error(`stepUntil: not done after ${max} ticks (tick ${host.sim.state.tick})`);
}

/** Plays `log` through `host` from now on: each entry enqueued just before its tick runs. */
function playLog(host: H, log: Log): void {
  let i = log.findIndex((e) => e.tick >= host.sim.state.tick);
  if (i < 0) i = log.length;
  host.setDriver(() => {
    while (i < log.length && log[i]!.tick <= host.sim.state.tick) host.enqueue(log[i++]!.cmd);
  });
}

const ended = (host: H) => () => host.sim.state.outcome !== 'playing';

interface Straight {
  readonly cpTick: number;
  readonly atCp: string;
  readonly hash: string;
  readonly tick: number;
  readonly kills: number;
  readonly log: Log;
}
let straight: Straight | null = null;

/** Par on A2M2 from the save after A2M1, uninterrupted (computed once). */
function straightRun(): Straight {
  if (straight !== null) return straight;
  loadDevSave('after_a2m1');
  const host = createHost(createSim(battleConfig(MAP, SEED, activeSave())), {
    now: () => 0,
    speed: 0,
  });
  startAutoplay(host, 'par');
  stepUntil(host, () => host.checkpoints.length > 0);
  const atCp = host.sim.hash();
  const cpTick = host.sim.state.tick;
  stepUntil(host, ended(host));
  const s = host.sim.state;
  straight = {
    cpTick,
    atCp,
    hash: host.sim.hash(),
    tick: s.tick,
    kills: s.stats.skitterkinKilled,
    log: [...s.commandLog],
  };
  return straight;
}

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  screen.value = 'title';
  runResult.value = null;
  menuNotice.value = null;
  setSpeed(1);
});

describe('configHash and the pending run', () => {
  it('fingerprints the config in 8 hex digits, apart when anything the replay reads differs', () => {
    loadDevSave('after_a2m1');
    const cfg = battleConfig(MAP, SEED, activeSave());
    const h = configHash(cfg);
    expect(h).toMatch(/^[0-9a-f]{8}$/);
    expect(configHash(battleConfig(MAP, SEED, activeSave()))).toBe(h);
    expect(configHash({ ...cfg, seed: SEED + 1 })).not.toBe(h);
    expect(configHash({ ...cfg, difficulty: 'story' })).not.toBe(h);
    expect(configHash({ ...cfg, scriptFlags: { quill_choice: 'keep' } })).not.toBe(h);
    expect(configHash({ ...cfg, loadout: cfg.loadout.toReversed() })).not.toBe(h);
    // Key order doesn't matter, only values.
    const { seed, mapId, ...rest } = cfg;
    expect(configHash({ mapId, ...rest, seed })).toBe(h);
  });

  it('a persisted run is a valid save field, and rebuilds the same config', () => {
    loadDevSave('after_a2m1');
    const save = activeSave()!;
    const cfg = battleConfig(MAP, SEED, save);
    const log: Log = [{ tick: 40, cmd: { type: 'callWave' } }];
    const run = pendingRunOf(
      cfg,
      { label: 'halls', wave: 5, tick: 90, commandCount: 1 },
      log,
      3,
      null,
    );
    if (run === null) throw new Error('A2M2 is a live map: its run persists');
    expect(run).toMatchObject({ map: MAP, seed: SEED, killsBefore: 3, companion: cfg.companion });
    expect(run.checkpoint).toEqual({ label: 'halls', wave: 5, tick: 90, commandCount: 1 });
    expect(Object.hasOwn(run, 'retriedFrom')).toBe(false);
    const withRun = withPendingRun(save, run);
    const checked = validateSave(JSON.parse(JSON.stringify(withRun)));
    expect(checked.ok ? [] : checked.errors).toEqual([]);
    const back = checked.ok ? checked.value : null;
    expect(back?.pendingRun).toEqual(run);
    const again = pendingResume(back!);
    expect(again).not.toBe('changed');
    expect(again).not.toBeNull();
    if (again === null || again === 'changed') return;
    expect(configHash(again.cfg)).toBe(run.configHash);
    expect(again.resume).toMatchObject({ retriedFrom: null, killsBefore: 3 });
    // A retry before it: the reload keeps where that retry resumed from.
    const retried = pendingRunOf(cfg, { wave: 10, tick: 900, commandCount: 1 }, log, 0, {
      wave: 5,
      tick: 90,
      commandCount: 1,
    });
    if (retried === null) throw new Error('A2M2 is a live map: its run persists');
    expect(retried.retriedFrom).toEqual({ wave: 5, tick: 90, commandCount: 1 });
    expect(validateSave(JSON.parse(JSON.stringify(withPendingRun(save, retried)))).ok).toBe(true);
    // A dev map's run isn't one a save can keep.
    expect(
      pendingRunOf(battleConfig('dev_bore', 1), { wave: 1, tick: 9, commandCount: 0 }, [], 0, null),
    ).toBeNull();
    // Dropping it leaves no field behind.
    expect(Object.hasOwn(withPendingRun(withRun, null), 'pendingRun')).toBe(false);
  });
});

describe('through the router: the closed tab resumes the same run', () => {
  let router: Router;
  const host = (): H => {
    const b = router.battle;
    if (b === null) throw new Error('no battle');
    return b.host;
  };

  /** A2M2 played on the straight log to its W5 checkpoint, then the tab "closes". */
  async function persistAndClose(): Promise<void> {
    const run = straightRun();
    loadDevSave('after_a2m1');
    router = createRouter(game, { mapId: MAP, seed: SEED });
    await router.goto('battle');
    playLog(host(), run.log);
    stepUntil(host(), () => host().checkpoints.length > 0);
    expect(host().sim.hash()).toBe(run.atCp);
    // A while on past it: nothing more persists until the next checkpoint.
    host().fastForward(120);
    const pending = activeSave()?.pendingRun;
    expect(pending?.map).toBe(MAP);
    expect(pending?.checkpoint.wave).toBe(5);
    expect(pending?.checkpoint.tick).toBe(run.cpTick);
    expect(validateSave(JSON.parse(JSON.stringify(activeSave()))).ok).toBe(true);
    // The tab closes: the battle goes with nothing filed (no run end).
    const runs = activeSave()!.stats.runs;
    await router.goto('campaign');
    expect(activeSave()!.stats.runs).toBe(runs);
    expect(activeSave()?.pendingRun).toBeDefined();
  }

  it(
    "replays to the checkpoint and on to the straight run's end, hash for hash, all medals open",
    async () => {
      const run = straightRun();
      await persistAndClose();
      router = createRouter(game, { mapId: MAP, seed: SEED });
      await router.resumePending();
      expect(screen.value).toBe('battle');
      const h = host();
      // The same run, not a retry: nothing forfeited, its kills all its own.
      expect(h.resumedFrom).toBeNull();
      expect(h.killsBefore).toBe(0);
      expect(h.sim.state.tick).toBe(run.cpTick);
      expect(h.sim.hash()).toBe(run.atCp);
      expect(speed.value).toBe(0);
      expect(hud.notice.value?.text).toBe(reloadedNotice('wave 5'));

      playLog(h, run.log);
      stepUntil(h, ended(h));
      expect(h.sim.state.tick).toBe(run.tick);
      expect(h.sim.hash()).toBe(run.hash);
      await router.flushResults();
      const card = runResult.value!;
      expect(card.outcome).toBe('won');
      expect(card.resumedFromWave).toBeNull();
      expect(card.pestsProcessed).toBe(run.kills);
      // The end dropped the pending run.
      expect(activeSave()?.pendingRun).toBeUndefined();
    },
    TIMEOUT_MS,
  );

  it(
    'refuses a save that builds another run now, with the notice, and drops it',
    async () => {
      await persistAndClose();
      expect(setDifficulty('story').ok).toBe(true);
      router = createRouter(game, { mapId: MAP, seed: SEED });
      await router.resumePending();
      expect(screen.value).toBe('campaign');
      expect(menuNotice.value).toBe(RESUME_REFUSED);
      expect(activeSave()?.pendingRun).toBeUndefined();
      await expect(router.resumePending()).rejects.toThrow(/no pending run/);
    },
    TIMEOUT_MS,
  );

  it(
    'a fresh start of the map drops the pending run; so does an abandon',
    async () => {
      await persistAndClose();
      router = createRouter(game, { mapId: MAP, seed: SEED });
      await router.goto('battle');
      expect(activeSave()?.pendingRun).toBeUndefined();

      await persistAndClose();
      router = createRouter(game, { mapId: MAP, seed: SEED });
      await router.resumePending();
      router.abandon();
      expect(activeSave()?.pendingRun).toBeUndefined();
    },
    TIMEOUT_MS,
  );
});
