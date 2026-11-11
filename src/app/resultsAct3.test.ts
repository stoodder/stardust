// Act III on the Results card (T613): Bramble's plate on her lines, and an Escort's Perfect medal
// named plainly "Perfect" (no core to keep; act3.md § A3M1, act2.md § A2M5).
import { describe, expect, it } from 'vitest';
import { createNewSave } from '../meta/index.ts';
import { createSim } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { medalViews, perfectMedalName } from './hudViews.ts';
import { debriefStoryOf, offeredMedals, spoken } from './runResult.ts';

const mapOf = (id: string) => createSim(battleConfig(id, 1, null)).map;
const OPEN = { victory: 'open', perfectCore: 'open', challenge: 'open' } as const;

describe('the Results card in Act III (T613)', () => {
  it("names Bramble on her plate on A3M1's card, Chitterbloom before", () => {
    const { story } = debriefStoryOf(createNewSave());
    expect(story).toBeDefined();
    if (story === undefined) return;
    expect(spoken('chitterbloom', 'My young are still in there.', story, 'a3_m01').name).toBe(
      'Bramble',
    );
    expect(spoken('chitterbloom', 'Hm.', story, 'a1_m05').name).toBe('Chitterbloom');
  });

  it('names Perfect Core "Perfect" on an Escort and on a map that pivots to one', () => {
    const escort = mapOf('a3_m01'); // an Escort from the start
    const pivot = mapOf('a2_m05'); // Defend until the Penitent's pivot
    const core = mapOf('a1_m04');
    expect(perfectMedalName(escort)).toBe('Perfect');
    expect(perfectMedalName(pivot)).toBe('Perfect');
    expect(perfectMedalName(core)).toBe('Perfect Core');
    expect(offeredMedals(escort).map((m) => m.name)).toContain('Perfect');
    expect(offeredMedals(core).map((m) => m.name)).toContain('Perfect Core');
    expect(medalViews(escort, OPEN, []).map((v) => v.name)).toContain('Perfect');
  });

  it('names Perfect\'s slot "Held the Door" on the Holdout, with its 85% line (T605b)', () => {
    const gap = mapOf('a3_m03');
    expect(perfectMedalName(gap)).toBe('Held the Door');
    expect(offeredMedals(gap).map((m) => m.name)).toEqual([
      'Victory',
      'Held the Door',
      'Much Obliged',
    ]);
    const view = medalViews(gap, OPEN, []).find((v) => v.name === 'Held the Door');
    expect(view?.description).toBe('Get 85% or more of them out.');
  });
});
