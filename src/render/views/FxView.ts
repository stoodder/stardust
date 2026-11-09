// Event-driven effects (art-direction §7), pooled: every effect is a slot in a fixed array, made
// once and reused, so a busy wave allocates nothing. BattleScene feeds it from sim events and calls
// `update` once per rendered frame. Effects are cosmetic and run on real time, except the Orbital
// Strike's reticle, which lasts exactly as long as its sim zone (so it holds while paused).
// - Hitscan tracers (Rivet): the projectile.rivet_tracer streak flying from the muzzle to the
//   target in a few frames (the shot itself landed on the tick it fired).
// - Pulse rings (Sprinkler): a solid ring expanding to the pulse radius in quarter-tile steps.
// - Shell bursts (Thumper): fx.explosion at the impact point.
// - Orbital Strike: fx.orbital_reticle while the zone counts down (and at the pointer while aiming),
//   then a white-cored beam from the top of the screen, a ground flash at the strike's radius, a
//   big center burst inside a rolling ring of bursts, a scorch decal, and a 2 px screen shake
//   (skipped under reduced motion).
//   The reticle fits the strike's real radius (`abilityStats`: Mk II's 2 tiles get a marching
//   ring of their own, since the baked sprite is 1.5 tiles).
// - Suppressing Fire (T207b): while its path tile is aimed, the segment it would cover (the sim's
//   `segmentSpan`) is tinted on the ground; while a segment zone lives, its tiles flicker in a warm
//   ground strip and tracer streaks rake it from Bricks's post (or from off the map without him).
// - Ally shots (Bricks): a tracer from his muzzle to the target, like a Rivet's.
// - Feedback juice (D026): effect rings (a leak at the core, a Thumper's splash, a build's dust, an
//   upgrade), floating numbers in the 3×5 pixel font, and a 1 px leak shake.
import * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { pointAt, type Point, type Zone } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import {
  BEAM_MS,
  beamCore,
  beamWidth,
  BURST_MS,
  fadeAlpha,
  floatRise,
  FLOAT_MS,
  LEAK_SHAKE_MS,
  leakShakeOffset,
  SCORCH_MS,
  SCORCH_TILES,
  STRIKE_FLASH_MS,
  PULSE_MS,
  pulseRadius,
  RETICLE_SPRITE_TILES,
  SHAKE_MS,
  shakeOffset,
  STRIKE_BURSTS,
  STRIKE_MS,
  SUPPRESS_TRACER_MS,
  suppressAlpha,
  TRACER_MS,
} from '../vfx/fxTiming.ts';
import {
  discTexture,
  effectRingTexture,
  floatTextTexture,
  PULSE_COLOR,
  reticleRingAnim,
  tileTintTexture,
} from '../vfx/overlayTextures.ts';
import type { ViewContext } from './ViewContext.ts';

/** The zone pool as render reads it. */
export interface ZonePoolLike {
  readonly used: number;
  readonly items: readonly DeepReadonly<Zone>[];
}

/** Pool sizes: the oldest effect of a kind is reused when its pool is full. */
const MAX_TRACERS = 64;
const MAX_PULSES = 24;
const MAX_DECALS = 8;
const MAX_FLOATS = 16;
const MAX_BURSTS = 40;
const MAX_STRIKES = 4;
/** Live Suppressing Fire zones drawn at once (one per ground route through the tile), and tiles each. */
const MAX_SEGMENTS = 4;
const MAX_SEGMENT_TILES = 5;
/** Tiles in the aiming preview (a segment on up to four routes). */
const MAX_PREVIEW_TILES = 12;

/** Suppressing Fire's ground strip and its aiming preview (Kinetic's warm color, art-direction §7). */
const SUPPRESS_TINT = { color: 'orange.3', fill: 0.35, edge: 0.6 } as const;
const PREVIEW_TINT = { color: 'orange.4', fill: 0.15, edge: 1 } as const;
/** Without Bricks on the map, the streaks come in from this far up-screen (px) of where they land. */
const OFFMAP_SOURCE_PX = { x: -48, y: -72 } as const;
/** Streaks land up to this far (tiles) to either side of the path's center line. */
const SUPPRESS_SPREAD_TILES = 0.35;
/** Where a tower's shot leaves its head, above the tile center (px). */
const MUZZLE_LIFT_PX = 10;
/** Where a shot meets its target, above the ground point (px); flyers draw 12 px higher. */
const BODY_LIFT_PX = 4;
export const AIR_LIFT_PX = 12;
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

interface Tracer {
  active: boolean;
  ms: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  img: Phaser.GameObjects.Image;
}

/** An effect ring: grows (in quarter tiles) or holds at its radius, and fades in steps. */
interface Pulse {
  active: boolean;
  ms: number;
  durationMs: number;
  radiusTiles: number;
  grow: boolean;
  color: ColorName;
  img: Phaser.GameObjects.Image;
  shownRadius: number;
  shownColor: ColorName | null;
}

/** A ground decal (a strike's flash, a scorch) that fades in steps. */
interface Decal {
  active: boolean;
  ms: number;
  durationMs: number;
  img: Phaser.GameObjects.Image;
}

/** A floating number rising from a point. */
interface Float {
  active: boolean;
  ms: number;
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
}

interface Burst {
  active: boolean;
  /** Negative while waiting for its delay. */
  ms: number;
  sprite: Phaser.GameObjects.Sprite;
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

export class FxView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  /** One Graphics for the strike beams, cleared and redrawn each frame. */
  readonly #gfx: Phaser.GameObjects.Graphics;
  readonly #tracers: Tracer[] = [];
  readonly #pulses: Pulse[] = [];
  readonly #decals: Decal[] = [];
  readonly #floats: Float[] = [];
  readonly #bursts: Burst[] = [];
  readonly #strikes: Strike[] = [];
  readonly #segments: Segment[] = [];
  readonly #preview: Phaser.GameObjects.Image[] = [];
  readonly #aim: Phaser.GameObjects.Sprite;
  /** The aim reticle's radius as last drawn (tiles), so it re-textures only on a change. */
  #aimRadius = -1;
  /** Where Suppressing Fire's streaks start (Bricks's muzzle, screen px), or NaN without him. */
  #fireX = Number.NaN;
  #fireY = Number.NaN;
  /** Cosmetic RNG for where streaks land (never the sim's). */
  #seed = 0x2f6b;
  #frame = 0;
  #nextTracer = 0;
  #nextPulse = 0;
  #nextBurst = 0;
  #nextDecal = 0;
  #nextFloat = 0;
  #shakeMs = -1;
  /** Which shake runs: the strike's 2 px or a leak's 1 px. */
  #shakeSmall = false;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    const { scene, layers, sprites } = ctx;
    this.#gfx = scene.make.graphics({}, false);
    layers.vfx.add(this.#gfx);
    const streak = sprites.frame('projectile.rivet_tracer', 'e');
    const streakAnchor = sprites.meta('projectile.rivet_tracer').anchor;
    for (let i = 0; i < MAX_TRACERS; i++) {
      const img = scene.make.image({}, false);
      img.setTexture(streak.texture, streak.frame).setDisplayOrigin(streakAnchor.x, streakAnchor.y);
      img.setVisible(false);
      layers.vfx.add(img);
      this.#tracers.push({ active: false, ms: 0, x0: 0, y0: 0, x1: 0, y1: 0, img });
    }
    for (let i = 0; i < MAX_PULSES; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      layers.decal.add(img);
      this.#pulses.push({
        active: false,
        ms: 0,
        durationMs: PULSE_MS,
        radiusTiles: 0,
        grow: true,
        color: PULSE_COLOR,
        img,
        shownRadius: 0,
        shownColor: null,
      });
    }
    for (let i = 0; i < MAX_DECALS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      layers.decal.add(img);
      this.#decals.push({ active: false, ms: 0, durationMs: 0, img });
    }
    for (let i = 0; i < MAX_FLOATS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      layers.overlay.add(img);
      this.#floats.push({ active: false, ms: 0, x: 0, y: 0, img });
    }
    const boom = sprites.meta('fx.explosion').anchor;
    const boomFrame = sprites.frame('fx.explosion', 'f0');
    for (let i = 0; i < MAX_BURSTS; i++) {
      const sprite = scene.make.sprite({}, false);
      sprite.setTexture(boomFrame.texture, boomFrame.frame).setDisplayOrigin(boom.x, boom.y);
      sprite.setVisible(false);
      layers.vfx.add(sprite);
      this.#bursts.push({ active: false, ms: 0, sprite });
    }
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
    );
    const tileImage = (key: string): Phaser.GameObjects.Image => {
      const img = scene.make.image({}, false).setTexture(key).setOrigin(0.5, 0.5).setVisible(false);
      layers.decal.add(img);
      return img;
    };
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const tiles = Array.from({ length: MAX_SEGMENT_TILES }, () => tileImage(tint));
      this.#segments.push({ zoneUid: 0, seen: 0, ms: 0, nextMs: 0, tiles, shown: 0 });
    }
    const preview = tileTintTexture(
      scene,
      PREVIEW_TINT.color,
      PREVIEW_TINT.fill,
      PREVIEW_TINT.edge,
    );
    for (let i = 0; i < MAX_PREVIEW_TILES; i++) this.#preview.push(tileImage(preview));
  }

  /** A hitscan shot from a tower at grid (x0, y0) to a target at grid (x1, y1). */
  tracer(x0: number, y0: number, x1: number, y1: number, targetAir: boolean): void {
    gridToScreen(x0, y0, this.#ctx.origin, pos);
    this.tracerFrom(pos.x, pos.y - MUZZLE_LIFT_PX, x1, y1, targetAir);
  }

  /** A hitscan shot from screen point (sx, sy) (an ally's muzzle) to a target at grid (x1, y1). */
  tracerFrom(sx: number, sy: number, x1: number, y1: number, targetAir: boolean): void {
    gridToScreen(x1, y1, this.#ctx.origin, pos);
    this.#streak(sx, sy, pos.x, pos.y - BODY_LIFT_PX - (targetAir ? AIR_LIFT_PX : 0));
  }

  /** A tracer streak between two screen points. */
  #streak(x0: number, y0: number, x1: number, y1: number): void {
    const t = this.#tracers[this.#nextTracer]!; // index < MAX_TRACERS
    this.#nextTracer = (this.#nextTracer + 1) % MAX_TRACERS;
    t.x0 = x0;
    t.y0 = y0;
    t.x1 = x1;
    t.y1 = y1;
    t.ms = 0;
    t.active = true;
    // The streak's head (its white end) points at the target.
    t.img.setRotation(Math.atan2(t.y1 - t.y0, t.x1 - t.x0));
    this.#drawTracer(t);
  }

  /** A Sprinkler pulse ring from a tower at grid (x, y) out to `radiusTiles`. */
  pulse(x: number, y: number, radiusTiles: number): void {
    this.ring(x, y, radiusTiles, PULSE_COLOR, PULSE_MS, true);
  }

  /**
   * An effect ring on the ground at grid (x, y): grows from a quarter tile to `radiusTiles` over
   * `ms` (`grow`), or holds at it, fading in steps either way.
   */
  ring(
    x: number,
    y: number,
    radiusTiles: number,
    color: ColorName,
    ms: number,
    grow: boolean,
  ): void {
    if (radiusTiles <= 0) return;
    const p = this.#pulses[this.#nextPulse]!; // index < MAX_PULSES
    this.#nextPulse = (this.#nextPulse + 1) % MAX_PULSES;
    gridToScreen(x, y, this.#ctx.origin, pos);
    p.img.setPosition(pos.x, pos.y);
    p.radiusTiles = radiusTiles;
    p.durationMs = ms;
    p.grow = grow;
    p.color = color;
    p.shownRadius = 0;
    p.ms = 0;
    p.active = true;
    this.#syncPulse(p);
  }

  /** A floating number (the 3×5 font) rising from grid (x, y), `liftPx` above the ground. */
  floatText(text: string, color: ColorName, x: number, y: number, liftPx: number): void {
    const f = this.#floats[this.#nextFloat]!; // index < MAX_FLOATS
    this.#nextFloat = (this.#nextFloat + 1) % MAX_FLOATS;
    gridToScreen(x, y, this.#ctx.origin, pos);
    const key = floatTextTexture(this.#ctx.scene, text, color);
    f.img.setTexture(key);
    f.img.setOrigin(0.5, 1);
    f.x = Math.round(pos.x);
    f.y = Math.round(pos.y - liftPx);
    f.ms = 0;
    f.active = true;
    this.#syncFloat(f);
  }

  /** A 1 px camera shake for a leak (skipped under reduced motion; a strike's shake wins). */
  leakShake(): void {
    if (this.#reducedMotion() || (this.#shakeMs >= 0 && !this.#shakeSmall)) return;
    this.#shakeSmall = true;
    this.#shakeMs = 0;
  }

  /** An explosive burst on the ground at grid (x, y), after `delayMs`. */
  burst(x: number, y: number, delayMs = 0): void {
    const b = this.#bursts[this.#nextBurst]!; // index < MAX_BURSTS
    this.#nextBurst = (this.#nextBurst + 1) % MAX_BURSTS;
    gridToScreen(x, y, this.#ctx.origin, pos);
    // The burst's anchor is its base, so lift it to sit centered on the ground point.
    b.sprite.setPosition(pos.x, pos.y + 4);
    b.sprite.stop().setVisible(false);
    b.ms = -delayMs;
    b.active = true;
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
    gridToScreen(x, y, this.#ctx.origin, pos);
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
    gridToScreen(col + 0.5, row + 0.5, this.#ctx.origin, pos);
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
      gridToScreen((tiles[2 * i] ?? 0) + 0.5, (tiles[2 * i + 1] ?? 0) + 0.5, this.#ctx.origin, pos);
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
    const { sprites, scene } = this.#ctx;
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
    const g = this.#gfx;
    g.clear();

    for (const t of this.#tracers) {
      if (!t.active) continue;
      t.ms += dt;
      if (t.ms >= TRACER_MS) {
        t.active = false;
        t.img.setVisible(false);
      } else {
        this.#drawTracer(t);
      }
    }
    for (const p of this.#pulses) {
      if (!p.active) continue;
      p.ms += dt;
      if (p.ms >= p.durationMs) {
        p.active = false;
        p.img.setVisible(false);
      } else {
        this.#syncPulse(p);
      }
    }
    for (const d of this.#decals) {
      if (!d.active) continue;
      d.ms += dt;
      if (d.ms >= d.durationMs) {
        d.active = false;
        d.img.setVisible(false);
      } else {
        d.img.setAlpha(fadeAlpha(d.ms / d.durationMs));
      }
    }
    for (const f of this.#floats) {
      if (!f.active) continue;
      f.ms += dt;
      if (f.ms >= FLOAT_MS) {
        f.active = false;
        f.img.setVisible(false);
      } else {
        this.#syncFloat(f);
      }
    }
    for (const b of this.#bursts) {
      if (!b.active) continue;
      const before = b.ms;
      b.ms += dt;
      if (before < 0 && b.ms >= 0) {
        b.sprite.setVisible(true).play(this.#ctx.sprites.anim('fx.explosion', 'burst'));
      }
      if (b.ms >= BURST_MS) {
        b.active = false;
        b.sprite.stop().setVisible(false);
      }
    }
    for (const s of this.#strikes) this.#updateStrike(s, dt, zones);
    this.#updateSegments(dt, zones);
    this.#updateShake(dt);
  }

  /** Hides everything and resets the camera (the scene is shutting down). */
  reset(): void {
    for (const t of this.#tracers) {
      t.active = false;
      t.img.setVisible(false);
    }
    for (const p of this.#pulses) {
      p.active = false;
      p.img.setVisible(false);
    }
    for (const d of this.#decals) {
      d.active = false;
      d.img.setVisible(false);
    }
    for (const f of this.#floats) {
      f.active = false;
      f.img.setVisible(false);
    }
    for (const b of this.#bursts) {
      b.active = false;
      b.sprite.stop().setVisible(false);
    }
    for (const s of this.#strikes) {
      s.zoneUid = 0;
      s.ms = -1;
      s.reticle.stop().setVisible(false);
    }
    for (const g of this.#segments) this.#freeSegment(g);
    this.setSegmentAim([], 0);
    this.#gfx.clear();
    this.#shakeMs = -1;
    this.#ctx.scene.cameras.main.setScroll(0, 0);
  }

  #syncPulse(p: Pulse): void {
    const t = p.ms / p.durationMs;
    const r = p.grow ? pulseRadius(p.radiusTiles, t) : p.radiusTiles;
    if (r !== p.shownRadius || p.color !== p.shownColor) {
      const tex = effectRingTexture(this.#ctx.scene, r, p.color);
      p.img.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      p.shownRadius = r;
      p.shownColor = p.color;
    }
    p.img.setAlpha(fadeAlpha(t)).setVisible(true);
  }

  #syncFloat(f: Float): void {
    f.img
      .setPosition(f.x, f.y - floatRise(f.ms))
      .setAlpha(fadeAlpha(f.ms / FLOAT_MS))
      .setVisible(true);
  }

  /** A ground decal at grid (x, y) that fades over `ms`. */
  #decal(x: number, y: number, tex: { key: string; ox: number; oy: number }, ms: number): void {
    const d = this.#decals[this.#nextDecal]!; // index < MAX_DECALS
    this.#nextDecal = (this.#nextDecal + 1) % MAX_DECALS;
    gridToScreen(x, y, this.#ctx.origin, pos);
    d.img
      .setTexture(tex.key)
      .setDisplayOrigin(tex.ox, tex.oy)
      .setPosition(pos.x, pos.y)
      .setAlpha(1)
      .setVisible(true);
    d.ms = 0;
    d.durationMs = ms;
    d.active = true;
  }

  /** Places the streak `ms / TRACER_MS` of the way from the muzzle to the target. */
  #drawTracer(t: Tracer): void {
    const k = Math.min(1, t.ms / TRACER_MS);
    t.img
      .setPosition(Math.round(t.x0 + (t.x1 - t.x0) * k), Math.round(t.y0 + (t.y1 - t.y0) * k))
      .setVisible(true);
  }

  #updateStrike(s: Strike, dt: number, zones: ZonePoolLike): void {
    if (s.zoneUid !== 0) {
      if (zoneAlive(zones, s.zoneUid)) return; // still counting down: the reticle marches on
      // The zone resolved this frame: the strike lands.
      s.zoneUid = 0;
      s.ms = 0;
      s.reticle.stop().setVisible(false);
      const scene = this.#ctx.scene;
      // The scorch first, so the flash draws over it; both sit under the actors (decal layer).
      this.#decal(s.x, s.y, discTexture(scene, SCORCH_TILES, 'ink.0', 0.6, true), SCORCH_MS);
      this.#decal(s.x, s.y, discTexture(scene, s.radiusTiles, 'teal.4', 0.6), STRIKE_FLASH_MS);
      this.ring(s.x, s.y, s.radiusTiles, 'white.1', STRIKE_FLASH_MS, false);
      for (const b of STRIKE_BURSTS) this.burst(s.x + b.dx, s.y + b.dy, b.delayMs);
      // A big center: two more bursts just off the middle, a beat later.
      this.burst(s.x - 0.2, s.y + 0.1, 30);
      this.burst(s.x + 0.2, s.y - 0.1, 70);
      if (!this.#reducedMotion()) {
        this.#shakeSmall = false;
        this.#shakeMs = 0;
      }
    }
    if (s.ms < 0) return;
    this.#drawBeam(s);
    s.ms += dt;
    if (s.ms >= STRIKE_MS) s.ms = -1;
  }

  #drawBeam(s: Strike): void {
    const w = beamWidth(s.ms);
    if (w <= 0) return;
    gridToScreen(s.x, s.y, this.#ctx.origin, pos);
    const x = Math.round(pos.x);
    const bottom = Math.round(pos.y);
    const top = Math.round(this.#ctx.scene.cameras.main.scrollY) - 8;
    const h = bottom - top;
    const g = this.#gfx;
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
    const reduced = this.#reducedMotion();
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
      g.ms += dt;
      const alpha = suppressAlpha(g.ms, z.ticksLeft, reduced);
      for (let t = 0; t < g.shown; t++) g.tiles[t]!.setAlpha(alpha); // t < shown ≤ length
      // Real time, so the strip holds still while paused (a paused frame has dt 0); a long frame
      // (a background tab) catches up at most a few streaks.
      g.nextMs = Math.max(g.nextMs - dt, -4 * SUPPRESS_TRACER_MS);
      if (dt <= 0) continue;
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
    g.shown = 0;
    const route = z.route;
    if (route === null) return;
    const cum = route.cumLenTiles;
    for (let i = 0; i < route.tiles.length && g.shown < MAX_SEGMENT_TILES; i++) {
      const d = cum[i] ?? -1;
      if (d < z.distFrom || d > z.distTo) continue;
      const [c, r] = route.tiles[i]!; // i < length
      gridToScreen(c + 0.5, r + 0.5, this.#ctx.origin, pos);
      g.tiles[g.shown++]!.setPosition(pos.x, pos.y).setAlpha(1).setVisible(true); // < MAX
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
    gridToScreen(x, y, this.#ctx.origin, pos);
    const tx = pos.x;
    const ty = pos.y - BODY_LIFT_PX;
    if (Number.isNaN(this.#fireX)) {
      const jitter = Math.round((this.#rand() - 0.5) * 16);
      this.#streak(tx + OFFMAP_SOURCE_PX.x + jitter, ty + OFFMAP_SOURCE_PX.y, tx, ty);
    } else {
      this.#streak(this.#fireX, this.#fireY, tx, ty);
    }
  }

  /** Cosmetic randomness in [0, 1) (a small LCG, so screenshots repeat; never the sim's RNG). */
  #rand(): number {
    this.#seed = (Math.imul(this.#seed, 1664525) + 1013904223) >>> 0;
    return this.#seed / 2 ** 32;
  }

  #updateShake(dt: number): void {
    if (this.#shakeMs < 0) return;
    const cam = this.#ctx.scene.cameras.main;
    const [ox, oy] = this.#shakeSmall ? leakShakeOffset(this.#shakeMs) : shakeOffset(this.#shakeMs);
    cam.setScroll(ox, oy);
    this.#shakeMs += dt;
    if (this.#shakeMs >= (this.#shakeSmall ? LEAK_SHAKE_MS : SHAKE_MS)) {
      this.#shakeMs = -1;
      cam.setScroll(0, 0);
    }
  }
}

function zoneAlive(zones: ZonePoolLike, uid: number): boolean {
  for (let i = 0; i < zones.used; i++) {
    const z = zones.items[i]!; // i < used ≤ items.length
    if (z.uid === uid) return z.alive;
  }
  return false;
}
