// The story's lazy acts (app/actContent.ts, content/acts; T802): each act's chunk holds that act's
// content only, the registries list what's registered in campaign order whatever order the acts
// arrive in, and the acts a screen needs (app/contentGate.ts).
import { describe, expect, it } from 'vitest';
import { SFX_GROUPS, SFX_IDS, SFX, loadedSfx } from '../audio/sfx/index.ts';
import { SPEECH_SFX } from '../audio/sfx/blips.ts';
import { actOfMapId, actRank, LAZY_ACTS, STORY_ACTS } from '../content/acts/index.ts';
import { CAMPAIGN_PLAN_IDS } from '../content/campaign.ts';
import { POST_GAME_DIALOGUE_MAPS } from '../content/dialogue/types.ts';
import { CODEX_ENTRIES, CODEX_IDS } from '../content/codex/index.ts';
import { epilogueCards, epilogueFor, registerEpilogueCards } from '../content/dialogue/epilogue.ts';
import { EPILOGUE_CARDS } from '../content/dialogue/fin/epilogue.ts';
import { MAP_DIALOGUE } from '../content/dialogue/index.ts';
import { mapAct } from '../content/dialogue/rules.ts';
import { MEMO_IDS, MEMO_LIST } from '../content/memos/index.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { createNewSave } from '../meta/saveData.ts';
import { actLoaded, actsLoaded, loadedActs, registerActChunk } from './actContent.ts';
import { ALL_ACT_CHUNKS } from './acts/all.ts';
import { FINALE_CHUNK } from './acts/fin.ts';
import { battleActs, savedAct } from './contentGate.ts';

describe('the lazy acts', () => {
  it('one chunk per lazy act, in campaign order, each with its own marker', () => {
    expect(ALL_ACT_CHUNKS.map((c) => c.story.act)).toEqual([...LAZY_ACTS]);
    expect(ALL_ACT_CHUNKS.map((c) => c.story.marker)).toEqual(
      LAZY_ACTS.map((a) => `lazy-act:${a}`),
    );
  });

  it("holds only its own act's maps and memos, and every later map is in its act's chunk", () => {
    for (const { story } of ALL_ACT_CHUNKS) {
      for (const d of story.dialogue) expect(mapAct(d.map), d.map).toBe(story.act);
      for (const m of story.memos) {
        expect(m.afterMap === null ? 1 : mapAct(m.afterMap), m.id).toBe(story.act);
      }
    }
    const lazyMaps = ALL_ACT_CHUNKS.flatMap((c) => c.story.dialogue.map((d) => d.map));
    // The post-game's challenge briefings come with the finale's (T862).
    expect(lazyMaps).toEqual([
      ...CAMPAIGN_PLAN_IDS.filter((m) => mapAct(m) !== 1),
      ...POST_GAME_DIALOGUE_MAPS,
    ]);
  });

  it('the tests see every act registered (tools/vitestSetup.ts)', () => {
    expect(loadedActs()).toEqual([...STORY_ACTS]);
    expect(STORY_ACTS.every(actLoaded)).toBe(true);
    expect(actsLoaded('finale')).toBe(true);
    expect(MAP_DIALOGUE.map((d) => d.map)).toEqual([
      ...CAMPAIGN_PLAN_IDS,
      ...POST_GAME_DIALOGUE_MAPS,
    ]);
  });

  it('lists the registries in campaign order, whatever order the acts register in', () => {
    const before = {
      maps: MAP_DIALOGUE.map((d) => d.map),
      codex: [...CODEX_IDS],
      memos: [...MEMO_IDS],
      sfx: [...SFX_IDS],
      entries: CODEX_ENTRIES.map((e) => Object.keys(e.versions).join()),
    };
    // Again, last act first: the lists are rebuilt in place, the same as before.
    for (const chunk of ALL_ACT_CHUNKS.toReversed()) registerActChunk(chunk);
    expect(MAP_DIALOGUE.map((d) => d.map)).toEqual(before.maps);
    expect(CODEX_IDS).toEqual(before.codex);
    expect(MEMO_IDS).toEqual(before.memos);
    expect(MEMO_LIST.map((m) => m.id)).toEqual(before.memos);
    expect(SFX_IDS).toEqual(before.sfx);
    expect(CODEX_ENTRIES.map((e) => Object.keys(e.versions).join())).toEqual(before.entries);
  });

  it('registers every sound group an act brings, with the speech blips last', () => {
    const groups = new Set(ALL_ACT_CHUNKS.flatMap((c) => Object.keys(c.sfx)));
    expect([...groups].toSorted()).toEqual([...SFX_GROUPS].toSorted());
    const blips = Object.keys(SPEECH_SFX);
    expect(SFX_IDS.slice(-blips.length)).toEqual(blips);
    expect(loadedSfx('witch_arrive')).toBe(SFX.witch_arrive);
  });
});

describe('the acts a screen needs (app/contentGate.ts)', () => {
  it("a menu: the save's frontier's act; Act I without a save, the finale once it's won", () => {
    expect(savedAct(null)).toBe(1);
    expect(savedAct(createNewSave())).toBe(1);
    expect(savedAct(DEV_SAVES.after_a1m3.build())).toBe(1);
    expect(savedAct(DEV_SAVES.after_a1m5.build())).toBe(2);
    expect(savedAct(DEV_SAVES.after_a3m1_spared.build())).toBe(3);
    expect(savedAct(DEV_SAVES.after_fin_stay.build())).toBe('finale');
  });

  it("a battle: the act after the later of the save's and the map's; a dev map, every act", () => {
    expect(battleActs(null, 'a1_m01')).toBe(2);
    expect(battleActs(DEV_SAVES.after_a3m1_spared.build(), 'a1_m02')).toBe('finale');
    expect(battleActs(null, 'a3_m06')).toBe('finale');
    expect(battleActs(null, 'fin_m01')).toBe('finale');
    expect(battleActs(null, 'dev_range')).toBe('finale');
  });

  it('maps every campaign map to its act, and nothing else', () => {
    for (const m of CAMPAIGN_PLAN_IDS) expect(actOfMapId(m)).toBe(mapAct(m));
    expect(actOfMapId('dev_range')).toBeNull();
    expect(STORY_ACTS.map(actRank)).toEqual([0, 1, 2, 3]);
  });
});

describe("the epilogue's cards, behind the finale's edge", () => {
  it("come with the finale's chunk; before it, epilogueFor throws rather than show none", () => {
    const stay = { ending_choice: 'stay' } as const;
    try {
      registerEpilogueCards([]);
      expect(() => epilogueFor(stay)).toThrow(/finale's chunk/);
      registerActChunk(FINALE_CHUNK);
      expect(epilogueCards()).toEqual(EPILOGUE_CARDS);
      expect(epilogueFor(stay).at(-1)?.slot).toBe('final');
    } finally {
      registerActChunk(FINALE_CHUNK);
    }
  });
});
