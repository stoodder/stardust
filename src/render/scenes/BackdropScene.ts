// The animated backdrop behind the DOM menus (architecture.md § Rendering): the night sky over
// Dome Row from vfx/backdropPixels.ts, with twinkling stars and rising stardust motes. Started and
// stopped by the router; it draws nothing else and reads no game state. Honors reduced motion.
import * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import {
  backdropImage,
  backdropLayout,
  moteImage,
  motePosition,
  SHIMMER_CYCLE,
  SHIMMER_STEP_MS,
  TWINKLE_ALPHAS,
  TWINKLE_STEP_MS,
  twinkleImage,
  type BackdropLayout,
} from '../vfx/backdropPixels.ts';
import { prefersReducedMotion } from '../motion.ts';

export const BACKDROP_SCENE_KEY = 'Backdrop';

const SKY_KEY = 'backdrop.sky';
const twinkleKey = (c: ColorName): string => `backdrop.twinkle.${c}`;
const moteKey = (c: ColorName, size: 1 | 2): string => `backdrop.mote.${c}.${size}`;

export class BackdropScene extends Phaser.Scene {
  #layout!: BackdropLayout;
  #twinkles: Phaser.GameObjects.Image[] = [];
  #motes: Phaser.GameObjects.Image[] = [];
  #elapsed = 0;
  #still = false;
  readonly #p = { x: 0, y: 0 };

  constructor() {
    super(BACKDROP_SCENE_KEY);
  }

  create(): void {
    this.#layout = backdropLayout(VIEW_W, VIEW_H);
    this.#still = prefersReducedMotion();
    this.#elapsed = 0;
    this.#registerTextures();
    this.add.image(0, 0, SKY_KEY).setOrigin(0, 0);
    this.#twinkles = this.#layout.twinkles.map((t) =>
      this.add.image(t.x - 2, t.y - 2, twinkleKey(t.color)).setOrigin(0, 0),
    );
    this.#motes = this.#layout.motes.map(
      (m) => this.add.image(m.x, m.y, moteKey(SHIMMER_CYCLE[0]!, m.size)).setOrigin(0, 0), // non-empty
    );
    this.#draw();
  }

  override update(_time: number, delta: number): void {
    if (this.#still) return;
    this.#elapsed += Math.min(delta, 250);
    this.#draw();
  }

  #registerTextures(): void {
    const tex = this.textures;
    if (!tex.exists(SKY_KEY)) tex.addCanvas(SKY_KEY, imageToCanvas(backdropImage(VIEW_W, VIEW_H)));
    for (const t of this.#layout.twinkles) {
      const key = twinkleKey(t.color);
      if (!tex.exists(key)) tex.addCanvas(key, imageToCanvas(twinkleImage(t.color)));
    }
    for (const c of SHIMMER_CYCLE) {
      for (const size of [1, 2] as const) {
        const key = moteKey(c, size);
        if (!tex.exists(key)) tex.addCanvas(key, imageToCanvas(moteImage(c, size)));
      }
    }
  }

  #draw(): void {
    const ms = this.#elapsed;
    const twinkleStep = Math.floor(ms / TWINKLE_STEP_MS);
    this.#layout.twinkles.forEach((t, i) => {
      const alpha = TWINKLE_ALPHAS[(twinkleStep + t.phase) % TWINKLE_ALPHAS.length]!; // mod length
      this.#twinkles[i]!.setAlpha(alpha); // one image per twinkle
    });
    const shimmerStep = Math.floor(ms / SHIMMER_STEP_MS);
    this.#layout.motes.forEach((m, i) => {
      const img = this.#motes[i]!; // one image per mote
      motePosition(m, this.#layout, ms, this.#p);
      img.setPosition(this.#p.x, this.#p.y);
      const color = SHIMMER_CYCLE[(shimmerStep + m.phase) % SHIMMER_CYCLE.length]!; // mod length
      img.setTexture(moteKey(color, m.size));
    });
  }
}
