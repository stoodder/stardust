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
  it('covers the M1 towers, enemies, and ability, and the HUD glyphs', () => {
    expect(icons.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'icon.tower.rivet',
        'icon.tower.thumper',
        'icon.tower.sprinkler',
        'icon.enemy.nibbler',
        'icon.enemy.zoomer',
        'icon.enemy.chonk',
        'icon.ability.orbital_strike',
        'icon.credits',
        'icon.core',
        'icon.lock',
      ]),
    );
  });

  it('bakes tower, enemy, and ability icons at 16×16 and glyphs at 8×8, with one `icon` frame', () => {
    for (const def of icons) {
      const big = /^icon\.(tower|enemy|ability)\./.test(def.id);
      expect(bakedSize(def), def.id).toEqual(big ? { w: 16, h: 16 } : { w: 8, h: 8 });
      expect(Object.keys(def.frames), def.id).toEqual(['icon']);
    }
  });

  it('gives every tower and enemy sprite a matching icon', () => {
    const ids = new Set<string>(SPRITES.map((s) => s.id));
    // Render-only actors never appear in a wave preview or the build bar.
    const renderOnly = new Set(['enemy.hauler_young']);
    for (const s of SPRITES) {
      const m = /^(tower|enemy)\.([a-z_]+)$/.exec(s.id);
      if (m === null || s.id.endsWith('_head') || renderOnly.has(s.id)) continue;
      expect(ids.has(`icon.${m[1]}.${m[2]}`), s.id).toBe(true);
    }
  });
});
