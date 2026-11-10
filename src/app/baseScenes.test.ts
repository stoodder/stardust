// The base's conversations (app/baseScenes.ts, T308): Zibzab's arrival once, and the open question.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../meta/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import {
  ARRIVAL_SCENE,
  arrivalDue,
  askOpenQuestion,
  OPEN_QUESTION_SCENE,
  openQuestionShown,
  playArrivalIfDue,
} from './baseScenes.ts';
import { chooseOption, closeScene, setDialogueEnabled, skipScene } from './dialogue.ts';
import { activeSave, initSaves, loadDevSave } from './save.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1);
  setDialogueEnabled(true);
});

afterEach(() => {
  skipScene();
  closeScene();
  setDialogueEnabled(true);
});

describe("Zibzab's arrival at the base", () => {
  it('is due once the shop is open, plays as a panel, and is seen for good', () => {
    loadDevSave('mid_m2');
    expect(arrivalDue()).toBe(false); // the shop isn't open yet
    loadDevSave('after_a1m3');
    expect(activeSave()?.unlocks.towers).toContain('zapcoil'); // the sample is in hand
    expect(arrivalDue()).toBe(true);
    expect(playArrivalIfDue()).toBe(true);
    expect(dialogue.scene.value).toMatchObject({ sceneId: ARRIVAL_SCENE, mode: 'panel' });
    expect(skipScene()).toBe(true);
    expect(dialogue.scene.value).toBeNull();
    expect(activeSave()?.story.seen).toContain(ARRIVAL_SCENE);
    expect(arrivalDue()).toBe(false);
    expect(playArrivalIfDue()).toBe(false);
  });

  it('has played in the dev saves from after_a1m4 on (bought at his shop; T461)', () => {
    for (const id of ['after_a1m4', 'after_a1m5', 'after_a2m3', 'all_unlocked'] as const) {
      loadDevSave(id);
      expect(arrivalDue()).toBe(false);
    }
  });

  it('waits while dialogue is off (`?test=1` without `&dialogue=1`)', () => {
    loadDevSave('after_a1m3');
    setDialogueEnabled(false);
    expect(arrivalDue()).toBe(false);
    expect(playArrivalIfDue()).toBe(false);
  });
});

describe('the open question', () => {
  it('"Still asking." sets asked_zibzab_early and takes the row off the shelf', () => {
    loadDevSave('after_a1m3');
    expect(openQuestionShown()).toBe(true);
    askOpenQuestion();
    expect(dialogue.scene.value?.sceneId).toBe(OPEN_QUESTION_SCENE);
    skipScene(); // to the choice
    expect(dialogue.scene.value?.choices?.map((c) => c.text)).toEqual([
      'Still asking.',
      'Not today.',
    ]);
    chooseOption(0);
    skipScene(); // through the answer
    expect(dialogue.scene.value).toBeNull();
    expect(activeSave()?.story.flags.asked_zibzab_early).toBe(true);
    expect(openQuestionShown()).toBe(false);
  });

  it('"Not today." leaves the question on the shelf', () => {
    loadDevSave('after_a1m3');
    askOpenQuestion();
    skipScene();
    chooseOption(1);
    closeScene();
    expect(dialogue.scene.value).toBeNull();
    expect(activeSave()?.story.flags.asked_zibzab_early).toBeUndefined();
    expect(openQuestionShown()).toBe(true);
  });

  it('is not on the shelf before the shop opens', () => {
    loadDevSave('mid_m2');
    expect(openQuestionShown()).toBe(false);
    askOpenQuestion();
    expect(dialogue.scene.value).toBeNull();
  });
});
