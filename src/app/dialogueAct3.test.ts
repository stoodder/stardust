// Act III's dialogue in play (T613): the Clean Exit cue (`<map>_cue_revoke`) holds the battle by
// its name and ends the radio's beat, its silence moving on by itself, Sterling's portrait lit;
// a leak-line cue (`<map>_cue_leak_<x>`) puts its line on the wave preview, radio or not;
// Bramble's plate; Ves'thara on the radio beside her. The leak cue and the revoke cue are mocked
// into the scene registry (A3M2's own are T621's content).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineScene } from '../content/dialogue/define.ts';
import type { Scene } from '../content/dialogue/types.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim } from '../sim/index.ts';
import { plateName } from '../story/plates.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { revokedHud } from '../ui/hud/revokedState.ts';
import { screen, speed } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import {
  bindDialogue,
  endsBeat,
  isLeakLine,
  leakLineText,
  nextScene,
  pausingCue,
  playScene,
  sceneMode,
  setDialogueEnabled,
  skipScene,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { initSaves } from './save.ts';

// Hoisted with the mocks below (plain scene data: `defineScene` only types it).
const { LEAK, REVOKE } = vi.hoisted(() => ({
  LEAK: {
    id: 'a3_m02_cue_leak_w08',
    nodes: [
      {
        kind: 'line',
        speaker: 'quill',
        text: 'I am not permitted to tell you wave eight is mostly Hollow. I am permitted to cough. Ahem.',
      },
    ],
  } as const satisfies Scene,
  REVOKE: {
    id: 'a3_m02_cue_revoke',
    nodes: [
      { kind: 'line', speaker: 'sterling', text: "I'm revoking your Corporate Tower License now!" },
      { kind: 'line', speaker: 'sterling', text: '', durationSec: 2 },
      {
        kind: 'line',
        speaker: 'sterling',
        text: 'Smiling is mandatory, Four-Forty-Seven! (Not kidding.)',
      },
    ],
  } as const satisfies Scene,
}));

vi.mock(import('../content/dialogue/index.ts'), async (original) => {
  const o = await original();
  return { ...o, SCENES: { ...o.SCENES, [LEAK.id]: LEAK, [REVOKE.id]: REVOKE } };
});
vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const noop = (): void => {};
const line: Scene['nodes'][number] = { kind: 'line', speaker: 'quill', text: 'Hm.' };

/** Bramble's plate on `map`, between maps. */
const plateAt = (map: 'a2_m06' | 'a3_m01'): string =>
  plateName('chitterbloom', { flags: {}, map, pestsProcessed: 0, seen: [], run: null });

describe('the rules', () => {
  it('pauses a revoke cue by its name, as `pause: true` does, and ends the beat with it', () => {
    const named = defineScene('a3_m02_cue_revoke', [line]);
    expect(pausingCue(named)).toBe(true);
    expect(sceneMode(named)).toBe('panel');
    expect(endsBeat(named)).toBe(true);
    // The data's flag says the same (T621 sets it too); the two never disagree.
    expect(pausingCue({ ...named, pause: true })).toBe(true);
    expect(endsBeat({ ...named, pause: true })).toBe(true);
    // Other cues: radio, unless flagged; a flagged one keeps D135's rule (never eats a line).
    const other = defineScene('a3_m02_cue_shuttle', [line]);
    expect(sceneMode(other)).toBe('comms');
    expect(endsBeat({ ...other, pause: true })).toBe(false);
    // Only a cue slot counts: a radio line or a scene named like it is not a cue.
    expect(pausingCue(defineScene('a3_m02_w07', [line]))).toBe(false);
  });

  it('reads a `cue_leak_*` scene as a leak line, its first spoken line as the text', () => {
    expect(isLeakLine(LEAK)).toBe(true);
    expect(isLeakLine(defineScene('a3_m02_w08', [line]))).toBe(false);
    expect(isLeakLine(REVOKE)).toBe(false);
    const ctx = { flags: {}, map: 'a3_m02' as const, pestsProcessed: 0, seen: [], run: null };
    const text = { profile: null, pestsProcessed: 0, evacuated: null };
    expect(leakLineText(LEAK, ctx, text)).toContain('mostly Hollow');
    const silentFirst = defineScene('a3_m02_cue_leak_w09', [
      { kind: 'line', speaker: 'quill', text: '', durationSec: 1 },
      line,
    ]);
    expect(leakLineText(silentFirst, ctx, text)).toBe('Hm.');
  });

  it('names Bramble on her plate from A3M1 (and Chitterbloom before)', () => {
    expect(plateAt('a2_m06')).toBe('Chitterbloom');
    expect(plateAt('a3_m01')).toBe('Bramble');
  });
});

describe('in a battle', () => {
  let unbind: () => void = noop;
  let host: Host<IdSpace>;
  const bind = (on: boolean): void => {
    setDialogueEnabled(on);
    host = createHost(createSim(battleConfig('a3_m01', 1, null)));
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
    vi.advanceTimersByTime(30_000);
  };
  beforeEach(() => {
    vi.useFakeTimers();
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    setSpeed(2);
    revokedHud.value = { ...revokedHud.value, leakLine: null };
  });
  afterEach(() => {
    unbind();
    unbind = noop;
    while (skipScene());
    vi.useRealTimers();
    setDialogueEnabled(true);
    screen.value = null;
  });

  it("holds the battle for Sterling's cue; her held beat moves on by itself, lit", () => {
    bind(true);
    playScene(REVOKE);
    expect(dialogue.scene.value?.mode).toBe('panel');
    expect(speed.value).toBe(0);
    nextScene(); // finish typing
    nextScene(); // to the held beat
    const beat = dialogue.scene.value?.line;
    expect(beat?.silence).toBe(true);
    // Her own pause, not an absent speaker's: the portrait isn't the dark bake.
    expect(beat?.portrait?.dark).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(dialogue.scene.value?.line?.text).toContain('Smiling is mandatory');
    nextScene();
    nextScene();
    expect(dialogue.scene.value).toBeNull();
    expect(speed.value).toBe(2);
  });

  it('puts a leak cue on the wave preview as it fires, with the radio on', () => {
    bind(true);
    host.bus.emit({ type: 'ScriptCue', cueId: LEAK.id });
    expect(revokedHud.value.leakLine).toContain('mostly Hollow');
    expect(dialogue.comms.value?.line.text).toContain('mostly Hollow');
  });

  it('and with it off: the preview still gets the leak (fair-play intel)', () => {
    bind(false);
    host.bus.emit({ type: 'ScriptCue', cueId: LEAK.id });
    expect(revokedHud.value.leakLine).toContain('mostly Hollow');
    expect(dialogue.comms.value).toBeNull();
  });
});
