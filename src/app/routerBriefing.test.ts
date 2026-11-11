// D150 (C8): when the briefing changed the battle (the crate's tune-ups, C3's door) and the sim
// then refuses the new config, the restart fails like a launch: the notice on the Shift board and
// the error logged, never a silent return that leaves the stale battle running. The battle is a
// stub; the briefing is already closed, so the restart check runs at once.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { MemoryStore } from '../meta/index.ts';
import { menuNotice } from '../ui/screens/state.ts';
import { screen } from '../ui/state.ts';
import { logError } from './log.ts';
import { BATTLE_FAILED, createRouter } from './router.ts';
import { initSaves, newGame } from './save.ts';

const control = vi.hoisted(() => ({ configs: 0, refuseAfter: 1, stopped: 0 }));

vi.mock('./battle.ts', () => ({
  startBattle: () => ({
    host: { bus: { on: () => undefined } },
    firstFrame: Promise.resolve(),
    stop: () => {
      control.stopped++;
    },
  }),
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));
vi.mock('./log.ts', () => ({ logError: vi.fn(), logWarn: vi.fn() }));
vi.mock('./storyMeta.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./storyMeta.ts')>()),
  briefingChangedBattle: () => true,
  openCrateAtBriefing: () => undefined,
}));
vi.mock('./battleSetup.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('./battleSetup.ts')>();
  return {
    ...real,
    battleConfig: (...args: Parameters<typeof real.battleConfig>) => {
      control.configs++;
      if (control.configs > control.refuseAfter) throw new Error('stub: the sim refuses it');
      return real.battleConfig(...args);
    },
  };
});

const fakeGame: unknown = {
  scene: { isActive: () => false, start: () => undefined, stop: () => undefined },
};
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test double for the parts the router uses
const game = fakeGame as Phaser.Game;

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  menuNotice.value = null;
  screen.value = 'title';
  control.configs = 0;
  control.stopped = 0;
  vi.mocked(logError).mockClear();
});

describe("the briefing's restart (D150)", () => {
  it('a config the sim refuses after the briefing shows the notice on the Shift board', async () => {
    newGame(1);
    const router = createRouter(game, { mapId: 'a1_m01' });
    await router.goto('battle');
    await vi.waitFor(() => expect(screen.value).toBe('campaign'));
    expect(control.configs).toBe(2);
    expect(menuNotice.value).toBe(BATTLE_FAILED);
    expect(control.stopped).toBe(1); // the stale battle is torn down
    expect(logError).toHaveBeenCalledWith('briefing: restart failed', expect.any(Error));
  });
});
