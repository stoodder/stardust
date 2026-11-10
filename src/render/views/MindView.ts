// The Mindspike's and Stillness's views (T507; mindLook.ts has the rules; T530a's polish):
// - **Unnerved:** a wobbling `violet.4` squiggle over the head of each Unnerved unit (a boss's
//   too: it is interrupted, if not slowed), from the sim's `unnervedTicks`, so it holds while
//   paused and goes the tick the status does. It sits over the body as EnemyView draws it (its
//   lane offset, a flyer's lift; unitAnchor.ts), falling back to the grid point without a view.
//   The body's 1 px jitter is EnemyView's.
// - **Echo Spike:** on EchoBurst, a fast `violet.4` ring out to the echo's radius at the target,
//   with a small `white.1` pop at its heart.
// - **Stillness:** on StasisArea, a pale `blue.4` disc on the ground over the circle it froze,
//   fading over the Stasis's 3 s (render time), and a ring growing out to its edge.
// Allocation-free per frame: a fixed pool of squiggle images in `overlay`, with the tell glyphs.
import type * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, SimEvent } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { discTexture } from '../vfx/overlayTextures.ts';
import {
  ECHO_COLOR,
  ECHO_MS,
  ECHO_POP_COLOR,
  ECHO_POP_MS,
  ECHO_POP_TILES,
  SQUIGGLE_H,
  SQUIGGLE_W,
  squiggleFrame,
  squiggleImage,
  STILLNESS_COLOR,
  STILLNESS_FADE_MS,
  STILLNESS_FILL_ALPHA,
  STILLNESS_RING_MS,
  UNNERVED_GAP_PX,
} from './mindLook.ts';
import { enemyBody, spriteId } from './spriteInfo.ts';
import type { TransientFx } from './TransientFx.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as this view reads it. */
export interface MindPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

const MAX_MARKS = 16;
/** A flyer's body rides this far over its ground point (EnemyView's FLY_LIFT_PX). */
const FLY_LIFT_PX = 12;
const SQUIGGLE_KEYS = ['fx.unnerved.0', 'fx.unnerved.1'] as const;

const pos: Vec2 = { x: 0, y: 0 };
const drawn = blankBox();

export class MindView {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #reducedMotion: () => boolean;
  readonly #anchors: UnitAnchors;
  readonly #marks: Phaser.GameObjects.Image[] = [];
  /** Each body sprite's headroom over its anchor (px), read once per sprite id. */
  readonly #headroom = new Map<string, number>();
  #ms = 0;
  #shown = 0;
  /** Echo bursts and Stillness casts seen since the view was made (the smoke flow's checks). */
  echoes = 0;
  stills = 0;

  constructor(
    ctx: ViewContext,
    fx: TransientFx,
    reducedMotion: () => boolean,
    anchors: UnitAnchors = NO_ANCHORS,
  ) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    this.#anchors = anchors;
    const scene = ctx.scene;
    for (const [i, key] of SQUIGGLE_KEYS.entries()) {
      if (!scene.textures.exists(key)) {
        scene.textures.addCanvas(key, imageToCanvas(squiggleImage(i === 0 ? 0 : 1)));
      }
    }
    for (let i = 0; i < MAX_MARKS; i++) {
      const mark = scene.make.image({}, false).setVisible(false);
      mark.setTexture(SQUIGGLE_KEYS[0]).setDisplayOrigin((SQUIGGLE_W - 1) / 2, SQUIGGLE_H - 1);
      ctx.layers.overlay.add(mark);
      this.#marks.push(mark);
    }
  }

  /** Subscribes to EchoBurst and StasisArea. Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    const offEcho = bus.on('EchoBurst', (ev) => {
      this.echoes++;
      this.#fx.ring(ev.x, ev.y, ev.radiusTiles, ECHO_COLOR, ECHO_MS, true);
      this.#fx.ring(ev.x, ev.y, ECHO_POP_TILES, ECHO_POP_COLOR, ECHO_POP_MS, true);
    });
    const offStill = bus.on('StasisArea', (ev) => {
      this.stills++;
      const scene = this.#ctx.scene;
      const disc = discTexture(scene, ev.radiusTiles, STILLNESS_COLOR, STILLNESS_FILL_ALPHA);
      this.#fx.decal(ev.x, ev.y, disc, STILLNESS_FADE_MS);
      this.#fx.ring(ev.x, ev.y, ev.radiusTiles, STILLNESS_COLOR, STILLNESS_RING_MS, true);
    });
    return () => {
      offEcho();
      offStill();
    };
  }

  /** Each frame: a squiggle over each Unnerved unit. */
  update(dtMs: number, enemies: MindPool): void {
    this.#ms += dtMs;
    const key = SQUIGGLE_KEYS[squiggleFrame(this.#ms, this.#reducedMotion())];
    let n = 0;
    for (let i = 0; i < enemies.used && n < MAX_MARKS; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null || e.unnervedTicks <= 0 || e.burrowed || e.phased) continue;
      const mark = this.#marks[n++]!; // n < MAX_MARKS
      let x: number;
      let top: number;
      if (this.#anchors.box(e.uid, drawn)) {
        x = drawn.x;
        top = drawn.top;
      } else {
        gridToScreen(e.x, e.y, this.#ctx.origin, pos);
        const lift = e.def.layer === 'air' ? FLY_LIFT_PX : 0;
        x = pos.x;
        top = pos.y - lift - this.#headroomOf(enemyBody(e.def.sprites.body, e.tags));
      }
      if (mark.texture.key !== key) mark.setTexture(key);
      mark.setPosition(Math.round(x), Math.round(top - UNNERVED_GAP_PX)).setVisible(true);
    }
    this.#shown = n;
    for (; n < MAX_MARKS; n++) {
      const mark = this.#marks[n]!; // n < MAX_MARKS
      if (mark.visible) mark.setVisible(false);
    }
  }

  /** Squiggles showing now (the smoke flow's check). */
  get unnerved(): number {
    return this.#shown;
  }

  reset(): void {
    for (const m of this.#marks) m.setVisible(false);
    this.#shown = 0;
  }

  #headroomOf(body: string): number {
    let h = this.#headroom.get(body);
    if (h === undefined) {
      h = this.#ctx.sprites.meta(spriteId(body)).anchor.y;
      this.#headroom.set(body, h);
    }
    return h;
  }
}
