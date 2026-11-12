// A3M4's layout matches docs/story/campaign/act3.md § A3M4 (Layout data): the two tunnels into the
// hall junction, the 18 pads, the rifts, the Moths' lane and Gerald's mail chute, the flag dressing,
// and the facts. The waves' beats and the tuning are balance/a3m4.test.ts's.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';
import { PADS } from './builds.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a3_m04;
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));
const byRow = ([c1, r1]: readonly number[], [c2, r2]: readonly number[]): number =>
  r1! - r2! || c1! - c2!;

describe('A3M4 · Empty Slot', () => {
  it('has the facts act3.md gives: Defend, 22×14, 16 waves, 660 credits, Bricks absent', () => {
    expect(map).toMatchObject({
      act: 3,
      env: 'act3',
      objective: 'defend',
      cols: 22,
      rows: 14,
      startCredits: 660,
      stardust: 330,
      requiredCounters: ['jam', 'armor', 'air'],
    });
    expect(map.waves).toHaveLength(16);
    expect(map.companion).toEqual({ id: 'bricks', state: 'absent' });
  });

  it('has 18 pads, every one named for the builds', () => {
    expect(tilesOf('o')).toHaveLength(18);
    expect(tilesOf('o')).toEqual(
      Object.values(PADS)
        .map(([c, r]) => [c, r])
        .toSorted(byRow),
    );
  });

  it('runs both tunnels to the hall junction and one corridor to the generator', () => {
    expect(tilesOf('S')).toEqual([
      [0, 2],
      [21, 2],
    ]);
    expect(tilesOf('C')).toEqual([[11, 11]]);
    expect(map.routes.tunnel!.tiles).toHaveLength(29);
    expect(map.routes.service!.tiles).toHaveLength(28);
    for (const id of ['tunnel', 'service', 'rift_w', 'rift_e', 'sky', 'chute']) {
      expect(map.routes[id]!.tiles.at(-1), id).toEqual([11, 11]);
    }
    expect(map.routes.tunnel!.tiles.slice(-4)).toEqual(map.routes.service!.tiles.slice(-4));
  });

  it("gives Gerald his own chute over the junction, and dresses the hall by the player's door", () => {
    expect(map.routes.chute!.kind).toBe('air');
    expect(map.markers).toMatchObject({
      banner_friday: [11, 13],
      hall_door: [11, 12],
      held_door: [9, 13],
      humming_ring: [13, 13],
      mail_chute: [0, 7],
    });
    expect(map.markerWhen).toEqual({
      held_door: { flag: 'door_choice', eq: 'convoy' },
      humming_ring: { flag: 'door_choice', eq: 'warren' },
    });
    // Gerald is the only one in the chute, and only in W7.
    const chute = map.waves.flatMap((w, i) =>
      w.groups.filter((g) => g.route.id === 'chute').map((g) => [i + 1, g.enemy.id, g.count]),
    );
    expect(chute).toEqual([[7, 'gerald', 1]]);
  });

  it('carries its medal and objective: Keep the Lights On, Signature: Received', () => {
    expect(map.medals?.challenge).toMatchObject({
      id: 'keep_the_lights_on',
      condition: { stat: 'jammedPeak', lte: 1 },
    });
    expect(map.objectives).toMatchObject([
      { id: 'signature_received', condition: { stat: 'neutralHits', lte: 0 }, intel: 1 },
    ]);
  });
});
