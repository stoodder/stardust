// Prim's PA (T603; act3.md § A3M2: Prim barks "via drones" at `wave_start`): on a map that sends
// Everglow Security, Prim is on the radio, and a wave that sends them says `everglow`, so her bark
// waits for one and never plays on a wave of Hollow alone.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { Bark } from '../content/dialogue/types.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import { newBarkState, pickBark } from '../story/barks.ts';
import type { StoryContext } from '../story/conditions.ts';
import { everglowWaves, presentSpeakers } from './dialogue.ts';

const dev = compileContent(DEV_CONTENT);
const maps: Readonly<Record<string, (typeof dev.maps)[keyof typeof dev.maps]>> = dev.maps;
const ctx: StoryContext = { flags: {}, map: 'a1_m02', pestsProcessed: 0, seen: [], run: null };

const pa: Bark = {
  id: 'prim_wave_start_test',
  speaker: 'prim',
  text: 'Repossession in progress. Please remain compliant.',
  trigger: { on: 'wave_start', everglow: true },
};

describe("Prim's PA", () => {
  it('a wave that sends Everglow Security says so; one of Hollow or Aelari alone does not', () => {
    expect(everglowWaves(maps.dev_revoke!.waves)).toEqual([true, true]);
    expect(everglowWaves(maps.dev_aura!.waves).some(Boolean)).toBe(false);
    const mixed = [
      { groups: [{ enemy: { faction: 'hollow' } }] },
      { groups: [{ enemy: { faction: 'hollow' } }, { enemy: { faction: 'everglow' } }] },
    ];
    expect(everglowWaves(mixed)).toEqual([false, true]);
  });

  it('puts Prim on the radio beside QUILL and the companion when the map sends them', () => {
    const bricks = { companion: { id: 'bricks', state: 'present' } } as const;
    expect(presentSpeakers(bricks, true)).toEqual(['quill', 'bricks', 'prim']);
    expect(presentSpeakers(bricks)).toEqual(['quill', 'bricks']);
    expect(presentSpeakers({ companion: null }, true)).toEqual(['quill', 'prim']);
  });

  it('her `everglow` bark plays at an Everglow wave’s start, never at a Hollow one’s', () => {
    const present = presentSpeakers({ companion: null }, true);
    const state = newBarkState(1);
    const hollow = pickBark(
      [pa],
      { trigger: { on: 'wave_start', wave: 1 }, atSec: 10, present },
      state,
      ctx,
    );
    expect(hollow.bark).toBeNull();
    const drones = pickBark(
      [pa],
      { trigger: { on: 'wave_start', wave: 3, everglow: true }, atSec: 10, present },
      state,
      ctx,
    );
    expect(drones.bark).toBe(pa);
    // Without her on the radio (a map with no Everglow units) it can't play.
    const absent = pickBark(
      [pa],
      { trigger: { on: 'wave_start', wave: 3, everglow: true }, atSec: 10, present: ['quill'] },
      state,
      ctx,
    );
    expect(absent.bark).toBeNull();
  });
});
