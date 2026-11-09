// The router's menu notice (D059, D061): set when a battle can't start, shown where the player
// can act on it, and cleared on the Title and whenever the save in play changes. The battle and
// the backdrop scene are stubbed: these paths never draw. Also the first payday's seen mark.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { FIRST_PAYDAY_SEEN_ID, MemoryStore, createNewSave, runEnd } from '../meta/index.ts';
import { menuNotice } from '../ui/screens/state.ts';
import { screen } from '../ui/state.ts';
import { holdNewGame, intakeMode } from './profile.ts';
import { BATTLE_FAILED, createRouter } from './router.ts';
import { metaRunEndOf, offeredMedals, runResultOf, type RunEndInput } from './runResult.ts';
import { activeSave, closeSession, initSaves, newGame, openSlot } from './save.ts';

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

describe('the intake (T306)', () => {
  it('needs a held new game or a loaded save, and the Title drops the hold', async () => {
    const router = createRouter(game);
    await expect(router.goto('intake')).rejects.toThrow();
    holdNewGame(1);
    await router.goto('intake');
    expect(screen.value).toBe('intake');
    await router.goto('title');
    expect(intakeMode()).toBeNull();
    newGame(1);
    await router.goto('intake');
    expect(intakeMode()).toEqual({ kind: 'existing' });
  });
});

describe('the first payday (D097)', () => {
  const INPUT: RunEndInput = {
    mapId: 'a1_m01',
    waveCount: 7,
    maxIntegrity: 20,
    integrity: 13,
    skitterkinKilled: 57,
    wavesCleared: 7,
    firstLeakAgo: null,
    stardust: 120,
    medals: offeredMedals({ medals: null }),
    earnedMedals: [],
  };
  /** A won run's card, with or without the payday on it. */
  const card = (firstPayday: boolean) => {
    const { summary } = runEnd(createNewSave(), { ...metaRunEndOf(INPUT, 'won'), mapId: 'a1_m01' });
    const note = firstPayday ? 'Banked.' : null;
    return runResultOf(INPUT, 'won', { ...summary, firstPayday, stardustNote: note });
  };
  const NO_SCENES = { before: [], after: [] };

  it('is spent by Results showing it, once', async () => {
    newGame(1);
    const router = createRouter(game);
    await router.presentResults(card(false), NO_SCENES);
    expect(activeSave()?.story.seen).not.toContain(FIRST_PAYDAY_SEEN_ID);
    await router.presentResults(card(true), NO_SCENES);
    await router.presentResults(card(true), NO_SCENES);
    expect(activeSave()?.story.seen.filter((id) => id === FIRST_PAYDAY_SEEN_ID)).toHaveLength(1);
  });
});
