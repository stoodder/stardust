// Props on cues (T312b; art-direction §8, *Blocked / decor*): a map marker named in `CUE_DECOR`
// leaves its tile bare until the story brings the prop on, then it lands there. Zibzab's shell-shop
// arrives with his W6 scene on A1M3: it drops in from 4 px up (1 px every 2 frames, like a new
// tower) inside a `steel.4` dust ring, and stands there for the rest of the map, playing its first
// anim. The sim knows nothing of it: the countdown that plays the cue scene is the signal
// (`reveal`, from CountdownStarted, and from WaveStarted in case a countdown was skipped). Like the
// core (D028), a landed prop that would hide a tower on a tile behind it draws at 60%: A1M3's shop
// stands right in front of the (11,7) pad.
import * as Phaser from 'phaser';
import type { GridPos, MarkerId } from '../../content/types.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { BUILD_PUFF_MS, BUILD_PUFF_TILES } from '../vfx/fxTiming.ts';
import { OCCLUDING_ALPHA } from './CoreView.ts';
import { CUE_DECOR, propVariant, tilesBehind, type CueDecor } from './groundTiles.ts';
import { firstLook } from './spriteInfo.ts';
import type { TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The drop: from this far up (px), 1 px every DROP_STEP_MS. */
const DROP_PX = 4;
const DROP_STEP_MS = 33;
/** Props sort among themselves by a per-tile id (GroundView's `propTieBreak`). */
const TIE_MASK = 0xff;

interface CueProp {
  readonly cue: CueDecor;
  readonly col: number;
  readonly row: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly y: number;
  /** Tiles whose tower its sprite would hide (tilesBehind). */
  readonly behind: readonly number[];
  /** ms since it landed (−1: not yet). */
  ms: number;
}

const pos: Vec2 = { x: 0, y: 0 };

export class CuePropView {
  readonly #fx: TransientFx;
  readonly #props: CueProp[] = [];

  /** The cue props on a map's `markers`, hidden until their cue; `env` picks their palette. */
  constructor(
    ctx: ViewContext,
    grid: {
      readonly cols: number;
      readonly tiles: readonly unknown[];
      readonly markers: Readonly<Record<MarkerId, GridPos>>;
    },
    env: string,
    fx: TransientFx,
  ) {
    const { cols, markers } = grid;
    this.#fx = fx;
    const { scene, sprites, layers, origin } = ctx;
    for (const [id, [col, row]] of Object.entries(markers)) {
      if (!Object.hasOwn(CUE_DECOR, id)) continue;
      const cue = CUE_DECOR[id]!; // checked just above
      const look = firstLook(cue.sprite);
      const variant = propVariant(cue.sprite, env);
      const f = sprites.frame(cue.sprite, look.frame, variant);
      const a = sprites.frameAnchor(cue.sprite, look.frame);
      gridToScreen(col + 0.5, row + 0.5, origin, pos);
      const sprite = new Phaser.GameObjects.Sprite(scene, pos.x, pos.y, f.texture, f.frame)
        .setDisplayOrigin(a.x, a.y)
        .setDepth(worldDepth(pos.y, 'prop', (row * cols + col) & TIE_MASK))
        .setVisible(false);
      if (look.anim !== null) sprite.play(sprites.anim(cue.sprite, look.anim, variant));
      layers.world.add(sprite);
      const behind = tilesBehind(grid, col, row, a.y);
      this.#props.push({ cue, col, row, sprite, y: pos.y, behind, ms: -1 });
    }
  }

  /** How many cue props stand on the map (the smoke flow's check). */
  get shown(): number {
    let n = 0;
    for (const p of this.#props) if (p.ms >= 0) n++;
    return n;
  }

  /** Wave `wave`'s countdown (or start) arrived: every prop cued by then lands. */
  reveal(wave: number): void {
    for (const p of this.#props) {
      if (p.ms >= 0 || wave < p.cue.wave) continue;
      p.ms = 0;
      p.sprite.setPosition(p.sprite.x, p.y - DROP_PX).setVisible(true);
      this.#fx.ring(p.col + 0.5, p.row + 0.5, BUILD_PUFF_TILES, 'steel.4', BUILD_PUFF_MS, true);
    }
  }

  /** One frame: the drop, and the fade over a tower behind. `towerAtTile`: the sim's tile map. */
  update(dt: number, towerAtTile: readonly number[]): void {
    for (const p of this.#props) {
      if (p.ms < 0) continue;
      if (p.ms <= DROP_PX * DROP_STEP_MS) {
        p.ms += dt;
        const lift = Math.max(0, DROP_PX - Math.floor(p.ms / DROP_STEP_MS));
        p.sprite.setY(p.y - lift);
      }
      let hides = false;
      for (const i of p.behind) if ((towerAtTile[i] ?? -1) >= 0) hides = true;
      const alpha = hides ? OCCLUDING_ALPHA : 1;
      if (p.sprite.alpha !== alpha) p.sprite.setAlpha(alpha);
    }
  }
}
