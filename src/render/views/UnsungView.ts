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
//   unchanged.
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
import { gridToScreen, HALF_H, HALF_W, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { poolImage } from '../vfx/glowPixels.ts';
import type { BodySnapshot } from './EnemyView.ts';
import {
  CHURN_CLODS,
  clodAt,
  digRingTiles,
  heldBySong,
  rimToward,
  SURFACE_BURST_MS,
  surfaceBurstAt,
  UNSUNG_DIM_ALPHA,
  UNSUNG_DIM_MARGIN_PX,
  UNSUNG_HOLD_LIFT_PX,
  UNSUNG_POOL_STRENGTH,
  UNSUNG_POOL_TILES,
  UNSUNG_RIM_COLOR,
} from './unsungLook.ts';
import type { ViewContext } from './ViewContext.ts';

const BLINK_MS = 120;
/** Surfacing bursts at once (two digs a fight; room to spare). */
const MAX_BURSTS = 4;
/** Bodies the song can hold at once: the Unsung, or its split's three parts (room to spare). */
const MAX_HELD = 4;
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

/** The sim state as this view reads it: the enemy pool, the script phase, the song's circles. */
export type UnsungState = {
  readonly enemies: { readonly used: number; readonly items: readonly DeepReadonly<Enemy>[] };
  readonly phase: number;
} & Parameters<typeof songCircles>[0];

/** A drawn enemy body as the hold reads and lifts it (EnemyView). */
export interface HeldBody {
  snapshot(out: BodySnapshot): boolean;
  setHoldLift(px: number): void;
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
const c0: Vec2 = { x: 0, y: 0 };

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
  /** The rims (one per held body) and the boss's ground pool; made on the first hold. */
  readonly #rims: Phaser.GameObjects.Sprite[] = [];
  #pool: Phaser.GameObjects.Image | null = null;
  /** The bodies lifted last frame (uid; 0: none), so a body let go drops back. */
  readonly #lifted: number[] = [];
  #held = 0;
  #dimmed = false;

  constructor(ctx: ViewContext, reducedMotion: () => boolean, hold: UnsungHoldDeps | null = null) {
    this.#ctx = ctx;
    this.#still = reducedMotion;
    this.#hold = hold;
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#g);
    for (let i = 0; i < MAX_BURSTS; i++) this.#bursts.push({ ms: -1, x: 0, y: 0 });
    for (let i = 0; i < MAX_HELD; i++) this.#lifted.push(0);
  }

  bind(
    bus: Bus<SimEvent<IdSpace>>,
    pool: () => UnsungState['enemies'] | null = () => null,
  ): () => void {
    const offs = [
      bus.on('BossSurfaced', (e) => {
        this.surfacesSeen++;
        if (e.dugOut) this.dugOutSeen++;
        // T830: the light pours up where it comes up.
        const en = pool();
        if (en === null) return;
        for (let i = 0; i < en.used; i++) {
          const u = en.items[i]!; // i < used ≤ items.length
          if (u.uid !== e.uid) continue;
          const b = this.#bursts[this.#nextBurst]!; // index < MAX_BURSTS
          this.#nextBurst = (this.#nextBurst + 1) % MAX_BURSTS;
          b.ms = 0;
          b.x = u.x;
          b.y = u.y;
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
  } {
    return {
      digs: this.#digs,
      surfaceTells: this.#tells,
      calls: this.#calls,
      bursts: this.#burstsShown,
      held: this.#held,
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
    this.#drawBursts(Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0);
    this.#drawHold(state);
  }

  /** The song's hold on the Unsung and its parts (see the header). */
  #drawHold(state: UnsungState): void {
    const hold = this.#hold;
    if (hold === null) return;
    const circles = songCircles(state, hold.map());
    const items = state.enemies.items;
    let n = 0;
    // The body that takes the pool and the dim: the boss's, else the first part's.
    let main = false;
    let mainBoss = false;
    for (let i = 0; i < state.enemies.used && n < MAX_HELD; i++) {
      const e = items[i]!; // i < used ≤ items.length
      if (!laidToRestBySong(e)) continue;
      const c = heldBySong(e, state.phase, circles);
      if (c === null) continue;
      const v = hold.view(e.uid);
      if (v === undefined || !v.snapshot(snap)) continue;
      v.setHoldLift(UNSUNG_HOLD_LIFT_PX);
      gridToScreen(e.x, e.y, this.#ctx.origin, p);
      gridToScreen(c.x, c.y, this.#ctx.origin, c0);
      rimToward(p.x, p.y, c0.x, c0.y, rim);
      // The copy under the body (its depth reads the lift just applied).
      this.#rim(n)
        .setTexture(snap.texture, snap.frame)
        .setFlipX(snap.flipX)
        .setDisplayOrigin(snap.originX, snap.originY)
        .setPosition(snap.x + rim.dx, snap.y + rim.dy)
        .setDepth(v.depth - RIM_UNDER)
        .setAlpha(v.alpha)
        .setVisible(true);
      const isBoss = e.def !== null && e.def.boss !== null;
      if (!main || (isBoss && !mainBoss)) {
        main = true;
        mainBoss = isBoss;
        this.#placePool(p.x, p.y, snap);
      }
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
    for (let k = n; k < this.#rims.length; k++) this.#rims[k]!.setVisible(false); // k < length
    if (!main) {
      this.#pool?.setVisible(false);
      if (this.#dimmed) hold.fx?.clearDim();
      this.#dimmed = false;
    }
    this.#held = n;
  }

  /** The rim sprite for held body `k`, made on first use in `world`. */
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

  /** The boss's ground pool at screen (x, y), and the dim round its drawn frame `body`. */
  #placePool(x: number, y: number, body: BodySnapshot): void {
    const { scene, layers } = this.#ctx;
    if (this.#pool === null) {
      if (!scene.textures.exists(POOL_KEY)) {
        const baked = poolImage(UNSUNG_POOL_TILES, 'violet.3', UNSUNG_POOL_STRENGTH);
        scene.textures.addCanvas(POOL_KEY, imageToCanvas(baked.img));
      }
      const tex = scene.textures.get(POOL_KEY).getSourceImage();
      this.#pool = scene.make.image({ key: POOL_KEY }, false);
      this.#pool.setDisplayOrigin(tex.width / 2, tex.height / 2);
      this.#pool.setBlendMode(Phaser.BlendModes.ADD);
      layers.decal.add(this.#pool);
    }
    this.#pool.setPosition(Math.round(x), Math.round(y)).setVisible(true);
    const f = scene.textures.getFrame(body.texture, body.frame);
    const w = f?.width ?? 0;
    const h = f?.height ?? 0;
    const left = body.flipX ? body.x - (w - body.originX) : body.x - body.originX;
    this.#hold?.fx?.setDim(left, body.y - body.originY, w, h, UNSUNG_DIM_MARGIN_PX, UNSUNG_DIM_ALPHA);
    this.#dimmed = true;
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
    for (const b of this.#bursts) {
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
    this.#pool?.setVisible(false);
    if (this.#dimmed) this.#hold?.fx?.clearDim();
    this.#dimmed = false;
    this.#lifted.fill(0);
    this.#held = 0;
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
