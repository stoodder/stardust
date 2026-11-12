import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../enemies/index.ts';
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

  it('bakes tower, enemy, and ability icons at 16×16, stamps at 34×18, and glyphs at 8×8, with one `icon` frame', () => {
    for (const def of icons) {
      const big = /^icon\.(tower|enemy|ability)\./.test(def.id);
      // The REVOKED stamps (icons/revoked.ts) are plates of two lines of the 3×5 font.
      const stamp = def.id.startsWith('icon.stamp.');
      const want = stamp ? { w: 34, h: 18 } : big ? { w: 16, h: 16 } : { w: 8, h: 8 };
      expect(bakedSize(def), def.id).toEqual(want);
      expect(Object.keys(def.frames), def.id).toEqual(['icon']);
    }
  });

  it('gives every tower and enemy sprite a matching icon', () => {
    const ids = new Set<string>(SPRITES.map((s) => s.id));
    // Render-only actors never appear in a wave preview or the build bar. A youngling is a
    // Nibbler with the `youngling` wave modifier drawn small, so its preview is the Nibbler's.
    // The Unsung's later forms, its split parts and its rest are one unit's looks (T841): its icon.
    const renderOnly = new Set([
      'enemy.hauler_young',
      'enemy.youngling',
      'enemy.unsung_split',
      'enemy.unsung_part',
      'enemy.unsung_burrow',
      'enemy.unsung_song',
      'enemy.unsung_rest',
    ]);
    for (const s of SPRITES) {
      const m = /^(tower|enemy)\.([a-z_]+)$/.exec(s.id);
      // A fleeing body (`enemy.<id>_fleeing`, T440a) is its unit's look while it runs: the unit's icon.
      if (m === null || s.id.endsWith('_head') || s.id.endsWith('_fleeing') || renderOnly.has(s.id))
        continue;
      expect(ids.has(`icon.${m[1]}.${m[2]}`), s.id).toBe(true);
    }
  });

  it("draws a tell glyph for every tell an enemy's data names (art-direction §8)", () => {
    const ids = new Set<string>(SPRITES.map((s) => s.id));
    for (const e of Object.values(ENEMIES)) {
      for (const t of e.tells) expect(ids.has(`icon.tell.${t}`), `${e.id}: ${t}`).toBe(true);
    }
  });
});
