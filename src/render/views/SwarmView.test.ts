// SwarmView's pool (review B3, P3): it grows past its first SWARM_SLOTS sprites when more
// swarmlings are out (uncapped Dens), and re-plays a slot's anim only when its look changes.
import { describe, expect, it, vi } from 'vitest';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Ally } from '../../sim/index.ts';
import { SWARM_SLOTS, SwarmView } from './SwarmView.ts';
import type { ViewContext } from './ViewContext.ts';

// EnemyView (reached through RefugeeView) imports Phaser at runtime; nothing here draws.
vi.mock('phaser', () => ({}));

/** A Phaser sprite's surface as SwarmView uses it, counting plays. */
class StubSprite {
  plays = 0;
  visible = false;
  readonly anims = { pause: (): void => {} };
  setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }
  setPosition(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
  setDisplayOrigin(): this {
    return this;
  }
  play(): this {
    this.plays++;
    return this;
  }
  stop(): this {
    return this;
  }
}

function stubContext(made: StubSprite[]): ViewContext {
  const ctx = {
    scene: {
      make: {
        sprite: (): StubSprite => {
          const s = new StubSprite();
          made.push(s);
          return s;
        },
      },
    },
    sprites: { anim: (): string => 'anim', frameAnchor: () => ({ x: 0, y: 0 }) },
    layers: { world: { add: (): void => {} } },
    origin: { x: 0, y: 0 },
  };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a stub of the parts SwarmView reads
  return ctx as unknown as ViewContext;
}

/** `n` swarmlings out of their Den, dashing (x moves by `step` to set a facing). */
function swarm(n: number, step = 0): { used: number; items: DeepReadonly<Ally>[] } {
  const items: DeepReadonly<Ally>[] = [];
  for (let i = 0; i < n; i++) {
    const a = {
      uid: i + 1,
      alive: true,
      mode: 'owner',
      kind: 'swarmling',
      swarmState: 'out',
      x: i + step,
      y: 0,
      targetUid: 0,
    };
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the fields SwarmView reads
    items.push(a as unknown as DeepReadonly<Ally>);
  }
  return { used: n, items };
}

const NO_ENEMIES = { used: 0, items: [] };

describe('the swarm view (review B3, P3)', () => {
  it('draws every swarmling out, growing its pool past its first slots', () => {
    const made: StubSprite[] = [];
    const view = new SwarmView(stubContext(made));
    expect(view.slots).toBe(SWARM_SLOTS);
    const n = SWARM_SLOTS + 9;
    view.update(swarm(n), NO_ENEMIES);
    expect(view.shown.out).toBe(n);
    expect(view.slots).toBe(n);
    expect(made.filter((s) => s.visible)).toHaveLength(n);
    // Fewer out again: the extra slots hide, and the pool keeps its size.
    view.update(swarm(3), NO_ENEMIES);
    expect(view.slots).toBe(n);
    expect(made.filter((s) => s.visible)).toHaveLength(3);
  });

  it('re-plays a slot only when its look changes', () => {
    const made: StubSprite[] = [];
    const view = new SwarmView(stubContext(made));
    view.update(swarm(2), NO_ENEMIES);
    view.update(swarm(2), NO_ENEMIES);
    expect(made[0]!.plays).toBe(1);
    // Moving the other way turns it: a new look, one more play.
    view.update(swarm(2, -1), NO_ENEMIES);
    expect(made[0]!.plays).toBe(2);
  });
});
