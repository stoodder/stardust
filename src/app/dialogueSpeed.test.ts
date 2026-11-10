// The radio at 2× (D126, T430b): comms holds scale by the game speed (never below a readable beat
// once typed), and a countdown's radio still queued when its wave starts is dropped unplayed.
// Over A1M1's real radio; real-time holds run on fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimEvent, type SimState } from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { typeMs } from '../ui/dialogue/text.ts';
import { screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import {
  bindDialogue,
  commsHoldMs,
  holdAtSpeedMs,
  RADIO_MIN_READ_MS,
  REPLY_BEAT_MS,
  setDialogueEnabled,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { initSaves } from './save.ts';

type Ev = SimEvent<IdSpace>;

const shown = (): string | null => dialogue.comms.value?.line.text ?? null;
const countdown = (wave: number): Ev => ({ type: 'CountdownStarted', wave, ticks: 1500 });
const started = (wave: number): Ev => ({ type: 'WaveStarted', wave, early: false, bonus: 0 });
const lines = (id: string): string[] =>
  (SCENES[id]?.nodes ?? []).flatMap((n) => (n.kind === 'line' ? [n.text] : []));
const hold = (text: string): number => commsHoldMs(text, undefined, false);

describe('holdAtSpeedMs (D126)', () => {
  it('holds as written at 1× or paused, and halves at 2×', () => {
    expect(holdAtSpeedMs(8000, 'hello', 1)).toBe(8000);
    expect(holdAtSpeedMs(8000, 'hello', 0)).toBe(8000);
    expect(holdAtSpeedMs(8000, 'hello', 2)).toBe(4000);
  });

  it('keeps a line whole on screen at least 1.5 s at 2×, and never longer than at 1×', () => {
    const long = 'x'.repeat(110); // types in 2.75 s
    const ms = commsHoldMs(long, undefined, true); // a reply: typing + the 2.5 s beat
    expect(holdAtSpeedMs(ms, long, 2)).toBe(typeMs(long) + RADIO_MIN_READ_MS);
    // A short silence keeps its own length.
    expect(holdAtSpeedMs(1000, '', 2)).toBe(1000);
    expect(holdAtSpeedMs(4000, '', 2)).toBe(2000);
  });
});

describe('the radio at 2× (D126)', () => {
  let unbind: () => void = () => {};
  let host: Host<IdSpace>;
  const emit = (e: Ev): void => host.bus.emit(e);

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    const sim = createSim(battleConfig('a1_m01', 1, null));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
    (sim.state as unknown as SimState).credits = 0; // no bank nudge
    host = createHost(sim);
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
  });
  afterEach(() => {
    unbind();
    setSpeed(1);
    vi.useRealTimers();
    screen.value = null;
  });

  it("plays a countdown's radio on halved holds", () => {
    setSpeed(2);
    const [setup, punchline, answer] = lines('a1_m01_w06');
    emit(countdown(6));
    expect(shown()).toBe(setup);
    vi.advanceTimersByTime(holdAtSpeedMs(hold(setup!), setup!, 2));
    expect(shown()).toBe(punchline);
    const reply = typeMs(punchline!) + REPLY_BEAT_MS;
    expect(holdAtSpeedMs(reply, punchline!, 2)).toBeLessThan(reply);
    vi.advanceTimersByTime(holdAtSpeedMs(reply, punchline!, 2));
    expect(shown()).toBe(answer);
  });

  it('drops a radio scene still queued when its wave starts; the one on screen plays on', () => {
    emit(countdown(4)); // Goldie
    const goldie = shown()!;
    emit(countdown(3)); // QUILL's Crossfire line, queued behind her
    emit(started(3));
    expect(shown()).toBe(goldie);
    vi.advanceTimersByTime(hold(goldie));
    expect(shown()).toBeNull(); // W3's line never played late
  });

  it('keeps a queued radio scene whose wave has not started', () => {
    emit(countdown(4));
    const goldie = shown()!;
    emit(countdown(3));
    emit(started(2));
    vi.advanceTimersByTime(hold(goldie));
    expect(shown()).toMatch(/^New hardware!/);
  });
});
