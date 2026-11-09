// The playfield pointer (D059): while a radio line points at a tower (Bricks's "That one's
// Denise."), a gold arrow bobs over it for a few seconds and a gold ring pulses from its tile, so
// the player sees which turret has a name. Drawn in `overlay`, so no tower hides it.
import type * as Phaser from 'phaser';
import { imageToCanvas } from '../sprites/canvas.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { PING_MS, pingArrowImage, pingBob } from '../vfx/pingPixels.ts';
import type { ViewContext } from './ViewContext.ts';

const ARROW_KEY = 'fx.ping_arrow';
/** The arrow's tip sits this far above the tower's ground point (px): over a tier-1 head. */
const TIP_LIFT_PX = 30;

const pos: Vec2 = { x: 0, y: 0 };

export class PingView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #arrow: Phaser.GameObjects.Image;
  /** ms into the ping, or −1 while none shows. */
  #ms = -1;
  #x = 0;
  #y = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    const { scene, layers } = ctx;
    if (!scene.textures.exists(ARROW_KEY)) {
      scene.textures.addCanvas(ARROW_KEY, imageToCanvas(pingArrowImage()));
    }
    this.#arrow = scene.make.image({}, false).setTexture(ARROW_KEY).setOrigin(0.5, 1);
    this.#arrow.setVisible(false);
    layers.overlay.add(this.#arrow);
  }

  /** Whether a ping shows (for the smoke hooks). */
  get showing(): boolean {
    return this.#ms >= 0;
  }

  /** Points at the tower on tile (col, row), standing `liftPx` up (high ground). */
  point(col: number, row: number, liftPx: number): void {
    gridToScreen(col + 0.5, row + 0.5, this.#ctx.origin, pos);
    this.#x = Math.round(pos.x);
    this.#y = Math.round(pos.y) - liftPx - TIP_LIFT_PX;
    this.#ms = 0;
    this.#sync();
  }

  update(deltaMs: number): void {
    if (this.#ms < 0) return;
    this.#ms += Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    if (this.#ms >= PING_MS) {
      this.reset();
      return;
    }
    this.#sync();
  }

  reset(): void {
    this.#ms = -1;
    this.#arrow.setVisible(false);
  }

  #sync(): void {
    const lift = pingBob(this.#ms, this.#reducedMotion());
    this.#arrow.setPosition(this.#x, this.#y - lift).setVisible(true);
  }
}
