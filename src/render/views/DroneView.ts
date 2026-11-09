// The salvage drone (design/maps.md § 3; D076; T312a): `prop.salvage_drone` (T311b) flies from the
// core to the tile at the head of the drone's queue, works over it (its `work` anim: claw open, a
// teal tractor beam, sparks) for the rest of the tile's clear time, flies straight on to the next
// queued tile, and flies home to the core once the queue is empty, then parks out of sight. Its
// flight is the pure `vfx/droneFlight.ts`, on sim ticks, so it holds still while paused. The body
// hovers inside its frame (the anchor is the ground point under it), so it draws at its ground
// point in `air`, depth-sorted like a flyer, over `fx.shadow`. Allocation-free per frame.
import type * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { droneHomebound, droneOutbound, type DronePhase } from '../vfx/droneFlight.ts';
import type { ViewContext } from './ViewContext.ts';

/** The drone's sprite (T311b): frames fly_0/1 (anim `fly`) and work_0–2 (anim `work`). */
export const DRONE_SPRITE = 'prop.salvage_drone' as const;
/** Its depth tie-break (it isn't a pooled entity: one per battle). */
const DRONE_TIE = 0xff;

/** The queue as the drone reads it (`state.wreckage`). */
export interface DroneQueueLike {
  readonly queue: readonly number[];
  readonly progressTicks: number;
}

const pos: Vec2 = { x: 0, y: 0 };

export class DroneView {
  readonly #ctx: ViewContext;
  readonly #cols: number;
  readonly #body: Phaser.GameObjects.Sprite;
  readonly #shadow: Phaser.GameObjects.Image;
  /** Home: the core's tile center (grid), or the map's west edge without one. */
  readonly #home: Vec2;
  /** Where the drone is now, and where its current leg started (grid). */
  readonly #at: Vec2;
  readonly #from: Vec2 = { x: 0, y: 0 };
  readonly #to: Vec2 = { x: 0, y: 0 };
  /** The tile it's clearing (row-major), or −1 on its way home or parked. */
  #head = -1;
  /** The sim tick its flight home began. */
  #homeTick = 0;
  #phase: DronePhase = 'parked';

  constructor(ctx: ViewContext, map: CompiledMapDef<IdSpace>) {
    this.#ctx = ctx;
    this.#cols = map.cols;
    const core = map.tiles.indexOf('C');
    this.#home =
      core < 0
        ? { x: -1, y: map.rows / 2 }
        : { x: (core % map.cols) + 0.5, y: Math.floor(core / map.cols) + 0.5 };
    this.#at = { x: this.#home.x, y: this.#home.y };
    const { scene, layers, sprites } = ctx;
    this.#shadow = scene.make.image({}, false);
    const s = sprites.frame('fx.shadow', 'small');
    const sa = sprites.frameAnchor('fx.shadow', 'small');
    this.#shadow.setTexture(s.texture, s.frame).setDisplayOrigin(sa.x, sa.y).setVisible(false);
    layers.decal.add(this.#shadow);
    this.#body = scene.make.sprite({}, false);
    const f = sprites.frame(DRONE_SPRITE, 'fly_0');
    const a = sprites.frameAnchor(DRONE_SPRITE, 'fly_0');
    this.#body.setTexture(f.texture, f.frame).setDisplayOrigin(a.x, a.y).setVisible(false);
    layers.air.add(this.#body);
  }

  /** What the drone is doing (the smoke hooks' check). */
  get phase(): DronePhase {
    return this.#phase;
  }

  /** Places the drone for this frame: `drone` is `state.wreckage`, `tick` the sim's tick. */
  update(drone: DroneQueueLike, clearTicks: number, tick: number): void {
    const head = drone.queue[0];
    let phase: DronePhase;
    if (head !== undefined) {
      if (head !== this.#head) {
        // A new tile: fly there from wherever it is (home, or the tile it just cleared).
        this.#from.x = this.#phase === 'parked' ? this.#home.x : this.#at.x;
        this.#from.y = this.#phase === 'parked' ? this.#home.y : this.#at.y;
        this.#to.x = (head % this.#cols) + 0.5;
        this.#to.y = Math.floor(head / this.#cols) + 0.5;
        this.#head = head;
      }
      phase = droneOutbound(this.#from, this.#to, drone.progressTicks, clearTicks, this.#at);
    } else {
      if (this.#head >= 0) {
        // The queue ran out: head home from the last tile.
        this.#head = -1;
        this.#homeTick = tick;
        this.#from.x = this.#at.x;
        this.#from.y = this.#at.y;
      }
      phase =
        this.#phase === 'parked'
          ? 'parked'
          : droneHomebound(this.#from, this.#home, tick - this.#homeTick, this.#at);
    }
    this.#show(phase);
  }

  #show(phase: DronePhase): void {
    if (phase === 'parked') {
      if (this.#phase !== 'parked') {
        this.#body.stop().setVisible(false);
        this.#shadow.setVisible(false);
      }
      this.#phase = phase;
      return;
    }
    if (phase !== this.#phase) {
      this.#body.setVisible(true).play(this.#ctx.sprites.anim(DRONE_SPRITE, phase), true);
      this.#shadow.setVisible(true);
      this.#phase = phase;
    }
    gridToScreen(this.#at.x, this.#at.y, this.#ctx.origin, pos);
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    this.#body.setPosition(x, y);
    this.#shadow.setPosition(x, y);
    const depth = worldDepth(y, 'enemy', DRONE_TIE);
    if (this.#body.depth !== depth) this.#body.setDepth(depth);
  }
}
