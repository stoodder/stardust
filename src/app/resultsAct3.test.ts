// Act III on the Results card (T613): Bramble's plate on her lines, and an Escort's Perfect medal
// named plainly "Perfect" (no core to keep; act3.md § A3M1, act2.md § A2M5).
import { describe, expect, it } from 'vitest';
import { createNewSave } from '../meta/index.ts';
import { medalViews, perfectMedalName } from './hudViews.ts';
import { debriefStoryOf, offeredMedals, spoken } from './runResult.ts';

describe('the Results card in Act III (T613)', () => {
  it("names Bramble on her plate on A3M1's card, Chitterbloom before", () => {
    const { story } = debriefStoryOf(createNewSave(1, 0));
    expect(story).toBeDefined();
    expect(spoken('chitterbloom', 'My young are still in there.', story!, 'a3_m01').name).toBe(
      'Bramble',
    );
    expect(spoken('chitterbloom', 'Hm.', story!, 'a1_m05').name).toBe('Chitterbloom');
  });

  it('names Perfect Core "Perfect" on an Escort and on a map that pivots to one', () => {
    expect(perfectMedalName({ objective: 'escort' })).toBe('Perfect');
    expect(perfectMedalName({ objective: 'defend', escort: { total: 6 } as never })).toBe(
      'Perfect',
    );
    expect(perfectMedalName({ objective: 'defend', escort: null })).toBe('Perfect Core');
    expect(offeredMedals({ medals: null, objective: 'escort' }).map((m) => m.name)).toEqual([
      'Victory',
      'Perfect',
    ]);
    expect(offeredMedals({ medals: null }).map((m) => m.name)).toEqual(['Victory', 'Perfect Core']);
    const views = medalViews({ medals: null, objective: 'escort' }, {} as never, []);
    expect(views.map((v) => v.name)).toContain('Perfect');
  });
});
