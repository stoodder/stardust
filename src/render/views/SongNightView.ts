// The finale's night and its Dawn (art-direction.md §3 *Finale*, §7; design/maps.md § 5.5; T831;
// vfx/songNightPixels.ts holds the rules). On a song map without Sundown's darkness (the finale:
// `map.song`, `map.dark` false), the world stands in full night from the first tick: one mask the
// size of the view (plus the shake's overhang), opaque over the drawn ground (the map and its apron;
// the sky behind stays clear, so the eastern dawn shows) but for the song's circles, multiplied over
// the ground (LightingView `overGround`) at the night's tone; the scenery standing in the dark
// takes the same tone as its tint (LightingView `night`); the actors are never darkened (D154
// addendum: render's night, so nothing reads as a range penalty). Each song circle is a hole the
// size of its drawn ring (ChoirWalkView: the ring's snapped radius at the ring's pixel) with a warm
// gold pool in `decal`.
// From Dawn's `setLighting` (`state.lightingKey`, `state.lightingTick`) the sun rakes in from the
// east over the set's turn (8 s; at once under reduced motion): the night's mask clears behind its
// front, an additive sunlight image over the ground (`overGround`) draws the rake and the morning's
// light (a rose wash, gold toward the east and on the road, the pads and the gate: songNightPixels'
// `sunLightAt`), and once it has crossed the night and the pools are gone and the light stays.
// Allocation-free per frame: the masks redraw only when a circle's pixel or radius or the sun's
// step changes (the leader walks a pixel every half second or so); the pools only move.
import * as Phaser from 'phaser';
import { lightingSetProgress } from '../../content/lightingSets.ts';
import type { SongCircle } from '../../sim/index.ts';
import { gridToScreen, screenToGrid, type Vec2 } from '../iso.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { MASK_DARK, MASK_LIT, noDark, sceneryTint, type LightDisc } from '../vfx/darknessPixels.ts';
import { poolImage } from '../vfx/glowPixels.ts';
import { snapRingRadius } from '../vfx/overlayPixels.ts';
import {
  drawSongNightMask,
  drawSunMask,
  isSunlit,
  SONG_POOL,
  songNightTones,
  sunKeys,
  sunLifts,
  sunStep,
  SUN_STEPS,
} from '../vfx/songNightPixels.ts';
import { apronCells, type GroundGrid } from './groundTiles.ts';
import type { LightingView, NightTint } from './LightingView.ts';
import { isScenery, sceneryGround } from './scenery.ts';
import type { RenderState } from './renderState.ts';
import type { ViewContext } from './ViewContext.ts';

const OVERHANG_PX = 8;
const NIGHT_KEY = 'lighting.song_night';
const SUN_KEY = 'lighting.sunrise';
/** A relit lantern's frames (`prop.waymark`, any variant; bake.ts `frameKey`). */
const LANTERN_FRAMES = 'prop.waymark#';
/** Song circles one frame can light (the leader's and the Returned's, two at most today). */
const MAX_CIRCLES = 4;

const at: Vec2 = { x: 0, y: 0 };

/** What the smoke flows read (`__sd.render()`; renderState.ts). */
export type SongNightLook = RenderState['songNight'];

export class SongNightView implements NightTint {
  readonly #ctx: ViewContext;
  readonly #lighting: LightingView;
  readonly #cols: number;
  readonly #reduced: () => boolean;
  readonly #tones = songNightTones(noDark());
  readonly #discs: LightDisc[] = [];
  /** Each circle's drawn pixel and snapped radius (NaN: none). */
  readonly #sx: number[] = [];
  readonly #sy: number[] = [];
  readonly #pools: Phaser.GameObjects.Image[] = [];
  readonly #poolR: number[] = [];
  #night: Phaser.GameObjects.Image | null = null;
  #sunImg: Phaser.GameObjects.Image | null = null;
  #nightTex: Phaser.Textures.CanvasTexture | null = null;
  #sunTex: Phaser.Textures.CanvasTexture | null = null;
  #nightData: ImageData | null = null;
  #sunData: ImageData | null = null;
  #nightPx: Uint32Array | null = null;
  #sunPx: Uint32Array | null = null;
  /** The drawn ground's mask with no light in it (dark over the map and its apron, clear beyond). */
  #base: Uint32Array | null = null;
  /** Each pixel's place in the sun's sweep (`sunKeys`; NaN beyond the drawn ground). */
  #keys: Float32Array | null = null;
  /** Each pixel's highlight flag for the sun (`sunLifts`: road, pads, gate). */
  #lifts: Uint8Array | null = null;
  /** Circles drawn, and the sun's step drawn (−1: nothing drawn yet). */
  #count = -1;
  #step = -1;
  /** Mask redraws so far (smoke hooks: the night's cost). */
  #redraws = 0;

  constructor(
    ctx: ViewContext,
    lighting: LightingView,
    map: { readonly cols: number; readonly song: unknown; readonly dark: boolean },
    ground: GroundGrid,
    env: string,
    reducedMotion: () => boolean,
  ) {
    this.#ctx = ctx;
    this.#lighting = lighting;
    this.#cols = map.cols;
    this.#reduced = reducedMotion;
    for (let i = 0; i < MAX_CIRCLES; i++) {
      this.#discs.push({ x: 0, y: 0, radiusSq: 0 });
      this.#sx.push(Number.NaN);
      this.#sy.push(Number.NaN);
    }
    if (map.song === null || map.song === undefined || map.dark) return;
    const w = VIEW_W + 2 * OVERHANG_PX;
    const h = VIEW_H + 2 * OVERHANG_PX;
    const { scene, layers, origin } = ctx;
    const canvas = (key: string): Phaser.Textures.CanvasTexture | null => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      return scene.textures.createCanvas(key, w, h);
    };
    const nightTex = canvas(NIGHT_KEY);
    const sunTex = canvas(SUN_KEY);
    if (nightTex === null || sunTex === null) return;
    this.#nightTex = nightTex;
    this.#sunTex = sunTex;
    this.#nightData = nightTex.getContext().createImageData(w, h);
    this.#sunData = sunTex.getContext().createImageData(w, h);
    this.#nightPx = new Uint32Array(this.#nightData.data.buffer);
    this.#sunPx = new Uint32Array(this.#sunData.data.buffer);
    this.#base = baseMask(ground, env, w, h, origin);
    this.#keys = sunKeys(w, h, -OVERHANG_PX, -OVERHANG_PX, origin, map.cols, this.#base);
    this.#lifts = sunLifts(w, h, -OVERHANG_PX, -OVERHANG_PX, origin, (c, r) =>
      c >= 0 && r >= 0 && c < ground.cols && r < ground.rows
        ? (ground.tiles[r * ground.cols + c] ?? null)
        : null,
    );
    this.#night = new Phaser.GameObjects.Image(scene, -OVERHANG_PX, -OVERHANG_PX, NIGHT_KEY)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setTint(this.#tones.world)
      .setVisible(false);
    lighting.overGround(this.#night);
    this.#sunImg = new Phaser.GameObjects.Image(scene, -OVERHANG_PX, -OVERHANG_PX, SUN_KEY)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    lighting.overGround(this.#sunImg);
    for (let i = 0; i < MAX_CIRCLES; i++) {
      const pool = scene.make.image({}, false).setVisible(false);
      pool.setBlendMode(Phaser.BlendModes.ADD);
      layers.decal.add(pool);
      this.#pools.push(pool);
      this.#poolR.push(-1);
    }
  }

  /**
   * The Dawn's sun step now (0…SUN_STEPS, east to west; −1 before Dawn or without the night): the
   * rift cracks heal behind it (RiftView, T871).
   */
  get sunStep(): number {
    return this.#night === null ? -1 : this.#step;
  }

  /** Whether this map has the night (a song map without Sundown's darkness). */
  get active(): boolean {
    return this.#night !== null;
  }

  /**
   * Follows the sim: the song's circles (`songCircles`), and Dawn's lighting set (`lightingKey`
   * set on `lightingTick`) at `tick`.
   */
  update(
    circles: readonly SongCircle[],
    lightingKey: string | null,
    lightingTick: number,
    tick: number,
  ): void {
    const px = this.#nightPx;
    if (px === null) return;
    const dawn =
      lightingKey === null
        ? 0
        : this.#reduced()
          ? 1
          : lightingSetProgress(lightingKey, lightingTick, tick);
    const step = sunStep(dawn);
    if (step >= SUN_STEPS) {
      if (this.#step !== SUN_STEPS) this.#rise();
      return;
    }
    const { origin } = this.#ctx;
    const n = Math.min(circles.length, MAX_CIRCLES);
    let changed = n !== this.#count || step !== this.#step;
    for (let i = 0; i < n; i++) {
      const c = circles[i]!; // i < n ≤ length
      gridToScreen(c.x, c.y, origin, at);
      const x = Math.round(at.x);
      const y = Math.round(at.y);
      const r = snapRingRadius(c.r);
      const pool = this.#pools[i]!; // i < MAX_CIRCLES
      if (this.#poolR[i] !== r) {
        this.#poolR[i] = r;
        const key = `lighting.song_pool.${r}`;
        if (!this.#ctx.scene.textures.exists(key)) {
          const baked = poolImage(r, SONG_POOL);
          this.#ctx.scene.textures.addCanvas(key, imageToCanvas(baked.img));
        }
        const tex = this.#ctx.scene.textures.get(key).getSourceImage();
        pool.setTexture(key).setDisplayOrigin(tex.width / 2, tex.height / 2);
      }
      pool.setPosition(x, y).setVisible(true);
      if (x === this.#sx[i] && y === this.#sy[i] && this.#discs[i]!.radiusSq === r * r) continue;
      changed = true;
      this.#sx[i] = x;
      this.#sy[i] = y;
      screenToGrid(x, y, origin, at);
      const d = this.#discs[i]!; // i < MAX_CIRCLES
      d.x = at.x;
      d.y = at.y;
      d.radiusSq = r * r;
    }
    for (let i = n; i < MAX_CIRCLES; i++) {
      const pool = this.#pools[i]!; // i < MAX_CIRCLES
      if (pool.visible) pool.setVisible(false);
    }
    if (!changed) return;
    const sunMoved = step !== this.#step;
    this.#count = n;
    this.#step = step;
    this.#drawNight();
    if (sunMoved) this.#drawSun();
    this.#night!.setVisible(true); // set with px
    this.#lighting.night(this);
  }

  /** The scenery's tint under `grade`: the night's, unless it stands in the song or the sun. */
  tintFor(obj: object, grade: number): number {
    return sceneryTint(grade, this.#tones, this.#litAt(obj) ? 'lit' : 'dark');
  }

  /** What the night shows now (smoke hooks). */
  look(): SongNightLook {
    const night = this.#night?.visible === true;
    let lit = 0;
    let dark = 0;
    if (night) {
      const list = this.#ctx.layers.world.list;
      for (let i = 0; i < list.length; i++) {
        const obj = list[i]!; // i < length
        if (!isScenery(obj) || !('tintTopLeft' in obj)) continue;
        if (this.#litAt(obj)) lit++;
        else dark++;
      }
    }
    return {
      night,
      circles: night ? this.#count : 0,
      sun: Math.max(0, this.#step),
      redraws: this.#redraws,
      darkScenery: dark,
      litScenery: lit,
    };
  }

  reset(): void {
    this.#count = -1;
    this.#step = -1;
    this.#sx.fill(Number.NaN);
    this.#sy.fill(Number.NaN);
  }

  /**
   * Whether scenery `obj` stands lit: a light of its own (a relit waymark lantern), in a song
   * circle, or where the sun has reached.
   */
  #litAt(obj: object): boolean {
    if (emitsLight(obj)) return true;
    const g = sceneryGround(obj);
    if (g !== null) {
      at.x = g.x;
      at.y = g.y;
    } else {
      const p = obj as { x?: number; y?: number };
      screenToGrid(p.x ?? 0, p.y ?? 0, this.#ctx.origin, at);
    }
    if (isSunlit(at.x, this.#cols, Math.max(0, this.#step))) return true;
    for (let i = 0; i < Math.max(0, this.#count); i++) {
      const d = this.#discs[i]!; // i < count ≤ MAX_CIRCLES
      const dx = at.x - d.x;
      const dy = at.y - d.y;
      if (dx * dx + dy * dy <= d.radiusSq) return true;
    }
    return false;
  }

  #drawNight(): void {
    this.#redraws++;
    const data = this.#nightData!; // set with the night
    const px = this.#nightPx!;
    drawSongNightMask(
      px,
      data.width,
      data.height,
      -OVERHANG_PX,
      -OVERHANG_PX,
      this.#ctx.origin,
      this.#discs,
      this.#count,
      this.#base, // beyond the drawn ground (the sky, the void) the night never falls
      this.#keys!, // set with the night
      this.#step,
    );
    this.#nightTex!.getContext().putImageData(data, 0, 0);
    this.#nightTex!.refresh();
  }

  #drawSun(): void {
    const data = this.#sunData!; // set with the night
    const px = this.#sunPx!;
    drawSunMask(px, this.#keys!, this.#step, this.#lifts); // set with the night
    this.#sunTex!.getContext().putImageData(data, 0, 0);
    this.#sunTex!.refresh();
    this.#sunImg!.setVisible(this.#step > 0);
  }

  /** The sun has risen: the night and the pools go, the morning's wash stays. */
  #rise(): void {
    this.#step = SUN_STEPS;
    this.#drawSun();
    this.#night?.setVisible(false);
    for (const pool of this.#pools) pool.setVisible(false);
    this.#lighting.night(null);
  }
}

/**
 * The night's base mask: opaque over every pixel whose ground cell is drawn (the map's and its
 * apron's), clear elsewhere (the sky behind and the void), so the night darkens the ground only.
 */
function baseMask(
  ground: GroundGrid,
  env: string,
  w: number,
  h: number,
  origin: { readonly x: number; readonly y: number },
): Uint32Array {
  const pad = 8; // wider than any apron
  const gw = ground.cols + 2 * pad;
  const gh = ground.rows + 2 * pad;
  const drawn = new Uint8Array(gw * gh);
  for (let r = 0; r < ground.rows; r++) {
    for (let c = 0; c < ground.cols; c++) drawn[(r + pad) * gw + c + pad] = 1;
  }
  for (const cell of apronCells(ground, env)) {
    const c = cell.col + pad;
    const r = cell.row + pad;
    if (c >= 0 && r >= 0 && c < gw && r < gh) drawn[r * gw + c] = 1;
  }
  const px = new Uint32Array(w * h);
  const p: Vec2 = { x: 0, y: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      screenToGrid(x + 0.5 - OVERHANG_PX, y + 0.5 - OVERHANG_PX, origin, p);
      const c = Math.floor(p.x) + pad;
      const r = Math.floor(p.y) + pad;
      const on = c >= 0 && r >= 0 && c < gw && r < gh && drawn[r * gw + c] === 1;
      px[y * w + x] = on ? MASK_DARK : MASK_LIT;
    }
  }
  return px;
}

/** Scenery that is a light of its own and never darkens: the relit waymark lanterns (T842). */
function emitsLight(obj: object): boolean {
  const frame = (obj as { frame?: { name?: unknown } }).frame?.name;
  return typeof frame === 'string' && frame.startsWith(LANTERN_FRAMES);
}
