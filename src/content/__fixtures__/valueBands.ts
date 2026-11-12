// Value-band helpers shared by the palette tests (content/palettes/palettes.test.ts) and the
// lighting grade's band test (render/vfx/lightingBands.test.ts): the mean luminance of a sprite
// frame's body, or of some of its slots, under a palette, optionally lit by a multiply grade
// (art-direction §1 principle 1, §3; D127, D134). Test-only.
import { contrastRatio, luminance, type RgbLike } from '../palettes/color.ts';
import { PALETTES } from '../palettes/index.ts';
import { rgbOf } from '../palettes/master.ts';
import { ALL_SPRITES } from '../sprites/all.ts';
import { isCustomChar, STANDARD_LEGEND } from '../sprites/legend.ts';
import type { SlotPalette, SpriteDef } from '../sprites/types.ts';

export { contrastRatio };

/** A multiply grade, 0–255 per channel (white: no change). */
export type Grade = RgbLike;
const WHITE: Grade = { r: 255, g: 255, b: 255 };

/** `c` lit by `grade` (a per-channel multiply). */
function lit(c: RgbLike, grade: Grade): RgbLike {
  return { r: (c.r * grade.r) / 255, g: (c.g * grade.g) / 255, b: (c.b * grade.b) / 255 };
}

export function sprite(id: string): SpriteDef {
  const d = ALL_SPRITES.find((s) => s.id === id) as SpriteDef | undefined;
  if (d === undefined) throw new Error(`no sprite ${id}`);
  return d;
}

function gridRows(def: SpriteDef, frame: string): readonly string[] {
  const fd = def.frames[frame];
  if (fd === undefined || !Array.isArray(fd))
    throw new Error(`${def.id}:${frame} is not a grid frame`);
  return fd;
}

/** Mean luminance of a frame's body pixels: no outline, eye, or shadow (the value of its mass). */
export function bodyLuminance(
  def: SpriteDef,
  frame: string,
  palette: SlotPalette,
  grade: Grade = WHITE,
): number {
  let sum = 0;
  let n = 0;
  for (const row of gridRows(def, frame)) {
    for (const ch of row) {
      const slot = STANDARD_LEGEND[ch];
      if (slot === 'outline' || slot === 'eye' || slot === 'shadow') continue;
      const color =
        slot !== undefined ? palette[slot] : isCustomChar(ch) ? def.legend?.[ch] : undefined;
      if (color === undefined) continue;
      sum += luminance(lit(rgbOf(color), grade));
      n++;
    }
  }
  return sum / n;
}

/** Mean luminance of a frame's pixels in `slots` only (an Aelari lattice's knots, its outline). */
export function slotLuminance(
  def: SpriteDef,
  frame: string,
  slots: readonly string[],
  grade: Grade = WHITE,
): number {
  const palette = PALETTES[def.palette];
  let sum = 0;
  let n = 0;
  for (const row of gridRows(def, frame)) {
    for (const ch of row) {
      const slot = STANDARD_LEGEND[ch];
      if (slot === undefined || !slots.includes(slot)) continue;
      sum += luminance(lit(rgbOf(palette[slot]), grade));
      n++;
    }
  }
  return sum / n;
}

/** Act II's unit, ally, and tower bodies that must sit a band above its road (T440c, D127). */
export const ACT2_BAND_ACTORS: readonly (readonly [string, string])[] = [
  // The runners (every Act II Skitterkin flees) and the Act I bodies they're built from.
  ['enemy.nibbler', 'walk_se_0'],
  ['enemy.zoomer', 'walk_se_0'],
  ['enemy.bunchling', 'walk_se_0'],
  ['enemy.elder', 'walk_se_0'],
  ['enemy.digger', 'walk_se_0'],
  ['enemy.youngling', 'walk_se_0'],
  ['enemy.brood_hauler', 'walk_se_0'],
  ['enemy.nibbler_fleeing', 'walk_se_0'],
  ['enemy.zoomer_fleeing', 'walk_se_0'],
  ['enemy.bunchling_fleeing', 'walk_se_0'],
  ['enemy.elder_fleeing', 'walk_se_0'],
  ['enemy.youngling_fleeing', 'walk_se_0'],
  ['enemy.brood_hauler_fleeing', 'walk_se_0'],
  ['enemy.puffwing_fleeing', 'walk_se_0'],
  // Bricks, and the towers Act II builds on its ground.
  ['ally.bricks', 'idle_se_0'],
  ['tower.rivet', 't1'],
  ['tower.thumper', 't1'],
  ['tower.sprinkler', 't1'],
  ['tower.skyhook', 't1'],
  ['tower.zapcoil', 't1'],
  ['tower.lookout', 't1'],
  ['tower.harpoon', 'spec_b'],
  ['tower.crane', 'spec_a'],
  ['prop.salvage_drone', 'fly_0'],
  ['prop.tidybot', 'fly_0'],
];

/** The Mote's frames that must sit well below Act II's ground (the Hollow, Heavy too). */
export const HOLLOW_BAND_FRAMES: readonly string[] = ['walk_se_0', 'walk_ne_0', 'heavy_se_0'];

/** The Aelari frames whose knots must shine over the road inside a rim darker than it. */
export const AELARI_BAND_FRAMES: readonly (readonly [string, string])[] = [
  ['enemy.glimmer', 'walk_se_0'],
  ['enemy.weft_warden', 'walk_se_0'],
  ['enemy.lightwing', 'walk_se_1'],
  ['enemy.glass_witch', 'walk_se_0'],
  ['enemy.glass_witch', 'walk_ne_0'],
  ['enemy.glass_witch', 'tell_se_1'],
];
