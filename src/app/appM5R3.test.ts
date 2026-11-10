// M5 review round 2's app fixes (D139), built in round 3: the pivot's held relabel shows the old
// meter whole until the meter has played its beat (S1); a scene holding input freezes the comms
// queue's stale clock, so what was stale when it opened is dropped as it closes, while a line it
// cut, or one queued fresh, still plays; a flow scene opening after the map's end drops what the
// panel still holds (S3: no old radio line over Results after a flow scene); and
// Pebble's whistle plays full-screen at the base after QUILL's loophole panel (S7). Real-time holds
// run on fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineScene } from '../content/dialogue/define.ts';
import type { Scene } from '../content/dialogue/types.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimState } from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { hud, screen } from '../ui/state.ts';
import { LOOPHOLE_SCENE, playBaseScenesIfDue, WHISTLE_SCENE } from './baseScenes.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import {
  advanceScene,
  bindDialogue,
  closeScene,
  commsHoldMs,
  COMMS_STALE_MS,
  playMapEndLines,
  playScene,
  setDialogueEnabled,
  skipScene,
} from './dialogue.ts';
import { createHost } from './host.ts';
import { bindEscortMeter, relabelShown } from './hudEscort.ts';
import { activeSave, initSaves, loadDevSave, newGame, updateActiveSave } from './save.ts';

vi.mock('./battle.ts', () => ({ startBattle: () => undefined }));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const noop = (): void => {};

describe("the pivot's held relabel (D139 S1)", () => {
  let unbind: () => void = noop;
  afterEach(() => {
    unbind();
    unbind = noop;
  });

  it('holds the old meter whole until the meter has shown it, then swaps once', () => {
    const sim = createSim(battleConfig('a2_m05', 1, null));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
    const state = sim.state as unknown as SimState;
    const host = createHost<IdSpace>(sim);
    unbind = bindEscortMeter(host);
    state.integrity = 21;
    state.objective = 'escort';
    state.meterLabel = 'evacuated';
    host.bus.emit({ type: 'ObjectiveChanged', objective: 'escort', meterLabel: 'evacuated' });
    const r = hud.relabel.value;
    expect(r).toMatchObject({ from: 'Core', fromValue: 21, held: true });
    // Another relabel's end leaves this one held.
    relabelShown(r!.id + 1);
    expect(hud.relabel.value?.held).toBe(true);
    relabelShown(r!.id);
    expect(hud.relabel.value).toMatchObject({ id: r!.id, from: 'Core', held: false });
    // Once is enough: the same end again changes nothing.
    const after = hud.relabel.value;
    relabelShown(r!.id);
    expect(hud.relabel.value).toBe(after);
  });
});

/** A pausing panel (`pause: true`) with one line. */
const pausing: Scene = {
  ...defineScene('a1_m01_cue_pause_test', [{ kind: 'line', speaker: 'quill', text: 'Hold on.' }]),
  pause: true,
};

/** Line `i` (from 1) of `longRadio`. */
const LONG_LINE = (i: number): string => `Line ${i} of a long report about absolutely nothing.`;

/** A comms scene of `n` lines (one speaker), to keep the panel busy past COMMS_STALE_MS. */
function longRadio(n: number): Scene {
  return defineScene(
    'a1_m01_cue_long_test',
    Array.from({ length: n }, (_, i) => ({
      kind: 'line' as const,
      speaker: 'quill' as const,
      text: LONG_LINE(i + 1),
    })),
  );
}

/** A full-screen flow scene (as A2M6's debrief plays before its card). */
const flowScene = defineScene('a1_m01_scene_flow_test', [
  { kind: 'line', speaker: 'quill', text: 'After the shift.' },
]);

const radio = defineScene('a1_m01_cue_radio_test', [
  { kind: 'line', speaker: 'bricks', text: 'Old news from wave two.' },
]);

/** Runs the comms panel dry (well past every hold), on fake timers. */
function drain(): void {
  for (let i = 0; i < 40; i++) vi.advanceTimersByTime(5_000);
}

describe('no stale comms after a scene holds input (D139 S3)', () => {
  let unbind: () => void = noop;
  const seen: string[] = [];
  let stop: () => void = noop;

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    newGame(1);
    screen.value = 'battle';
    setSpeed(1);
    const host = createHost(createSim(battleConfig('a1_m01', 1, null)));
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
    seen.length = 0;
    stop = dialogue.comms.subscribe((v) => {
      if (v !== null) seen.push(v.line.text);
    });
  });
  afterEach(() => {
    stop();
    unbind();
    unbind = noop;
    vi.useRealTimers();
    screen.value = null;
  });

  it('drops a scene already stale as the hold began; the line it cut goes on', () => {
    // The report's last line shows once the radio queued behind it has gone stale.
    const hold = commsHoldMs(LONG_LINE(1), undefined, false);
    const n = Math.floor(COMMS_STALE_MS / hold) + 2;
    playScene(longRadio(n));
    playScene(radio);
    vi.advanceTimersByTime((n - 1) * hold + 100);
    expect(dialogue.comms.value?.line.text).toBe(LONG_LINE(n));
    playScene(pausing);
    vi.advanceTimersByTime(30_000);
    advanceScene();
    expect(dialogue.scene.value).toBeNull();
    // The cut line comes back and plays out; the stale radio never shows after it.
    expect(dialogue.comms.value?.line.text).toBe(LONG_LINE(n));
    drain();
    expect(seen.at(-1)).toBe(LONG_LINE(n));
    expect(seen).not.toContain('Old news from wave two.');
  });

  it("drops what the panel holds when a flow scene opens after the map's end (no radio over Results)", () => {
    playScene(longRadio(6));
    playScene(radio);
    vi.advanceTimersByTime(500);
    expect(dialogue.comms.value?.line.text).toBe(LONG_LINE(1));
    // The map ends; the results hold runs out before the panel does, and Ishael's debrief opens.
    expect(playMapEndLines([], 'won')).toBeGreaterThan(0);
    playScene(flowScene, { mode: 'fullscreen' });
    expect(dialogue.comms.value).toBeNull();
    advanceScene();
    expect(dialogue.scene.value).toBeNull();
    seen.length = 0;
    drain();
    expect(seen).toEqual([]);
    // What the cut report set so far still counts as heard.
    expect(activeSave()?.story.seen).toContain('a1_m01_cue_long_test');
  });

  it('keeps a scene queued fresh as the hold began, however long the hold', () => {
    playScene(longRadio(2));
    playScene(radio);
    vi.advanceTimersByTime(1_000);
    playScene(pausing);
    vi.advanceTimersByTime(60_000);
    advanceScene();
    drain();
    expect(seen).toContain('Old news from wave two.');
  });
});

describe("Pebble's whistle gets a stage (D139 S7)", () => {
  beforeEach(() => {
    initSaves(new MemoryStore(), () => 1);
    setDialogueEnabled(true);
  });
  afterEach(() => {
    skipScene();
    closeScene();
  });

  it('plays full-screen at the base after the loophole, which stays a pausing panel', () => {
    loadDevSave('after_a2m6');
    updateActiveSave((s) => ({
      ...s,
      story: {
        ...s.story,
        seen: s.story.seen.filter((id) => id !== LOOPHOLE_SCENE && id !== WHISTLE_SCENE),
      },
    }));
    playBaseScenesIfDue();
    expect(dialogue.scene.value).toMatchObject({ sceneId: LOOPHOLE_SCENE, mode: 'panel' });
    skipScene();
    expect(dialogue.scene.value).toMatchObject({ sceneId: WHISTLE_SCENE, mode: 'fullscreen' });
    skipScene();
    expect(dialogue.scene.value).toBeNull();
    expect(activeSave()?.story.seen).toEqual(
      expect.arrayContaining([LOOPHOLE_SCENE, WHISTLE_SCENE]),
    );
  });
});
