// The sprite gallery's shared kit (app/gallery.ts, app/galleryM6.ts): DOM elements, master colours
// as CSS, the dioramas' sky backdrop (with the moons over a night sky), and the baked glow of a
// frame. DOM-only helpers for the dev page; nothing in the game imports this.
import { ENV_PALETTES, ENV_SKY } from '../content/palettes/env.ts';
import { rgbOf } from '../content/palettes/master.ts';
import type { SpriteId } from '../content/sprites/index.ts';
import type { EnvPaletteId } from '../content/sprites/types.ts';
import type { TileChar } from '../content/types.ts';
import {
  DEFAULT_VARIANT,
  frameKey,
  glowKey,
  type BakedFrame,
  type BakedSprite,
} from '../render/sprites/bake.ts';
import { imageToCanvas } from '../render/sprites/canvas.ts';
import { moonsImage } from '../render/vfx/lighting.ts';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls !== undefined) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** A master colour as a CSS colour. */
export function cssOf(name: Parameters<typeof rgbOf>[0]): string {
  const k = rgbOf(name);
  return `#${((k.r << 16) | (k.g << 8) | k.b).toString(16).padStart(6, '0')}`;
}

export const isTileChar = (c: string): c is TileChar => '#o^+x.SC'.includes(c);

/** Flyers draw this far above their ground point (render/views/EnemyView.ts). */
export const FLY_LIFT_PX = 12;

/** A sprite placed on the ground: its frame, its ground point, and its palette variant. */
export type Placed = readonly [
  spriteId: SpriteId,
  frame: string,
  gx: number,
  gy: number,
  variant?: string,
];

/** The baked additive glow of `id`'s `frame`, if it has one. */
export function glowOf(
  baked: ReadonlyMap<string, BakedSprite>,
  id: SpriteId,
  frame: string,
): BakedFrame | undefined {
  const key = glowKey(frameKey(id, DEFAULT_VARIANT, frame));
  return baked.get(id)?.frames.find((f) => f.key === key);
}

// prettier-ignore
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** The envs whose diorama sky hangs the two moons: the night skies, where they are the light. */
const MOONLIT: ReadonlySet<EnvPaletteId> = new Set(['act3']);

/**
 * The diorama's backdrop: the env's sky gradient as stepped bands across the top (4×4 ordered
 * dither at each seam), over its `shade` below, so palettes that share ground ramps
 * (act2.gold, act2.dusk) still read apart. On a night sky (Act III) the two moons hang in it as
 * the battle sky hangs them (render/vfx/lighting.ts `moonsImage`, art-direction §3).
 */
export function backdrop(
  ctx: CanvasRenderingContext2D,
  env: EnvPaletteId,
  w: number,
  h: number,
): void {
  const sky = ENV_SKY[env];
  const bands = [...sky, ENV_PALETTES[env].outline];
  const bandH = Math.round((h * 0.6) / sky.length);
  // Written as pixels in one ImageData (a fillRect per pixel is slow at the dioramas' size).
  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let y = 0; y < h; y++) {
    const band = Math.min(Math.floor(y / bandH), bands.length - 1);
    const next = Math.min(band + 1, bands.length - 1);
    // Over a band's last 4 rows, the ordered dither steps 0 → 75% into the next band.
    const threshold = Math.max(0, y - band * bandH - (bandH - 4)) * 4;
    const row = BAYER4[y % 4] ?? BAYER4[0];
    const on = rgbOf(bands[band] ?? 'ink.0');
    const off = rgbOf(bands[next] ?? 'ink.0');
    for (let x = 0; x < w; x++) {
      const c = (row[x % 4] ?? 0) < threshold ? off : on;
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (MOONLIT.has(env)) ctx.drawImage(imageToCanvas(moonsImage(w, h)), 0, 0);
}
