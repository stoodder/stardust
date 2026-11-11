// Act III's Evie billboard (`dark`, T613; art-direction §6, bible.md *Two suns*): the peeling board
// unlit, the hum-glyph painted over the smile in sung stardust's warm pink-gold, and nothing else
// on it lit.
import { describe, expect, it } from 'vitest';
import { SPRITES } from '../index.ts';

const billboard = SPRITES.find((s) => s.id === 'prop.billboard');

function frame(name: string): readonly string[] {
  const f = billboard?.frames[name];
  if (f === undefined || !Array.isArray(f)) throw new Error(`no billboard frame ${name}`);
  return f;
}

const count = (rows: readonly string[], chars: string): number =>
  rows
    .join('')
    .split('')
    .filter((c) => chars.includes(c)).length;

describe('Evie dark (Act III billboards)', () => {
  const dark = frame('dark');
  const peeling = frame('peeling');

  it('is its own frame, the peeling board on the same canvas and silhouette', () => {
    expect(dark).not.toEqual(peeling);
    expect(dark.length).toBe(peeling.length);
    // Same shape: every pixel the peeling board draws, the dark one draws (only colors change).
    dark.forEach((row, y) =>
      row.split('').forEach((c, x) => expect(c === '.', `${x},${y}`).toBe(peeling[y]![x] === '.')),
    );
  });

  it('has its power cut: no lit paper, frame teal, bright sun, or pink bars left', () => {
    expect(count(peeling, '48GHIPQ')).toBeGreaterThan(100);
    expect(count(dark, '48GHIPQ')).toBe(0);
  });

  it('paints the hum-glyph over the smile in sung pink-gold, its one lit mark', () => {
    expect(count(dark, 'YZV')).toBeGreaterThanOrEqual(12);
    // The smile is gone: no outline pixel left on its stamp's two rows inside the sun.
    for (const [x, y] of [
      [5, 9],
      [10, 9],
      [6, 10],
      [7, 10],
      [8, 10],
      [9, 10],
    ] as const) {
      expect(dark[y]![x], `${x},${y}`).not.toBe('k');
    }
    // Her eye is still there (one of them), looking out of the dark.
    expect(dark[7]![6]).toBe('k');
    expect(billboard?.legend?.['Y']).toBe('pink.3');
    expect(billboard?.legend?.['Z']).toBe('gold.3');
  });
});
