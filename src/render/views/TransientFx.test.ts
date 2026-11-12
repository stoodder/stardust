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

/** TransientFx with its frame step in reach. */
class Stepped extends TransientFx {
  step(dt: number): void {
    this.advance(dt);
  }
}

describe('one pop per unit (T803b)', () => {
  const make = (): Stepped => {
    const ctx = chain();
    return new Stepped(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- nothing here draws
      { scene: ctx, sprites: ctx, layers: ctx, origin: { x: 0, y: 0 } } as unknown as ViewContext,
      () => false,
    );
  };

  it("merges a target's numbers into one pop, and keeps other targets' and kinds apart", () => {
    const fx = make();
    // Three upgrades on one tower in one frame: one "−495".
    fx.floatText('−225', 'gold.3', 3.5, 4.5, 24);
    fx.floatText('−120', 'gold.3', 3.5, 4.5, 24);
    fx.floatText('−150', 'gold.3', 3.5, 4.5, 24);
    expect(fx.floatTexts).toEqual(['−495']);
    // Leaks at the gate merge in their own colour; a bank's income elsewhere stands alone.
    fx.floatText('−1', 'red.3', 1, 1, 46);
    fx.floatText('−1', 'red.3', 1, 1, 46);
    fx.floatText('+40', 'gold.4', 8, 2, 24);
    fx.floatText('+40', 'gold.4', 12, 2, 24);
    expect(fx.floatTexts).toEqual(['−495', '−2', '+40', '+40']);
    // A refund (+) over the tower that just paid (−) is a different fact: no merge.
    fx.floatText('+126', 'gold.3', 3.5, 4.5, 24);
    expect(fx.floatsUp).toBe(5);
  });

  it('draws a callout once while the same words are up nearby', () => {
    const fx = make();
    fx.floatText('HARMONY', 'gold.4', 5, 5, 30, 1600);
    fx.floatText('HARMONY', 'gold.4', 5.5, 6, 30, 1600);
    fx.floatText('HARMONY', 'gold.4', 6, 5, 30, 1600);
    expect(fx.floatTexts).toEqual(['HARMONY']);
    fx.floatText('HARMONY', 'gold.4', 12, 12, 30, 1600); // across the map: its own
    expect(fx.floatsUp).toBe(2);
  });

  it('merges only while the first pop is young', () => {
    const fx = make();
    fx.floatText('−1', 'red.3', 1, 1, 46);
    fx.step(800);
    fx.floatText('−1', 'red.3', 1, 1, 46);
    expect(fx.floatTexts).toEqual(['−1', '−1']);
  });

  it('floats nothing once muted (Dawn), and clears what was up', () => {
    const fx = make();
    fx.floatText('+40', 'gold.4', 2, 2, 24);
    fx.muteText();
    expect(fx.floatsUp).toBe(0);
    fx.floatText('+40', 'gold.4', 2, 2, 24);
    expect(fx.floatsUp).toBe(0);
  });
});
