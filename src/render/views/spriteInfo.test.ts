import { describe, expect, it } from 'vitest';
import { baseFrame, facingOf, firstLook, headStyle, headSuffix, spriteId } from './spriteInfo.ts';

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

  it('picks the base frame by tier and spec (tier 4 draws its spec)', () => {
    const rivet = spriteId('tower.rivet');
    expect(baseFrame(rivet, 1, null)).toBe('t1');
    expect(baseFrame(rivet, 3, null)).toBe('t3');
    expect(baseFrame(rivet, 4, 'a')).toBe('spec_a');
    expect(baseFrame(rivet, 4, 'b')).toBe('spec_b');
    // A base with no spec frames keeps its top tier.
    expect(baseFrame(spriteId('tower.sprinkler'), 4, 'a')).toBe('t3');
  });

  it('picks the head frames: _t2 from tier 2, the spec head at tier 4', () => {
    const head = spriteId('tower.thumper_head');
    expect(headSuffix(head, 1, null)).toBe('');
    expect(headSuffix(head, 2, null)).toBe('_t2');
    expect(headSuffix(head, 3, null)).toBe('_t2');
    expect(headSuffix(head, 4, 'a')).toBe('_spec_a');
    expect(headSuffix(spriteId('tower.rivet_head'), 4, 'b')).toBe('_spec_b');
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
