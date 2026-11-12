// The finale's choir on its walk (design/maps.md § 5.5; sim/choir.ts; T804's view, T830's look:
// the rules are choirWalkLook.ts). It reads sim state only, so it holds while paused:
// - **The column:** each choir member (allies of mode `choir`, the Returned aside: BearerView) in
//   its own sprite and pose: Pebble leading (`walk`, `sing`, `halt` only while halted), Old Thrum
//   beside her, the singers (`walk`, `sing`, `hushed` as they trail). Each faces the way it last
//   moved (up the road to begin with). A singer held in a hush tell freezes on its frame. The
//   members still waiting at the colony gate stand queued beside it (`queuePoint`), filing out as
//   the leader makes room.
// - **The song's circles** (`songCircles`): a baked dashed `gold.4` ring at each radius over a soft
//   `gold.3` fill pulsing on the hymn's beat, in `decal`.
// - **The halt window:** the road from Pebble `haltTiles` toward the Hollow, faint gold while she
//   walks, red while the choir is halted (and a HALTED plate over her head, in `overlay`); hidden
//   while the choir waits at a leg's end or once it has arrived.
// Pooled bodies; ring textures baked once per radius; the fill and window are two Graphics redrawn
// from preallocated scratch only when what they show changes (a circle moves or grows, the window's
// screen points or its colour change; the fill's beat is the Graphics' own alpha), so a still choir
// redraws nothing (M8 R2). Nothing allocates per frame.
import type * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { IdSpace } from '../../content/types.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { isHushedSinger, songCircles, type Ally, type SimState } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, rangeEllipsePx, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import {
  gateOf,
  HALT_PLATE_LIFT_PX,
  haltPlateImage,
  memberPose,
  memberSprite,
  queueDepth,
  queuePoint,
  SONG_FILL_COLOR,
  SONG_RING_COLOR,
  SONG_RING_UNDER,
  songFillAlpha,
  songRingShift,
  WINDOW_BAR_TILES,
  WINDOW_HALT,
  WINDOW_UNDER,
  WINDOW_WALK,
  windowPath,
  type Gate,
  type MemberPose,
} from './choirWalkLook.ts';
import { refugeeLanePx } from './refugeeLook.ts';
import { facingOf, hasAnim, type Facing } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import { ViewPool, type PooledView } from './ViewPool.ts';

/** Old Thrum walks this far (px) to Pebble's right and a step behind her (up the screen), sorted
 * behind her, so the leader always shows in front of the big old shell. */
const THRUM_SIDE_PX = 18;
const THRUM_BACK_PX = 4;
/** Song circles drawn at once: the leader's and each Returned's (2), with room to spare. */
const MAX_RINGS = 4;
/** The window path's points (the road's corners within `haltTiles`, and its two ends). */
const MAX_WINDOW_POINTS = 12;
const PLATE_KEY = 'fx.choir_halted';

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const FILL = hex(SONG_FILL_COLOR);
const WALK = hex(WINDOW_WALK);
const HALT = hex(WINDOW_HALT);
const UNDER = hex(WINDOW_UNDER);

const pos: Vec2 = { x: 0, y: 0 };
const semi: Vec2 = { x: 0, y: 0 };
const tip: Vec2 = { x: 0, y: 0 };
const grid = { x: 0, y: 0 };
const winX: number[] = Array.from({ length: MAX_WINDOW_POINTS }, () => 0);
const winY: number[] = Array.from({ length: MAX_WINDOW_POINTS }, () => 0);
/** The window's points on screen this frame: its path, then the bar's two ends. */
const winSx: number[] = Array.from({ length: MAX_WINDOW_POINTS + 2 }, () => 0);
const winSy: number[] = Array.from({ length: MAX_WINDOW_POINTS + 2 }, () => 0);
/** The fill's ellipses this frame (screen centre and size). */
const fillX: number[] = Array.from({ length: MAX_RINGS }, () => 0);
const fillY: number[] = Array.from({ length: MAX_RINGS }, () => 0);
const fillW: number[] = Array.from({ length: MAX_RINGS }, () => 0);
const fillH: number[] = Array.from({ length: MAX_RINGS }, () => 0);

/** Whether the first `n` of `a` differ from `b`'s, copying `a` into `b` when they do. */
function differs(a: number[], b: number[], n: number): boolean {
  let diff = false;
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) continue;
    diff = true;
    b[i] = a[i]!; // i < n ≤ length
  }
  return diff;
}

type MemberLike = Readonly<
  Pick<Ally, 'x' | 'y' | 'hushUid' | 'pebble' | 'kind' | 'alive' | 'mode' | 'vulnerability'>
>;

class MemberView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  #sprite: SpriteId = 'ally.singer';
  #facing: Facing = 'ne';
  #pose: MemberPose = 'sing';
  /** Where it was drawn (grid), and the sim tick it was last moved on. */
  #x = Number.NaN;
  #y = Number.NaN;
  #tick = -1;
  #moving = false;
  #side = 0;
  #back = 0;
  #uid = 0;
  hushed = false;
  /** Drawn in the gate queue this frame. */
  queued = false;
  /** Screen px of its feet (the HALTED plate rides over Pebble's). */
  readonly at: Vec2 = { x: 0, y: 0 };

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    ctx.layers.world.add(this.#body);
    this.release();
  }

  get pose(): MemberPose {
    return this.#pose;
  }

  show(uid: number, a: MemberLike, facing: Facing): void {
    this.#uid = uid;
    this.#sprite = memberSprite(a);
    // Thrum beside Pebble; each walking singer a little to the side by uid (the refugees' lanes).
    this.#side = a.kind === 'thrum' ? THRUM_SIDE_PX : a.pebble ? 0 : refugeeLanePx(uid, false);
    this.#back = a.kind === 'thrum' ? THRUM_BACK_PX : 0;
    this.#facing = facing;
    this.#pose = 'sing';
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#tick = -1;
    this.#moving = false;
    this.hushed = false;
    this.queued = false;
    this.#body.setAlpha(1).setVisible(true);
    this.#play();
  }

  /** Places it at grid (gx, gy) and picks its pose (choirWalkLook.ts `memberPose`). */
  sync(
    a: MemberLike,
    gx: number,
    gy: number,
    queued: boolean,
    choir: DeepReadonly<SimState['choir']>,
    tick: number,
  ): void {
    const moved = gx !== this.#x || gy !== this.#y;
    if (tick !== this.#tick) {
      // Only a tick that ran changes walk to sing: paused, the pose holds.
      this.#tick = tick;
      this.#moving = moved && !Number.isNaN(this.#x);
    }
    let facing = this.#facing;
    if (moved && !Number.isNaN(this.#x)) facing = facingOf(gx - this.#x, gy - this.#y);
    this.hushed = isHushedSinger(a);
    this.queued = queued;
    const pose = memberPose(a, this.hushed, choir, this.#moving);
    if (pose !== this.#pose || facing !== this.#facing) {
      this.#pose = pose;
      this.#facing = facing;
      this.#play();
    }
    // A singer held in a hush tell freezes; a walk holds its frame while paused.
    const still = a.hushUid !== 0 || (pose === 'walk' && !moved);
    const anims = this.#body.anims;
    if (still && anims.isPlaying) anims.pause();
    else if (!still && anims.isPaused) anims.resume();
    if (!moved) return;
    this.#x = gx;
    this.#y = gy;
    gridToScreen(gx, gy, this.#ctx.origin, pos);
    const x = Math.round(pos.x + (queued ? 0 : this.#side));
    const y = Math.round(pos.y) - this.#back;
    this.at.x = x;
    this.at.y = y;
    this.#body.setPosition(x, y).setDepth(worldDepth(pos.y - this.#back, 'enemy', this.#uid));
  }

  release(): void {
    this.#uid = 0;
    this.#body.stop();
    this.#body.setVisible(false);
  }

  #play(): void {
    const key = `${this.#pose}_${this.#facing}`;
    if (!hasAnim(this.#sprite, key)) return;
    const sprites = this.#ctx.sprites;
    this.#body.play(sprites.anim(this.#sprite, key, DEFAULT_VARIANT), true);
    const a = sprites.frameAnchor(this.#sprite, `${key}_0`);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}

interface Ring {
  readonly img: Phaser.GameObjects.Image;
  radius: number;
  shift: number;
}

/** The choir's bodies, its song circles, and its halt window, synced each frame (BattleScene). */
export class ChoirWalkView {
  readonly #ctx: ViewContext;
  readonly #reduced: () => boolean;
  readonly #pool: ViewPool<MemberView>;
  readonly #fill: Phaser.GameObjects.Graphics;
  readonly #win: Phaser.GameObjects.Graphics;
  readonly #rings: Ring[] = [];
  readonly #frames = new Map<string, { ox: number; oy: number }>();
  readonly #plate: Phaser.GameObjects.Image;
  readonly #gate: Gate = { x: 0, y: 0, fx: 0, fy: -1, sx: 1, sy: 0 };
  #gateMap: unknown = null;
  #ringCount = 0;
  #halted = false;
  #window: 'none' | 'walk' | 'halt' = 'none';
  /** What the fill and the window Graphics hold now (redrawn only on change; see the header). */
  #fillN = -1;
  readonly #fillDrawn = { x: [0, 0, 0, 0], y: [0, 0, 0, 0], w: [0, 0, 0, 0], h: [0, 0, 0, 0] };
  #winDrawn: 'none' | 'walk' | 'halt' = 'none';
  #winN = 0;
  readonly #winDrawnX: number[] = Array.from({ length: MAX_WINDOW_POINTS + 2 }, () => 0);
  readonly #winDrawnY: number[] = Array.from({ length: MAX_WINDOW_POINTS + 2 }, () => 0);

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#reduced = reducedMotion;
    this.#pool = new ViewPool(() => new MemberView(ctx));
    const scene = ctx.scene;
    this.#fill = scene.make.graphics({}, false);
    ctx.layers.decal.add(this.#fill);
    for (let i = 0; i < MAX_RINGS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#rings.push({ img, radius: 0, shift: -1 });
    }
    this.#win = scene.make.graphics({}, false);
    ctx.layers.decal.add(this.#win);
    if (!scene.textures.exists(PLATE_KEY)) {
      scene.textures.addCanvas(PLATE_KEY, imageToCanvas(haltPlateImage()));
    }
    this.#plate = scene.make.image({}, false).setTexture(PLATE_KEY).setOrigin(0.5, 1);
    this.#plate.setVisible(false);
    ctx.layers.overlay.add(this.#plate);
  }

  update(
    state: DeepReadonly<Pick<SimState, 'allies' | 'choir' | 'tick'>>,
    map: CompiledMapDef<IdSpace>,
    stamp: number,
  ): void {
    this.#ringCount = 0;
    this.#halted = false;
    this.#window = 'none';
    const c = map.choir;
    if (c === null) {
      this.#drawFill(0, 1);
      this.#drawWindow(0);
      this.#hideRings(0);
      this.#plate.setVisible(false);
      return;
    }
    const ch = state.choir;
    const route = c.route;
    const end = route.lengthTiles;
    if (this.#gateMap !== map) {
      // The queue's side: the one that keeps the longest queue (the warren's 28) on the map.
      gateOf(route, map.cols, map.rows, 30 * 0.3, this.#gate);
      this.#gateMap = map;
    }
    const upRoad = facingOf(this.#gate.fx, this.#gate.fy);
    const toGate = facingOf(-this.#gate.sx, -this.#gate.sy);
    // The column's ranks, as sim/choir.ts files it: singing singers, the Returned, the hushed.
    const allies = state.allies;
    let singing = 0;
    let returned = 0;
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.mode !== 'choir') continue;
      if (a.kind === 'bearer') returned++;
      else if (!a.pebble && a.kind === 'singer' && a.vulnerability === 'hush') singing++;
    }
    let s = 0;
    let h = 0;
    let pebble: MemberView | null = null;
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.mode !== 'choir' || a.kind === 'bearer') continue;
      let rank = 0;
      if (a.kind === 'singer' && !a.pebble) {
        rank = a.vulnerability === 'hush' ? 1 + s++ : 1 + singing + returned + h++;
      }
      // Still on the gate (the sim's road end) with its place behind it: queued beside the gate.
      const q = queueDepth(rank, ch.dist);
      const queued = rank > 0 && q > 0 && a.dist >= end - 1e-9;
      let v = this.#pool.get(a.uid);
      if (v === undefined) {
        v = this.#pool.acquire(a.uid);
        v.show(a.uid, a, queued ? toGate : upRoad); // a queued one faces the gate
      }
      v.stamp = stamp;
      if (queued) queuePoint(this.#gate, q, a.uid % 2 === 0 ? 0 : 1, grid);
      else {
        grid.x = a.x;
        grid.y = a.y;
      }
      v.sync(a, grid.x, grid.y, queued, ch, state.tick);
      if (a.pebble) pebble = v;
    }
    this.#pool.sweep(stamp);

    const reduced = this.#reduced();
    const circles = songCircles(state, map);
    const fillAlpha = songFillAlpha(state.tick, reduced);
    const shift = songRingShift(state.tick, reduced);
    let r = 0;
    for (let i = 0; i < circles.length && r < MAX_RINGS; i++) {
      const sc = circles[i]!; // i < length
      gridToScreen(sc.x, sc.y, this.#ctx.origin, pos);
      rangeEllipsePx(sc.r, semi);
      fillX[r] = pos.x;
      fillY[r] = pos.y;
      fillW[r] = semi.x * 2;
      fillH[r] = semi.y * 2;
      this.#ring(r++, sc.r, shift, Math.round(pos.x), Math.round(pos.y));
    }
    this.#ringCount = r;
    this.#hideRings(r);
    this.#drawFill(r, fillAlpha);

    this.#halted = ch.halted;
    const plate = ch.halted && !ch.arrived && pebble !== null;
    if (plate && pebble !== null) {
      this.#plate.setPosition(pebble.at.x, pebble.at.y - HALT_PLATE_LIFT_PX);
    }
    if (this.#plate.visible !== plate) this.#plate.setVisible(plate);
    if (ch.arrived || ch.waiting) {
      this.#drawWindow(0);
      return;
    }
    // The halt window: haltTiles up the road (toward its spawn) from the leader.
    const lead = end - ch.dist;
    const n = windowPath(route, lead, lead - c.haltTiles, winX, winY);
    this.#window = ch.halted ? 'halt' : 'walk';
    for (let i = 0; i < n; i++) {
      gridToScreen(winX[i]!, winY[i]!, this.#ctx.origin, pos); // i < n ≤ MAX_WINDOW_POINTS
      winSx[i] = pos.x;
      winSy[i] = pos.y;
    }
    // The bar across the road at the window's far edge.
    const lx = winX[n - 1]!; // n ≥ 2
    const ly = winY[n - 1]!;
    let dx = winX[n - 2]! - lx;
    let dy = winY[n - 2]! - ly;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    gridToScreen(lx - dy * WINDOW_BAR_TILES, ly + dx * WINDOW_BAR_TILES, this.#ctx.origin, pos);
    gridToScreen(lx + dy * WINDOW_BAR_TILES, ly - dx * WINDOW_BAR_TILES, this.#ctx.origin, tip);
    winSx[n] = pos.x;
    winSy[n] = pos.y;
    winSx[n + 1] = tip.x;
    winSy[n + 1] = tip.y;
    this.#drawWindow(n);
  }

  /**
   * The song circles' soft fill: the `n` ellipses in fillX…fillH, redrawn only when one moved or
   * grew (or their count changed); the beat is the Graphics' alpha.
   */
  #drawFill(n: number, alpha: number): void {
    const d = this.#fillDrawn;
    // Every array compared (each `differs` copies what changed), then one redraw if any did.
    let changed = n !== this.#fillN;
    if (differs(fillX, d.x, n)) changed = true;
    if (differs(fillY, d.y, n)) changed = true;
    if (differs(fillW, d.w, n)) changed = true;
    if (differs(fillH, d.h, n)) changed = true;
    if (changed) {
      this.#fillN = n;
      const g = this.#fill;
      g.clear();
      for (let i = 0; i < n; i++) {
        g.fillStyle(FILL, 1).fillEllipse(d.x[i]!, d.y[i]!, d.w[i]!, d.h[i]!); // i < n ≤ MAX_RINGS
      }
    }
    if (this.#fill.alpha !== alpha) this.#fill.setAlpha(alpha);
  }

  /**
   * The halt window (`#window`'s look) from its `n` path points and the bar's two ends in
   * winSx/winSy (n = 0: none), redrawn only when a point or the look changed.
   */
  #drawWindow(n: number): void {
    const look = n === 0 ? 'none' : this.#window;
    let changed = n !== this.#winN || look !== this.#winDrawn;
    if (n > 0 && differs(winSx, this.#winDrawnX, n + 2)) changed = true;
    if (n > 0 && differs(winSy, this.#winDrawnY, n + 2)) changed = true;
    if (!changed) return;
    this.#winN = n;
    this.#winDrawn = look;
    const g = this.#win;
    g.clear();
    if (look === 'none') return;
    const halted = look === 'halt';
    if (halted) {
      this.#stroke(n, 4, UNDER, 0.6);
      this.#stroke(n, 2, HALT, 1);
    } else {
      this.#stroke(n, 1, WALK, 0.5);
    }
    const bx = this.#winDrawnX;
    const by = this.#winDrawnY;
    if (halted) g.lineStyle(4, UNDER, 0.6).lineBetween(bx[n]!, by[n]!, bx[n + 1]!, by[n + 1]!);
    g.lineStyle(halted ? 2 : 1, halted ? HALT : WALK, halted ? 1 : 0.6);
    g.lineBetween(bx[n]!, by[n]!, bx[n + 1]!, by[n + 1]!);
  }

  releaseAll(): void {
    this.#pool.releaseAll();
    this.#fill.clear();
    this.#win.clear();
    this.#fillN = -1;
    this.#winDrawn = 'none';
    this.#winN = 0;
    this.#hideRings(0);
    this.#plate.setVisible(false);
    this.#ringCount = 0;
    this.#halted = false;
    this.#window = 'none';
    this.#gateMap = null;
  }

  /** The render-state hook's view: members drawn, by pose, queued; song rings; the halt. */
  get counts(): {
    readonly shown: number;
    readonly hushed: number;
    readonly rings: number;
    readonly halted: boolean;
    readonly plate: boolean;
    readonly window: 'none' | 'walk' | 'halt';
    readonly queued: number;
    readonly poses: { walk: number; sing: number; halt: number; hushed: number };
  } {
    let shown = 0;
    let hushed = 0;
    let queued = 0;
    const poses = { walk: 0, sing: 0, halt: 0, hushed: 0 };
    for (const v of this.#pool.live.values()) {
      shown++;
      if (v.hushed) hushed++;
      if (v.queued) queued++;
      poses[v.pose]++;
    }
    return {
      shown,
      hushed,
      rings: this.#ringCount,
      halted: this.#halted,
      plate: this.#plate.visible,
      window: this.#window,
      queued,
      poses,
    };
  }

  /** Strokes the window's path (its `n` screen points as drawn) `px` wide. */
  #stroke(n: number, px: number, color: number, alpha: number): void {
    const g = this.#win;
    g.lineStyle(px, color, alpha);
    g.beginPath();
    const xs = this.#winDrawnX;
    const ys = this.#winDrawnY;
    for (let i = 0; i < n; i++) {
      if (i === 0)
        g.moveTo(xs[i]!, ys[i]!); // i < n ≤ MAX_WINDOW_POINTS
      else g.lineTo(xs[i]!, ys[i]!);
    }
    g.strokePath();
  }

  /** Shows ring `k` at screen (x, y) for `radiusTiles`, its dashes at `shift`. */
  #ring(k: number, radiusTiles: number, shift: 0 | 1, x: number, y: number): void {
    const ring = this.#rings[k]!; // k < MAX_RINGS
    const radius = snapRingRadius(radiusTiles);
    if (ring.radius !== radius || ring.shift !== shift) {
      const key = `fx.song_ring.${radius}.${shift}`;
      let f = this.#frames.get(key);
      if (f === undefined) {
        const baked = ringImage(radius, SONG_RING_COLOR, true, SONG_RING_UNDER, shift);
        if (!this.#ctx.scene.textures.exists(key)) {
          this.#ctx.scene.textures.addCanvas(key, imageToCanvas(baked.image));
        }
        f = { ox: baked.cx, oy: baked.cy };
        this.#frames.set(key, f);
      }
      ring.img.setTexture(key).setDisplayOrigin(f.ox, f.oy);
      ring.radius = radius;
      ring.shift = shift;
    }
    ring.img.setPosition(x, y).setVisible(true);
  }

  #hideRings(from: number): void {
    for (let i = from; i < MAX_RINGS; i++) {
      const ring = this.#rings[i]!; // i < MAX_RINGS
      if (ring.img.visible) ring.img.setVisible(false);
    }
  }
}
