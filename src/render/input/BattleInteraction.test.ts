import { describe, expect, it } from 'vitest';
import { BattleInteraction, type InteractionSnapshot } from './BattleInteraction.ts';

function watched(armed: string | null = null): {
  i: BattleInteraction;
  seen: InteractionSnapshot[];
} {
  const i = new BattleInteraction(armed);
  const seen: InteractionSnapshot[] = [];
  i.subscribe((s) => seen.push(s));
  return { i, seen };
}

describe('BattleInteraction', () => {
  it('starts with what it was given and nothing selected', () => {
    expect(new BattleInteraction().snapshot()).toEqual({
      selectedTower: 0,
      armed: null,
      aiming: null,
    });
    expect(new BattleInteraction('rivet').snapshot()).toEqual({
      selectedTower: 0,
      armed: 'rivet',
      aiming: null,
    });
  });

  it('keeps selection and the armed slot exclusive', () => {
    const { i } = watched('rivet');
    i.selectTower(5);
    expect(i.snapshot()).toEqual({ selectedTower: 5, armed: null, aiming: null });
    i.arm('thumper');
    expect(i.snapshot()).toEqual({ selectedTower: 0, armed: 'thumper', aiming: null });
    // Clearing the selection leaves the armed slot alone, and disarming leaves the selection.
    i.selectTower(0);
    expect(i.armed).toBe('thumper');
    i.selectTower(3);
    i.arm(null);
    expect(i.selectedTower).toBe(3);
  });

  it('clear() drops both', () => {
    const { i, seen } = watched('rivet');
    i.clear();
    expect(i.snapshot()).toEqual({ selectedTower: 0, armed: null, aiming: null });
    i.clear();
    expect(seen).toHaveLength(1);
  });

  it('keeps aiming an ability exclusive with selection and arming', () => {
    const { i } = watched('rivet');
    i.aimAbility(1);
    expect(i.snapshot()).toEqual({ selectedTower: 0, armed: null, aiming: 1 });
    i.arm('thumper');
    expect(i.aiming).toBeNull();
    i.aimAbility(1);
    i.selectTower(4);
    expect(i.snapshot()).toEqual({ selectedTower: 4, armed: null, aiming: null });
    // Stopping the aim leaves the selection alone; clear() stops it.
    i.aimAbility(null);
    expect(i.selectedTower).toBe(4);
    i.aimAbility(1);
    i.clear();
    expect(i.snapshot()).toEqual({ selectedTower: 0, armed: null, aiming: null });
  });

  it('notifies only on a change', () => {
    const { i, seen } = watched();
    i.selectTower(0);
    i.arm(null);
    i.arm('rivet');
    i.arm('rivet');
    i.selectTower(2);
    i.selectTower(2);
    expect(seen).toEqual([
      { selectedTower: 0, armed: 'rivet', aiming: null },
      { selectedTower: 2, armed: null, aiming: null },
    ]);
  });

  it('keeps the keyboard cursor apart from selection, arming, and aiming (T126)', () => {
    const { i, seen } = watched();
    expect(i.cursor).toBe(-1);
    i.setCursor(12, { axis: 'h', anchor: 4 });
    expect([i.cursor, i.cursorLast, i.cursorNav]).toEqual([12, 12, { axis: 'h', anchor: 4 }]);
    i.arm('rivet');
    i.selectTower(3);
    i.clear();
    expect(i.cursor).toBe(12);
    // Hidden, it remembers its tile and forgets its line.
    i.hideCursor();
    expect([i.cursor, i.cursorLast, i.cursorNav]).toEqual([-1, 12, null]);
    const n = seen.length;
    i.hideCursor();
    expect(seen).toHaveLength(n);
  });

  it('reports refusals to their listeners without changing anything', () => {
    const { i, seen } = watched();
    i.aimAbility(2);
    const refused: string[] = [];
    const off = i.onRefusal((r) => refused.push(r));
    i.refuse('invalidTarget');
    off();
    i.refuse('invalidTarget');
    expect(refused).toEqual(['invalidTarget']);
    expect(seen).toHaveLength(1); // the aim only
    expect(i.aiming).toBe(2);
  });

  it('hands pokes to their listeners without changing anything (T309)', () => {
    const i = new BattleInteraction('rivet');
    const seen: number[] = [];
    const off = i.onPoke(() => seen.push(1));
    i.onPoke(() => seen.push(2));
    i.poke();
    expect(seen).toEqual([1, 2]);
    expect(i.snapshot()).toEqual({ selectedTower: 0, armed: 'rivet', aiming: null });
    off();
    i.poke();
    expect(seen).toEqual([1, 2, 2]);
  });
});
