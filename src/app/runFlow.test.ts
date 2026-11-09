// The flow around a won map's results card (T316): which scenes play before Results and after it's
// dismissed (a win's, registered ones only), played full-screen one after another, then the way on.
import { afterEach, describe, expect, it } from 'vitest';
import { defineScene } from '../content/dialogue/define.ts';
import type { Scene } from '../content/dialogue/types.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { setDialogueEnabled, skipScene } from './dialogue.ts';
import {
  afterResultsPending,
  flowScenes,
  leaveResults,
  playInOrder,
  setAfterResults,
} from './runFlow.ts';

const party = defineScene('a1_m05_scene_party', [
  { kind: 'line', speaker: 'quill', text: 'Everyone is wearing a hat!' },
]);
const stinger = defineScene('a1_m05_scene_stinger', [
  { kind: 'line', speaker: 'quill', text: 'Probably a smudge! Logging it.' },
]);
const registry = (scenes: readonly Scene[]) => (id: string) => scenes.find((s) => s.id === id);
const shownScene = (): string | null => dialogue.scene.value?.sceneId ?? null;

afterEach(() => {
  while (skipScene());
  setDialogueEnabled(true);
  setAfterResults([]);
});

describe('flowScenes', () => {
  it("names A1M5's party before Results and its stinger after, on a win", () => {
    const lookup = registry([party, stinger]);
    expect(flowScenes('a1_m05', 'won', 'before', lookup)).toEqual([party]);
    expect(flowScenes('a1_m05', 'won', 'after', lookup)).toEqual([stinger]);
  });

  it('plays nothing on a loss, on a map with no flow, or before the scene is registered', () => {
    const lookup = registry([party, stinger]);
    expect(flowScenes('a1_m05', 'lost', 'before', lookup)).toEqual([]);
    expect(flowScenes('a1_m04', 'won', 'after', lookup)).toEqual([]);
    expect(flowScenes('dev_range', 'won', 'after', lookup)).toEqual([]);
    expect(flowScenes('a1_m05', 'won', 'before', registry([stinger]))).toEqual([]);
  });
});

describe('playing the flow', () => {
  it('plays the scenes full-screen in order, then goes on', () => {
    let done = 0;
    playInOrder([party, stinger], () => done++);
    expect(shownScene()).toBe('a1_m05_scene_party');
    expect(dialogue.scene.value?.mode).toBe('fullscreen');
    expect(skipScene()).toBe(true);
    expect(shownScene()).toBe('a1_m05_scene_stinger');
    expect(done).toBe(0);
    expect(skipScene()).toBe(true);
    expect(shownScene()).toBeNull();
    expect(done).toBe(1);
  });

  it('goes straight on with no scenes, or while dialogue is off', () => {
    let done = 0;
    playInOrder([], () => done++);
    setDialogueEnabled(false);
    playInOrder([party], () => done++);
    expect(done).toBe(2);
    expect(shownScene()).toBeNull();
  });

  it('plays the after-Results scenes once, whichever way the card is left', () => {
    const went: string[] = [];
    setAfterResults([stinger]);
    expect(afterResultsPending()).toBe(true);
    leaveResults(() => went.push('continue'));
    expect(shownScene()).toBe('a1_m05_scene_stinger');
    expect(went).toEqual([]);
    skipScene();
    expect(went).toEqual(['continue']);
    expect(afterResultsPending()).toBe(false);
    leaveResults(() => went.push('retry'));
    expect(went).toEqual(['continue', 'retry']);
    expect(shownScene()).toBeNull();
  });
});
