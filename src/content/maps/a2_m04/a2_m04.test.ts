// A2M4's layout matches docs/story/campaign/act2.md § A2M4. A3M5 revisits this map by reference
// (design/maps.md § 7), so its landmarks (the vats, Intake B, the control core), its routes, and
// its pads are pinned here: a change is never silent.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';
import type { TileChar } from '../../types.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a2_m04;
const tilesOf = (ch: TileChar): [number, number][] =>
  map.tiles.flatMap((t, i) => (t === ch ? [[i % map.cols, Math.floor(i / map.cols)]] : []));

describe('A2M4 · Second Harvest', () => {
  it('has the facts act2.md gives', () => {
    expect(map).toMatchObject({
      act: 2,
      env: 'act2.dusk',
      objective: 'defend',
      cols: 18,
      rows: 12,
      startCredits: 480,
      stardust: 225,
      requiredCounters: ['detection', 'shield', 'splash'],
    });
    expect(map.waves).toHaveLength(12);
    expect(map.companion).toEqual({ id: 'zibzab', state: 'present' });
  });

  it('has 15 buildable tiles (2 catwalks, the conduit) and the two intake hoppers', () => {
    expect(tilesOf('o')).toHaveLength(12);
    expect(tilesOf('^')).toEqual([
      [6, 7],
      [10, 7],
    ]);
    expect(tilesOf('+')).toEqual([[11, 9]]);
    expect(tilesOf('x')).toEqual([
      [3, 6],
      [3, 7],
    ]);
  });

  it('keeps the landmarks and routes A3M5 composes: the road, the vats’ surge, the air lane', () => {
    expect(Object.keys(map.routes)).toEqual(['road', 'vats', 'sky']);
    expect(map.routes.road!.tiles).toHaveLength(39);
    expect(map.routes.vats!.tiles).toHaveLength(12);
    expect(tilesOf('S')).toEqual([
      [14, 0],
      [8, 7],
    ]);
    expect(tilesOf('C')).toEqual([[9, 11]]);
    expect(map.markers).toMatchObject({
      intake_b: [2, 6],
      intake_hopper_n: [3, 6],
      intake_hopper_s: [3, 7],
      vat_middle: [8, 5],
    });
  });

  it('binds the truth scene to W4’s clear', () => {
    const truth = map.events.find((e) => e.id === 'truth');
    expect(truth?.on).toEqual({ wave: 4, phase: 'cleared' });
    expect(truth?.actions).toEqual([{ cue: 'a2_m04_scene_truth' }]);
  });
});
