import { describe, expect, it } from 'vitest';
import {
  debriefLines,
  debriefStoryOf,
  FIRST_LEAK_RECENT_MS,
  FIRST_LEAK_RECENT_TICKS,
  metaRunEndOf,
  offeredMedals,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';
import { createNewSave, runEnd } from '../meta/index.ts';

const INPUT: RunEndInput = {
  mapId: 'a1_m01',
  waveCount: 7,
  maxIntegrity: 20,
  integrity: 13,
  skitterkinKilled: 57,
  wavesCleared: 4,
  firstLeakAgo: null,
  stardust: 120,
  medals: offeredMedals({ medals: { challenge: { id: 'teamwork', name: 'Teamwork!' } } }),
  earnedMedals: [],
};

describe('runResultOf', () => {
  it('reports a loss with the waves resolved so far', () => {
    expect(runResultOf({ ...INPUT, integrity: 0 }, 'lost')).toEqual({
      mapId: 'a1_m01',
      outcome: 'lost',
      wavesSurvived: 4,
      waveCount: 7,
      integrity: 0,
      maxIntegrity: 20,
      pestsProcessed: 57,
      debrief: [
        {
          name: 'Bricks',
          color: 'orange.4',
          text: 'Back on the pads, Sprout. Everybody loses some lettuce on day one.',
        },
      ],
      rewards: null,
    });
  });

  it('counts every wave on a win', () => {
    const r = runResultOf({ ...INPUT, wavesCleared: 6 }, 'won');
    expect(r.wavesSurvived).toBe(7);
    expect(r.integrity).toBe(13);
    expect(r.pestsProcessed).toBe(57);
  });

  it('never reports more waves than the map has, or negative integrity', () => {
    const r = runResultOf({ ...INPUT, wavesCleared: 9, integrity: -3 }, 'lost');
    expect(r.wavesSurvived).toBe(7);
    expect(r.integrity).toBe(0);
  });
});

describe('the run end and the rewards on the card', () => {
  it('names every medal the map offers, its Challenge by its own name', () => {
    expect(offeredMedals({ medals: null }).map((m) => m.name)).toEqual(['Victory', 'Perfect Core']);
    expect(INPUT.medals.map((m) => m.id)).toEqual(['victory', 'perfect_core', 'teamwork']);
  });

  it("reads meta's input from the battle: waves resolved and the meter", () => {
    expect(metaRunEndOf({ ...INPUT, integrity: -2 }, 'lost')).toMatchObject({
      outcome: 'lost',
      mapStardust: 120,
      wavesResolved: 4,
      meter: 0,
      skitterkinKilled: 57,
    });
    expect(metaRunEndOf(INPUT, 'won').wavesResolved).toBe(7);
    // The run's stats pass through for the story run-end flag rules (step 2).
    expect(metaRunEndOf(INPUT, 'won')).not.toHaveProperty('stats');
    const tags = { quiet_wave: 5, youngling: 4, fleeing: 0, medal_exempt: 0 };
    const counters = { holdFireTicks: 9, integrityLost: 0, towersBuilt: 3, creditsSpent: 0 };
    const stats = {
      ...counters,
      holdFireUses: 1,
      abilityUses: 0,
      tagSpawned: tags,
      tagLeaked: tags,
      tagKilled: tags,
    };
    expect(metaRunEndOf({ ...INPUT, stats }, 'won').stats).toBe(stats);
  });

  it('shows every medal, the earned and new ones marked, with the payouts', () => {
    const input = { ...INPUT, earnedMedals: ['victory', 'teamwork'] };
    const held = runEnd(createNewSave(), {
      ...metaRunEndOf({ ...input, earnedMedals: ['victory'] }, 'won'),
      mapId: 'a1_m01',
    }).save;
    const { summary } = runEnd(held, { ...metaRunEndOf(input, 'won'), mapId: 'a1_m01' });
    expect(runResultOf(input, 'won', summary).rewards).toEqual({
      medals: [
        { id: 'victory', name: 'Victory', earned: true, isNew: false, intel: 0 },
        { id: 'perfect_core', name: 'Perfect Core', earned: false, isNew: false, intel: 0 },
        { id: 'teamwork', name: 'Teamwork!', earned: true, isNew: true, intel: 1 },
      ],
      stardust: { source: 'replay', amount: 48, base: 120, wavesResolved: 7, waveCount: 7 },
      intel: 1,
      lifetimePests: 114,
      stardustNote: null,
      issued: [],
      saveNotice: null,
    });
  });

  it('names the towers a first win issued, and a failed save write', () => {
    const { summary } = runEnd(createNewSave(), {
      ...metaRunEndOf(INPUT, 'won'),
      mapId: 'a1_m01',
    });
    const rewards = runResultOf(INPUT, 'won', {
      ...summary,
      writeFailed: 'Records hiccup.',
    }).rewards;
    expect(rewards?.issued).toEqual(['Sprinkler']);
    expect(rewards?.saveNotice).toBe('Records hiccup.');
  });
});

const texts = (lines: readonly { text: string }[]) => lines.map((l) => l.text);
const at = (firstLeakAgo: RunEndInput['firstLeakAgo']) => ({ ...INPUT, firstLeakAgo });

describe('the results card debrief (D028)', () => {
  const LEAK = 'Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)';
  const LOST = 'Back on the pads, Sprout. Everybody loses some lettuce on day one.';

  it("shows Bricks's A1M1 debrief on a win, with his name plate", () => {
    const lines = debriefLines(INPUT, 'won');
    expect(lines).toEqual([
      { name: 'Bricks', color: 'orange.4', text: 'Not bad, Sprout.' },
      {
        name: 'Bricks',
        color: 'orange.4',
        text: "Don't name things on day one. You get attached.",
      },
    ]);
    expect(runResultOf(INPUT, 'won').debrief).toEqual(lines);
  });

  it("shows the map's loss lines on a loss (D059: a supportive Bricks line)", () => {
    expect(texts(debriefLines(INPUT, 'lost'))).toEqual([LOST]);
  });

  it("reads the save's flags: Kip's signing bonus on A1M2 (act1.md § A1M2)", () => {
    const save = createNewSave();
    const kip = { ...INPUT, mapId: 'a1_m02', ...debriefStoryOf(save) };
    expect(texts(debriefLines(kip, 'won'))).not.toContain('Signing bonus? Me too. Spent it.');
    const bonus = {
      ...save,
      story: { ...save.story, flags: { arrival_reason: 'bonus' as const } },
    };
    const lines = debriefLines({ ...kip, ...debriefStoryOf(bonus) }, 'won');
    expect(texts(lines).at(-1)).toBe('Signing bonus? Me too. Spent it.');
    expect(lines.at(-1)?.name).toBe('Kip');
    expect(texts(debriefLines({ ...kip, ...debriefStoryOf(bonus) }, 'lost'))).toEqual([
      "Reset and go again, Sprout. The Haulers aren't going anywhere. Neither am I.",
    ]);
  });

  it('puts a first leak from the last 4 s on the card first, so its line is never lost', () => {
    const recent = { ms: FIRST_LEAK_RECENT_MS, ticks: FIRST_LEAK_RECENT_TICKS };
    expect(texts(debriefLines(at(recent), 'won'))).toEqual([
      LEAK,
      'Not bad, Sprout.',
      "Don't name things on day one. You get attached.",
    ]);
    expect(texts(debriefLines(at({ ms: 1200, ticks: 144 }), 'lost'))).toEqual([LEAK, LOST]);
    expect(texts(debriefLines(at({ ...recent, ms: FIRST_LEAK_RECENT_MS + 1 }), 'lost'))).toEqual([
      LOST,
    ]);
    // Fast-forwarded: moments ago in real time, but long ago in game time.
    expect(texts(debriefLines(at({ ms: 5, ticks: 3000 }), 'lost'))).toEqual([LOST]);
    expect(FIRST_LEAK_RECENT_TICKS).toBe(480); // 4 s at 2×
    // Once per campaign: a save that has heard it doesn't hear it on the card either.
    const save = createNewSave();
    const heard = { ...save, story: { ...save.story, seen: ['quill_first_leak_a1_01'] } };
    expect(texts(debriefLines({ ...at(recent), ...debriefStoryOf(heard) }, 'lost'))).toEqual([
      LOST,
    ]);
  });

  it('has no debrief off the campaign', () => {
    expect(debriefLines({ ...INPUT, mapId: 'dev_range' }, 'won')).toEqual([]);
  });
});
