// T714: C4 on the card as C3's (StoryChoice.tsx): each option carries its "QUILL will remember
// that.", shown once that option is taken; C2's options remember nothing.
import { beforeEach, describe, expect, it } from 'vitest';
import { createNewSave, MemoryStore } from '../../meta/index.ts';
import { pickResultsChoice, withResultsChoice } from '../../app/resultsFlow.ts';
import { runResultOf, type RunEndInput } from '../../app/runResult.ts';
import { initSaves, loadDevSave } from '../../app/save.ts';
import { runResult, type ResultsChoice } from './state.ts';
import { rememberedText } from './StoryChoice.tsx';

const A3M4_WON: RunEndInput = {
  mapId: 'a3_m04',
  act: 3,
  waveCount: 16,
  maxIntegrity: 20,
  integrity: 18,
  skitterkinKilled: 0,
  wavesCleared: 16,
  firstLeakAgo: null,
  stardust: 330,
  medals: [],
  earnedMedals: [],
  objectives: [],
  resumedFromWave: null,
  checkpointWave: null,
};

describe("C4's answer remembered on the card (T714)", () => {
  beforeEach(() => initSaves(new MemoryStore()));

  it('offers each answer with "QUILL will remember that.", shown once taken', () => {
    expect(loadDevSave('after_a3m3_convoy')).toBe(true);
    const card = withResultsChoice(
      runResultOf(A3M4_WON, 'won', null),
      A3M4_WON,
      'won',
      createNewSave(),
      false,
    );
    const choice = card.choice!;
    expect(choice.remember).toEqual([
      'QUILL will remember that.',
      'QUILL will remember that.',
      'QUILL will remember that.',
    ]);
    expect(rememberedText(choice)).toBeNull();
    runResult.value = card;
    pickResultsChoice(1);
    const taken = runResult.value?.choice;
    expect(taken?.picked).toBe(1);
    expect(rememberedText(taken!)).toBe('QUILL will remember that.');
    runResult.value = null;
  });

  it('remembers nothing for a choice without it (C2)', () => {
    const c2: ResultsChoice = {
      by: 'Zibzab',
      bank: 900,
      title: null,
      options: ['Sell', 'Return'],
      pays: [],
      picked: 0,
    };
    expect(rememberedText(c2)).toBeNull();
  });
});
