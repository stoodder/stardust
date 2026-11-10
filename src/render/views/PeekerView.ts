// The Peeker (T309; design/core-loop.md § 6.9, art-direction §6): `prop.peeker` on the map's
// `peeker` marker, a youngling hiding behind a rock (or its map's own cover: A1M4's planter,
// `peekerCover` in groundTiles.ts). It peeks out every 20–40 s of play, ducks
// when an enemy comes near or the cursor is on its rock, and ducks when poked (peekerMotion.ts
// has the rule). Render-only and cosmetic: its timing draws from its own random source, never the
// sim's, and nothing here touches the sim. The poke itself (a click, or Enter on the keyboard
// cursor) is a UI event that BattleInteraction hands to the scene and the app.
//
// Where the map makes the rock a clickable world object (A2M3, T409), the scene reads its hold
// from the sim (peekerMotion.ts `peekerHold`): `holding` while the `peeker` marker is clickable
// (Pebble stays up on the rock, looking about and blinking, never shy: she wants to be found;
// ClickableView outlines her `outlineFrame`), and `empty` before and after (the same rock, bare).
// Behind the rock those are the Peeker's own frames (T440c): `hold` (Pebble up on the rock, paws
// over its crown) and `empty`; another cover holds with its `peek` and empties to `hidden`. As she
// is picked up (`holding` → `empty`: a click or the fallback) her held frame lifts off the rock and
// fades (peekerMotion.ts `liftLook`, T430b); the scene puffs a dust ring under it.
import * as Phaser from 'phaser';
import { peekerFrame, type PeekerCover } from '../../content/sprites/props/peeker.ts';
import { createRng, nextFloat } from '../../shared/rng.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { propVariant } from './groundTiles.ts';
import { prefersReducedMotion } from '../motion.ts';
import {
  enemyNear,
  liftLook,
  PeekerMotion,
  type PeekerHold,
  type PeekerPose,
} from './peekerMotion.ts';
import type { ObjectFrame } from './ClickableView.ts';
import type { ViewContext } from './ViewContext.ts';

const SPRITE = 'prop.peeker';
/** Her hold and the bare rock, behind the rock (`prop.peeker`'s `hold` anim and `empty`). */
const HOLD = { frame: 'hold_0', anim: 'hold' } as const;
const EMPTY = 'empty';

const pos: Vec2 = { x: 0, y: 0 };
/** Props sort among themselves by a per-tile id (GroundView's `propTieBreak`). */
const TIE_MASK = 0xff;

/** What the Peeker reads each frame: the sim's enemy pool. */
export interface PeekerEnemies {
  readonly items: readonly { readonly alive: boolean; readonly x: number; readonly y: number }[];
  readonly used: number;
}

export class PeekerView {
  readonly #img: Phaser.GameObjects.Sprite;
  /** Pebble lifting off the rock as she's picked up (her held frame), and how long it has run. */
  readonly #lift: Phaser.GameObjects.Image;
  #liftMs = -1;
  readonly #motion: PeekerMotion;
  readonly #hidden: { readonly texture: string; readonly frame: string };
  readonly #peek: string;
  readonly #duck: string;
  /** The holding anim (`hold` behind the rock; a cover's `peek`). */
  readonly #holdAnim: string;
  /** The holding pose's frame (peek_0): what the clickable outline hugs. */
  readonly #held: { readonly texture: string; readonly frame: string };
  readonly #heldAnchor: { readonly x: number; readonly y: number };
  readonly #empty: { readonly texture: string; readonly frame: string };
  readonly #emptyAnchor: { readonly x: number; readonly y: number };
  readonly #anchor: { readonly x: number; readonly y: number };
  readonly #px: number;
  readonly #py: number;
  #hold: PeekerHold = 'shy';
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
    const rock = cover === 'rock';
    const held = rock ? HOLD.frame : peekerFrame(cover, 'peek_0');
    this.#holdAnim = rock ? sprites.anim(SPRITE, HOLD.anim, variant) : this.#peek;
    this.#held = sprites.frame(SPRITE, held, variant);
    this.#heldAnchor = sprites.frameAnchor(SPRITE, held);
    const empty = rock ? EMPTY : hidden;
    this.#empty = sprites.frame(SPRITE, empty, variant);
    this.#emptyAnchor = sprites.frameAnchor(SPRITE, empty);
    this.#anchor = anchor;
    gridToScreen(col + 0.5, row + 0.5, origin, pos);
    this.#px = pos.x;
    this.#py = pos.y;
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
    this.#lift = new Phaser.GameObjects.Image(scene, pos.x, pos.y, this.#held.texture, this.#held.frame)
      .setDisplayOrigin(this.#heldAnchor.x, this.#heldAnchor.y)
      // Just over the bare rock (a tie-break step), so she rises off it rather than into it.
      .setDepth(this.#img.depth + 1e-5)
      .setVisible(false);
    layers.world.add(this.#lift);
    this.#cx = col + 0.5;
    this.#cy = row + 0.5;
    const rng = createRng((seed ^ 0x5eec_e7a1) >>> 0);
    this.#motion = new PeekerMotion(() => nextFloat(rng));
  }

  /** Its pose now (the smoke hooks' view of it). */
  get pose(): PeekerPose {
    return this.#motion.pose;
  }

  /** She's lifting off the rock now (the smoke hooks' view of it). */
  get lifting(): boolean {
    return this.#liftMs >= 0;
  }

  /** Its story state (the smoke hooks' view of it). */
  get hold(): PeekerHold {
    return this.#hold;
  }

  /** The holding pose's frame and where its top-left sits (ClickableView's outline hugs it). */
  outlineFrame(): ObjectFrame {
    return {
      texture: this.#held.texture,
      frame: this.#held.frame,
      left: this.#px - this.#heldAnchor.x,
      top: this.#py - this.#heldAnchor.y,
    };
  }

  /**
   * One frame: `realMs` of wall time, `playMs` of play (0 while paused), the enemy pool, whether
   * the pointer or the keyboard cursor is on the rock, and its story state (`peekerHold`).
   */
  update(
    realMs: number,
    playMs: number,
    enemies: PeekerEnemies,
    hovered: boolean,
    hold: PeekerHold = 'shy',
  ): void {
    if (hold !== this.#hold) {
      if (this.#hold === 'holding' && hold === 'empty') this.#liftMs = 0;
      this.#setHold(hold);
    }
    if (this.#liftMs >= 0) this.#syncLift(realMs);
    if (hold !== 'shy') return;
    const shy = hovered || enemyNear(enemies.items, enemies.used, this.#cx, this.#cy);
    this.#motion.update(realMs, playMs, shy);
    this.#show();
  }

  /** A poke (a click or Enter on its rock): it ducks. */
  poke(): void {
    if (this.#hold !== 'shy') return;
    this.#motion.poke();
    this.#show();
  }

  /** Holding: she's up on the rock, looking about (the peek anim, looping); empty: the bare rock. */
  #setHold(hold: PeekerHold): void {
    this.#hold = hold;
    const img = this.#img;
    img.stop();
    // The frame first, then its origin: a display origin is kept as a share of the frame's size,
    // and the rock and the Peeker's frames differ in size.
    if (hold === 'holding') {
      img
        .setTexture(this.#held.texture, this.#held.frame)
        .setDisplayOrigin(this.#heldAnchor.x, this.#heldAnchor.y)
        .play(this.#holdAnim);
    } else if (hold === 'empty') {
      img
        .setTexture(this.#empty.texture, this.#empty.frame)
        .setDisplayOrigin(this.#emptyAnchor.x, this.#emptyAnchor.y);
    } else {
      // Shy (only ever the first hold): the rock and its motion.
      img
        .setTexture(this.#hidden.texture, this.#hidden.frame)
        .setDisplayOrigin(this.#anchor.x, this.#anchor.y);
      this.#shown = -1;
      this.#show();
    }
  }

  /** Pebble's lift: up off the rock and fading, then gone. */
  #syncLift(realMs: number): void {
    const look = liftLook(this.#liftMs, prefersReducedMotion());
    this.#liftMs += Number.isFinite(realMs) && realMs > 0 ? realMs : 0;
    if (look === null) {
      this.#liftMs = -1;
      this.#lift.setVisible(false);
      return;
    }
    this.#lift
      .setPosition(this.#px, this.#py - look.risePx)
      .setAlpha(look.alpha)
      .setVisible(true);
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
    this.#lift.destroy();
  }
}
