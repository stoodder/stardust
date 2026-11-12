// The Stardust icon by phase and the gift stone (T843; art-direction § 2's table, § 6 Gift stones).
import { describe, expect, it } from 'vitest';
import { PALETTE_IDS } from '../../palettes/index.ts';
import { ALL_SPRITES } from '../all.ts';
import { propGiftStone } from '../props/gift_stone.ts';
import type { SpriteDef } from '../types.ts';
import { validateSprites } from '../validate.ts';
import {
  SHIMMER_FPS,
  STARDUST_ICON,
  STARDUST_ICONS,
  STARDUST_LEGEND,
  STARDUST_PHASES,
  type StardustPhase,
} from './stardust.ts';

function rows(def: SpriteDef, frame = 'icon'): readonly string[] {
  const f = def.frames[frame];
  if (!Array.isArray(f)) throw new Error(`${def.id} ${frame}: not a grid frame`);
  return f as readonly string[];
}

function icon(phase: StardustPhase): SpriteDef {
  const def = STARDUST_ICONS.find((d) => d.id === STARDUST_ICON[phase]);
  if (def === undefined) throw new Error(phase);
  return def;
}

/** The master colours a frame uses. */
function colors(def: SpriteDef, frame = 'icon'): Set<string> {
  const legend: Readonly<Record<string, string>> = STARDUST_LEGEND;
  return new Set(
    rows(def, frame)
      .join('')
      .split('')
      .filter((ch) => ch !== '.')
      .map((ch) => legend[ch] ?? ch),
  );
}

describe('the Stardust icon (T843)', () => {
  it('validates and is registered: one icon per phase, 6×6 authored (8×8 outlined)', () => {
    expect(validateSprites([...STARDUST_ICONS, propGiftStone], PALETTE_IDS)).toEqual([]);
    const ids = new Set(ALL_SPRITES.map((s) => s.id as string));
    for (const phase of STARDUST_PHASES) {
      expect(ids.has(STARDUST_ICON[phase])).toBe(true);
      expect(icon(phase).size).toEqual({ w: 6, h: 6 });
      expect(Object.keys(icon(phase).frames)).toEqual(['icon']);
    }
    expect(ids.has('prop.gift_stone')).toBe(true);
  });

  it('changes shape as well as colour: the candy gem in Acts I–II, the gift stone from Act III', () => {
    expect(rows(icon('act1'))).not.toEqual(rows(icon('act3')));
    // The candy's white glint; the stone has none, and its hum-glyph is scratched in pink.
    expect(colors(icon('act1')).has('white.1')).toBe(true);
    expect(colors(icon('act3')).has('white.1')).toBe(false);
    expect(colors(icon('act3')).has('pink.3')).toBe(true);
    // Act II's cycle takes a cold edge (violet.4); the stone never does.
    expect(colors(icon('act2')).has('violet.4')).toBe(true);
    expect(colors(icon('act3')).has('violet.4')).toBe(false);
    expect(colors(icon('finale')).has('violet.4')).toBe(false);
  });

  it('sets the gift stone down in the world in the same gold, shimmering at 150 ms a step', () => {
    expect(propGiftStone.size).toEqual({ w: 8, h: 6 });
    expect(propGiftStone.anims?.['shimmer']).toEqual({
      frames: ['sung_0', 'sung_1', 'sung_2'],
      fps: SHIMMER_FPS,
    });
    expect(SHIMMER_FPS).toBeCloseTo(1000 / 150);
    const steps = ['sung_0', 'sung_1', 'sung_2'].map((f) => rows(propGiftStone, f).join('/'));
    expect(new Set(steps).size).toBe(3);
    const c = colors(propGiftStone, 'sung_0');
    expect(c.has('gold.3')).toBe(true);
    expect(c.has('pink.3')).toBe(true);
  });
});
