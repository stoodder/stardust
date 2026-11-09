// Event-driven effects (art-direction §7), pooled: every effect is a slot in a fixed array, made
// once and reused, so a busy wave allocates nothing. BattleScene feeds it from sim events and calls
// `update` once per rendered frame. Effects are cosmetic and run on real time, except the Orbital
// Strike's reticle, which lasts exactly as long as its sim zone (so it holds while paused).
// - Hitscan tracers (Rivet): the projectile.rivet_tracer streak flying from the muzzle to the
//   target in a few frames (the shot itself landed on the tick it fired).
// - Pulse rings (Sprinkler): a solid ring expanding to the pulse radius in quarter-tile steps.
// - Shell bursts (Thumper): fx.explosion at the impact point.
// - Orbital Strike: fx.orbital_reticle while the zone counts down (and at the pointer while aiming),
//   then a white-cored beam from the top of the screen, a rolling ring of bursts, and a 2 px screen
//   shake (skipped under reduced motion).
import * as Phaser from 'phaser';
import { rgbOf } from '../../content/palettes/master.ts';
import type { Zone } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import {
  BEAM_MS,
  beamCore,
  beamWidth,
  BURST_MS,
  fadeAlpha,
  PULSE_MS,
  pulseRadius,
  SHAKE_MS,
  shakeOffset,
  STRIKE_BURSTS,
  STRIKE_MS,
  TRACER_MS,
} from '../vfx/fxTiming.ts';
import { pulseRingTexture } from '../vfx/overlayTextures.ts';
import type { ViewContext } from './ViewContext.ts';

/** The zone pool as render reads it. */
export interface ZonePoolLike {
  readonly used: number;
  readonly items: readonly DeepReadonly<Zone>[];
}

/** Pool sizes: the oldest effect of a kind is reused when its pool is full. */
const MAX_TRACERS = 48;
const MAX_PULSES = 16;
const MAX_BURSTS = 40;
const MAX_STRIKES = 4;

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

interface Pulse {
  active: boolean;
  ms: number;
  radiusTiles: number;
  img: Phaser.GameObjects.Image;
  shownRadius: number;
}

interface Burst {
  active: boolean;
  /** Negative while waiting for its delay. */
  ms: number;
  sprite: Phaser.GameObjects.Sprite;
}

interface Strike {
  /** The sim zone's uid while the reticle shows; 0 once it has landed (or when free). */
  zoneUid: number;
  /** ms since impact, or −1 before it. */
  ms: number;
  x: number;
  y: number;
  reticle: Phaser.GameObjects.Sprite;
}

const pos: Vec2 = { x: 0, y: 0 };

export class FxView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  /** One Graphics for the strike beams, cleared and redrawn each frame. */
  readonly #gfx: Phaser.GameObjects.Graphics;
  readonly #tracers: Tracer[] = [];
  readonly #pulses: Pulse[] = [];
  readonly #bursts: Burst[] = [];
  readonly #strikes: Strike[] = [];
  readonly #aim: Phaser.GameObjects.Sprite;
  #nextTracer = 0;
  #nextPulse = 0;
  #nextBurst = 0;
  #shakeMs = -1;

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
      this.#pulses.push({ active: false, ms: 0, radiusTiles: 0, img, shownRadius: 0 });
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
      this.#strikes.push({ zoneUid: 0, ms: -1, x: 0, y: 0, reticle: makeReticle() });
    }
    this.#aim = makeReticle().setAlpha(AIM_ALPHA);
  }

  /** A hitscan shot from a tower at grid (x0, y0) to a target at grid (x1, y1). */
  tracer(x0: number, y0: number, x1: number, y1: number, targetAir: boolean): void {
    const t = this.#tracers[this.#nextTracer]!; // index < MAX_TRACERS
    this.#nextTracer = (this.#nextTracer + 1) % MAX_TRACERS;
    gridToScreen(x0, y0, this.#ctx.origin, pos);
    t.x0 = pos.x;
    t.y0 = pos.y - MUZZLE_LIFT_PX;
    gridToScreen(x1, y1, this.#ctx.origin, pos);
    t.x1 = pos.x;
    t.y1 = pos.y - BODY_LIFT_PX - (targetAir ? AIR_LIFT_PX : 0);
    t.ms = 0;
    t.active = true;
    // The streak's head (its white end) points at the target.
    t.img.setRotation(Math.atan2(t.y1 - t.y0, t.x1 - t.x0));
    this.#drawTracer(t);
  }

  /** A pulse ring from a tower at grid (x, y) out to `radiusTiles`. */
  pulse(x: number, y: number, radiusTiles: number): void {
    const p = this.#pulses[this.#nextPulse]!; // index < MAX_PULSES
    this.#nextPulse = (this.#nextPulse + 1) % MAX_PULSES;
    gridToScreen(x, y, this.#ctx.origin, pos);
    p.img.setPosition(pos.x, pos.y);
    p.radiusTiles = radiusTiles;
    p.shownRadius = 0;
    p.ms = 0;
    p.active = true;
    this.#syncPulse(p);
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

  /** An Orbital Strike cast: the reticle shows on (x, y) while the sim zone `zoneUid` lives. */
  strike(zoneUid: number, x: number, y: number): void {
    let s = this.#strikes.find((k) => k.zoneUid === 0 && k.ms < 0);
    s ??= this.#strikes[0]!; // MAX_STRIKES > 0; a 5th live strike reuses the first
    s.zoneUid = zoneUid;
    s.ms = -1;
    s.x = x;
    s.y = y;
    gridToScreen(x, y, this.#ctx.origin, pos);
    s.reticle.setPosition(pos.x, pos.y).setAlpha(1).setVisible(true);
    s.reticle.play(this.#ctx.sprites.anim('fx.orbital_reticle', 'march'), true);
  }

  /** The aim reticle on tile (col, row) while the player targets an ability; col < 0 hides it. */
  setAim(col: number, row: number): void {
    if (col < 0) {
      if (this.#aim.visible) this.#aim.stop().setVisible(false);
      return;
    }
    gridToScreen(col + 0.5, row + 0.5, this.#ctx.origin, pos);
    this.#aim.setPosition(pos.x, pos.y);
    if (!this.#aim.visible) {
      this.#aim.setVisible(true).play(this.#ctx.sprites.anim('fx.orbital_reticle', 'march'));
    }
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
      if (p.ms >= PULSE_MS) {
        p.active = false;
        p.img.setVisible(false);
      } else {
        this.#syncPulse(p);
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
    for (const b of this.#bursts) {
      b.active = false;
      b.sprite.stop().setVisible(false);
    }
    for (const s of this.#strikes) {
      s.zoneUid = 0;
      s.ms = -1;
      s.reticle.stop().setVisible(false);
    }
    this.#gfx.clear();
    this.#shakeMs = -1;
    this.#ctx.scene.cameras.main.setScroll(0, 0);
  }

  #syncPulse(p: Pulse): void {
    const t = p.ms / PULSE_MS;
    const r = pulseRadius(p.radiusTiles, t);
    if (r !== p.shownRadius) {
      const tex = pulseRingTexture(this.#ctx.scene, r);
      p.img.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      p.shownRadius = r;
    }
    p.img.setAlpha(fadeAlpha(t)).setVisible(true);
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
      for (const b of STRIKE_BURSTS) this.burst(s.x + b.dx, s.y + b.dy, b.delayMs);
      if (!this.#reducedMotion()) this.#shakeMs = 0;
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

  #updateShake(dt: number): void {
    if (this.#shakeMs < 0) return;
    const cam = this.#ctx.scene.cameras.main;
    const [ox, oy] = shakeOffset(this.#shakeMs);
    cam.setScroll(ox, oy);
    this.#shakeMs += dt;
    if (this.#shakeMs >= SHAKE_MS) {
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
