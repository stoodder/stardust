// The Unsung's marks on the field (T808's view, T830's look; design/enemies.md § 6, *How the
// Unsung runs*; the rules are unsungLook.ts). Its body is EnemyView's, in its phase's form sprite
// (`unsungBody`), and its rest is SongView's; this view draws what the body can't:
// - **The dig toward the choir:** while it is dug in, a `violet.3` ring (2 px) on the ground where
//   it will come up (`digTarget`), closing from a wide ring to a tight one as it travels
//   (`digRingTiles`); through the surfacing tell (`surfaceTelling`) the singers' ground churns: the
//   ring blinks `violet.4` ↔ `white.1` (steady `violet.4` under reduced motion) and `grime.3` clods
//   hop on it (`clodAt`; at rest under reduced motion).
// - **Surfacing** (`BossSurfaced`): a `violet.4` burst rings out where it comes up
//   (`surfaceBurstAt`), the light pouring up out of the mound as its `surface` anim plays.
// - **The Song's call** (`addsCalling`): a `violet.4` ring at its road's spawn, where the
//   Silencers walk in, through the call's 1.5 s tell.
// - **Held by the song** (M8 review R1; unsungLook.ts `heldBySong`): while the song holds it (or a
//   split part) at its circle's edge, the held body wears a 1 px `gold.4` rim on the side facing
//   the song (a fill-tinted copy of its frame, one pixel toward the song's centre, sorted just
//   under it: `rimToward`), sorts over the towers round it (EnemyView `setHoldLift`), and the boss
//   stands in a soft additive `violet.3` ground pool (`decal`); the floaters, bursts and sparks that
//   start on or round its frame draw dimmed (TransientFx `setDim`). Render-only: the fight is
//   unchanged. At night the split's parts must read among the spires (M8 R2): every held body
//   also sorts over each tower within one tile of it (`frontTowerNear`, depth.ts `held`), a held
//   part wears a whole 1 px `gold.4` silhouette (`partOutline`: four copies, the song's side whole),
//   and the dim box spans every held body.
// - **Thrown back** (D156; unsungLook.ts `thrownAt`): up among the singers the song drives it back
//   at once to where it dug in; the sim moves it in a tick, so its body is carried back from where
//   it came up (BossSurfaced's `at`) over THROW_MS (EnemyView `setThrowOffset`), a `violet.3` streak
//   trailing from there; a cut under reduced motion. The surfacing burst rings out at `at`.
// The rest progress under the boss bar is the HUD's (T832: the finale clock's countdown, its gold
// bar the song's rest; ui/hud/FinaleClock.tsx).
// One Graphics, redrawn each frame only while a mark shows. Allocation-free per frame.
import * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import {
  addsCalling,
  digTarget,
  laidToRestBySong,
  songCircles,
  surfaceTelling,
  type Enemy,
  type SimEvent,
} from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, HALF_H, HALF_W, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { poolImage } from '../vfx/glowPixels.ts';
import type { BodySnapshot } from './EnemyView.ts';
import {
  CHURN_CLODS,
  clodAt,
  digRingTiles,
  frontTowerNear,
  heldBySong,
  PART_OUTLINE_SIDES,
  partOutline,
  rimToward,
  SURFACE_BURST_MS,
  surfaceBurstAt,
  THROW_MIN_TILES,
  thrownAt,
  UNSUNG_DIM_ALPHA,
  UNSUNG_DIM_MARGIN_PX,
  UNSUNG_HOLD_LIFT_PX,
  UNSUNG_POOL_STRENGTH,
  UNSUNG_POOL_TILES,
  UNSUNG_RIM_COLOR,
  type TowerSpot,
} from './unsungLook.ts';
import type { ViewContext } from './ViewContext.ts';

const BLINK_MS = 120;
/** Surfacing bursts at once (two digs a fight; room to spare). */
const MAX_BURSTS = 4;
/** Throws back at once (one boss; room to spare). */
const MAX_THROWS = 2;
/** Bodies the song can hold at once: the Unsung, or its split's three parts (room to spare). */
const MAX_HELD = 4;
/** Rim copies at most: a part's silhouette is four (PART_OUTLINE_SIDES), the boss's rim one. */
const MAX_RIMS = MAX_HELD * 4;
const POOL_KEY = 'fx.unsung_pool';
/** The rim sorts this far under the body it outlines (less than any uid tie-break step). */
const RIM_UNDER = 1e-5;

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const C = {
  dig: hex('violet.3'),
  tell: hex('violet.4'),
  flash: hex('white.1'),
  frame: hex('ink.0'),
  clod: hex('grime.3'),
  rim: hex(UNSUNG_RIM_COLOR),
};

interface Burst {
  ms: number;
  x: number;
  y: number;
}

/** A throw back (see the header): who, from where it came up (grid), and how far in (ms; −1 off). */
interface Throw {
  uid: number;
  x: number;
  y: number;
  ms: number;
}

/** The sim state as this view reads it: the pools, the script phase, the song's circles. */
export type UnsungState = {
  readonly enemies: { readonly used: number; readonly items: readonly DeepReadonly<Enemy>[] };
  readonly towers: { readonly used: number; readonly items: readonly TowerSpot[] };
  readonly phase: number;
} & Parameters<typeof songCircles>[0];

/** A drawn enemy body as the hold reads and lifts it (EnemyView). */
export interface HeldBody {
  snapshot(out: BodySnapshot): boolean;
  setHoldLift(px: number, over?: number): void;
  setThrowOffset(dx: number, dy: number): void;
  readonly alpha: number;
  readonly depth: number;
}

/** What the hold needs from the scene (BattleScene): the drawn bodies, the effects, the map. */
export interface UnsungHoldDeps {
  readonly view: (uid: number) => HeldBody | undefined;
  readonly fx: {
    setDim(left: number, top: number, w: number, h: number, margin: number, alpha: number): void;
    clearDim(): void;
  } | null;
  readonly map: () => Parameters<typeof songCircles>[1];
}

const snap: BodySnapshot = {
  texture: '',
  frame: '',
  flipX: false,
  originX: 0,
  originY: 0,
  x: 0,
  y: 0,
  depth: 0,
  flying: false,
  anim: null,
  id: null,
};
const rim = { dx: 0, dy: 0 };
const thrown = { left: 0, alpha: 0 };
const t0: Vec2 = { x: 0, y: 0 };
const c0: Vec2 = { x: 0, y: 0 };
const front = { x: 0, y: 0 };
/** The box round every held body drawn this frame (screen px; the dim's). */
const box = { l: 0, t: 0, r: 0, b: 0 };

const p: Vec2 = { x: 0, y: 0 };
const s: Vec2 = { x: 0, y: 0 };
const clod = { dx: 0, dy: 0 };
const burst = { tiles: 0, alpha: 0 };

export class UnsungView {
  readonly #ctx: ViewContext;
  readonly #still: () => boolean;
  readonly #g: Phaser.GameObjects.Graphics;
  #drew = false;
  readonly #bursts: Burst[] = [];
  #nextBurst = 0;
  #burstsShown = 0;
  /** Marks shown this frame (the render-state hook). */
  #digs = 0;
  #tells = 0;
  #calls = 0;
  /** Surfacings and rises this battle (the smoke flow's checks). */
  surfacesSeen = 0;
  dugOutSeen = 0;
  risesSeen = 0;

  readonly #hold: UnsungHoldDeps | null;
  /** The rims (the boss's one, a part's four) and the boss's ground pool; made on first use. */
  readonly #rims: Phaser.GameObjects.Sprite[] = [];
  #pool: Phaser.GameObjects.Image | null = null;
  /** The bodies lifted last frame (uid; 0: none), so a body let go drops back. */
  readonly #lifted: number[] = [];
  #held = 0;
  /** Rim copies drawn this frame (the boss's one, a part's four). */
  #rimsShown = 0;
  #dimmed = false;
  readonly #throws: Throw[] = [];
  #nextThrow = 0;
  /** Throws back this battle, and the largest offset drawn this frame (px; the smoke flow's). */
  throwsSeen = 0;
  #thrownPx = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean, hold: UnsungHoldDeps | null = null) {
    this.#ctx = ctx;
    this.#still = reducedMotion;
    this.#hold = hold;
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#g);
    for (let i = 0; i < MAX_BURSTS; i++) this.#bursts.push({ ms: -1, x: 0, y: 0 });
    for (let i = 0; i < MAX_HELD; i++) this.#lifted.push(0);
    for (let i = 0; i < MAX_THROWS; i++) this.#throws.push({ uid: 0, x: 0, y: 0, ms: -1 });
  }

  bind(
    bus: Bus<SimEvent<IdSpace>>,
    pool: () => UnsungState['enemies'] | null = () => null,
  ): () => void {
    const offs = [
      bus.on('BossSurfaced', (e) => {
        this.surfacesSeen++;
        if (e.dugOut) this.dugOutSeen++;
        // T830: the light pours up where it comes up (`at`: the sim has already driven it back).
        const b = this.#bursts[this.#nextBurst]!; // index < MAX_BURSTS
        this.#nextBurst = (this.#nextBurst + 1) % MAX_BURSTS;
        b.ms = 0;
        b.x = e.at[0];
        b.y = e.at[1];
        // D156: driven back to where it dug in; its body is carried there (see the header).
        const en = pool();
        if (en === null) return;
        for (let i = 0; i < en.used; i++) {
          const u = en.items[i]!; // i < used ≤ items.length
          if (u.uid !== e.uid) continue;
          if (Math.hypot(u.x - e.at[0], u.y - e.at[1]) < THROW_MIN_TILES) break;
          const t = this.#throws[this.#nextThrow]!; // index < MAX_THROWS
          this.#nextThrow = (this.#nextThrow + 1) % MAX_THROWS;
          t.uid = u.uid;
          t.x = e.at[0];
          t.y = e.at[1];
          t.ms = 0;
          this.throwsSeen++;
          break;
        }
      }),
      bus.on('BossRisen', () => {
        this.risesSeen++;
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** What shows now: dig marks, surfacing tells, and calls. */
  get shown(): {
    digs: number;
    surfaceTells: number;
    calls: number;
    bursts: number;
    held: number;
    rims: number;
    thrown: number;
    thrownPx: number;
  } {
    let throwing = 0;
    for (let i = 0; i < MAX_THROWS; i++) if (this.#throws[i]!.ms >= 0) throwing++; // i < MAX_THROWS
    return {
      digs: this.#digs,
      surfaceTells: this.#tells,
      calls: this.#calls,
      bursts: this.#burstsShown,
      held: this.#held,
      rims: this.#rimsShown,
      thrown: throwing,
      thrownPx: this.#thrownPx,
    };
  }

  update(state: UnsungState, deltaMs = 0): void {
    const items = state.enemies.items;
    this.#digs = 0;
    this.#tells = 0;
    this.#calls = 0;
    const g = this.#g;
    if (this.#drew) g.clear();
    this.#drew = false;
    for (let i = 0; i < state.enemies.used; i++) {
      const e = items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null || e.def.boss === null) continue;
      if (digTarget(e, p)) {
        const telling = surfaceTelling(e);
        const dig = e.def.boss.phases[e.bossPhase - 1]?.burrow?.durationTicks ?? 1;
        // Wide as it digs in, tight under the singers (abilityTicks counts down the dig).
        const travel = 1 - Math.min(1, e.abilityTicks / dig);
        const tiles = digRingTiles(travel, telling);
        this.#ring(p.x, p.y, tiles, telling ? this.#blink() : C.dig);
        if (telling) this.#churn(p.x, p.y, tiles);
        this.#digs++;
        if (telling) this.#tells++;
      }
      if (addsCalling(e) && e.route !== null) {
        this.#ring(e.route.xs[0]!, e.route.ys[0]!, 1, C.tell); // a route has points
        this.#calls++;
      }
    }
    const dt = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    this.#drawBursts(dt);
    this.#drawThrows(state, dt);
    this.#drawHold(state);
  }

  /** Each throw back (see the header): the body carried from where it came up, its streak. */
  #drawThrows(state: UnsungState, dt: number): void {
    this.#thrownPx = 0;
    const hold = this.#hold;
    const still = this.#still();
    for (let k = 0; k < MAX_THROWS; k++) {
      const t = this.#throws[k]!; // k < MAX_THROWS
      if (t.ms < 0) continue;
      const view = hold?.view(t.uid);
      let e: DeepReadonly<Enemy> | null = null;
      for (let i = 0; i < state.enemies.used; i++) {
        const u = state.enemies.items[i]!; // i < used ≤ items.length
        if (u.uid === t.uid && u.alive) {
          e = u;
          break;
        }
      }
      thrownAt(t.ms, still, thrown);
      t.ms += dt;
      if (e === null || view === undefined || thrown.left <= 0) {
        view?.setThrowOffset(0, 0);
        t.ms = -1;
        continue;
      }
      gridToScreen(t.x, t.y, this.#ctx.origin, t0);
      gridToScreen(e.x, e.y, this.#ctx.origin, s);
      const ox = (t0.x - s.x) * thrown.left;
      const oy = (t0.y - s.y) * thrown.left;
      view.setThrowOffset(ox, oy);
      this.#thrownPx = Math.max(this.#thrownPx, Math.hypot(ox, oy));
      // The streak: from where it came up to where its body is now.
      const g = this.#g;
      g.lineStyle(3, C.frame, thrown.alpha * 0.6).lineBetween(t0.x, t0.y, s.x + ox, s.y + oy);
      g.lineStyle(1, C.dig, thrown.alpha).lineBetween(t0.x, t0.y, s.x + ox, s.y + oy);
      this.#drew = true;
    }
  }

  /** The song's hold on the Unsung and its parts (see the header). */
  #drawHold(state: UnsungState): void {
    const hold = this.#hold;
    if (hold === null) return;
    const circles = songCircles(state, hold.map());
    const items = state.enemies.items;
    const origin = this.#ctx.origin;
    let n = 0;
    let rims = 0;
    // The body that takes the pool: the boss's, else the first part's.
    let main = false;
    let mainBoss = false;
    for (let i = 0; i < state.enemies.used && n < MAX_HELD; i++) {
      const e = items[i]!; // i < used ≤ items.length
      if (!laidToRestBySong(e)) continue;
      const c = heldBySong(e, state.phase, circles);
      if (c === null) continue;
      const v = hold.view(e.uid);
      if (v === undefined || !v.snapshot(snap)) continue;
      // Over the towers round it: its lift, and at least the lowest-drawn one within a tile.
      let over = Number.NEGATIVE_INFINITY;
      if (frontTowerNear(e.x, e.y, state.towers, front)) {
        gridToScreen(front.x, front.y, origin, t0);
        over = worldDepth(t0.y, 'held', e.uid);
      }
      v.setHoldLift(UNSUNG_HOLD_LIFT_PX, over);
      gridToScreen(e.x, e.y, origin, p);
      gridToScreen(c.x, c.y, origin, c0);
      rimToward(p.x, p.y, c0.x, c0.y, rim);
      const isBoss = e.def !== null && e.def.boss !== null;
      if (isBoss) {
        // The copy under the body (its depth reads the lift just applied).
        this.#placeRim(rims++, v, rim.dx, rim.dy, 1);
      } else {
        // A part's whole silhouette, the song's side whole (unsungLook.ts `partOutline`).
        for (let k = 0; k < PART_OUTLINE_SIDES.length; k++) {
          const side = PART_OUTLINE_SIDES[k]!; // k < length
          this.#placeRim(
            rims++,
            v,
            side[0],
            side[1],
            partOutline(side[0], side[1], rim.dx, rim.dy),
          );
        }
      }
      if (!main || (isBoss && !mainBoss)) {
        main = true;
        mainBoss = isBoss;
        this.#placePool(p.x, p.y);
      }
      this.#boxAround(snap, n === 0);
      this.#lifted[n] = e.uid;
      n++;
    }
    // Bodies let go since last frame drop back to their own sort.
    for (let k = 0; k < MAX_HELD; k++) {
      const uid = this.#lifted[k]!; // k < MAX_HELD
      if (k >= n && uid !== 0) {
        hold.view(uid)?.setHoldLift(0);
        this.#lifted[k] = 0;
      }
    }
    for (let k = rims; k < this.#rims.length; k++) {
      const r = this.#rims[k]!; // k < length
      if (r.visible) r.setVisible(false);
    }
    this.#rimsShown = rims;
    if (n > 0) {
      // Every held body's frame, dimmed round (see the header).
      hold.fx?.setDim(
        box.l,
        box.t,
        box.r - box.l,
        box.b - box.t,
        UNSUNG_DIM_MARGIN_PX,
        UNSUNG_DIM_ALPHA,
      );
      this.#dimmed = true;
    } else {
      this.#pool?.setVisible(false);
      if (this.#dimmed) hold.fx?.clearDim();
      this.#dimmed = false;
    }
    this.#held = n;
  }

  /** Rim copy `k`: the held body's frame `snap`, (dx, dy) px off, sorted just under it, at `a` of its alpha. */
  #placeRim(k: number, v: HeldBody, dx: number, dy: number, a: number): void {
    if (k >= MAX_RIMS) return;
    this.#rim(k)
      .setTexture(snap.texture, snap.frame)
      .setFlipX(snap.flipX)
      .setDisplayOrigin(snap.originX, snap.originY)
      .setPosition(snap.x + dx, snap.y + dy)
      .setDepth(v.depth - RIM_UNDER)
      .setAlpha(v.alpha * a)
      .setVisible(true);
  }

  /** The rim sprite `k`, made on first use in `world`. */
  #rim(k: number): Phaser.GameObjects.Sprite {
    let r = this.#rims[k];
    if (r === undefined) {
      r = this.#ctx.scene.make.sprite({}, false);
      r.setTint(C.rim).setTintMode(Phaser.TintModes.FILL);
      this.#ctx.layers.world.add(r);
      this.#rims.push(r);
    }
    return r;
  }

  /** Grows the dim box round body frame `body` (starts it afresh when `first`). */
  #boxAround(body: BodySnapshot, first: boolean): void {
    const f = this.#ctx.scene.textures.getFrame(body.texture, body.frame);
    const w = f?.width ?? 0;
    const h = f?.height ?? 0;
    const l = body.flipX ? body.x - (w - body.originX) : body.x - body.originX;
    const t = body.y - body.originY;
    if (first) {
      box.l = l;
      box.t = t;
      box.r = l + w;
      box.b = t + h;
      return;
    }
    box.l = Math.min(box.l, l);
    box.t = Math.min(box.t, t);
    box.r = Math.max(box.r, l + w);
    box.b = Math.max(box.b, t + h);
  }

  /** The boss's ground pool at screen (x, y). */
  #placePool(x: number, y: number): void {
    const { scene, layers } = this.#ctx;
    if (this.#pool === null) {
      if (!scene.textures.exists(POOL_KEY)) {
        const baked = poolImage(UNSUNG_POOL_TILES, 'violet.3', UNSUNG_POOL_STRENGTH);
        scene.textures.addCanvas(POOL_KEY, imageToCanvas(baked.img));
      }
      const tex = scene.textures.get(POOL_KEY).getSourceImage();
      this.#pool = scene.make.image({}, false).setTexture(POOL_KEY);
      this.#pool.setDisplayOrigin(tex.width / 2, tex.height / 2);
      this.#pool.setBlendMode(Phaser.BlendModes.ADD);
      layers.decal.add(this.#pool);
    }
    this.#pool.setPosition(Math.round(x), Math.round(y)).setVisible(true);
  }

  /** The singers' ground churning through the surfacing tell: clods hopping on the ring. */
  #churn(gx: number, gy: number, tiles: number): void {
    gridToScreen(gx, gy, this.#ctx.origin, s);
    const still = this.#still();
    const now = performance.now();
    const g = this.#g;
    for (let i = 0; i < CHURN_CLODS; i++) {
      clodAt(i, now, tiles * HALF_W * 2, tiles * HALF_H * 2, still, clod);
      const x = Math.round(s.x) + clod.dx;
      const y = Math.round(s.y) + clod.dy;
      g.fillStyle(C.frame, 1).fillRect(x - 1, y - 1, 4, 3);
      g.fillStyle(C.clod, 1).fillRect(x, y - 1, 2, 2);
    }
  }

  #drawBursts(dt: number): void {
    this.#burstsShown = 0;
    const still = this.#still();
    for (let k = 0; k < MAX_BURSTS; k++) {
      const b = this.#bursts[k]!; // k < MAX_BURSTS
      if (b.ms < 0) continue;
      surfaceBurstAt(b.ms, still, burst);
      b.ms += dt;
      if (burst.alpha <= 0 || b.ms > SURFACE_BURST_MS) {
        b.ms = -1;
        continue;
      }
      gridToScreen(b.x, b.y, this.#ctx.origin, s);
      const w = burst.tiles * HALF_W * 2;
      const h = burst.tiles * HALF_H * 2;
      this.#g.lineStyle(3, C.frame, burst.alpha * 0.6).strokeEllipse(s.x, s.y, w, h);
      this.#g.lineStyle(2, C.tell, burst.alpha).strokeEllipse(s.x, s.y, w, h);
      this.#g.lineStyle(1, C.flash, burst.alpha).strokeEllipse(s.x, s.y, w * 0.6, h * 0.6);
      this.#drew = true;
      this.#burstsShown++;
    }
  }

  reset(): void {
    this.#g.clear();
    this.#drew = false;
    for (const b of this.#bursts) b.ms = -1;
    for (const r of this.#rims) r.setVisible(false);
    this.#rimsShown = 0;
    this.#pool?.setVisible(false);
    if (this.#dimmed) this.#hold?.fx?.clearDim();
    this.#dimmed = false;
    this.#lifted.fill(0);
    this.#held = 0;
    for (const t of this.#throws) {
      if (t.ms >= 0) this.#hold?.view(t.uid)?.setThrowOffset(0, 0);
      t.ms = -1;
    }
    this.#thrownPx = 0;
  }

  #blink(): number {
    if (this.#still()) return C.tell;
    return Math.floor(performance.now() / BLINK_MS) % 2 === 0 ? C.tell : C.flash;
  }

  /** A ground ring `tiles` across at grid point (gx, gy): an iso ellipse. */
  #ring(gx: number, gy: number, tiles: number, color: number): void {
    gridToScreen(gx, gy, this.#ctx.origin, s);
    const w = tiles * HALF_W * 2;
    const h = tiles * HALF_H * 2;
    this.#g.lineStyle(2, color, 1).strokeEllipse(s.x, s.y, w, h);
    this.#drew = true;
  }
}
