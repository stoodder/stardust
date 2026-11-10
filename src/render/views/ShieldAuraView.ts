// The shield-recharge aura (design/enemies.md § 3 `shield_aura`; art-direction §8: a dashed
// `blue.4` ring; D137: the Aegis Cantor's aura is continuous, not a pulse; T502's minimal view,
// T530a polishes). Each frame, under every unit projecting an aura (the sim's `projectedAura`: alive,
// not leaving or burrowed), a dashed `blue.4` ring at the aura's radius over a 1 px `ink.0`
// under-stroke, its dashes crawling one pixel step every CRAWL_TICKS sim ticks (so it reads
// as always on, unlike a pulse's held, stepping tell; held while paused, steady under reduced
// motion). In `decal`, under the units, centred on the source's body as EnemyView draws it (its
// lane offset; unitAnchor.ts). No event drives it: it reads sim state, like the huddle's ring.
// T530a: every unit the aura is refilling glints (auraLook.ts): a small `white.1`/`blue.4` star at
// the top right of its body, twinkling on the tell step, in `overlay` so the dark never hides it.
// Allocation-free per frame: the rings and glints are pooled, each radius's DASH_PERIOD crawl
// frames are registered once, and the sources' slots go in a fixed scratch array.
import type * as Phaser from 'phaser';
import { projectedAura, type Enemy } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import { auraRefilling, GLINT_SIZE, glintFrame, glintImage } from './auraLook.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the aura view reads it. */
export interface AuraPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

const MAX_RINGS = 8;
const MAX_GLINTS = 16;
/** Aura sources considered at most (more than the rings ever show). */
const MAX_SOURCES = 32;
const GLINT_KEYS = ['fx.aura_glint.0', 'fx.aura_glint.1'] as const;
/** The glint's centre: in from the body's right edge, down from its top (px). */
const GLINT_IN_PX = 2;
const GLINT_DOWN_PX = 3;
const COLOR = 'blue.4';
const UNDER = 'ink.0';
const RING_ALPHA = 1;
/** The ring's dash pattern repeats every this many pixel steps (overlayPixels.ts's 3 on, 2 off). */
export const DASH_PERIOD = 5;
/** Sim ticks per crawl step (5 steps a second at 1×). */
export const CRAWL_TICKS = 12;

/** The crawl frame (0 to DASH_PERIOD − 1) at sim tick `tick`; 0 under reduced motion. */
export function crawlFrame(tick: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return Math.floor(tick / CRAWL_TICKS) % DASH_PERIOD;
}

interface Frames {
  readonly keys: readonly string[];
  readonly ox: number;
  readonly oy: number;
}

interface Ring {
  readonly img: Phaser.GameObjects.Image;
  radius: number;
  frame: number;
}

const pos: Vec2 = { x: 0, y: 0 };
const body = blankBox();

export class ShieldAuraView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #rings: Ring[] = [];
  readonly #frames = new Map<number, Frames>();
  readonly #anchors: UnitAnchors;
  readonly #glints: Phaser.GameObjects.Image[] = [];
  readonly #sources = new Int32Array(MAX_SOURCES);
  #glinting = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean, anchors: UnitAnchors = NO_ANCHORS) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#anchors = anchors;
    for (let i = 0; i < MAX_RINGS; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false).setAlpha(RING_ALPHA);
      ctx.layers.decal.add(img);
      this.#rings.push({ img, radius: 0, frame: -1 });
    }
    const textures = ctx.scene.textures;
    for (const [k, key] of GLINT_KEYS.entries()) {
      if (!textures.exists(key))
        textures.addCanvas(key, imageToCanvas(glintImage(k === 0 ? 0 : 1)));
    }
    const half = (GLINT_SIZE - 1) / 2;
    for (let i = 0; i < MAX_GLINTS; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      img.setTexture(GLINT_KEYS[0]).setDisplayOrigin(half, half);
      ctx.layers.overlay.add(img);
      this.#glints.push(img);
    }
  }

  /** How many refilled units glint now (the smoke flow's check). */
  get glints(): number {
    return this.#glinting;
  }

  /** How many aura rings show (the smoke flow's check). */
  get rings(): number {
    let n = 0;
    for (const r of this.#rings) if (r.img.visible) n++;
    return n;
  }

  update(enemies: AuraPool, tick: number): void {
    const reduced = this.#reducedMotion();
    const frame = crawlFrame(tick, reduced);
    let r = 0;
    let n = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      const aura = projectedAura(e);
      if (aura === null) continue;
      if (n < MAX_SOURCES) this.#sources[n++] = i;
      if (r >= MAX_RINGS) continue;
      const ring = this.#rings[r++]!; // r < MAX_RINGS
      if (ring.radius !== aura.radiusTiles || ring.frame !== frame) {
        const frames = this.#framesFor(aura.radiusTiles);
        ring.img.setTexture(frames.keys[frame]!).setDisplayOrigin(frames.ox, frames.oy); // frame < DASH_PERIOD
        ring.radius = aura.radiusTiles;
        ring.frame = frame;
      }
      if (this.#anchors.box(e.uid, body)) {
        pos.x = body.x;
        pos.y = body.groundY;
      } else {
        gridToScreen(e.x, e.y, this.#ctx.origin, pos);
      }
      ring.img.setPosition(Math.round(pos.x), Math.round(pos.y)).setVisible(true);
    }
    for (; r < MAX_RINGS; r++) {
      const ring = this.#rings[r]!; // r < MAX_RINGS
      if (ring.img.visible) ring.img.setVisible(false);
    }
    this.#syncGlints(enemies, n, tick, reduced);
  }

  /** A glint on every unit the aura is refilling (auraLook.ts), over its drawn body. */
  #syncGlints(enemies: AuraPool, sources: number, tick: number, reduced: boolean): void {
    let g = 0;
    if (sources > 0) {
      for (let i = 0; i < enemies.used && g < MAX_GLINTS; i++) {
        if (!auraRefilling(enemies, i, this.#sources, sources)) continue;
        const e = enemies.items[i]!; // i < used ≤ items.length
        if (!this.#anchors.box(e.uid, body)) continue; // no view placed: nothing to glint on
        const img = this.#glints[g++]!; // g < MAX_GLINTS
        const key = GLINT_KEYS[glintFrame(tick, e.uid, reduced)];
        if (img.texture.key !== key) img.setTexture(key);
        img
          .setPosition(
            Math.round(body.x + body.halfW - GLINT_IN_PX),
            Math.round(body.top + GLINT_DOWN_PX),
          )
          .setVisible(true);
      }
    }
    this.#glinting = g;
    for (; g < MAX_GLINTS; g++) {
      const img = this.#glints[g]!; // g < MAX_GLINTS
      if (img.visible) img.setVisible(false);
    }
  }

  reset(): void {
    for (const r of this.#rings) r.img.setVisible(false);
    for (const g of this.#glints) g.setVisible(false);
    this.#glinting = 0;
  }

  /** The crawl frames for a radius, registered on first use. */
  #framesFor(radiusTiles: number): Frames {
    const r = snapRingRadius(radiusTiles);
    const cached = this.#frames.get(r);
    if (cached !== undefined) return cached;
    const textures = this.#ctx.scene.textures;
    const keys: string[] = [];
    let ox = 0;
    let oy = 0;
    for (let k = 0; k < DASH_PERIOD; k++) {
      const key = `fx.aura.${COLOR}.${r}.${k}`;
      const ring = ringImage(r, COLOR, true, UNDER, k);
      if (!textures.exists(key)) textures.addCanvas(key, imageToCanvas(ring.image));
      keys.push(key);
      ox = ring.cx;
      oy = ring.cy;
    }
    const frames: Frames = { keys, ox, oy };
    this.#frames.set(r, frames);
    return frames;
  }
}
