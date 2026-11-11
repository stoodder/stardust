// definePortrait paints lazily (T766): nothing is painted when a portrait module loads, only the
// first time its frames or anims are read, and then once.
import { describe, expect, it, vi } from 'vitest';
import { grid } from '../helpers.ts';
import { definePortrait, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

function spec(paint: (a: PaintArgs) => ReturnType<typeof grid>) {
  return {
    id: 'portrait.lazy_fixture',
    palette: 'everglow',
    legend: {},
    expressions: ['neutral', 'happy'],
    paint,
  } as const;
}

describe('definePortrait (T766)', () => {
  it('paints nothing until its frames are read, then paints once', () => {
    const paint = vi.fn((a: PaintArgs) => {
      const g = grid(PORTRAIT_SIZE, PORTRAIT_SIZE);
      const row = g[a.expression === 'happy' ? 1 : 0];
      if (row !== undefined) row[a.mouth === 'talk' ? 2 : 1] = '1';
      return g;
    });
    const def = definePortrait(spec(paint));
    expect(def.id).toBe('portrait.lazy_fixture');
    expect(def.size).toEqual({ w: PORTRAIT_SIZE, h: PORTRAIT_SIZE });
    expect(paint).not.toHaveBeenCalled();

    const frames = def.frames;
    const calls = paint.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    expect(Object.keys(frames)).toEqual(
      expect.arrayContaining(['neutral', 'neutral_talk', 'happy', 'happy_talk']),
    );
    expect(Object.keys(def.anims ?? {})).toEqual(['talk_neutral', 'talk_happy']);
    // Read again: the same frames, no repaint.
    expect(def.frames).toBe(frames);
    expect(paint.mock.calls.length).toBe(calls);
  });

  it('still rejects a painter that draws the wrong size, on first read', () => {
    const def = definePortrait(spec(() => grid(PORTRAIT_SIZE - 1, PORTRAIT_SIZE)));
    expect(() => def.frames).toThrow(/is not 48×48/);
  });
});
