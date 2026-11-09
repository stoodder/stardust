// The Brood Hauler's sack burst (D059; design/enemies.md § 5.1): on `SackBurst`, fx.sack_burst
// pops where the Hauler fell, and its young (enemy.hauler_young, render-only: the sim keeps no
// entity for them) scurry *back up the route toward the warren* for ~1.5 s, then fade. Pooled: a
// fixed set of bursts, the oldest reused, so a W8 of Haulers allocates nothing. Real time,
// cosmetic; the motion is the pure vfx/scurry.ts.
import type * as Phaser from 'phaser';
import type { CompiledRoute } from '../../content/compiled.ts';
import { pointAt, type Point } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { MAX_YOUNG, SCURRY_MS, scurryAlpha, scurryDist, YOUNG_LANES_PX } from '../vfx/scurry.ts';
import { sideOf } from './EnemyView.ts';
import { facingOf, type Facing } from './spriteInfo.ts';
import { variantName, type ViewContext } from './ViewContext.ts';

/** Bursts drawn at once (W8 sends 6 Haulers, 12 s apart: two overlapping is already a lot). */
const MAX_BURSTS = 4;
/** fx.sack_burst: 5 frames at 10 fps. */
const POP_MS = 5 * 100;
/** Depth uids for the young (above any enemy uid's low byte tie-break). */
const YOUNG_UID = 0xf0;
/** How far back along the route a young looks to face where it's running (tiles). */
const LOOK_TILES = 0.2;
const FACINGS: readonly Facing[] = ['ne', 'nw', 'se', 'sw'];

interface Young {
  sprite: Phaser.GameObjects.Sprite;
  facing: Facing | null;
}

interface Burst {
  active: boolean;
  ms: number;
  route: CompiledRoute | null;
  dist0: number;
  count: number;
  pop: Phaser.GameObjects.Sprite;
  young: Young[];
}

const pos: Vec2 = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };
const ahead: Point = { x: 0, y: 0 };
const side: Vec2 = { x: 0, y: 0 };

export class SackBurstView {
  readonly #ctx: ViewContext;
  readonly #bursts: Burst[] = [];
  readonly #walk = new Map<Facing, { key: string; ox: number; oy: number }>();
  #next = 0;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    const { scene, layers, sprites } = ctx;
    const popAnchor = sprites.meta('fx.sack_burst').anchor;
    const popFrame = sprites.frame('fx.sack_burst', 'f0');
    for (const f of FACINGS) {
      const a = sprites.frameAnchor('enemy.hauler_young', `walk_${f}_0`);
      this.#walk.set(f, {
        key: sprites.anim('enemy.hauler_young', `walk_${f}`, variantName(DEFAULT_VARIANT, false)),
        ox: a.x,
        oy: a.y,
      });
    }
    for (let i = 0; i < MAX_BURSTS; i++) {
      const pop = scene.make.sprite({}, false);
      pop.setTexture(popFrame.texture, popFrame.frame).setDisplayOrigin(popAnchor.x, popAnchor.y);
      pop.setVisible(false);
      layers.vfx.add(pop);
      const young: Young[] = [];
      for (let k = 0; k < MAX_YOUNG; k++) {
        const s = scene.make.sprite({}, false).setVisible(false);
        layers.world.add(s);
        young.push({ sprite: s, facing: null });
      }
      this.#bursts.push({ active: false, ms: 0, route: null, dist0: 0, count: 0, pop, young });
    }
  }

  /**
   * A sack bursts at grid (x, y), `dist` tiles along `route`: the pop, and `young` young running
   * back up the route (at most MAX_YOUNG drawn). A null route shows the pop alone.
   */
  burst(x: number, y: number, route: CompiledRoute | null, dist: number, young: number): void {
    const b = this.#bursts[this.#next]!; // index < MAX_BURSTS
    this.#next = (this.#next + 1) % MAX_BURSTS;
    gridToScreen(x, y, this.#ctx.origin, pos);
    b.pop
      .setPosition(Math.round(pos.x), Math.round(pos.y))
      .setVisible(true)
      .play(this.#ctx.sprites.anim('fx.sack_burst', 'burst'));
    b.route = route;
    b.dist0 = dist;
    b.count = route === null ? 0 : Math.min(young, MAX_YOUNG);
    b.ms = 0;
    b.active = true;
    for (const kid of b.young) {
      kid.facing = null;
      kid.sprite.stop().setVisible(false);
    }
    this.#sync(b);
  }

  /** Advances every burst by `deltaMs` of real time. */
  update(deltaMs: number): void {
    const dt = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    for (const b of this.#bursts) {
      if (!b.active) continue;
      b.ms += dt;
      if (b.ms >= POP_MS && b.pop.visible) b.pop.stop().setVisible(false);
      if (b.ms >= Math.max(SCURRY_MS, POP_MS)) {
        this.#free(b);
        continue;
      }
      this.#sync(b);
    }
  }

  /** Hides everything (the scene is shutting down). */
  reset(): void {
    for (const b of this.#bursts) this.#free(b);
  }

  #free(b: Burst): void {
    b.active = false;
    b.route = null;
    b.pop.stop().setVisible(false);
    for (const y of b.young) y.sprite.stop().setVisible(false);
  }

  /** Places each young at its spot along the route, turned the way it runs, faded in steps. */
  #sync(b: Burst): void {
    const route = b.route;
    if (route === null) return;
    for (let i = 0; i < b.count; i++) {
      const y = b.young[i]!; // i < count ≤ MAX_YOUNG
      const d = scurryDist(b.dist0, b.ms, i);
      const alpha = scurryAlpha(b.ms, d);
      if (alpha <= 0) {
        if (y.sprite.visible) y.sprite.stop().setVisible(false);
        continue;
      }
      pointAt(route, d, at);
      pointAt(route, Math.max(0, d - LOOK_TILES), ahead);
      const dx = ahead.x - at.x;
      const dy = ahead.y - at.y;
      const facing = dx === 0 && dy === 0 ? (y.facing ?? 'nw') : facingOf(dx, dy);
      if (facing !== y.facing) {
        const w = this.#walk.get(facing)!; // every facing is cached
        y.sprite.play(w.key).setDisplayOrigin(w.ox, w.oy);
        y.facing = facing;
      }
      gridToScreen(at.x, at.y, this.#ctx.origin, pos);
      const lane = YOUNG_LANES_PX[i] ?? 0;
      const s = sideOf(dx, dy, side);
      const sx = Math.round(pos.x + (s?.x ?? 0) * lane);
      const sy = Math.round(pos.y + (s?.y ?? 0) * lane);
      y.sprite.setPosition(sx, sy).setAlpha(alpha).setVisible(true);
      y.sprite.setDepth(worldDepth(sy, 'enemy', YOUNG_UID + i));
    }
  }
}
