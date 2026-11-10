// T229 (D096): QUILL's bank nudge in play. It fires as a build phase opens with BANK_NUDGE_CREDITS
// banked (D059), or, after BANK_NUDGE_IDLE_PHASES build phases with no purchase, with the
// loadout's cheapest tower affordable. That it reaches A1M2's never-spend player before the W7
// wall is src/balance/a1m2Nudge.test.ts's.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARKS } from '../content/dialogue/index.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimEvent, type SimState } from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import { BANK_NUDGE_CREDITS, bindDialogue, setDialogueEnabled } from './dialogue.ts';
import { createHost } from './host.ts';
import { initSaves } from './save.ts';

type Ev = SimEvent<IdSpace>;
const noop = (): void => {};
const NUDGE = BARKS.quill_bank_nudge_a1_10?.text ?? '<no nudge>';

describe('the bank nudge in play (T229)', () => {
  let unbind = noop;
  let state: SimState;
  let emit: (e: Ev) => void = noop;
  /** Every line the comms panel showed since the last countdown. */
  let heard: string[] = [];
  let offHeard = noop;
  /** Opens wave `wave`'s build phase and lets its radio (and any nudge after it) play out. */
  const countdown = (wave: number): void => {
    heard = [];
    state.tick = wave * 60 * 60;
    emit({ type: 'CountdownStarted', wave, ticks: 1500 });
    vi.advanceTimersByTime(30_000);
  };
  const nudged = (): boolean => heard.includes(NUDGE);

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    setSpeed(1);
    const sim = createSim(battleConfig('a1_m02', 1, null));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
    state = sim.state as unknown as SimState;
    const host = createHost(sim);
    emit = (e) => host.bus.emit(e);
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
    offHeard = dialogue.comms.subscribe((v) => {
      if (v !== null) heard.push(v.line.text);
    });
  });
  afterEach(() => {
    offHeard();
    unbind();
    vi.useRealTimers();
    screen.value = null;
  });

  /**
   * Opens W2–`last`'s build phases with `credits` banked, buying something in each phase listed
   * in `buys`; returns the wave whose countdown nudged, or null.
   */
  const playUntil = (last: number, credits: number, buys: readonly number[]): number | null => {
    for (let w = 2; w <= last; w++) {
      state.credits = credits;
      countdown(w);
      if (nudged()) return w;
      if (buys.includes(w)) emit({ type: 'TowerUpgraded', uid: 1, tier: 2, cost: 80 });
    }
    return null;
  };

  it('fires after two build phases with no purchase, with a tower affordable', () => {
    // Purchases through W4's phase; W5's and W6's pass idle: W7's countdown nudges.
    expect(playUntil(8, 142, [2, 3, 4])).toBe(7);
  });

  it('waits while the player keeps buying', () => {
    expect(playUntil(8, 142, [2, 3, 4, 5, 6, 7, 8])).toBeNull();
  });

  it('never for a bank that buys nothing', () => {
    expect(playUntil(8, 60, [])).toBeNull();
  });

  it('still fires at 250 banked, purchases or not (D059)', () => {
    state.credits = BANK_NUDGE_CREDITS;
    countdown(2);
    expect(nudged()).toBe(true);
  });
});
