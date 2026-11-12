import { describe, expect, it } from 'vitest';
import {
  amountText,
  floatAmount,
  FLOAT_ROW_PX,
  FLOAT_STACK_ROWS,
  stackFloat,
  type FloatSlot,
} from './floatStack.ts';

const at = (cx: number, baseY: number, w = 20): FloatSlot => ({ active: true, cx, baseY, w });

describe('stackFloat (T334, T332)', () => {
  it('leaves a floater where it is when nothing overlaps it', () => {
    expect(stackFloat([], 100, 50, 20)).toBe(50);
    // Side by side, or a row clear above: no overlap.
    expect(stackFloat([at(130, 50)], 100, 50, 20)).toBe(50);
    expect(stackFloat([at(100, 50 - FLOAT_ROW_PX)], 100, 50, 20)).toBe(50);
    expect(stackFloat([{ ...at(100, 50), active: false }], 100, 50, 20)).toBe(50);
  });

  it('steps one row above a floater it would overlap', () => {
    expect(stackFloat([at(104, 52)], 100, 50, 20)).toBe(52 - FLOAT_ROW_PX);
    // A wide callout over a narrow number still collides.
    expect(stackFloat([at(100, 48, 8)], 120, 50, 60)).toBe(48 - FLOAT_ROW_PX);
  });

  it('stacks up to FLOAT_STACK_ROWS on one spot, then drops the rest (a fast-forward pile)', () => {
    const slots: FloatSlot[] = [];
    const placed: (number | null)[] = [];
    for (let i = 0; i < FLOAT_STACK_ROWS + 3; i++) {
      const y = stackFloat(slots, 100, 50, 12);
      placed.push(y);
      if (y !== null) slots.push(at(100, y, 12));
    }
    expect(placed.slice(0, FLOAT_STACK_ROWS)).toEqual([
      50,
      50 - FLOAT_ROW_PX,
      50 - 2 * FLOAT_ROW_PX,
    ]);
    expect(placed.slice(FLOAT_STACK_ROWS).every((y) => y === null)).toBe(true);
  });
});

describe('floatAmount and amountText (T803b)', () => {
  it('reads a signed number back, and words as none', () => {
    expect(floatAmount('\u2212150')).toBe(-150);
    expect(floatAmount('-3')).toBe(-3);
    expect(floatAmount('+40')).toBe(40);
    expect(floatAmount('CROSSFIRE!')).toBeNull();
    expect(floatAmount('PLINK!')).toBeNull();
    expect(amountText(-495)).toBe('\u2212495');
    expect(amountText(80)).toBe('+80');
  });
});
