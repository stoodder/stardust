// T510: the debrief's story choice on Results (C2, app/resultsFlow.ts) and the story's payroll rows
// (app/resultsStory.ts). The choice reads a stand-in debrief with A2M4's shape (the `bank` branch
// to "No refunds. I did say.", the two offers), so the flow is tested whatever the map's own
// dialogue says; the card's own lines are the registered debrief's (runResultOf).
import { beforeEach, describe, expect, it } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import type { Scene } from '../content/dialogue/types.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import {
  MemoryStore,
  Q3_BONUS_MEMO,
  ZIBZAB_TUNE_UP,
  createNewSave,
  loadSlot,
  writeSlot,
  type SaveData,
} from '../meta/index.ts';
import { runResult } from '../ui/screens/state.ts';
import { C2_RETURN_NOTE, pickResultsChoice, withResultsChoice } from './resultsFlow.ts';
import { escortAtEnd, resultsMemos, storyRewardsOf } from './resultsStory.ts';
import {
  debriefStory,
  debriefStoryOf,
  metaRunEndOf,
  offeredMedals,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';
import { activeSave, initSaves, openSlot } from './save.ts';

/** A2M4's debrief shape (act2.md § A2M4, *Debrief*), with a line after the offers to play on. */
const DEBRIEF: Scene = {
  id: 'a2_m04_debrief',
  nodes: [
    { kind: 'line', speaker: 'sterling', text: 'Sustainability!' },
    { kind: 'branch', cond: { bank: 'stardust', lte: 0 }, goto: 'no_bank' },
    { kind: 'line', speaker: 'zibzab', text: 'Price first. Two offers.' },
    {
      kind: 'choice',
      options: [
        { text: 'Sell it. Market price.', tone: 'wry', set: { stardust_choice: 'sold' } },
        { text: 'Take it to them.', tone: 'earnest', set: { stardust_choice: 'returned' } },
      ],
    },
    { kind: 'line', speaker: 'zibzab', text: 'Done.' },
    { kind: 'end' },
    { label: 'no_bank', kind: 'line', speaker: 'zibzab', text: 'No refunds. I did say.' },
    { kind: 'set', flag: 'stardust_choice', value: 'none' },
  ],
};
const lookup = (id: string): Scene | undefined => (id === DEBRIEF.id ? DEBRIEF : undefined);

const INPUT: RunEndInput = {
  mapId: 'a2_m04',
  waveCount: 12,
  maxIntegrity: 20,
  integrity: 18,
  skitterkinKilled: 40,
  wavesCleared: 12,
  firstLeakAgo: null,
  stardust: 225,
  medals: offeredMedals({ medals: null }),
  earnedMedals: ['victory'],
};

/** `save` with `stardust` banked. */
function withBank(save: SaveData, stardust: number): SaveData {
  return { ...save, currencies: { ...save.currencies, stardust } };
}

/** The card for a won A2M4 over `save`, with its choice (C2) as Results would show it. */
function card(save: SaveData, record: boolean, outcome: 'won' | 'lost' = 'won') {
  const story = { ...INPUT, ...debriefStoryOf(save) };
  const summary = {
    outcome,
    wonBefore: false,
    stardust: { source: 'first_clear', amount: 225, base: 225, wavesResolved: 12, waveCount: 12 },
    firstPayday: false,
    medals: [],
    objectives: [],
    intel: 0,
    pestsProcessed: { run: 40, lifetime: 400 },
    flags: {},
    issued: [],
    memos: [],
    codex: [],
    transactions: [],
    revocations: [],
  } as const;
  const base = runResultOf(story, outcome, {
    ...summary,
    stardust: { ...summary.stardust, fromWave: null },
  });
  const result = withResultsChoice(base, story, outcome, save, record, lookup);
  runResult.value = result;
  return result;
}

/** Whether the card on screen waits on its story choice. */
const pending = (): boolean => runResult.value?.choice?.picked === null;

describe('C2 on the results card', () => {
  it('offers the debrief choice on a won A2M4 with Stardust banked, price first', () => {
    const result = card(withBank(createNewSave(), 625), false);
    expect(result.choice).toEqual({
      by: 'Zibzab',
      bank: 625,
      options: ['Sell it. Market price.', 'Take it to them.'],
      // Price first (D138): what each pays, before the pick.
      pays: [
        { intel: 4, note: 'Zibzab Tune-up' },
        { intel: 0, note: C2_RETURN_NOTE },
      ],
      picked: null,
    });
    expect(pending()).toBe(true);
  });

  it('offers nothing on a loss, or once the save has made the choice', () => {
    expect(card(withBank(createNewSave(), 625), false, 'lost').choice).toBeNull();
    const made = withBank(createNewSave(), 625);
    made.story.flags.stardust_choice = 'returned';
    expect(card(made, false).choice).toBeNull();
    expect(pending()).toBe(false);
  });

  it('with an empty bank, makes `none` as the card opens: no offer, no trade row', () => {
    const result = card(withBank(createNewSave(), 0), false);
    expect(result.choice).toBeNull();
    expect(result.rewards?.transactions).toEqual([
      { kind: 'c2', choice: 'none', bank: 0, intel: 0, tuneUp: null },
    ]);
  });

  it("the fixture's choice (record false) plays on a copy and writes nothing", () => {
    initSaves(new MemoryStore());
    const save = withBank(createNewSave(), 1_200);
    card(save, false);
    pickResultsChoice(0);
    const shown = runResult.value;
    expect(shown?.choice?.picked).toBe(0);
    expect(shown?.rewards?.transactions).toEqual([
      {
        kind: 'c2',
        choice: 'sold',
        bank: 1_200,
        intel: 8,
        tuneUp: { name: 'Zibzab Tune-up', line: 'Ten percent. Honestly, eight.' },
      },
    ]);
    // The rest of the debrief plays on: the card's lines are the map's, plus what follows the pick.
    expect(shown?.debrief.at(-1)?.text).toBe('Done.');
    expect(save.story.flags.stardust_choice).toBeUndefined();
    expect(activeSave()).toBeNull();
  });
});

/** A won A2M4's card input over `save`. */
function storyOf(save: SaveData): RunEndInput {
  return { ...INPUT, ...debriefStoryOf(save) };
}

describe("A2M4's own debrief", () => {
  const registered = Object.hasOwn(SCENES, 'a2_m04_debrief');

  it.runIf(registered)('offers C2 with a bank and makes `none` without one', () => {
    const offered = withBank(createNewSave(), 625);
    const r = withResultsChoice(
      runResultOf(storyOf(offered), 'won'),
      storyOf(offered),
      'won',
      offered,
    );
    expect(r.choice?.options).toHaveLength(2);
    const empty = withBank(createNewSave(), 0);
    const e = withResultsChoice(
      runResultOf(storyOf(empty), 'won'),
      storyOf(empty),
      'won',
      empty,
      false,
    );
    expect(e.choice).toBeNull();
    expect(runResultOf(storyOf(empty), 'won').debrief.at(-1)?.text).toBe('No refunds. I did say.');
  });
});

describe("A2M4's own debrief on a loss", () => {
  it.runIf(Object.hasOwn(SCENES, 'a2_m04_debrief'))(
    "shows only Zibzab's line and offers no C2, whatever the bank",
    () => {
      const save = withBank(createNewSave(), 625);
      const lost = withResultsChoice(
        runResultOf(storyOf(save), 'lost'),
        storyOf(save),
        'lost',
        save,
        false,
      );
      expect(lost.choice).toBeNull();
      expect(lost.debrief.map((l) => l.text)).toEqual([
        'No charge for that one, Technician. Go again.',
      ]);
      expect(lost.rewards).toBeNull();
    },
  );
});

describe('C2 taken in the save in play', () => {
  let store: MemoryStore;
  beforeEach(() => {
    store = new MemoryStore();
    initSaves(store, () => 1000);
    writeSlot(store, 1, withBank(DEV_SAVES.after_a2m3_ref.build(), 925), 0);
    expect(openSlot(1)).toEqual({ ok: true });
  });

  it('Sell: written at once, the bank for Intel and the Zibzab Tune-up; once', () => {
    const intel = activeSave()!.currencies.intel;
    card(activeSave()!, true);
    pickResultsChoice(0);
    const stored = loadSlot(store, 1);
    const save = stored.status === 'ok' ? stored.save : null;
    expect(save?.story.flags.stardust_choice).toBe('sold');
    expect(save?.currencies).toEqual({ stardust: 0, intel: intel + 6 });
    expect(save?.upgrades[ZIBZAB_TUNE_UP]).toBe(1);
    expect(pending()).toBe(false);
    // A second press (or the other option) changes nothing.
    const shown = runResult.value;
    pickResultsChoice(1);
    expect(runResult.value).toBe(shown);
    expect(activeSave()?.story.flags.stardust_choice).toBe('sold');
  });

  it('Return: the bank goes home, nothing else', () => {
    const before = activeSave()!;
    card(before, true);
    pickResultsChoice(1);
    const after = activeSave()!;
    expect(after.story.flags.stardust_choice).toBe('returned');
    expect(after.currencies).toEqual({ stardust: 0, intel: before.currencies.intel });
    expect(after.upgrades).toEqual(before.upgrades);
    expect(runResult.value?.rewards?.transactions).toEqual([
      { kind: 'c2', choice: 'returned', bank: 925, intel: 0, tuneUp: null },
    ]);
  });

  it('an empty bank writes `none` as the card opens', () => {
    const empty = withBank(activeSave()!, 0);
    card(empty, true);
    expect(activeSave()?.story.flags.stardust_choice).toBe('none');
  });
});

describe("the payroll's story rows", () => {
  it('shows the Q3 memo on the card only with the Q3 Bonus', () => {
    const q3 = [{ kind: 'q3_bonus', stardust: 400 }] as const;
    expect(resultsMemos(q3, [Q3_BONUS_MEMO, 'memo_a2_05'])).toEqual([
      { id: Q3_BONUS_MEMO, subject: 'Your Q3 Performance Bonus!' },
    ]);
    expect(resultsMemos([], [Q3_BONUS_MEMO])).toEqual([]);
    expect(
      storyRewardsOf({ transactions: [{ kind: 'gift', tower: 'skyhook' }], memos: [] }),
    ).toEqual({ transactions: [{ kind: 'gift', tower: 'Skyhook' }], memos: [] });
  });
});

/** A finished battle's Escort numbers: the map's objective now and at its start. */
function sim(objective: string, start: string) {
  return {
    map: { objective: start, escort: { total: 12 } },
    state: {
      objective,
      meterLabel: 'evacuated' as const,
      refugeeTotal: 12,
      stats: { evacuated: 9, refugeesLost: 2 },
    },
  };
}

describe('escortAtEnd', () => {
  it('reads the Escort meter when the map ended as one', () => {
    expect(escortAtEnd(sim('escort', 'escort'))).toEqual({
      escort: {
        kind: 'evacuated',
        label: 'Evacuated',
        evacuated: 9,
        total: 12,
        lost: 2,
      },
    });
    // After a pivot (A2M5's) the same: the map ended as an Escort.
    expect(escortAtEnd(sim('escort', 'defend'))).toEqual(escortAtEnd(sim('escort', 'escort')));
    expect(escortAtEnd(sim('defend', 'defend'))).toEqual({});
  });

  it("reads a Holdout's Evacuated over the run's own total (T610: A3M3's chosen door)", () => {
    const holdout = sim('holdout', 'holdout');
    // The map lists both doors' groups; the run counts only the door C3 picked.
    const run = { ...holdout, state: { ...holdout.state, refugeeTotal: 11 } };
    expect(escortAtEnd(run)).toEqual({
      escort: {
        kind: 'evacuated',
        label: 'Evacuated',
        evacuated: 9,
        total: 11,
        lost: 2,
        holdout: true,
      },
    });
  });

  it("makes the Evacuated count run end's meter, the counter's meter, and `{evacuated}`", () => {
    const escort = escortAtEnd(sim('escort', 'escort')).escort!;
    const input = { ...INPUT, mapId: 'a1_m01', escort };
    expect(runResultOf(input, 'won').escort).toEqual(escort);
    expect(metaRunEndOf(input, 'won').meter).toBe(9);
    expect(metaRunEndOf(INPUT, 'won').meter).toBe(18);
    expect(debriefStory(input).text.evacuated).toBe(9);
    expect(debriefStory(INPUT).text.evacuated).toBeNull();
  });
});
