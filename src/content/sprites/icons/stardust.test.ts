// The Stardust icon by phase and the gift stone (T843; art-direction § 2's table, § 6 Gift stones).
import { describe, expect, it } from 'vitest';
import { PALETTE_IDS } from '../../palettes/index.ts';
import { SPRITES } from '../index.ts';
import { propGiftStone } from '../props/gift_stone.ts';
import type { SpriteDef } from '../types.ts';
import { validateSprites } from '../validate.ts';
import { iconStardust, SHIMMER_FPS, STARDUST_LEGEND, STARDUST_PHASES } from './stardust.ts';

function rows(frame: string, def: SpriteDef = iconStardust): readonly string[] {
  const f = def.frames[frame];
  if (!Array.isArray(f)) throw new Error(`${frame}: not a grid frame`);
  return f as readonly string[];
}

/** The master colours a frame uses. */
function colors(frame: string, def: SpriteDef = iconStardust): Set<string> {
  const legend: Readonly<Record<string, string>> = STARDUST_LEGEND;
  return new Set(
    rows(frame, def)
      .join('')
      .split('')
      .filter((ch) => ch !== '.')
      .map((ch) => legend[ch] ?? ch),
  );
}

describe('the Stardust icon (T843)', () => {
  it('validates, registered with the currency icons, 6×6 authored (8×8 outlined)', () => {
    expect(validateSprites([iconStardust, propGiftStone], PALETTE_IDS)).toEqual([]);
    const ids = SPRITES.map((s) => s.id as string);
    expect(ids).toContain('icon.stardust');
    expect(ids).toContain('prop.gift_stone');
    expect(iconStardust.size).toEqual({ w: 6, h: 6 });
    expect(iconStardust.outline).toBe('auto');
  });

  it('has a still and a three-step shimmer at 150 ms per phase', () => {
    expect(SHIMMER_FPS).toBeCloseTo(1000 / 150);
    for (const phase of STARDUST_PHASES) {
      expect(rows(phase)).toEqual(rows(`${phase}_0`));
      const steps = [0, 1, 2].map((i) => rows(`${phase}_${i}`).join('/'));
      expect(new Set(steps).size).toBe(3);
      expect(iconStardust.anims?.[`shimmer_${phase}`]).toEqual({
        frames: [`${phase}_0`, `${phase}_1`, `${phase}_2`],
        fps: SHIMMER_FPS,
      });
    }
    expect(rows('icon')).toEqual(rows('act1'));
  });

  it('changes shape as well as colour: the candy gem in Acts I–II, the gift stone from Act III', () => {
    expect(rows('act1')).not.toEqual(rows('act3'));
    // The candy's white glint; the stone has none, and its hum-glyph is scratched in pink.
    expect(colors('act1').has('white.1')).toBe(true);
    expect(colors('act3').has('white.1')).toBe(false);
    expect(colors('act3').has('pink.3')).toBe(true);
    // Act II's cycle takes a cold edge (violet.4); the stone's cycles never do.
    expect(colors('act2_0').has('violet.4')).toBe(true);
    for (const p of ['act3', 'finale'] as const) {
      for (let i = 0; i < 3; i++) expect(colors(`${p}_${i}`).has('violet.4')).toBe(false);
    }
  });

  it('sets the gift stone down in the world in the same gold, shimmering', () => {
    expect(propGiftStone.size).toEqual({ w: 8, h: 6 });
    expect(propGiftStone.anims?.['shimmer']).toEqual({
      frames: ['sung_0', 'sung_1', 'sung_2'],
      fps: SHIMMER_FPS,
    });
    const c = colors('sung_0', propGiftStone);
    expect(c.has('gold.3')).toBe(true);
    expect(c.has('pink.3')).toBe(true);
  });
});
