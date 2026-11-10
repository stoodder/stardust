// The Seer's Lantern's minimal view (T508; markLook.ts has the rules; T530a polishes): an eye
// beside the head of each Marked unit, a plain one for a Mark (the beam's, All-Seeing's, Crow's
// Nest's) and Truthlight's filled one while the unit can't evade (`noEvadeTicks`). Read from the
// sim's status fields each frame, so it holds while paused and goes the tick the status does. A
// flyer's sits by its lifted body; a burrowed or Phased unit shows none (nothing reaches it).
// The beam itself is BeamView's (a Lantern's light-beam draws at its first step: no ramp).
// Allocation-free per frame: a fixed pool of eye images in `overlay`, with the tell glyphs.
import type * as Phaser from 'phaser';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { EYE_H, EYE_OFFSET_X, eyeImage, eyeKindOf } from './markLook.ts';
import { enemyBody, spriteId } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as this view reads it. */
export interface MarkPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

/** Enough for an All-Seeing Lantern's crowd (more Marked units than this go unshown). */
const MAX_EYES = 32;
/** A flyer's body rides this far over its ground point (EnemyView's FLY_LIFT_PX). */
const FLY_LIFT_PX = 12;
const EYE_KEYS = { mark: 'fx.mark.eye', truth: 'fx.mark.truth' } as const;

const pos: Vec2 = { x: 0, y: 0 };

export class MarkView {
  readonly #ctx: ViewContext;
  readonly #eyes: Phaser.GameObjects.Image[] = [];
  /** Each body sprite's headroom over its anchor (px), read once per sprite id. */
  readonly #headroom = new Map<string, number>();
  #marked = 0;
  #truth = 0;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    const scene = ctx.scene;
    for (const kind of ['mark', 'truth'] as const) {
      const key = EYE_KEYS[kind];
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, imageToCanvas(eyeImage(kind)));
    }
    for (let i = 0; i < MAX_EYES; i++) {
      const eye = scene.make.image({}, false).setVisible(false);
      eye.setTexture(EYE_KEYS.mark).setDisplayOrigin(0, EYE_H - 1);
      ctx.layers.overlay.add(eye);
      this.#eyes.push(eye);
    }
  }

  /** Each frame: an eye beside each Marked unit's head. */
  update(enemies: MarkPool): void {
    let n = 0;
    let truth = 0;
    for (let i = 0; i < enemies.used && n < MAX_EYES; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null || e.burrowed || e.phased || e.leaving) continue;
      const kind = eyeKindOf(e.markTicks, e.markPct, e.noEvadeTicks);
      if (kind === null) continue;
      if (kind === 'truth') truth++;
      const eye = this.#eyes[n++]!; // n < MAX_EYES
      gridToScreen(e.x, e.y, this.#ctx.origin, pos);
      const lift = e.def.layer === 'air' ? FLY_LIFT_PX : 0;
      const top = pos.y - lift - this.#headroomOf(enemyBody(e.def.sprites.body, e.tags));
      const key = EYE_KEYS[kind];
      if (eye.texture.key !== key) eye.setTexture(key);
      eye.setPosition(Math.round(pos.x + EYE_OFFSET_X), Math.round(top)).setVisible(true);
    }
    this.#marked = n;
    this.#truth = truth;
    for (; n < MAX_EYES; n++) {
      const eye = this.#eyes[n]!; // n < MAX_EYES
      if (eye.visible) eye.setVisible(false);
    }
  }

  /** Eyes showing now, and how many of them are Truthlight's (the smoke flow's checks). */
  get shown(): { readonly marked: number; readonly truth: number } {
    return { marked: this.#marked, truth: this.#truth };
  }

  reset(): void {
    for (const e of this.#eyes) e.setVisible(false);
    this.#marked = 0;
    this.#truth = 0;
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
