// The code-generated SpriteSource: bakes every sprite definition at boot, packs the frames into
// atlas pages, and registers them with Phaser as canvas textures, frames, and animations.
import type * as Phaser from 'phaser';
import { PALETTES } from '../../content/palettes/index.ts';
import { SPRITES, type SpriteId } from '../../content/sprites/index.ts';
import type { Point } from '../../content/sprites/types.ts';
import { packShelves } from './atlas.ts';
import {
  animKey,
  bakeAll,
  DEFAULT_VARIANT,
  frameKey,
  glowKey,
  mountOf,
  type BakedSprite,
} from './bake.ts';
import { drawImageAt } from './canvas.ts';
import type { RgbaImage } from './rasterize.ts';
import type { FrameRef, SpriteSource } from './SpriteSource.ts';

/** Texture key prefix for atlas pages (`sprites.0`, `sprites.1`, …). */
export const PAGE_PREFIX = 'sprites.';
/** Where BootScene stores the source in the game registry. */
export const SPRITE_SOURCE_KEY = 'spriteSource';

/** The parts of a Phaser scene `register` uses (a `Phaser.Scene` is one; tests pass a fake). */
export interface SpriteScene {
  readonly textures: {
    addCanvas(
      key: string,
      canvas: HTMLCanvasElement,
    ): {
      add(name: string, source: number, x: number, y: number, w: number, h: number): unknown;
    } | null;
  };
  readonly anims: {
    create(config: {
      key: string;
      frames: { key: string; frame: string }[];
      frameRate: number;
      repeat: number;
    }): unknown;
  };
}

export class CodeSpriteSource implements SpriteSource {
  readonly #where = new Map<string, FrameRef>();
  readonly #anchors = new Map<string, Point>();
  readonly #anims = new Set<string>();
  readonly #baked = new Map<string, BakedSprite>();
  readonly #mounts = new Map<string, Point>();

  load(scene: Phaser.Scene): Promise<void> {
    this.register(scene);
    return Promise.resolve();
  }

  /** Synchronous `load`: bakes, packs, and registers everything with the scene's game. */
  register(scene: SpriteScene): void {
    const baked = bakeAll(SPRITES, PALETTES);
    for (const b of baked) this.#baked.set(b.id, b);
    for (const def of SPRITES) {
      const m = mountOf(def);
      if (m !== null) this.#mounts.set(def.id, m);
    }
    const frames = baked.flatMap((b) => b.frames);
    const packed = packShelves(frames.map((f) => ({ key: f.key, w: f.image.w, h: f.image.h })));
    const canvases = packed.pages.map((p) => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, p.w);
      c.height = Math.max(1, p.h);
      // CPU-backed (T501j): thousands of putImageData calls (drawImageAt) and Phaser's one
      // getImageData per page (its CanvasTexture) stay off the GPU. A boot under software WebGL
      // was ~0.8 s slower with GPU-backed pages.
      c.getContext('2d', { willReadFrequently: true });
      return c;
    });
    // Each page's pixels are composed in memory, then put once (T764): a put per frame (thousands
    // of them) cost ~0.15 s a boot. Placements never overlap, so this is the same image.
    const byKey = new Map(frames.map((f) => [f.key, f]));
    const pixels = packed.pages.map((p) => ({
      w: Math.max(1, p.w),
      h: Math.max(1, p.h),
      data: new Uint8ClampedArray(Math.max(1, p.w) * Math.max(1, p.h) * 4),
    }));
    for (const pl of packed.placements) {
      const f = byKey.get(pl.key);
      const page = pixels[pl.page];
      if (f === undefined || page === undefined) continue;
      blit(page, f.image, pl.x, pl.y);
    }
    pixels.forEach((page, i) => {
      const canvas = canvases[i];
      if (canvas !== undefined) drawImageAt(canvas, page, 0, 0);
    });
    const textures = canvases.map((canvas, i) => {
      const key = `${PAGE_PREFIX}${i}`;
      const tex = scene.textures.addCanvas(key, canvas);
      if (tex === null) throw new Error(`sprites: texture '${key}' already exists`);
      return { key, tex };
    });
    for (const pl of packed.placements) {
      const t = textures[pl.page];
      if (t === undefined) continue;
      t.tex.add(pl.key, 0, pl.x, pl.y, pl.w, pl.h);
      this.#where.set(pl.key, { texture: t.key, frame: pl.key });
    }
    for (const f of frames) this.#anchors.set(f.key, f.anchor);
    for (const b of baked) {
      for (const a of b.anims) {
        scene.anims.create({
          key: a.key,
          frames: a.frameKeys.map((k) => ({ key: this.#ref(k).texture, frame: k })),
          frameRate: a.fps,
          repeat: a.loop ? -1 : 0,
        });
        this.#anims.add(a.key);
      }
    }
  }

  frame(spriteId: SpriteId, frame: string, variant = DEFAULT_VARIANT): FrameRef {
    return this.#ref(frameKey(spriteId, variant, frame));
  }

  glowFrame(spriteId: SpriteId, frame: string, variant = DEFAULT_VARIANT): FrameRef | null {
    return this.#where.get(glowKey(frameKey(spriteId, variant, frame))) ?? null;
  }

  anim(spriteId: SpriteId, anim: string, variant = DEFAULT_VARIANT): string {
    const key = animKey(spriteId, variant, anim);
    if (!this.#anims.has(key)) throw new Error(`sprites: unknown anim '${key}'`);
    return key;
  }

  meta(spriteId: SpriteId): { w: number; h: number; anchor: Point } {
    const b = this.#baked.get(spriteId);
    if (b === undefined) throw new Error(`sprites: unknown sprite '${spriteId}'`);
    return b.meta;
  }

  frameAnchor(spriteId: SpriteId, frame: string): Point {
    const a = this.#anchors.get(frameKey(spriteId, DEFAULT_VARIANT, frame));
    if (a === undefined) throw new Error(`sprites: unknown frame '${spriteId}:${frame}'`);
    return a;
  }

  mount(spriteId: SpriteId): Point | null {
    return this.#mounts.get(spriteId) ?? null;
  }

  #ref(key: string): FrameRef {
    const r = this.#where.get(key);
    if (r === undefined) throw new Error(`sprites: unknown frame '${key}'`);
    return r;
  }
}

/** Copies `img` into `page` at (x, y), replacing what was there (it must fit): whole pixels. */
function blit(page: RgbaImage, img: RgbaImage, x: number, y: number): void {
  const dst = new Uint32Array(page.data.buffer);
  const src = new Uint32Array(img.data.buffer, img.data.byteOffset, img.w * img.h);
  for (let r = 0; r < img.h; r++) {
    const from = r * img.w;
    const to = (y + r) * page.w + x;
    for (let c = 0; c < img.w; c++) dst[to + c] = src[from + c] ?? 0;
  }
}
