// T863, the post-game shell: the Sector map at dawn (C5's answer, Wayside under Stay, every node
// cleared, no frontier), the post-game plate's entries (Endless first, then each registered
// challenge), Endless's launch (the seed's generated run, its blocks for the HUD), its score filed
// once per seed, the HUD's Next line, and 3× speed unlocked once the finale is won.
import { afterEach, describe, expect, it } from 'vitest';
import type { IdSpace } from '../content/types.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { endlessBest } from '../meta/endless.ts';
import type { SaveData } from '../meta/saveData.ts';
import { createSim, type SimConfig } from '../sim/index.ts';
import { campaign } from '../ui/screens/state.ts';
import { speed } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed, toggleFastSpeed } from './commands.ts';
import { endlessRunContent } from './endlessLaunch.ts';
import { recordEndlessEnd, wavesHeld } from './postGame.ts';
import {
  ENDLESS_MAP_ID,
  endlessNextLine,
  endlessResult,
  endlessRun,
  fastestSpeed,
  postGameUi,
  registerPostGame,
  type EndlessRunView,
  type PostGameUi,
} from './postGameHooks.ts';
import { parseSeed, postGameEntries, wavesText } from './postGameView.ts';
import { activeSave, closeSession, loadDevSave } from './save.ts';
import { starMapView, WAYSIDE_LABEL } from './starMap.ts';

/** The lazy half as the finale's chunk registers it, with the real Endless launch. */
function registerLaunch(): void {
  const ui: PostGameUi = {
    dawnLook: () => ({ colony: null, paint: () => {} }),
    Layer: () => null,
    EndlessScore: () => null,
    firstEntry: () => ENDLESS_MAP_ID,
    runContent: endlessRunContent,
  };
  registerPostGame(ui);
}

afterEach(() => {
  postGameUi.value = null;
  endlessRun.value = null;
  endlessResult.value = null;
  campaign.value = null;
  setSpeed(1);
  closeSession();
});

describe('the Sector map at dawn', () => {
  it('Stay: every node cleared, no frontier, C5 answered, the colony relabelled Wayside', () => {
    const view = starMapView(DEV_SAVES.after_fin_stay.build());
    expect(view.postGame).toBe(true);
    expect(view.frontier).toBeNull();
    expect(view.phase).toBe('dawn');
    expect(view.ending).toBe('stay');
    expect(view.nodes.every((n) => n.state === 'won')).toBe(true);
    // The route is walked: no legs cross the colony at dawn.
    expect(view.legs).toEqual([]);
    const gardens = view.regions.find((r) => r.id === 'gardens');
    expect(gardens).toMatchObject({ text: WAYSIDE_LABEL, struck: 'Everglow Gardens' });
  });

  it('Go: the colony keeps its old name (Wayside is the Stay ending)', () => {
    const view = starMapView(DEV_SAVES.after_fin_go.build());
    expect(view.ending).toBe('go');
    expect(view.regions.find((r) => r.id === 'gardens')).toMatchObject({
      text: 'Everglow Gardens',
      struck: null,
    });
  });

  it('before the finale: no post-game, no ending', () => {
    const view = starMapView(DEV_SAVES.after_a3m6_keep.build());
    expect(view.postGame).toBe(false);
    expect(view.ending).toBeNull();
  });
});

describe('the post-game plate', () => {
  it('Endless first, then each registered challenge map, with its own tagline', () => {
    const entries = postGameEntries(DEV_SAVES.after_fin_stay.build());
    expect(entries[0]).toMatchObject({
      id: 'end_m01',
      kind: 'endless',
      name: 'The Open Perimeter',
    });
    const challenges = entries.filter((e) => e.kind === 'challenge');
    expect(challenges.map((e) => e.id)).toContain('ch_m01');
    const ch = challenges.find((e) => e.id === 'ch_m01')!;
    expect(ch.tagline).toBe("Only the warrens' towers deploy.");
    expect(ch.brief?.medals.length).toBeGreaterThan(0);
    expect(ch.cleared).toBe(false);
    expect(entries.every((e) => e.tagline.length > 0)).toBe(true);
  });

  it('a seed is a whole number in 32 bits', () => {
    expect(parseSeed(' 42 ')).toBe(42);
    expect(parseSeed('4294967295')).toBe(2 ** 32 - 1);
    expect(parseSeed('4294967296')).toBeNull();
    expect(parseSeed('-1')).toBeNull();
    expect(parseSeed('1.5')).toBeNull();
    expect(parseSeed('')).toBeNull();
    expect(wavesText(1)).toBe('1 wave');
    expect(wavesText(23)).toBe('23 waves');
  });
});

const save = (): SaveData => DEV_SAVES.after_fin_stay.build();
const waves = (cfg: SimConfig<IdSpace>) => cfg.content.maps[ENDLESS_MAP_ID]!.waves;

describe('launching Endless', () => {
  it('the seed picks its generated run; the same seed, the same run', () => {
    registerLaunch();
    const a = battleConfig(ENDLESS_MAP_ID, 7, save());
    const b = battleConfig(ENDLESS_MAP_ID, 7, save());
    const c = battleConfig(ENDLESS_MAP_ID, 8, save());
    expect(waves(a).length).toBeGreaterThan(5);
    expect(JSON.stringify(waves(a))).toBe(JSON.stringify(waves(b)));
    expect(JSON.stringify(waves(a).slice(5))).not.toBe(JSON.stringify(waves(c).slice(5)));
    expect(a.seed).toBe(7);
    expect(endlessRun.value?.seed).toBe(8);
    expect(endlessRun.value?.blocks[0]).toMatchObject({ first: 1, last: 5, counters: [] });
    // The sim plays it as an ordinary map.
    const sim = createSim(a);
    expect(sim.map.waves.length).toBe(waves(a).length);
  });

  it('without the finale chunk, or on another map, the config is as built', () => {
    const plain = battleConfig(ENDLESS_MAP_ID, 7, save());
    expect(plain.content.maps[ENDLESS_MAP_ID]!.waves.length).toBe(5);
    registerLaunch();
    const other = battleConfig('a1_m01', 7, save());
    expect(endlessRunContent(other)).toBeNull();
  });
});

describe("the HUD's Next line", () => {
  const run: EndlessRunView = {
    map: ENDLESS_MAP_ID,
    seed: 1,
    blocks: [
      { first: 1, last: 5, counters: [], fresh: [] },
      { first: 6, last: 10, counters: ['Armor'], fresh: ['Armor'] },
      { first: 11, last: 15, counters: ['Air', 'Armor'], fresh: ['Air'] },
    ],
  };

  it('names the block the next wave is in, and the next block in its last two waves', () => {
    expect(endlessNextLine(run, 2)).toMatchObject({ needs: [], coming: null });
    expect(endlessNextLine(run, 4)).toMatchObject({ needs: [], coming: ['Armor'] });
    expect(endlessNextLine(run, 7)).toMatchObject({ needs: ['Armor'], coming: null });
    const late = endlessNextLine(run, 9)!;
    expect(late).toMatchObject({ needs: ['Armor'], coming: ['Air'] });
    expect(late.spoken).toBe('This block needs Armor. The next block brings Air.');
    expect(endlessNextLine(run, 15)).toMatchObject({ needs: ['Air', 'Armor'], coming: null });
    expect(endlessNextLine(run, 16)).toBeNull();
  });
});

describe('the score', () => {
  it('waves held count the resolved waves; the seed keeps its best', () => {
    expect(wavesHeld([true, true, false, true])).toBe(3);
    expect(loadDevSave('after_fin_stay')).toBe(true);
    const first = recordEndlessEnd({ mapId: ENDLESS_MAP_ID, seed: 99, resolved: [true, true] });
    expect(first).toMatchObject({ held: 2, bestBefore: null, newBest: true, recorded: true });
    expect(endlessBest(activeSave()!, 99)).toBe(2);
    const worse = recordEndlessEnd({ mapId: ENDLESS_MAP_ID, seed: 99, resolved: [true] });
    expect(worse).toMatchObject({ held: 1, bestBefore: 2, newBest: false });
    expect(endlessBest(activeSave()!, 99)).toBe(2);
    expect(endlessResult.value?.scores[0]).toEqual({ seed: 99, wave: 2 });
    // Any other run clears the score screen.
    expect(recordEndlessEnd({ mapId: 'a1_m01', seed: 1, resolved: [true] })).toBeNull();
    expect(endlessResult.value).toBeNull();
  });

  it('no save (a dev battle): the waves show, nothing is filed', () => {
    const view = recordEndlessEnd({ mapId: ENDLESS_MAP_ID, seed: 5, resolved: [true] });
    expect(view).toMatchObject({ held: 1, recorded: false, scores: [] });
  });
});

describe('3x speed (core-loop.md § 2.8)', () => {
  it('unlocks once the finale is won; F steps 1x → 2x → 3x → 1x', () => {
    expect(loadDevSave('after_a3m6_keep')).toBe(true);
    expect(campaign.value?.frontier).toBe('fin_m01');
    expect(fastestSpeed.value).toBe(2);
    setSpeed(1);
    toggleFastSpeed();
    expect(speed.value).toBe(2);
    toggleFastSpeed();
    expect(speed.value).toBe(1);
    expect(loadDevSave('after_fin_stay')).toBe(true);
    expect(campaign.value?.frontier).toBeNull();
    expect(fastestSpeed.value).toBe(3);
    toggleFastSpeed();
    expect(speed.value).toBe(2);
    toggleFastSpeed();
    expect(speed.value).toBe(3);
    toggleFastSpeed();
    expect(speed.value).toBe(1);
    setSpeed(0);
    toggleFastSpeed();
    expect(speed.value).toBe(2);
  });

  it('outside a campaign, 2x is the fastest', () => {
    expect(fastestSpeed.value).toBe(2);
  });
});
