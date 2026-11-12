// M8 review round 1, A2 (D156): a post-game map's story reads as the finale's (`storyMapOf`), so
// its map conditions hold as on fin_m01: CH1's briefing names Pebble (not "???") and gives her
// Bricks's cap with its Survey Corps patch. Campaign maps read as themselves; dev maps as none.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { createSim } from '../sim/index.ts';
import { dialogue, type LineView } from '../ui/dialogue/state.ts';
import { screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setCommandTarget, setSpeed } from './commands.ts';
import {
  bindDialogue,
  nextScene,
  POST_GAME_STORY_MAP,
  setDialogueEnabled,
  skipScene,
  storyMapOf,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { activeSave, closeSession, initSaves, loadDevSave } from './save.ts';

vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const noop = (): void => {};
let unbind: () => void = noop;
let host: Host<IdSpace>;

beforeEach(() => {
  vi.useFakeTimers();
  setDialogueEnabled(true);
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  screen.value = 'battle';
});
afterEach(() => {
  unbind();
  unbind = noop;
  for (let i = 0; i < 50 && skipScene(); i++);
  setCommandTarget(null);
  closeSession();
  vi.useRealTimers();
  screen.value = null;
});

/** Every line `map`'s briefing shows, read through on the `save` save. */
function briefingLines(map: string, save: string): LineView[] {
  expect(loadDevSave(save)).toBe(true);
  host = createHost(createSim(battleConfig(map, 1, activeSave())));
  setCommandTarget({
    host,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- nothing here arms or aims
    interaction: {} as BattleInteraction,
    cancel: noop,
  });
  setSpeed(1);
  unbind = bindDialogue(host, { briefing: true, newTowers: [] });
  expect(dialogue.scene.value?.sceneId).toBe(`${map}_brief`);
  for (let i = 0; i < 20 && dialogue.scene.value?.ended === false; i++) {
    vi.advanceTimersByTime(5000);
    nextScene();
  }
  const view = dialogue.scene.value;
  return [...(view?.transcript ?? []), ...(view?.line === null || !view ? [] : [view.line])];
}

describe("a post-game map's story reads as the finale's (A2)", () => {
  it('maps: campaign as itself, post-game as fin_m01, dev as none', () => {
    expect(storyMapOf('a2_m03')).toBe('a2_m03');
    expect(storyMapOf('ch_m01')).toBe(POST_GAME_STORY_MAP);
    expect(storyMapOf('end_m01')).toBe('fin_m01');
    expect(storyMapOf('dev_voices')).toBeNull();
  });

  it("CH1's briefing: Pebble by name, in Bricks's cap and patch", () => {
    const pebble = briefingLines('ch_m01', 'after_fin_stay').filter((l) => l.speaker === 'pebble');
    expect(pebble.length).toBeGreaterThan(0);
    for (const line of pebble) {
      expect(line.name).toBe('Pebble');
      expect(line.portrait?.variant).toBe('patch');
    }
  });
});
