// The code-generated SpriteSource: bakes every sprite definition the renderer draws (ATLAS_SPRITES)
// at boot, packs the frames into atlas pages, and registers them with Phaser as canvas textures,
// frames, and animations. A lazy chunk's sprites (the finale's, T871: sprites/registry.ts) get
// pages of their own when `sync` runs (BattleScene's create, before anything draws).
import type * as Phaser from 'phaser';
import { PALETTES } from '../../content/palettes/index.ts';
import { SPRITES, type SpriteId } from '../../content/sprites/index.ts';
import { liveSprites, spritesVersion } from '../../content/sprites/registry.ts';
import type { SpriteDef } from '../../content/sprites/types.ts';
import type { Point } from '../../content/sprites/types.ts';
import { packShelves } from './atlas.ts';
import {
  animKey,
  bakeAll,
  categoryOf,
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

/** Whether the atlas holds a sprite: every one but the portraits (T766). */
function inAtlas(def: SpriteDef): boolean {
  return categoryOf(def.id) !== 'portrait';
}

/**
 * The sprites the boot atlas holds: the core registry's, but the portraits (T766; they are a lazy
 * chunk now, T871, so none is in it). Portraits are drawn only in the DOM (ui/dialogue/Portrait.tsx,
 * ui/hud/Icon.tsx bake one on demand) and the gallery bakes its own, so baking them at boot cost
 * ~600 frames (12% of the atlas's pixels) and painting every portrait (definePortrait paints on
 * first read) for nothing.
 */
export const ATLAS_SPRITES: readonly SpriteDef[] = (SPRITES as readonly SpriteDef[]).filter(
  inAtlas,
);

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
  /** The ids baked so far, and the scene and page count `sync` adds pages with. */
  readonly #defs = new Set<string>();
  #scene: SpriteScene | null = null;
  #pages = 0;
  #version = -1;

  load(scene: Phaser.Scene): Promise<void> {
    this.register(scene);
    return Promise.resolve();
  }

  /**
   * Synchronous `load`: bakes, packs, and registers every registered atlas sprite (the core ones,
   * and any lazy chunk's that has loaded) with the scene's game.
   */
  register(scene: SpriteScene): void {
    this.#scene = scene;
    this.sync();
  }

  /**
   * Bakes the atlas sprites registered since the last bake (a lazy chunk's: the finale's, T871)
   * into new pages. Cheap when nothing new is registered. Runs before a battle draws (BattleScene's
   * create), so no lookup meets an unbaked sprite; a lookup that does bakes them then.
   */
  sync(): void {
    const scene = this.#scene;
    if (scene === null || this.#version === spritesVersion()) return;
    this.#version = spritesVersion();
    const defs = liveSprites().filter((d) => inAtlas(d) && !this.#defs.has(d.id));
    if (defs.length > 0) this.#addPages(scene, defs);
  }

  /** Bakes `defs` into pages of their own and registers them, their frames, and their anims. */
  #addPages(scene: SpriteScene, defs: readonly SpriteDef[]): void {
    const baked = bakeAll(defs, PALETTES);
    for (const b of baked) this.#baked.set(b.id, b);
    for (const def of defs) {
      this.#defs.add(def.id);
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
    const first = this.#pages;
    this.#pages += canvases.length;
    const textures = canvases.map((canvas, i) => {
      const key = `${PAGE_PREFIX}${first + i}`;
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
    if (!this.#baked.has(spriteId)) this.sync();
    return this.#where.get(glowKey(frameKey(spriteId, variant, frame))) ?? null;
  }

  anim(spriteId: SpriteId, anim: string, variant = DEFAULT_VARIANT): string {
    const key = animKey(spriteId, variant, anim);
    if (!this.#anims.has(key)) this.sync();
    if (!this.#anims.has(key)) throw new Error(`sprites: unknown anim '${key}'`);
    return key;
  }

  meta(spriteId: SpriteId): { w: number; h: number; anchor: Point } {
    if (!this.#baked.has(spriteId)) this.sync();
    const b = this.#baked.get(spriteId);
    if (b === undefined) throw new Error(`sprites: unknown sprite '${spriteId}'`);
    return b.meta;
  }

  frameAnchor(spriteId: SpriteId, frame: string): Point {
    if (!this.#baked.has(spriteId)) this.sync();
    const a = this.#anchors.get(frameKey(spriteId, DEFAULT_VARIANT, frame));
    if (a === undefined) throw new Error(`sprites: unknown frame '${spriteId}:${frame}'`);
    return a;
  }

  mount(spriteId: SpriteId): Point | null {
    if (!this.#baked.has(spriteId)) this.sync();
    return this.#mounts.get(spriteId) ?? null;
  }

  #ref(key: string): FrameRef {
    let r = this.#where.get(key);
    if (r === undefined) {
      this.sync();
      r = this.#where.get(key);
    }
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
