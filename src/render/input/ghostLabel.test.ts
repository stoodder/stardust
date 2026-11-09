import { describe, expect, it } from 'vitest';
import { canDraw } from '../vfx/pixelFont.ts';
import { ghostLabel, ghostLabels, salvageLabel } from './ghostLabel.ts';

describe('the placement ghost label (D059, T234)', () => {
  const labels = ghostLabels([]);

  it('names the tile bonus a tower would get there', () => {
    expect(ghostLabel(labels, '^', true)).toBe('+25% RANGE');
    expect(ghostLabel(labels, '+', true)).toBe('+20% RATE');
    expect(ghostLabel(labels, '+', false)).toMatch(/^\+\d+% AURA$/);
    expect(ghostLabel(labels, 'o', true)).toBeNull();
    expect(ghostLabel(labels, undefined, true)).toBeNull();
  });

  it('hands back the same strings every frame (built once per battle)', () => {
    expect(ghostLabel(labels, '^', true)).toBe(labels.range);
    expect(ghostLabel(labels, '+', false)).toBe(labels.aura);
  });
});

describe('the salvage hover label (D097)', () => {
  it('says what a click does and what it pays, in characters the 3×5 font has', () => {
    expect(salvageLabel(40)).toBe('SEND DRONE +40');
    expect(salvageLabel(0)).toBe('SEND DRONE');
    expect(canDraw(salvageLabel(80))).toBe(true);
  });
});
