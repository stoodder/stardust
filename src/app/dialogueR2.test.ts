// M3 review round 2 (D098), dialogue in play: the Quiet Wave's silence for barks (S1), no bank
// nudge before it (S2), the boss clear's bark (S3), Bricks's C1 reaction on the radio as A1M5 is
// won (S4), silences in full-screen scenes moving on by themselves (S5), the act-wide jingle only
// after a clean wave (S8), and the results fixture saving nothing (S10). Real-time holds run on
// fake timers; sim time is the sim's tick.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARKS, SCENES } from '../content/dialogue/index.ts';
import { SHARED_BARKS } from '../content/dialogue/barks/index.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimEvent, type SimState } from '../sim/index.ts';
import type { FlagRuleStats } from '../story/flags.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import {
  advanceScene,
  advancesItself,
  BANK_NUDGE_CREDITS,
  bindDialogue,
  endLineMs,
  playMapEndLines,
  playScene,
  setDialogueEnabled,
  skipScene,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { RESULTS_DELAY_MS, RESULTS_HOLD_MAX_MS, resultsHoldMs } from './router.ts';
import { playInOrder } from './runFlow.ts';
import { holdLines } from './runResult.ts';
import { activeSave, initSaves, newGame } from './save.ts';

// The router's battle and backdrop are stubbed: these paths never draw (router.test.ts).
vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

type Ev = SimEvent<IdSpace>;
const noop = (): void => {};

function battle(mapId: string): { host: Host<IdSpace>; state: SimState } {
  const sim = createSim(battleConfig(mapId, 1, null));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  const state = sim.state as unknown as SimState;
  return { host: createHost(sim), state };
}

const shown = (): string | null => dialogue.comms.value?.line.text ?? null;
const bark = (id: string): string => BARKS[id]?.text ?? `<no bark ${id}>`;
const JINGLES = new Set(
  SHARED_BARKS.filter((b) => b.trigger.on === 'wave_cleared').map((b) => b.text),
);
const cleared = (wave: number): Ev => ({ type: 'WaveCleared', wave, bonus: 0 });
const started = (wave: number): Ev => ({ type: 'WaveStarted', wave, early: false, bonus: 0 });
const countdown = (wave: number): Ev => ({ type: 'CountdownStarted', wave, ticks: 1500 });

/** Lets the panel play out (every line's hold). */
function drain(): void {
  vi.advanceTimersByTime(30_000);
}

/** The speakers and words of A1M5's map-end lines for a run with `stats` that ended `outcome`. */
function endLines(stats: FlagRuleStats, outcome: 'won' | 'lost', mapId = 'a1_m05') {
  return holdLines({ mapId, stats }, outcome).map((l) => [l.speaker, l.text]);
}

/** A1M5's run stats with the Quiet Wave's seven spawned and `leaked` of them leaked (Thrum first). */
function quietStats(leaked: number): FlagRuleStats {
  const tags = { quiet_wave: 0, youngling: 0, fleeing: 0, medal_exempt: 0 };
  const youngLeaked = Math.max(0, leaked - 1);
  return {
    holdFireUses: 0,
    holdFireTicks: 0,
    integrityLost: 0,
    towersBuilt: 0,
    creditsSpent: 0,
    abilityUses: 0,
    tagSpawned: { ...tags, quiet_wave: 7, youngling: 6 },
    tagLeaked: { ...tags, quiet_wave: leaked, youngling: youngLeaked },
    tagKilled: { ...tags, quiet_wave: 7 - leaked, youngling: 6 - youngLeaked },
  };
}

describe('the battle radio, round 2 (D098)', () => {
  let unbind: () => void = noop;
  let b: ReturnType<typeof battle>;
  const bind = (mapId: string): void => {
    b = battle(mapId);
    b.state.credits = 0;
    unbind = bindDialogue(b.host, { briefing: false, newTowers: [] });
  };
  const emit = (e: Ev): void => b.host.bus.emit(e);
  const at = (sec: number): void => {
    b.state.tick = Math.round(sec * 60);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    setSpeed(1);
  });
  afterEach(() => {
    unbind();
    unbind = noop;
    vi.useRealTimers();
    screen.value = null;
  });

  it('S1: offers no bark from the Quiet Wave on, but its cue and Bricks plays', () => {
    bind('a1_m05');
    // Before it: a clean clear has its line (with a turret up: Bricks names it, a scene).
    emit({ type: 'TowerBuilt', uid: 8, tower: 'rivet', tile: [0, 0], cost: 0 });
    at(400);
    emit(cleared(8));
    expect(shown()).not.toBeNull();
    drain();
    // W10 starts: its cue plays (a script's scene), and no bark comes after it.
    at(500);
    emit(started(10));
    emit({ type: 'ScriptCue', cueId: 'a1_m05_cue_quiet_wave' });
    expect(shown()).toBe('Clear it, Sprout.');
    drain();
    expect(shown()).toBeNull();
    at(510);
    emit({
      type: 'EnemyDied',
      uid: 1,
      enemy: 'nibbler',
      bounty: 0,
      killer: { kind: 'tower', uid: 9 },
      x: 0,
      y: 0,
    });
    emit({ type: 'TowerBuilt', uid: 9, tower: 'rivet', tile: [0, 0], cost: 0 });
    emit({ type: 'EnemyLeaked', uid: 2, enemy: 'elder', leak: 2 });
    expect(shown()).toBeNull();
    at(530);
    emit(cleared(10));
    expect(shown()).toBeNull();
    drain();
    // Bricks's own Quiet Wave line still plays.
    at(540);
    emit({ type: 'NotFiringAtSkitterkin', wave: 10 });
    expect(shown()).toBe(bark('bricks_not_firing_a1_05'));
  });

  it("T330: Bricks's W10 line waits for W10: a hold in an earlier wave doesn't spend it", () => {
    bind('a1_m05');
    at(200);
    emit({ type: 'NotFiringAtSkitterkin', wave: 4 });
    expect(shown()).not.toBe(bark('bricks_not_firing_a1_05'));
    drain();
    at(540);
    emit({ type: 'NotFiringAtSkitterkin', wave: 10 });
    expect(shown()).toBe(bark('bricks_not_firing_a1_05'));
  });

  it("S2: never nudges the bank at the Quiet Wave's countdown", () => {
    bind('a1_m05');
    b.state.credits = BANK_NUDGE_CREDITS + 500;
    at(500);
    emit(countdown(10));
    drain();
    expect(shown()).toBeNull();
    // Any other countdown with that bank nudges.
    unbind();
    bind('a1_m05');
    b.state.credits = BANK_NUDGE_CREDITS + 500;
    at(300);
    emit(countdown(6));
    expect(shown()).toMatch(/^Unspent budget detected!/);
  });

  it("S3: the boss wave's clear plays QUILL's drive-off line", () => {
    bind('a1_m05');
    at(497);
    emit(cleared(9));
    expect(shown()).toBe(bark('quill_wave_cleared_boss_a1_05'));
  });

  it('S8: the jingle jokes play after a clean wave only', () => {
    bind('a1_m03');
    at(100);
    emit(cleared(4));
    expect(JINGLES.has(shown() ?? '')).toBe(true);
    unbind();
    bind('a1_m03');
    at(100);
    emit({ type: 'EnemySpawned', uid: 7, enemy: 'chonk', route: 'road', wave: 4 });
    emit({ type: 'EnemyLeaked', uid: 7, enemy: 'chonk', leak: 2 });
    drain();
    at(120);
    emit(cleared(4));
    expect(JINGLES.has(shown() ?? '')).toBe(false);
  });

  it("S4: plays the map's end lines on the panel now, each for its typing and a beat", () => {
    bind('a1_m05');
    at(400);
    emit(cleared(8)); // something on the panel: the end lines cut it
    const lines = holdLines({ mapId: 'a1_m05', stats: quietStats(7) }, 'won');
    expect(lines.map((l) => l.text)).toEqual(['...Sprout.', 'Yeah. Okay.']);
    const ms = playMapEndLines(lines);
    expect(ms).toBe(endLineMs('...Sprout.') + endLineMs('Yeah. Okay.'));
    expect(shown()).toBe('...Sprout.');
    vi.advanceTimersByTime(endLineMs('...Sprout.'));
    expect(shown()).toBe('Yeah. Okay.');
    vi.advanceTimersByTime(endLineMs('Yeah. Okay.'));
    expect(shown()).toBeNull();
    // The hold waits for them (under its cap).
    expect(resultsHoldMs(ms)).toBe(ms);
  });

  it('S4: plays nothing with dialogue off or outside a battle', () => {
    const lines = holdLines({ mapId: 'a1_m05', stats: quietStats(0) }, 'won');
    expect(playMapEndLines(lines)).toBe(0);
    bind('a1_m05');
    setDialogueEnabled(false);
    expect(playMapEndLines(lines)).toBe(0);
    setDialogueEnabled(true);
  });
});

describe("Bricks's C1 reaction as A1M5 is won (S4)", () => {
  it('picks this run’s branch: spared, cleared; nothing on a loss or elsewhere', () => {
    expect(endLines(quietStats(7), 'won')).toEqual([
      ['bricks', '...Sprout.'],
      ['bricks', 'Yeah. Okay.'],
    ]);
    expect(endLines(quietStats(0), 'won')).toEqual([['bricks', 'Good work.']]);
    expect(endLines(quietStats(7), 'lost')).toEqual([]);
    expect(endLines(quietStats(0), 'won', 'a1_m04')).toEqual([]);
  });

  it('holds the frozen battle at least RESULTS_DELAY_MS, at most RESULTS_HOLD_MAX_MS', () => {
    expect(resultsHoldMs(0)).toBe(RESULTS_DELAY_MS);
    expect(resultsHoldMs(3000)).toBe(3000);
    expect(resultsHoldMs(60_000)).toBe(RESULTS_HOLD_MAX_MS);
  });
});

describe('silences in full-screen scenes (S5)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
  });
  afterEach(() => {
    while (skipScene());
    vi.useRealTimers();
  });

  it('move on by themselves: a full-screen or pausing-panel silence, never one shown whole', () => {
    expect(advancesItself('fullscreen', { silence: true }, false)).toBe(true);
    expect(advancesItself('fullscreen', { silence: false }, false)).toBe(false);
    expect(advancesItself('fullscreen', { silence: true }, true)).toBe(false);
    // A pausing panel's silence too (T613: Sterling's held beat in A3M2's Clean Exit cue).
    expect(advancesItself('panel', { silence: true }, false)).toBe(true);
    expect(advancesItself('briefing', { silence: true }, false)).toBe(false);
    expect(advancesItself('fullscreen', null, false)).toBe(false);
  });

  it("the stinger's held beat holds its 2 s and goes on to QUILL", () => {
    playScene(SCENES['a1_m05_scene_stinger']!);
    advanceScene(); // past the caption
    expect(dialogue.scene.value?.line?.silence).toBe(true);
    vi.advanceTimersByTime(1999);
    expect(dialogue.scene.value?.line?.silence).toBe(true);
    vi.advanceTimersByTime(1);
    expect(dialogue.scene.value?.line?.text).toBe('Probably a smudge! Logging it.');
    // Nothing further moves by itself.
    vi.advanceTimersByTime(10_000);
    expect(dialogue.scene.value?.line?.text).toBe('Probably a smudge! Logging it.');
  });

  it('Esc still skips past a silence, and its timer dies with it', () => {
    playScene(SCENES['a1_m05_scene_stinger']!);
    advanceScene();
    expect(skipScene()).toBe(true);
    expect(dialogue.scene.value).toBeNull();
    vi.advanceTimersByTime(5000);
    expect(dialogue.scene.value).toBeNull();
  });
});

describe('the results fixture saves nothing (S10, C-L2)', () => {
  afterEach(() => {
    while (skipScene());
  });

  it("plays a flow scene without marking it seen when it mustn't record", () => {
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    newGame(1);
    const party = SCENES['a1_m05_scene_party']!;
    playInOrder([party], noop, false);
    expect(skipScene()).toBe(true);
    expect(activeSave()?.story.seen).not.toContain('a1_m05_scene_party');
    playInOrder([party], noop);
    expect(skipScene()).toBe(true);
    expect(activeSave()?.story.seen).toContain('a1_m05_scene_party');
  });
});
