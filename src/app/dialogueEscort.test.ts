// The escort on the radio (T513; act2.md § A2M5, *Barks*): a refugee hushed on the road plays
// Bricks's `ally_hushed` ("Lost one."), naming its kind, and on an Escort the meter's
// `low_integrity` reads the refugees lost against `maxLost` (QUILL's "Too many on the road.").
// Real-time holds run on fake timers; sim time is the sim's tick.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARKS } from '../content/dialogue/index.ts';
import type { AllyKind, IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimEvent, type SimState } from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { hud, screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import { bindDialogue, escortLow, isHushableAlly, setDialogueEnabled } from './dialogue.ts';
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

/** A Mote hushing route ally `victim` of `kind`. */
const hushAlly = (victim: number, kind: 'refugee' | 'militia'): Ev => ({
  type: 'Hushed',
  uid: 1,
  enemy: 'mote',
  victim,
  victimEnemy: null,
  victimAlly: kind,
  x: 0,
  y: 0,
});
const lost = (uid: number): Ev => ({ type: 'RefugeeLost', uid, cause: 'hushed', enemyUid: 1 });

describe('the rules', () => {
  it('names only the route allies a hush can take as ally_hushed kinds', () => {
    const kinds: readonly AllyKind[] = ['refugee', 'bearer', 'singer'];
    expect(kinds.every((k) => isHushableAlly(k))).toBe(true);
    expect(isHushableAlly('militia')).toBe(false);
    expect(isHushableAlly('ward')).toBe(false);
    expect(isHushableAlly(undefined)).toBe(false);
  });

  it("is low on an Escort's meter with a quarter of maxLost or less left", () => {
    expect([0, 8, 9, 12, 13].map((n) => escortLow(n, 12))).toEqual([
      false,
      false,
      true,
      true,
      true,
    ]);
    expect(escortLow(1, 0)).toBe(true);
    expect(escortLow(50, null)).toBe(false);
  });
});

describe('A2M5 on the radio', () => {
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
    const sim = createSim(battleConfig('a2_m05', 1, null));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
    state = sim.state as unknown as SimState;
    state.credits = 0;
    host = createHost(sim);
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
    drain();
  });
  afterEach(() => {
    unbind();
    unbind = noop;
    vi.useRealTimers();
    screen.value = null;
  });

  it('Bricks marks a hushed refugee (ally_hushed, refugee)', () => {
    at(100);
    emit(hushAlly(200, 'refugee'));
    expect(shown()).toBe(bark('bricks_ally_hushed_a2_05'));
    expect(shown()).toBe('Lost one. Keep the rest moving.');
  });

  it('says nothing for a hushed ally no ally_hushed bark names', () => {
    at(100);
    emit(hushAlly(200, 'militia'));
    expect(shown()).toBeNull();
  });

  it("QUILL's low_integrity fires once, as the escort's losses near maxLost", () => {
    const maxLost = host.sim.map.maxLost;
    expect(maxLost).not.toBeNull();
    state.objective = 'escort';
    at(100);
    // One short of the low mark: nothing.
    const mark = Math.ceil(maxLost! * 0.75);
    state.stats.refugeesLost = mark - 1;
    emit(lost(300));
    expect(shown()).toBeNull();
    state.stats.refugeesLost = mark;
    at(110);
    emit(lost(301));
    expect(shown()).toBe(bark('quill_low_integrity_a2_05'));
    drain();
    state.stats.refugeesLost = mark + 1;
    at(130);
    emit(lost(302));
    expect(shown()).toBeNull();
  });

  it("Bricks tags the earliest turret 'Dele' at the first wave clear (campaign.md § 6.3)", () => {
    emit({ type: 'TowerBuilt', uid: 7, tower: 'rivet', tile: [1, 1], cost: 100 });
    emit({ type: 'TowerBuilt', uid: 8, tower: 'thumper', tile: [2, 1], cost: 120 });
    at(60);
    emit({ type: 'WaveCleared', wave: 1, bonus: 20 });
    expect(hud.nameTag.value).toEqual({ uid: 7, text: 'Dele' });
  });

  it('reads no refugee losses as low before the pivot (the core is the meter)', () => {
    state.objective = 'defend';
    state.stats.refugeesLost = 99;
    at(100);
    emit(lost(300));
    expect(shown()).toBeNull();
  });
});
