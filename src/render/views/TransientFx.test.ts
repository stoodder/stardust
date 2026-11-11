// TransientFx's per-tile cap on shell bursts (review R14): a choke under several Thumpers shows a
// couple of blasts, not a wall of stacked fireballs.
import { describe, expect, it } from 'vitest';
import { BURSTS_PER_TILE } from '../vfx/fxTiming.ts';
import { TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** A stand-in for every Phaser object TransientFx makes: any property, any call, chains. */
function chain(): unknown {
  const fn = (): unknown => proxy;
  const proxy: unknown = new Proxy(fn, {
    get: (_t, key) => (key === Symbol.toPrimitive ? () => 0 : proxy),
    apply: () => proxy,
  });
  return proxy;
}

describe('shell bursts, capped per tile (review R14)', () => {
  it('skips a shell burst over the cap on its tile, and keeps bursting on the next tile', () => {
    const ctx = chain();
    const fx = new TransientFx(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- nothing here draws
      { scene: ctx, sprites: ctx, layers: ctx, origin: { x: 0, y: 0 } } as unknown as ViewContext,
      () => false,
    );
    for (let i = 0; i < BURSTS_PER_TILE.big; i++) expect(fx.shellBurst(3.2, 4.7)).toBe(true);
    expect(fx.shellBurst(3.9, 4.1)).toBe(false); // the same tile (3, 4)
    expect(fx.burstsCapped).toBe(1);
    expect(fx.shellBurst(4.1, 4.1)).toBe(true); // the next tile
    // Bomblets count apart from shells, against their own cap.
    for (let i = 0; i < BURSTS_PER_TILE.small; i++)
      expect(fx.shellBurst(3.5, 4.5, true)).toBe(true);
    expect(fx.shellBurst(3.5, 4.5, true)).toBe(false);
    expect(fx.burstsCapped).toBe(2);
  });
});
