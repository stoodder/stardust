// CodeSpriteSource's atlas pages are CPU-backed canvases (T501j): every page's first 2D context
// asks for `willReadFrequently`, so the bake's puts and Phaser's readback stay off the GPU. The
// browser is stood in for by stubs (a canvas that records its context requests, an ImageData).
// It registers a probe sprite (the lazy-page test), so it keeps a module graph of its own.
// vitest: isolate
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PALETTES } from '../../content/palettes/index.ts';
import { FINALE_SPRITES } from '../../content/sprites/finale.ts';
import { SPRITES, type SpriteId } from '../../content/sprites/index.ts';
import { hasSprite, liveSprites, registerSprites } from '../../content/sprites/registry.ts';
import type { SpriteDef } from '../../content/sprites/types.ts';
import { bakeAll } from './bake.ts';
import {
  ATLAS_SPRITES,
  CodeSpriteSource,
  PAGE_PREFIX,
  type SpriteScene,
} from './CodeSpriteSource.ts';

interface FakeCanvas {
  width: number;
  height: number;
  contexts: unknown[][];
  getContext: (...args: unknown[]) => { putImageData: () => void };
}

function fakeCanvas(): FakeCanvas {
  const ctx = { putImageData: (): void => undefined };
  const c: FakeCanvas = {
    width: 0,
    height: 0,
    contexts: [],
    getContext: (...args) => {
      c.contexts.push(args);
      return ctx;
    },
  };
  return c;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const ids = (list: readonly { id: string }[]): string[] => list.map((d) => d.id);

/** A probe's id, once registered (the source takes registry ids). */
function registered(id: string): SpriteId {
  if (!isRegistered(id)) throw new Error(`'${id}' is not registered`);
  return id;
}

function isRegistered(id: string): id is SpriteId {
  return hasSprite(id);
}

/** A copy of `fx.shadow` under another id: a stand-in for a lazy chunk's sprite. */
function probe(id: string): SpriteDef {
  const base = SPRITES.find((d) => d.id === 'fx.shadow');
  if (base === undefined) throw new Error('no fx.shadow');
  return { ...base, id };
}

/** What `register` bakes here: every registered sprite but the portraits (tests register all). */
const atlasLive = (): SpriteDef[] => liveSprites().filter((d) => !d.id.startsWith('portrait.'));

describe('CodeSpriteSource', () => {
  it('gives every atlas page a willReadFrequently context before drawing on it', () => {
    const canvases: FakeCanvas[] = [];
    vi.stubGlobal('document', {
      createElement: () => {
        const c = fakeCanvas();
        canvases.push(c);
        return c;
      },
    });
    vi.stubGlobal(
      'ImageData',
      class {
        readonly data: Uint8ClampedArray;
        constructor(data: Uint8ClampedArray) {
          this.data = data;
        }
      },
    );
    const pages: string[] = [];
    const scene: SpriteScene = {
      textures: {
        addCanvas: (key: string) => {
          pages.push(key);
          return { add: () => undefined };
        },
      },
      anims: { create: () => undefined },
    };

    const source = new CodeSpriteSource();
    source.register(scene);

    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0]).toBe(`${PAGE_PREFIX}0`);
    expect(canvases).toHaveLength(pages.length);
    for (const c of canvases) {
      expect(c.contexts[0]).toEqual(['2d', { willReadFrequently: true }]);
    }
  });

  it('puts each atlas page once, holding every frame at its placement (T764)', () => {
    const puts: { page: number; x: number; y: number; w: number; data: Uint8ClampedArray }[] = [];
    let made = 0;
    vi.stubGlobal('document', {
      createElement: () => {
        const page = made++;
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            putImageData: (img: { data: Uint8ClampedArray; w: number }, x: number, y: number) =>
              puts.push({ page, x, y, w: img.w, data: img.data }),
          }),
        };
      },
    });
    vi.stubGlobal(
      'ImageData',
      class {
        readonly data: Uint8ClampedArray;
        readonly w: number;
        constructor(data: Uint8ClampedArray, w: number) {
          this.data = data;
          this.w = w;
        }
      },
    );
    const frames = new Map<string, { page: number; x: number; y: number; w: number; h: number }>();
    const scene: SpriteScene = {
      textures: {
        addCanvas: (key: string) => {
          const page = Number(key.slice(PAGE_PREFIX.length));
          return {
            add: (name: string, _src: number, x: number, y: number, w: number, h: number) =>
              frames.set(name, { page, x, y, w, h }),
          };
        },
      },
      anims: { create: () => undefined },
    };
    new CodeSpriteSource().register(scene);

    expect(puts.map((p) => [p.page, p.x, p.y])).toEqual(
      Array.from({ length: made }, (_, i) => [i, 0, 0]),
    );
    // Every frame's pixels, row by row, where its texture frame says it is.
    let checked = 0;
    for (const b of bakeAll(atlasLive(), PALETTES)) {
      for (const f of b.frames) {
        const at = frames.get(f.key);
        const put = at === undefined ? undefined : puts[at.page];
        if (at === undefined || put === undefined) throw new Error(`no placement for ${f.key}`);
        expect([at.w, at.h]).toEqual([f.image.w, f.image.h]);
        for (let r = 0; r < f.image.h; r++) {
          const start = ((at.y + r) * put.w + at.x) * 4;
          const row = put.data.subarray(start, start + f.image.w * 4);
          const want = f.image.data.subarray(r * f.image.w * 4, (r + 1) * f.image.w * 4);
          if (!row.every((v, i) => v === want[i])) throw new Error(`${f.key}: row ${r} differs`);
        }
        checked++;
      }
    }
    expect(checked).toBe(frames.size);
    // Portraits are DOM-only (T766): none is in the atlas.
    expect([...frames.keys()].filter((k) => k.startsWith('portrait.'))).toEqual([]);
  });

  it('boots with the core sprites only: no portrait (T766), none of the finale (T871)', () => {
    expect(ids(ATLAS_SPRITES)).toEqual(ids(SPRITES));
    expect(ids(SPRITES).some((id) => id.startsWith('portrait.'))).toBe(false);
    const core = new Set(ids(SPRITES));
    expect(ids(FINALE_SPRITES).filter((id) => core.has(id))).toEqual([]);
  });

  it('bakes a lazily registered sprite into a page of its own on sync (T871)', () => {
    vi.stubGlobal('document', { createElement: () => fakeCanvas() });
    vi.stubGlobal(
      'ImageData',
      class {
        readonly data: Uint8ClampedArray;
        constructor(data: Uint8ClampedArray) {
          this.data = data;
        }
      },
    );
    const pages: string[] = [];
    const added: string[] = [];
    const anims: string[] = [];
    const scene: SpriteScene = {
      textures: {
        addCanvas: (key: string) => {
          pages.push(key);
          return { add: (name: string) => added.push(name) };
        },
      },
      anims: {
        create: (c: { key: string }) => {
          anims.push(c.key);
        },
      },
    };
    const source = new CodeSpriteSource();
    source.register(scene);
    const booted = pages.length;
    source.sync(); // nothing new: no page
    expect(pages).toHaveLength(booted);

    const def = probe('fx.t871_probe');
    registerSprites([def]);
    const before = added.length;
    source.sync();
    expect(pages.slice(booted)).toEqual([`${PAGE_PREFIX}${booted}`]);
    expect(added.slice(before).every((k) => k.startsWith('fx.t871_probe#'))).toBe(true);
    expect(added.length).toBeGreaterThan(before);
    // A lookup finds it (and one before `sync` would have baked it then).
    const frame = Object.keys(def.frames)[0] ?? '';
    expect(source.frame(registered('fx.t871_probe'), frame).texture).toBe(
      `${PAGE_PREFIX}${booted}`,
    );
  });

  it('bakes on a lookup that meets a sprite registered since the last sync', () => {
    vi.stubGlobal('document', { createElement: () => fakeCanvas() });
    vi.stubGlobal(
      'ImageData',
      class {
        readonly data: Uint8ClampedArray;
        constructor(data: Uint8ClampedArray) {
          this.data = data;
        }
      },
    );
    const pages: string[] = [];
    const scene: SpriteScene = {
      textures: {
        addCanvas: (key: string) => {
          pages.push(key);
          return { add: () => undefined };
        },
      },
      anims: { create: () => undefined },
    };
    const source = new CodeSpriteSource();
    source.register(scene);
    const booted = pages.length;
    const def = probe('fx.t871_probe2');
    registerSprites([def]);
    const frame = Object.keys(def.frames)[0] ?? '';
    expect(source.frame(registered('fx.t871_probe2'), frame).texture).toBe(
      `${PAGE_PREFIX}${booted}`,
    );
    // A frame that is still missing after the sync throws.
    expect(() => source.frame('fx.shadow', 'no_such_frame')).toThrow(/unknown frame/);
  });
});
