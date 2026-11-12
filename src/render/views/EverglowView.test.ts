// EverglowView's shutdown frames (T640a): the price tag's and the power-off line's sprite frames
// by time and width, and that each names a frame its sprite draws.
import { describe, expect, it } from 'vitest';
import { ALL_SPRITES } from '../../content/sprites/all.ts';
import { TAG_FALL_MS, TAG_MS, SHUTDOWN_HALF_W, SHUTDOWN_MS, shutdownLine } from './everglowLook.ts';
import { powerOffFrame, tagFrame } from './EverglowView.ts';

function frames(id: string): readonly string[] {
  return Object.keys(ALL_SPRITES.find((s) => s.id === id)?.frames ?? {});
}

describe('the shutdown as sprites (T640a)', () => {
  it('hangs the tag, flutters it as it drops, and lays it on the ground; hung under reduced motion', () => {
    expect(tagFrame(0, false)).toBe('hang');
    expect(tagFrame(80, false)).toBe('flutter_1');
    expect(tagFrame(160, false)).toBe('flutter_0');
    expect(tagFrame(TAG_FALL_MS, false)).toBe('lie');
    expect(tagFrame(TAG_MS - 1, false)).toBe('lie');
    expect(tagFrame(300, true)).toBe('hang');
    for (let ms = 0; ms < TAG_MS; ms += 10) {
      expect(frames('fx.price_tag'), String(ms)).toContain(tagFrame(ms, false));
    }
  });

  it('collapses the power-off line frame by frame to its dot', () => {
    expect(powerOffFrame(SHUTDOWN_HALF_W)).toBe('w6');
    expect(powerOffFrame(1)).toBe('w1');
    expect(powerOffFrame(0)).toBe('dot');
    for (let ms = 0; ms < SHUTDOWN_MS; ms += 5) {
      const line = shutdownLine(ms);
      expect(frames('fx.power_off'), String(ms)).toContain(powerOffFrame(line.halfW));
    }
  });
});
