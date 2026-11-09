// In-world placement and selection feedback (art-direction.md § Range rings and placement): the
// tile-mask highlight under the pointer and under the selected tower, one range ring, and the
// placement ghost (the armed tower at 60% alpha), and the onboarding pulse on free pads until the
// first build (D026). Decals draw in `decal`; the ghost sorts in `world` like a tower.
import type * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, tileImageTopLeft, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { highlightTexture, ringTexture, type HighlightKind } from '../vfx/overlayTextures.ts';
import { headStyle, spriteId } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';

/** Stepped alpha (art-direction §7): the ghost is 60%. */
const GHOST_ALPHA = 0.6;
/** The ghost sorts like a tower with a uid no live tower has. */
const GHOST_UID = 0;

const pos: Vec2 = { x: 0, y: 0 };

export class PlacementView {
  readonly #ctx: ViewContext;
  readonly #hover: Phaser.GameObjects.Image;
  readonly #selected: Phaser.GameObjects.Image;
  readonly #ring: Phaser.GameObjects.Image;
  readonly #ghostBase: Phaser.GameObjects.Image;
  readonly #ghostHead: Phaser.GameObjects.Image;
  #hoverKey = '';
  #ringKey = '';
  #ghostBaseId: string | null = null;
  #ghostHeadId: string | null = null;
  /** One `teal.3` highlight per buildable tile, for the onboarding pulse. */
  readonly #teach: { col: number; row: number; img: Phaser.GameObjects.Image }[] = [];

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    const { scene, layers } = ctx;
    this.#selected = scene.make.image({}, false).setOrigin(0, 0).setVisible(false);
    this.#hover = scene.make.image({}, false).setOrigin(0, 0).setVisible(false);
    this.#ring = scene.make.image({}, false).setVisible(false);
    layers.decal.add([this.#selected, this.#hover, this.#ring]);
    this.#ghostBase = scene.make.image({}, false).setAlpha(GHOST_ALPHA).setVisible(false);
    this.#ghostHead = scene.make.image({}, false).setAlpha(GHOST_ALPHA).setVisible(false);
    layers.world.add([this.#ghostBase, this.#ghostHead]);
  }

  /** The highlight under the pointer (tile col, row), or none. */
  setHover(col: number, row: number, kind: HighlightKind | null): void {
    if (kind === null) {
      this.#hover.setVisible(false);
      return;
    }
    const key = highlightTexture(this.#ctx.scene, kind);
    if (key !== this.#hoverKey) {
      this.#hover.setTexture(key);
      this.#hoverKey = key;
    }
    tileImageTopLeft(col, row, this.#ctx.origin, pos);
    this.#hover.setPosition(pos.x, pos.y).setVisible(true);
  }

  /** The highlight under the selected tower's tile, or none (col < 0). */
  setSelectedTile(col: number, row: number): void {
    if (col < 0) {
      this.#selected.setVisible(false);
      return;
    }
    if (this.#selected.texture.key !== highlightTexture(this.#ctx.scene, 'selected')) {
      this.#selected.setTexture(highlightTexture(this.#ctx.scene, 'selected'));
    }
    tileImageTopLeft(col, row, this.#ctx.origin, pos);
    this.#selected.setPosition(pos.x, pos.y).setVisible(true);
  }

  /** One range ring centered on grid point (gx, gy), or none (radius ≤ 0). */
  setRing(gx: number, gy: number, radiusTiles: number, valid: boolean): void {
    if (radiusTiles <= 0) {
      this.#ring.setVisible(false);
      return;
    }
    const tex = ringTexture(this.#ctx.scene, radiusTiles, valid);
    if (tex.key !== this.#ringKey) {
      this.#ring.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      this.#ringKey = tex.key;
    }
    gridToScreen(gx, gy, this.#ctx.origin, pos);
    this.#ring.setPosition(pos.x, pos.y).setVisible(true);
  }

  /** The armed tower's ghost on tile (col, row), or none (base null). */
  setGhost(col: number, row: number, base: string | null, head: string | null): void {
    if (base === null) {
      this.#ghostBase.setVisible(false);
      this.#ghostHead.setVisible(false);
      return;
    }
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

  /** The onboarding pulse's tiles (every buildable tile); call once. */
  setTeachTiles(tiles: readonly (readonly [number, number])[]): void {
    const { scene, layers, origin } = this.#ctx;
    const key = highlightTexture(scene, 'selected');
    for (const [col, row] of tiles) {
      tileImageTopLeft(col, row, origin, pos);
      const img = scene.make
        .image({}, false)
        .setTexture(key)
        .setOrigin(0, 0)
        .setPosition(pos.x, pos.y)
        .setVisible(false);
      layers.decal.addAt(img, 0);
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
    this.setGhost(0, 0, null, null);
  }
}

/** A still frame for a head: aiming heads face SE, idle heads show their first frame. */
function headFrame(id: SpriteId): string {
  const style = headStyle(id);
  return style.kind === 'aim' ? 'se' : `${style.anim}_0`;
}
