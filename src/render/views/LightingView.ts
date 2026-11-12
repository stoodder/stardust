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
// T806: a **sky-only** key (`skyOnly`, the finale's sky warming per wave) moves the sky alone; the
// grade follows the keys that aren't, so it holds. T831: a run of sky-only keys toward another
// env raises that env's sky from the east edge a step per key (`skyStops`, `eastSkyImage`: the
// finale's horizon warming over Phase 1), and Dawn's set crossfades to its whole sky. A **lighting set** a map script turns to
// (`setLighting`, content/lightingSets.ts: Dawn) is a last stop of both, reached from the tick
// it ran (`state.lightingKey`, `state.lightingTick`) over the set's turn, from wherever the
// schedule stood (stepped under reduced motion). A map whose script sets one draws even without a
// schedule; its own env's sky stays void until the set's fades in.
import * as Phaser from 'phaser';
import { LIGHTING_SETS, lightingSetProgress, lightingSetsOf } from '../../content/lightingSets.ts';
import { ENV_PALETTE_IDS } from '../../content/palettes/env.ts';
import type { EnvPaletteId } from '../../content/types.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import {
  eastSkyImage,
  gradeNumberAt,
  lightAt,
  lightMix,
  skyImage,
  skyStops,
  stopGrades,
  worldStops,
  type LightMix,
  type LightStop,
} from '../vfx/lighting.ts';
import type { LightingLook } from './renderState.ts';
import { isLongNight } from '../vfx/nightGlow.ts';
import { isScenery } from './scenery.ts';
import type { ViewContext } from './ViewContext.ts';

/** The grade and the sky overhang the view by this much, so the camera shake never shows an edge. */
const OVERHANG_PX = 8;

/** A stop's sky texture: its env's, or (a sky-only stop) its env risen from the east (T831). */
const skyKey = (stop: LightStop): string =>
  stop.east === undefined
    ? `lighting.sky.${stop.env}`
    : `lighting.sky.${stop.env}.east${Math.round(stop.east * 1000)}`;

/**
 * Sundown's say in the scenery's tint (DarknessView): the tint a piece of scenery wears under
 * `grade` (white for none), given where it stands.
 */
export interface NightTint {
  tintFor(obj: object, grade: number): number;
}

/** A schedule key as the view reads it (MapDef.lighting's, or its compiled form). */
interface ViewLightingKey {
  readonly wave: number;
  readonly env: EnvPaletteId;
  readonly skyOnly?: boolean;
}

/** A lighting set's stop: past every wave, so the schedule never reaches it on its own. */
const SET_WAVE = Number.POSITIVE_INFINITY;

export class LightingView {
  /** The sky's stops: the map's env, every key, then each lighting set the script turns to. */
  readonly #stops: readonly LightStop[];
  /** The grade's stops: the same without the sky-only keys (T806). */
  readonly #worldStops: readonly LightStop[];
  readonly #grades: readonly number[];
  /** The lighting sets' keys, in stop order (their stops end both lists). */
  readonly #sets: readonly string[];
  /** No schedule: the map's own env has no sky of its own to show (only a set's fades in). */
  readonly #voidBase: boolean;
  readonly #mix: LightMix = { stop: 0, from: 'act1', to: 'act1', t: 0 };
  readonly #worldMix: LightMix = { stop: 0, from: 'act1', to: 'act1', t: 0 };
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
  /** The grade's position drawn along the world stops. */
  #shownWorld = Number.NaN;
  /** The grade's color now (white: none). */
  #color = WHITE;
  #night: NightTint | null = null;

  constructor(
    ctx: ViewContext,
    map: {
      readonly env: string;
      readonly lighting: readonly ViewLightingKey[];
      readonly events?: readonly { readonly actions: readonly object[] }[];
    },
    reducedMotion: () => boolean,
  ) {
    const base = ENV_PALETTE_IDS.find((id) => id === map.env);
    const sets = map.events === undefined ? [] : lightingSetsOf({ events: map.events });
    const setStops = sets.map((k) => ({ wave: SET_WAVE, env: LIGHTING_SETS[k]!.env })); // a set
    const draws = base !== undefined && (map.lighting.length > 0 || sets.length > 0);
    this.#sets = sets;
    this.#voidBase = map.lighting.length === 0;
    this.#stops = draws ? [...skyStops(base, map.lighting), ...setStops] : [];
    this.#worldStops = draws ? [...worldStops(base, map.lighting), ...setStops] : [];
    this.#grades = base === undefined ? [] : stopGrades(base, this.#worldStops);
    this.#reducedMotion = reducedMotion;
    const { scene, layers } = ctx;
    this.#ground = layers.ground;
    this.#world = layers.world;
    if (this.#stops.length === 0) return;
    const w = VIEW_W + 2 * OVERHANG_PX;
    const h = VIEW_H + 2 * OVERHANG_PX;
    // In the Long Night (the finale) WorldGlowView hangs the moons; the skies leave them out.
    const moons = !isLongNight(map.env);
    for (const stop of this.#stops) {
      const key = skyKey(stop) + (moons ? '' : '.moonless');
      if (!scene.textures.exists(key)) {
        const img =
          stop.east === undefined
            ? skyImage(stop.env, w, h, moons)
            : eastSkyImage(base!, stop.env, stop.east, w, h, moons); // draws: base set
        scene.textures.addCanvas(key, imageToCanvas(img));
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

  /** The grade's position drawn along the world stops (the sky-only keys left out; T806). */
  get shownWorld(): number {
    return Number.isNaN(this.#shownWorld) ? 0 : this.#shownWorld;
  }

  /**
   * Follows the schedule from sim state: `wave` is the last wave started (0 before wave 1),
   * `startTick` each wave's start tick (WaveSchedule.startTick), `tick` the sim's; and a script's
   * lighting set (`state.lightingKey`, set on `state.lightingTick`; T806).
   */
  update(
    wave: number,
    startTick: readonly number[],
    tick: number,
    lightingKey: string | null = null,
    lightingTick = 0,
  ): void {
    if (this.#grade === null) return;
    const started = wave > 0 ? (startTick[wave - 1] ?? tick) : tick;
    const reduced = this.#reducedMotion();
    let pos = lightAt(this.#stops, wave, started, tick, reduced);
    let world = lightAt(this.#worldStops, wave, started, tick, reduced);
    const set = lightingKey === null ? -1 : this.#sets.indexOf(lightingKey);
    if (set >= 0) {
      const t = reduced ? 1 : lightingSetProgress(lightingKey, lightingTick, tick);
      const skyAt = this.#stops.length - this.#sets.length + set;
      const worldAt = this.#worldStops.length - this.#sets.length + set;
      pos += (skyAt - pos) * t;
      world += (worldAt - world) * t;
    }
    if (pos === this.#shown && world === this.#shownWorld) return;
    this.#shown = pos;
    this.#shownWorld = world;
    this.#draw(pos, world);
  }

  #draw(pos: number, world: number): void {
    const grade = this.#grade;
    if (grade === null) return;
    const mix = lightMix(this.#stops, pos, this.#mix);
    const color = gradeNumberAt(this.#grades, lightMix(this.#worldStops, world, this.#worldMix));
    this.#color = color;
    grade.setFillStyle(color).setVisible(color !== WHITE);
    this.#tintScenery();
    // The stop the light leaves shows fully; the one it nears draws over it, by how near.
    const skies = this.#skies;
    for (let k = 0; k < skies.length; k++) {
      const img = skies[k]!; // k < length
      const own = !(k === 0 && this.#voidBase); // no schedule: the map's env has no sky shown
      if (own && k === mix.stop) img.setVisible(true).setAlpha(1);
      else if (own && k === mix.stop + 1) img.setVisible(mix.t > 0).setAlpha(mix.t);
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
    this.#shownWorld = Number.NaN;
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
      sky: this.shown,
      world: this.shownWorld,
    };
  }

  reset(): void {
    this.#shown = Number.NaN;
    this.#shownWorld = Number.NaN;
  }
}

const WHITE = 0xffffff;

/** A game object the grade can tint (Images and Sprites; Phaser 4's Sprite isn't an Image). */
function tintable(obj: object): obj is Phaser.GameObjects.Components.Tint {
  return 'setTint' in obj && 'clearTint' in obj && 'tintTopLeft' in obj;
}
