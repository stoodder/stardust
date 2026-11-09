import { describe, expect, it } from 'vitest';
import { facingOf, firstLook, headStyle, spriteId } from './spriteInfo.ts';

describe('spriteInfo', () => {
  it('resolves registered ids and rejects unknown ones', () => {
    expect(spriteId('tower.rivet')).toBe('tower.rivet');
    expect(() => spriteId('tower.nope')).toThrow(/unknown sprite/);
  });

  it('knows which heads aim and which spin', () => {
    expect(headStyle(spriteId('tower.rivet_head'))).toEqual({ kind: 'aim' });
    expect(headStyle(spriteId('tower.thumper_head'))).toEqual({ kind: 'aim' });
    expect(headStyle(spriteId('tower.sprinkler_head'))).toEqual({ kind: 'idle', anim: 'spin' });
  });

  it('finds a still frame or an anim', () => {
    expect(firstLook(spriteId('projectile.rivet_tracer'))).toEqual({ frame: 'e', anim: null });
    expect(firstLook(spriteId('projectile.thumper_shell'))).toEqual({
      frame: 'spin_0',
      anim: 'spin',
    });
  });

  it('maps grid directions to screen facings', () => {
    expect(facingOf(1, 0)).toBe('se'); // +col runs down-right on screen
    expect(facingOf(0, 1)).toBe('sw'); // +row runs down-left
    expect(facingOf(-1, 0)).toBe('nw');
    expect(facingOf(0, -1)).toBe('ne');
    expect(facingOf(0, 0)).toBe('se');
  });
});
