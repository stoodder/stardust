// The Scuttle Den's swarmlings (towers.md § 7; T604, polished by T630a; swarmLook.ts has the
// rules). Its bodies are `ally.swarmling` and `ally.champion` (T640a: young Skitterkin, the Champion a
// size up in a red headband). Read from the sim's owner allies each frame:
// - at home (resting in the mound) none is drawn;
// - dashing out or running home, each scurries in its walk anim in the Skitterkin allies' palette,
//   facing the way it moves, depth-sorted in `world` like a unit;
// - latched, it rides its target's back as drawn (the lane offset, a flyer's lift; unitAnchor.ts,
//   falling back to the grid point), low enough that it never climbs over the frame's top, where
//   the target's health bar sits (`clingFeetY`), spread a few px by uid so a pile reads as a pile,
//   nibbling in its `latch` anim (squashed flat, legs splayed), sorted just in front of the body.
//   On a burrowed unit it rides the mound.
// Allocation-free per frame: a pool of sprites that grows the first time more are out than it holds
// (the sim's ally pool grows too; uncapped Dens can send more than any fixed count, review B3); an
// anim restarts only when the slot's look changes (compared field by field, no key string).
import type * as Phaser from 'phaser';
import { SPRITES, type SpriteId } from '../../content/sprites/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Ally, Enemy } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { REFUGEE_VARIANT } from './RefugeeView.ts';
import { clingFeetY, clingSpreadPx, RIDE_PX } from './swarmLook.ts';
import { facingOf, hasAnim, type Facing } from './spriteInfo.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from './TransientFx.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
import type { ViewContext } from './ViewContext.ts';

/** The pools as this view reads them. */
export interface SwarmAllies {
  readonly used: number;
  readonly items: readonly DeepReadonly<Ally>[];
}
export interface SwarmEnemies {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

/** Each kind's body (T640a). */
export const SWARM_SPRITES: Readonly<Record<'swarmling' | 'champion', SpriteId>> = {
  swarmling: 'ally.swarmling',
  champion: 'ally.champion',
};

/**
 * The palette each body wears: the Skitterkin allies' (as the refugees') where the sprite bakes
 * it, else its own.
 */
export const SWARM_VARIANT: ReadonlyMap<string, string> = new Map(
  Object.values(SWARM_SPRITES).map((id) => {
    const def = SPRITES.find((d) => d.id === id);
    const ally = def?.variants?.includes(REFUGEE_VARIANT) === true;
    return [id, ally ? REFUGEE_VARIANT : DEFAULT_VARIANT];
  }),
);

/** Slots made up front: four Big Families and a Finders Keepers each. More are made as needed. */
export const SWARM_SLOTS = 40;

interface Slot {
  readonly body: Phaser.GameObjects.Sprite;
  /** Its look now: the sprite (null while hidden), facing, and whether it's latched. */
  sprite: SpriteId | null;
  facing: Facing;
  held: boolean;
}

/** A swarmling's last grid point and facing (the way it moves), and the frame it was last seen. */
interface Last {
  x: number;
  y: number;
  facing: Facing;
  frame: number;
}

const pos: Vec2 = { x: 0, y: 0 };
const drawn = blankBox();

export class SwarmView {
  readonly #ctx: ViewContext;
  readonly #anchors: UnitAnchors;
  readonly #reducedMotion: () => boolean;
  readonly #slots: Slot[] = [];
  /** Each ally's last grid point and facing, by uid (the way it moves). */
  readonly #last = new Map<number, Last>();
  /** Drops a swarmling not seen this frame (Map.forEach's callback, made once). */
  readonly #forget = (last: Last, uid: number): void => {
    if (last.frame !== this.#frame) this.#last.delete(uid);
  };
  #frame = 0;
  #out = 0;
  #latched = 0;

  constructor(
    ctx: ViewContext,
    anchors: UnitAnchors = NO_ANCHORS,
    reducedMotion: () => boolean = () => false,
  ) {
    this.#ctx = ctx;
    this.#anchors = anchors;
    this.#reducedMotion = reducedMotion;
    for (let i = 0; i < SWARM_SLOTS; i++) this.#grow();
  }

  /** Sprites made so far (the pool grows when more are out than it holds). */
  get slots(): number {
    return this.#slots.length;
  }

  /** Swarmlings drawn dashing or running home now, and latched now (the smoke flow's checks). */
  get shown(): { readonly out: number; readonly latched: number } {
    return { out: this.#out, latched: this.#latched };
  }

  /** Each frame: every swarmling or Champion out of its Den. */
  update(allies: SwarmAllies, enemies: SwarmEnemies): void {
    const frame = ++this.#frame;
    let n = 0;
    let out = 0;
    let latched = 0;
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.mode !== 'owner' || a.kind === null) continue;
      if (a.swarmState === 'home') continue;
      const sprite = a.kind === 'champion' ? SWARM_SPRITES.champion : SWARM_SPRITES.swarmling;
      if (n === this.#slots.length) this.#grow();
      const slot = this.#slots[n++]!; // n < length: grown above
      const facing = this.#facing(a, frame);
      const held = a.swarmState === 'latched';
      if (held) latched++;
      else out++;
      this.#look(slot, sprite, facing, held);
      let x: number;
      let y: number;
      let foot: number;
      if (held && this.#anchors.box(a.targetUid, drawn)) {
        x = drawn.x + clingSpreadPx(a.uid, drawn.halfW);
        // On the body's back, under the frame's top: the body shows, and its bar stays clear.
        y = clingFeetY(
          drawn.top,
          drawn.bottom,
          RIDE_PX[a.kind === 'champion' ? 'champion' : 'swarmling'],
        );
        foot = drawn.groundY + 1;
      } else {
        gridToScreen(a.x, a.y, this.#ctx.origin, pos);
        x = pos.x;
        foot = pos.y;
        y = pos.y - (held ? BODY_LIFT_PX + (onAir(enemies, a.targetUid) ? AIR_LIFT_PX : 0) : 0);
        if (held) foot += 1;
      }
      slot.body
        .setPosition(Math.round(x), Math.round(y))
        .setDepth(worldDepth(foot, 'enemy', a.uid))
        .setVisible(true);
    }
    this.#out = out;
    this.#latched = latched;
    // Forget the ones gone (went in for good, or their Den sold).
    this.#last.forEach(this.#forget);
    for (; n < this.#slots.length; n++) {
      const slot = this.#slots[n]!; // n < length
      if (slot.sprite !== null) this.#hide(slot);
    }
  }

  reset(): void {
    for (const s of this.#slots) this.#hide(s);
    this.#last.clear();
    this.#out = 0;
    this.#latched = 0;
  }

  /** Its facing: the way it moved since the last frame, else the one it had. */
  #facing(a: DeepReadonly<Ally>, frame: number): Facing {
    const last = this.#last.get(a.uid);
    if (last === undefined) {
      this.#last.set(a.uid, { x: a.x, y: a.y, facing: 'se', frame });
      return 'se';
    }
    last.frame = frame;
    if (a.x !== last.x || a.y !== last.y) {
      last.facing = facingOf(a.x - last.x, a.y - last.y);
      last.x = a.x;
      last.y = a.y;
    }
    return last.facing;
  }

  /**
   * Plays the slot's dash for `facing`, or latched its `latch` (T640a: squashed flat, legs splayed,
   * nibbling) where the sprite draws one, else the dash held on its first frame. Still under reduced
   * motion.
   */
  #look(slot: Slot, sprite: SpriteId, facing: Facing, held: boolean): void {
    if (slot.sprite === sprite && slot.facing === facing && slot.held === held) return;
    slot.sprite = sprite;
    slot.facing = facing;
    slot.held = held;
    const { sprites } = this.#ctx;
    const latch = held && hasAnim(sprite, `latch_${facing}`);
    const anim = latch ? `latch_${facing}` : `walk_${facing}`;
    const a = sprites.frameAnchor(sprite, `${anim}_0`);
    slot.body.play(sprites.anim(sprite, anim, SWARM_VARIANT.get(sprite) ?? DEFAULT_VARIANT), true);
    slot.body.setDisplayOrigin(a.x, a.y);
    if ((held && !latch) || this.#reducedMotion()) slot.body.anims.pause();
  }

  /** One more pooled sprite, hidden. */
  #grow(): void {
    const body = this.#ctx.scene.make.sprite({}, false).setVisible(false);
    this.#ctx.layers.world.add(body);
    this.#slots.push({ body, sprite: null, facing: 'se', held: false });
  }

  #hide(slot: Slot): void {
    slot.sprite = null;
    slot.body.stop();
    slot.body.setVisible(false);
  }
}

/** Whether enemy `uid` flies (a Champion on a flyer rides it up there). */
function onAir(enemies: SwarmEnemies, uid: number): boolean {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.alive && e.uid === uid) return e.def !== null && e.def.layer === 'air';
  }
  return false;
}
