// The Escort HUD's D138 fixes on A2M5's own map: the next-wave preview's "+6 walking" chip
// (`refugeesWalking`), and the relabel moment holding the core's last integrity (never "Core 0").
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IdSpace } from '../content/types.ts';
import { createSim, type SimState } from '../sim/index.ts';
import { hud } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { createHost } from './host.ts';
import { bindEscortMeter, refugeesWalking } from './hudEscort.ts';

vi.mock('./battle.ts', () => ({ startBattle: () => undefined }));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const a2m5 = () => {
  const sim = createSim(battleConfig('a2_m05', 1, null));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return { sim, state: sim.state as unknown as SimState };
};

let unbind = (): void => {};
afterEach(() => {
  unbind();
  unbind = () => {};
});

describe('the "+6 walking" chip (D138)', () => {
  it("counts the refugees each wave's start sends walking on A2M5", () => {
    const { sim } = a2m5();
    const walking = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((w) => refugeesWalking(sim, w));
    // W6 (the forced pivot's first group), W7, W8, W11 (two groups at once), W12.
    expect(walking.filter((n) => n > 0).length).toBe(5);
    expect(walking[5]).toBe(6);
    expect(walking[10]).toBe(12);
    expect(walking.slice(0, 5)).toEqual([0, 0, 0, 0, 0]);
  });

  it("drops W6's group once the Penitent has pivoted already (its `when` fails)", () => {
    const { sim, state } = a2m5();
    state.stats.pivotWave = 5;
    expect(refugeesWalking(sim, 6)).toBe(0);
    expect(refugeesWalking(sim, 7)).toBe(6);
  });

  it('is 0 on a map without refugees', () => {
    const sim = createSim(battleConfig('a2_m04', 1, null));
    expect(refugeesWalking(sim, 1)).toBe(0);
  });
});

describe('the relabel moment (D138)', () => {
  it("holds the core's last integrity with the struck label, never 0", () => {
    const { sim, state } = a2m5();
    const host = createHost<IdSpace>(sim);
    unbind = bindEscortMeter(host);
    state.integrity = 17;
    state.objective = 'escort';
    state.meterLabel = 'evacuated';
    host.bus.emit({ type: 'ObjectiveChanged', objective: 'escort', meterLabel: 'evacuated' });
    expect(hud.relabel.value).toMatchObject({ from: 'Core', fromValue: 17 });
    expect(hud.escort.value?.evacuated).toBe(0);
  });
});
