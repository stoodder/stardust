// Time Dilation's field (core-loop.md § 3.2; D077; T312a): while a `field` zone lives, the whole
// playfield takes a `teal.3` tint (QUILL's teal, the ability icon's clock) in the `lighting` layer,
// over the actors and under the overlay's bars and tells. It opens with a 35% flash and a `teal.4`
// ring sweeping out from the map's middle (the time ripple: a shape, so color is never the only
// signal), holds at 15%, and over its last half second blinks out on sim ticks (steady under
// reduced motion), so it holds while paused. Allocation-free per frame.
import * as Phaser from 'phaser';
import { rgbOf } from '../../content/palettes/master.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import { fieldAlpha } from '../vfx/fxTiming.ts';
import type { ZonePoolLike } from './FxView.ts';
import type { TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The time ripple: a ring out to the map's half-diagonal (capped), over this long. */
const RIPPLE_MS = 600;
const RIPPLE_MAX_TILES = 8;
/** The tint overhangs the view by this much, so the camera shake never shows its edge. */
const OVERHANG_PX = 8;

export class FieldTintView {
  readonly #tint: Phaser.GameObjects.Rectangle;
  readonly #fx: TransientFx;
  readonly #reducedMotion: () => boolean;
  readonly #cx: number;
  readonly #cy: number;
  readonly #rippleTiles: number;
  /** The field zone being drawn (0: none), and its ticksLeft when it opened. */
  #uid = 0;
  #openTicks = 0;
  #alpha = 0;

  constructor(
    ctx: ViewContext,
    cols: number,
    rows: number,
    fx: TransientFx,
    reducedMotion: () => boolean,
  ) {
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    this.#cx = cols / 2;
    this.#cy = rows / 2;
    this.#rippleTiles = Math.min(RIPPLE_MAX_TILES, Math.hypot(cols, rows) / 2);
    const c = rgbOf('teal.3');
    this.#tint = new Phaser.GameObjects.Rectangle(
      ctx.scene,
      -OVERHANG_PX,
      -OVERHANG_PX,
      VIEW_W + 2 * OVERHANG_PX,
      VIEW_H + 2 * OVERHANG_PX,
      (c.r << 16) | (c.g << 8) | c.b,
    );
    this.#tint.setOrigin(0, 0).setVisible(false);
    ctx.layers.lighting.add(this.#tint);
  }

  update(zones: ZonePoolLike): void {
    let field = null;
    for (let i = 0; i < zones.used; i++) {
      const z = zones.items[i]!; // i < used ≤ items.length
      if (z.alive && z.kind === 'field') {
        field = z;
        break;
      }
    }
    if (field === null) {
      if (this.#uid !== 0) this.#tint.setVisible(false);
      this.#uid = 0;
      return;
    }
    if (field.uid !== this.#uid) {
      this.#uid = field.uid;
      this.#openTicks = field.ticksLeft;
      this.#fx.ring(this.#cx, this.#cy, this.#rippleTiles, 'teal.4', RIPPLE_MS, true);
    }
    const alpha = fieldAlpha(
      this.#openTicks - field.ticksLeft,
      field.ticksLeft,
      this.#reducedMotion(),
    );
    if (alpha !== this.#alpha || !this.#tint.visible) {
      this.#alpha = alpha;
      this.#tint.setAlpha(alpha).setVisible(alpha > 0);
    }
  }

  reset(): void {
    this.#uid = 0;
    this.#tint.setVisible(false);
  }
}
