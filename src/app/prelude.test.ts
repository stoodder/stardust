// The prelude's route and its systems (T1001; core-loop.md § 1, § 6.1): New game → the prelude →
// the intake, once per new campaign (held as seen in memory, then `story.seen` as the intake is
// signed), never with dialogue off; the staging's 700 ms start lock, Skip and Esc ending the whole
// scene, and the lines moving on by themselves.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../meta/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { autoAdvanceHoldMs } from '../ui/dialogue/staging.ts';
import { typeMs } from '../ui/dialogue/text.ts';
import { PRELUDE_LOCK_MS, PRELUDE_SCENE, preludeLeadInMs } from '../ui/screens/prelude.ts';
import { intakeRises, registerPreludeUi } from '../ui/screens/preludeState.ts';
import { nextScene, setDialogueEnabled, skipScene } from './dialogue.ts';
import { cancelIntake, newGame, setNavigator, submitIntake, watchArrival } from './navigation.ts';
import { holdPreludeSeen, preludeBeforeIntake, setPreludeEnabled } from './prelude.ts';
import { holdNewGame, intakeMode, setIntakeEnabled } from './profile.ts';
import type { Router } from './router.ts';
import { activeSave, closeSession, initSaves } from './save.ts';

// The stage's chunk draws nothing here: registering a stub stands in for its import.
vi.mock(import('./acts/preludeUi.ts'), () => {
  registerPreludeUi({ PreludeStage: () => null, backdrop: () => null });
  return {};
});

const none = (): Promise<void> => Promise.resolve();

/** A router that only records where it was sent. */
function fakeRouter(): { router: Router; went: string[] } {
  const went: string[] = [];
  const router: Router = {
    battle: null,
    goto: (id) => {
      went.push(id);
      return Promise.resolve();
    },
    play: none,
    retry: none,
    retryFromCheckpoint: none,
    resumePending: none,
    endRun: none,
    flushResults: none,
    abandon: () => {},
    presentResults: none,
    closeSettings: none,
  };
  return { router, went };
}

const scene = () => dialogue.scene.value;

/** Lets the chunk's import and the route's promises settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    // oxlint-disable-next-line no-await-in-loop -- each tick lets the next promise in the chain run
    await vi.advanceTimersByTimeAsync(0);
  }
}

let went: string[];

beforeEach(() => {
  vi.useFakeTimers();
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  closeSession();
  setIntakeEnabled(true);
  setDialogueEnabled(true);
  setPreludeEnabled(true);
  holdPreludeSeen(false);
  holdNewGame(null);
  intakeRises.value = false;
  const f = fakeRouter();
  went = f.went;
  setNavigator(f.router);
});

afterEach(() => {
  vi.advanceTimersByTime(PRELUDE_LOCK_MS);
  while (skipScene());
  setNavigator(null);
  vi.useRealTimers();
});

describe('the route: New game → the prelude → the intake', () => {
  it('plays the prelude before the intake, then opens the intake as it ends (it rises)', async () => {
    expect(newGame(1)).toEqual({ ok: true });
    await settle();
    expect(scene()?.sceneId).toBe(PRELUDE_SCENE);
    expect(scene()?.mode).toBe('fullscreen');
    expect(scene()?.staging?.kind).toBe('prelude');
    expect(went).toEqual([]);
    vi.advanceTimersByTime(PRELUDE_LOCK_MS);
    expect(skipScene()).toBe(true);
    await settle();
    expect(scene()).toBeNull();
    expect(went).toEqual(['intake']);
    expect(intakeMode()).toEqual({ kind: 'new', slot: 1 });
    expect(intakeRises.value).toBe(true);
    // Nothing was saved: the save is made as the form is signed.
    expect(activeSave()).toBeNull();
  });

  it('takes a second Start shift while its chunk loads as the same press (no race)', async () => {
    expect(newGame(1)).toEqual({ ok: true });
    // Pressed again before the stage's chunk has loaded: nothing more happens.
    expect(newGame(1)).toEqual({ ok: true });
    await settle();
    expect(scene()?.sceneId).toBe(PRELUDE_SCENE);
    expect(went).toEqual([]);
    vi.advanceTimersByTime(PRELUDE_LOCK_MS);
    skipScene();
    await settle();
    expect(went).toEqual(['intake']);
  });

  it('holds it as seen: Back to the Title and Start shift again goes straight to the intake', async () => {
    newGame(1);
    await settle();
    vi.advanceTimersByTime(PRELUDE_LOCK_MS);
    skipScene();
    await settle();
    cancelIntake();
    expect(preludeBeforeIntake()).toBe(false);
    went.length = 0;
    newGame(1);
    await settle();
    expect(scene()).toBeNull();
    expect(went).toEqual(['intake']);
  });

  it('writes the prelude to story.seen as the intake is signed, and the next campaign plays it', async () => {
    newGame(1);
    await settle();
    vi.advanceTimersByTime(PRELUDE_LOCK_MS);
    skipScene();
    await settle();
    expect(submitIntake({ name: 'Ada', address: 'tech', arrival: 'lettuce' }).ok).toBe(true);
    expect(activeSave()?.story.seen).toContain(PRELUDE_SCENE);
    // A second new campaign (another slot) is a new arrival.
    expect(preludeBeforeIntake()).toBe(true);
  });

  it("doesn't play with dialogue off, with the prelude off, or without the intake", async () => {
    setDialogueEnabled(false);
    newGame(1);
    await settle();
    expect(scene()).toBeNull();
    expect(went).toEqual(['intake']);
    setDialogueEnabled(true);
    setPreludeEnabled(false);
    holdNewGame(null);
    newGame(2);
    await settle();
    expect(scene()).toBeNull();
    expect(went).toEqual(['intake', 'intake']);
    setPreludeEnabled(true);
    setIntakeEnabled(false);
    expect(newGame(3).ok).toBe(true);
    await settle();
    // No intake: a new game starts its first map (router.play), no prelude either.
    expect(scene()).toBeNull();
    expect(went).toEqual(['intake', 'intake']);
  });

  it('replays from Settings over the screen in play, saving nothing and going nowhere', async () => {
    watchArrival();
    await settle();
    expect(scene()?.sceneId).toBe(PRELUDE_SCENE);
    vi.advanceTimersByTime(PRELUDE_LOCK_MS);
    skipScene();
    await settle();
    expect(scene()).toBeNull();
    expect(went).toEqual([]);
    expect(intakeRises.value).toBe(false);
    // A replay doesn't hold it as seen.
    expect(preludeBeforeIntake()).toBe(true);
  });
});

describe('the staging: its start lock, Skip, and the lines moving on', () => {
  it('takes no Next or Esc for its first 700 ms, then Esc ends the whole scene', async () => {
    watchArrival();
    await settle();
    const line = scene()?.line;
    expect(skipScene()).toBe(true);
    nextScene();
    expect(scene()?.sceneId).toBe(PRELUDE_SCENE);
    expect(scene()?.line).toBe(line);
    vi.advanceTimersByTime(PRELUDE_LOCK_MS - 1);
    expect(skipScene()).toBe(true);
    expect(scene()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(skipScene()).toBe(true);
    expect(scene()).toBeNull();
  });

  it('moves each line on by itself once typed, after its hold', async () => {
    watchArrival();
    await settle();
    const first = scene()!.line!;
    expect(first.label).toBe('p_ad');
    // The lead-in, the typing, then the hold (1.5 s plus 30 ms a character).
    const due = preludeLeadInMs(false) + typeMs(first.text) + autoAdvanceHoldMs(first.text);
    vi.advanceTimersByTime(due - 5);
    expect(scene()!.line).toBe(first);
    vi.advanceTimersByTime(10);
    expect(scene()!.line).not.toBe(first);
    expect(scene()!.transcript.at(-1)?.text).toBe(first.text);
  });

  it('plays itself out to the end, the silence included, and ends', async () => {
    watchArrival();
    await settle();
    const labels: string[] = [];
    for (let i = 0; i < 400 && scene() !== null; i++) {
      const l = scene()!.line?.label;
      if (l !== undefined && labels.at(-1) !== l) labels.push(l);
      vi.advanceTimersByTime(500);
    }
    expect(scene()).toBeNull();
    expect(labels.at(0)).toBe('p_ad');
    expect(labels.at(-1)).toBe('p_form');
  });
});
