// A3M3 on the radio (T622; act3.md § A3M3, *Barks*): a refugee hushed on the road plays Bricks's
// `ally_hushed` ("Got through. Keep 'em coming."), and the Holdout's low mark (story/meters.ts
// `holdoutLow`: half the losses its floor allows) plays his `low_integrity` ("Steady. Steady now.")
// once; an Escort keeps its own mark (`escortLow`). The last name tag goes on the newest turret as
// its cue plays. Real-time holds run on fake timers; sim time is the sim's tick.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARKS } from '../content/dialogue/index.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimEvent, type SimState } from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { hud, screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import { bindDialogue, setDialogueEnabled, skipScene } from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { initSaves } from './save.ts';

vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

type Ev = SimEvent<IdSpace>;
const noop = (): void => {};
const shown = (): string | null => dialogue.comms.value?.line.text ?? null;
const bark = (id: string): string => BARKS[id]?.text ?? `<no bark ${id}>`;
const drain = (): void => {
  vi.advanceTimersByTime(30_000);
};
const lost = (uid: number): Ev => ({ type: 'RefugeeLost', uid, cause: 'exit', enemyUid: 1 });

/** Binds the radio to a fresh battle on `map`; returns the host and its state. */
function bind(map: string): { host: Host<IdSpace>; state: SimState; unbind: () => void } {
  const sim = createSim(battleConfig(map, 1, null));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  const state = sim.state as unknown as SimState;
  state.credits = 0;
  const host = createHost(sim);
  const unbind = bindDialogue(host, { briefing: false, newTowers: [] });
  drain();
  return { host, state, unbind };
}

describe('A3M3 on the radio (T622)', () => {
  let unbind: () => void = noop;
  let host: Host<IdSpace>;
  let state: SimState;
  const emit = (e: Ev): void => host.bus.emit(e);
  const at = (sec: number): void => {
    state.tick = Math.round(sec * 60);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    setSpeed(1);
    ({ host, state, unbind } = bind('a3_m03'));
  });
  afterEach(() => {
    unbind();
    unbind = noop;
    skipScene();
    vi.useRealTimers();
    screen.value = null;
  });

  it("Bricks marks a hushed refugee: 'Got through. Keep 'em coming.'", () => {
    at(100);
    emit({
      type: 'Hushed',
      uid: 1,
      enemy: 'mote',
      victim: 200,
      victimEnemy: null,
      victimAlly: 'refugee',
      x: 0,
      y: 0,
    });
    expect(shown()).toBe(bark('bricks_ally_hushed_a3_03'));
  });

  it("Bricks's 'Steady. Steady now.' fires once, as a quarter of the refugees are lost", () => {
    expect(state.objective).toBe('holdout');
    expect(state.refugeeTotal).toBe(36);
    at(100);
    state.stats.refugeesLost = 8; // one short of 36 × (1 − 0.5) / 2
    emit(lost(300));
    expect(shown()).toBeNull();
    at(110);
    state.stats.refugeesLost = 9;
    emit(lost(301));
    expect(shown()).toBe(bark('bricks_low_integrity_a3_03'));
    expect(shown()).toBe('Steady. Steady now.');
    drain();
    at(130);
    state.stats.refugeesLost = 10;
    emit(lost(302));
    expect(shown()).toBeNull();
  });

  it("puts the last name tag, {name} resolved, on the newest turret as W10's cue plays", () => {
    emit({ type: 'TowerBuilt', uid: 7, tower: 'thumper', tile: [8, 3], cost: 125 });
    emit({ type: 'TowerBuilt', uid: 8, tower: 'mindspike', tile: [12, 7], cost: 150 });
    at(400);
    emit({ type: 'ScriptCue', cueId: 'a3_m03_cue_name_tag' });
    expect(hud.nameTag.value?.uid).toBe(8);
    expect(hud.nameTag.value?.text).not.toContain('{');
    expect(shown()).toBe("This one's yours. Good turret. Doesn't quit.");
  });
});

describe('the Holdout mark leaves an Escort alone (T622)', () => {
  let unbind: () => void = noop;
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

  it("A3M1's Escort reads its own mark (maxLost), not the Holdout's share of the run", () => {
    const b = bind('a3_m01');
    unbind = b.unbind;
    expect(b.state.objective).toBe('escort');
    // A quarter of the run's 24 lost (6) is the Holdout's mark; A3M1's maxLost 13 isn't near.
    b.state.stats.refugeesLost = 6;
    b.state.tick = 6000;
    b.host.bus.emit(lost(300));
    expect(shown()).toBeNull();
  });
});
