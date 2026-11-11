// Everglow Security on the field (T603's minimal view; everglowLook.ts holds the rules and pixels):
// - **The Expediter's haste ring:** each frame, under every unit projecting a haste aura (the
//   sim's `projectedHaste`: alive, not leaving, burrowed or Phased), a solid `orange.3` ring at the
//   aura's radius over an `ink.0` under-stroke, beating bright and dim on the metronome. In
//   `decal`, under the units, centred on the source's body as EnemyView draws it (unitAnchor.ts).
// - **Speed lines** beside the source and every unit a ring is hasting now (`Enemy.auraHastePct`
//   > 0; art-direction §8's `haste_aura` row), in `overlay` so the dark never hides them. No event drives either: they read sim state.
// - **The shutdown** (deathLook.ts `shutdown`): on an `EnemyDied` whose unit shuts down, the
//   power-off line at its body and the price tag dropping to the ground, on real time.
// Allocation-free per frame: rings, lines, and shutdowns are pooled; each radius's two ring
// textures (bright, dim are one texture at two alphas) are registered once.
import type * as Phaser from 'phaser';
import { rgbOf } from '../../content/palettes/master.ts';
import type { CompiledEnemyDef } from '../../content/compiled.ts';
import type { SkitterkinDeath } from '../../content/presentation.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { projectedHaste, type Enemy, type SimEvent } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import {
  HASTE_COLOR,
  HASTE_UNDER,
  metronomeHigh,
  priceTagImage,
  RING_ALPHA_HIGH,
  RING_ALPHA_LOW,
  SHUTDOWN_MS,
  shutdownLine,
  SPEED_LINES_SIZE,
  speedLinesFrame,
  speedLinesImage,
  TAG_HANG_PX,
  TAG_MS,
  tagDrop,
} from './everglowLook.ts';
import { deathStyle } from './deathLook.ts';
import { AIR_LIFT_PX } from './TransientFx.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the view reads it. */
export interface HastePool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

const MAX_RINGS = 8;
const MAX_LINES = 24;
const MAX_SHUTDOWNS = 8;
const LINE_KEYS = ['fx.haste_lines.0', 'fx.haste_lines.1'] as const;
const TAG_KEY = 'fx.price_tag';
/** The speed lines sit this far left of the body's edge (px), at this share of its height. */
const LINES_GAP_PX = 1;
const LINES_AT = 0.55;
/** A dying body's centre over its ground point (px): battleEvents.ts's DEATH_BODY_PX. */
const SHUTDOWN_BODY_PX = 6;
/** The power-off line's colour and rim. */
const SHUTDOWN_COLOR = rgbOf('white.1');
const SHUTDOWN_RIM = rgbOf('ink.0');

interface Ring {
  readonly img: Phaser.GameObjects.Image;
  radius: number;
}

interface Shutdown {
  readonly tag: Phaser.GameObjects.Image;
  active: boolean;
  ms: number;
  /** Screen px: the body's centre (the line, and the tag hangs over it). */
  x: number;
  y: number;
  /** How far the tag falls to lie on the ground (px). */
  fallPx: number;
}

const pos: Vec2 = { x: 0, y: 0 };
const body = blankBox();

export class EverglowView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #anchors: UnitAnchors;
  readonly #rings: Ring[] = [];
  readonly #frames = new Map<number, { key: string; ox: number; oy: number }>();
  readonly #lines: Phaser.GameObjects.Image[] = [];
  readonly #shutdowns: Shutdown[] = [];
  readonly #gfx: Phaser.GameObjects.Graphics;
  #next = 0;
  #lining = 0;
  #tagH = 0;
  /** Shutdowns played since the battle began (the smoke flow's check). */
  shutdownsPlayed = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean, anchors: UnitAnchors = NO_ANCHORS) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#anchors = anchors;
    const textures = ctx.scene.textures;
    for (const [k, key] of LINE_KEYS.entries()) {
      if (!textures.exists(key)) {
        textures.addCanvas(key, imageToCanvas(speedLinesImage(k === 0 ? 0 : 1)));
      }
    }
    const tag = priceTagImage();
    this.#tagH = tag.h;
    if (!textures.exists(TAG_KEY)) textures.addCanvas(TAG_KEY, imageToCanvas(tag));
    for (let i = 0; i < MAX_RINGS; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#rings.push({ img, radius: 0 });
    }
    const half = (SPEED_LINES_SIZE - 1) / 2;
    for (let i = 0; i < MAX_LINES; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      img.setTexture(LINE_KEYS[0]).setDisplayOrigin(SPEED_LINES_SIZE - 1, half);
      ctx.layers.overlay.add(img);
      this.#lines.push(img);
    }
    this.#gfx = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#gfx);
    for (let i = 0; i < MAX_SHUTDOWNS; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      img.setTexture(TAG_KEY).setDisplayOrigin((tag.w - 1) / 2, 0);
      ctx.layers.vfx.add(img);
      this.#shutdowns.push({ tag: img, active: false, ms: 0, x: 0, y: 0, fallPx: 0 });
    }
  }

  /** How many haste rings show (the smoke flow's check). */
  get rings(): number {
    let n = 0;
    for (const r of this.#rings) if (r.img.visible) n++;
    return n;
  }

  /** How many units (sources and hasted units) trail speed lines now (the smoke flow's check). */
  get lines(): number {
    return this.#lining;
  }

  /** How many shutdowns are playing now (the smoke flow's check). */
  get shutdowns(): number {
    let n = 0;
    for (const s of this.#shutdowns) if (s.active) n++;
    return n;
  }

  /**
   * Plays the shutdown for every `EnemyDied` whose unit dies that way on this map (deathLook.ts
   * `shutdown` by the map's Skitterkin dial and the unit's faction), its body lifted as the death
   * effects lift theirs (a flyer's in the air).
   */
  bind(
    bus: Bus<SimEvent<IdSpace>>,
    enemies: { readonly [id: string]: Pick<CompiledEnemyDef, 'faction' | 'layer'> | undefined },
    skitterkin: SkitterkinDeath,
  ): () => void {
    return bus.on('EnemyDied', (e) => {
      const def = Object.hasOwn(enemies, e.enemy) ? enemies[e.enemy] : undefined;
      if (def === undefined || deathStyle(skitterkin, def.faction) !== 'shutdown') return;
      this.shutdown(e.x, e.y, SHUTDOWN_BODY_PX + (def.layer === 'air' ? AIR_LIFT_PX : 0));
    });
  }

  /** A unit shuts down at grid (x, y), its body `liftPx` up: the power-off and the price tag. */
  shutdown(x: number, y: number, liftPx: number): void {
    const s = this.#shutdowns[this.#next]!; // #next < MAX_SHUTDOWNS
    this.#next = (this.#next + 1) % MAX_SHUTDOWNS;
    gridToScreen(x, y, this.#ctx.origin, pos);
    s.x = Math.round(pos.x);
    s.y = Math.round(pos.y - liftPx);
    // Its top hangs TAG_HANG_PX over the body's centre; it comes to rest with its foot on the ground.
    s.fallPx = Math.max(0, Math.round(pos.y) - this.#tagH + 1 - (s.y - TAG_HANG_PX));
    s.ms = 0;
    s.active = true;
    this.shutdownsPlayed++;
    this.#syncShutdown(s);
  }

  update(enemies: HastePool, tick: number, dtMs: number): void {
    const reduced = this.#reducedMotion();
    const alpha = metronomeHigh(tick, reduced) ? RING_ALPHA_HIGH : RING_ALPHA_LOW;
    let r = 0;
    let l = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive) continue;
      const aura = projectedHaste(e);
      const placed = (aura !== null || e.auraHastePct > 0) && this.#anchors.box(e.uid, body);
      if (aura !== null && r < MAX_RINGS) {
        const ring = this.#rings[r++]!; // r < MAX_RINGS
        if (ring.radius !== aura.radiusTiles) {
          const f = this.#frameFor(aura.radiusTiles);
          ring.img.setTexture(f.key).setDisplayOrigin(f.ox, f.oy);
          ring.radius = aura.radiusTiles;
        }
        if (placed) {
          pos.x = body.x;
          pos.y = body.groundY;
        } else {
          gridToScreen(e.x, e.y, this.#ctx.origin, pos);
        }
        ring.img.setPosition(Math.round(pos.x), Math.round(pos.y)).setAlpha(alpha).setVisible(true);
      }
      if ((aura !== null || e.auraHastePct > 0) && placed && l < MAX_LINES) {
        const img = this.#lines[l++]!; // l < MAX_LINES
        const key = LINE_KEYS[speedLinesFrame(tick, e.uid, reduced)];
        if (img.texture.key !== key) img.setTexture(key);
        img
          .setPosition(
            Math.round(body.x - body.halfW - LINES_GAP_PX),
            Math.round(body.top + (body.bottom - body.top) * LINES_AT),
          )
          .setVisible(true);
      }
    }
    for (; r < MAX_RINGS; r++) {
      const ring = this.#rings[r]!; // r < MAX_RINGS
      if (ring.img.visible) ring.img.setVisible(false);
    }
    this.#lining = l;
    for (; l < MAX_LINES; l++) {
      const img = this.#lines[l]!; // l < MAX_LINES
      if (img.visible) img.setVisible(false);
    }
    this.#advance(Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0);
  }

  reset(): void {
    for (const r of this.#rings) r.img.setVisible(false);
    for (const img of this.#lines) img.setVisible(false);
    for (const s of this.#shutdowns) {
      s.active = false;
      s.tag.setVisible(false);
    }
    this.#gfx.clear();
    this.#lining = 0;
  }

  /** Advances the shutdowns by `dt` ms and redraws their power-off lines. */
  #advance(dt: number): void {
    this.#gfx.clear();
    for (const s of this.#shutdowns) {
      if (!s.active) continue;
      s.ms += dt;
      if (s.ms >= Math.max(SHUTDOWN_MS, TAG_MS)) {
        s.active = false;
        s.tag.setVisible(false);
        continue;
      }
      this.#syncShutdown(s);
    }
  }

  #syncShutdown(s: Shutdown): void {
    const line = shutdownLine(s.ms);
    if (line.alpha > 0) {
      const g = this.#gfx;
      const w = 2 * line.halfW + 1;
      g.fillStyle(rgbNum(SHUTDOWN_RIM), line.alpha);
      g.fillRect(s.x - line.halfW - 1, s.y - 1, w + 2, 3);
      g.fillStyle(rgbNum(SHUTDOWN_COLOR), line.alpha);
      g.fillRect(s.x - line.halfW, s.y, w, 1);
    }
    const tag = tagDrop(s.ms, s.fallPx, this.#reducedMotion());
    if (tag.alpha <= 0) {
      s.tag.setVisible(false);
      return;
    }
    s.tag
      .setPosition(s.x, s.y - TAG_HANG_PX + tag.dy)
      .setAlpha(tag.alpha)
      .setVisible(true);
  }

  /** The ring texture for a radius, registered on first use. */
  #frameFor(radiusTiles: number): { key: string; ox: number; oy: number } {
    const r = snapRingRadius(radiusTiles);
    const cached = this.#frames.get(r);
    if (cached !== undefined) return cached;
    const key = `fx.haste_ring.${r}`;
    const ring = ringImage(r, HASTE_COLOR, false, HASTE_UNDER);
    if (!this.#ctx.scene.textures.exists(key)) {
      this.#ctx.scene.textures.addCanvas(key, imageToCanvas(ring.image));
    }
    const f = { key, ox: ring.cx, oy: ring.cy };
    this.#frames.set(r, f);
    return f;
  }
}

function rgbNum(c: { readonly r: number; readonly g: number; readonly b: number }): number {
  return (c.r << 16) | (c.g << 8) | c.b;
}
