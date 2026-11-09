// The router's menu notice (D059, D061): set when a battle can't start, shown where the player
// can act on it, and cleared on the Title and whenever the save in play changes. The battle and
// the backdrop scene are stubbed: these paths never draw.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { MemoryStore } from '../meta/index.ts';
import { menuNotice } from '../ui/screens/state.ts';
import { screen } from '../ui/state.ts';
import { BATTLE_FAILED, createRouter } from './router.ts';
import { closeSession, initSaves, newGame, openSlot } from './save.ts';

vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

/** Just enough of a Phaser game for the menus (the backdrop's start and stop). */
const fakeGame: unknown = {
  scene: { isActive: () => false, start: () => undefined, stop: () => undefined },
};
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test double for the parts the router uses
const game = fakeGame as Phaser.Game;

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  menuNotice.value = null;
  screen.value = 'title';
});

describe('the menu notice', () => {
  it('a Retry that fails shows the notice on the Shift board', async () => {
    newGame(1);
    // A map the config refuses stands in for a save the sim refuses.
    const router = createRouter(game, { mapId: 'no_such_map' });
    screen.value = 'results';
    await expect(router.retry()).rejects.toThrow();
    expect(menuNotice.value).toBe(BATTLE_FAILED);
    expect(screen.value).toBe('campaign');
  });

  it('a failed start from the Shift board keeps the board up with the notice', async () => {
    newGame(1);
    const router = createRouter(game, { mapId: 'no_such_map' });
    await router.goto('campaign');
    await expect(router.goto('battle')).rejects.toThrow();
    expect(screen.value).toBe('campaign');
    expect(menuNotice.value).toBe(BATTLE_FAILED);
  });

  it('clears on the Title, when a slot opens, and when the session closes', async () => {
    newGame(1);
    const router = createRouter(game);
    menuNotice.value = BATTLE_FAILED;
    await router.goto('title');
    expect(menuNotice.value).toBeNull();
    menuNotice.value = BATTLE_FAILED;
    expect(openSlot(1)).toEqual({ ok: true });
    expect(menuNotice.value).toBeNull();
    menuNotice.value = BATTLE_FAILED;
    closeSession();
    expect(menuNotice.value).toBeNull();
    menuNotice.value = BATTLE_FAILED;
    newGame(2);
    expect(menuNotice.value).toBeNull();
  });
});
