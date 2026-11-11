// T730a: the Gloop's green splat (gloopLook.ts): which shots splat, and the splat's pixels.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { SPLAT_H, SPLAT_W, splatImage, splats } from './gloopLook.ts';

describe('the Gloop’s splat (T730a)', () => {
  it('splats only the Gloop’s glob, never a Thumper’s shell', () => {
    expect(splats('projectile.gloop_glob')).toBe(true);
    expect(splats('projectile.thumper_shell')).toBe(false);
    expect(splats(null)).toBe(false);
  });

  it('is a green blob with a heart, a glint, and an ink rim, in no orange', () => {
    const img = splatImage();
    expect([img.w, img.h]).toEqual([SPLAT_W, SPLAT_H]);
    const count = (name: Parameters<typeof rgbOf>[0]): number => {
      const c = rgbOf(name);
      let n = 0;
      for (let i = 0; i < img.data.length; i += 4) {
        if (img.data[i] === c.r && img.data[i + 1] === c.g && img.data[i + 2] === c.b) n++;
      }
      return n;
    };
    expect(count('green.3')).toBeGreaterThan(20);
    expect(count('green.4')).toBeGreaterThan(5);
    expect(count('white.1')).toBe(1);
    expect(count('ink.0')).toBeGreaterThan(10);
    expect(count('orange.3')).toBe(0);
    const centre = (4 * SPLAT_W + 8) * 4;
    expect(img.data[centre + 3]).toBe(255);
    expect(img.data[3]).toBe(0); // a corner is clear
  });
});
