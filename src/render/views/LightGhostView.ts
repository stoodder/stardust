// The ghost of a Prism's light (review R9; art-direction.md §7, *Darkness and lighting overlay*):
// on a map with darkness, a Prism whose beam is off (between waves, with nothing in range) shows
// the disc it will light as a ghost, and arming a Prism shows the disc it would light from the
// tile under the pointer, so the build phase reads what the light will do. A ghost is the lit
// disc's rim only, dashed, in the Prism's cold `blue.4` (vfx/darknessPixels.ts `ghostDiscImage`):
// it never lightens anything under it, so nothing reads lit that the sim keeps dark (D137: the
// real holes stay exactly the sim's lit discs, DarknessView's). A resting Prism's ghost is faint
// (GHOST_REST_ALPHA); the preview is clearer (GHOST_PREVIEW_ALPHA). A beaming Prism has no ghost:
// its real disc is punched out of the dark. In `decal`, under everything standing there.
// Allocation-free per frame: a fixed pool of images, textured once per radius.
import type * as Phaser from 'phaser';
import type { LightTower, LightTowers } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ghostDiscImage } from '../vfx/darknessPixels.ts';
import type { ViewContext } from './ViewContext.ts';

/** A resting Prism's ghost, and the placement preview's (stepped alphas, art-direction §7). */
export const GHOST_REST_ALPHA = 0.5;
export const GHOST_PREVIEW_ALPHA = 0.85;
/** Resting ghosts one frame can show (the preview has its own image). */
const MAX_GHOSTS = 8;

/** Whether tower `t` shows a ghost: a live light source (the Prism) whose beam is off. */
export function showsGhost(t: LightTower): boolean {
  return t.alive && !t.beamActive && t.def !== null && t.def.lightRadiusSq > 0;
}

const pos: Vec2 = { x: 0, y: 0 };
/** Each ghost texture's origin (its source's ground point), by key. */
const ghostOrigins = new Map<string, Vec2>();

export class LightGhostView {
  readonly #ctx: ViewContext;
  readonly #on: boolean;
  readonly #ghosts: Phaser.GameObjects.Image[] = [];
  readonly #ghostSq: number[] = [];
  readonly #preview: Phaser.GameObjects.Image | null = null;
  #previewSq = -1;
  #shown = 0;

  /** `dark`: the map has darkness (sim/darkness.ts `hasDarkness`); without it, nothing shows. */
  constructor(ctx: ViewContext, dark: boolean) {
    this.#ctx = ctx;
    this.#on = dark;
    if (!dark) return;
    const { scene, layers } = ctx;
    for (let i = 0; i < MAX_GHOSTS; i++) {
      const img = scene.make.image({}, false).setAlpha(GHOST_REST_ALPHA).setVisible(false);
      layers.decal.add(img);
      this.#ghosts.push(img);
      this.#ghostSq.push(-1);
    }
    this.#preview = scene.make.image({}, false).setAlpha(GHOST_PREVIEW_ALPHA).setVisible(false);
    layers.decal.add(this.#preview);
  }

  /** Resting Prisms showing a ghost now. */
  get resting(): number {
    return this.#shown;
  }

  /** Whether the placement preview's ghost shows. */
  get previewing(): boolean {
    return this.#preview?.visible === true;
  }

  /**
   * The placement preview: the disc a light source armed on tile (col, row) would light
   * (`radiusSq` the def's `lightRadiusSq`); col < 0 or no radius hides it.
   */
  setPreview(col: number, row: number, radiusSq: number): void {
    const img = this.#preview;
    if (img === null) return;
    if (col < 0 || radiusSq <= 0) {
      if (img.visible) img.setVisible(false);
      return;
    }
    if (radiusSq !== this.#previewSq) {
      this.#previewSq = radiusSq;
      this.#texture(img, radiusSq);
    }
    gridToScreen(col + 0.5, row + 0.5, this.#ctx.origin, pos);
    img.setPosition(pos.x, pos.y).setVisible(true);
  }

  /** Each frame: a ghost under each live Prism whose beam is off. */
  update(towers: LightTowers): void {
    if (!this.#on) return;
    let n = 0;
    for (let i = 0; i < towers.used && n < MAX_GHOSTS; i++) {
      const t = towers.items[i]!; // i < used
      if (!showsGhost(t)) continue;
      const img = this.#ghosts[n]!; // n < MAX_GHOSTS
      const sq = t.def!.lightRadiusSq; // showsGhost: def set
      if (this.#ghostSq[n] !== sq) {
        this.#ghostSq[n] = sq;
        this.#texture(img, sq);
      }
      gridToScreen(t.x, t.y, this.#ctx.origin, pos);
      img.setPosition(pos.x, pos.y);
      if (!img.visible) img.setVisible(true);
      n++;
    }
    for (let i = n; i < this.#shown; i++) this.#ghosts[i]!.setVisible(false); // i < shown ≤ length
    this.#shown = n;
  }

  reset(): void {
    for (const g of this.#ghosts) g.setVisible(false);
    this.#preview?.setVisible(false);
    this.#shown = 0;
  }

  /** Textures `img` with the ghost of a disc of `radiusSq`, baked once per radius. */
  #texture(img: Phaser.GameObjects.Image, radiusSq: number): void {
    const scene = this.#ctx.scene;
    const key = `fx.light_ghost.${radiusSq}`;
    let origin = ghostOrigins.get(key);
    if (origin === undefined || !scene.textures.exists(key)) {
      const g = ghostDiscImage(radiusSq);
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, imageToCanvas(g.image));
      origin = { x: g.cx, y: g.cy };
      ghostOrigins.set(key, origin);
    }
    img.setTexture(key).setDisplayOrigin(origin.x, origin.y);
  }
}
