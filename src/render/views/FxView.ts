// Event-driven effects (art-direction §7). BattleScene feeds them from sim events and calls
// `update` once per rendered frame. The pooled transient effects (tracers, rings, bursts, decals,
// floating numbers, the shake) are TransientFx's, which this extends with the abilities' effects,
// also pooled, so nothing here allocates per frame either. Cosmetic and on real time, except the
// Orbital Strike's reticle, which lasts exactly as long as its sim zone (so it holds while paused).
// - Orbital Strike: fx.orbital_reticle while the zone counts down (and at the pointer while aiming),
//   then a white-cored beam from the top of the screen, a ground flash at the strike's radius, a
//   big center burst inside a rolling ring of bursts, a scorch decal, and a 2 px screen shake
//   (skipped under reduced motion).
//   The reticle fits the strike's real radius (`abilityStats`: Mk II's 2 tiles get a marching
//   ring of their own, since the baked sprite is 1.5 tiles).
// - Suppressing Fire (T207b): while its path tile is aimed, the segment it would cover (the sim's
//   `segmentSpan`) is tinted on the ground; while a segment zone lives, its tiles flicker in a warm
//   ground strip and tracer streaks rake it from Bricks's post (or from off the map without him).
//   The strip sorts in `world` over the enemies it pins and under towers (T232, `stripDepth`).
import type * as Phaser from 'phaser';
import { rgbOf } from '../../content/palettes/master.ts';
import { pointAt, type Point, type Zone } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { stripDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import {
  BEAM_MS,
  beamCore,
  beamWidth,
  fadeAlpha,
  SCORCH_MS,
  SCORCH_TILES,
  STRIKE_FLASH_MS,
  RETICLE_SPRITE_TILES,
  STRIKE_BURSTS,
  STRIKE_MS,
  SUPPRESS_TRACER_MS,
  suppressAlpha,
} from '../vfx/fxTiming.ts';
import { discTexture, reticleRingAnim, tileTintTexture } from '../vfx/overlayTextures.ts';
import { BODY_LIFT_PX, TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The zone pool as render reads it. */
export interface ZonePoolLike {
  readonly used: number;
  readonly items: readonly DeepReadonly<Zone>[];
}

/** Pool sizes: a 5th live strike reuses the first slot. */
const MAX_STRIKES = 4;
/** Live Suppressing Fire zones drawn at once (one per ground route through the tile), and tiles each. */
const MAX_SEGMENTS = 4;
const MAX_SEGMENT_TILES = 5;
/** Tiles in the aiming preview (a segment on up to four routes). */
const MAX_PREVIEW_TILES = 12;

/**
 * Suppressing Fire's strip and its aiming preview (Kinetic's warm color, art-direction §7). The
 * live strip is hazard-striped at 50% and drawn in `world`, each tile sorted just in front of the
 * enemies on it (D059: over the units it pins) and behind any tower or high ground in front of it
 * (T232: the strip lies on the ground, so it never covers a tower beside the path).
 */
const SUPPRESS_TINT = { color: 'orange.3', fill: 0.5, edge: 1 } as const;
/** The preview: the same hazard stripes in the lighter orange, held still (no flicker, no fire). */
const PREVIEW_TINT = { color: 'orange.4', fill: 0.6, edge: 1 } as const;
const PREVIEW_ALPHA = 1;
/** Where a streak lands: a small spark ring, held, that fades in steps (ms). */
const SPARK_TILES = 0.25;
const SPARK_MS = 150;
/** Without Bricks on the map, the streaks come in from this far up-screen (px) of where they land. */
const OFFMAP_SOURCE_PX = { x: -48, y: -72 } as const;
/** Streaks land up to this far (tiles) to either side of the path's center line. */
const SUPPRESS_SPREAD_TILES = 0.35;
/** The aim reticle's alpha (the placement-ghost step, art-direction §7). */
const AIM_ALPHA = 0.6;

const C = {
  beamEdge: hex('teal.3'),
  beamCore: hex('white.1'),
  beamGlow: hex('teal.4'),
};

function hex(name: Parameters<typeof rgbOf>[0]): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}

/** A live Suppressing Fire zone's strip: its tiles' tints and its tracer cadence. */
interface Segment {
  /** The sim zone's uid, or 0 when free. */
  zoneUid: number;
  /** The last update that found its zone alive. */
  seen: number;
  ms: number;
  /** ms until its next tracer streak. */
  nextMs: number;
  /** The zone's ticksLeft last frame: streaks fly only while the sim runs (not while paused). */
  lastTicks: number;
  tiles: Phaser.GameObjects.Image[];
  shown: number;
}

interface Strike {
  /** The sim zone's uid while the reticle shows; 0 once it has landed (or when free). */
  zoneUid: number;
  /** ms since impact, or −1 before it. */
  ms: number;
  x: number;
  y: number;
  radiusTiles: number;
  reticle: Phaser.GameObjects.Sprite;
}

const pos: Vec2 = { x: 0, y: 0 };
const onRoute: Point = { x: 0, y: 0 };

export class FxView extends TransientFx {
  readonly #strikes: Strike[] = [];
  readonly #segments: Segment[] = [];
  readonly #preview: Phaser.GameObjects.Image[] = [];
  readonly #aim: Phaser.GameObjects.Sprite;
  /** The aim reticle's radius as last drawn (tiles), so it re-textures only on a change. */
  #aimRadius = -1;
  /**
   * Called with each Suppressing Fire streak's landing (grid), so the scene can flash Bricks's
   * muzzle toward it (D059); null without him.
   */
  onRake: ((x: number, y: number) => void) | null = null;
  /** Where Suppressing Fire's streaks start (Bricks's muzzle, screen px), or NaN without him. */
  #fireX = Number.NaN;
  #fireY = Number.NaN;
  /** Cosmetic RNG for where streaks land (never the sim's). */
  #seed = 0x2f6b;
  #frame = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    super(ctx, reducedMotion);
    const { scene, layers, sprites } = ctx;
    const ret = sprites.meta('fx.orbital_reticle').anchor;
    const retFrame = sprites.frame('fx.orbital_reticle', 'march_0');
    const makeReticle = (): Phaser.GameObjects.Sprite => {
      const s = scene.make.sprite({}, false);
      s.setTexture(retFrame.texture, retFrame.frame).setDisplayOrigin(ret.x, ret.y);
      s.setVisible(false);
      layers.decal.add(s);
      return s;
    };
    for (let i = 0; i < MAX_STRIKES; i++) {
      this.#strikes.push({
        zoneUid: 0,
        ms: -1,
        x: 0,
        y: 0,
        radiusTiles: 0,
        reticle: makeReticle(),
      });
    }
    this.#aim = makeReticle().setAlpha(AIM_ALPHA);
    const tint = tileTintTexture(
      scene,
      SUPPRESS_TINT.color,
      SUPPRESS_TINT.fill,
      SUPPRESS_TINT.edge,
      true,
    );
    const tileImage = (key: string, layer = layers.decal): Phaser.GameObjects.Image => {
      const img = scene.make.image({}, false).setTexture(key).setOrigin(0.5, 0.5).setVisible(false);
      layer.add(img);
      return img;
    };
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const tiles = Array.from({ length: MAX_SEGMENT_TILES }, () => tileImage(tint, layers.world));
      this.#segments.push({
        zoneUid: 0,
        seen: 0,
        ms: 0,
        nextMs: 0,
        lastTicks: -1,
        tiles,
        shown: 0,
      });
    }
    const preview = tileTintTexture(
      scene,
      PREVIEW_TINT.color,
      PREVIEW_TINT.fill,
      PREVIEW_TINT.edge,
      true,
    );
    for (let i = 0; i < MAX_PREVIEW_TILES; i++) {
      this.#preview.push(tileImage(preview).setAlpha(PREVIEW_ALPHA));
    }
  }

  /**
   * An Orbital Strike cast: the reticle shows on (x, y) while the sim zone `zoneUid` lives; the
   * landing flashes the ground out to `radiusTiles`.
   */
  strike(zoneUid: number, x: number, y: number, radiusTiles: number): void {
    let s = this.#strikes.find((k) => k.zoneUid === 0 && k.ms < 0);
    s ??= this.#strikes[0]!; // MAX_STRIKES > 0; a 5th live strike reuses the first
    s.zoneUid = zoneUid;
    s.ms = -1;
    s.x = x;
    s.y = y;
    s.radiusTiles = radiusTiles;
    gridToScreen(x, y, this.ctx.origin, pos);
    s.reticle.setPosition(pos.x, pos.y).setAlpha(1).setVisible(true);
    this.#playReticle(s.reticle, radiusTiles);
  }

  /**
   * The aim reticle, sized to the strike's `radiusTiles`, on tile (col, row) while the player
   * targets a strike; col < 0 hides it.
   */
  setAim(col: number, row: number, radiusTiles = RETICLE_SPRITE_TILES): void {
    if (col < 0) {
      if (this.#aim.visible) this.#aim.stop().setVisible(false);
      this.#aimRadius = -1;
      return;
    }
    gridToScreen(col + 0.5, row + 0.5, this.ctx.origin, pos);
    this.#aim.setPosition(pos.x, pos.y);
    if (!this.#aim.visible || radiusTiles !== this.#aimRadius) {
      this.#aim.setVisible(true);
      this.#playReticle(this.#aim, radiusTiles);
      this.#aimRadius = radiusTiles;
    }
  }

  /**
   * The aiming preview of a segment ability (Suppressing Fire): tints the first `count` tiles of
   * `tiles` (col, row pairs, flat); 0 hides it.
   */
  setSegmentAim(tiles: readonly number[], count: number): void {
    const n = Math.min(count, MAX_PREVIEW_TILES);
    for (let i = 0; i < MAX_PREVIEW_TILES; i++) {
      const img = this.#preview[i]!; // i < MAX_PREVIEW_TILES
      if (i >= n) {
        if (img.visible) img.setVisible(false);
        continue;
      }
      gridToScreen((tiles[2 * i] ?? 0) + 0.5, (tiles[2 * i + 1] ?? 0) + 0.5, this.ctx.origin, pos);
      img.setPosition(pos.x, pos.y).setVisible(true);
    }
  }

  /** Where Suppressing Fire's streaks start: Bricks's muzzle (screen px), or NaN without him. */
  setFireSource(x: number, y: number): void {
    this.#fireX = x;
    this.#fireY = y;
  }

  /** Plays the marching reticle on `s` at `radiusTiles`: the baked sprite, or a ring that fits. */
  #playReticle(s: Phaser.GameObjects.Sprite, radiusTiles: number): void {
    const { sprites, scene } = this.ctx;
    if (Math.abs(radiusTiles - RETICLE_SPRITE_TILES) < 1e-6) {
      const a = sprites.meta('fx.orbital_reticle').anchor;
      s.play(sprites.anim('fx.orbital_reticle', 'march'), true).setDisplayOrigin(a.x, a.y);
      return;
    }
    const ring = reticleRingAnim(scene, radiusTiles);
    s.play(ring.key, true).setDisplayOrigin(ring.ox, ring.oy);
  }

  /** Advances every effect by a frame of `deltaMs` and redraws. `zones` is the sim's zone pool. */
  update(deltaMs: number, zones: ZonePoolLike): void {
    const dt = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    this.advance(dt);
    for (const s of this.#strikes) this.#updateStrike(s, dt, zones);
    this.#updateSegments(dt, zones);
    this.updateShake(dt);
  }

  /** Hides everything and resets the camera (the scene is shutting down). */
  reset(): void {
    this.resetTransient();
    for (const s of this.#strikes) {
      s.zoneUid = 0;
      s.ms = -1;
      s.reticle.stop().setVisible(false);
    }
    for (const g of this.#segments) this.#freeSegment(g);
    this.setSegmentAim([], 0);
  }

  #updateStrike(s: Strike, dt: number, zones: ZonePoolLike): void {
    if (s.zoneUid !== 0) {
      if (zoneAlive(zones, s.zoneUid)) return; // still counting down: the reticle marches on
      // The zone resolved this frame: the strike lands.
      s.zoneUid = 0;
      s.ms = 0;
      s.reticle.stop().setVisible(false);
      const scene = this.ctx.scene;
      // The scorch first, so the flash draws over it; both sit under the actors (decal layer).
      this.decal(s.x, s.y, discTexture(scene, SCORCH_TILES, 'ink.0', 0.6, true), SCORCH_MS);
      this.decal(s.x, s.y, discTexture(scene, s.radiusTiles, 'teal.4', 0.6), STRIKE_FLASH_MS);
      this.ring(s.x, s.y, s.radiusTiles, 'white.1', STRIKE_FLASH_MS, false);
      for (const b of STRIKE_BURSTS) this.burst(s.x + b.dx, s.y + b.dy, b.delayMs);
      // A big center: two more bursts just off the middle, a beat later.
      this.burst(s.x - 0.2, s.y + 0.1, 30);
      this.burst(s.x + 0.2, s.y - 0.1, 70);
      this.strikeShake();
    }
    if (s.ms < 0) return;
    this.#drawBeam(s);
    s.ms += dt;
    if (s.ms >= STRIKE_MS) s.ms = -1;
  }

  #drawBeam(s: Strike): void {
    const w = beamWidth(s.ms);
    if (w <= 0) return;
    gridToScreen(s.x, s.y, this.ctx.origin, pos);
    const x = Math.round(pos.x);
    const bottom = Math.round(pos.y);
    const top = Math.round(this.ctx.scene.cameras.main.scrollY) - 8;
    const h = bottom - top;
    const g = this.gfx;
    // Teal edges around a white core (art-direction §7, Energy beams), all whole pixels.
    g.fillStyle(C.beamEdge, fadeAlpha(s.ms / BEAM_MS));
    g.fillRect(x - w / 2, top, w, h);
    const core = beamCore(w);
    g.fillStyle(C.beamCore, 1);
    g.fillRect(x - core / 2, top, core, h);
    // The flash where it meets the ground: a flat 2:1 slab.
    g.fillStyle(C.beamGlow, 1);
    g.fillRect(x - w, bottom - 2, 2 * w, 4);
    g.fillStyle(C.beamCore, 1);
    g.fillRect(x - w / 2, bottom - 1, w, 2);
  }

  /**
   * Draws every live Suppressing Fire zone: its covered tiles tinted (flickering, then fading as
   * the zone runs out), and a tracer streak raking a random spot on it every SUPPRESS_TRACER_MS.
   * Allocation-free.
   */
  #updateSegments(dt: number, zones: ZonePoolLike): void {
    const frame = ++this.#frame;
    const reduced = this.reducedMotion();
    for (let i = 0; i < zones.used; i++) {
      const z = zones.items[i]!; // i < used ≤ items.length
      if (!z.alive || z.kind !== 'segment' || z.route === null) continue;
      let g = this.#segmentFor(z.uid);
      if (g === null) {
        g = this.#segmentFor(0);
        if (g === null) continue; // more live segments than slots: the extra goes undrawn
        this.#openSegment(g, z);
      }
      g.seen = frame;
      // The strip holds still while the sim is paused (its zone's clock stopped): no flicker, no
      // streaks. A long frame (a background tab) catches up at most a few streaks.
      const running = z.ticksLeft !== g.lastTicks;
      g.lastTicks = z.ticksLeft;
      if (!running) continue;
      g.ms += dt;
      const alpha = suppressAlpha(g.ms, z.ticksLeft, reduced);
      for (let t = 0; t < g.shown; t++) g.tiles[t]!.setAlpha(alpha); // t < shown ≤ length
      g.nextMs = Math.max(g.nextMs - dt, -4 * SUPPRESS_TRACER_MS);
      while (g.nextMs <= 0) {
        g.nextMs += SUPPRESS_TRACER_MS;
        this.#rake(z);
      }
    }
    for (const g of this.#segments) {
      if (g.zoneUid !== 0 && g.seen !== frame) this.#freeSegment(g);
    }
  }

  /** The segment slot drawing zone `uid` (0: a free slot), or null. */
  #segmentFor(uid: number): Segment | null {
    for (const g of this.#segments) if (g.zoneUid === uid) return g;
    return null;
  }

  /** Starts drawing segment zone `z` in slot `g`: tints the route tiles it covers. */
  #openSegment(g: Segment, z: DeepReadonly<Zone>): void {
    g.zoneUid = z.uid;
    g.ms = 0;
    g.nextMs = 0;
    g.lastTicks = -1;
    g.shown = 0;
    const route = z.route;
    if (route === null) return;
    const cum = route.cumLenTiles;
    for (let i = 0; i < route.tiles.length && g.shown < MAX_SEGMENT_TILES; i++) {
      const d = cum[i] ?? -1;
      if (d < z.distFrom || d > z.distTo) continue;
      const [c, r] = route.tiles[i]!; // i < length
      gridToScreen(c + 0.5, r + 0.5, this.ctx.origin, pos);
      g.tiles[g.shown++]! // < MAX
        .setPosition(pos.x, pos.y)
        .setDepth(stripDepth(pos.y))
        .setAlpha(1)
        .setVisible(true);
    }
  }

  #freeSegment(g: Segment): void {
    g.zoneUid = 0;
    g.shown = 0;
    for (const img of g.tiles) img.setVisible(false);
  }

  /** One streak of suppressive fire landing on a random spot of segment `z`. */
  #rake(z: DeepReadonly<Zone>): void {
    if (z.route === null) return;
    const d = z.distFrom + this.#rand() * (z.distTo - z.distFrom);
    pointAt(z.route, d, onRoute);
    const x = onRoute.x + (this.#rand() - 0.5) * 2 * SUPPRESS_SPREAD_TILES;
    const y = onRoute.y + (this.#rand() - 0.5) * 2 * SUPPRESS_SPREAD_TILES;
    gridToScreen(x, y, this.ctx.origin, pos);
    const tx = pos.x;
    const ty = pos.y - BODY_LIFT_PX;
    if (Number.isNaN(this.#fireX)) {
      const jitter = Math.round((this.#rand() - 0.5) * 16);
      this.streak(tx + OFFMAP_SOURCE_PX.x + jitter, ty + OFFMAP_SOURCE_PX.y, tx, ty, true);
    } else {
      this.onRake?.(x, y);
      this.streak(this.#fireX, this.#fireY, tx, ty, true);
    }
    this.ring(x, y, SPARK_TILES, 'orange.4', SPARK_MS, false);
  }

  /** Cosmetic randomness in [0, 1) (a small LCG, so screenshots repeat; never the sim's RNG). */
  #rand(): number {
    this.#seed = (Math.imul(this.#seed, 1664525) + 1013904223) >>> 0;
    return this.#seed / 2 ** 32;
  }
}

function zoneAlive(zones: ZonePoolLike, uid: number): boolean {
  for (let i = 0; i < zones.used; i++) {
    const z = zones.items[i]!; // i < used ≤ items.length
    if (z.uid === uid) return z.alive;
  }
  return false;
}
