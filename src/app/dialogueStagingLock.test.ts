// A locked staging (T614's hook, T613): a full-screen scene whose staging has a `lockMs` swallows
// Next and Esc for that long from its start, then lets them through. The lock is staging.ts's
// `stagingLockMs` (mocked here: the stinger's feed locked for 1 s).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { nextScene, setDialogueEnabled, skipScene, playScene } from './dialogue.ts';

// Shorter than the feed's 2.5 s lead-in, so Next past the lock still has a lead-in to cut.
const LOCK_MS = 1000;
const FEED_LEAD_IN_MS = 2500;

vi.mock(import('../ui/dialogue/staging.ts'), async (original) => ({
  ...(await original()),
  stagingLockMs: (kind) => (kind === 'rig9_feed' ? LOCK_MS : 0),
}));

const scene = () => dialogue.scene.value;

describe('a locked staging (T614)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
  });
  afterEach(() => {
    vi.advanceTimersByTime(LOCK_MS);
    while (skipScene());
    vi.useRealTimers();
  });

  it('carries its lock on the view', () => {
    playScene(SCENES['a1_m05_scene_stinger']!);
    expect(scene()?.staging?.lockMs).toBe(LOCK_MS);
  });

  it('swallows Next during the lock, then Next acts again', () => {
    playScene(SCENES['a1_m05_scene_stinger']!);
    const from = scene()!.staging!.from;
    nextScene();
    nextScene();
    // The lead-in wasn't cut short: the staging's clock is where it started.
    expect(scene()?.staging?.from).toBe(from);
    vi.advanceTimersByTime(LOCK_MS);
    nextScene();
    // Past the lock, Next cuts the lead-in (the clock jumps back).
    expect(scene()!.staging!.from).toBe(from + LOCK_MS - FEED_LEAD_IN_MS);
  });

  it('takes Esc during the lock without skipping, then Esc skips', () => {
    playScene(SCENES['a1_m05_scene_stinger']!);
    expect(skipScene()).toBe(true);
    expect(scene()).not.toBeNull();
    expect(scene()?.sceneId).toBe('a1_m05_scene_stinger');
    vi.advanceTimersByTime(LOCK_MS - 1);
    expect(skipScene()).toBe(true);
    expect(scene()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(skipScene()).toBe(true);
    expect(scene()).toBeNull();
  });
});
