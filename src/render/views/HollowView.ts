// The Hollow's Act III view (T602, polished by T630a; the rules are gatherLook.ts): a Maw's tendril
// tell (noose, tendrils, beads, the snap) and the gulp ring each absorb pulses, a burrowed
// Undertow's ripple trail. The gulps and ripples sit in `decal`, under the units; the tendrils in
// `vfx`, over them, from body to body (a held unit is close enough that under the sprites they'd
// hide). Redrawn each frame into two Graphics; the gulps are a fixed pool and each Maw's absorb
// count one map entry: allocation-free per frame. The rift cracks are RiftView's (T630b). The
// Maw's growth and tendril pose and the Undertow's `under` pose are its sprites' (T640a;
// EnemyView draws them, gatherLook.ts `mawBody`).
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { gatherOf, pointAt, type Ally, type Enemy, type Point } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { gridToScreen, rangeEllipsePx, type Vec2 } from '../iso.ts';
import {
  beadAt,
  GULP_MS,
  growthRingTiles,
  gulpRing,
  nooseColor,
  nooseTiles,
  rippleAt,
  RIPPLES,
  showsRipples,
  TENDRIL_STROKES,
  tendrilProgress,
  type Ripple,
} from './gatherLook.ts';
import type { ViewContext } from './ViewContext.ts';

interface Pool<T> {
  readonly used: number;
  readonly items: readonly DeepReadonly<T>[];
}

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const INK = hex('ink.0');
const TENDRIL = hex('violet.4');
/** Each tendril stroke's fill number (gatherLook.ts TENDRIL_STROKES). */
const STROKE_HEX: readonly number[] = TENDRIL_STROKES.map((st) => hex(st.color));
const SNAP = hex('white.1');
const BEAD = hex('white.1');
const GROWTH = hex('violet.3');
const RIPPLE = hex('hollow.4');

/** Tendrils per tell, their sideways wave (px), and the wave's speed (rad/ms). */
const TENDRILS = 3;
const WAVE_PX = 3;
const WAVE_SPEED = 0.012;
/** Tendrils run between the bodies, this far above the ground points. */
const BODY_LIFT_PX = 7;

/** Gulps playing at once (more reuse the oldest). */
const MAX_GULPS = 8;

interface Gulp {
  active: boolean;
  ms: number;
  /** The grid point it pulses from, and the size it grows to (tiles). */
  x: number;
  y: number;
  tiles: number;
}

const a: Vec2 = { x: 0, y: 0 };
const rip: Ripple = { back: 0, w: 0, alpha: 0 };
const b: Vec2 = { x: 0, y: 0 };
const semi: Vec2 = { x: 0, y: 0 };
const pt: Point = { x: 0, y: 0 };

export class HollowView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #marks: Phaser.GameObjects.Graphics;
  readonly #tendrils: Phaser.GameObjects.Graphics;
  #clockMs = 0;
  #tells = 0;
  #grown = 0;
  #ripples = 0;
  /** Each live Maw's absorbs last frame, by uid (a rise pulses its gulp ring). */
  readonly #absorbs = new Map<number, { n: number; frame: number }>();
  /** Drops a Maw not seen this frame (Map.forEach's callback, made once). */
  readonly #forget = (seen: { frame: number }, uid: number): void => {
    if (seen.frame !== this.#frame) this.#absorbs.delete(uid);
  };
  readonly #gulps: Gulp[] = [];
  #nextGulp = 0;
  #frame = 0;
  /** Gulps played since the view was made (the smoke flow's check). */
  gulpsPlayed = 0;
  /** Tendril tells seen since the view was made (the smoke flow's check). */
  tellsSeen = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#marks = ctx.scene.make.graphics({}, false);
    ctx.layers.decal.add(this.#marks);
    this.#tendrils = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#tendrils);
    for (let i = 0; i < MAX_GULPS; i++)
      this.#gulps.push({ active: false, ms: 0, x: 0, y: 0, tiles: 0 });
  }

  /** Each frame: the Maws' and burrowers' marks. */
  update(dtMs: number, enemies: Pool<Enemy>, allies: Pool<Ally>): void {
    this.#clockMs += dtMs;
    const g = this.#marks;
    g.clear();
    this.#tendrils.clear();
    let tells = 0;
    let grown = 0;
    let ripples = 0;
    const still = this.#reducedMotion();
    const frame = ++this.#frame;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null) continue;
      if (showsRipples(e)) ripples += this.#drawRipples(g, e);
      if (gatherOf(e) === null && e.def.gather === null) continue; // T708: a boss phase's gather too
      if (e.absorbs > 0) grown++;
      this.#watchAbsorbs(e, frame);
      if (e.gatherUid !== 0 && this.#drawTendrils(this.#tendrils, e, enemies, allies, still))
        tells++;
    }
    // Forget the Maws gone (dead, leaked); a bound callback, so no iterator or entry arrays.
    this.#absorbs.forEach(this.#forget);
    this.#drawGulps(g, dtMs, still);
    if (tells > this.#tells) this.tellsSeen += tells - this.#tells;
    this.#tells = tells;
    this.#grown = grown;
    this.#ripples = ripples;
  }

  /** What shows now (the smoke flow's check): tells, grown Maws, and ripples. */
  get shown(): { readonly tells: number; readonly grown: number; readonly ripples: number } {
    return { tells: this.#tells, grown: this.#grown, ripples: this.#ripples };
  }

  reset(): void {
    this.#marks.clear();
    this.#tendrils.clear();
    this.#absorbs.clear();
    for (const gulp of this.#gulps) gulp.active = false;
    this.#tells = 0;
    this.#grown = 0;
    this.#ripples = 0;
  }

  /** The ripples behind a burrowed unit along its route (gatherLook.ts `rippleAt`); how many drew. */
  #drawRipples(g: Phaser.GameObjects.Graphics, e: DeepReadonly<Enemy>): number {
    const route = e.route;
    if (route === null) return 0;
    let n = 0;
    for (let k = 0; k < RIPPLES; k++) {
      if (!rippleAt(e.dist, k, rip)) break;
      pointAt(route, e.dist - rip.back, pt);
      gridToScreen(pt.x, pt.y, this.#ctx.origin, a);
      const x = Math.round(a.x);
      const y = Math.round(a.y);
      g.lineStyle(1, RIPPLE, rip.alpha).strokeEllipse(x, y, rip.w, rip.w / 2);
      n++;
    }
    return n;
  }

  /** Pulses a Maw's gulp ring when its absorbs rise since last frame. */
  #watchAbsorbs(e: DeepReadonly<Enemy>, frame: number): void {
    const seen = this.#absorbs.get(e.uid);
    if (seen === undefined) {
      this.#absorbs.set(e.uid, { n: e.absorbs, frame });
      return;
    }
    seen.frame = frame;
    if (e.absorbs <= seen.n) return;
    seen.n = e.absorbs;
    const gulp = this.#gulps[this.#nextGulp]!; // #nextGulp < MAX_GULPS
    this.#nextGulp = (this.#nextGulp + 1) % MAX_GULPS;
    gulp.active = true;
    gulp.ms = 0;
    gulp.x = e.x;
    gulp.y = e.y;
    gulp.tiles = growthRingTiles(e);
    this.gulpsPlayed++;
  }

  /** Advances and draws the gulp rings (real time, a cosmetic beat). */
  #drawGulps(g: Phaser.GameObjects.Graphics, dtMs: number, still: boolean): void {
    for (const gulp of this.#gulps) {
      if (!gulp.active) continue;
      gulp.ms += Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
      if (gulp.ms >= GULP_MS) {
        gulp.active = false;
        continue;
      }
      const ring = gulpRing(gulp.ms, gulp.tiles, still);
      if (ring.alpha <= 0) continue;
      gridToScreen(gulp.x, gulp.y, this.#ctx.origin, a);
      rangeEllipsePx(ring.tiles, semi);
      const x = Math.round(a.x);
      const y = Math.round(a.y);
      g.lineStyle(3, INK, 0.6 * ring.alpha).strokeEllipse(x, y, semi.x * 2, semi.y * 2);
      g.lineStyle(1, GROWTH, ring.alpha).strokeEllipse(x, y, semi.x * 2, semi.y * 2);
    }
  }

  /** The tendrils from a Maw to the unit it holds; false when the unit isn't found. */
  #drawTendrils(
    g: Phaser.GameObjects.Graphics,
    e: DeepReadonly<Enemy>,
    enemies: Pool<Enemy>,
    allies: Pool<Ally>,
    still: boolean,
  ): boolean {
    if (!findUnit(e.gatherUid, enemies, allies, b)) return false;
    gridToScreen(e.x, e.y, this.#ctx.origin, a);
    gridToScreen(b.x, b.y, this.#ctx.origin, b);
    a.y -= BODY_LIFT_PX; // body to body, not foot to foot
    b.y -= BODY_LIFT_PX;
    // The noose: a ring round the held unit, closing as the tell runs (the unit drawn in), white
    // for its snap (the gulp is coming).
    const progress = tendrilProgress(e);
    rangeEllipsePx(nooseTiles(progress), semi);
    const noose = nooseColor(progress) === 'white.1' ? SNAP : TENDRIL;
    const phase = still ? 0 : this.#clockMs * WAVE_SPEED;
    // The tendrils, a stroke at a time (ink, violet rope, white core): from points on the noose
    // (turning slowly) to the Maw's body, wavering. The noose (a 3 px ink under-stroke, then its
    // 1 px line) goes on after the tendrils' ink, so their under-strokes never cut it.
    const steps = 5;
    for (let pass = 0; pass < TENDRIL_STROKES.length; pass++) {
      const st = TENDRIL_STROKES[pass]!; // pass < length
      if (pass === 1) {
        g.lineStyle(3, INK, 0.7).strokeEllipse(b.x, b.y, semi.x * 2, semi.y * 2);
        g.lineStyle(1, noose, 1).strokeEllipse(b.x, b.y, semi.x * 2, semi.y * 2);
      }
      g.lineStyle(st.px, STROKE_HEX[pass]!, st.alpha);
      for (let t = 0; t < TENDRILS; t++) {
        const ang = phase * 0.25 + (t * Math.PI * 2) / TENDRILS;
        let px = b.x + Math.cos(ang) * semi.x;
        let py = b.y + Math.sin(ang) * semi.y;
        const dx = a.x - px;
        const dy = a.y - py;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const sx = px;
        const sy = py;
        for (let k = 1; k <= steps; k++) {
          const f = k / steps;
          const w = k < steps ? Math.sin(phase + k * 1.3 + t * 2) * WAVE_PX : 0;
          const qx = sx + dx * f + nx * w;
          const qy = sy + dy * f + ny * w;
          g.lineBetween(px, py, qx, qy);
          px = qx;
          py = qy;
        }
        // Its bead, riding in to the Maw as the tell runs (over the rope, on the last stroke).
        if (pass === TENDRIL_STROKES.length - 1) {
          const f = beadAt(progress, t);
          const w = f > 0 && f < 1 ? Math.sin(phase + f * steps * 1.3 + t * 2) * WAVE_PX : 0;
          const bx = Math.round(sx + dx * f + nx * w);
          const by = Math.round(sy + dy * f + ny * w);
          g.fillStyle(INK, 1).fillRect(bx - 2, by - 2, 4, 4);
          g.fillStyle(BEAD, 1).fillRect(bx - 1, by - 1, 2, 2);
        }
      }
    }
    return true;
  }
}

/** The grid point of the live enemy or ally `uid` into `out`; false when none is live. */
function findUnit(uid: number, enemies: Pool<Enemy>, allies: Pool<Ally>, out: Vec2): boolean {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.alive && e.uid === uid) {
      out.x = e.x;
      out.y = e.y;
      return true;
    }
  }
  for (let i = 0; i < allies.used; i++) {
    const v = allies.items[i]!; // i < used ≤ items.length
    if (v.alive && v.uid === uid) {
      out.x = v.x;
      out.y = v.y;
      return true;
    }
  }
  return false;
}
