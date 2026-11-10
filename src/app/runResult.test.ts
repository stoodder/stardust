import { describe, expect, it } from 'vitest';
import {
  debriefLines,
  debriefStoryOf,
  FIRST_LEAK_RECENT_MS,
  FIRST_LEAK_RECENT_TICKS,
  metaRunEndOf,
  offeredMedals,
  resultStamps,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';
import { FIRST_PAYDAY_SEEN_ID, createNewSave, runEnd } from '../meta/index.ts';

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
      counter: 'starred',
      theme: 1,
      wavesSurvived: 4,
      waveCount: 7,
      integrity: 0,
      maxIntegrity: 20,
      asset: null,
      pestsProcessed: 57,
      debrief: [
        {
          name: 'Bricks',
          color: 'orange.4',
          text: 'Back on the pads, Sprout. Everybody loses some lettuce on day one.',
        },
      ],
      stamps: [],
      rewards: null,
      resumedFromWave: null,
      retryFromWave: null,
      escort: null,
      choice: null,
    });
  });

  it("reads the map's presentation dials: Act I's starred card, Act II's plain one (T410b)", () => {
    expect(runResultOf(INPUT, 'won')).toMatchObject({ counter: 'starred', theme: 1 });
    expect(runResultOf({ ...INPUT, mapId: 'a2_m03' }, 'won')).toMatchObject({
      counter: 'plain',
      theme: 2,
    });
    // A dev map reads its act's row.
    expect(runResultOf({ ...INPUT, mapId: 'dev_act2', act: 2 }, 'won').counter).toBe('plain');
    expect(runResultOf({ ...INPUT, mapId: 'dev_range' }, 'won').counter).toBe('starred');
  });

  it('offers the latest checkpoint after a loss only, and says which wave a run resumed from', () => {
    const cp = { ...INPUT, checkpointWave: 10, resumedFromWave: 5 };
    expect(runResultOf(cp, 'lost')).toMatchObject({ retryFromWave: 10, resumedFromWave: 5 });
    expect(runResultOf(cp, 'won')).toMatchObject({ retryFromWave: null, resumedFromWave: 5 });
    expect(metaRunEndOf(cp, 'won')).toMatchObject({ usedCheckpoint: true, resumedFromWave: 5 });
    const fresh = metaRunEndOf({ ...INPUT, checkpointWave: 5 }, 'lost');
    expect(fresh.usedCheckpoint).toBeUndefined();
    expect(fresh.resumedFromWave).toBeUndefined();
  });

  it("lists a Protect map's asset as the run left it (T305a)", () => {
    const asset = { name: 'Rigs', value: -1, max: 10 };
    expect(runResultOf({ ...INPUT, asset }, 'lost').asset).toEqual({ ...asset, value: 0 });
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
      objectives: [],
      stardust: {
        source: 'replay',
        amount: 48,
        base: 120,
        wavesResolved: 7,
        waveCount: 7,
        fromWave: null,
      },
      intel: 1,
      lifetimePests: 114,
      stardustNote: null,
      firstPayday: false,
      issued: [],
      saveNotice: null,
      transactions: [],
      memos: [],
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

const recorded = (save: ReturnType<typeof createNewSave>, input: RunEndInput) =>
  runEnd(save, { ...metaRunEndOf(input, 'won'), mapId: 'a1_m04' });

describe('objectives and the first payday on the card (T316, T235)', () => {
  const AUDIT = { id: 'clean_audit', name: 'Clean Audit', intel: 1 };
  const winWith = (status: 'open' | 'done' | 'failed'): RunEndInput => ({
    ...INPUT,
    mapId: 'a1_m04',
    objectives: [{ ...AUDIT, status }],
  });

  it('lists each objective with its standing, and pays a done one once', () => {
    const first = recorded(createNewSave(), winWith('done'));
    const rewards = runResultOf(winWith('done'), 'won', first.summary).rewards;
    expect(rewards?.objectives).toEqual([
      { id: 'clean_audit', name: 'Clean Audit', done: true, isNew: true, intel: 1 },
    ]);
    const again = recorded(first.save, winWith('done'));
    expect(runResultOf(winWith('done'), 'won', again.summary).rewards?.objectives).toEqual([
      { id: 'clean_audit', name: 'Clean Audit', done: true, isNew: false, intel: 0 },
    ]);
    const failed = recorded(createNewSave(), winWith('failed'));
    expect(runResultOf(winWith('failed'), 'won', failed.summary).rewards?.objectives).toEqual([
      { id: 'clean_audit', name: 'Clean Audit', done: false, isNew: false, intel: 0 },
    ]);
    // meta pays only the done ones (completedObjectives).
    expect(metaRunEndOf(winWith('failed'), 'won').completedObjectives).toEqual([]);
    expect(metaRunEndOf(winWith('done'), 'won').completedObjectives).toEqual([
      { id: 'clean_audit', intel: 1 },
    ]);
  });

  it("marks the first payday, and shows the shop's note then only", () => {
    const note = "Banked for Zibzab's shop. Opens after Special Delivery.";
    const first = runEnd(createNewSave(), { ...metaRunEndOf(INPUT, 'won'), mapId: 'a1_m01' });
    const paid = runResultOf(INPUT, 'won', { ...first.summary, stardustNote: note }).rewards;
    expect(paid?.firstPayday).toBe(true);
    expect(paid?.stardustNote).toBe(note);
    // Results showed it, so the router marked it seen (D097); the next win isn't a first payday.
    const shown = {
      ...first.save,
      story: { ...first.save.story, seen: [...first.save.story.seen, FIRST_PAYDAY_SEEN_ID] },
    };
    const later = runEnd(shown, { ...metaRunEndOf(INPUT, 'won'), mapId: 'a1_m01' });
    const again = runResultOf(INPUT, 'won', { ...later.summary, stardustNote: note }).rewards;
    expect(again?.firstPayday).toBe(false);
    expect(again?.stardustNote).toBeNull();
    // Once the shop is open (no note), an empty bank's pay is no "first" payday.
    expect(runResultOf(INPUT, 'won', first.summary).rewards?.firstPayday).toBe(false);
  });
});

/**
 * Run stats for A1M5's Quiet Wave: Old Thrum (`quiet_wave`) and six younglings (`quiet_wave` +
 * `youngling`); `thrum` says whether she leaked, `young` how many younglings did.
 */
const tags = (thrum: boolean, young: number) => {
  const none = { quiet_wave: 0, youngling: 0, fleeing: 0, medal_exempt: 0 };
  const leaked = (thrum ? 1 : 0) + young;
  return {
    holdFireUses: 1,
    holdFireTicks: 0,
    integrityLost: 0,
    towersBuilt: 0,
    creditsSpent: 0,
    abilityUses: 0,
    tagSpawned: { ...none, quiet_wave: 7, youngling: 6 },
    tagLeaked: { ...none, quiet_wave: leaked, youngling: young },
    tagKilled: { ...none, quiet_wave: 7 - leaked, youngling: 6 - young },
  };
};

/** A run of A1M5 whose Quiet Wave leaked Old Thrum (or not) and `young` of six younglings. */
const a1m05 = (thrum: boolean, young: number): RunEndInput => ({
  ...INPUT,
  mapId: 'a1_m05',
  stats: tags(thrum, young),
});

describe('story stamps (core-loop.md § 6.2; C1)', () => {
  it("stamps A1M5's card CONTAINMENT LAPSE when this run spared the Quiet Wave", () => {
    expect(resultStamps(a1m05(true, 6), 'won')).toEqual(['CONTAINMENT LAPSE']);
    expect(resultStamps(a1m05(true, 5), 'won')).toEqual(['CONTAINMENT LAPSE']); // ≥ 75%
    expect(resultStamps(a1m05(true, 4), 'won')).toEqual([]);
    // Spared means Old Thrum lived (D097): younglings spared after she fell don't count.
    expect(resultStamps(a1m05(false, 6), 'won')).toEqual([]);
    expect(runResultOf(a1m05(true, 6), 'won').stamps).toEqual(['CONTAINMENT LAPSE']);
  });

  it("reads this run, not the save's flag: a replay that cleared it has no stamp", () => {
    const save = createNewSave();
    const spared = {
      ...save,
      story: { ...save.story, flags: { spared_quiet_wave: true as const } },
    };
    expect(resultStamps({ ...a1m05(false, 0), ...debriefStoryOf(spared) }, 'won')).toEqual([]);
    expect(resultStamps({ ...a1m05(true, 6), ...debriefStoryOf(save) }, 'won')).toEqual([
      'CONTAINMENT LAPSE',
    ]);
  });

  it('stamps only a win, only on its map, and nothing without stats', () => {
    expect(resultStamps(a1m05(true, 6), 'lost')).toEqual([]);
    expect(resultStamps({ ...a1m05(true, 6), mapId: 'a1_m04' }, 'won')).toEqual([]);
    expect(resultStamps({ ...INPUT, mapId: 'a1_m05' }, 'won')).toEqual([]);
    expect(resultStamps({ ...a1m05(true, 6), mapId: 'dev_range' }, 'won')).toEqual([]);
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
