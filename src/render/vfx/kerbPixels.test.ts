import { describe, expect, it } from 'vitest';
import { kerbImage, KERB_H, KERB_W, frontEdge, type KerbColors } from './kerbPixels.ts';

const C: KerbColors = {
  top: { r: 250, g: 240, b: 200 },
  face: { r: 100, g: 40, b: 50 },
  shadow: { r: 60, g: 40, b: 40 },
};

const colorAt = (img: ReturnType<typeof kerbImage>, x: number, y: number): string | null => {
  const i = (y * KERB_W + x) * 4;
  if (img.data[i + 3] === 0) return null;
  const rgb = [img.data[i], img.data[i + 1], img.data[i + 2]].join();
  for (const [k, c] of Object.entries(C)) if ([c.r, c.g, c.b].join() === rgb) return k;
  return 'other';
};

describe('kerbImage (T430b)', () => {
  it('lays the lit top along a front edge and the face and its shadow along a back edge', () => {
    expect(frontEdge('sw')).toBe(true);
    expect(frontEdge('ne')).toBe(false);
    const top = kerbImage('sw', C);
    // The sw edge runs from the left vertex (0, 8) to the bottom one (16, 15).
    expect(colorAt(top, 8, 11)).toBe('top');
    expect(colorAt(top, 16, 4)).toBeNull(); // the lane itself stays clear
    const face = kerbImage('ne', C);
    // The ne edge runs from the top vertex (16, 0) to the right one (31, 7).
    expect(colorAt(face, 24, 4)).toBe('face');
    const kinds = new Set<string | null>();
    for (let y = 0; y < KERB_H; y++)
      for (let x = 0; x < KERB_W; x++) kinds.add(colorAt(face, x, y));
    expect(kinds).toEqual(new Set([null, 'face', 'shadow']));
    expect(colorAt(face, 10, 12)).toBeNull();
  });
});
