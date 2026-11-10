// T530a: the shield aura's glint (auraLook.ts): who the aura is refilling, read from sim state the
// way the sim's aura pass reads it, and the glint's twinkle.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { rgbOf } from '../../content/palettes/master.ts';
import { createSim, projectedAura, type Enemy } from '../../sim/index.ts';
import { TELL_STEP_TICKS } from '../vfx/fxTiming.ts';
import {
  auraRefilling,
  GLINT_ARM,
  GLINT_HEART,
  GLINT_SIZE,
  glintFrame,
  glintImage,
} from './auraLook.ts';

/** How many pixels of glint frame `f` are lit. */
function lit(f: 0 | 1): number {
  const d = glintImage(f).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) n++;
  return n;
}

describe('the aura glint (T530a)', () => {
  it('is a white-hearted star in the aura’s blue, large and small', () => {
    const heart = rgbOf(GLINT_HEART);
    const arm = rgbOf(GLINT_ARM);
    for (const f of [0, 1] as const) {
      const img = glintImage(f);
      expect([img.w, img.h]).toEqual([GLINT_SIZE, GLINT_SIZE]);
      const c = (2 * GLINT_SIZE + 2) * 4; // the centre pixel
      expect([img.data[c], img.data[c + 1], img.data[c + 2]]).toEqual([heart.r, heart.g, heart.b]);
      const up = (1 * GLINT_SIZE + 2) * 4;
      expect([img.data[up], img.data[up + 1], img.data[up + 2]]).toEqual([arm.r, arm.g, arm.b]);
    }
    expect(lit(0)).toBeGreaterThan(lit(1));
  });

  it('twinkles on the tell step, offset per uid, and holds large under reduced motion', () => {
    expect(glintFrame(0, 0, false)).toBe(0);
    expect(glintFrame(TELL_STEP_TICKS, 0, false)).toBe(1);
    expect(glintFrame(2 * TELL_STEP_TICKS, 0, false)).toBe(0);
    for (const t of [0, 13, 77]) expect(glintFrame(t, 5, true)).toBe(0);
    let differ = 0;
    for (let t = 0; t < 100; t++) if (glintFrame(t, 1, false) !== glintFrame(t, 2, false)) differ++;
    expect(differ).toBeGreaterThan(0);
  });

  it('marks a chipped Glimmer inside the Cantor’s ring, not the Cantor, nor a whole one', () => {
    const sim = createSim(battleConfig('dev_aura', 1));
    sim.enqueue({ type: 'callWave' });
    const pool = sim.state.enemies;
    const sources = new Int32Array(8);
    let found = false;
    for (let k = 0; k < 2400 && !found; k++) {
      sim.step();
      let n = 0;
      for (let i = 0; i < pool.used; i++)
        if (projectedAura(pool.items[i]!) !== null) sources[n++] = i;
      if (n === 0) continue;
      for (let i = 0; i < pool.used; i++) {
        const e = pool.items[i]!;
        if (!e.alive || e.def?.id !== 'glimmer') continue;
        const cantor = pool.items[sources[0]!]!;
        const inside =
          Math.hypot(e.x - cantor.x, e.y - cantor.y) <= cantor.def!.shieldAura!.radiusTiles;
        if (!inside) {
          expect(auraRefilling(pool, i, sources, n)).toBe(false);
          continue;
        }
        // Chip it: the aura is refilling it now; whole, it isn't.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets its shield directly
        const live = e as Enemy;
        const full = live.def!.shield!.hp;
        live.shieldHp = full - 5;
        expect(auraRefilling(pool, i, sources, n)).toBe(true);
        live.shieldHp = full;
        expect(auraRefilling(pool, i, sources, n)).toBe(false);
        // Phased, burrowed or leaving units are out of its reach.
        live.shieldHp = full - 5;
        live.leaving = true;
        expect(auraRefilling(pool, i, sources, n)).toBe(false);
        live.leaving = false;
        // The Cantor itself is never refilled by its own aura.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- as above
        const self = cantor as Enemy;
        self.shieldHp = 0;
        expect(auraRefilling(pool, sources[0]!, sources, n)).toBe(false);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});
