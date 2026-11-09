// Gerald's plink (core-loop.md § 2.7; D072; T312a): every shot aimed at him (`NeutralHit`) bounces
// off with a plink spark on his body (the pure `vfx/sparkPixels.ts` star, three frames in 150 ms,
// drawn in `vfx` at his flying height), and "PLINK!" floats up from him in `white.1`, at most once
// every PLINK_TEXT_MS so a Rivet's stream reads as one complaint, not a stack of them. His chime is
// the audio's (T314). Pooled; allocation-free per frame.
import type * as Phaser from 'phaser';
import { imageToCanvas } from '../sprites/canvas.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { PLINK_CENTER, PLINK_FRAME_MS, PLINK_FRAMES, plinkImages } from '../vfx/sparkPixels.ts';
import type { TransientFx } from './TransientFx.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

const MAX_PLINKS = 8;
/** The "PLINK!" callout: at most one per this many ms, floated from above his rotor. */
const PLINK_TEXT_MS = 700;
const PLINK_TEXT_LIFT_PX = 26;
const KEY = 'fx.plink';

interface Plink {
  active: boolean;
  ms: number;
  frame: number;
  readonly img: Phaser.GameObjects.Image;
}

const pos: Vec2 = { x: 0, y: 0 };

export class PlinkFx {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #plinks: Plink[] = [];
  #next = 0;
  /** ms since the last "PLINK!" callout (starts ready). */
  #sinceText = PLINK_TEXT_MS;
  /** How many plinks have played this battle (the smoke hooks' check). */
  count = 0;

  constructor(ctx: ViewContext, fx: TransientFx) {
    this.#ctx = ctx;
    this.#fx = fx;
    const { scene, layers } = ctx;
    plinkImages().forEach((img, i) => {
      if (!scene.textures.exists(`${KEY}.${i}`)) {
        scene.textures.addCanvas(`${KEY}.${i}`, imageToCanvas(img));
      }
    });
    for (let i = 0; i < MAX_PLINKS; i++) {
      const img = scene.make.image({}, false).setTexture(`${KEY}.0`);
      img.setDisplayOrigin(PLINK_CENTER.x, PLINK_CENTER.y).setVisible(false);
      layers.vfx.add(img);
      this.#plinks.push({ active: false, ms: 0, frame: 0, img });
    }
  }

  /** A shot plinked off a flyer at grid (x, y). */
  plink(x: number, y: number): void {
    this.count++;
    const p = this.#plinks[this.#next]!; // index < MAX_PLINKS
    this.#next = (this.#next + 1) % MAX_PLINKS;
    gridToScreen(x, y, this.#ctx.origin, pos);
    p.img
      .setTexture(`${KEY}.0`)
      .setPosition(Math.round(pos.x), Math.round(pos.y - AIR_LIFT_PX - BODY_LIFT_PX - 2))
      .setVisible(true);
    p.ms = 0;
    p.frame = 0;
    p.active = true;
    if (this.#sinceText >= PLINK_TEXT_MS) {
      this.#sinceText = 0;
      this.#fx.floatText('PLINK!', 'white.1', x, y, PLINK_TEXT_LIFT_PX);
    }
  }

  update(dt: number): void {
    this.#sinceText += dt;
    for (const p of this.#plinks) {
      if (!p.active) continue;
      p.ms += dt;
      const frame = Math.floor(p.ms / PLINK_FRAME_MS);
      if (frame >= PLINK_FRAMES.length) {
        p.active = false;
        p.img.setVisible(false);
      } else if (frame !== p.frame) {
        p.frame = frame;
        p.img.setTexture(`${KEY}.${frame}`);
      }
    }
  }

  reset(): void {
    for (const p of this.#plinks) {
      p.active = false;
      p.img.setVisible(false);
    }
  }
}
