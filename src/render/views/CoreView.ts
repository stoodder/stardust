// The core's feedback (D026, D028), drawn over GroundView's static core prop: a leak flashes the
// core white for 2 frames; at low integrity the heart's glow halo turns `red.3` and the orb pulses
// `red.3` ↔ `red.4` at 1 Hz (a steady `red.4` under reduced motion); and while a tower stands on a
// tile the core's sprite hides, the core draws at 60% so the tower shows through. The leak's ring,
// shake, and "−N" are FxView's; the HUD meter has its own flash.
import * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { pulseOn } from '../motion.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';
import { tilesBehind } from './groundTiles.ts';
import type { ViewContext } from './ViewContext.ts';

/** Integrity at or below this turns the core's heart red (art-direction §9: red at 5). */
export const LOW_INTEGRITY = 5;
/** Leak flash: this many rendered frames of white fill. */
const LEAK_FLASH_FRAMES = 2;
/** Stepped alpha (art-direction §7): a core hiding a tower draws at 60%. */
export const OCCLUDING_ALPHA = 0.6;
const CORE = 'prop.core';
const FRAME = 'idle_0';
/** `white.1` as a tint. */
const WHITE = 0xffffff;

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const RED_3 = hex('red.3');
const RED_4 = hex('red.4');

/** A map's grid as CoreView reads it. */
export interface CoreGrid {
  readonly cols: number;
  readonly tiles: readonly string[];
}

/**
 * The low-integrity overlays, cut from the core's glow frame (its emissive heart dilated into a
 * stepped halo; tech-spec § Glow): the heart's pixels (the 60% step) as an opaque orb, and the
 * halo steps, strengthened, as the ring around it. White, to be tinted. Null if the atlas can't be
 * read (the old red-tinted glow frame stands in).
 */
function lowTextures(
  scene: Phaser.Scene,
  sprites: SpriteSource,
): { orb: string; halo: string } | null {
  const orbKey = 'core.low.orb';
  const haloKey = 'core.low.halo';
  if (scene.textures.exists(orbKey) && scene.textures.exists(haloKey)) {
    return { orb: orbKey, halo: haloKey };
  }
  const ref = sprites.glowFrame(CORE, FRAME);
  if (ref === null) return null;
  const fr = scene.textures.getFrame(ref.texture, ref.frame);
  const src: unknown = fr?.source.image;
  if (fr === null || fr === undefined || !(src instanceof HTMLCanvasElement)) return null;
  const pixels = src.getContext('2d')?.getImageData(fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight);
  if (pixels === undefined) return null;
  const w = fr.cutWidth;
  const h = fr.cutHeight;
  const orb = new Uint8ClampedArray(w * h * 4);
  const halo = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const a = pixels.data[i * 4 + 3] ?? 0;
    if (a === 0) continue;
    // The glow pass's steps: 60% on an emissive pixel, 35% and 15% around it.
    const isOrb = a >= 128;
    const out = isOrb ? orb : halo;
    out.fill(255, i * 4, i * 4 + 3);
    out[i * 4 + 3] = isOrb ? 255 : Math.min(255, a * 2.4);
  }
  scene.textures.addCanvas(orbKey, imageToCanvas({ w, h, data: orb }));
  scene.textures.addCanvas(haloKey, imageToCanvas({ w, h, data: halo }));
  return { orb: orbKey, halo: haloKey };
}

const pos: Vec2 = { x: 0, y: 0 };

interface CoreParts {
  /** Tile center (grid units). */
  readonly x: number;
  readonly y: number;
  /** GroundView's prop sprite, or null if the map drew none here. */
  readonly prop: Phaser.GameObjects.Sprite | null;
  readonly flash: Phaser.GameObjects.Image;
  /** Low integrity: the red halo and the pulsing orb (orb null on the fallback). */
  readonly halo: Phaser.GameObjects.Image | null;
  readonly orb: Phaser.GameObjects.Image | null;
  /** Tiles whose tower this core hides (tilesBehind). */
  readonly behind: readonly number[];
}

export class CoreView {
  readonly #reducedMotion: () => boolean;
  readonly #cores: CoreParts[] = [];
  #flashFrames = 0;

  /** `props`: GroundView's core props by tile index (drawGround's result). */
  constructor(
    ctx: ViewContext,
    grid: CoreGrid,
    reducedMotion: () => boolean,
    props: ReadonlyMap<number, Phaser.GameObjects.Sprite> = new Map(),
  ) {
    this.#reducedMotion = reducedMotion;
    const { scene, sprites, layers, origin } = ctx;
    const f = sprites.frame(CORE, FRAME, DEFAULT_VARIANT);
    const a = sprites.frameAnchor(CORE, FRAME);
    const height = sprites.meta(CORE).anchor.y;
    const glow = sprites.glowFrame(CORE, FRAME);
    const ga = glow === null ? null : sprites.frameAnchor(CORE, `${FRAME}@glow`);
    const low = glow === null ? null : lowTextures(scene, sprites);
    const overlay = (texture: string, frame?: string): Phaser.GameObjects.Image => {
      const img = scene.make
        .image({}, false)
        .setTexture(texture, frame)
        .setDisplayOrigin(ga?.x ?? 0, ga?.y ?? 0)
        .setPosition(pos.x, pos.y)
        .setTintMode(Phaser.TintModes.FILL)
        .setVisible(false);
      layers.vfx.add(img);
      return img;
    };
    grid.tiles.forEach((t, i) => {
      if (t !== 'C') return;
      const col = i % grid.cols;
      const row = (i - col) / grid.cols;
      gridToScreen(col + 0.5, row + 0.5, origin, pos);
      const flash = scene.make
        .image({}, false)
        .setTexture(f.texture, f.frame)
        .setDisplayOrigin(a.x, a.y)
        .setPosition(pos.x, pos.y)
        .setTint(WHITE)
        .setTintMode(Phaser.TintModes.FILL)
        .setVisible(false);
      layers.vfx.add(flash);
      let halo: Phaser.GameObjects.Image | null = null;
      let orb: Phaser.GameObjects.Image | null = null;
      if (glow !== null) {
        halo = (low === null ? overlay(glow.texture, glow.frame) : overlay(low.halo)).setTint(
          RED_3,
        );
        if (low !== null) orb = overlay(low.orb).setTint(RED_4);
      }
      this.#cores.push({
        x: col + 0.5,
        y: row + 0.5,
        prop: props.get(i) ?? null,
        flash,
        halo,
        orb,
        behind: tilesBehind(grid, col, row, height),
      });
    });
  }

  /** The core nearest grid point (x, y), for where a leak's effects play; null with no core. */
  nearest(x: number, y: number): { readonly x: number; readonly y: number } | null {
    let best: CoreParts | null = null;
    let bestD = Infinity;
    for (const c of this.#cores) {
      const d = Number.isNaN(x) ? 0 : (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  /** A leak: the core flashes white. */
  leak(): void {
    this.#flashFrames = LEAK_FLASH_FRAMES;
    for (const c of this.#cores) c.flash.setVisible(true);
  }

  /**
   * Once per rendered frame: ends the flash, shows the red heart at low integrity, and fades a
   * core that hides a tower. `towerAtTile`: the sim's tile → tower slot index (−1 for none).
   */
  update(integrity: number, towerAtTile: readonly number[]): void {
    const flashEnds = this.#flashFrames > 0 && --this.#flashFrames === 0;
    const low = integrity <= LOW_INTEGRITY;
    const orbColor = low && !this.#reducedMotion() && pulseOn() ? RED_3 : RED_4;
    for (const c of this.#cores) {
      let hides = false;
      for (const i of c.behind) {
        if ((towerAtTile[i] ?? -1) >= 0) {
          hides = true;
          break;
        }
      }
      const alpha = hides ? OCCLUDING_ALPHA : 1;
      if (c.prop !== null && c.prop.alpha !== alpha) c.prop.setAlpha(alpha);
      if (flashEnds) c.flash.setVisible(false);
      c.flash.setAlpha(alpha);
      c.halo?.setVisible(low).setAlpha(alpha);
      if (c.orb !== null) {
        c.orb.setVisible(low).setAlpha(alpha);
        if (low && c.orb.tintTopLeft !== orbColor) c.orb.setTint(orbColor);
      }
    }
  }
}
