// The Sproing Pad's leapers and the flyers they ground, minimal (towers.md § 7; T704's readable
// view, polished by T730a; leaperLook.ts has the rules). Read from the sim each frame, so it holds
// while paused:
// - each leaper in the air (out or back; at home it's in the pad, not drawn) boings along an arc
//   (`leapLiftPx`) over a faint orange spot at its ground point, in its own body (`ally.leaper`,
//   T740a), facing the way its leg runs, in the pose its leg is in (T730a `leaperPose`: stretched
//   springing off and reaching for the bonk, tucked through the arc, squashed landing home), in
//   the `air` layer (over the towers and walkers it boings past), sorted by its ground point like
//   a flyer;
// - each bonk (`LeaperBonk`) pops a small orange ring on its target;
// - each flyer a leaper grounded (`FlyerGrounded`), while it stays Pinned, wears an orange ring on
//   the ground under it (over an ink under-stroke), a dotted orange drop from its feet down to the
//   ring (T730a), and three gold dizzy stars over its head (one Graphics in `vfx`). Its Pin
//   draws no harpoon rope: HarpoonView passes by the flyers in `grounded` (T730a).
// Allocation-free per frame once warm: a pool of sprites that grows the first time more leapers
// are out than it holds, each leaper's leg kept by uid (made once per leaper), scratch points
// module-level, the Graphics redrawn in place.
import type * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Ally, Enemy, SimEvent, Tower } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { hexOf } from './jamLook.ts';
import {
  leaperFrame,
  leaperPose,
  type LeaperPose,
  BONK_COLOR,
  BONK_MS,
  BONK_RADIUS_TILES,
  GROUND_RING_COLOR,
  GROUND_RING_RX,
  GROUND_RING_RY,
  leapLiftPx,
  legProgress,
  STAR_COLOR,
  starOffset,
  STARS,
} from './leaperLook.ts';
import { facingOf, type Facing } from './spriteInfo.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX, type TransientFx } from './TransientFx.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
import type { ViewContext } from './ViewContext.ts';

interface Pool<T> {
  readonly used: number;
  readonly items: readonly DeepReadonly<T>[];
}

/** The state the leaper view reads. */
export interface LeaperState {
  readonly allies: Pool<Ally>;
  readonly enemies: Pool<Enemy>;
  readonly towers: Pool<Tower>;
}

/** The body a leaper wears (T740a's `ally.leaper`: frame 0 of its walk is the tucked boing). */
const BODY: SpriteId = 'ally.leaper';
const RING = hexOf(GROUND_RING_COLOR);
const STAR = hexOf(STAR_COLOR);
const INK = hexOf('ink.0');
/** Sprites made up front: four Sky Bouncers. More are made as needed. */
const SLOTS = 8;

interface Slot {
  readonly body: Phaser.GameObjects.Image;
  facing: Facing | null;
  pose: LeaperPose | null;
}

/** A pose's frame for one facing, looked up once. */
interface PoseFrame {
  readonly texture: string;
  readonly frame: string;
  readonly ax: number;
  readonly ay: number;
}
const FACING_ORDER: readonly Facing[] = ['se', 'sw', 'ne', 'nw'];
const POSES: readonly LeaperPose[] = ['stretch', 'tuck', 'land'];

/** A leaper's current leg: where it began (grid, lift px) and its state then. */
interface Leg {
  state: Ally['swarmState'];
  fromX: number;
  fromY: number;
  fromLift: number;
  toLift: number;
  frame: number;
}

const pos: Vec2 = { x: 0, y: 0 };
const star = { dx: 0, dy: 0 };
const drawn = blankBox();

function findTower(towers: Pool<Tower>, uid: number): DeepReadonly<Tower> | null {
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === uid) return t;
  }
  return null;
}

function findEnemy(enemies: Pool<Enemy>, uid: number): DeepReadonly<Enemy> | null {
  if (uid === 0) return null;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.alive && e.uid === uid) return e;
  }
  return null;
}

/** A unit's body lift over its ground point (px): a flyer's is up in the air. */
function bodyLift(e: DeepReadonly<Enemy> | null): number {
  return BODY_LIFT_PX + (e !== null && e.def !== null && e.def.layer === 'air' ? AIR_LIFT_PX : 0);
}

export class LeaperView {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #anchors: UnitAnchors;
  readonly #reducedMotion: () => boolean;
  readonly #slots: Slot[] = [];
  readonly #legs = new Map<number, Leg>();
  /** The flyers a leaper grounded, by uid, while their Pin holds. */
  readonly #grounded = new Set<number>();
  /** Each pose's frame per facing (`<pose>|<facing>`), looked up once. */
  readonly #frames = new Map<string, PoseFrame>();
  readonly #marks: Phaser.GameObjects.Graphics;
  readonly #forget = (leg: Leg, uid: number): void => {
    if (leg.frame !== this.#frame) this.#legs.delete(uid);
  };
  #frame = 0;
  #ms = 0;
  #out = 0;
  #shownGrounded = 0;
  /** Bonks and groundings seen since the view was made (the smoke flow's checks). */
  bonks = 0;
  groundings = 0;

  constructor(
    ctx: ViewContext,
    fx: TransientFx,
    anchors: UnitAnchors = NO_ANCHORS,
    reducedMotion: () => boolean = () => false,
  ) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#anchors = anchors;
    this.#reducedMotion = reducedMotion;
    this.#marks = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#marks);
    for (const pose of POSES) {
      for (const f of FACING_ORDER) {
        const name = leaperFrame(pose, f);
        const ref = ctx.sprites.frame(BODY, name, DEFAULT_VARIANT);
        const a = ctx.sprites.frameAnchor(BODY, name);
        this.#frames.set(pose + '|' + f, {
          texture: ref.texture,
          frame: ref.frame,
          ax: a.x,
          ay: a.y,
        });
      }
    }
    for (let i = 0; i < SLOTS; i++) this.#grow();
  }

  /** The flyers a leaper grounded whose Pin still holds (HarpoonView draws no rope on them). */
  get grounded(): ReadonlySet<number> {
    return this.#grounded;
  }

  /** Leapers drawn in the air now, and grounded flyers marked now. */
  get shown(): { readonly out: number; readonly grounded: number } {
    return { out: this.#out, grounded: this.#shownGrounded };
  }

  /** Pops each bonk and remembers each flyer a leaper grounded. Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>, enemies: () => Pool<Enemy>): () => void {
    const offs = [
      bus.on('LeaperBonk', (ev) => {
        this.bonks++;
        const e = findEnemy(enemies(), ev.target);
        if (e === null) return;
        this.#fx.ring(e.x, e.y, BONK_RADIUS_TILES, BONK_COLOR, BONK_MS, true, bodyLift(e));
      }),
      bus.on('FlyerGrounded', (ev) => {
        this.groundings++;
        this.#grounded.add(ev.uid);
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** Each frame (`dt` ms): the leapers in the air, then the grounded flyers' marks. */
  update(state: LeaperState, dt: number): void {
    const frame = ++this.#frame;
    this.#ms += dt;
    const g = this.#marks;
    g.clear();
    let n = 0;
    const allies = state.allies;
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.mode !== 'owner' || a.kind !== 'leaper') continue;
      const leg = this.#leg(a, state, frame);
      if (a.swarmState === 'home') continue;
      if (n === this.#slots.length) this.#grow();
      const slot = this.#slots[n++]!; // n < length: grown above
      // Where the leg ends: its target (out), or its pad (back).
      let toX: number;
      let toY: number;
      if (a.swarmState === 'out') {
        const target = findEnemy(state.enemies, a.targetUid);
        toX = target?.x ?? a.x;
        toY = target?.y ?? a.y;
        leg.toLift = bodyLift(target);
      } else {
        const pad = findTower(state.towers, a.ownerUid);
        toX = pad?.x ?? a.x;
        toY = pad?.y ?? a.y;
        leg.toLift = 0;
      }
      const done = Math.hypot(a.x - leg.fromX, a.y - leg.fromY);
      const left = Math.hypot(toX - a.x, toY - a.y);
      const p = legProgress(done, left);
      const lift = leapLiftPx(p, leg.fromLift, leg.toLift);
      gridToScreen(a.x, a.y, this.#ctx.origin, pos);
      // Its spot on the ground, so the height reads (a dark shadow vanishes on Act III's ground).
      g.fillStyle(RING, 0.45);
      g.fillEllipse(Math.round(pos.x), Math.round(pos.y), 8, 3);
      const facing = facingOf(toX - leg.fromX, toY - leg.fromY);
      this.#look(slot, facing, leaperPose(a.swarmState === 'out', p));
      slot.body
        .setPosition(Math.round(pos.x), Math.round(pos.y - lift))
        .setDepth(worldDepth(pos.y, 'enemy', a.uid))
        .setVisible(true);
    }
    this.#out = n;
    this.#legs.forEach(this.#forget);
    for (; n < this.#slots.length; n++) {
      const slot = this.#slots[n]!; // n < length
      if (slot.facing !== null) this.#hide(slot);
    }
    this.#shownGrounded = this.#drawGrounded(g, state.enemies);
  }

  reset(): void {
    for (const s of this.#slots) this.#hide(s);
    this.#legs.clear();
    this.#grounded.clear();
    this.#marks.clear();
    this.#out = 0;
    this.#shownGrounded = 0;
    this.#ms = 0;
  }

  /** The leaper's leg, begun anew when its state changes (from its pad out, from its bonk back). */
  #leg(a: DeepReadonly<Ally>, state: LeaperState, frame: number): Leg {
    let leg = this.#legs.get(a.uid);
    if (leg === undefined) {
      leg = { state: 'home', fromX: a.x, fromY: a.y, fromLift: 0, toLift: 0, frame };
      this.#legs.set(a.uid, leg);
    }
    leg.frame = frame;
    if (leg.state !== a.swarmState) {
      if (a.swarmState === 'out') {
        const pad = findTower(state.towers, a.ownerUid);
        leg.fromX = pad?.x ?? a.x;
        leg.fromY = pad?.y ?? a.y;
        leg.fromLift = 0;
      } else {
        // Back from where it bonked (or turned): from its height there.
        leg.fromX = a.x;
        leg.fromY = a.y;
        leg.fromLift = leg.state === 'out' ? leg.toLift : 0;
      }
      leg.state = a.swarmState;
    }
    return leg;
  }

  /** The ground ring and dizzy stars on each flyer a leaper grounded, while Pinned. */
  #drawGrounded(g: Phaser.GameObjects.Graphics, enemies: Pool<Enemy>): number {
    if (this.#grounded.size === 0) return 0;
    const still = this.#reducedMotion();
    let shown = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!this.#grounded.has(e.uid)) continue;
      if (!e.alive || e.pinnedTicks <= 0) {
        this.#grounded.delete(e.uid);
        continue;
      }
      let x: number;
      let ground: number;
      let head: number;
      let feet: number;
      if (this.#anchors.box(e.uid, drawn)) {
        x = drawn.x;
        ground = drawn.groundY;
        head = drawn.top - 7; // over its health bar
        feet = drawn.bottom;
      } else {
        gridToScreen(e.x, e.y, this.#ctx.origin, pos);
        x = pos.x;
        ground = pos.y;
        head = pos.y - AIR_LIFT_PX - 19;
        feet = pos.y - AIR_LIFT_PX;
      }
      shown++;
      const rx = Math.round(x);
      const gy = Math.round(ground);
      g.lineStyle(3, INK, 0.7);
      g.strokeEllipse(rx, gy, GROUND_RING_RX * 2, GROUND_RING_RY * 2);
      g.lineStyle(1, RING, 1);
      g.strokeEllipse(rx, gy, GROUND_RING_RX * 2, GROUND_RING_RY * 2);
      // A dotted drop from its feet to the ring (T730a): held down there, grounded.
      g.fillStyle(RING, 1);
      for (let y = Math.round(feet) + 1; y < gy - GROUND_RING_RY; y += 3) g.fillRect(rx, y, 1, 2);
      g.fillStyle(STAR, 1);
      for (let k = 0; k < STARS; k++) {
        starOffset(k, this.#ms, still, star);
        g.fillRect(Math.round(x + star.dx) - 1, Math.round(head + star.dy) - 1, 3, 3);
      }
    }
    return shown;
  }

  /** Shows the body's frame for `pose` facing `facing` (each a still frame; T730a). */
  #look(slot: Slot, facing: Facing, pose: LeaperPose): void {
    if (slot.facing === facing && slot.pose === pose) return;
    slot.facing = facing;
    slot.pose = pose;
    const f = this.#frames.get(pose + '|' + facing);
    if (f !== undefined) slot.body.setTexture(f.texture, f.frame).setDisplayOrigin(f.ax, f.ay);
  }

  /** One more pooled image, hidden. */
  #grow(): void {
    const body = this.#ctx.scene.make.image({}, false).setVisible(false);
    this.#ctx.layers.air.add(body);
    this.#slots.push({ body, facing: null, pose: null });
  }

  #hide(slot: Slot): void {
    slot.facing = null;
    slot.pose = null;
    slot.body.setVisible(false);
  }
}
