// The huddle (design/enemies.md § 3 Huddle; art-direction §8, the `huddle` tell: "allies cluster;
// a soft ring under the group"; T312b). Each frame, for every leader holding at least one ally back
// (an Elder, Chitterbloom in her phase-3 panic): a `gold.4` ring on the ground at its huddle
// radius over a 1 px `ink.0` under-stroke, at 100% stepping to 60%, and a dotted `gold.4` tether
// (2×2 dots, 4 px apart, each over a 1 px `ink.0` under-stroke so it reads on grass and path) from
// each huddled ally (`Enemy.huddleUid`) to it, both pulsing down a step on the shared 1 Hz clock
// (steady under reduced motion; D097). The leader's own flank spots pulse in its sprite. In `decal`, under the units.
// Allocation-free per frame: the rings are pooled, the tethers redrawn into one Graphics.
import type * as Phaser from 'phaser';
import { rgbOf } from '../../content/palettes/master.ts';
import type { Enemy } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { effectRingTexture } from '../vfx/overlayTextures.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the huddle reads it. */
export interface HuddlePool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

const MAX_RINGS = 8;
/** Tether dots: DOT_PX square, one every DOT_STEP_PX along the line. */
const DOT_STEP_PX = 4;
const DOT_PX = 2;
/** The ring never drops under 60% (D097: it has to read on Act I grass). */
const RING_ALPHA = { on: 1, off: 0.6 } as const;
const TETHER_ALPHA = { on: 1, off: 0.6 } as const;
/** The tether dots' under-stroke (a 1 px `ink.0` rim round each dot). */
const UNDER_ALPHA = 0.6;
function hex(name: 'gold.4' | 'ink.0'): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const COLOR = hex('gold.4');
const UNDER = hex('ink.0');

/** The huddle radius `e` leads with now (tiles), or 0: an Elder's, or a boss phase's. */
export function huddleRadius(e: DeepReadonly<Enemy>): number {
  const def = e.def;
  if (def === null || e.leaving || e.burrowed) return 0;
  if (def.huddle !== null) return def.huddle.radiusTiles;
  const phase = def.boss?.phases[e.bossPhase - 1];
  return phase?.huddle?.radiusTiles ?? 0;
}

interface Ring {
  readonly img: Phaser.GameObjects.Image;
  radius: number;
}

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };

export class HuddleView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #pulseOn: () => boolean;
  readonly #gfx: Phaser.GameObjects.Graphics;
  readonly #rings: Ring[] = [];
  /** Huddled allies per pool slot this frame (scratch; grows only with the pool). */
  #held = new Uint16Array(256);

  constructor(ctx: ViewContext, reducedMotion: () => boolean, pulseOn: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#pulseOn = pulseOn;
    this.#gfx = ctx.scene.make.graphics({}, false);
    ctx.layers.decal.add(this.#gfx);
    for (let i = 0; i < MAX_RINGS; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#rings.push({ img, radius: 0 });
    }
  }

  /** How many huddle rings show (the smoke flow's check). */
  get rings(): number {
    let n = 0;
    for (const r of this.#rings) if (r.img.visible) n++;
    return n;
  }

  update(enemies: HuddlePool): void {
    const g = this.#gfx;
    g.clear();
    const on = this.#reducedMotion() || this.#pulseOn();
    if (this.#held.length < enemies.used) this.#held = new Uint16Array(enemies.used * 2);
    const held = this.#held;
    held.fill(0, 0, enemies.used);
    // Tethers: each huddled ally to its leader (found by uid in the pool); the ink under-stroke
    // pass first, then the gold dots over it.
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 0) g.fillStyle(UNDER, on ? UNDER_ALPHA : UNDER_ALPHA * TETHER_ALPHA.off);
      else g.fillStyle(COLOR, on ? TETHER_ALPHA.on : TETHER_ALPHA.off);
      for (let i = 0; i < enemies.used; i++) {
        const e = enemies.items[i]!; // i < used ≤ items.length
        if (!e.alive || e.huddleUid === 0) continue;
        const leader = slotOf(enemies, e.huddleUid);
        if (leader < 0) continue;
        if (pass === 0) held[leader] = (held[leader] ?? 0) + 1;
        const l = enemies.items[leader]!; // slotOf returns a slot < used
        this.#dots(e.x, e.y, l.x, l.y, pass === 0);
      }
    }
    // Rings: under each leader holding someone back.
    let r = 0;
    for (let i = 0; i < enemies.used && r < MAX_RINGS; i++) {
      if ((held[i] ?? 0) === 0) continue;
      const e = enemies.items[i]!; // i < used
      const radius = huddleRadius(e);
      if (radius <= 0) continue;
      const ring = this.#rings[r++]!; // r < MAX_RINGS
      if (ring.radius !== radius) {
        const tex = effectRingTexture(this.#ctx.scene, radius, 'gold.4', 'ink.0');
        ring.img.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
        ring.radius = radius;
      }
      gridToScreen(e.x, e.y, this.#ctx.origin, a);
      ring.img
        .setPosition(Math.round(a.x), Math.round(a.y))
        .setAlpha(on ? RING_ALPHA.on : RING_ALPHA.off)
        .setVisible(true);
    }
    for (; r < MAX_RINGS; r++) {
      const ring = this.#rings[r]!; // r < MAX_RINGS
      if (ring.img.visible) ring.img.setVisible(false);
    }
  }

  reset(): void {
    this.#gfx.clear();
    for (const r of this.#rings) r.img.setVisible(false);
  }

  /** A dotted line between two grid points, on the ground (`under`: the ink rims, 1 px wider). */
  #dots(x0: number, y0: number, x1: number, y1: number, under: boolean): void {
    gridToScreen(x0, y0, this.#ctx.origin, a);
    gridToScreen(x1, y1, this.#ctx.origin, b);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const n = Math.floor(Math.hypot(dx, dy) / DOT_STEP_PX);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const x = Math.round(a.x + dx * t);
      const y = Math.round(a.y + dy * t);
      if (under) this.#gfx.fillRect(x - 1, y - 1, DOT_PX + 2, DOT_PX + 2);
      else this.#gfx.fillRect(x, y, DOT_PX, DOT_PX);
    }
  }
}

/** The pool slot of the live enemy `uid`, or −1. */
function slotOf(enemies: HuddlePool, uid: number): number {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.alive && e.uid === uid) return i;
  }
  return -1;
}
