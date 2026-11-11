// Blink (T404's view, T430a's polish; art-direction §8's `blink` tell: "shimmer during the tell;
// afterimage outline at the destination", `violet.4`; enemies.md § 3).
// - **The tell**, from sim state each frame (`blinkTelling`): the unit holds still, shimmering and
//   rimmed in violet (EnemyView), while a ghost of it stands where it will land (`blinkLanding`):
//   its walk frame filled `violet.4` inside a 1 px `white.1` outline (four shoved copies behind
//   it), so it reads as a lit shape on gold grass and dusk alike, over a `violet.4` ring on the
//   ground, all stepping 85% ↔ 50% on the sim's 3 Hz tell step (vfx/fxTiming.ts `tellHigh`; held
//   while paused; a steady 85% under reduced motion). It's where the player should aim: the unit
//   will be there.
// - **The blink** (`Blinked`): an afterimage (the same outlined ghost) stays where the unit stood
//   and fades in steps over AFTERIMAGE_MS (blinkLook.ts), and a `white.1` flash ring pops where it
//   lands.
// A retreat or an interrupt simply ends the tell (it's drawn from state). The ghosts draw in `vfx`,
// above the units. Allocation-free per frame: fixed pools of images.
import * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import {
  activeBlink,
  blinkLanding,
  blinkTelling,
  type Enemy,
  type SimEvent,
} from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { effectRingTexture } from '../vfx/overlayTextures.ts';
import {
  AFTERIMAGE_ALPHA,
  afterimageAlpha,
  blinkTellAlpha,
  GHOST_EDGE_TINT,
  GHOST_TINT,
} from './blinkLook.ts';
import { drawnBody } from './gatherLook.ts';
import { facingOf, spriteId, type Facing } from './spriteInfo.ts';
import { AIR_LIFT_PX, type TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the blink view reads it. */
export interface BlinkPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

const MAX_TELLS = 6;
const MAX_AFTERIMAGES = 6;
const TELL_RING_TILES = 0.75;
const LAND_FLASH_TILES = 0.5;
const LAND_FLASH_MS = 250;
const WALK_FRAME: Readonly<Record<Facing, string>> = {
  se: 'walk_se_0',
  sw: 'walk_sw_0',
  ne: 'walk_ne_0',
  nw: 'walk_nw_0',
};

/** The ghost's outline: four copies shoved 1 px left, right, up, and down. */
const EDGE_SHOVES: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** An outlined silhouette: the violet fill and its four white edge copies. */
class Silhouette {
  readonly fill: Phaser.GameObjects.Image;
  readonly #edges: Phaser.GameObjects.Image[] = [];

  constructor(ctx: ViewContext) {
    for (const _ of EDGE_SHOVES) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      img.setTint(GHOST_EDGE_TINT).setTintMode(Phaser.TintModes.FILL);
      ctx.layers.vfx.add(img);
      this.#edges.push(img);
    }
    this.fill = ctx.scene.make.image({}, false).setVisible(false);
    this.fill.setTint(GHOST_TINT).setTintMode(Phaser.TintModes.FILL);
    ctx.layers.vfx.add(this.fill);
  }

  get visible(): boolean {
    return this.fill.visible;
  }

  get alpha(): number {
    return this.fill.alpha;
  }

  dress(texture: string, frame: string, ax: number, ay: number): void {
    this.fill.setTexture(texture, frame).setDisplayOrigin(ax, ay);
    for (const e of this.#edges) e.setTexture(texture, frame).setDisplayOrigin(ax, ay);
  }

  place(x: number, y: number): void {
    this.fill.setPosition(x, y);
    for (let i = 0; i < this.#edges.length; i++) {
      const s = EDGE_SHOVES[i]!; // i < 4
      this.#edges[i]!.setPosition(x + s[0], y + s[1]); // i < 4
    }
  }

  show(alpha: number): void {
    this.fill.setAlpha(alpha).setVisible(true);
    for (const e of this.#edges) e.setAlpha(alpha).setVisible(true);
  }

  hide(): void {
    if (!this.fill.visible) return;
    this.fill.setVisible(false);
    for (const e of this.#edges) e.setVisible(false);
  }
}

interface Ghost {
  readonly img: Silhouette;
  readonly ring: Phaser.GameObjects.Image;
  /** The unit and facing it shows (its texture is set only when they change). */
  uid: number;
  facing: Facing | null;
}

interface Afterimage {
  readonly img: Silhouette;
  ms: number;
  active: boolean;
}

const pos: Vec2 = { x: 0, y: 0 };
const landing = { x: 0, y: 0 };

export class BlinkView {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #reducedMotion: () => boolean;
  readonly #tells: Ghost[] = [];
  readonly #after: Afterimage[] = [];
  #nextAfter = 0;
  /** Afterimages started since the view was made (the smoke flow's check). */
  afterimages = 0;

  constructor(ctx: ViewContext, fx: TransientFx, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    const tex = effectRingTexture(ctx.scene, TELL_RING_TILES, 'violet.4', 'ink.0');
    for (let i = 0; i < MAX_TELLS; i++) {
      const ring = ctx.scene.make.image({}, false).setVisible(false);
      ring.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      ctx.layers.decal.add(ring);
      this.#tells.push({ img: new Silhouette(ctx), ring, uid: 0, facing: null });
    }
    for (let i = 0; i < MAX_AFTERIMAGES; i++) {
      this.#after.push({ img: new Silhouette(ctx), ms: 0, active: false });
    }
  }

  /** Subscribes to Blinked; `pool` finds the unit's sprite. Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>, pool: () => BlinkPool): () => void {
    return bus.on('Blinked', (ev) => {
      this.#fx.ring(ev.toX, ev.toY, LAND_FLASH_TILES, 'white.1', LAND_FLASH_MS, true);
      const e = find(pool(), ev.uid);
      if (e === null) return;
      const a = this.#after[this.#nextAfter]!; // index < MAX_AFTERIMAGES
      this.#nextAfter = (this.#nextAfter + 1) % MAX_AFTERIMAGES;
      this.afterimages++;
      this.#dress(a.img, e, facingOf(ev.toX - ev.x, ev.toY - ev.y));
      this.#place(a.img, ev.x, ev.y, e);
      a.ms = 0;
      a.active = true;
      a.img.show(AFTERIMAGE_ALPHA);
    });
  }

  /** Each frame: the afterimages fade (real time), and a ghost stands at each telling unit's landing. */
  update(dt: number, enemies: BlinkPool): void {
    for (const a of this.#after) {
      if (!a.active) continue;
      a.ms += dt;
      const alpha = afterimageAlpha(a.ms);
      if (alpha <= 0) {
        a.active = false;
        a.img.hide();
      } else if (a.img.alpha !== alpha) {
        a.img.show(alpha);
      }
    }
    const reduced = this.#reducedMotion();
    let n = 0;
    for (let i = 0; i < enemies.used && n < MAX_TELLS; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive) continue;
      const blink = activeBlink(e);
      if (blink === null || !blinkTelling(e, blink)) continue;
      const g = this.#tells[n++]!; // n < MAX_TELLS
      blinkLanding(e, blink, landing);
      const facing = facingOf(landing.x - e.x, landing.y - e.y);
      if (g.uid !== e.uid || g.facing !== facing) {
        this.#dress(g.img, e, facing);
        g.uid = e.uid;
        g.facing = facing;
      }
      const alpha = blinkTellAlpha(e.blinkTicks, reduced);
      this.#place(g.img, landing.x, landing.y, e);
      g.img.show(alpha);
      gridToScreen(landing.x, landing.y, this.#ctx.origin, pos);
      g.ring.setPosition(Math.round(pos.x), Math.round(pos.y)).setAlpha(alpha).setVisible(true);
    }
    for (; n < MAX_TELLS; n++) {
      const g = this.#tells[n]!; // n < MAX_TELLS
      g.img.hide();
      if (g.ring.visible) g.ring.setVisible(false);
      g.uid = 0;
    }
  }

  /** How many blink tells show (the smoke flow's check). */
  get tells(): number {
    let n = 0;
    for (const g of this.#tells) if (g.img.visible) n++;
    return n;
  }

  reset(): void {
    for (const g of this.#tells) {
      g.img.hide();
      g.ring.setVisible(false);
      g.uid = 0;
      g.facing = null;
    }
    for (const a of this.#after) {
      a.active = false;
      a.img.hide();
    }
  }

  /** Gives `img` the unit's walk frame for `facing`, anchored like its body. */
  #dress(img: Silhouette, e: DeepReadonly<Enemy>, facing: Facing): void {
    const def = e.def;
    if (def === null) return;
    const id = spriteId(drawnBody(e));
    const name = WALK_FRAME[facing];
    const f = this.#ctx.sprites.frame(id, name);
    const a = this.#ctx.sprites.frameAnchor(id, name);
    img.dress(f.texture, f.frame, a.x, a.y);
  }

  /** Puts `img` at grid (x, y), a flyer's 12 px up. */
  #place(img: Silhouette, x: number, y: number, e: DeepReadonly<Enemy>): void {
    gridToScreen(x, y, this.#ctx.origin, pos);
    const lift = e.def?.layer === 'air' ? AIR_LIFT_PX : 0;
    img.place(Math.round(pos.x), Math.round(pos.y) - lift);
  }
}

/** The live unit `uid`, or null. */
function find(enemies: BlinkPool, uid: number): DeepReadonly<Enemy> | null {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.uid === uid && e.alive) return e;
  }
  return null;
}
