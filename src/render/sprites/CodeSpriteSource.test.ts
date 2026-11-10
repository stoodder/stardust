// CodeSpriteSource's atlas pages are CPU-backed canvases (T501j): every page's first 2D context
// asks for `willReadFrequently`, so the bake's puts and Phaser's readback stay off the GPU. The
// browser is stood in for by stubs (a canvas that records its context requests, an ImageData).
import type * as Phaser from 'phaser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeSpriteSource, PAGE_PREFIX } from './CodeSpriteSource.ts';

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
    const scene = {
      textures: {
        addCanvas: (key: string) => {
          pages.push(key);
          return { add: () => undefined };
        },
      },
      anims: { create: () => undefined },
    } as unknown as Phaser.Scene;

    const source = new CodeSpriteSource();
    source.register(scene);

    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0]).toBe(`${PAGE_PREFIX}0`);
    expect(canvases).toHaveLength(pages.length);
    for (const c of canvases) {
      expect(c.contexts[0]).toEqual(['2d', { willReadFrequently: true }]);
    }
  });
});
