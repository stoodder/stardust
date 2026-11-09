// Blink, the minimal readable view (T404; art-direction §8's `blink` tell: "shimmer during the
// tell; afterimage outline at the destination", `violet.4`; enemies.md § 3). T430a polishes it.
// - **The tell**, from sim state each frame (`blinkTelling`): the unit holds still while a
//   `violet.4` silhouette of it (its walk frame, filled) stands where it will land
//   (`blinkLanding`), over a `violet.4` ring on the ground, both stepping 70% ↔ 40% four times a
//   second on sim ticks (held while paused; a steady 70% under reduced motion). It's where the
//   player should aim: the unit will be there.
// - **The blink** (`Blinked`): an afterimage (the same silhouette) stays where the unit stood and
//   fades in steps over AFTERIMAGE_MS (blinkLook.ts), and a `white.1` flash ring pops where it lands.
// A retreat or an interrupt simply ends the tell (it's drawn from state). The silhouettes draw in
// `vfx`, above the units. Allocation-free per frame: fixed pools of images.
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
  GHOST_TINT,
} from './blinkLook.ts';
import { enemyBody, facingOf, spriteId, type Facing } from './spriteInfo.ts';
import { AIR_LIFT_PX, type TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the blink view reads it. */
export interface BlinkPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

const MAX_TELLS = 6;
const MAX_AFTERIMAGES = 6;
const TELL_RING_TILES = 0.5;
const LAND_FLASH_TILES = 0.5;
const LAND_FLASH_MS = 250;
const WALK_FRAME: Readonly<Record<Facing, string>> = {
  se: 'walk_se_0',
  sw: 'walk_sw_0',
  ne: 'walk_ne_0',
  nw: 'walk_nw_0',
};

interface Ghost {
  readonly img: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Image;
  /** The unit and facing it shows (its texture is set only when they change). */
  uid: number;
  facing: Facing | null;
}

interface Afterimage {
  readonly img: Phaser.GameObjects.Image;
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
      const img = silhouette(ctx);
      this.#tells.push({ img, ring, uid: 0, facing: null });
    }
    for (let i = 0; i < MAX_AFTERIMAGES; i++) {
      this.#after.push({ img: silhouette(ctx), ms: 0, active: false });
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
      a.img.setAlpha(AFTERIMAGE_ALPHA).setVisible(true);
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
        a.img.setVisible(false);
      } else if (a.img.alpha !== alpha) {
        a.img.setAlpha(alpha);
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
      g.img.setAlpha(alpha).setVisible(true);
      gridToScreen(landing.x, landing.y, this.#ctx.origin, pos);
      g.ring.setPosition(Math.round(pos.x), Math.round(pos.y)).setAlpha(alpha).setVisible(true);
    }
    for (; n < MAX_TELLS; n++) {
      const g = this.#tells[n]!; // n < MAX_TELLS
      if (g.img.visible) g.img.setVisible(false);
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
      g.img.setVisible(false);
      g.ring.setVisible(false);
      g.uid = 0;
      g.facing = null;
    }
    for (const a of this.#after) {
      a.active = false;
      a.img.setVisible(false);
    }
  }

  /** Gives `img` the unit's walk frame for `facing`, anchored like its body. */
  #dress(img: Phaser.GameObjects.Image, e: DeepReadonly<Enemy>, facing: Facing): void {
    const def = e.def;
    if (def === null) return;
    const id = spriteId(enemyBody(def.sprites.body, e.tags));
    const name = WALK_FRAME[facing];
    const f = this.#ctx.sprites.frame(id, name);
    const a = this.#ctx.sprites.frameAnchor(id, name);
    img.setTexture(f.texture, f.frame).setDisplayOrigin(a.x, a.y);
  }

  /** Puts `img` at grid (x, y), a flyer's 12 px up. */
  #place(img: Phaser.GameObjects.Image, x: number, y: number, e: DeepReadonly<Enemy>): void {
    gridToScreen(x, y, this.#ctx.origin, pos);
    const lift = e.def?.layer === 'air' ? AIR_LIFT_PX : 0;
    img.setPosition(Math.round(pos.x), Math.round(pos.y) - lift);
  }
}

/** A hidden image filled `violet.4`, in `vfx`. */
function silhouette(ctx: ViewContext): Phaser.GameObjects.Image {
  const img = ctx.scene.make.image({}, false).setVisible(false);
  img.setTint(GHOST_TINT).setTintMode(Phaser.TintModes.FILL);
  ctx.layers.vfx.add(img);
  return img;
}

/** The live unit `uid`, or null. */
function find(enemies: BlinkPool, uid: number): DeepReadonly<Enemy> | null {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.uid === uid && e.alive) return e;
  }
  return null;
}
