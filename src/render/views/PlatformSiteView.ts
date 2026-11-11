// "Shareholder Value"'s hangar and crash site (A3M5; T730b; the rules are crashLanding.ts): the
// map's `hangar` prop (GroundView draws it shut, its REC lamp blinking) rolls open once the
// platform is out and stays open; and as the jettison opens each `crash_<n>` tile (T707), its plate
// (`prop.crash_plate`, one piece of the shell per tile) blows off the hull where the platform
// stands, arcs over, and lands on its tile with a puff of dust, then lies there as scenery, askew in
// its gouge. Under reduced motion, or on a battle that opens with the tiles already open, the plates
// lie there at once. The hangar's glow follows its frame (WorldGlowView). Allocation-free per
// frame: the plates are made once, hidden, and the pose is a reused scratch.
import * as Phaser from 'phaser';
import type { GridPos } from '../../content/types.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import {
  HANGAR_MARKER,
  HANGAR_OPEN,
  HANGAR_SPRITE,
  PLATE_SPRITE,
  plateFrame,
  platePose,
  platformOut,
  type PlatePose,
} from './crashLanding.ts';
import { isPlateMarker, propVariant } from './groundTiles.ts';
import { markScenery } from './scenery.ts';
import type { TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The landing's dust: a ring the plate's size, in the ground's grey. */
const DUST_TILES = 0.7;
const DUST_MS = 360;
/** Plates' depth tie-breaks (not pooled entities). */
const PLATE_TIE = 0x1a0;
/** A plate in the air sorts in front of what stands near its path. */
const AIR_DEPTH_PX = 48;

interface Plate {
  readonly marker: string;
  readonly col: number;
  readonly row: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  /** Its tile's ground point (screen px) and depth as it lies there. */
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  /** The order its tile opened (−1: still closed), the tick it opened, and where it left from. */
  order: number;
  openTick: number;
  fromX: number;
  fromY: number;
  landed: boolean;
}

interface Pool<T> {
  readonly used: number;
  readonly items: readonly DeepReadonly<T>[];
}

/** The state the view reads. */
export interface PlatformSiteState {
  readonly enemies: Pool<Enemy>;
  readonly tilesOpened: readonly string[];
  readonly tick: number;
}

const at: Vec2 = { x: 0, y: 0 };
const from: Vec2 = { x: 0, y: 0 };
const pose: PlatePose = { waiting: true, share: 0, liftPx: 0, landed: false };

export class PlatformSiteView {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx | null;
  readonly #reducedMotion: () => boolean;
  readonly #plates: Plate[] = [];
  readonly #hangar: Phaser.GameObjects.Sprite | null;
  #opened = 0;
  #first = true;
  #hangarOpen = false;

  constructor(
    ctx: ViewContext,
    map: { readonly markers: Readonly<Record<string, GridPos>>; readonly env: string },
    fx: TransientFx | null = null,
    reducedMotion: () => boolean = () => false,
  ) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    const { scene, sprites, layers, origin } = ctx;
    const variant = propVariant(PLATE_SPRITE, map.env);
    for (const [marker, p] of Object.entries(map.markers)) {
      if (!isPlateMarker(marker)) continue;
      const [col, row] = p;
      gridToScreen(col + 0.5, row + 0.5, origin, at);
      const f = sprites.frame(PLATE_SPRITE, plateFrame(0), variant);
      const a = sprites.frameAnchor(PLATE_SPRITE, plateFrame(0));
      const sprite = new Phaser.GameObjects.Sprite(scene, at.x, at.y, f.texture, f.frame);
      sprite.setDisplayOrigin(a.x, a.y).setVisible(false);
      layers.world.add(markScenery(sprite, col + 0.5, row + 0.5));
      this.#plates.push({
        marker,
        col,
        row,
        sprite,
        x: at.x,
        y: at.y,
        depth: worldDepth(at.y, 'prop', PLATE_TIE + this.#plates.length),
        order: -1,
        openTick: 0,
        fromX: 0,
        fromY: 0,
        landed: false,
      });
    }
    const h = map.markers[HANGAR_MARKER];
    this.#hangar = h === undefined ? null : hangarProp(layers.world, h, origin);
  }

  /** Each frame: the hangar rolls open once the platform is out; plates fly and land. */
  update(state: PlatformSiteState): void {
    const first = this.#first;
    this.#first = false;
    if (this.#hangar !== null && !this.#hangarOpen && platformOut(state.enemies)) {
      this.#hangarOpen = true;
      const { sprites } = this.#ctx;
      const name = this.#hangar.frame.name;
      const variant = name.slice(name.indexOf('#') + 1, name.lastIndexOf(':'));
      const f = sprites.frame(HANGAR_SPRITE, HANGAR_OPEN, variant);
      this.#hangar.stop().setTexture(f.texture, f.frame);
    }
    if (this.#plates.length === 0) return;
    const opened = state.tilesOpened;
    if (opened.length !== this.#opened) {
      for (let i = this.#opened; i < opened.length; i++) {
        this.#open(opened[i]!, state, first); // i < length
      }
      this.#opened = opened.length;
    }
    const still = this.#reducedMotion();
    for (let i = 0; i < this.#plates.length; i++) {
      const p = this.#plates[i]!; // i < length
      if (p.order < 0 || p.landed) continue;
      platePose(state.tick - p.openTick, p.order, still, pose);
      if (pose.landed) {
        this.#land(p, !still);
        continue;
      }
      if (pose.waiting) {
        if (p.sprite.visible) p.sprite.setVisible(false);
        continue;
      }
      const x = Math.round(p.fromX + (p.x - p.fromX) * pose.share);
      const y = Math.round(p.fromY + (p.y - p.fromY) * pose.share);
      p.sprite.setPosition(x, y - pose.liftPx).setVisible(true);
      p.sprite.setDepth(worldDepth(y + AIR_DEPTH_PX, 'tower', PLATE_TIE + i));
    }
  }

  /** A tile opened: if it is a plate's, the plate leaves the hull (or lies there at once). */
  #open(marker: string, state: PlatformSiteState, atOnce: boolean): void {
    const p = this.#plates.find((q) => q.marker === marker);
    if (p === undefined || p.order >= 0) return;
    let plateOrder = 0;
    for (const q of this.#plates) if (q.order >= 0) plateOrder++;
    p.order = plateOrder;
    p.openTick = state.tick;
    const { sprites } = this.#ctx;
    const name = p.sprite.frame.name;
    const variant = name.slice(name.indexOf('#') + 1, name.lastIndexOf(':'));
    const f = sprites.frame(PLATE_SPRITE, plateFrame(plateOrder), variant);
    p.sprite.setTexture(f.texture, f.frame);
    // It leaves the hull where the jettisoned platform stands (else it lies there at once).
    const hull = jettisoned(state.enemies);
    if (atOnce || hull === null) {
      this.#land(p, false);
      return;
    }
    gridToScreen(hull.x, hull.y, this.#ctx.origin, from);
    p.fromX = from.x;
    p.fromY = from.y;
  }

  /** The plate lies on its tile (with a puff of dust when it came down in sight). */
  #land(p: Plate, dust: boolean): void {
    p.landed = true;
    p.sprite.setPosition(p.x, p.y).setDepth(p.depth).setVisible(true);
    if (dust) this.#fx?.ring(p.col + 0.5, p.row + 0.5, DUST_TILES, 'grime.3', DUST_MS, true);
  }

  /** What shows now: plates on opened tiles (in the air or down), those down, the hangar open. */
  get shown(): { readonly plates: number; readonly landed: number; readonly hangar: string } {
    let plates = 0;
    let landed = 0;
    for (const p of this.#plates) {
      if (p.order >= 0) plates++;
      if (p.landed) landed++;
    }
    const hangar =
      this.#hangar === null
        ? 'none'
        : this.#hangar.frame.name.slice(this.#hangar.frame.name.lastIndexOf(':') + 1);
    return { plates, landed, hangar };
  }

  reset(): void {
    for (const p of this.#plates) p.sprite.stop();
  }
}

/** The jettisoned platform on the field, or null. */
function jettisoned(enemies: Pool<Enemy>): DeepReadonly<Enemy> | null {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.alive && e.jettisoned) return e;
  }
  return null;
}

/** GroundView's hangar prop on tile `at`, or null. */
function hangarProp(
  world: Phaser.GameObjects.Layer,
  tile: GridPos,
  origin: ViewContext['origin'],
): Phaser.GameObjects.Sprite | null {
  gridToScreen(tile[0] + 0.5, tile[1] + 0.5, origin, at);
  for (const obj of world.list) {
    if (!(obj instanceof Phaser.GameObjects.Sprite)) continue;
    if (obj.frame.name.startsWith(`${HANGAR_SPRITE}#`) && obj.x === at.x && obj.y === at.y) {
      return obj;
    }
  }
  return null;
}
