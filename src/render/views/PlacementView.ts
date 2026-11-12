// In-world placement and selection feedback (art-direction.md § Range rings and placement): the
// tile-mask highlight under the pointer and under the selected tower, one range ring, and the
// placement ghost (the armed tower at 60% alpha), and the onboarding pulse on free pads until the
// first build (D026). Decals draw in `decal`; the ghost sorts in `world` like a tower. On a raised
// tile (high ground) the highlights sit on the block's top face, ELEV_H up, sorted in `world` just
// in front of the block (it would hide a `decal`), and the ghost stands on it like a tower.
import type * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import { KIND_BIAS, worldDepth } from '../depth.ts';
import { ELEV_H, gridToScreen, HALF_H, tileImageTopLeft, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { ringKind } from '../input/ringRange.ts';
import {
  floatTextTexture,
  highlightTexture,
  ringTexture,
  type HighlightKind,
} from '../vfx/overlayTextures.ts';
import { markNoDawnRim as noRim } from './dawnRimLook.ts';
import { headStyle, spriteId } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';

/** Stepped alpha (art-direction §7): the ghost is 60%. */
const GHOST_ALPHA = 0.6;
/** A dimmed range ring's alpha: a tower outside every light at Sundown (T505). */
export const RING_DIM_ALPHA = 0.65;
/** The ghost's tile-bonus label sits this far above its ground point (px): over a tier-1 head. */
const GHOST_LABEL_LIFT_PX = 30;
/** The salvage label sits over the wreck's stake, in the clickable-object gold. */
const SALVAGE_LABEL_LIFT_PX = 26;
const SALVAGE_LABEL_COLOR: ColorName = 'gold.4';
/** The ghost sorts like a tower with a uid no live tower has. */
const GHOST_UID = 0;
/**
 * A raised tile's highlight sorts above its own block (`highGround` bias plus a tie-break below
 * 0.0256) and below any prop or actor at the same foot (the `prop` bias).
 */
const RAISED_DECAL_BIAS = KIND_BIAS.highGround + 0.03;

/** A tile's elevation level by column and row (0 for flat ground, 1 for high ground). */
export type TileElevation = (col: number, row: number) => number;

const pos: Vec2 = { x: 0, y: 0 };

export class PlacementView {
  readonly #ctx: ViewContext;
  readonly #elevation: TileElevation;
  readonly #hover: Phaser.GameObjects.Image;
  readonly #selected: Phaser.GameObjects.Image;
  /** The hover and selection highlights for a raised tile (sorted in `world`). */
  readonly #hoverRaised: Phaser.GameObjects.Image;
  readonly #selectedRaised: Phaser.GameObjects.Image;
  readonly #ring: Phaser.GameObjects.Image;
  readonly #ghostBase: Phaser.GameObjects.Image;
  readonly #ghostHead: Phaser.GameObjects.Image;
  /** The tile bonus the ghost would get ("+25% RANGE"; D059), over its head in `overlay`. */
  readonly #ghostLabel: Phaser.GameObjects.Image;
  #ghostLabelText: string | null = null;
  #ghostLabelColor: ColorName | null = null;
  #hoverKey = '';
  #ringKey = '';
  #ringDim = false;
  #ghostBaseId: string | null = null;
  #ghostHeadId: string | null = null;
  /** One `teal.3` highlight per buildable tile, for the onboarding pulse. */
  readonly #teach: { col: number; row: number; img: Phaser.GameObjects.Image }[] = [];

  constructor(ctx: ViewContext, elevation: TileElevation = () => 0) {
    this.#ctx = ctx;
    this.#elevation = elevation;
    const { scene, layers } = ctx;
    this.#selected = scene.make.image({}, false).setOrigin(0, 0).setVisible(false);
    this.#hover = scene.make.image({}, false).setOrigin(0, 0).setVisible(false);
    this.#ring = scene.make.image({}, false).setVisible(false);
    layers.decal.add([this.#selected, this.#hover, this.#ring]);
    // In `world` but not actors: Dawn never rims them (M9 review C5).
    this.#selectedRaised = noRim(scene.make.image({}, false).setOrigin(0, 0).setVisible(false));
    this.#hoverRaised = noRim(scene.make.image({}, false).setOrigin(0, 0).setVisible(false));
    layers.world.add([this.#selectedRaised, this.#hoverRaised]);
    this.#ghostBase = noRim(scene.make.image({}, false).setAlpha(GHOST_ALPHA).setVisible(false));
    this.#ghostHead = noRim(scene.make.image({}, false).setAlpha(GHOST_ALPHA).setVisible(false));
    layers.world.add([this.#ghostBase, this.#ghostHead]);
    this.#ghostLabel = scene.make.image({}, false).setOrigin(0.5, 1).setVisible(false);
    layers.overlay.add(this.#ghostLabel);
  }

  /** The highlight under the pointer (tile col, row), or none. */
  setHover(col: number, row: number, kind: HighlightKind | null): void {
    if (kind === null) {
      this.#hover.setVisible(false);
      this.#hoverRaised.setVisible(false);
      return;
    }
    const key = highlightTexture(this.#ctx.scene, kind);
    if (key !== this.#hoverKey) {
      this.#hover.setTexture(key);
      this.#hoverRaised.setTexture(key);
      this.#hoverKey = key;
    }
    this.#placeHighlight(this.#hover, this.#hoverRaised, col, row);
  }

  /** Shows the flat or the raised highlight on tile (col, row), whichever its elevation needs. */
  #placeHighlight(
    flat: Phaser.GameObjects.Image,
    raised: Phaser.GameObjects.Image,
    col: number,
    row: number,
  ): void {
    const z = this.#elevation(col, row);
    tileImageTopLeft(col, row, this.#ctx.origin, pos, z);
    const on = z > 0 ? raised : flat;
    (z > 0 ? flat : raised).setVisible(false);
    on.setPosition(pos.x, pos.y).setVisible(true);
    if (z > 0) on.setDepth(raisedDepth(pos.y, z, row * 256 + col));
  }

  /** The range ring shows dimmed (Sundown: its tower is in the dark; T505). */
  get ringDimmed(): boolean {
    return this.#ringDim && this.#ring.visible;
  }

  /** The highlight under the selected tower's tile, or none (col < 0). */
  setSelectedTile(col: number, row: number): void {
    if (col < 0) {
      this.#selected.setVisible(false);
      this.#selectedRaised.setVisible(false);
      return;
    }
    const key = highlightTexture(this.#ctx.scene, 'selected');
    if (this.#selected.texture.key !== key) {
      this.#selected.setTexture(key);
      this.#selectedRaised.setTexture(key);
    }
    this.#placeHighlight(this.#selected, this.#selectedRaised, col, row);
  }

  /**
   * One range ring centered on grid point (gx, gy), or none (radius ≤ 0); `dim` draws it at
   * RING_DIM_ALPHA (a tower the darkness reaches, Sundown; T505); `song` draws a valid one in the
   * Hum Choir's gold (input/ringRange.ts `songRing`; review R14).
   */
  setRing(
    gx: number,
    gy: number,
    radiusTiles: number,
    valid: boolean,
    dim = false,
    song = false,
  ): void {
    this.#ringDim = dim && radiusTiles > 0;
    this.#ring.setAlpha(this.#ringDim ? RING_DIM_ALPHA : 1);
    if (radiusTiles <= 0) {
      this.#ring.setVisible(false);
      return;
    }
    const tex = ringTexture(this.#ctx.scene, radiusTiles, ringKind(valid, song));
    if (tex.key !== this.#ringKey) {
      this.#ring.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      this.#ringKey = tex.key;
    }
    gridToScreen(gx, gy, this.#ctx.origin, pos);
    this.#ring.setPosition(pos.x, pos.y).setVisible(true);
  }

  /**
   * The armed tower's ghost on tile (col, row), or none (base null), with the tile's bonus as a
   * label over it (`label`, in the 3×5 font's capitals; null for none).
   */
  setGhost(
    col: number,
    row: number,
    base: string | null,
    head: string | null,
    label: string | null = null,
  ): void {
    if (base === null) {
      this.#ghostBase.setVisible(false);
      this.#ghostHead.setVisible(false);
      this.#ghostLabel.setVisible(false);
      return;
    }
    this.#syncGhostLabel(col, row, label);
    const { sprites, origin } = this.#ctx;
    const baseId = spriteId(base);
    const headId = head === null ? null : spriteId(head);
    if (base !== this.#ghostBaseId || head !== this.#ghostHeadId) {
      this.#ghostBaseId = base;
      this.#ghostHeadId = head;
      const b = sprites.frame(baseId, 't1');
      const ba = sprites.frameAnchor(baseId, 't1');
      this.#ghostBase.setTexture(b.texture, b.frame).setDisplayOrigin(ba.x, ba.y);
      if (headId !== null) {
        const hf = headFrame(headId);
        const h = sprites.frame(headId, hf, DEFAULT_VARIANT);
        const ha = sprites.frameAnchor(headId, hf);
        this.#ghostHead.setTexture(h.texture, h.frame).setDisplayOrigin(ha.x, ha.y);
      }
    }
    gridToScreen(col + 0.5, row + 0.5, origin, pos);
    const depth = worldDepth(pos.y, 'tower', GHOST_UID);
    // On high ground the ghost stands on the block, as the tower will.
    pos.y -= this.#elevation(col, row) * ELEV_H;
    this.#ghostBase.setPosition(pos.x, pos.y).setDepth(depth).setVisible(true);
    if (headId === null) {
      this.#ghostHead.setVisible(false);
      return;
    }
    const mount = sprites.mount(baseId);
    const bx = pos.x - this.#ghostBase.displayOriginX;
    const by = pos.y - this.#ghostBase.displayOriginY;
    this.#ghostHead
      .setPosition(bx + (mount?.x ?? this.#ghostBase.displayOriginX), by + (mount?.y ?? 0))
      .setDepth(depth + 0.00005)
      .setVisible(true);
  }

  /**
   * The "SEND DRONE +n" label over a wreck the hover would clear (`label`; null hides it). It
   * shares the ghost label's image: the two never show at once (a wreck is never buildable).
   */
  setSalvageLabel(col: number, row: number, label: string | null): void {
    this.#syncGhostLabel(col, row, label, SALVAGE_LABEL_COLOR, SALVAGE_LABEL_LIFT_PX);
  }

  #syncGhostLabel(
    col: number,
    row: number,
    label: string | null,
    color: ColorName = 'teal.4',
    lift = GHOST_LABEL_LIFT_PX,
  ): void {
    if (label === null) {
      this.#ghostLabel.setVisible(false);
      return;
    }
    if (label !== this.#ghostLabelText || color !== this.#ghostLabelColor) {
      this.#ghostLabel.setTexture(floatTextTexture(this.#ctx.scene, label, color));
      this.#ghostLabelText = label;
      this.#ghostLabelColor = color;
    }
    gridToScreen(col + 0.5, row + 0.5, this.#ctx.origin, pos);
    const y = pos.y - this.#elevation(col, row) * ELEV_H - lift;
    this.#ghostLabel.setPosition(Math.round(pos.x), Math.round(y)).setVisible(true);
  }

  /** The onboarding pulse's tiles (every buildable tile); call once. */
  setTeachTiles(tiles: readonly (readonly [number, number])[]): void {
    const { scene, layers, origin } = this.#ctx;
    const key = highlightTexture(scene, 'selected');
    for (const [col, row] of tiles) {
      const z = this.#elevation(col, row);
      tileImageTopLeft(col, row, origin, pos, z);
      const img = scene.make
        .image({}, false)
        .setTexture(key)
        .setOrigin(0, 0)
        .setPosition(pos.x, pos.y)
        .setVisible(false);
      if (z > 0) layers.world.add(noRim(img).setDepth(raisedDepth(pos.y, z, row * 256 + col)));
      else layers.decal.addAt(img, 0);
      this.#teach.push({ col, row, img });
    }
  }

  /**
   * Shows the onboarding pulse on the teach tiles `free` says are empty (`on`), or hides it all.
   * The caller blinks it by toggling `on`.
   */
  showTeach(on: boolean, free: (col: number, row: number) => boolean): void {
    for (const t of this.#teach) t.img.setVisible(on && free(t.col, t.row));
  }

  /** Hides everything (pointer left the canvas). */
  clearPointer(): void {
    this.#hover.setVisible(false);
    this.#hoverRaised.setVisible(false);
    this.setGhost(0, 0, null, null);
  }
}

/**
 * The world depth of a raised tile's highlight whose image top is at screen y `top` (the raised top
 * vertex): just in front of its block, which sorts by the tile center's ground-plane y.
 */
function raisedDepth(top: number, z: number, id: number): number {
  const footY = top + z * ELEV_H + HALF_H;
  return footY + RAISED_DECAL_BIAS + (id & 0xff) / 1e5;
}

/** A still frame for a head: aiming heads face SE, idle heads show their first frame. */
function headFrame(id: SpriteId): string {
  const style = headStyle(id);
  return style.kind === 'aim' ? 'se' : `${style.anim}_0`;
}
