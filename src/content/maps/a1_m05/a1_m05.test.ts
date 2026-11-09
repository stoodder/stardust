// A1M5's layout and facts match docs/story/campaign/act1.md § A1M5.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../../campaign.ts';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';
import { QUIET_WAVE_COUNTDOWN_SEC, YOUNGLINGS } from './waves.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a1_m05;
const raw = RAW_CONTENT.maps.a1_m05;
const at = (c: number, r: number): TileChar | undefined => map.tiles[r * map.cols + c];
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));
const first = (enemy: string, route?: string): number =>
  raw.waves.findIndex((w) =>
    w.groups.some((g) => g.enemy === enemy && (route === undefined || g.route === route)),
  ) + 1;

describe('A1M5 · Record Quarter', () => {
  it('is the fifth campaign map', () => {
    expect(CAMPAIGN[4]).toBe('a1_m05');
  });

  it('has the documented facts', () => {
    expect(map).toMatchObject({
      act: 1,
      env: 'act1',
      objective: 'defend',
      cols: 14,
      rows: 10,
      startCredits: 350,
      coreIntegrity: 20,
      stardust: 160,
      requiredCounters: ['air', 'splash', 'armor'],
    });
    expect(map.waves).toHaveLength(10);
    expect(raw.companion).toEqual({ id: 'bricks', state: 'present' });
    expect(raw.allies).toEqual([expect.objectContaining({ kind: 'bricks', post: 'bricks_post' })]);
  });

  it('has 12 buildable tiles: 2 high ground and 1 power node', () => {
    expect(tilesOf('o').length + tilesOf('^').length + tilesOf('+').length).toBe(12);
    expect(tilesOf('^')).toHaveLength(2);
    expect(tilesOf('+')).toHaveLength(1);
  });

  it('runs two roads from the north edge into the north gate, then south to the core', () => {
    expect(Object.keys(map.routes)).toEqual(['spires', 'warren', 'sky', 'sky_east']);
    const spires = map.routes.spires!;
    const warren = map.routes.warren!;
    expect(tilesOf('S')).toEqual([
      [1, 0],
      [12, 0],
    ]);
    expect(tilesOf('C')).toEqual([[6, 9]]);
    expect(spires.tiles[0]).toEqual([1, 0]); // the Spires road, west
    expect(warren.tiles[0]).toEqual([12, 0]); // the warren track, north-east
    // They share the merged road from the gate (6,6) on.
    const gate = spires.tiles.findIndex(([c, r]) => c === 6 && r === 6);
    expect(spires.tiles.slice(gate)).toEqual(warren.tiles.slice(-spires.tiles.length + gate));
    for (const route of [spires, warren]) {
      for (const [i, [c, r]] of route.tiles.entries()) {
        expect(at(c, r)).toBe(i === 0 ? 'S' : i === route.tiles.length - 1 ? 'C' : '#');
      }
    }
  });

  it('opens the warren track at W3 (the second spawn)', () => {
    expect(first('zoomer', 'warren')).toBe(3);
    const warrenBefore = raw.waves.slice(0, 2).flatMap((w) => w.groups);
    expect(warrenBefore.some((g) => g.route === 'warren')).toBe(false);
  });

  it('puts the party dressing, Bricks, and the Peeker on decor', () => {
    for (const m of [
      'banner_line',
      'party_tent',
      'confetti_cannon',
      'bricks_post',
      'peeker',
    ] as const) {
      const [c, r] = map.markers[m]!;
      expect(at(c, r), m).toBe('.');
    }
    // The banner line hangs across the merged road, just inside the gate.
    const [bc, br] = map.markers.banner_line!;
    expect(at(bc - 1, br)).toBe('#');
    // The Peeker's rock is on the warren track.
    const [pc, pr] = map.markers.peeker!;
    expect(map.routes.warren!.tiles.some(([c, r]) => Math.hypot(c - pc, r - pr) <= 1)).toBe(true);
  });

  it('teaches the Digger in W2 and brings the Matriarch in W9 on the Spires road', () => {
    expect(first('digger')).toBe(2);
    expect(raw.waves[1]?.teach).toBe(true);
    expect(raw.waves[8]?.groups).toEqual([
      expect.objectContaining({ enemy: 'chitterbloom', count: 1, route: 'spires' }),
    ]);
    expect(content.enemies.chitterbloom.boss?.ending).toBe('driveOff');
  });

  it('ends on the Quiet Wave: Old Thrum and six younglings down the warren track', () => {
    const w10 = raw.waves[9]!;
    expect(w10.countdownSec).toBe(QUIET_WAVE_COUNTDOWN_SEC);
    expect(w10.groups).toEqual([
      expect.objectContaining({ enemy: 'elder', count: 1, route: 'warren', tags: ['quiet_wave'] }),
      expect.objectContaining({
        enemy: 'nibbler',
        count: YOUNGLINGS,
        route: 'warren',
        tags: ['quiet_wave', 'youngling'],
      }),
    ]);
    // Holding fire on all of it costs Old Thrum's 2 integrity and no more (core-loop.md § 2.7).
    expect(content.enemies.elder.leak).toBe(2);
    // Only W10 carries the tag.
    const tagged = raw.waves.flatMap((w, i) =>
      w.groups.some((g) => g.tags?.includes('quiet_wave')) ? [i + 1] : [],
    );
    expect(tagged).toEqual([10]);
  });

  it('has the Party Pooper Prevention Challenge, and cues the Quiet Wave as W10 starts', () => {
    expect(map.medals?.challenge).toMatchObject({
      id: 'party_pooper_prevention',
      name: 'Party Pooper Prevention',
      condition: { not: { passedMarker: { marker: 'banner_line', enemy: 'chitterbloom' } } },
    });
    expect(raw.events).toEqual([
      {
        id: 'quiet_wave_cue',
        on: { wave: 10, phase: 'start' },
        actions: [{ cue: 'a1_m05_cue_quiet_wave' }],
      },
    ]);
  });
});
