import { describe, expect, it } from 'vitest';
import { ghostLabel, ghostLabels } from './ghostLabel.ts';

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
