// The rift cracks (T630b; design/maps.md § 4 rift lanes, art-direction §8 *Rift cracks*): each rift
// lane's off-road run drawn as `tile.rift` halves (riftCrack.ts `riftCrackTiles`), in the look its
// status asks for now (`riftStatus(lane, state.wave)`, a function of the wave, so a checkpoint
// replay or a mid-map boot reads the same cracks): a faint old scar while closed, splitting and
// breathing as the wave before it starts (the telegraph, a wave ahead), torn wide and lit as its
// wave starts. At the finale's Dawn the torn rifts go out as Phase 3 begins (M8 R2; riftCrack.ts
// `riftDawnAlpha`): each lit half fades down the stepped ladder over the sun's first steps
// (SongNightView `sunStep`, sim time, so it holds while paused), its glow with it, then closes to its
// old scar. The halves lie in `decal`, over the ground and under everything standing on it, each
// with its seam's `@glow` following its frame (frameGlow.ts). Under reduced motion each half holds
// its look's first frame. Allocation-free per frame: the sprites are made once and re-pointed only
// when a lane's status (or the motion setting) changes.
import type * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { riftStatus, type RiftStatus } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { FrameGlow } from './frameGlow.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { riftCrackLook, riftCrackTiles, riftDawnAlpha } from './riftCrack.ts';
import type { VergeEdge } from '../../content/sprites/tiles/verge.ts';
import type { ViewContext } from './ViewContext.ts';

const RIFT = 'tile.rift' as const;

interface Half {
  readonly edge: VergeEdge;
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
  readonly #status: RiftStatus[] = [];
  /** The lit halves' alpha drawn now (Dawn's fade; 1 before it). */
  #alpha = 1;

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
    for (let i = 0; i < this.#lanes.length; i++) {
      const lane = this.#lanes[i]!; // i < length
      halves += lane.halves.length;
      for (let k = 0; k < lane.halves.length; k++) if (lane.halves[k]!.drawn === 'open') open++;
    }
    return { halves, open };
  }

  /**
   * Each frame: the cracks for the current wave (0: the setup phase), gone out from Dawn's start
   * (`sunStep`: SongNightView's; −1, the default: no Dawn; see the header).
   */
  update(wave: number, sunStep = -1): void {
    const still = this.#reducedMotion();
    const alpha = riftDawnAlpha(sunStep);
    const faded = alpha !== this.#alpha;
    this.#alpha = alpha;
    for (let i = 0; i < this.#lanes.length; i++) {
      const lane = this.#lanes[i]!; // i < length
      const status = riftStatus(lane.route, wave);
      this.#status[i] = status;
      const changed = status !== lane.status || still !== lane.still;
      lane.status = status;
      lane.still = still;
      const look: RiftStatus = alpha <= 0 ? 'closed' : status;
      const halves = lane.halves;
      for (let k = 0; k < halves.length; k++) {
        const h = halves[k]!; // k < length
        if (changed || look !== h.drawn) this.#show(h, look, still);
        if (changed || faded) h.body.setAlpha(look === 'closed' ? 1 : Math.max(alpha, 0));
        h.glow.update();
      }
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
    this.#alpha = 1;
    for (const lane of this.#lanes) {
      lane.status = null;
      for (const h of lane.halves) {
        h.drawn = null;
        h.body.stop().setAlpha(1);
      }
    }
  }
}
