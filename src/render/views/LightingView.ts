// The lighting overlay's tint path (art-direction.md §7; vfx/lighting.ts; T410a): on a map with a
// lighting schedule (MapDef.lighting, A2M3's gold-to-dusk), the sky behind the map (the
// `backdrop` layer) and a multiply grade over the playfield (the `lighting` layer: over the
// actors, under the overlay's bars and tells, so it never hides gameplay information) follow the
// schedule as each wave starts, easing over LIGHT_FADE_TICKS sim ticks (holding while paused;
// stepped under reduced motion). Cosmetic: the sim never reads it. On a map without a schedule it
// draws nothing. Allocation-free per frame: it only recolors when the shown position moves.
import * as Phaser from 'phaser';
import { ENV_PALETTE_IDS } from '../../content/palettes/env.ts';
import type { EnvPaletteId, LightingKeyDef } from '../../content/types.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import {
  gradeAt,
  lightAt,
  lightMix,
  lightStops,
  rgbNumber,
  skyImage,
  type LightStop,
} from '../vfx/lighting.ts';
import type { ViewContext } from './ViewContext.ts';

/** The grade and the sky overhang the view by this much, so the camera shake never shows an edge. */
const OVERHANG_PX = 8;

const skyKey = (env: EnvPaletteId): string => `lighting.sky.${env}`;

export class LightingView {
  readonly #base: EnvPaletteId;
  readonly #stops: readonly LightStop[];
  readonly #reducedMotion: () => boolean;
  readonly #grade: Phaser.GameObjects.Rectangle | null = null;
  /** One sky image per stop, in stop order (so a later stop draws over an earlier one). */
  readonly #skies: Phaser.GameObjects.Image[] = [];
  /** The position drawn (NaN: nothing drawn yet). */
  #shown = Number.NaN;

  constructor(
    ctx: ViewContext,
    map: { readonly env: string; readonly lighting: readonly LightingKeyDef[] },
    reducedMotion: () => boolean,
  ) {
    const base = ENV_PALETTE_IDS.find((id) => id === map.env);
    this.#base = base ?? 'act1';
    this.#stops =
      map.lighting.length === 0 || base === undefined ? [] : lightStops(base, map.lighting);
    this.#reducedMotion = reducedMotion;
    if (this.#stops.length === 0) return;
    const { scene, layers } = ctx;
    const w = VIEW_W + 2 * OVERHANG_PX;
    const h = VIEW_H + 2 * OVERHANG_PX;
    for (const { env } of this.#stops) {
      const key = skyKey(env);
      if (!scene.textures.exists(key)) {
        scene.textures.addCanvas(key, imageToCanvas(skyImage(env, w, h)));
      }
      const img = new Phaser.GameObjects.Image(scene, -OVERHANG_PX, -OVERHANG_PX, key);
      img.setOrigin(0, 0).setVisible(false);
      layers.backdrop.add(img);
      this.#skies.push(img);
    }
    this.#grade = new Phaser.GameObjects.Rectangle(
      scene,
      -OVERHANG_PX,
      -OVERHANG_PX,
      w,
      h,
      0xffffff,
    );
    this.#grade.setOrigin(0, 0).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);
    layers.lighting.add(this.#grade);
  }

  /** The position drawn along the schedule's stops (0 = the map's env), for tests and hooks. */
  get shown(): number {
    return Number.isNaN(this.#shown) ? 0 : this.#shown;
  }

  /**
   * Follows the schedule from sim state: `wave` is the last wave started (0 before wave 1),
   * `startTick` each wave's start tick (WaveSchedule.startTick), `tick` the sim's.
   */
  update(wave: number, startTick: readonly number[], tick: number): void {
    if (this.#grade === null) return;
    const started = wave > 0 ? (startTick[wave - 1] ?? tick) : tick;
    const pos = lightAt(this.#stops, wave, started, tick, this.#reducedMotion());
    if (pos === this.#shown) return;
    this.#shown = pos;
    this.#draw(pos);
  }

  #draw(pos: number): void {
    const grade = this.#grade;
    if (grade === null) return;
    const c = gradeAt(this.#base, this.#stops, pos);
    grade.setFillStyle(rgbNumber(c)).setVisible(c.r !== 255 || c.g !== 255 || c.b !== 255);
    // The stop the light leaves shows fully; the one it nears draws over it, by how near.
    const { stop, t } = lightMix(this.#stops, pos);
    for (const [k, img] of this.#skies.entries()) {
      if (k === stop) img.setVisible(true).setAlpha(1);
      else if (k === stop + 1) img.setVisible(t > 0).setAlpha(t);
      else img.setVisible(false);
    }
  }

  reset(): void {
    this.#shown = Number.NaN;
  }
}
