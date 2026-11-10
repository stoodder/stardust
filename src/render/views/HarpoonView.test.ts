import { describe, expect, it } from 'vitest';
import { ENEMY_BLANK } from '../../sim/entities.ts';
import { showsPin, SKEWER_MS, skewerAlpha } from './HarpoonView.ts';

/** Skewer's alpha at fraction `f` of its time. */
const at = (f: number, reduced: boolean): number => skewerAlpha(f * SKEWER_MS, reduced);
/** A unit as the view reads it. */
const unit = (alive: boolean, pinnedTicks: number) => ({ ...ENEMY_BLANK, alive, pinnedTicks });

describe("the Harpoon's minimal view (T408)", () => {
  it("Skewer's line fades 1 → 0.66 → 0.33 over its time, held whole under reduced motion", () => {
    expect([0, 0.4, 0.8].map((f) => at(f, false))).toEqual([1, 0.66, 0.33]);
    expect([0, 0.4, 0.8].map((f) => at(f, true))).toEqual([1, 1, 1]);
    expect(at(1, false)).toBe(0);
    expect(at(1, true)).toBe(0);
  });

  it('shows the rope only on a live, pinned unit', () => {
    expect(showsPin(unit(true, 0))).toBe(false);
    expect(showsPin(unit(true, 5))).toBe(true);
    expect(showsPin(unit(false, 5))).toBe(false);
  });
});
