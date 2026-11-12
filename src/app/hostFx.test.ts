// A real host's fastForward into TransientFx's StaleFx clock (T663; review C1): one large
// fastForward dispatches each tick's events after that tick, so the bursts it queued carry the ticks
// they were made on and burn out, rather than all starting together on the frame after it.
import { describe, expect, it } from 'vitest';
import type { ViewContext } from '../render/views/ViewContext.ts';
import { TransientFx } from '../render/views/TransientFx.ts';
import { BURST_MS } from '../render/vfx/fxTiming.ts';
import { TICK_HZ } from '../shared/time.ts';
import { fixtureSim } from '../sim/__fixtures__/sim.ts';
import { createHost } from './host.ts';

/** A stand-in for every Phaser object TransientFx makes: any property, any call, chains. */
function chain(): unknown {
  const fn = (): unknown => proxy;
  const proxy: unknown = new Proxy(fn, {
    get: (_t, key) => (key === Symbol.toPrimitive ? () => 0 : proxy),
    apply: () => proxy,
  });
  return proxy;
}

/** TransientFx over stand-ins (nothing draws), its frame step in reach. */
class Stepped extends TransientFx {
  constructor() {
    const ctx = chain();
    super(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- nothing here draws
      { scene: ctx, sprites: ctx, layers: ctx, origin: { x: 0, y: 0 } } as unknown as ViewContext,
      () => false,
    );
  }
  step(dt: number): void {
    this.advance(dt);
  }
}

describe("a host's fastForward into TransientFx (T663)", () => {
  it('leaves only the last BURST_MS of a fastForward(600) bursting on the frame after it', () => {
    const sim = fixtureSim();
    const host = createHost(sim, { now: () => 0 });
    const fx = new Stepped();
    fx.setClock(() => sim.state.tick);
    // Two guns by the path, the first wave called now; every shot bursts on its own tile.
    host.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    host.enqueue({ type: 'build', tile: [1, 3], tower: 'fx_gun' });
    host.enqueue({ type: 'callWave' });
    host.fastForward(0);
    const made: number[] = [];
    host.bus.on('ProjectileFired', () => {
      const n = made.length;
      made.push(sim.state.tick);
      fx.shellBurst(n % 6, Math.floor(n / 6) % 5);
    });
    host.fastForward(600);
    fx.step(1000 / TICK_HZ);
    const end = sim.state.tick;
    const recent = made.filter((t) => (end - t) * (1000 / TICK_HZ) < BURST_MS).length;
    // The shots came on their own ticks, through the run (a dispatch once, at the end, would have
    // stamped them all `end` and left every one bursting).
    expect(made.length).toBeGreaterThan(3);
    expect(new Set(made).size).toBe(made.length);
    expect(made.length).toBeGreaterThan(recent);
    expect(fx.burstsLive).toBeLessThanOrEqual(recent + 1);
    expect(fx.burstsLive).toBeLessThan(made.length);
  });
});
