// The Scuttle Den's swarmlings (towers.md § 7; T604): the minimal readable view (T630a polishes
// it). Its bodies are `ally.swarmling` and `ally.champion` (T640a: young Skitterkin, the Champion a
// size up in a red headband). Read from the sim's owner allies each frame:
// - at home (resting in the mound) none is drawn;
// - dashing out or running home, each scurries in its walk anim in the Skitterkin allies' palette,
//   facing the way it moves, depth-sorted in `world` like a unit;
// - latched, it rides its target: its feet on the top of the body as drawn (the lane offset, a
//   flyer's lift; unitAnchor.ts, falling back to the grid point), so the body still shows under
//   it, spread a few px by uid so a pile reads as a pile, nibbling in its `latch` anim (squashed
//   flat, legs splayed), sorted just in front of the body. On a burrowed unit it rides the mound.
// Allocation-free per frame: a fixed pool of sprites, set up once; an anim restarts only when the
// slot's look changes.
import type * as Phaser from 'phaser';
import { SPRITES, type SpriteId } from '../../content/sprites/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Ally, Enemy } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { REFUGEE_VARIANT } from './RefugeeView.ts';
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

/** Enough for four Big Families and a Finders Keepers each (more go unshown). */
const MAX_SWARM = 40;
/** How far down from the top of its target's frame a latched one's feet cling (px). */
const CLING_PX = 4;
/** A latched one's sideways spread by uid (px either way), so a pile of them reads. */
const SPREAD_PX = 3;

interface Slot {
  readonly body: Phaser.GameObjects.Sprite;
  /** Its look now: `<sprite>:<facing>:<held>` ('' while hidden). */
  look: string;
}

const pos: Vec2 = { x: 0, y: 0 };
const drawn = blankBox();

export class SwarmView {
  readonly #ctx: ViewContext;
  readonly #anchors: UnitAnchors;
  readonly #reducedMotion: () => boolean;
  readonly #slots: Slot[] = [];
  /** Each ally's last grid point and facing, by uid (the way it moves). */
  readonly #last = new Map<number, { x: number; y: number; facing: Facing; frame: number }>();
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
    for (let i = 0; i < MAX_SWARM; i++) {
      const body = ctx.scene.make.sprite({}, false).setVisible(false);
      ctx.layers.world.add(body);
      this.#slots.push({ body, look: '' });
    }
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
    for (let i = 0; i < allies.used && n < MAX_SWARM; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.mode !== 'owner' || a.kind === null) continue;
      if (a.swarmState === 'home') continue;
      const sprite = a.kind === 'champion' ? SWARM_SPRITES.champion : SWARM_SPRITES.swarmling;
      const slot = this.#slots[n++]!; // n < MAX_SWARM
      const facing = this.#facing(a, frame);
      const held = a.swarmState === 'latched';
      if (held) latched++;
      else out++;
      this.#look(slot, sprite, facing, held);
      let x: number;
      let y: number;
      let foot: number;
      if (held && this.#anchors.box(a.targetUid, drawn)) {
        x = drawn.x + (((a.uid * 7) % (2 * SPREAD_PX + 1)) - SPREAD_PX);
        y = drawn.top + CLING_PX; // its feet on the body's back: the body still shows
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
    for (const [uid, last] of this.#last) if (last.frame !== frame) this.#last.delete(uid);
    for (; n < MAX_SWARM; n++) {
      const slot = this.#slots[n]!; // n < MAX_SWARM
      if (slot.look !== '') this.#hide(slot);
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
    const look = `${sprite}:${facing}:${held ? 1 : 0}`;
    if (slot.look === look) return;
    slot.look = look;
    const { sprites } = this.#ctx;
    const latch = held && hasAnim(sprite, `latch_${facing}`);
    const anim = latch ? `latch_${facing}` : `walk_${facing}`;
    const a = sprites.frameAnchor(sprite, `${anim}_0`);
    slot.body.play(sprites.anim(sprite, anim, SWARM_VARIANT.get(sprite) ?? DEFAULT_VARIANT), true);
    slot.body.setDisplayOrigin(a.x, a.y);
    if ((held && !latch) || this.#reducedMotion()) slot.body.anims.pause();
  }

  #hide(slot: Slot): void {
    slot.look = '';
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
