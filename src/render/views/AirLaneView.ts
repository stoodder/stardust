// Air lanes (art-direction §8 Tile readability; design/maps.md §4; T312a): each air route is a
// dotted line of 1 px dashes in the `decal` layer, drifting toward the core (the pure
// `vfx/airLanePixels.ts`, baked once per lane as a 5-frame anim; still under reduced motion). A
// lane shows while a flyer on it is in the current or next wave (so it's up from the setup phase
// when wave 1 brings flyers), and while the armed tower hits air, so the player sees where the
// flyers will come while placing a Skyhook. Allocation-free per frame.
import type * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { airLaneImage, LANE_DASH_PERIOD } from '../vfx/airLanePixels.ts';
import type { ViewContext } from './ViewContext.ts';

/** The drift: one pixel along the lane per frame at this rate (slow; art-direction §8). */
const LANE_FPS = 5;

interface Lane {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly anim: string;
  /** By wave number (1-based; index 0 unused): whether a group of that wave flies this lane. */
  readonly inWave: readonly boolean[];
  shown: boolean;
}

export class AirLaneView {
  readonly #lanes: Lane[] = [];
  readonly #reducedMotion: () => boolean;
  #still = false;

  constructor(ctx: ViewContext, map: CompiledMapDef<IdSpace>, reducedMotion: () => boolean) {
    this.#reducedMotion = reducedMotion;
    const { scene, layers } = ctx;
    for (const route of Object.values(map.routes)) {
      if (route.kind !== 'air') continue;
      const points: Vec2[] = route.xs.map((x, i) => {
        const p = { x: 0, y: 0 };
        gridToScreen(x, route.ys[i] ?? 0, ctx.origin, p);
        return p;
      });
      const key = `fx.airlane.${map.id}.${route.id}`;
      const frames: { key: string }[] = [];
      let x = 0;
      let y = 0;
      for (let phase = 0; phase < LANE_DASH_PERIOD; phase++) {
        const lane = airLaneImage(points, phase);
        const fk = `${key}.${phase}`;
        if (lane.image.w > 0 && !scene.textures.exists(fk)) {
          scene.textures.addCanvas(fk, imageToCanvas(lane.image));
        }
        frames.push({ key: fk });
        x = lane.x;
        y = lane.y;
      }
      if (!scene.textures.exists(`${key}.0`)) continue; // a lane with no length draws nothing
      if (!scene.anims.exists(key)) {
        scene.anims.create({ key, frames, frameRate: LANE_FPS, repeat: -1 });
      }
      const sprite = scene.make.sprite({}, false);
      sprite.setTexture(`${key}.0`).setOrigin(0, 0).setPosition(x, y).setVisible(false);
      layers.decal.add(sprite);
      const inWave = map.waves.map(() => false);
      inWave.unshift(false);
      for (const w of map.waves) {
        if (w.groups.some((g) => g.route.id === route.id)) inWave[w.number] = true;
      }
      this.#lanes.push({ sprite, anim: key, inWave, shown: false });
    }
  }

  /**
   * Shows each lane while a flyer on it is in wave `wave` (the current one; 0 in setup) or the
   * next, or while `armedHitsAir`.
   */
  update(wave: number, armedHitsAir: boolean): void {
    const still = this.#reducedMotion();
    const restyle = still !== this.#still;
    this.#still = still;
    for (const l of this.#lanes) {
      const show = armedHitsAir || l.inWave[wave] === true || l.inWave[wave + 1] === true;
      if (show === l.shown && !restyle) continue;
      l.shown = show;
      if (!show) {
        l.sprite.stop().setVisible(false);
      } else if (still) {
        l.sprite.stop().setTexture(`${l.anim}.0`).setVisible(true);
      } else {
        l.sprite.setVisible(true).play(l.anim, true);
      }
    }
  }
}
