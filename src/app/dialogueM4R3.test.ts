// M4 review round 2's dialogue fixes (D135), built in round 3: a pausing panel never eats a comms
// line (S3: what was on the panel goes on from that line once it closes, its flags still saved),
// and a typed comms line's minimum read time before the next replaces it (S4), scaled at speed by
// D132's rule. Real-time holds run on fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARKS } from '../content/dialogue/index.ts';
import { defineScene } from '../content/dialogue/define.ts';
import type { Scene } from '../content/dialogue/types.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimEvent } from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { typeMs } from '../ui/dialogue/text.ts';
import { screen, speed } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import {
  advanceScene,
  bindDialogue,
  commsHoldMs,
  holdAtSpeedMs,
  minReadMs,
  playScene,
  RADIO_MIN_READ_MS,
  readMs,
  REPLY_BEAT_MS,
  setDialogueEnabled,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { activeSave, initSaves, newGame } from './save.ts';

type Ev = SimEvent<IdSpace>;
const noop = (): void => {};
const shown = (): string | null => dialogue.comms.value?.line.text ?? null;

/** A pausing panel (`pause: true`, D134) with one line. */
const pausing: Scene = {
  ...defineScene('a1_m01_cue_pause_test', [{ kind: 'line', speaker: 'quill', text: 'Hold on.' }]),
  pause: true,
};

describe('a pausing panel never eats a comms line (D135 S3)', () => {
  let unbind: () => void = noop;
  let host: Host<IdSpace>;
  const emit = (e: Ev): void => host.bus.emit(e);

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    newGame(1);
    screen.value = 'battle';
    setSpeed(1);
    host = createHost(createSim(battleConfig('a1_m01', 1, null)));
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
  });
  afterEach(() => {
    unbind();
    unbind = noop;
    vi.useRealTimers();
    screen.value = null;
  });

  it('a queued bark showing as a pause scene opens finishes after it closes', () => {
    // The first leak's bark queues (never dropped), so it shows now on the empty panel.
    emit({ type: 'EnemyLeaked', uid: 1, enemy: 'nibbler', leak: 1 });
    const seed = BARKS['quill_first_leak_a1_01']!.text;
    expect(shown()).toBe(seed);
    vi.advanceTimersByTime(500);
    playScene(pausing);
    expect(dialogue.scene.value?.mode).toBe('panel');
    expect(speed.value).toBe(0);
    expect(shown()).toBeNull();
    // However long the panel holds, the bark waits (no stale drop).
    vi.advanceTimersByTime(60_000);
    expect(shown()).toBeNull();
    advanceScene();
    expect(dialogue.scene.value).toBeNull();
    expect(speed.value).toBe(1);
    // Back, from its start, for its whole hold.
    expect(shown()).toBe(seed);
    vi.advanceTimersByTime(commsHoldMs(seed, undefined, false) - 1);
    expect(shown()).toBe(seed);
    vi.advanceTimersByTime(1);
    expect(shown()).toBeNull();
  });

  it('a scene cut mid-play goes on from the line it showed, and its flags still save', () => {
    const radio = defineScene('a1_m01_cue_radio_test', [
      { kind: 'line', speaker: 'quill', text: 'One.' },
      { kind: 'set', flag: 'peeker_poked', value: true },
      { kind: 'line', speaker: 'quill', text: 'Two.' },
      { kind: 'line', speaker: 'quill', text: 'Three.' },
    ]);
    playScene(radio);
    expect(shown()).toBe('One.');
    vi.advanceTimersByTime(commsHoldMs('One.', undefined, false));
    expect(shown()).toBe('Two.');
    playScene(pausing);
    expect(shown()).toBeNull();
    advanceScene();
    // "Two." again (not "One.", not skipped to "Three.").
    expect(shown()).toBe('Two.');
    vi.advanceTimersByTime(commsHoldMs('Two.', undefined, false));
    expect(shown()).toBe('Three.');
    vi.advanceTimersByTime(commsHoldMs('Three.', undefined, false));
    expect(shown()).toBeNull();
    expect(activeSave()?.story.flags.peeker_poked).toBe(true);
    expect(activeSave()?.story.seen).toContain(radio.id);
  });

  it("a countdown's radio cut by a pause scene isn't dropped as its wave starts (it was on the panel)", () => {
    const radio = defineScene('a1_m01_cue_radio_test', [
      { kind: 'line', speaker: 'quill', text: 'Wave talk.' },
    ]);
    playScene(radio, { radioWave: 3 });
    expect(shown()).toBe('Wave talk.');
    playScene(pausing);
    emit({ type: 'WaveStarted', wave: 3, early: false, bonus: 0 });
    advanceScene();
    expect(shown()).toBe('Wave talk.');
  });
});

describe('a comms line’s minimum read time (D135 S4)', () => {
  it('is 1.5 s plus 45 ms a character once typed, before a queued line replaces it', () => {
    expect(minReadMs('')).toBe(1500);
    expect(minReadMs('x'.repeat(10))).toBe(1950);
    // Ves'thara's 55% line (93 characters) holds its typing and 1.5 s + 93 × 45 ms.
    const strike =
      'I do not strike your homes, Counter. Look at what I strike. Ask yourself why it bleeds light.';
    expect(strike).toHaveLength(93);
    const ms = commsHoldMs(strike, undefined, false);
    expect(ms).toBe(typeMs(strike) + 1500 + 93 * 45);
    expect(ms).toBeGreaterThan(readMs(strike));
    // A short line keeps its 4 s reading time; a reply keeps D028's beat (it stays up as the cue).
    expect(commsHoldMs('Hi.', undefined, false)).toBe(4000);
    expect(commsHoldMs(strike, undefined, true)).toBe(typeMs(strike) + REPLY_BEAT_MS);
    // A timed line keeps its own length.
    expect(commsHoldMs(strike, 2, false)).toBe(2000);
  });

  it("still scales at speed by D132's rule: never below 1.5 s once typed, never over 1×", () => {
    const line = 'x'.repeat(93);
    const ms = commsHoldMs(line, undefined, false);
    const at2 = holdAtSpeedMs(ms, line, 2);
    expect(at2).toBe(Math.max(ms / 2, typeMs(line) + RADIO_MIN_READ_MS));
    expect(at2 - typeMs(line)).toBeGreaterThanOrEqual(RADIO_MIN_READ_MS);
    expect(at2).toBeLessThanOrEqual(ms);
  });
});
