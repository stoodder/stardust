// The boss bar steps out when its boss is laid to rest (M8 R2: the Unsung's bar never stays up,
// empty, over the Dawn). bindBattleEvents against a bus and stand-in views.
import { describe, expect, it } from 'vitest';
import type { IdSpace } from '../../content/types.ts';
import { createBus } from '../../shared/bus.ts';
import type { SimEvent } from '../../sim/index.ts';
import { bindBattleEvents, type BattleEventViews } from './battleEvents.ts';

/** A stand-in view's every method. */
const noop = (): void => undefined;

/** Views that do nothing, but the boss bar, which records each `ended`. */
function stage(): {
  bus: ReturnType<typeof createBus<SimEvent<IdSpace>>>;
  ended: [number, boolean][];
} {
  const bus = createBus<SimEvent<IdSpace>>();
  const ended: [number, boolean][] = [];
  const sim = {
    map: { id: 'dev_phases', act: 3, song: null },
    config: { content: { links: [], towers: {} } },
    state: { tick: 0, phase: 0 },
  };
  const known: Record<string, unknown> = {
    sim,
    bus,
    bossBar: { ended: (uid: number, pivot: boolean) => ended.push([uid, pivot]) },
    strikeRadius: [],
  };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- stand-ins for the scene's views
  const views = new Proxy(known, {
    get: (t, k: string) => (k in t ? t[k] : new Proxy(noop, { get: () => noop })),
  }) as unknown as BattleEventViews;
  bindBattleEvents(views);
  return { bus, ended };
}

describe('the boss bar and the song', () => {
  it('steps out at once when its boss is laid to rest, never held over the sunrise', () => {
    const { bus, ended } = stage();
    bus.emit({ type: 'BossEnded', uid: 5, enemy: 'unsung', how: 'layToRest' });
    bus.emit({ type: 'LaidToRest', uid: 7, at: [3, 4], points: 0 });
    expect(ended).toEqual([
      [5, true],
      [7, true],
    ]);
  });

  it('holds a moment after any other ending', () => {
    const { bus, ended } = stage();
    bus.emit({ type: 'BossEnded', uid: 3, enemy: 'unsung', how: 'driveOff' });
    expect(ended).toEqual([[3, false]]);
  });

  it('still ends a boss driven off at once on a pivot', () => {
    const { bus, ended } = stage();
    bus.emit({ type: 'BossEnded', uid: 9, enemy: 'unsung', how: 'pivot' });
    expect(ended).toEqual([[9, true]]);
  });
});
