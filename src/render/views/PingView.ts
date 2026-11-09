// The playfield pointer (D059, D061): while a radio line points at a tower (Bricks's "That one's
// Denise."), a gold arrow bobs just over its turret head, for the line's whole time on screen (and
// PING_MS at least), and BattleScene pulses a gold ring from its tile, so the player sees which
// turret has a name. Drawn in `overlay`, so no tower hides it.
import type * as Phaser from 'phaser';
import { imageToCanvas } from '../sprites/canvas.ts';
import { PING_GAP_PX, pingArrowImage, pingBob, pingShows } from '../vfx/pingPixels.ts';
import type { ViewContext } from './ViewContext.ts';

const ARROW_KEY = 'fx.ping_arrow';

export class PingView {
  readonly #reducedMotion: () => boolean;
  readonly #arrow: Phaser.GameObjects.Image;
  /** ms into the ping, or −1 while none shows. */
  #ms = -1;
  #x = 0;
  #y = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
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

  /** Points at a tower whose art's top-center is screen (x, top): the tip lands just above it. */
  point(x: number, top: number): void {
    this.#x = Math.round(x);
    this.#y = Math.round(top) - PING_GAP_PX;
    this.#ms = 0;
    this.#sync();
  }

  /** Advances the ping; `held`: the line that points is still up, so the arrow stays. */
  update(deltaMs: number, held: boolean): void {
    if (this.#ms < 0) return;
    this.#ms += Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    if (!pingShows(this.#ms, held)) {
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
