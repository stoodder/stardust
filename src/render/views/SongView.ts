// The Leaving Song's rest and scatter on screen (T805's view, T830's look; design/maps.md § 5.5;
// the motion is songLook.ts, the Unsung's own rest unsungLook.ts). Real time, cosmetic.
// - **A death on a song map waits for the song's word** (`holdDeath`, from battleEvents.ts's
//   `EnemyDied`): a Hollow unit's body is copied as drawn (EnemyView.snapshot) instead of
//   unravelling. The same flush then brings `LaidToRest` (the gold flip and rising motes from that
//   copy) or `Scattered` (the violet motes drift back to where it lies); a death neither claims
//   (Phase 1, a part broken for good outside) unravels as anywhere else on the next update.
// - **Dawn** (`restAll`, no death) and **the Unsung** (`layToRest`) come as `LaidToRest` alone:
//   the body is copied from its EnemyView (still drawn this frame). The Unsung plays its own flip
//   (`enemy.unsung_rest` `rest_<facing>`, then its rested `walk_<facing>` rising and fading); a
//   unit lying scattered turns its violet motes gold where it lies.
// - **Re-form:** at `Reformed` the motes are gone and one violet `reform` burst rings out where it
//   stands (EnemyView draws the body again from the sim).
// Fixed pools (rests, motes, scatters, held deaths), the oldest reused, so a busy Phase 2 or a Dawn
// that lays thirty units to rest at once allocates nothing.
import * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { UNSUNG_REST_SPRITE } from '../../content/sprites/enemies/unsung.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import { hasSprite } from '../../content/sprites/registry.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, SimEvent } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { blankSnapshot, type BodySnapshot } from './EnemyView.ts';
import {
  FLIP_LOOKS,
  flipStep,
  MAX_REST_MOTES,
  REFORM_MS,
  REST_MS,
  restBodyAlpha,
  restMoteAt,
  restMoteCount,
  SCATTER_MAX_MS,
  SCATTER_MOTES,
  scatterMoteAt,
  type RestMoteAt,
  type ScatterMoteAt,
  type TintMode,
} from './songLook.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from './TransientFx.ts';
import {
  facingOfKey,
  isUnsungBody,
  unsungRestAt,
  UNSUNG_FLIP_MS,
  UNSUNG_RISE_MS,
} from './unsungLook.ts';
import type { ViewContext } from './ViewContext.ts';

const ORIGIN: Vec2 = { x: 0, y: 0 };

/** The enemy pool as this view reads it (to find a scattered unit's resting place). */
export interface SongPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

/** What SongView needs of an enemy's view: its body as drawn now (EnemyView). */
export interface SongBody {
  snapshot(out: BodySnapshot): boolean;
}

const MAX_RESTS = 24;
const MAX_SCATTERS = 16;
const MAX_HELD = 32;
const REST_MOTE = 'fx.rest_mote';
const SCATTER_MOTE = 'fx.scatter_mote';
/** A unit with no body to copy rises from a Mote-sized spot. */
const SPOT_W = 12;
const SPOT_H = 12;
/** The whole Unsung's rest: its flip and rise. */
const UNSUNG_REST_MS = UNSUNG_FLIP_MS + UNSUNG_RISE_MS;

const TINT: Readonly<Record<TintMode, number>> = {
  multiply: Phaser.TintModes.MULTIPLY,
  screen: Phaser.TintModes.SCREEN,
  fill: Phaser.TintModes.FILL,
};

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const FLIP_HEX = FLIP_LOOKS.map((l) => hex(l.color));

interface Rest {
  active: boolean;
  ms: number;
  unsung: boolean;
  /** Whether a body flips (false: motes from a spot, a scattered unit's). */
  body: boolean;
  /** Its anchor on screen (px), and the box its motes rise from. */
  x: number;
  y: number;
  w: number;
  h: number;
  n: number;
  step: number;
  readonly flip: Phaser.GameObjects.Sprite;
  readonly motes: Phaser.GameObjects.Sprite[];
}

interface Scatter {
  active: boolean;
  uid: number;
  /** Its slot in the enemy pool (checked against `uid`), for its re-form clock. */
  slot: number;
  ms: number;
  /** Screen px: where it fell, and where it lies. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** ms into the re-form burst (−1: not re-forming). */
  reformMs: number;
  pulling: boolean;
  readonly motes: Phaser.GameObjects.Sprite[];
  readonly burst: Phaser.GameObjects.Sprite;
}

interface Held {
  active: boolean;
  uid: number;
  x: number;
  y: number;
  liftPx: number;
  has: boolean;
  readonly snap: BodySnapshot;
}

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };
const rm: RestMoteAt = { dx: 0, dy: 0, alpha: 0 };
const sm: ScatterMoteAt = { share: 0, dx: 0, dy: 0, alpha: 0, pull: false };
const rise = { lift: 0, alpha: 1 };
const scratch = blankSnapshot();

export class SongView {
  readonly #ctx: ViewContext;
  readonly #still: () => boolean;
  readonly #rests: Rest[] = [];
  readonly #scatters: Scatter[] = [];
  readonly #held: Held[] = [];
  #nextRest = 0;
  #nextScatter = 0;
  #nextHeld = 0;
  /** Whether this battle's map has a song (only then do deaths wait for its word). */
  #songMap = false;
  #pool: () => SongPool = () => ({ used: 0, items: [] });
  #bodies: (uid: number) => SongBody | undefined = () => undefined;
  #unravel: (x: number, y: number, liftPx: number) => void = () => {};
  /** Units laid to rest, scattered, and re-formed this battle (the smoke flow's checks). */
  restsSeen = 0;
  scattersSeen = 0;
  reformsSeen = 0;
  /** Violet unravels the song's held deaths fell back to (the smoke flow's check). */
  unravelsSeen = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#still = reducedMotion;
    const { scene, layers, sprites } = ctx;
    // The motes are the finale's sprites (T871: its chunk's lazy atlas page). A battle without
    // the finale's chunk has no song, so its motes stay blank and hidden.
    const lazy = hasSprite(REST_MOTE);
    const rest = lazy ? sprites.frame(REST_MOTE, 'r0') : null;
    const restA = lazy ? sprites.meta(REST_MOTE).anchor : ORIGIN;
    const scat = lazy ? sprites.frame(SCATTER_MOTE, 'm0') : null;
    const scatA = lazy ? sprites.meta(SCATTER_MOTE).anchor : ORIGIN;
    const mote = (f: typeof rest, an: Vec2): Phaser.GameObjects.Sprite => {
      const s = scene.make.sprite({}, false);
      if (f !== null) s.setTexture(f.texture, f.frame);
      s.setDisplayOrigin(an.x, an.y).setVisible(false);
      layers.vfx.add(s);
      return s;
    };
    for (let i = 0; i < MAX_RESTS; i++) {
      const flip = scene.make.sprite({}, false).setVisible(false);
      layers.world.add(flip);
      const motes: Phaser.GameObjects.Sprite[] = [];
      for (let k = 0; k < MAX_REST_MOTES; k++) motes.push(mote(rest, restA));
      this.#rests.push({
        active: false,
        ms: 0,
        unsung: false,
        body: false,
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        n: 0,
        step: -1,
        flip,
        motes,
      });
    }
    for (let i = 0; i < MAX_SCATTERS; i++) {
      const motes: Phaser.GameObjects.Sprite[] = [];
      for (let k = 0; k < SCATTER_MOTES; k++) motes.push(mote(scat, scatA));
      this.#scatters.push({
        active: false,
        uid: 0,
        slot: -1,
        ms: 0,
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
        reformMs: -1,
        pulling: false,
        motes,
        burst: mote(scat, scatA),
      });
    }
    for (let i = 0; i < MAX_HELD; i++) {
      this.#held.push({
        active: false,
        uid: 0,
        x: 0,
        y: 0,
        liftPx: 0,
        has: false,
        snap: blankSnapshot(),
      });
    }
  }

  /**
   * Listens for the song's events. `pool` finds a scattered unit where the sim put it, `bodies` an
   * enemy's view (its body as drawn), and `unravel` plays the plain Hollow death for a held one
   * the song didn't claim. `songMap`: this battle's map has a song.
   */
  bind(
    bus: Bus<SimEvent<IdSpace>>,
    pool: () => SongPool,
    bodies: (uid: number) => SongBody | undefined = () => undefined,
    unravel: (x: number, y: number, liftPx: number) => void = () => {},
    songMap = true,
  ): () => void {
    this.#pool = pool;
    this.#bodies = bodies;
    this.#unravel = unravel;
    this.#songMap = songMap;
    const offs = [
      bus.on('LaidToRest', (e) => {
        this.restsSeen++;
        const held = this.#take(e.uid);
        const u = find(pool(), e.uid);
        const liftPx = lift(u);
        // A unit lying scattered (Dawn): its violet motes turn gold where it lies.
        const sc = this.#endScatter(e.uid);
        if (sc !== null) {
          this.#startRest(null, sc.x1, sc.y1 - liftPx, false);
          return;
        }
        let snap: BodySnapshot | null = held?.has === true ? held.snap : null;
        if (snap === null && this.#bodies(e.uid)?.snapshot(scratch) === true) snap = scratch;
        if (snap !== null) {
          this.#startRest(snap, snap.x, snap.y, snap.id !== null && isUnsungBody(baseOf(snap.id)));
          return;
        }
        gridToScreen(e.at[0], e.at[1], this.#ctx.origin, a);
        this.#startRest(null, Math.round(a.x), Math.round(a.y) - liftPx, false);
      }),
      bus.on('Scattered', (e) => {
        this.scattersSeen++;
        const held = this.#take(e.uid);
        const p = pool();
        const slot = indexOf(p, e.uid);
        const u = slot < 0 ? null : (p.items[slot] ?? null);
        const liftPx = held?.liftPx ?? lift(u);
        this.#startScatter(e.uid, slot, e.at[0], e.at[1], u?.x ?? e.at[0], u?.y ?? e.at[1], liftPx);
      }),
      bus.on('Reformed', (e) => {
        this.reformsSeen++;
        for (const s of this.#scatters) {
          if (s.active && s.uid === e.uid && s.reformMs < 0) {
            s.reformMs = 0;
            for (const m of s.motes) m.setVisible(false);
            this.#playOnce(s.burst, SCATTER_MOTE, 'reform', s.x1, s.y1 - 8);
          }
        }
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /**
   * A Hollow unit died on a song map (battleEvents.ts `EnemyDied`): hold its death until the song
   * says rest or scatter (copying its body as drawn now, from `view`). False off a song map: the
   * caller unravels it as anywhere else.
   */
  holdDeath(
    uid: number,
    x: number,
    y: number,
    liftPx: number,
    view: SongBody | undefined,
  ): boolean {
    if (!this.#songMap) return false;
    const h = this.#held[this.#nextHeld]!; // index < MAX_HELD
    this.#nextHeld = (this.#nextHeld + 1) % MAX_HELD;
    if (h.active) this.#fallBack(h); // the oldest still waiting unravels now
    h.active = true;
    h.uid = uid;
    h.x = x;
    h.y = y;
    h.liftPx = liftPx;
    h.has = view?.snapshot(h.snap) === true;
    return true;
  }

  /** Effects showing now, by kind (the render-state hook). */
  get shown(): { rests: number; scatters: number; held: number } {
    let rests = 0;
    let scatters = 0;
    let held = 0;
    for (const r of this.#rests) if (r.active) rests++;
    for (const s of this.#scatters) if (s.active) scatters++;
    for (const h of this.#held) if (h.active) held++;
    return { rests, scatters, held };
  }

  update(deltaMs: number): void {
    const dt = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    // Deaths the song didn't claim (their flush is done): the plain violet unravel.
    for (const h of this.#held) if (h.active) this.#fallBack(h);
    const still = this.#still();
    for (const r of this.#rests) {
      if (!r.active) continue;
      r.ms += dt;
      if (r.unsung) this.#drawUnsung(r, still);
      else this.#drawRest(r, still);
    }
    const p = this.#pool();
    for (const s of this.#scatters) {
      if (!s.active) continue;
      s.ms += dt;
      this.#drawScatter(s, p, still, dt);
    }
  }

  reset(): void {
    for (const r of this.#rests) this.#endRest(r);
    for (const s of this.#scatters) this.#hideScatter(s);
    for (const h of this.#held) h.active = false;
    this.restsSeen = 0;
    this.scattersSeen = 0;
    this.reformsSeen = 0;
    this.unravelsSeen = 0;
  }

  #take(uid: number): Held | null {
    for (const h of this.#held) {
      if (h.active && h.uid === uid) {
        h.active = false;
        return h;
      }
    }
    return null;
  }

  #fallBack(h: Held): void {
    h.active = false;
    this.unravelsSeen++;
    this.#unravel(h.x, h.y, h.liftPx);
  }

  #startRest(snap: BodySnapshot | null, x: number, y: number, unsung: boolean): void {
    const r = this.#rests[this.#nextRest]!; // index < MAX_RESTS
    this.#nextRest = (this.#nextRest + 1) % MAX_RESTS;
    this.#endRest(r);
    r.active = true;
    r.ms = 0;
    r.unsung = unsung;
    r.body = snap !== null;
    r.x = x;
    r.y = y;
    r.step = -1;
    const f = r.flip;
    if (snap !== null) {
      (snap.flying ? this.#ctx.layers.air : this.#ctx.layers.world).add(f);
      f.setDepth(snap.depth).setPosition(snap.x, snap.y).setAlpha(1).setVisible(true);
      if (unsung) {
        const facing = facingOfKey(snap.anim);
        const sprites = this.#ctx.sprites;
        const an = sprites.frameAnchor(UNSUNG_REST_SPRITE, `rest_${facing}_0`);
        f.setFlipX(false).clearTint();
        f.play(sprites.anim(UNSUNG_REST_SPRITE, `rest_${facing}`, DEFAULT_VARIANT));
        f.chain(sprites.anim(UNSUNG_REST_SPRITE, `walk_${facing}`, DEFAULT_VARIANT));
        f.setDisplayOrigin(an.x, an.y); // after the frame is its own (the origin is a share of it)
        if (this.#still()) f.anims.pause(); // a held frame, not a breath, under reduced motion
      } else {
        f.stop();
        f.setTexture(snap.texture, snap.frame).setFlipX(snap.flipX);
        f.setDisplayOrigin(snap.originX, snap.originY);
      }
      r.w = Math.max(SPOT_W, f.width);
      r.h = Math.max(SPOT_H, f.height);
    } else {
      f.setVisible(false);
      r.w = SPOT_W;
      r.h = SPOT_H;
    }
    r.n = unsung ? MAX_REST_MOTES : restMoteCount(r.w);
    for (let i = 0; i < r.n; i++) {
      const m = r.motes[i]!; // i < n ≤ MAX_REST_MOTES
      m.play({ key: this.#ctx.sprites.anim(REST_MOTE, 'rise'), startFrame: i % 4 });
      if (this.#still()) m.anims.pause();
      m.setVisible(false);
    }
  }

  #endRest(r: Rest): void {
    r.active = false;
    r.flip.stop();
    r.flip.clearTint().setVisible(false);
    for (const m of r.motes) {
      m.stop();
      m.setVisible(false);
    }
  }

  #drawRest(r: Rest, still: boolean): void {
    if (r.ms >= REST_MS) {
      this.#endRest(r);
      return;
    }
    if (r.body) {
      const alpha = restBodyAlpha(r.ms);
      const f = r.flip;
      if (alpha <= 0) {
        if (f.visible) f.setVisible(false);
      } else {
        const step = flipStep(r.ms);
        if (step !== r.step) {
          r.step = step;
          const look = FLIP_LOOKS[step]!; // step < FLIP_STEPS
          f.setTint(FLIP_HEX[step]).setTintMode(TINT[look.mode]);
        }
        if (f.alpha !== alpha) f.setAlpha(alpha);
      }
    }
    this.#drawMotes(r, still, 0);
  }

  #drawUnsung(r: Rest, still: boolean): void {
    if (r.ms >= Math.max(REST_MS, UNSUNG_REST_MS)) {
      this.#endRest(r);
      return;
    }
    unsungRestAt(r.ms, still, rise);
    const f = r.flip;
    if (rise.alpha <= 0) {
      if (f.visible) f.setVisible(false);
    } else {
      f.setPosition(r.x, r.y - rise.lift).setAlpha(rise.alpha);
    }
    this.#drawMotes(r, still, rise.lift);
  }

  #drawMotes(r: Rest, still: boolean, liftPx: number): void {
    for (let i = 0; i < r.n; i++) {
      const m = r.motes[i]!; // i < n ≤ MAX_REST_MOTES
      restMoteAt(r.ms, i, r.n, r.w, r.h, still, rm);
      if (rm.alpha <= 0) {
        if (m.visible) m.setVisible(false);
        continue;
      }
      m.setPosition(r.x + rm.dx, r.y + rm.dy - liftPx).setAlpha(rm.alpha);
      if (!m.visible) m.setVisible(true);
    }
  }

  #startScatter(
    uid: number,
    slot: number,
    gx0: number,
    gy0: number,
    gx1: number,
    gy1: number,
    liftPx: number,
  ): void {
    const s = this.#scatters[this.#nextScatter]!; // index < MAX_SCATTERS
    this.#nextScatter = (this.#nextScatter + 1) % MAX_SCATTERS;
    this.#hideScatter(s);
    gridToScreen(gx0, gy0, this.#ctx.origin, a);
    gridToScreen(gx1, gy1, this.#ctx.origin, b);
    s.active = true;
    s.uid = uid;
    s.slot = slot;
    s.ms = 0;
    s.x0 = Math.round(a.x);
    s.y0 = Math.round(a.y) - liftPx;
    s.x1 = Math.round(b.x);
    s.y1 = Math.round(b.y) - liftPx;
    s.reformMs = -1;
    s.pulling = false;
    const key = this.#ctx.sprites.anim(SCATTER_MOTE, 'drift');
    for (let i = 0; i < SCATTER_MOTES; i++) {
      const m = s.motes[i]!; // i < SCATTER_MOTES
      m.play({ key, startFrame: i % 4 });
      if (this.#still()) m.anims.pause();
      m.setVisible(false);
    }
  }

  /** Ends the scatter of unit `uid` (laid to rest where it lies), returning it; null if none. */
  #endScatter(uid: number): Scatter | null {
    for (const s of this.#scatters) {
      if (s.active && s.uid === uid) {
        this.#hideScatter(s);
        return s;
      }
    }
    return null;
  }

  #hideScatter(s: Scatter): void {
    s.active = false;
    for (const m of s.motes) {
      m.stop();
      m.setVisible(false);
    }
    s.burst.stop();
    s.burst.setVisible(false);
  }

  #drawScatter(s: Scatter, pool: SongPool, still: boolean, dt: number): void {
    if (s.reformMs >= 0) {
      s.reformMs += dt;
      if (s.reformMs >= REFORM_MS) this.#hideScatter(s);
      return;
    }
    if (s.ms >= SCATTER_MAX_MS) {
      this.#hideScatter(s);
      return;
    }
    // Its re-form clock (sim ticks), from its slot in the pool.
    const u = s.slot >= 0 ? pool.items[s.slot] : undefined;
    const ticksLeft = u !== undefined && u.uid === s.uid && u.alive ? u.scatterTicks : -1;
    for (let i = 0; i < SCATTER_MOTES; i++) {
      const m = s.motes[i]!; // i < SCATTER_MOTES
      scatterMoteAt(s.ms, i, ticksLeft, still, sm);
      if (sm.pull !== s.pulling && i === 0) {
        s.pulling = sm.pull;
        const key = this.#ctx.sprites.anim(SCATTER_MOTE, sm.pull ? 'pull' : 'drift');
        for (const mm of s.motes) {
          mm.play(key);
          if (still) mm.anims.pause();
        }
      }
      if (sm.alpha <= 0) {
        if (m.visible) m.setVisible(false);
        continue;
      }
      const x = Math.round(s.x0 + (s.x1 - s.x0) * sm.share) + sm.dx;
      const y = Math.round(s.y0 + (s.y1 - s.y0) * sm.share) + sm.dy;
      m.setPosition(x, y).setAlpha(sm.alpha);
      if (!m.visible) m.setVisible(true);
    }
  }

  #playOnce(sp: Phaser.GameObjects.Sprite, id: SpriteId, anim: string, x: number, y: number): void {
    sp.setPosition(x, y).setAlpha(1).setVisible(true);
    sp.play(this.#ctx.sprites.anim(id, anim));
    if (this.#still()) sp.anims.pause();
  }
}

/** A grown or formed body's def body: `enemy.unsung_g3` → `enemy.unsung` (`_split` etc. too). */
function baseOf(id: string): string {
  return id.startsWith('enemy.unsung') && !id.startsWith('enemy.unsung_part') ? 'enemy.unsung' : id;
}

function indexOf(pool: SongPool, uid: number): number {
  for (let i = 0; i < pool.used; i++) if (pool.items[i]?.uid === uid) return i;
  return -1;
}

function find(pool: SongPool, uid: number): DeepReadonly<Enemy> | null {
  const i = indexOf(pool, uid);
  return i < 0 ? null : (pool.items[i] ?? null);
}

function lift(u: DeepReadonly<Enemy> | null): number {
  return BODY_LIFT_PX + (u?.def?.layer === 'air' ? AIR_LIFT_PX : 0);
}
