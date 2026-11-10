// Sundown's darkness overlay (art-direction.md §7, *Darkness and lighting overlay*; T505): on a map
// with darkness (sim/darkness.ts `hasDarkness`), a light map the size of the view (plus the
// shake's overhang) in the `lighting` layer with multiply blend, over the world and the actors and
// under the overlay's bars and tells. Its tone follows the sim's `state.dark` exactly (no easing of
// its own, reduced motion included: the sim already eases it over 4 s), and its holes are the
// sim's light sources (the map's lamps; a live Prism while its beam is lit), each exactly the sim's
// lit disc (vfx/darknessPixels.ts), so what reads lit on screen is what the sim keeps at full range
// (D137). It redraws only when the tone or the lit sources change. Minimal by design: the lamps'
// and the Prism's glow and the dome window are T530b's.
import * as Phaser from 'phaser';
import type { CompiledLight } from '../../content/compiled.ts';
import { isLightSource, type LightTowers } from '../../sim/index.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import { darkTone, drawDarkness, packPixel, type LightDisc } from '../vfx/darknessPixels.ts';
import type { ViewContext } from './ViewContext.ts';

/** The light map overhangs the view by this much, so the camera shake never shows an edge. */
const OVERHANG_PX = 8;
const KEY = 'lighting.darkness';
/** Light sources one frame can punch (lamps plus beaming towers); more are left dark. */
const MAX_DISCS = 64;

export class DarknessView {
  readonly #ctx: ViewContext;
  readonly #lamps: readonly CompiledLight[];
  readonly #texture: Phaser.Textures.CanvasTexture | null = null;
  readonly #image: Phaser.GameObjects.Image | null = null;
  readonly #canvas: CanvasRenderingContext2D | null = null;
  readonly #data: ImageData | null = null;
  readonly #px: Uint32Array | null = null;
  readonly #discs: LightDisc[] = [];
  /** What's drawn: the tone's pixel, the darkness it stands for, and the discs. */
  #tone = -1;
  #dark = 0;
  #count = 0;
  /** The gather's cursor and whether it found a change (update's scratch). */
  #n = 0;
  #changed = false;

  constructor(
    ctx: ViewContext,
    map: { readonly lights: readonly CompiledLight[]; readonly dark: boolean },
  ) {
    this.#ctx = ctx;
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
    this.#image = new Phaser.GameObjects.Image(scene, -OVERHANG_PX, -OVERHANG_PX, KEY);
    this.#image.setOrigin(0, 0).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);
    layers.lighting.add(this.#image);
  }

  /** The darkness drawn now (the sim's `state.dark` as of the last update; 0 without darkness). */
  get dark(): number {
    return this.#image?.visible === true ? this.#dark : 0;
  }

  /** Light sources punched out of the dark now. */
  get lights(): number {
    return this.#image?.visible === true ? this.#count : 0;
  }

  /** Follows the sim: its darkness and the light sources standing now. */
  update(dark: number, towers: LightTowers): void {
    const px = this.#px;
    if (px === null) return;
    this.#dark = dark;
    const image = this.#image!; // set with px
    if (dark <= 0) {
      image.setVisible(false);
      return;
    }
    image.setVisible(true);
    // Gather the sources; redraw only when they or the tone change.
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
    const c = darkTone(dark);
    const tone = packPixel(c);
    if (!this.#changed && n === this.#count && tone === this.#tone) return;
    this.#count = n;
    this.#tone = tone;
    const data = this.#data!; // set with px
    const w = data.width;
    const h = data.height;
    drawDarkness(px, w, h, -OVERHANG_PX, -OVERHANG_PX, this.#ctx.origin, c, this.#discs, n);
    this.#canvas!.putImageData(data, 0, 0); // set with px
    this.#texture!.refresh();
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

  reset(): void {
    this.#tone = -1;
    this.#count = 0;
  }
}
