// The story's between-map unlocks (T303): the welcome memo's gift on a new save, memo delivery and
// codex unlocks at run end, the enemies a run met, and the catch-up for saves from before T303.
import { describe, expect, it } from 'vitest';
import { runEnd, type RunEndInput } from './runEnd.ts';
import { createNewSave, type SaveData } from './saveData.ts';
import { newCodexUnlocks } from '../story/codex.ts';
import type { CodexEntryDef } from '../content/codex/index.ts';
import { baseStoryContext, enemiesMet, furthestWon, withStoryUnlocks } from './story.ts';
import { validateSave } from './validate.ts';

const WIN: RunEndInput = {
  mapId: 'a1_m01',
  outcome: 'won',
  mapStardust: 0,
  waveCount: 7,
  wavesResolved: 7,
  earnedMedals: ['victory'],
  skitterkinKilled: 100,
  meter: 20,
};

/** A save as M2 wrote it: the strike granted directly, nothing delivered (D031). */
function m2Save(): SaveData {
  const s = createNewSave();
  return {
    ...s,
    unlocks: { ...s.unlocks, abilities: ['orbital_strike'] },
    story: { ...s.story, memosDelivered: [], granted: [] },
    campaign: {
      ...s.campaign,
      maps: { a1_m01: { completed: true, medals: ['victory'], bestMeter: 20 } },
    },
  };
}

describe('a new save', () => {
  it('owns Orbital Strike as the welcome memo’s gift, delivered and unread', () => {
    const s = createNewSave();
    expect(s.unlocks.abilities).toEqual(['orbital_strike']);
    expect(s.story.memosDelivered).toEqual(['memo_a1_00']);
    expect(s.story.memosRead).toEqual([]);
    expect(s.story.granted).toEqual(['memo_a1_00']);
    expect(s.story.codex).toEqual({});
    expect(validateSave(s).ok).toBe(true);
  });
});

describe('the enemies a run met', () => {
  it('is every wave on a win, and the waves resolved plus the one under way on a loss', () => {
    expect(enemiesMet('a1_m01', true, 7)).toEqual(['nibbler', 'zoomer']);
    expect(enemiesMet('a1_m01', false, 0)).toEqual(['nibbler']);
    expect(enemiesMet('a1_m01', false, 3)).toEqual(['nibbler', 'zoomer']);
    expect(enemiesMet('a1_m02', true, 8)).toEqual(['nibbler', 'zoomer', 'chonk', 'hauler']);
  });
});

describe('run end delivers memos and unlocks the codex (step 8)', () => {
  it("after A1M1's first win: its memo, its enemies, the owned kit, and its places", () => {
    const { save, summary } = runEnd(createNewSave(), WIN);
    expect(summary.memos).toEqual(['memo_a1_01']);
    expect(save.story.memosDelivered).toEqual(['memo_a1_00', 'memo_a1_01']);
    expect(save.campaign.seenEnemies).toEqual(['nibbler', 'zoomer']);
    expect(summary.codex).toEqual([
      'codex_nibbler',
      'codex_zoomer',
      'codex_rivet',
      'codex_thumper',
      'codex_tidybot',
      'codex_everglow_gardens',
      'codex_orbital_strike',
      // The Sprinkler, issued by this win (step 7), unlocks with it.
      'codex_sprinkler',
    ]);
    expect(Object.values(save.story.codex).every((v) => v.join() === 'original')).toBe(true);
    expect(validateSave(save).ok).toBe(true);
  });

  it('on a loss: the enemies met, but no memo and no place', () => {
    const { save, summary } = runEnd(createNewSave(), {
      ...WIN,
      outcome: 'lost',
      wavesResolved: 0,
      earnedMedals: [],
    });
    expect(summary.memos).toEqual([]);
    expect(save.campaign.seenEnemies).toEqual(['nibbler']);
    expect(summary.codex).toEqual([
      'codex_nibbler',
      'codex_rivet',
      'codex_thumper',
      'codex_orbital_strike',
    ]);
  });

  it('a replay adds nothing new', () => {
    const once = runEnd(createNewSave(), WIN).save;
    const again = runEnd(once, WIN);
    expect(again.summary.memos).toEqual([]);
    expect(again.summary.codex).toEqual([]);
    expect(again.save.story).toEqual(once.story);
  });
});

describe('the catch-up for older saves (entering the base)', () => {
  it('delivers what an M2 save missed, without granting the strike twice', () => {
    const old = m2Save();
    const { save, memos, gifts, codex } = withStoryUnlocks(old);
    expect(memos).toEqual(['memo_a1_00', 'memo_a1_01']);
    expect(gifts).toEqual([]); // the strike was already owned
    expect(save.unlocks.abilities).toEqual(['orbital_strike']);
    expect(save.story.granted).toEqual(['memo_a1_00']);
    expect(codex).toContain('codex_tidybot');
    expect(validateSave(save).ok).toBe(true);
  });

  it('returns the same save when nothing is due', () => {
    const once = withStoryUnlocks(m2Save()).save;
    expect(withStoryUnlocks(once).save).toBe(once);
  });

  it('puts the objectives on file in the base context, so a codex entry can unlock on one', () => {
    const s = m2Save();
    expect(baseStoryContext(s).objectives).toEqual({});
    const won = { completed: true, medals: ['victory'], bestMeter: 1 };
    s.campaign.maps.a2_m01 = { ...won, objectives: ['crew_logs'] };
    const ctx = baseStoryContext(s);
    expect(ctx.objectives).toEqual({ a2_m01: ['crew_logs'] });
    // An entry like T411's crew log: its original unlocks with the objective, never before.
    const entry: CodexEntryDef = {
      id: 'codex_test_crew_log',
      title: 'Crew log',
      kind: 'thing',
      versions: {
        original: {
          text: 'Recovered.',
          when: { objectiveDone: { map: 'a2_m01', objective: 'crew_logs' } },
        },
      },
    };
    const met = { enemies: [], towers: [], abilities: [] };
    expect(newCodexUnlocks({}, ctx, met, [entry])).toEqual({ codex_test_crew_log: ['original'] });
    expect(newCodexUnlocks({}, baseStoryContext(m2Save()), met, [entry])).toEqual({});
  });

  it('reads the base context from the furthest map won', () => {
    const s = m2Save();
    expect(furthestWon(createNewSave())).toBeNull();
    expect(furthestWon(s)).toBe('a1_m01');
    expect(baseStoryContext(s)).toMatchObject({ map: 'a1_m01', run: null });
    // The banks, for the `bank` condition (C2's `none`, T500b).
    expect(baseStoryContext(s).bank).toEqual(s.currencies);
  });
});
