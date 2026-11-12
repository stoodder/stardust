// The rift cracks (T630b; design/maps.md § 4 rift lanes, art-direction §8 *Rift cracks*): each rift
// lane's off-road run drawn as `tile.rift` halves (riftCrack.ts `riftCrackTiles`), in the look its
// status asks for now (`riftStatus(lane, state.wave)`, a function of the wave, so a checkpoint
// replay or a mid-map boot reads the same cracks): a faint old scar while closed, splitting and
// breathing as the wave before it starts (the telegraph, a wave ahead), torn wide and lit as its
// wave starts. At the finale's Dawn (T871) each half closes back to its scar as the sun's front
// (SongNightView `sunStep`, east to west) passes it: the rifts heal with the sunrise. The halves lie in `decal`, over the ground and under everything standing on it, each
// with its seam's `@glow` following its frame (frameGlow.ts). Under reduced motion each half holds
// its look's first frame. Allocation-free per frame: the sprites are made once and re-pointed only
// when a lane's status (or the motion setting) changes.
import type * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { riftStatus, type RiftStatus } from '../../sim/index.ts';
import { isSunlit } from '../vfx/songNightPixels.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { FrameGlow } from './frameGlow.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { riftCrackLook, riftCrackTiles } from './riftCrack.ts';
import type { VergeEdge } from '../../content/sprites/tiles/verge.ts';
import type { ViewContext } from './ViewContext.ts';

const RIFT = 'tile.rift' as const;

interface Half {
  readonly edge: VergeEdge;
  /** Its tile's column (where the Dawn's sun front reaches it). */
  readonly col: number;
  /** The status drawn (null: not yet). */
  drawn: RiftStatus | null;
  readonly body: Phaser.GameObjects.Sprite;
  readonly glow: FrameGlow;
}

interface Lane {
  readonly route: DeepReadonly<CompiledMapDef<IdSpace>['routeList'][number]>;
  readonly halves: readonly Half[];
  /** The status drawn, and whether it was drawn still (reduced motion); null: not yet. */
  status: RiftStatus | null;
  still: boolean;
}

const pos: Vec2 = { x: 0, y: 0 };

export class RiftView {
  readonly #ctx: ViewContext;
  readonly #variant: string;
  readonly #reducedMotion: () => boolean;
  readonly #lanes: Lane[] = [];
  readonly #cols: number;
  readonly #status: RiftStatus[] = [];

  constructor(
    ctx: ViewContext,
    map: DeepReadonly<
      Pick<CompiledMapDef<IdSpace>, 'cols' | 'rows' | 'tiles' | 'routeList' | 'env'>
    >,
    reducedMotion: () => boolean,
  ) {
    this.#ctx = ctx;
    // The crack's colours are master colours (custom legend): one variant reads on every ground.
    this.#variant = DEFAULT_VARIANT;
    this.#reducedMotion = reducedMotion;
    this.#cols = map.cols;
    const { scene, sprites, layers, origin } = ctx;
    for (const route of map.routeList) {
      if (route.kind !== 'rift') continue;
      const halves: Half[] = [];
      for (const tile of riftCrackTiles(map, route)) {
        gridToScreen(tile.col, tile.row, origin, pos);
        for (const edge of tile.edges) {
          const look = riftCrackLook('closed', edge);
          const f = sprites.frame(RIFT, look.frame, this.#variant);
          const a = sprites.frameAnchor(RIFT, look.frame);
          const body = scene.make.sprite({}, false);
          body.setTexture(f.texture, f.frame).setDisplayOrigin(a.x, a.y).setPosition(pos.x, pos.y);
          layers.decal.add(body);
          halves.push({
            edge,
            col: tile.col,
            drawn: null,
            body,
            glow: new FrameGlow(sprites, RIFT, this.#variant, body, layers.decal),
          });
        }
      }
      this.#lanes.push({ route, halves, status: null, still: false });
      this.#status.push('closed');
    }
  }

  /** Each rift lane's status as drawn now (map order), for `__sd.render()`. */
  get rifts(): readonly RiftStatus[] {
    return this.#status;
  }

  /** Crack halves drawn now, and how many of them are drawn open (`__sd.render()`). */
  get shown(): { readonly halves: number; readonly open: number } {
    let halves = 0;
    let open = 0;
    for (const lane of this.#lanes) {
      halves += lane.halves.length;
      for (const h of lane.halves) if (h.drawn === 'open') open++;
    }
    return { halves, open };
  }

  /**
   * Each frame: the cracks for the current wave (0: the setup phase), healed behind the Dawn's
   * sun front at `sunStep` (SongNightView's; −1, the default: no Dawn).
   */
  update(wave: number, sunStep = -1): void {
    const still = this.#reducedMotion();
    for (let i = 0; i < this.#lanes.length; i++) {
      const lane = this.#lanes[i]!; // i < length
      const status = riftStatus(lane.route, wave);
      this.#status[i] = status;
      const changed = status !== lane.status || still !== lane.still;
      if (changed || sunStep >= 0) {
        lane.status = status;
        lane.still = still;
        for (const h of lane.halves) {
          const look =
            sunStep >= 0 && isSunlit(h.col + 0.5, this.#cols, sunStep) ? 'closed' : status;
          if (changed || look !== h.drawn) this.#show(h, look, still);
        }
      }
      for (const h of lane.halves) h.glow.update();
    }
  }

  #show(h: Half, status: RiftStatus, still: boolean): void {
    h.drawn = status;
    const { sprites } = this.#ctx;
    const look = riftCrackLook(status, h.edge);
    const f = sprites.frame(RIFT, look.frame, this.#variant);
    h.body.stop().setTexture(f.texture, f.frame);
    if (look.anim !== null && !still) h.body.play(sprites.anim(RIFT, look.anim, this.#variant));
  }

  reset(): void {
    for (const lane of this.#lanes) {
      lane.status = null;
      for (const h of lane.halves) {
        h.drawn = null;
        h.body.stop();
      }
    }
  }
}
