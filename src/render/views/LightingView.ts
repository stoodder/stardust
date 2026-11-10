// The lighting overlay's tint path (art-direction.md §7; vfx/lighting.ts; T410a): on a map with a
// lighting schedule (MapDef.lighting, A2M3's gold-to-dusk), the sky behind the map (the
// `backdrop` layer) and a multiply grade over the world follow the schedule as each wave starts,
// easing over LIGHT_FADE_TICKS sim ticks (holding while paused; stepped under reduced motion).
// **Dusk dims the world, not the actors** (D134, D135): the grade is a multiply rectangle over the
// `ground` layer (kept the last thing in it but for the night's own ground image: a salvaged tile
// drawn later is put under them, `relight`) and the same color as a tint on every piece of
// scenery in `world` (scenery.ts: high ground, decor and wreckage props, assets, cue props, the
// Peeker's rock; Images and Sprites alike); units, allies, towers, Pebble's lift, air, projectiles
// and effects above it keep their faction palettes. Sundown's darkness (DarknessView, T530b) darkens
// the scenery further through `night`: this view owns the scenery's tint, so the two never fight.
// Cosmetic: the sim never reads it. On a map without a schedule it draws nothing. Allocation-free
// per frame: it only recolors when the shown position moves (or `relight` or `night` asks), and a
// crossfade's mix and grade are written in place (T501k).
import * as Phaser from 'phaser';
import { ENV_PALETTE_IDS } from '../../content/palettes/env.ts';
import type { EnvPaletteId, LightingKeyDef } from '../../content/types.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import {
  gradeNumberAt,
  lightAt,
  lightMix,
  lightStops,
  skyImage,
  stopGrades,
  type LightMix,
  type LightStop,
} from '../vfx/lighting.ts';
import type { LightingLook } from './renderState.ts';
import { isScenery } from './scenery.ts';
import type { ViewContext } from './ViewContext.ts';

/** The grade and the sky overhang the view by this much, so the camera shake never shows an edge. */
const OVERHANG_PX = 8;

const skyKey = (env: EnvPaletteId): string => `lighting.sky.${env}`;

/**
 * Sundown's say in the scenery's tint (DarknessView): the tint a piece of scenery wears under
 * `grade` (white for none), given where it stands.
 */
export interface NightTint {
  tintFor(obj: object, grade: number): number;
}

export class LightingView {
  readonly #stops: readonly LightStop[];
  readonly #grades: readonly number[];
  readonly #mix: LightMix = { stop: 0, from: 'act1', to: 'act1', t: 0 };
  readonly #reducedMotion: () => boolean;
  readonly #world: Phaser.GameObjects.Layer;
  readonly #ground: Phaser.GameObjects.Layer;
  readonly #grade: Phaser.GameObjects.Rectangle | null = null;
  /** One sky image per stop, in stop order (so a later stop draws over an earlier one). */
  readonly #skies: Phaser.GameObjects.Image[] = [];
  /** Ground images that stay over the grade (the night's), in order. */
  readonly #overGround: Phaser.GameObjects.GameObject[] = [];
  /** The position drawn (NaN: nothing drawn yet). */
  #shown = Number.NaN;
  /** The grade's color now (white: none). */
  #color = WHITE;
  #night: NightTint | null = null;

  constructor(
    ctx: ViewContext,
    map: { readonly env: string; readonly lighting: readonly LightingKeyDef[] },
    reducedMotion: () => boolean,
  ) {
    const base = ENV_PALETTE_IDS.find((id) => id === map.env);
    this.#stops =
      map.lighting.length === 0 || base === undefined ? [] : lightStops(base, map.lighting);
    this.#grades = base === undefined ? [] : stopGrades(base, this.#stops);
    this.#reducedMotion = reducedMotion;
    const { scene, layers } = ctx;
    this.#ground = layers.ground;
    this.#world = layers.world;
    if (this.#stops.length === 0) return;
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
    // Over the ground (built before this view, never added to after), under everything else.
    layers.ground.add(this.#grade);
  }

  /** The position drawn along the schedule's stops (0 = the map's env), for tests and hooks. */
  get shown(): number {
    return Number.isNaN(this.#shown) ? 0 : this.#shown;
  }

  /** The grade's color now (0xRRGGBB; white when none shows). */
  get grade(): number {
    return this.#color;
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
    const mix = lightMix(this.#stops, pos, this.#mix);
    const color = gradeNumberAt(this.#grades, mix);
    this.#color = color;
    grade.setFillStyle(color).setVisible(color !== WHITE);
    this.#tintScenery();
    // The stop the light leaves shows fully; the one it nears draws over it, by how near.
    const skies = this.#skies;
    for (let k = 0; k < skies.length; k++) {
      const img = skies[k]!; // k < length
      if (k === mix.stop) img.setVisible(true).setAlpha(1);
      else if (k === mix.stop + 1) img.setVisible(mix.t > 0).setAlpha(mix.t);
      else img.setVisible(false);
    }
  }

  /** The scenery standing on the ground takes the grade (a multiply tint), and the night's say. */
  #tintScenery(): void {
    const color = this.#color;
    const night = this.#night;
    const list = this.#world.list;
    // Phaser 4's Sprite isn't an Image, so test for the tint itself.
    for (let i = 0; i < list.length; i++) {
      const obj = list[i]!; // i < length
      if (!isScenery(obj) || !tintable(obj)) continue;
      const tint = night === null ? color : night.tintFor(obj, color);
      if (tint === WHITE) {
        if (obj.tintTopLeft !== WHITE) obj.clearTint();
      } else if (obj.tintTopLeft !== tint) obj.setTint(tint);
    }
  }

  /**
   * Sundown's darkness takes its say in the scenery's tint (null hands it back), and the scenery
   * is retinted now. DarknessView calls it when the dark's tone or its lit discs change.
   */
  night(night: NightTint | null): void {
    this.#night = night;
    this.#tintScenery();
  }

  /** Adds `obj` to the ground layer, kept over the grade (the night's ground image). */
  overGround(obj: Phaser.GameObjects.GameObject): void {
    this.#ground.add(obj);
    this.#overGround.push(obj);
  }

  /**
   * Something was drawn after the grade (WreckageView's salvaged tile: its ground under the grade's
   * layer end, its block or prop new scenery): puts the grade (and the night's ground image) back
   * on top of the ground and retints the scenery on the next update.
   */
  relight(): void {
    const grade = this.#grade;
    if (grade !== null) this.#ground.bringToTop(grade);
    for (const obj of this.#overGround) this.#ground.bringToTop(obj);
    this.#shown = Number.NaN;
    if (grade === null) this.#tintScenery();
  }

  /** What the grade and the scenery show now (the smoke hooks' view of the light). */
  look(): LightingLook {
    let scenery = 0;
    let tinted = 0;
    let sprites = 0;
    for (const obj of this.#world.list) {
      if (!isScenery(obj) || !tintable(obj)) continue;
      scenery++;
      if (obj.tintTopLeft === WHITE) continue;
      tinted++;
      if (obj instanceof Phaser.GameObjects.Sprite) sprites++;
    }
    const grade = this.#grade;
    const graded = grade?.visible === true;
    const list = this.#ground.list;
    const below = list.length - 1 - this.#overGround.length;
    return {
      grade: graded ? grade.fillColor : WHITE,
      gradeOnTop: grade === null || list[below] === grade,
      scenery,
      tinted,
      tintedSprites: sprites,
    };
  }

  reset(): void {
    this.#shown = Number.NaN;
  }
}

const WHITE = 0xffffff;

/** A game object the grade can tint (Images and Sprites; Phaser 4's Sprite isn't an Image). */
function tintable(obj: object): obj is Phaser.GameObjects.Components.Tint {
  return 'setTint' in obj && 'clearTint' in obj && 'tintTopLeft' in obj;
}
