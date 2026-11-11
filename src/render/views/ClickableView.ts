// The clickable-object highlight (T409; art-direction §6, *Clickable world objects*): while a
// marker is clickable (sim `state.clickable`), the object on it gets vfx/clickOutline.ts's slow-
// marching 1 px dashed `gold.4` outline, hugging the silhouette of the frame it's drawn with (the
// Peeker holding Pebble: PeekerView `outlineFrame`), or, for a marker with no object view, the
// tile's diamond. It's in the `overlay` layer, so the lighting overlay and the units walking past
// never hide it. Steady under reduced motion; it goes the moment the marker stops being clickable
// (clicked, or its fallback fired). The pointer cursor on hover is BattleHover's.
import type * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace, MarkerId } from '../../content/types.ts';
import { TILE_H, TILE_W, inTileMask } from '../../content/sprites/helpers.ts';
import { tileImageTopLeft, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import {
  OUTLINE_PAD,
  OUTLINE_PHASES,
  outlineImage,
  outlineLook,
  silhouetteContour,
} from '../vfx/clickOutline.ts';
import type { ViewContext } from './ViewContext.ts';

/** An object's drawn frame: its texture frame, and where its frame's top-left sits on screen. */
export interface ObjectFrame {
  readonly texture: string;
  readonly frame: string;
  readonly left: number;
  readonly top: number;
}

interface Outline {
  readonly marker: MarkerId;
  readonly img: Phaser.GameObjects.Image;
  /** The texture key of each phase. */
  readonly keys: readonly string[];
  shown: boolean;
  /** Real ms since it appeared (the march and the alpha step from it). */
  ms: number;
  phase: number;
}

const tl: Vec2 = { x: 0, y: 0 };
let serial = 0;

export class ClickableView {
  readonly #ctx: ViewContext;
  readonly #map: CompiledMapDef<IdSpace>;
  readonly #reducedMotion: () => boolean;
  readonly #objects = new Map<MarkerId, () => ObjectFrame>();
  /** Built the first time each marker turns clickable. */
  readonly #outlines: Outline[] = [];
  readonly #look = { phase: 0, alpha: 1 };

  constructor(ctx: ViewContext, map: CompiledMapDef<IdSpace>, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#map = map;
    this.#reducedMotion = reducedMotion;
  }

  /** The object drawn on `marker` (its outline hugs this frame), asked when it first turns on. */
  setObject(marker: MarkerId, frame: () => ObjectFrame): void {
    this.#objects.set(marker, frame);
  }

  /** One frame: `realMs` of wall time, and the markers clickable now (sim `state.clickable`). */
  update(realMs: number, clickable: readonly string[]): void {
    for (let i = 0; i < clickable.length; i++) {
      const marker = clickable[i]!; // i < length
      const o = this.#outline(marker);
      if (o === null || o.shown) continue;
      o.shown = true;
      o.ms = 0;
      o.phase = -1;
      o.img.setVisible(true);
    }
    const dt = Number.isFinite(realMs) && realMs > 0 ? realMs : 0;
    for (let i = 0; i < this.#outlines.length; i++) {
      const o = this.#outlines[i]!; // i < length
      if (!o.shown) continue;
      if (!clickable.includes(o.marker)) {
        o.shown = false;
        o.img.setVisible(false);
        continue;
      }
      o.ms += dt;
      const look = outlineLook(o.ms, this.#reducedMotion(), this.#look);
      if (look.phase !== o.phase) {
        o.phase = look.phase;
        o.img.setTexture(o.keys[look.phase]!); // phase < OUTLINE_PHASES = keys.length
      }
      o.img.setAlpha(look.alpha);
    }
  }

  /** How many outlines show (the smoke flows' and tests' check). */
  get shown(): number {
    let n = 0;
    for (const o of this.#outlines) if (o.shown) n++;
    return n;
  }

  /** The marker's outline, built on first use; null for a marker the map doesn't place. */
  #outline(marker: MarkerId): Outline | null {
    for (const o of this.#outlines) if (o.marker === marker) return o;
    const at = Object.hasOwn(this.#map.markers, marker) ? this.#map.markers[marker] : undefined;
    if (at === undefined) return null;
    const { scene, layers, origin } = this.#ctx;
    const object = this.#objects.get(marker)?.() ?? null;
    let alpha: Uint8Array;
    let w: number;
    let h: number;
    let left: number;
    let top: number;
    if (object !== null) {
      ({ alpha, w, h } = frameAlpha(scene, object));
      left = object.left;
      top = object.top;
    } else {
      // No object view: the tile's diamond.
      w = TILE_W;
      h = TILE_H;
      alpha = new Uint8Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) alpha[y * w + x] = inTileMask(x, y) ? 255 : 0;
      tileImageTopLeft(at[0], at[1], origin, tl);
      left = tl.x;
      top = tl.y;
    }
    const contour = silhouetteContour(alpha, w, h);
    const id = ++serial;
    const keys: string[] = [];
    for (let p = 0; p < OUTLINE_PHASES; p++) {
      const key = `overlay.clickable.${id}.${p}`;
      scene.textures.addCanvas(key, imageToCanvas(outlineImage(contour, alpha, w, h, p)));
      keys.push(key);
    }
    const img = scene.make
      .image({}, false)
      .setTexture(keys[0]!) // OUTLINE_PHASES > 0
      .setOrigin(0, 0)
      .setPosition(left - OUTLINE_PAD, top - OUTLINE_PAD)
      .setVisible(false);
    layers.overlay.add(img);
    const o: Outline = { marker, img, keys, shown: false, ms: 0, phase: -1 };
    this.#outlines.push(o);
    return o;
  }

  /** Frees the outline textures (the scene is shutting down). */
  reset(): void {
    for (const o of this.#outlines) {
      o.img.destroy();
      for (const key of o.keys) this.#ctx.scene.textures.remove(key);
    }
    this.#outlines.length = 0;
  }
}

/** The alpha of a texture frame's pixels, read once from its source canvas. */
export function frameAlpha(
  scene: Phaser.Scene,
  f: ObjectFrame,
): { alpha: Uint8Array; w: number; h: number } {
  const frame = scene.textures.getFrame(f.texture, f.frame);
  const w = frame.cutWidth;
  const h = frame.cutHeight;
  const alpha = new Uint8Array(w * h);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx2d = canvas.getContext('2d');
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the baked atlas pages are canvases
  const source = frame.source.image as CanvasImageSource;
  if (ctx2d === null) return { alpha, w, h };
  ctx2d.drawImage(source, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
  const data = ctx2d.getImageData(0, 0, w, h).data;
  for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3]!; // i < w·h
  return { alpha, w, h };
}
