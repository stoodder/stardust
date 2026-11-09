import { describe, expect, it } from 'vitest';
import { SPRITES } from '../index.ts';
import type { SpriteDef } from '../types.ts';

const icons = (SPRITES as readonly SpriteDef[]).filter((s) => s.id.startsWith('icon.'));

/** The baked size: the outline pass grows a sprite by 1 px on every side. */
function bakedSize(def: SpriteDef): { w: number; h: number } {
  const pad = (def.outline ?? 'none') === 'none' ? 0 : 2;
  return { w: def.size.w + pad, h: def.size.h + pad };
}

describe('icon sprites (art-direction §5)', () => {
  it('covers the M1 towers and enemies, and the HUD glyphs', () => {
    expect(icons.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'icon.tower.rivet',
        'icon.tower.thumper',
        'icon.tower.sprinkler',
        'icon.enemy.nibbler',
        'icon.enemy.zoomer',
        'icon.enemy.chonk',
        'icon.credits',
        'icon.core',
        'icon.lock',
      ]),
    );
  });

  it('bakes tower and enemy icons at 16×16 and glyphs at 8×8, with one `icon` frame', () => {
    for (const def of icons) {
      const big = def.id.startsWith('icon.tower.') || def.id.startsWith('icon.enemy.');
      expect(bakedSize(def), def.id).toEqual(big ? { w: 16, h: 16 } : { w: 8, h: 8 });
      expect(Object.keys(def.frames), def.id).toEqual(['icon']);
    }
  });

  it('gives every M1 tower and enemy sprite a matching icon', () => {
    const ids = new Set<string>(SPRITES.map((s) => s.id));
    for (const s of SPRITES) {
      const m = /^(tower|enemy)\.([a-z_]+)$/.exec(s.id);
      if (m === null || s.id.endsWith('_head')) continue;
      expect(ids.has(`icon.${m[1]}.${m[2]}`), s.id).toBe(true);
    }
  });
});
