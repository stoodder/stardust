// Registers the in-world UI pixels (overlayPixels.ts) as Phaser textures, lazily and once per game:
// range rings per quarter-tile radius and validity, the tile highlights, and the solid pulse rings
// FxView expands from Sprinkler towers.
import type * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { discImage, ringImage, snapRingRadius, tileHighlightImage } from './overlayPixels.ts';
import { textImage } from './pixelFont.ts';

/** Tile highlight styles: hover, the selected tower's tile, and an invalid placement. */
export type HighlightKind = 'hover' | 'selected' | 'invalid';

const HIGHLIGHT_COLOR: Readonly<Record<HighlightKind, ColorName>> = {
  hover: 'white.0',
  selected: 'teal.3',
  invalid: 'red.3',
};

/** Ring colors (art-direction §7): `white.0` when valid, `red.3` when the placement is invalid. */
const RING_COLOR = { valid: 'white.0', invalid: 'red.3' } as const satisfies Record<
  string,
  ColorName
>;

export interface RingTexture {
  readonly key: string;
  /** The display origin that puts the ring's center on the tower's ground point. */
  readonly ox: number;
  readonly oy: number;
}

/** The texture key of a tile highlight, registering it on first use. */
export function highlightTexture(scene: Phaser.Scene, kind: HighlightKind): string {
  const key = `overlay.highlight.${kind}`;
  if (!scene.textures.exists(key)) {
    scene.textures.addCanvas(key, imageToCanvas(tileHighlightImage(HIGHLIGHT_COLOR[kind])));
  }
  return key;
}

const ringOrigins = new Map<string, RingTexture>();

/** A range ring texture for `radiusTiles` (snapped to quarter tiles), registering it on first use. */
export function ringTexture(scene: Phaser.Scene, radiusTiles: number, valid: boolean): RingTexture {
  const r = snapRingRadius(radiusTiles);
  const key = `overlay.ring.${valid ? 'valid' : 'invalid'}.${r}`;
  const cached = ringOrigins.get(key);
  if (cached !== undefined && scene.textures.exists(key)) return cached;
  // An ink.0 under-stroke keeps the ring readable on light ground (D026).
  const ring = ringImage(r, valid ? RING_COLOR.valid : RING_COLOR.invalid, true, 'ink.0');
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, imageToCanvas(ring.image));
  const tex: RingTexture = { key, ox: ring.cx, oy: ring.cy };
  ringOrigins.set(key, tex);
  return tex;
}

/** The Sprinkler's pulse ring color (art-direction §7: the water of the chill spray). */
export const PULSE_COLOR: ColorName = 'blue.4';

/**
 * A solid effect ring texture for `radiusTiles` (snapped to quarter tiles) in `color`, registered
 * once: the Sprinkler's pulse, the core's leak ring, the Thumper's splash ring, build and upgrade
 * rings.
 */
export function effectRingTexture(
  scene: Phaser.Scene,
  radiusTiles: number,
  color: ColorName = PULSE_COLOR,
): RingTexture {
  const r = snapRingRadius(radiusTiles);
  const key = `fx.ring.${color}.${r}`;
  const cached = ringOrigins.get(key);
  if (cached !== undefined && scene.textures.exists(key)) return cached;
  const ring = ringImage(r, color, false);
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, imageToCanvas(ring.image));
  const tex: RingTexture = { key, ox: ring.cx, oy: ring.cy };
  ringOrigins.set(key, tex);
  return tex;
}

/** A filled ellipse decal texture (discImage), registered once per radius, color, alpha, and edge. */
export function discTexture(
  scene: Phaser.Scene,
  radiusTiles: number,
  color: ColorName,
  alpha = 1,
  ditherEdge = false,
): RingTexture {
  const r = snapRingRadius(radiusTiles);
  const key = `fx.disc.${color}.${r}.${alpha}.${ditherEdge ? 'd' : 's'}`;
  const cached = ringOrigins.get(key);
  if (cached !== undefined && scene.textures.exists(key)) return cached;
  const disc = discImage(r, color, alpha, ditherEdge);
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, imageToCanvas(disc.image));
  const tex: RingTexture = { key, ox: disc.cx, oy: disc.cy };
  ringOrigins.set(key, tex);
  return tex;
}

/** Floating-number textures (the 3×5 pixel font), registered once per string and color. */
export function floatTextTexture(scene: Phaser.Scene, text: string, color: ColorName): string {
  const key = `fx.text.${color}.${text}`;
  if (!scene.textures.exists(key))
    scene.textures.addCanvas(key, imageToCanvas(textImage(text, color)));
  return key;
}
