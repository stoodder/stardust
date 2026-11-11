// CodeSpriteSource's atlas pages are CPU-backed canvases (T501j): every page's first 2D context
// asks for `willReadFrequently`, so the bake's puts and Phaser's readback stay off the GPU. The
// browser is stood in for by stubs (a canvas that records its context requests, an ImageData).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PALETTES } from '../../content/palettes/index.ts';
import { SPRITES } from '../../content/sprites/index.ts';
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
    for (const b of bakeAll(ATLAS_SPRITES, PALETTES)) {
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

  it('holds every sprite but the portraits (T766: they are drawn only in the DOM)', () => {
    expect(ids(ATLAS_SPRITES)).toEqual(ids(SPRITES).filter((id) => !id.startsWith('portrait.')));
    expect(ids(SPRITES).some((id) => id.startsWith('portrait.'))).toBe(true);
  });
});
