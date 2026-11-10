// The base's conversations (app/baseScenes.ts, T308, T513): the visit scenes once each (Zibzab's
// arrival, Pebble's handover after A2M4), and the open question.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isMapWon, MemoryStore } from '../meta/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import {
  ARRIVAL_SCENE,
  arrivalDue,
  askOpenQuestion,
  HANDOVER_SCENE,
  LOOPHOLE_SCENE,
  OPEN_QUESTION_SCENE,
  openQuestionShown,
  playBaseScenesIfDue,
  VISIT_SCENES,
  visitScenesDue,
  WHISTLE_SCENE,
} from './baseScenes.ts';
import { chooseOption, closeScene, setDialogueEnabled, skipScene } from './dialogue.ts';
import { activeSave, initSaves, loadDevSave, updateActiveSave } from './save.ts';

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
    expect(playBaseScenesIfDue()).toBe(true);
    expect(dialogue.scene.value).toMatchObject({ sceneId: ARRIVAL_SCENE, mode: 'panel' });
    expect(skipScene()).toBe(true);
    expect(dialogue.scene.value).toBeNull();
    expect(activeSave()?.story.seen).toContain(ARRIVAL_SCENE);
    expect(arrivalDue()).toBe(false);
    expect(playBaseScenesIfDue()).toBe(false);
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
    expect(playBaseScenesIfDue()).toBe(false);
  });
});

/** A2M4 won, but the handover not seen yet (a real player's first visit). */
function freshAfterA2M4(): void {
  loadDevSave('after_a2m4_returned');
  updateActiveSave((s) => ({
    ...s,
    story: { ...s.story, seen: s.story.seen.filter((id) => id !== HANDOVER_SCENE) },
  }));
}

describe("Pebble's handover (A2M4's base scene)", () => {
  it('is seen in the dev saves past A2M4, with the truth scene (devSaves.ts)', () => {
    for (const id of ['after_a2m4_returned', 'after_a2m4_sold', 'all_unlocked'] as const) {
      loadDevSave(id);
      expect(activeSave()?.story.seen, id).toEqual(
        expect.arrayContaining([HANDOVER_SCENE, 'a2_m04_scene_truth']),
      );
      expect(visitScenesDue(), id).toEqual([]);
    }
  });

  it('is not due before A2M4 is won', () => {
    loadDevSave('after_a2m3_ref');
    expect(visitScenesDue()).toEqual([]);
  });

  it('plays once on the first visit after A2M4 is won, as a panel, without the shop tab', () => {
    freshAfterA2M4();
    expect(visitScenesDue()).toEqual([HANDOVER_SCENE]);
    expect(arrivalDue()).toBe(false);
    expect(playBaseScenesIfDue()).toBe(false);
    expect(dialogue.scene.value).toMatchObject({ sceneId: HANDOVER_SCENE, mode: 'panel' });
    skipScene();
    expect(dialogue.scene.value).toBeNull();
    expect(activeSave()?.story.seen).toContain(HANDOVER_SCENE);
    expect(visitScenesDue()).toEqual([]);
    expect(playBaseScenesIfDue()).toBe(false);
    expect(dialogue.scene.value).toBeNull();
  });

  it('plays after the arrival when both are due, each in turn', () => {
    freshAfterA2M4();
    updateActiveSave((s) => ({
      ...s,
      story: { ...s.story, seen: s.story.seen.filter((id) => id !== ARRIVAL_SCENE) },
    }));
    expect(visitScenesDue()).toEqual([ARRIVAL_SCENE, HANDOVER_SCENE]);
    expect(playBaseScenesIfDue()).toBe(true);
    expect(dialogue.scene.value?.sceneId).toBe(ARRIVAL_SCENE);
    skipScene();
    expect(dialogue.scene.value?.sceneId).toBe(HANDOVER_SCENE);
    skipScene();
    expect(dialogue.scene.value).toBeNull();
    expect(visitScenesDue()).toEqual([]);
  });

  it('waits while dialogue is off', () => {
    freshAfterA2M4();
    setDialogueEnabled(false);
    expect(visitScenesDue()).toEqual([]);
    expect(playBaseScenesIfDue()).toBe(false);
  });
});

describe("Sundown's visit scenes (A2M6)", () => {
  it('play in order after the handover: the loophole, then the whistle', () => {
    expect(VISIT_SCENES.map((v) => v.id)).toEqual([
      ARRIVAL_SCENE,
      HANDOVER_SCENE,
      LOOPHOLE_SCENE,
      WHISTLE_SCENE,
    ]);
  });

  it('are seen in the dev saves that won A2M6 (devSaves.ts), so the base opens clear', () => {
    loadDevSave('all_unlocked');
    expect(activeSave()?.story.seen).toEqual(
      expect.arrayContaining([LOOPHOLE_SCENE, WHISTLE_SCENE]),
    );
    loadDevSave('after_a2m6');
    const save = activeSave();
    if (save !== null && isMapWon(save, 'a2_m06')) {
      expect(activeSave()?.story.seen).toEqual(
        expect.arrayContaining([LOOPHOLE_SCENE, WHISTLE_SCENE]),
      );
    }
    expect(visitScenesDue()).toEqual([]);
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
