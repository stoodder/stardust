// The Peeker (T309; design/core-loop.md § 6.9, art-direction §6): `prop.peeker` on the map's
// `peeker` marker, a youngling hiding behind a rock (or its map's own cover: A1M4's planter,
// `peekerCover`). It peeks out every 20–40 s of play, ducks
// when an enemy comes near or the cursor is on its rock, and ducks when poked (peekerMotion.ts
// has the rule). Render-only and cosmetic: its timing draws from its own random source, never the
// sim's, and nothing here touches the sim. The poke itself (a click, or Enter on the keyboard
// cursor) is a UI event that BattleInteraction hands to the scene and the app.
import * as Phaser from 'phaser';
import { peekerFrame, type PeekerCover } from '../../content/sprites/props/peeker.ts';
import { createRng, nextFloat } from '../../shared/rng.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { propVariant } from './groundTiles.ts';
import { enemyNear, PeekerMotion, type PeekerPose } from './peekerMotion.ts';
import type { ViewContext } from './ViewContext.ts';

const SPRITE = 'prop.peeker';
const pos: Vec2 = { x: 0, y: 0 };
/** Props sort among themselves by a per-tile id (GroundView's `propTieBreak`). */
const TIE_MASK = 0xff;

/**
 * Each map's own cover for the Peeker, where it isn't the default rock (act1.md per map; T312b):
 * A1M4's planter by the fountain. A1M3's fallen mailbox is a decor prop in front of the rock.
 */
const COVER_BY_MAP: Readonly<Record<string, PeekerCover>> = { a1_m04: 'planter' };

/** The Peeker's cover on map `mapId`. */
export function peekerCover(mapId: string): PeekerCover {
  return Object.hasOwn(COVER_BY_MAP, mapId) ? COVER_BY_MAP[mapId]! : 'rock'; // checked
}

/** What the Peeker reads each frame: the sim's enemy pool. */
export interface PeekerEnemies {
  readonly items: readonly { readonly alive: boolean; readonly x: number; readonly y: number }[];
  readonly used: number;
}

export class PeekerView {
  readonly #img: Phaser.GameObjects.Sprite;
  readonly #motion: PeekerMotion;
  readonly #hidden: { readonly texture: string; readonly frame: string };
  readonly #peek: string;
  readonly #duck: string;
  readonly #cx: number;
  readonly #cy: number;
  /** The tile index of the rock (the cursor and the pointer test against it). */
  readonly tile: number;
  #shown = -1;

  /**
   * The Peeker on tile (`col`, `row`) of a `cols`-wide map in env `env`. `seed` seeds its own
   * cosmetic random source (the battle's seed, mixed, so a seeded run looks the same each time).
   * `cover` is what it hides behind (`peekerCover`): the rock, or the map's own.
   */
  constructor(
    ctx: ViewContext,
    col: number,
    row: number,
    cols: number,
    env: string,
    seed: number,
    cover: PeekerCover = 'rock',
  ) {
    const { scene, sprites, layers, origin } = ctx;
    const variant = propVariant(SPRITE, env);
    const hidden = peekerFrame(cover, 'hidden');
    this.#hidden = sprites.frame(SPRITE, hidden, variant);
    this.#peek = sprites.anim(SPRITE, peekerFrame(cover, 'peek'), variant);
    this.#duck = sprites.anim(SPRITE, peekerFrame(cover, 'duck'), variant);
    const anchor = sprites.frameAnchor(SPRITE, hidden);
    gridToScreen(col + 0.5, row + 0.5, origin, pos);
    this.tile = row * cols + col;
    this.#img = new Phaser.GameObjects.Sprite(
      scene,
      pos.x,
      pos.y,
      this.#hidden.texture,
      this.#hidden.frame,
    )
      .setDisplayOrigin(anchor.x, anchor.y)
      .setDepth(worldDepth(pos.y, 'prop', this.tile & TIE_MASK));
    layers.world.add(this.#img);
    this.#cx = col + 0.5;
    this.#cy = row + 0.5;
    const rng = createRng((seed ^ 0x5eec_e7a1) >>> 0);
    this.#motion = new PeekerMotion(() => nextFloat(rng));
  }

  /** Its pose now (the smoke hooks' view of it). */
  get pose(): PeekerPose {
    return this.#motion.pose;
  }

  /**
   * One frame: `realMs` of wall time, `playMs` of play (0 while paused), the enemy pool, and
   * whether the pointer or the keyboard cursor is on the rock.
   */
  update(realMs: number, playMs: number, enemies: PeekerEnemies, hovered: boolean): void {
    const shy = hovered || enemyNear(enemies.items, enemies.used, this.#cx, this.#cy);
    this.#motion.update(realMs, playMs, shy);
    this.#show();
  }

  /** A poke (a click or Enter on its rock): it ducks. */
  poke(): void {
    this.#motion.poke();
    this.#show();
  }

  #show(): void {
    const m = this.#motion;
    if (m.serial === this.#shown) return;
    this.#shown = m.serial;
    switch (m.pose) {
      case 'peek':
        this.#img.play(this.#peek);
        return;
      case 'duck':
        // Plays once and ends on `hidden` (the sprite's anim), whatever it was doing before.
        this.#img.play(this.#duck);
        return;
      case 'hidden':
        this.#img.stop();
        this.#img.setTexture(this.#hidden.texture, this.#hidden.frame);
        return;
    }
  }

  destroy(): void {
    this.#img.destroy();
  }
}
