import { describe, expect, it } from 'vitest';
import { PALETTE_IDS } from '../palettes/index.ts';
import { defineSprite } from './defineSprite.ts';
import { SPRITES } from './index.ts';
import { SLOT_CHAR, STANDARD_LEGEND } from './legend.ts';
import type { SpriteDef } from './types.ts';
import { mirrorName, validateSprite, validateSprites } from './validate.ts';

/** The sprite ids M1 needs (decisions.md D004, the M1 cut). */
const M1_SPRITES = [
  'tile.grass',
  'tile.path',
  'tile.pad',
  'tile.spawn',
  'prop.core',
  'prop.rock',
  'prop.flora',
  'tower.rivet',
  'tower.rivet_head',
  'tower.thumper',
  'tower.thumper_head',
  'tower.sprinkler',
  'tower.sprinkler_head',
  'enemy.nibbler',
  'enemy.zoomer',
  'enemy.chonk',
  'projectile.rivet_tracer',
  'projectile.thumper_shell',
  'fx.shadow',
  'fx.explosion',
  'fx.orbital_reticle',
];

describe('sprite registry', () => {
  it('has well-formed definitions', () => {
    expect(validateSprites(SPRITES, PALETTE_IDS)).toEqual([]);
  });

  it('covers the M1 cut', () => {
    expect(SPRITES.map((s) => s.id)).toEqual(expect.arrayContaining(M1_SPRITES));
  });

  it('gives every moving actor SE and NE walks mirrored to four facings', () => {
    for (const def of SPRITES as readonly SpriteDef[]) {
      if (!def.id.startsWith('enemy.')) continue;
      expect(Object.keys(def.anims ?? {}).toSorted(), def.id).toEqual([
        'walk_ne',
        'walk_nw',
        'walk_se',
        'walk_sw',
      ]);
    }
  });

  it('gives every tower base t1–t3 frames (plus spec_a/spec_b once it has specs) and a mount', () => {
    for (const def of SPRITES as readonly SpriteDef[]) {
      if (!def.id.startsWith('tower.') || def.id.endsWith('_head')) continue;
      const frames = Object.keys(def.frames);
      const tiers = frames.includes('spec_a')
        ? ['t1', 't2', 't3', 'spec_a', 'spec_b']
        : ['t1', 't2', 't3'];
      expect(frames, def.id).toEqual(tiers);
      expect(def.mount, def.id).toBeDefined();
      expect(
        SPRITES.some((s) => s.id === `${def.id}_head`),
        def.id,
      ).toBe(true);
    }
  });
});

describe('legend', () => {
  it('maps each slot from exactly one character', () => {
    const slots = Object.values(STANDARD_LEGEND);
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots).toHaveLength(21);
    for (const [ch, slot] of Object.entries(STANDARD_LEGEND)) expect(SLOT_CHAR[slot]).toBe(ch);
  });
});

describe('mirrorName', () => {
  it('swaps the facing token', () => {
    expect(mirrorName('walk_se_0')).toBe('walk_sw_0');
    expect(mirrorName('nw')).toBe('ne');
    expect(mirrorName('se_fire')).toBe('sw_fire');
    expect(mirrorName('seed_0')).toBeNull();
  });
});

const base = defineSprite({
  id: 'enemy.test_mite',
  size: { w: 3, h: 2 },
  anchor: { x: 1, y: 2 },
  palette: 'skitterkin',
  frames: { walk_se_0: ['1.2', '0k0'], walk_ne_0: ['111', '0.0'] },
  anims: {
    walk_se: { frames: ['walk_se_0'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
  },
});

function errorsOf(patch: Partial<SpriteDef>): string[] {
  return validateSprite({ ...base, ...patch }, PALETTE_IDS);
}

describe('validateSprite', () => {
  it('accepts a good definition', () => {
    expect(errorsOf({})).toEqual([]);
  });

  it('names the frame, row, and column of grid errors', () => {
    expect(errorsOf({ frames: { a: ['1.2', '0k'] } })).toEqual([
      "enemy.test_mite frame 'a': row 1 is 2 wide, expected 3",
      expect.stringContaining("anim 'walk_se': unknown frame 'walk_se_0'"),
    ]);
    expect(errorsOf({ frames: { ...base.frames, b: ['1.2', '0?0'] } })).toEqual([
      "enemy.test_mite frame 'b': row 1 col 1: '?' is not in the legend",
    ]);
    expect(errorsOf({ frames: { ...base.frames, c: ['1.2'] } })).toEqual([
      "enemy.test_mite frame 'c': has 1 rows, expected 2",
    ]);
  });

  it('allows custom characters only when the legend defines them', () => {
    const frames = { ...base.frames, d: ['1Q2', '0k0'] };
    expect(errorsOf({ frames })).toHaveLength(1);
    expect(errorsOf({ frames, legend: { Q: 'steel.4' } })).toEqual([]);
  });

  it('checks ids, palettes, anchors, patches, mirrors, and cycles', () => {
    expect(errorsOf({ id: 'Enemy.bad' })).toHaveLength(1);
    expect(errorsOf({ id: 'weapon.x' })).toEqual(["weapon.x: unknown category 'weapon'"]);
    expect(errorsOf({ anchor: { x: 9, y: 0 } })).toHaveLength(1);
    const noAct1 = PALETTE_IDS.filter((p) => p !== 'act1');
    expect(validateSprite({ ...base, variants: ['act1'] }, noAct1)).toEqual([
      "enemy.test_mite: unknown palette 'act1'",
    ]);
    const patched = {
      ...base.frames,
      p: { from: 'walk_se_0', patch: { x: 2, y: 1, rows: ['00'] } },
    };
    expect(errorsOf({ frames: patched })).toEqual([
      "enemy.test_mite frame 'p': patch pixel (3, 1) is outside 3×2",
    ]);
    const clash = { ...base.frames, walk_sw_0: ['111', '000'] };
    expect(errorsOf({ frames: clash })).toEqual([
      "enemy.test_mite anim 'walk_sw': mirrored frame 'walk_sw_0' is also authored",
    ]);
    const cycle = { ...base.frames, a: { mirrorOf: 'b' }, b: { from: 'a', patch: [] } };
    expect(errorsOf({ frames: cycle })).toEqual([
      "enemy.test_mite frame 'a': reference cycle",
      "enemy.test_mite frame 'b': reference cycle",
    ]);
  });

  it('flags duplicate ids across the registry', () => {
    expect(validateSprites([base, base], PALETTE_IDS)).toEqual([
      'enemy.test_mite: duplicate sprite id',
    ]);
  });
});
