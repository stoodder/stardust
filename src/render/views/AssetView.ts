// A Protect map's asset on its marker (design/maps.md § 5.2, D111; T440c): A2M2's Rigs 7 and 8.
// It reads the sim's meter every frame and shows the frame for its damage band (`assetDamage`,
// `assetLook`), so the rigs crack, lose one derrick (its partner's beacon blinking the alarm), and
// fall as the meter does. GroundView leaves the marker's tile bare for it. Like the core, it would
// hide a tower on a tile behind it, so it draws at 60% while one stands there. Allocation-free per
// frame: it only swaps the frame when the band changes.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { GridPos, MarkerId } from '../../content/types.ts';
import { assetDamage, type AssetDamage } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { ASSET_SPRITES, assetLook } from './assetLook.ts';
import { OCCLUDING_ALPHA } from './CoreView.ts';
import { tilesBehind } from './groundTiles.ts';
import type { ViewContext } from './ViewContext.ts';
import { markScenery } from './scenery.ts';

/** Props sort among themselves by a per-tile id (GroundView's `propTieBreak`). */
const TIE_MASK = 0xff;

const pos: Vec2 = { x: 0, y: 0 };

export class AssetView {
  readonly #ctx: ViewContext;
  readonly #sprite: Phaser.GameObjects.Sprite | null = null;
  readonly #id: SpriteId = 'prop.rigs';
  readonly #behind: readonly number[] = [];
  #damage: AssetDamage | null = null;

  /** The asset on a map's `asset` marker, if the map has one with a sprite (`ASSET_SPRITES`). */
  constructor(
    ctx: ViewContext,
    map: {
      readonly cols: number;
      readonly tiles: readonly unknown[];
      readonly asset: { readonly marker: MarkerId; readonly tile: GridPos } | null;
    },
  ) {
    this.#ctx = ctx;
    const asset = map.asset;
    if (asset === null || !Object.hasOwn(ASSET_SPRITES, asset.marker)) return;
    const id = ASSET_SPRITES[asset.marker]!; // checked just above
    const [col, row] = asset.tile;
    const look = assetLook('intact');
    const { scene, sprites, layers, origin } = ctx;
    const f = sprites.frame(id, look.frame, DEFAULT_VARIANT);
    const a = sprites.frameAnchor(id, look.frame);
    gridToScreen(col + 0.5, row + 0.5, origin, pos);
    this.#sprite = new Phaser.GameObjects.Sprite(scene, pos.x, pos.y, f.texture, f.frame)
      .setDisplayOrigin(a.x, a.y)
      .setDepth(worldDepth(pos.y, 'prop', (row * map.cols + col) & TIE_MASK));
    layers.world.add(markScenery(this.#sprite));
    this.#id = id;
    this.#behind = tilesBehind(map, col, row, a.y);
  }

  /** Its damage band now (the smoke hooks' view of it); null on a map without one. */
  get damage(): AssetDamage | null {
    return this.#damage;
  }

  /** One frame: the sim's asset meter and its full value, and its tile map of towers. */
  update(asset: number, maxAsset: number, towerAtTile: readonly number[]): void {
    const sprite = this.#sprite;
    if (sprite === null) return;
    const damage = assetDamage(asset, maxAsset);
    if (damage !== this.#damage) {
      this.#damage = damage;
      const look = assetLook(damage);
      const { sprites } = this.#ctx;
      sprite.stop();
      const f = sprites.frame(this.#id, look.frame, DEFAULT_VARIANT);
      sprite.setTexture(f.texture, f.frame);
      if (look.anim !== null) sprite.play(sprites.anim(this.#id, look.anim, DEFAULT_VARIANT));
    }
    let hides = false;
    for (const i of this.#behind) if ((towerAtTile[i] ?? -1) >= 0) hides = true;
    const alpha = hides ? OCCLUDING_ALPHA : 1;
    if (sprite.alpha !== alpha) sprite.setAlpha(alpha);
  }
}
