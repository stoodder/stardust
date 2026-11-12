// Dawn's light on the actors (art-direction.md §3 *Finale*: "highlights go gold and cyan"; M9,
// T901; the rules are dawnRimLook.ts). From the sun's first step (SongNightView `sunStep`) every
// actor standing in the morning (east of the sun's front, songNightPixels `isSunlit`) in `world`
// and `air` wears a gold rim on its sun side and a fainter cyan one along its top: fill-tinted
// copies of its frame as drawn this frame, a pixel off, sorted just under it. The actors' own
// pixels never change. Off a song map, and before Dawn, it draws nothing. Allocation-free per
// frame: the copies are pooled and follow their bodies' frames, flips and origins.
import * as Phaser from 'phaser';
import { rgbOf } from '../../content/palettes/master.ts';
import { screenToGrid, type Vec2 } from '../iso.ts';
import { isSunlit } from '../vfx/songNightPixels.ts';
import {
  DAWN_RIM_UNDER,
  DAWN_RIMS,
  hasNoDawnRim,
  MAX_DAWN_RIMMED,
  takesDawnRim,
} from './dawnRimLook.ts';
import { isScenery } from './scenery.ts';
import type { ViewContext } from './ViewContext.ts';

type Body = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

const at: Vec2 = { x: 0, y: 0 };

/** A reusable candidate record (allocation-free). */
const cand: {
  visible: boolean;
  alpha: number;
  blendMode: number | string;
  tintMode: number;
  frameName: string;
  scenery: boolean;
  noRim: boolean;
} = {
  visible: false,
  alpha: 0,
  blendMode: 0,
  tintMode: 0,
  frameName: '',
  scenery: false,
  noRim: false,
};

const TINTS = DAWN_RIMS.map((r) => {
  const c = rgbOf(r.color);
  return (c.r << 16) | (c.g << 8) | c.b;
});

export class DawnRimView {
  readonly #ctx: ViewContext;
  readonly #cols: number;
  /** Each layer's rims, pooled (DAWN_RIMS.length per actor), and how many show. */
  readonly #rims = new Map<Phaser.GameObjects.Layer, Phaser.GameObjects.Image[]>();
  #shown = 0;
  /** The bodies rimmed this frame (the smoke hooks' count). */
  #rimmed = 0;
  /** Marked no-rim objects showing this frame, passed over (the smoke hooks' count; C5). */
  #passed = 0;

  constructor(ctx: ViewContext, cols: number) {
    this.#ctx = ctx;
    this.#cols = cols;
  }

  /** Actors rimmed on the last frame (0 before Dawn and off a song map). */
  get rimmed(): number {
    return this.#rimmed;
  }

  /** PlacementView's ghosts and raised highlights showing on the last frame, left unrimmed (C5). */
  get passedOver(): number {
    return this.#passed;
  }

  /** One frame, at the sun's step (`SongNightView.sunStep`: ≤ 0 before Dawn or with no night). */
  update(sunStep: number): void {
    if (sunStep <= 0) {
      if (this.#shown > 0 || this.#rimmed > 0) this.#hideFrom(0);
      this.#passed = 0;
      return;
    }
    let n = 0;
    let rimmed = 0;
    let passed = 0;
    for (const layer of [this.#ctx.layers.world, this.#ctx.layers.air]) {
      const pool = this.#pool(layer);
      let used = 0;
      const list = layer.list;
      const count = list.length;
      for (let i = 0; i < count && rimmed < MAX_DAWN_RIMMED; i++) {
        const obj = list[i]!; // i < count ≤ length (rims added below land past `count`)
        // Its own rims are fill-tinted, so `takesDawnRim` passes over them.
        if (!isBody(obj)) continue;
        cand.visible = obj.visible;
        cand.alpha = obj.alpha;
        cand.blendMode = obj.blendMode;
        cand.tintMode = obj.tintMode;
        cand.frameName = obj.frame.name;
        cand.scenery = isScenery(obj);
        cand.noRim = hasNoDawnRim(obj);
        if (!takesDawnRim(cand)) {
          if (cand.noRim && obj.visible) passed++;
          continue;
        }
        screenToGrid(obj.x, obj.y, this.#ctx.origin, at);
        if (!isSunlit(at.x, this.#cols, sunStep)) continue;
        rimmed++;
        for (let k = 0; k < DAWN_RIMS.length; k++) {
          const rim = DAWN_RIMS[k]!; // k < length
          const img = this.#rim(layer, pool, used++, k);
          img
            .setTexture(obj.texture.key, obj.frame.name)
            .setFlip(obj.flipX, obj.flipY)
            .setScale(obj.scaleX, obj.scaleY)
            .setDisplayOrigin(obj.displayOriginX, obj.displayOriginY)
            .setPosition(obj.x + rim.dx, obj.y + rim.dy)
            .setDepth(obj.depth - DAWN_RIM_UNDER)
            .setAlpha(obj.alpha * rim.alpha)
            .setVisible(true);
        }
      }
      for (let k = used; k < pool.length; k++) {
        const img = pool[k]!; // k < length
        if (img.visible) img.setVisible(false);
      }
      n += used;
    }
    this.#shown = n;
    this.#rimmed = rimmed;
    this.#passed = passed;
  }

  reset(): void {
    this.#hideFrom(0);
  }

  #pool(layer: Phaser.GameObjects.Layer): Phaser.GameObjects.Image[] {
    let pool = this.#rims.get(layer);
    if (pool === undefined) {
      pool = [];
      this.#rims.set(layer, pool);
    }
    return pool;
  }

  /** Rim `i` of `layer`'s pool (made on first use, filled `DAWN_RIMS[k]`'s colour). */
  #rim(
    layer: Phaser.GameObjects.Layer,
    pool: Phaser.GameObjects.Image[],
    i: number,
    k: number,
  ): Phaser.GameObjects.Image {
    let img = pool[i];
    if (img === undefined) {
      img = this.#ctx.scene.make.image({}, false);
      layer.add(img);
      pool.push(img);
    }
    const tint = TINTS[k]!; // k < DAWN_RIMS.length
    if (img.tintTopLeft !== tint || img.tintMode !== Phaser.TintModes.FILL) {
      img.setTint(tint).setTintMode(Phaser.TintModes.FILL);
    }
    return img;
  }

  #hideFrom(n: number): void {
    for (const pool of this.#rims.values()) {
      for (let k = n; k < pool.length; k++) {
        const img = pool[k]!; // k < length
        if (img.visible) img.setVisible(false);
      }
    }
    this.#shown = n;
    this.#rimmed = 0;
  }
}

/** A drawn body (an Image or a Sprite: Phaser 4's Sprite isn't an Image). */
function isBody(obj: Phaser.GameObjects.GameObject): obj is Body {
  return obj instanceof Phaser.GameObjects.Image || obj instanceof Phaser.GameObjects.Sprite;
}
