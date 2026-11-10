// T229 (D096): QUILL's bank nudge reaches A1M2's never-spend player before the W7 wall. The nudge
// fires as a build phase opens with BANK_NUDGE_CREDITS banked (D059), or, after
// BANK_NUDGE_IDLE_PHASES build phases with no purchase, with any tower affordable. The headless
// run is par without its upgrades and without the W6 Thumper (act1.md § A1M2's never-spend player).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { referenceRunProfile, runConfig } from '../balance/profile.ts';
import { BARKS } from '../content/dialogue/index.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, runHeadless, type SimEvent, type SimState } from '../sim/index.ts';
import { HARNESS_TEST_TIMEOUT_MS } from '../balance/rules.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import {
  BANK_NUDGE_CREDITS,
  BANK_NUDGE_IDLE_PHASES,
  bindDialogue,
  setDialogueEnabled,
} from './dialogue.ts';
import { createHost } from './host.ts';
import { initSaves } from './save.ts';

type Ev = SimEvent<IdSpace>;
const NUDGE = BARKS.quill_bank_nudge_a1_10?.text ?? '<no nudge>';
/** A Thumper: the cheapest tower in A1M2's par loadout but the Rivet (100), and what helps W7. */
const THUMPER = 125;

describe('the bank nudge before A1M2’s W7 wall (T229)', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it("reaches the never-spend player at W7's countdown, with a Thumper's worth banked", () => {
    const content = compileContent(RAW_CONTENT);
    const map = content.maps.a1_m02;
    const alt = map.builds.altBuilds.no_upgrades!;
    // No upgrades and nothing bought after W4: the W6 Thumper is the one purchase it lacks.
    const build = { ...alt, steps: alt.steps.filter((s) => !(s.wave === 6 && s.kind === 'build')) };
    const lastBuy = Math.max(...build.steps.filter((s) => s.kind === 'build').map((s) => s.wave));
    expect(lastBuy).toBe(4);
    const run = runHeadless(
      runConfig(content, map, build, referenceRunProfile(map, content), 1),
      build,
    );
    // The wall is still there for this player (W7's Haulers), so the nudge must land before it.
    expect(run.outcome).toBe('lost');
    expect(run.waves[6]!.integrityLost).toBeGreaterThan(0);
    // W5's and W6's build phases pass with no purchase; W7's opens with a Thumper affordable but
    // short of the 250 rule, so only the idle rule reaches this player in time.
    expect(lastBuy + 1 + BANK_NUDGE_IDLE_PHASES).toBe(7);
    const bank = run.waves[6]!.bankAtPhase;
    expect(bank).toBeGreaterThanOrEqual(THUMPER);
    expect(bank).toBeLessThan(BANK_NUDGE_CREDITS);
  });
});

describe('the bank nudge in play (T229)', () => {
  let unbind: () => void = () => {};
  let state: SimState;
  let emit: (e: Ev) => void = () => {};
  /** Every line the comms panel showed since the last countdown. */
  let heard: string[] = [];
  let offHeard: () => void = () => {};
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

  /** Opens W2–`last`'s build phases with `credits` banked; returns whether the nudge played. */
  const idleUntil = (last: number, credits: number, buyAt?: number): boolean => {
    for (let w = 2; w <= last; w++) {
      state.credits = credits;
      countdown(w);
      if (nudged()) return true;
      if (w === buyAt) emit({ type: 'TowerUpgraded', uid: 1, tier: 2, cost: 80 });
    }
    return false;
  };

  it('fires after two build phases with no purchase, with a tower affordable', () => {
    // W4's purchase, then W5's and W6's phases idle: W7's countdown nudges.
    expect(idleUntil(6, 142, 4)).toBe(false);
    state.credits = 142;
    countdown(7);
    expect(nudged()).toBe(true);
  });

  it('waits while the player keeps buying, or while nothing is affordable', () => {
    expect(idleUntil(8, 142, 6)).toBe(false);
  });

  it('never for a bank that buys nothing', () => {
    expect(idleUntil(8, 99)).toBe(false);
  });

  it('still fires at 250 banked, purchases or not (D059)', () => {
    state.credits = BANK_NUDGE_CREDITS;
    countdown(2);
    expect(nudged()).toBe(true);
  });
});
