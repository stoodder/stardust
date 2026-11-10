// Wreckage tiles and their queue (design/maps.md § 3, the clearing rules; D076; T312a). GroundView
// draws each wreckage tile's `prop.wreckage` wreck once; this view keeps it in step with the
// salvage drone's queue, read from sim state every frame (so a missed event can't desync it):
// - **Untouched:** the wreck (`v0` or `v1`, by tile), its beacon winking slowly (`idle_v<n>`: lit a
//   quarter second in every two, each tile out of step; still under reduced motion).
// - **Queued:** the salvage stake's beacon blinks (`blink_v<n>`, 2 fps) and the tile carries its
//   place in the drone's line (the tile being cleared counts as 1) as a `teal.4` number in the
//   3×5 font (overlay); a `teal.4` ring grows from any tile the moment it joins the queue, so a
//   click's effect shows at once.
// - **Being cleared** (the queue's head): the beacon lit (`v<n>_lit`), then half cleared
//   (`v<n>_half`) for the second half of the drone's work; DroneView draws the drone.
// - **Cleared:** the wreck goes, and the tile's live tile (its `underWreckage`: a pad, high ground,
//   a hidden power node) is drawn in its place, once; then `onRedraw` (BattleScene: the lighting
//   view's `relight`) puts the dusk grade back over it and tints its new scenery (D135).
// Allocation-free per frame: every marker is made up front (one per wreckage tile), and the queue
// is compared against the last frame's copy.
import type * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { liveTileAt, type WreckageView as DroneQueue } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { prefersReducedMotion } from '../motion.ts';
import { DRONE_FLY_FRAC } from '../vfx/droneFlight.ts';
import { floatTextTexture } from '../vfx/overlayTextures.ts';
import { drawCell } from './GroundView.ts';
import { dressTile, propVariant, wreckageFrame, type GroundGrid } from './groundTiles.ts';
import type { TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The wreck's sprite (T311b) and its frames: v<n>, v<n>_lit, v<n>_half, anim blink_v<n>. */
export const WRECKAGE_SPRITE = 'prop.wreckage' as const;
/** Frames in the idle wink anim (`idle_v<n>`). */
const IDLE_FRAMES = 8;
/** A tile joining the queue: a ring grows from it. */
const QUEUE_RING_TILES = 0.75;
const QUEUE_RING_MS = 300;
/** The queue number sits this far above the tile's center (px), over the wreck. */
const MARKER_LIFT_PX = 18;
/** The queue number's color (the drone's teal; never the tile cursor's gold). */
const MARKER_COLOR = 'teal.4' as const;
/** Queue places drawn as numbers (a longer line shows 9 for the rest). */
const MAX_MARKER = 9;

/** Where a wreckage tile stands, as last drawn. */
const Shown = { Wreck: 0, Queued: 1, Lit: 2, Half: 3, Cleared: 4 } as const;
type Shown = (typeof Shown)[keyof typeof Shown];

interface WreckTile {
  readonly index: number;
  readonly col: number;
  readonly row: number;
  /** v0 or v1: which wreck lies here. */
  readonly look: string;
  readonly prop: Phaser.GameObjects.Sprite | null;
  readonly marker: Phaser.GameObjects.Image;
  shown: Shown;
  /** The queue place the marker shows (0: none). */
  place: number;
}

const pos: Vec2 = { x: 0, y: 0 };

export class WreckageView {
  readonly #ctx: ViewContext;
  readonly #map: CompiledMapDef<IdSpace>;
  readonly #fx: TransientFx;
  readonly #onRedraw: () => void;
  readonly #tiles: WreckTile[] = [];

  /**
   * `props`: GroundView's wreck sprites by tile index (drawGround's `wreckage`). `fx` grows the
   * ring when a tile joins the queue. `onRedraw` runs after a cleared tile is drawn.
   */
  constructor(
    ctx: ViewContext,
    map: CompiledMapDef<IdSpace>,
    props: ReadonlyMap<number, Phaser.GameObjects.Sprite>,
    fx: TransientFx,
    onRedraw: () => void = () => {},
  ) {
    this.#ctx = ctx;
    this.#map = map;
    this.#fx = fx;
    this.#onRedraw = onRedraw;
    map.tiles.forEach((t, index) => {
      if (t !== 'x') return;
      const col = index % map.cols;
      const row = (index - col) / map.cols;
      const marker = ctx.scene.make.image({}, false).setOrigin(0.5, 1).setVisible(false);
      ctx.layers.overlay.add(marker);
      gridToScreen(col + 0.5, row + 0.5, ctx.origin, pos);
      marker.setPosition(Math.round(pos.x), Math.round(pos.y - MARKER_LIFT_PX));
      this.#tiles.push({
        index,
        col,
        row,
        look: wreckageFrame(col, row, map.env, map.markers),
        prop: props.get(index) ?? null,
        marker,
        shown: Shown.Wreck,
        place: 0,
      });
    });
    for (const w of this.#tiles) this.#look(w);
  }

  /**
   * Draws every wreckage tile as the drone's queue stands (`state.wreckage`: its queue, the head's
   * progress, and the cleared tiles), with `clearTicks` per tile.
   */
  update(drone: DroneQueue & { readonly progressTicks: number }, clearTicks: number): void {
    const fly = clearTicks * DRONE_FLY_FRAC;
    const half = progressHalf(drone.progressTicks, fly, clearTicks);
    for (const w of this.#tiles) {
      if (w.shown === Shown.Cleared) continue;
      if (drone.cleared.includes(w.index)) {
        this.#clear(w);
        continue;
      }
      const at = drone.queue.indexOf(w.index);
      const next: Shown =
        at < 0 ? Shown.Wreck : at > 0 ? Shown.Queued : half ? Shown.Half : Shown.Lit;
      // Waiting tiles show their place in line (the head counts as 1); the head itself has the
      // drone over it, so it shows none.
      this.#mark(w, at <= 0 ? 0 : at + 1);
      if (next === w.shown) continue;
      if (w.shown === Shown.Wreck && next !== Shown.Wreck) {
        // A click's feedback: the tile answers the moment it joins the drone's line.
        this.#fx.ring(w.col + 0.5, w.row + 0.5, QUEUE_RING_TILES, 'teal.4', QUEUE_RING_MS, true);
      }
      w.shown = next;
      this.#look(w);
    }
  }

  /** Hides the markers (the scene is shutting down). */
  reset(): void {
    for (const w of this.#tiles) {
      w.marker.setVisible(false);
      w.place = 0;
    }
  }

  /** Shows the queue place `place` (1-based; 0 hides it) on tile `w`. */
  #mark(w: WreckTile, place: number): void {
    if (place === w.place) return;
    w.place = place;
    if (place === 0) {
      w.marker.setVisible(false);
      return;
    }
    const text = String(Math.min(place, MAX_MARKER));
    w.marker.setTexture(floatTextTexture(this.#ctx.scene, text, MARKER_COLOR)).setVisible(true);
  }

  #look(w: WreckTile): void {
    const p = w.prop;
    if (p === null) return;
    const { sprites } = this.#ctx;
    const variant = propVariant(WRECKAGE_SPRITE, this.#map.env);
    if (w.shown === Shown.Queued) {
      p.play(sprites.anim(WRECKAGE_SPRITE, `blink_${w.look}`, variant), true);
      return;
    }
    if (w.shown === Shown.Wreck && !prefersReducedMotion()) {
      // The slow idle wink, each tile from its own frame so a field of wrecks never winks at once.
      p.play({
        key: sprites.anim(WRECKAGE_SPRITE, `idle_${w.look}`, variant),
        startFrame: (w.col * 3 + w.row * 5) % IDLE_FRAMES,
      });
      return;
    }
    p.stop();
    const frame =
      w.shown === Shown.Lit ? `${w.look}_lit` : w.shown === Shown.Half ? `${w.look}_half` : w.look;
    const f = sprites.frame(WRECKAGE_SPRITE, frame, variant);
    p.setTexture(f.texture, f.frame);
  }

  /** The drone cleared tile `w`: the wreck goes and its live tile is drawn in its place. */
  #clear(w: WreckTile): void {
    w.shown = Shown.Cleared;
    this.#mark(w, 0);
    w.prop?.stop().setVisible(false);
    const map = this.#map;
    const live = liveTileAt(map, { queue: [], cleared: [w.index] }, w.index);
    const tiles = map.tiles.slice();
    tiles[w.index] = live;
    // The map's terraces too, so a cleared tile at a terrace's foot keeps its cliff face (T312b).
    const grid: GroundGrid = { cols: map.cols, rows: map.rows, tiles, terraces: map.terraces };
    drawCell(this.#ctx, map.env, w.col, w.row, dressTile(grid, w.col, w.row), w.index);
    this.#onRedraw();
  }
}

/** Whether the head's clearing is in its second half of work (after the flight in). */
function progressHalf(progress: number, fly: number, total: number): boolean {
  return progress >= fly + (total - fly) / 2;
}
