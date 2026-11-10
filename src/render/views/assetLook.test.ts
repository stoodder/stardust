import { describe, expect, it } from 'vitest';
import { SPRITES } from '../../content/sprites/index.ts';
import { assetDamage } from '../../sim/index.ts';
import { ASSET_SPRITES, assetLook } from './assetLook.ts';

function at(n: number): string {
  return assetLook(assetDamage(n, 10)).frame;
}

describe('assetLook (A2M2: Rigs 7 and 8 by damage band, T440c)', () => {
  it('shows a frame per band as the meter falls, the alarm blinking at critical', () => {
    expect(at(10)).toBe('intact');
    expect(at(9)).toBe('damaged');
    expect(at(6)).toBe('damaged');
    expect(at(5)).toBe('critical_0');
    expect(assetLook('critical').anim).toBe('critical');
    expect(at(0)).toBe('lost');
    expect(assetLook('none').frame).toBe('intact');
  });

  it('names only frames and anims its sprites have', () => {
    for (const id of Object.values(ASSET_SPRITES)) {
      const def = SPRITES.find((d) => d.id === id);
      expect(def, id).toBeDefined();
      for (const band of ['none', 'intact', 'damaged', 'critical', 'lost'] as const) {
        const look = assetLook(band);
        expect(Object.keys(def?.frames ?? {}), `${id} ${band}`).toContain(look.frame);
        if (look.anim !== null) expect(Object.keys(def?.anims ?? {})).toContain(look.anim);
      }
    }
  });
});
