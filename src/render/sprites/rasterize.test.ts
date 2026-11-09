import { describe, expect, it } from 'vitest';
import {
  applyPatch,
  colorize,
  GLOW_STEPS,
  glowPass,
  meanLuminance,
  mirrorH,
  outlinePass,
  parseGrid,
  type ColorLookup,
  type IndexedImage,
} from './rasterize.ts';

const legal = (ch: string): boolean => '.01234xk*+_'.includes(ch);
const X = 'x'.charCodeAt(0);
const solid = (code: number): boolean => code !== '.'.charCodeAt(0) && code !== '_'.charCodeAt(0);

function text(img: IndexedImage): string[] {
  const out: string[] = [];
  for (let y = 0; y < img.h; y++) {
    out.push(String.fromCharCode(...img.px.slice(y * img.w, (y + 1) * img.w)));
  }
  return out;
}

const lookup: ColorLookup = (code) => {
  const ch = String.fromCharCode(code);
  if (ch === '1') return { r: 10, g: 20, b: 30, a: 255 };
  if (ch === '*') return { r: 200, g: 100, b: 0, a: 255 };
  if (ch === '_') return { r: 0, g: 0, b: 0, a: 128 };
  return null;
};

const white: ColorLookup = (c) => (c === 49 ? { r: 255, g: 255, b: 255, a: 255 } : null);

function step(i: number): number {
  return Math.round(255 * (GLOW_STEPS[i] ?? 0));
}

describe('parseGrid', () => {
  it('stores char codes row-major', () => {
    expect(text(parseGrid(['1.', '.2'], 2, 2, legal, 't'))).toEqual(['1.', '.2']);
  });

  it('names the row and column of errors', () => {
    expect(() => parseGrid(['1.', '.?'], 2, 2, legal, 'spr frame f')).toThrow(
      "spr frame f: row 1 col 1: '?' is not in the legend",
    );
    expect(() => parseGrid(['1.', '.'], 2, 2, legal, 't')).toThrow('row 1 is 1 wide, expected 2');
    expect(() => parseGrid(['1.'], 2, 2, legal, 't')).toThrow('has 1 rows, expected 2');
  });
});

describe('palette mapping (colorize)', () => {
  it('writes RGBA through the lookup, leaving unmapped codes transparent', () => {
    const img = colorize(parseGrid(['1._'], 3, 1, legal, 't'), lookup);
    expect([...img.data]).toEqual([10, 20, 30, 255, 0, 0, 0, 0, 0, 0, 0, 128]);
  });

  it('measures mean luminance over opaque pixels only', () => {
    expect(meanLuminance(colorize(parseGrid(['1.'], 2, 1, legal, 't'), white))).toBeCloseTo(1);
  });
});

describe('patches', () => {
  it('overwrites with `.` and keeps pixels under spaces', () => {
    const img = parseGrid(['111', '111'], 3, 2, legal, 't');
    expect(text(applyPatch(img, 0, 0, ['. 0', ' 2'], legal, 't'))).toEqual(['.10', '121']);
  });

  it('rejects pixels outside the image', () => {
    const img = parseGrid(['11'], 2, 1, legal, 't');
    expect(() => applyPatch(img, 1, 0, ['22'], legal, 'p')).toThrow(
      'p: patch pixel (2, 0) is outside 2×1',
    );
  });
});

describe('mirrorH', () => {
  it('flips each row', () => {
    expect(text(mirrorH(parseGrid(['12.', '.34'], 3, 2, legal, 't')))).toEqual(['.21', '43.']);
  });
});

describe('outlinePass', () => {
  const dot = parseGrid(['1'], 1, 1, legal, 't');

  it('rings 4-adjacent pixels with `auto`, growing the image by 1 on each side', () => {
    expect(text(outlinePass(dot, 'auto', X, solid))).toEqual(['.x.', 'x1x', '.x.']);
  });

  it('rings 8-adjacent pixels with `auto8`', () => {
    expect(text(outlinePass(dot, 'auto8', X, solid))).toEqual(['xxx', 'x1x', 'xxx']);
  });

  it('leaves `none` untouched and does not outline shadow pixels', () => {
    expect(outlinePass(dot, 'none', X, solid)).toBe(dot);
    const shadow = parseGrid(['1_'], 2, 1, legal, 't');
    expect(text(outlinePass(shadow, 'auto', X, solid))).toEqual(['.x..', 'x1_.', '.x..']);
  });
});

describe('glowPass', () => {
  it('steps alpha by distance from emissive pixels, padded by the radius', () => {
    const img = parseGrid(['*'], 1, 1, legal, 't');
    const glow = glowPass(img, lookup, new Set(['*'.charCodeAt(0)]), 2);
    expect(glow.w).toBe(5);
    expect(glow.h).toBe(5);
    const alphaAt = (x: number, y: number): number => glow.data[(y * 5 + x) * 4 + 3] ?? -1;
    expect(alphaAt(2, 2)).toBe(step(0));
    expect(alphaAt(3, 2)).toBe(step(1));
    expect(alphaAt(4, 2)).toBe(step(2));
    expect(alphaAt(3, 3)).toBe(step(1)); // √2 rounds to 1
    expect(alphaAt(0, 0)).toBe(0); // √8 ≈ 2.8 rounds to 3: outside radius 2
    expect(Array.from(glow.data.slice((2 * 5 + 2) * 4, (2 * 5 + 2) * 4 + 3))).toEqual([
      200, 100, 0,
    ]);
  });

  it('is empty when nothing is emissive', () => {
    const glow = glowPass(parseGrid(['1'], 1, 1, legal, 't'), lookup, new Set(), 1);
    expect(glow.data.every((v) => v === 0)).toBe(true);
  });
});
