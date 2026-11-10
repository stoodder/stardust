// M5's dev maps (devM5.ts; T500a): they compile and validate on dev_act2's layout, and createSim
// refuses each until the task that runs it (T305c's Escort, T505's darkness), which then registers
// it in DEV_CONTENT (dev_escort since T305c).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimConfig } from '../../sim/index.ts';
import { DEV_CONTENT } from './devBattle.ts';
import { DEV_M5_MAPS } from './devM5.ts';

const dev = compileContent({ ...DEV_CONTENT, maps: { ...DEV_CONTENT.maps, ...DEV_M5_MAPS } });
const maps: Readonly<Record<string, (typeof dev.maps)[keyof typeof dev.maps]>> = dev.maps;

function config(mapId: string): SimConfig<IdSpace> {
  return {
    content: dev,
    mapId,
    seed: 1,
    loadout: maps[mapId]!.builds.parBuild.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
    specsUnlocked: [],
    scriptFlags: {},
  };
}

describe('the M5 dev maps', () => {
  it('dev_escort: two refugee groups to the gate (the core), Pebble with the first', () => {
    expect(maps.dev_escort?.escort).toMatchObject({
      safeExit: 'gate',
      exitTile: [17, 10],
      total: 12,
    });
    expect(maps.dev_escort?.escort?.groups.map((g) => g.withPebble)).toEqual([true, false]);
    expect(() => createSim(config('dev_escort'))).not.toThrow(); // T305c
  });

  it('dev_dark: half dark, then full dark, with two lamps', () => {
    expect(maps.dev_dark?.lighting.map((k) => k.dark)).toEqual([0.5, 1]);
    expect(maps.dev_dark?.lights.map((l) => l.marker)).toEqual(['lamp_bend', 'lamp_merge']);
    expect(() => createSim(config('dev_dark'))).toThrow(
      /Sundown's darkness is not simulated until T505/,
    );
  });

  it('are in DEV_CONTENT once their task lands (the battle smoke boots every registered dev map)', () => {
    expect(Object.hasOwn(DEV_CONTENT.maps, 'dev_escort')).toBe(true); // T305c
    expect(Object.hasOwn(DEV_CONTENT.maps, 'dev_dark')).toBe(false);
  });
});
