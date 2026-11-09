// Palette rules (art-direction §2 and §8), as a validator content validation calls: every slot is
// a master color, the Hollow's reserved hue appears only in Hollow palettes and sprites, and the
// path tile reads against the pad tile in every environment palette. Pure; errors name the
// palette, slot, sprite, or frame.
import { isCustomChar, STANDARD_LEGEND } from '../sprites/legend.ts';
import type { EnvPaletteId, PaletteId, SlotPalette, SpriteDef } from '../sprites/types.ts';
import { contrastRatio, isHollowReserved, luminance } from './color.ts';
import { MASTER, rgbOf, type ColorName } from './master.ts';

/** Path vs pad: at least 1.5:1 luminance contrast (art-direction §8 Tile readability). */
export const MIN_PATH_PAD_CONTRAST = 1.5;
/** The palette (and sprites drawn in it) allowed to use the Hollow's reserved hue. */
const HOLLOW_PALETTE: PaletteId = 'hollow';

export interface PaletteSet {
  readonly palettes: Readonly<Partial<Record<PaletteId, SlotPalette>>>;
  readonly envIds: readonly EnvPaletteId[];
  readonly sprites: readonly SpriteDef[];
}

/** Every palette-rule problem; empty when all hold. */
export function validatePalettes(set: PaletteSet): string[] {
  const errors: string[] = [];
  for (const [id, palette] of Object.entries(set.palettes)) {
    if (palette === undefined) continue;
    for (const [slot, color] of Object.entries(palette)) {
      if (!(color in MASTER)) {
        errors.push(`palette ${id}.${slot}: '${color}' is not a master color`);
      } else if (id !== HOLLOW_PALETTE && isHollowReserved(rgbOf(color))) {
        errors.push(`palette ${id}.${slot}: '${color}' uses the Hollow's reserved hue`);
      }
    }
  }
  for (const def of set.sprites) {
    if (def.palette === HOLLOW_PALETTE) continue;
    for (const [ch, color] of Object.entries(def.legend ?? {})) {
      if (color !== undefined && color in MASTER && isHollowReserved(rgbOf(color))) {
        errors.push(`${def.id} legend '${ch}': '${color}' uses the Hollow's reserved hue`);
      }
    }
  }

  const path = set.sprites.find((s) => s.id === 'tile.path');
  const pad = set.sprites.find((s) => s.id === 'tile.pad');
  if (path === undefined || pad === undefined) {
    errors.push('tile.path and tile.pad must exist (path vs pad contrast)');
    return errors;
  }
  for (const env of set.envIds) {
    const palette = set.palettes[env];
    if (palette === undefined) {
      errors.push(`palette ${env}: environment palette is missing`);
      continue;
    }
    const padL = frameLuminance(pad, 'v0', palette);
    for (const frame of Object.keys(path.frames)) {
      const pathL = frameLuminance(path, frame, palette);
      if (padL === null || pathL === null) {
        errors.push(`palette ${env}: tile.path:${frame} and tile.pad:v0 must be grid frames`);
        continue;
      }
      const ratio = contrastRatio(pathL, padL);
      if (ratio < MIN_PATH_PAD_CONTRAST) {
        errors.push(
          `palette ${env}: tile.path:${frame} vs tile.pad contrast ${ratio.toFixed(2)} is below ${MIN_PATH_PAD_CONTRAST}:1`,
        );
      }
    }
  }
  return errors;
}

/** Mean luminance of a grid frame's opaque pixels (shadow skipped); null if not a grid frame. */
export function frameLuminance(def: SpriteDef, frame: string, palette: SlotPalette): number | null {
  const fd = def.frames[frame];
  if (fd === undefined || !Array.isArray(fd)) return null;
  const rows: readonly string[] = fd;
  let sum = 0;
  let n = 0;
  for (const row of rows) {
    for (const ch of row) {
      const slot = STANDARD_LEGEND[ch];
      const color: ColorName | undefined =
        slot !== undefined
          ? slot === 'shadow'
            ? undefined
            : palette[slot]
          : isCustomChar(ch)
            ? def.legend?.[ch]
            : undefined;
      if (color === undefined || !(color in MASTER)) continue;
      sum += luminance(rgbOf(color));
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}
