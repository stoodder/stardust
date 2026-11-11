// The Stasis Bloom on the field (T608's minimal view; bloomLook.ts holds the rules): round each live
// Bloom, a faint ground disc at its field's reach with a dashed ring at its edge, the disc
// brightening for a moment as it pulses (the frost ring itself is PulseBurst's, battleEvents.ts).
// In `decal`, under the units, centred on the tower's tile. It reads sim state only, so it holds
// while paused. The Bloom itself is TowerView's (its sprites, T640b); Stasis's ice tint is
// EnemyView's. Allocation-free per frame: discs and rings are pooled; each texture (colour,
// snapped radius, alpha) is registered once.
import type * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Tower } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { discImage, ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import { bloomColors, bloomReach, DISC_ALPHA, DISC_FLASH_ALPHA, pulseFlash } from './bloomLook.ts';
import type { ViewContext } from './ViewContext.ts';

/** The pool as this view reads it. */
export interface BloomPools {
  readonly towers: { readonly used: number; readonly items: readonly DeepReadonly<Tower>[] };
}

const MAX_BLOOMS = 12;
const RING_UNDER: ColorName = 'ink.0';

interface Shape {
  readonly img: Phaser.GameObjects.Image;
  /** What its texture shows now (snapped radius, colour, flash), so a frame rebuilds no key. */
  radius: number;
  color: ColorName | null;
  flash: boolean;
}

const pos: Vec2 = { x: 0, y: 0 };

export class BloomView {
  readonly #ctx: ViewContext;
  readonly #discs: Shape[] = [];
  readonly #rings: Shape[] = [];
  readonly #frames = new Map<string, { ox: number; oy: number }>();
  #shown = 0;
  #flashing = 0;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    const scene = ctx.scene;
    // Discs first, so every ring draws over every disc where two fields overlap.
    for (let i = 0; i < MAX_BLOOMS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#discs.push({ img, radius: 0, color: null, flash: false });
    }
    for (let i = 0; i < MAX_BLOOMS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#rings.push({ img, radius: 0, color: null, flash: false });
    }
  }

  /** Fields drawn now (the smoke flow's check). */
  get fields(): number {
    return this.#shown;
  }

  /** Fields drawn flashing for a pulse now. */
  get flashing(): number {
    return this.#flashing;
  }

  update(pools: BloomPools): void {
    let n = 0;
    let flashing = 0;
    const towers = pools.towers;
    for (let i = 0; i < towers.used && n < MAX_BLOOMS; i++) {
      const t = towers.items[i]!; // i < used ≤ items.length
      const reach = bloomReach(t);
      if (reach <= 0) continue;
      gridToScreen(t.x, t.y, this.#ctx.origin, pos);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      const colors = bloomColors(t);
      const flash = pulseFlash(t);
      if (flash) flashing++;
      const radius = snapRingRadius(reach);
      const disc = this.#discs[n]!; // n < MAX_BLOOMS
      this.#show(disc, radius, flash ? colors.flash : colors.disc, flash, true, x, y);
      this.#show(this.#rings[n]!, radius, colors.ring, false, false, x, y); // n < MAX_BLOOMS
      n++;
    }
    this.#shown = n;
    this.#flashing = flashing;
    for (let k = n; k < MAX_BLOOMS; k++) {
      const d = this.#discs[k]!; // k < MAX_BLOOMS
      const r = this.#rings[k]!; // k < MAX_BLOOMS
      if (d.img.visible) d.img.setVisible(false);
      if (r.img.visible) r.img.setVisible(false);
    }
  }

  reset(): void {
    for (const s of this.#discs) s.img.setVisible(false);
    for (const s of this.#rings) s.img.setVisible(false);
    this.#shown = 0;
    this.#flashing = 0;
  }

  /**
   * Shows `shape` at screen (x, y): a disc (`isDisc`: dithered edge, the flash's alpha when
   * `flash`) or a dashed ring, of `radius` (snapped) in `color`, baking its texture once.
   */
  #show(
    shape: Shape,
    radius: number,
    color: ColorName,
    flash: boolean,
    isDisc: boolean,
    x: number,
    y: number,
  ): void {
    if (shape.radius !== radius || shape.color !== color || shape.flash !== flash) {
      const key = isDisc
        ? `fx.bloom_disc.${color}.${radius}.${flash ? 1 : 0}`
        : `fx.bloom_ring.${color}.${radius}`;
      let f = this.#frames.get(key);
      if (f === undefined) {
        const baked = isDisc
          ? discImage(radius, color, flash ? DISC_FLASH_ALPHA : DISC_ALPHA, true)
          : ringImage(radius, color, true, RING_UNDER);
        if (!this.#ctx.scene.textures.exists(key)) {
          this.#ctx.scene.textures.addCanvas(key, imageToCanvas(baked.image));
        }
        f = { ox: baked.cx, oy: baked.cy };
        this.#frames.set(key, f);
      }
      shape.img.setTexture(key).setDisplayOrigin(f.ox, f.oy);
      shape.radius = radius;
      shape.color = color;
      shape.flash = flash;
    }
    shape.img.setPosition(x, y).setVisible(true);
  }
}
