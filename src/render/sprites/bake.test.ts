import { describe, expect, it } from 'vitest';
import { luminance } from '../../content/palettes/color.ts';
import { PALETTES } from '../../content/palettes/index.ts';
import { rgbOf } from '../../content/palettes/master.ts';
import { defineSprite } from '../../content/sprites/defineSprite.ts';
import { SPRITES } from '../../content/sprites/index.ts';
import type { SpriteDef } from '../../content/sprites/types.ts';
import {
  bakeAll,
  bakeSprite,
  derivedFor,
  frameKey,
  glowKey,
  mountOf,
  resolveFrames,
} from './bake.ts';

const mite = defineSprite({
  id: 'enemy.test_mite',
  size: { w: 4, h: 3 },
  anchor: { x: 1, y: 3 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0'], radius: 1 },
  frames: {
    walk_se_0: ['.d+.', '1kk2', '0..0'],
    walk_se_1: { from: 'walk_se_0', patch: { x: 0, y: 2, rows: ['.00.'] } },
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
  },
});

function pixel(img: { w: number; data: Uint8ClampedArray }, x: number, y: number): number[] {
  const i = (y * img.w + x) * 4;
  return Array.from(img.data.slice(i, i + 4));
}

function rgba(name: Parameters<typeof rgbOf>[0], a = 255): number[] {
  const c = rgbOf(name);
  return [c.r, c.g, c.b, a];
}

describe('bakeSprite', () => {
  const baked = bakeSprite(mite, PALETTES);
  const byKey = new Map(baked.frames.map((f) => [f.key, f]));

  it('bakes palette variants, then derived variants for actors', () => {
    expect(baked.variants).toEqual([
      'default',
      'skitterkin.ally',
      'default+selected',
      'skitterkin.ally+selected',
    ]);
    expect(derivedFor('tower')).toEqual(['selected', 'jammed']);
    expect(derivedFor('tile')).toEqual([]);
  });

  it('expands mirror anims into named frames', () => {
    expect(baked.frameNames).toEqual(['walk_se_0', 'walk_se_1', 'walk_sw_0', 'walk_sw_1']);
    const sw = baked.anims.find((a) => a.key === 'enemy.test_mite#default:walk_sw');
    expect(sw?.frameKeys).toEqual([
      'enemy.test_mite#default:walk_sw_0',
      'enemy.test_mite#default:walk_sw_1',
    ]);
    expect(sw?.fps).toBe(8);
    expect(sw?.loop).toBe(true);
  });

  it('grows size and anchor by the outline, and mirrors the anchor for mirrored frames', () => {
    expect(baked.meta).toEqual({ w: 6, h: 5, anchor: { x: 2, y: 4 } });
    expect(byKey.get(frameKey(mite.id, 'default', 'walk_se_0'))?.anchor).toEqual({ x: 2, y: 4 });
    expect(byKey.get(frameKey(mite.id, 'default', 'walk_sw_0'))?.anchor).toEqual({ x: 4, y: 4 });
  });

  it('maps legend characters through the palette, and outlines in the outline slot', () => {
    const f = byKey.get(frameKey(mite.id, 'default', 'walk_se_0'));
    expect(f).toBeDefined();
    if (f === undefined) return;
    expect(pixel(f.image, 1, 2)).toEqual(rgba('coral.1')); // '1' at (0, 1), +1 outline pad
    expect(pixel(f.image, 2, 2)).toEqual(rgba('ink.1')); // 'k' eye
    expect(pixel(f.image, 2, 1)).toEqual(rgba('green.3')); // 'd' accent
    expect(pixel(f.image, 2, 0)).toEqual(rgba('ink.0')); // auto outline
    expect(pixel(f.image, 0, 0)).toEqual([0, 0, 0, 0]);
    const ally = byKey.get(frameKey(mite.id, 'skitterkin.ally', 'walk_se_0'));
    expect(ally && pixel(ally.image, 2, 1)).toEqual(rgba('teal.3'));
  });

  it('applies patches and mirrors pixels', () => {
    const f1 = byKey.get(frameKey(mite.id, 'default', 'walk_se_1'));
    const sw0 = byKey.get(frameKey(mite.id, 'default', 'walk_sw_0'));
    expect(f1 && pixel(f1.image, 1, 3)).toEqual(rgba('ink.0')); // patched '.' at (0, 2) is outline now
    expect(f1 && pixel(f1.image, 2, 3)).toEqual(rgba('coral.0'));
    expect(sw0 && pixel(sw0.image, 4, 2)).toEqual(rgba('coral.1')); // '1' mirrored from x 0 to 3
  });

  it('bakes selected with a white outline', () => {
    const sel = byKey.get(frameKey(mite.id, 'default+selected', 'walk_se_0'));
    expect(sel && pixel(sel.image, 2, 0)).toEqual(rgba('white.1'));
    expect(sel && pixel(sel.image, 1, 2)).toEqual(rgba('coral.1'));
  });

  it('bakes a glow frame padded by the radius, for palette variants only', () => {
    const key = frameKey(mite.id, 'default', 'walk_se_0');
    const glow = byKey.get(glowKey(key));
    expect(glow?.image.w).toBe(8);
    expect(glow?.anchor).toEqual({ x: 3, y: 5 });
    // '+' sits at authored (2, 0) → outlined (3, 1) → glow (4, 2), at the first alpha step.
    expect(glow && pixel(glow.image, 4, 2)).toEqual([...rgba('gold.3').slice(0, 3), 153]);
    expect(byKey.has(glowKey(frameKey(mite.id, 'default+selected', 'walk_se_0')))).toBe(false);
  });

  it('maps jammed towers onto the steel ramp by luminance', () => {
    const tower: SpriteDef = { ...mite, id: 'tower.test', variants: [] };
    const t = bakeSprite(tower, PALETTES);
    const f = t.frames.find((x) => x.key === frameKey('tower.test', 'default+jammed', 'walk_se_0'));
    expect(f).toBeDefined();
    if (f === undefined) return;
    const steel = (['steel.0', 'steel.1', 'steel.2', 'steel.3', 'steel.4'] as const).map((n) =>
      rgba(n).join(),
    );
    for (let i = 0; i < f.image.data.length; i += 4) {
      if ((f.image.data[i + 3] ?? 0) === 0) continue;
      expect(steel).toContain(
        pixel(f.image, (i / 4) % f.image.w, Math.floor(i / 4 / f.image.w)).join(),
      );
    }
    // A bright accent maps to a lighter steel than the eye.
    const accent = luminance(rgbOf('green.3'));
    expect(accent).toBeGreaterThan(luminance(rgbOf('ink.1')));
  });

  it('bakes portraits a dark variant: ink.1–ink.3 by luminance, the outline ink.0', () => {
    expect(derivedFor('portrait')).toEqual(['dark']);
    const portrait: SpriteDef = {
      ...mite,
      id: 'portrait.test',
      variants: [],
      outline: 'none',
      frames: { a: ['xk2w', '....', '....'] },
      anims: {},
    };
    const p = bakeSprite(portrait, PALETTES);
    expect(p.variants).toEqual(['default', 'default+dark']);
    const f = p.frames.find((x) => x.key === frameKey('portrait.test', 'default+dark', 'a'));
    if (f === undefined) throw new Error('no dark frame');
    // Outline, eye (ink.1, darkest), mid coral, white highlight (lightest).
    expect([0, 1, 2, 3].map((x) => pixel(f.image, x, 0).join())).toEqual(
      [rgba('ink.0'), rgba('ink.1'), rgba('ink.2'), rgba('ink.3')].map((c) => c.join()),
    );
  });

  it('bakes Aelari and Hollow enemies a cloak: a 50% checker body inside a dashed white outline', () => {
    expect(derivedFor('enemy', 'aelari')).toEqual(['selected', 'cloak']);
    expect(derivedFor('enemy', 'hollow')).toEqual(['selected', 'cloak']);
    expect(derivedFor('enemy', 'skitterkin')).toEqual(['selected']);
    expect(bakeSprite(mite, PALETTES).variants).not.toContain('default+cloak');
    const { glow: _glow, variants: _variants, ...plain } = mite;
    const veil: SpriteDef = {
      ...plain,
      palette: 'aelari',
      frames: { a: ['2222', '2222', '2222'] },
      anims: {},
    };
    const c = bakeSprite(veil, PALETTES);
    expect(c.variants).toEqual(['default', 'default+selected', 'default+cloak']);
    const f = c.frames.find((x) => x.key === frameKey('enemy.test_mite', 'default+cloak', 'a'));
    if (f === undefined) throw new Error('no cloak frame');
    // Body pixels (outlined: x, y in 1..4, 1..3) alternate solid and clear on a checker.
    const alphaAt = (x: number, y: number): number => pixel(f.image, x, y)[3] ?? -1;
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 4; x++)
        expect(alphaAt(x, y), `${x},${y}`).toBe((x + y) % 2 === 0 ? 255 : 0);
    }
    // The outline is white where it shows, and dashed: some of it clear.
    const ring = [1, 2, 3, 4].map((x) => pixel(f.image, x, 0));
    expect(ring.filter((p) => p[3] === 255).every((p) => p.join() === rgba('white.1').join())).toBe(
      true,
    );
    expect(ring.some((p) => p[3] === 0)).toBe(true);
    expect(ring.some((p) => p[3] === 255)).toBe(true);
  });

  it('gives shadow pixels 50% alpha', () => {
    const s = bakeSprite({ ...mite, frames: { a: ['_...', '....', '....'] }, anims: {} }, PALETTES);
    expect(pixel(s.frames[0]?.image ?? { w: 0, data: new Uint8ClampedArray() }, 1, 1)).toEqual(
      rgba('ink.0', 128),
    );
  });

  it('throws on malformed data, naming the sprite', () => {
    expect(() =>
      resolveFrames({ ...mite, frames: { a: { from: 'nope', patch: [] } }, anims: {} }),
    ).toThrow("enemy.test_mite: unknown frame 'nope'");
    expect(() => bakeAll([mite, mite], PALETTES)).toThrow("duplicate id 'enemy.test_mite'");
  });
});

describe('the registry bakes', () => {
  const baked = bakeAll(SPRITES, PALETTES);

  it('every sprite, with glow frames wherever glow is declared', () => {
    expect(baked).toHaveLength(SPRITES.length);
    for (const [i, b] of baked.entries()) {
      const def: SpriteDef | undefined = SPRITES[i];
      const hasGlow = b.frames.some((f) => f.key.endsWith('@glow'));
      expect(hasGlow, b.id).toBe(def?.glow !== undefined);
      for (const f of b.frames) expect(f.image.data.length, f.key).toBe(f.image.w * f.image.h * 4);
    }
  });

  it('keeps every frame of a sprite the same size (one anchor per sprite)', () => {
    for (const b of baked) {
      for (const f of b.frames) {
        if (f.key.endsWith('@glow')) continue;
        expect([f.image.w, f.image.h], f.key).toEqual([b.meta.w, b.meta.h]);
      }
    }
  });

  it('puts tower head mounts on the base top face, inside the base', () => {
    for (const def of SPRITES as readonly SpriteDef[]) {
      const m = mountOf(def);
      if (m === null) continue;
      expect(m.x).toBeLessThan(def.size.w + 2);
      expect(m.y).toBeLessThan(def.anchor.y + 1);
    }
  });
});
