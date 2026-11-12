// M8 review round 2, A2-3 (N1): a finale checkpoint retry writes the save's `pendingRun` at the
// checkpoint it resumes from (the lost run's end dropped it, and the replay re-reaches its
// checkpoints without writing), so a tab closed after a retry resumes there, not at wave 1. Played
// on the real finale through the router: a retry from wave 15, then one from the Halls.
import { describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore, validateSave } from '../meta/index.ts';
import type { SimConfig } from '../sim/index.ts';
import { startAutoplay } from './autoplay.ts';
import type { Battle, BattleStart } from './battle.ts';
import { pendingResume } from './resume.ts';
import { createRouter, type Router } from './router.ts';
import { activeSave, initSaves, loadDevSave } from './save.ts';

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

const fakeGame: unknown = {
  scene: { isActive: () => false, start: () => undefined, stop: () => undefined },
};
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the parts the router uses
const game = fakeGame as Phaser.Game;

describe('a finale checkpoint retry is pending at its checkpoint (N1)', () => {
  let router: Router;
  const host = () => {
    const b = router.battle;
    if (b === null) throw new Error('no battle');
    return b.host;
  };
  const step = (until: () => boolean, max = 60 * 60 * 30): void => {
    for (let i = 0; i < max && !until(); i++) host().fastForward(1);
    if (!until()) throw new Error(`not done by tick ${host().sim.state.tick}`);
  };

  /** Loses the run a little after its latest checkpoint, and retries from it. */
  async function loseAndRetry(): Promise<void> {
    host().fastForward(60 * 3);
    await router.endRun('lost');
    // The end dropped the pending run.
    expect(activeSave()?.pendingRun).toBeUndefined();
    await router.retryFromCheckpoint();
  }

  it('writes it at wave 15 on a wave 15 retry, and at the Halls on a Halls retry', async () => {
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    expect(loadDevSave('after_a3m6_rewrite')).toBe(true);
    router = createRouter(game, { mapId: 'fin_m01', seed: 1 });
    await router.goto('battle');
    startAutoplay(host(), 'par');
    step(() => host().checkpoints.at(-1)?.wave === 15);
    const w15 = host().checkpoints.at(-1)!;
    await loseAndRetry();

    let pending = activeSave()?.pendingRun;
    expect(pending?.map).toBe('fin_m01');
    expect(pending?.checkpoint).toEqual({
      wave: 15,
      tick: w15.tick,
      commandCount: w15.commandCount,
    });
    expect(pending?.retriedFrom?.wave).toBe(15);
    expect(validateSave(JSON.parse(JSON.stringify(activeSave()))).ok).toBe(true);
    // It rebuilds: a closed tab now resumes at wave 15.
    const back = pendingResume(activeSave()!);
    expect(back !== null && back !== 'changed' ? back.resume.checkpoint.wave : null).toBe(15);

    // A fresh walk to the Halls: the live checkpoint writes it there; then a Halls retry.
    await router.goto('battle');
    startAutoplay(host(), 'par');
    step(() => host().sim.state.phase >= 2);
    const halls = host().checkpoints.at(-1)!;
    expect(halls.label).toBe('halls');
    expect(activeSave()?.pendingRun?.checkpoint.label).toBe('halls');
    await loseAndRetry();
    pending = activeSave()?.pendingRun;
    expect(pending?.checkpoint).toEqual({
      label: 'halls',
      wave: halls.wave,
      tick: halls.tick,
      commandCount: halls.commandCount,
    });
    expect(pending?.retriedFrom?.label).toBe('halls');
    expect(host().sim.state.phase).toBe(2);
  }, 120_000);
});
