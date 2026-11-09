// Registers the in-world UI pixels (overlayPixels.ts) as Phaser textures, lazily and once per game:
// range rings per quarter-tile radius and validity, the tile highlights, and the solid pulse rings
// FxView expands from Sprinkler towers.
import type * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import {
  discImage,
  ringImage,
  snapRingRadius,
  tileHighlightImage,
  tileTintImage,
} from './overlayPixels.ts';
import { healthStripImage, type HealthStrip } from './healthBar.ts';
import { hexBubbleImage, solidImage, targetBracketImage } from './markPixels.ts';
import { textImage } from './pixelFont.ts';

/** Tile highlight styles: hover, the selected tower's tile, and an invalid placement. */
export type HighlightKind = 'hover' | 'selected' | 'invalid' | 'salvage';

const HIGHLIGHT_COLOR: Readonly<Record<HighlightKind, ColorName>> = {
  hover: 'white.0',
  selected: 'teal.3',
  invalid: 'red.3',
  // Clickable world objects are gold (art-direction § Story and world sprites): a wreck to clear.
  salvage: 'gold.4',
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
  underStroke: ColorName | null = null,
): RingTexture {
  const r = snapRingRadius(radiusTiles);
  const key = `fx.ring.${color}.${r}${underStroke === null ? '' : `.u.${underStroke}`}`;
  const cached = ringOrigins.get(key);
  if (cached !== undefined && scene.textures.exists(key)) return cached;
  const ring = ringImage(r, color, false, underStroke);
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

/** An enemy health bar's strip (healthStripImage: track, HP, or shield), registered once. */
export function healthStripTexture(scene: Phaser.Scene, strip: HealthStrip): string {
  const key = `fx.hbar.${strip}`;
  if (!scene.textures.exists(key))
    scene.textures.addCanvas(key, imageToCanvas(healthStripImage(strip)));
  return key;
}

/** A tile tint texture (tileTintImage), registered once per color, alphas, and stripes. */
export function tileTintTexture(
  scene: Phaser.Scene,
  color: ColorName,
  fillAlpha: number,
  edgeAlpha = 1,
  stripes = false,
): string {
  const key = `fx.tint.${color}.${fillAlpha}.${edgeAlpha}${stripes ? '.stripes' : ''}`;
  if (!scene.textures.exists(key)) {
    const img = tileTintImage(color, fillAlpha, edgeAlpha, stripes);
    scene.textures.addCanvas(key, imageToCanvas(img));
  }
  return key;
}

/** The reticle ring's colors: the reticle sprite's dash ramp (teal), on an ink under-stroke. */
const RETICLE_COLOR: ColorName = 'teal.3';
/** Frames in a marching reticle ring, and how far each shifts the dashes (px). */
const RETICLE_FRAMES = 2;
const RETICLE_SHIFT_PX = 2;
/** The reticle sprite marches at 6 fps (content/sprites/fx/orbital_reticle.ts). */
const RETICLE_FPS = 6;

/**
 * A marching dashed reticle ring for a strike of `radiusTiles` (snapped to quarter tiles) that the
 * baked `fx.orbital_reticle` doesn't fit (Orbital Strike Mk II's 2 tiles): two frames registered
 * once, and an anim playing them. Returns the anim key and the ring's center.
 */
export function reticleRingAnim(scene: Phaser.Scene, radiusTiles: number): RingTexture {
  const r = snapRingRadius(radiusTiles);
  const key = `fx.reticle.${r}`;
  const frames: { key: string }[] = [];
  let center: { cx: number; cy: number } | null = null;
  for (let f = 0; f < RETICLE_FRAMES; f++) {
    const fk = `${key}.${f}`;
    const ring = ringImage(r, RETICLE_COLOR, true, 'ink.0', f * RETICLE_SHIFT_PX);
    if (!scene.textures.exists(fk)) scene.textures.addCanvas(fk, imageToCanvas(ring.image));
    center = { cx: ring.cx, cy: ring.cy };
    frames.push({ key: fk });
  }
  if (!scene.anims.exists(key)) {
    scene.anims.create({ key, frames, frameRate: RETICLE_FPS, repeat: -1 });
  }
  return { key, ox: center?.cx ?? 0, oy: center?.cy ?? 0 };
}

/** A body-sized shield bubble (markPixels.ts), registered once per body size. */
export function bubbleTexture(scene: Phaser.Scene, bodyW: number, bodyH: number): string {
  const key = `fx.bubble.${bodyW}x${bodyH}`;
  if (!scene.textures.exists(key)) {
    scene.textures.addCanvas(key, imageToCanvas(hexBubbleImage(bodyW, bodyH)));
  }
  return key;
}

/** A body-sized Revealed target bracket (markPixels.ts), registered once per body size. */
export function bracketTexture(scene: Phaser.Scene, bodyW: number, bodyH: number): string {
  const key = `fx.bracket.${bodyW}x${bodyH}`;
  if (!scene.textures.exists(key)) {
    scene.textures.addCanvas(key, imageToCanvas(targetBracketImage(bodyW, bodyH)));
  }
  return key;
}

/** A white debris pixel (1 or 2 px square), tinted per particle, registered once. */
export function debrisTexture(scene: Phaser.Scene, size: 1 | 2): string {
  const key = `fx.debris.${size}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, imageToCanvas(solidImage(size)));
  return key;
}
