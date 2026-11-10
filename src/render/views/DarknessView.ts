// Sundown's darkness (art-direction.md §7, *Darkness and lighting overlay*; T505, T530b): on a map
// with darkness (sim/darkness.ts `hasDarkness`), the night falls deep on the world and lightly on
// the actors (vfx/darknessPixels.ts). One mask the size of the view (plus the shake's overhang),
// opaque but for the sim's light sources (the map's lamps; a live Prism while its beam is lit),
// each exactly the sim's lit disc, is drawn three times: a multiply over the ground (kept over the
// lighting grade, LightingView `overGround`), a lighter multiply over everything in the `lighting`
// layer (the actors' veil, under the overlay's bars and tells), and a faint additive lift of the
// night's plum over that. The scenery standing in the dark takes the rest of the world's darkness
// as a tint (LightingView `night`), judged at the tile it stands on with the sim's own test
// (`isLitAt`), so a lamp-lit wall reads lit and the yard's props sink into the night. What reads
// lit on screen is what the sim keeps at full range (D137). Its tone follows the sim's `state.dark`
// exactly (no easing of its own, reduced motion included: the sim already eases it over 4 s).
// The mask redraws only when the lit sources change; a changing tone only retints. The glow of
// the lamps, the Prism, Dome 3's window and the plant's vats and seams is WorldGlowView's.
import * as Phaser from 'phaser';
import type { CompiledLight } from '../../content/compiled.ts';
import { isLightSource, isLitAt, type LightTowers } from '../../sim/index.ts';
import { screenToGrid, type Vec2 } from '../iso.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import {
  darkTones,
  drawDarkMask,
  noDark,
  sceneryTint,
  type DarkTones,
  type LightDisc,
} from '../vfx/darknessPixels.ts';
import type { LightingView, NightTint } from './LightingView.ts';
import { isScenery, sceneryGround } from './scenery.ts';
import type { ViewContext } from './ViewContext.ts';

/** The light map overhangs the view by this much, so the camera shake never shows an edge. */
const OVERHANG_PX = 8;
const KEY = 'lighting.darkness';
/** Light sources one frame can punch (lamps plus beaming towers); more are left dark. */
const MAX_DISCS = 64;

const NO_TOWERS: LightTowers = { used: 0, items: [] };
const WHITE = 0xffffff;
const at: Vec2 = { x: 0, y: 0 };

export class DarknessView implements NightTint {
  readonly #ctx: ViewContext;
  readonly #lighting: LightingView;
  readonly #lamps: readonly CompiledLight[];
  readonly #texture: Phaser.Textures.CanvasTexture | null = null;
  /** The night over the ground, the veil over everything, and the lift over that. */
  readonly #ground: Phaser.GameObjects.Image | null = null;
  readonly #veil: Phaser.GameObjects.Image | null = null;
  readonly #lift: Phaser.GameObjects.Image | null = null;
  readonly #canvas: CanvasRenderingContext2D | null = null;
  readonly #data: ImageData | null = null;
  readonly #px: Uint32Array | null = null;
  readonly #discs: LightDisc[] = [];
  readonly #tones: DarkTones = noDark();
  /** The towers as of the last update (the scenery's light test reads their beams). */
  #towers: LightTowers = NO_TOWERS;
  /** What's drawn: the darkness, the discs, and whether the scenery carries the night. */
  #dark = 0;
  #count = -1;
  #night = false;
  /** The gather's cursor and whether it found a change (update's scratch). */
  #n = 0;
  #changed = false;

  constructor(
    ctx: ViewContext,
    lighting: LightingView,
    map: { readonly lights: readonly CompiledLight[]; readonly dark: boolean },
  ) {
    this.#ctx = ctx;
    this.#lighting = lighting;
    this.#lamps = map.lights;
    for (let i = 0; i < MAX_DISCS; i++) this.#discs.push({ x: 0, y: 0, radiusSq: 0 });
    if (!map.dark) return;
    const w = VIEW_W + 2 * OVERHANG_PX;
    const h = VIEW_H + 2 * OVERHANG_PX;
    const { scene, layers } = ctx;
    if (scene.textures.exists(KEY)) scene.textures.remove(KEY);
    const texture = scene.textures.createCanvas(KEY, w, h);
    if (texture === null) return;
    const canvas = texture.getContext();
    this.#texture = texture;
    this.#canvas = canvas;
    this.#data = canvas.createImageData(w, h);
    this.#px = new Uint32Array(this.#data.data.buffer);
    const image = (blend: Phaser.BlendModes): Phaser.GameObjects.Image =>
      new Phaser.GameObjects.Image(scene, -OVERHANG_PX, -OVERHANG_PX, KEY)
        .setOrigin(0, 0)
        .setBlendMode(blend)
        .setVisible(false);
    this.#ground = image(Phaser.BlendModes.MULTIPLY);
    lighting.overGround(this.#ground);
    this.#veil = image(Phaser.BlendModes.MULTIPLY);
    this.#lift = image(Phaser.BlendModes.ADD);
    layers.lighting.add(this.#veil);
    layers.lighting.add(this.#lift);
  }

  /** The darkness drawn now (the sim's `state.dark` as of the last update; 0 without darkness). */
  get dark(): number {
    return this.#veil?.visible === true ? this.#dark : 0;
  }

  /** Light sources punched out of the dark now. */
  get lights(): number {
    return this.#veil?.visible === true ? this.#count : 0;
  }

  /** The night's tones drawn now (white multiplies and no lift without darkness). */
  get tones(): Readonly<DarkTones> {
    return this.#tones;
  }

  /** The discs punched now (`discs[0..lights)`; WorldGlowView pools the lamps' light in them). */
  get discs(): readonly LightDisc[] {
    return this.#discs;
  }

  /** Follows the sim: its darkness and the light sources standing now. */
  update(dark: number, towers: LightTowers): void {
    const px = this.#px;
    if (px === null) return;
    this.#towers = towers;
    const veil = this.#veil!; // set with px
    if (dark <= 0) {
      if (this.#dark !== 0 || veil.visible) this.#hide();
      return;
    }
    // Gather the sources; redraw the mask only when they change.
    this.#n = 0;
    this.#changed = false;
    for (let i = 0; i < this.#lamps.length; i++) {
      const l = this.#lamps[i]!; // i < length
      this.#put(l.x, l.y, l.radiusSq);
    }
    for (let i = 0; i < towers.used; i++) {
      const t = towers.items[i]!; // i < used
      if (isLightSource(t)) this.#put(t.x, t.y, t.def!.lightRadiusSq); // isLightSource: def set
    }
    const n = this.#n;
    const moved = this.#changed || n !== this.#count;
    if (moved) {
      this.#count = n;
      const data = this.#data!; // set with px
      const { origin } = this.#ctx;
      drawDarkMask(px, data.width, data.height, -OVERHANG_PX, -OVERHANG_PX, origin, this.#discs, n);
      this.#canvas!.putImageData(data, 0, 0); // set with px
      this.#texture!.refresh();
    }
    const deeper = dark !== this.#dark || !veil.visible;
    if (deeper) {
      this.#dark = dark;
      const tones = darkTones(dark, this.#tones);
      this.#ground!.setTint(tones.ground).setVisible(true); // set with px
      veil.setTint(tones.veil).setVisible(true);
      this.#lift!.setTint(tones.lift).setVisible(true);
    }
    if (moved || deeper || !this.#night) {
      this.#night = true;
      this.#lighting.night(this);
    }
  }

  /** The scenery's tint under the grade `grade`: the night's, unless it stands in the light. */
  tintFor(obj: object, grade: number): number {
    const g = sceneryGround(obj);
    let gx: number;
    let gy: number;
    if (g === null) {
      const p = obj as { x?: number; y?: number };
      screenToGrid(p.x ?? 0, p.y ?? 0, this.#ctx.origin, at);
      gx = at.x;
      gy = at.y;
    } else {
      gx = g.x;
      gy = g.y;
    }
    return sceneryTint(grade, this.#tones, isLitAt(this.#lamps, this.#towers, gx, gy));
  }

  /**
   * The scenery in `world` standing in the light now and out of it, by the tint it wears (for
   * `__sd.render()`; both 0 without darkness).
   */
  scenery(): { litScenery: number; darkScenery: number } {
    let lit = 0;
    let dark = 0;
    if (this.dark > 0) {
      const list = this.#ctx.layers.world.list;
      for (let i = 0; i < list.length; i++) {
        const obj = list[i]!; // i < length
        if (!isScenery(obj) || !('tintTopLeft' in obj)) continue;
        if (this.tintFor(obj, WHITE) === WHITE) lit++;
        else dark++;
      }
    }
    return { litScenery: lit, darkScenery: dark };
  }

  /** Records source `#n` (up to MAX_DISCS), noting whether it differs from what's drawn. */
  #put(x: number, y: number, radiusSq: number): void {
    if (this.#n >= MAX_DISCS) return;
    const d = this.#discs[this.#n++]!; // n < MAX_DISCS = length
    if (this.#n > this.#count || d.x !== x || d.y !== y || d.radiusSq !== radiusSq) {
      this.#changed = true;
    }
    d.x = x;
    d.y = y;
    d.radiusSq = radiusSq;
  }

  /** No darkness: the images hide and the scenery's tint goes back to the grade alone. */
  #hide(): void {
    this.#dark = 0;
    darkTones(0, this.#tones);
    this.#ground?.setVisible(false);
    this.#veil?.setVisible(false);
    this.#lift?.setVisible(false);
    if (this.#night) {
      this.#night = false;
      this.#lighting.night(null);
    }
  }

  reset(): void {
    this.#count = -1;
    this.#dark = 0;
    this.#night = false;
  }
}
