// Retry checkpoints end to end (T305b; design/core-loop.md § 2.12, architecture.md § Checkpoints):
// the sim marks W5 and W10's countdowns on Act II maps (not Act I's); the host records each with
// the tick it resumes at and the commands before it; a resumed host replays to exactly the state
// the run had there and on to the same end; and through the router, a lost run retried from its
// checkpoint files numbers that match a straight run's from the same point (kills, Pests
// Processed, Stardust) while forfeiting Perfect Core and the Challenge, and a retry abandoned
// later pays only the waves beyond the checkpoint. The battle is a real sim and host without a
// scene (the router's battle module is stubbed); the dialogue's rebuild has its own block.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore, stardustPayout } from '../meta/index.ts';
import {
  createSim,
  type CommandLogEntry,
  type SimConfig,
  type SimEvent,
  type SimState,
} from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { menuNotice, runResult } from '../ui/screens/state.ts';
import { hud, screen, speed } from '../ui/state.ts';
import { startAutoplay } from './autoplay.ts';
import type { Battle, BattleStart } from './battle.ts';
import { battleConfig } from './battleSetup.ts';
import {
  attemptKills,
  checkpointOf,
  resumeOf,
  usableCheckpoint,
  type Checkpoint,
} from './checkpoints.ts';
import { setSpeed } from './commands.ts';
import { bindDialogue, setDialogueEnabled } from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { createRouter, resumedNotice, RETRY_FAILED, type Router } from './router.ts';
import { activeSave, initSaves, loadDevSave } from './save.ts';

// A real sim and host per battle, without a scene: what startBattle does for the router, minus
// the HUD, dialogue, audio, and drawing (the dialogue's rebuild is tested on its own below).
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

/** Just enough of a Phaser game for the menus (the backdrop's start and stop). */
const fakeGame: unknown = {
  scene: { isActive: () => false, start: () => undefined, stop: () => undefined },
};
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test double for the parts the router uses
const game = fakeGame as Phaser.Game;

type H = Host<IdSpace>;
type Log = readonly CommandLogEntry<IdSpace>[];
const MAP = 'a2_m02';
const SEED = 7;
const TIMEOUT_MS = 120_000;

/** Steps `host` one tick at a time (dispatching each) until `done`, or throws after `max`. */
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

/** Sells every standing tower and stops scripting: the run then loses. */
function giveUp(host: H): void {
  host.setDriver(null);
  const towers = host.sim.state.towers;
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used
    if (t.alive) host.enqueue({ type: 'sell', towerUid: t.uid });
  }
}

const playing = (host: H) => () => host.sim.state.outcome !== 'playing';

/** The sim's state, writable: a test stages what play can't reach on cue. */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
const writable = (host: H): SimState => host.sim.state as unknown as SimState;

/** The straight run the checkpoint runs are measured against: par from wave 1 to the end. */
interface Straight {
  readonly checkpoints: readonly Checkpoint[];
  /** At the W5 checkpoint: the hash, kills, and waves resolved. */
  readonly atCp: { readonly hash: string; readonly kills: number; readonly cleared: number };
  readonly hash: string;
  readonly kills: number;
  readonly outcome: string;
  readonly log: Log;
  readonly cfg: SimConfig<IdSpace>;
}

let straight: Straight | null = null;

/** Par on MAP from the dev save after A2M1, through a bare host (computed once). */
function straightRun(): Straight {
  if (straight !== null) return straight;
  loadDevSave('after_a2m1');
  const cfg = battleConfig(MAP, SEED, activeSave());
  const host = createHost(createSim(cfg), { now: () => 0, speed: 0 });
  let cleared = 0;
  host.bus.on('WaveCleared', () => cleared++);
  startAutoplay(host, 'par');
  stepUntil(host, () => host.checkpoints.length > 0);
  const s = host.sim.state;
  const atCp = { hash: host.sim.hash(), kills: s.stats.skitterkinKilled, cleared };
  stepUntil(host, playing(host));
  straight = {
    checkpoints: [...host.checkpoints],
    atCp,
    hash: host.sim.hash(),
    kills: s.stats.skitterkinKilled,
    outcome: s.outcome,
    log: [...s.commandLog],
    cfg,
  };
  return straight;
}

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  screen.value = 'title';
  setSpeed(1);
});

describe('the sim marks checkpoints; the host records them', () => {
  it(
    "W5 and W10's countdowns on A2M2, each with the tick it resumes at",
    () => {
      const run = straightRun();
      expect(run.outcome).toBe('won');
      expect(run.checkpoints.map((c) => c.wave)).toEqual([5, 10]);
      for (const c of run.checkpoints) {
        // The commands before it are exactly the ones logged below its tick.
        expect(c.commandCount).toBe(run.log.filter((e) => e.tick < c.tick).length);
      }
    },
    TIMEOUT_MS,
  );

  it(
    'none on an Act I map',
    () => {
      const host = createHost(createSim(battleConfig('a1_m05', 1)), { now: () => 0, speed: 0 });
      const seen: number[] = [];
      host.bus.on('CheckpointReached', (e) => seen.push(e.wave));
      startAutoplay(host, 'par');
      host.fastForward(60 * 60 * 15);
      expect(host.sim.state.outcome).toBe('won');
      expect(seen).toEqual([]);
      expect(host.checkpoints).toEqual([]);
    },
    TIMEOUT_MS,
  );

  it('a checkpoint counts only the commands logged before its tick', () => {
    const log = [{ tick: 3 }, { tick: 9 }, { tick: 10 }, { tick: 12 }];
    expect(checkpointOf({ wave: 5, tick: 10 }, log)).toEqual({
      wave: 5,
      tick: 10,
      commandCount: 2,
    });
    expect(checkpointOf({ wave: 5, tick: 2 }, log).commandCount).toBe(0);
    expect(checkpointOf({ wave: 5, tick: 99 }, log).commandCount).toBe(4);
  });
});

describe('a resumed host (replay)', () => {
  it(
    "replays to the checkpoint's exact state, then on to the straight run's end",
    () => {
      const run = straightRun();
      const cp = run.checkpoints[0]!;
      const host = createHost(createSim(run.cfg), {
        now: () => 0,
        speed: 0,
        resume: resumeOf(run.log, cp),
      });
      const replayed: string[] = [];
      host.bus.on('WaveStarted', () => replayed.push(host.replaying ? 'replay' : 'live'));
      expect(host.replaying).toBe(true);
      expect(host.resumedFrom).toEqual(cp);
      host.catchUp();
      expect(host.replaying).toBe(false);
      expect(host.sim.state.tick).toBe(cp.tick);
      expect(host.sim.hash()).toBe(run.atCp.hash);
      // W1–W4 started during the replay; its checkpoint is recorded again, for a later retry.
      expect(replayed).toEqual(['replay', 'replay', 'replay', 'replay']);
      expect(host.checkpoints).toEqual([cp]);
      expect(host.killsBefore).toBe(run.atCp.kills);
      expect(attemptKills(host)).toBe(0);
      host.catchUp(); // a second call is a no-op
      expect(host.sim.state.tick).toBe(cp.tick);

      playLog(host, run.log);
      stepUntil(host, playing(host));
      expect(host.sim.hash()).toBe(run.hash);
      expect(attemptKills(host)).toBe(run.kills - run.atCp.kills);
      expect(host.checkpoints.map((c) => c.wave)).toEqual([5, 10]);
    },
    TIMEOUT_MS,
  );

  it(
    'replay at uncapped speed stays fast (W10 of an 11-wave map)',
    () => {
      const run = straightRun();
      const cp = run.checkpoints[1]!;
      const host = createHost(createSim(run.cfg), { resume: resumeOf(run.log, cp) });
      const t0 = performance.now();
      host.catchUp();
      const ms = performance.now() - t0;
      expect(host.sim.state.tick).toBe(cp.tick);
      // Generous for a loaded CI box (about 0.1 s locally for ~7 minutes of play).
      expect(ms).toBeLessThan(10_000);
    },
    TIMEOUT_MS,
  );

  it('offers only a checkpoint taken before the run ended (D134)', () => {
    const w5 = { wave: 5, tick: 100, commandCount: 3 };
    const w10 = { wave: 10, tick: 200, commandCount: 7 };
    expect(usableCheckpoint([w5, w10], 201)).toBe(w10);
    expect(usableCheckpoint([w5, w10], 200)).toBe(w5); // lost on W10's countdown-begin tick
    expect(usableCheckpoint([w5, w10], 100)).toBeNull();
    expect(usableCheckpoint([], 500)).toBeNull();
  });

  it('throws when the replay ends the run at the checkpoint (D134)', () => {
    const run = straightRun();
    const host = createHost(createSim(run.cfg), { now: () => 0, speed: 0 });
    playLog(host, run.log);
    stepUntil(host, () => host.checkpoints.length > 0);
    giveUp(host);
    stepUntil(host, playing(host));
    const s = host.sim.state;
    expect(s.outcome).toBe('lost');
    const atLoss = checkpointOf({ wave: 10, tick: s.tick }, s.commandLog);
    const replay = createHost(createSim(run.cfg), { resume: resumeOf(s.commandLog, atLoss) });
    expect(() => replay.catchUp()).toThrow(/checkpoint replay diverged.*outcome lost/);
  });

  it('throws when the replay diverges from the log', () => {
    const run = straightRun();
    const cp = run.checkpoints[0]!;
    const short = { ...cp, tick: cp.tick, commandCount: cp.commandCount + 1 };
    const host = createHost(createSim(run.cfg), { resume: resumeOf(run.log, short) });
    expect(() => host.catchUp()).toThrow(/checkpoint replay diverged/);
  });
});

describe('through the router: Retry from wave N', () => {
  let router: Router;
  const battleHost = (): H => {
    const b = router.battle;
    if (b === null) throw new Error('no battle');
    return b.host;
  };

  /** A battle on MAP from the dev save, played on the straight log to W5's checkpoint, then lost. */
  async function loseAfterCheckpoint(): Promise<{ kills: number; lifetime: number }> {
    const run = straightRun();
    loadDevSave('after_a2m1');
    const before = activeSave()!.stats.pestsProcessed;
    router = createRouter(game, { mapId: MAP, seed: SEED });
    await router.goto('battle');
    const host = battleHost();
    playLog(host, run.log);
    stepUntil(host, () => host.checkpoints.length > 0);
    expect(host.sim.hash()).toBe(run.atCp.hash);
    giveUp(host);
    stepUntil(host, playing(host));
    expect(host.sim.state.outcome).toBe('lost');
    await router.flushResults();
    const card = runResult.value!;
    expect(card.outcome).toBe('lost');
    expect(card.retryFromWave).toBe(5);
    expect(card.resumedFromWave).toBeNull();
    const kills = host.sim.state.stats.skitterkinKilled;
    expect(card.pestsProcessed).toBe(kills);
    expect(card.rewards?.lifetimePests).toBe(before + kills);
    return { kills, lifetime: before + kills };
  }

  it(
    "a won retry's numbers match the straight run's from the checkpoint on; Victory only",
    async () => {
      const run = straightRun();
      // The straight run's own card, on a fresh copy of the save.
      loadDevSave('after_a2m1');
      router = createRouter(game, { mapId: MAP, seed: SEED });
      await router.goto('battle');
      playLog(battleHost(), run.log);
      stepUntil(battleHost(), playing(battleHost()));
      await router.flushResults();
      const straightCard = runResult.value!;
      expect(straightCard.outcome).toBe('won');
      expect(straightCard.pestsProcessed).toBe(run.kills);

      const lost = await loseAfterCheckpoint();
      await router.retryFromCheckpoint();
      const host = battleHost();
      expect(screen.value).toBe('battle');
      expect(host.resumedFrom?.wave).toBe(5);
      expect(host.sim.hash()).toBe(run.atCp.hash);
      // Paused in W5's countdown, with the notice.
      expect(speed.value).toBe(0);
      expect(hud.notice.value?.text).toBe(resumedNotice(5));
      expect(hud.notice.value?.banner).toBe(true); // two lines below the HUD's top row (D135)
      expect(host.sim.state.schedule.phase).toBe('countdown');

      playLog(host, run.log);
      stepUntil(host, playing(host));
      expect(host.sim.hash()).toBe(run.hash);
      await router.flushResults();
      const card = runResult.value!;
      expect(card.outcome).toBe('won');
      expect(card.resumedFromWave).toBe(5);
      expect(card.retryFromWave).toBeNull();
      expect(card.wavesSurvived).toBe(straightCard.wavesSurvived);
      expect(card.integrity).toBe(straightCard.integrity);
      // Pests Processed: the kills since the checkpoint; the replayed ones were filed by the loss.
      expect(card.pestsProcessed).toBe(run.kills - run.atCp.kills);
      expect(card.rewards?.lifetimePests).toBe(lost.lifetime + run.kills - run.atCp.kills);
      // The first clear pays as the straight run's did; objectives count; medals: Victory only.
      expect(card.rewards?.stardust).toEqual(straightCard.rewards?.stardust);
      expect(card.rewards?.objectives).toEqual(straightCard.rewards?.objectives);
      const earned = (c: typeof card) =>
        c.rewards?.medals.filter((m) => m.earned).map((m) => m.id) ?? [];
      expect(earned(straightCard)).toContain('victory');
      expect(earned(card)).toEqual(['victory']);
      expect(activeSave()?.campaign.maps[MAP]?.medals).toEqual(['victory']);
    },
    TIMEOUT_MS,
  );

  it(
    'a retry abandoned later files a loss paying only the waves beyond the checkpoint',
    async () => {
      const run = straightRun();
      await loseAfterCheckpoint();
      const banked = activeSave()!;
      await router.retryFromCheckpoint();
      const host = battleHost();
      let cleared = 0;
      host.bus.on('WaveCleared', () => cleared++);
      playLog(host, run.log);
      stepUntil(host, () => cleared >= 3);
      const kills = attemptKills(host);
      expect(kills).toBeGreaterThan(0);
      router.abandon();
      const save = activeSave()!;
      expect(save.stats.runs).toBe(banked.stats.runs + 1);
      expect(save.stats.pestsProcessed).toBe(banked.stats.pestsProcessed + kills);
      // Waves resolved in all, less the four before the checkpoint.
      const resolved = run.atCp.cleared + cleared;
      const paid = stardustPayout({
        won: false,
        wonBefore: false,
        stardust: host.sim.map.stardust,
        wavesResolved: resolved,
        waveCount: host.sim.map.waves.length,
        veteranBonus: 0,
        resumedFromWave: 5,
      });
      expect(paid.wavesResolved).toBe(resolved - 4);
      expect(paid.amount).toBeGreaterThan(0);
      expect(save.currencies.stardust).toBe(banked.currencies.stardust + paid.amount);
      expect(save.campaign.maps[MAP]?.completed ?? false).toBe(false);
      expect(save.campaign.maps[MAP]?.medals ?? []).toEqual([]);
    },
    TIMEOUT_MS,
  );

  it(
    "a loss on W10's countdown-begin tick offers W5, and its retry plays (D134)",
    async () => {
      const run = straightRun();
      const w10 = run.checkpoints[1]!;
      loadDevSave('after_a2m1');
      router = createRouter(game, { mapId: MAP, seed: SEED });
      await router.goto('battle');
      const host = battleHost();
      playLog(host, run.log);
      stepUntil(host, () => host.sim.state.tick >= w10.tick - 1);
      // The core gives out on the very tick W10's countdown begins.
      writable(host).integrity = 0;
      host.fastForward(1);
      const s = host.sim.state;
      expect(s.outcome).toBe('lost');
      expect(s.tick).toBe(w10.tick);
      expect(host.checkpoints.map((c) => c.wave)).toEqual([5, 10]);
      await router.flushResults();
      expect(runResult.value?.retryFromWave).toBe(5);
      await router.retryFromCheckpoint();
      expect(screen.value).toBe('battle');
      expect(battleHost().resumedFrom?.wave).toBe(5);
      expect(battleHost().sim.state.outcome).toBe('playing');
    },
    TIMEOUT_MS,
  );

  it(
    'a retry whose replay ends the run lands safely on the campaign screen (D134)',
    async () => {
      const run = straightRun();
      loadDevSave('after_a2m1');
      router = createRouter(game, { mapId: MAP, seed: SEED });
      await router.goto('battle');
      const host = battleHost();
      playLog(host, run.log);
      stepUntil(host, () => host.checkpoints.length > 0);
      giveUp(host);
      stepUntil(host, playing(host));
      await router.flushResults();
      // A checkpoint on the losing tick itself (usableCheckpoint never offers one; a bug might).
      const s = host.sim.state;
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the host's own array, rewritten to stage the bug
      const cps = host.checkpoints as Checkpoint[];
      cps.length = 0;
      cps.push(checkpointOf({ wave: 10, tick: s.tick }, s.commandLog));
      writable(host).tick++; // so the router takes it as usable
      await expect(router.retryFromCheckpoint()).rejects.toThrow(/checkpoint replay diverged/);
      expect(screen.value).toBe('campaign');
      expect(menuNotice.value).toBe(RETRY_FAILED);
    },
    TIMEOUT_MS,
  );

  it(
    'needs a lost run with a checkpoint',
    async () => {
      loadDevSave('after_a2m1');
      router = createRouter(game, { mapId: MAP, seed: SEED });
      await expect(router.retryFromCheckpoint()).rejects.toThrow(/no checkpoint/);
      await router.goto('battle');
      // Mid-run, before any checkpoint, and before the run has ended.
      await expect(router.retryFromCheckpoint()).rejects.toThrow(/no checkpoint/);
    },
    TIMEOUT_MS,
  );
});

const noop = (): void => undefined;

describe("the dialogue rebuilds from a resumed run's events", () => {
  let unbind: () => void = noop;
  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    screen.value = 'battle';
  });
  afterEach(() => {
    unbind();
    unbind = noop;
    vi.useRealTimers();
    screen.value = null;
  });

  it(
    'plays nothing during the replay, and what it heard there never plays again',
    () => {
      // No save: the map's reference profile and par (a `?map=` battle), nobody met yet.
      const cfg = battleConfig('a2_m01', 3);
      const first = createHost(createSim(cfg), { now: () => 0, speed: 0 });
      startAutoplay(first, 'par');
      stepUntil(first, () => first.checkpoints.length > 0);
      const cp = first.checkpoints[0]!;
      const spawned = new Set<string>();
      // The enemy types the attempt met before its checkpoint (the replay meets them again).
      const replay = createHost(createSim(cfg), { now: () => 0, speed: 0 });
      replay.bus.on('EnemySpawned', (e) => spawned.add(e.enemy));
      playLog(replay, first.sim.state.commandLog);
      stepUntil(replay, () => replay.sim.state.tick >= cp.tick);
      expect(spawned.size).toBeGreaterThan(0);

      const host = createHost(createSim(cfg), {
        now: () => 0,
        speed: 0,
        resume: resumeOf(first.sim.state.commandLog, cp),
      });
      const shown: string[] = [];
      const offComms = dialogue.comms.subscribe((c) => {
        if (c !== null) shown.push(c.line.text);
      });
      const offScene = dialogue.scene.subscribe((s) => {
        if (s !== null) shown.push(s.sceneId);
      });
      unbind = bindDialogue(host, { briefing: false, newTowers: [] });
      host.catchUp();
      vi.advanceTimersByTime(60_000);
      // Nothing played: no map-start bark, no radio, no new-enemy line.
      expect(shown).toEqual([]);

      // Every type met before the checkpoint stays met: its NEW line doesn't play again.
      for (const enemy of spawned) {
        const e: SimEvent<IdSpace> = {
          type: 'EnemySpawned',
          uid: 9000,
          enemy,
          route: 'x',
          wave: 6,
        };
        host.bus.emit(e);
        vi.advanceTimersByTime(30_000);
      }
      expect(shown).toEqual([]);
      unbind();
      unbind = noop;

      // The control: a fresh battle meeting the same type hears its line.
      const fresh = createHost(createSim(cfg), { now: () => 0, speed: 0 });
      unbind = bindDialogue(fresh, { briefing: false, newTowers: [] });
      vi.advanceTimersByTime(60_000);
      shown.length = 0;
      const mote: SimEvent<IdSpace> = {
        type: 'EnemySpawned',
        uid: 9000,
        enemy: 'mote',
        route: 'x',
        wave: 1,
      };
      fresh.bus.emit(mote);
      expect(spawned.has('mote')).toBe(true);
      expect(shown.length).toBeGreaterThan(0);
      offComms();
      offScene();
    },
    TIMEOUT_MS,
  );
});
