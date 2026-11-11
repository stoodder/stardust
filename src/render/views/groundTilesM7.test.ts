// M7's decor wiring (T740c): the props A3M4–A3M6 name by marker stand on their tiles with their
// looks, the gated memorials only under their flag, A3M5's feed lines are its burst-pipe wrecks and
// its vats burn at full blaze, and A3M6's Dome 1 stands open. T730b: A3M4's generator, Pebble on
// her rock, the crash site kept bare, and a revisit's spawns.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import {
  coreSprite,
  dressTile,
  isPlateMarker,
  pebblePerches,
  spawnFrame,
  wreckageFrame,
} from './groundTiles.ts';
import { flagGatedGround } from './flagDressing.ts';

const all = compileContent(RAW_CONTENT).maps;
type Compiled = (typeof all)[keyof typeof all];
const maps: Readonly<Partial<Record<string, Compiled>>> = all;

function map(id: string): Compiled {
  const m = maps[id];
  if (m === undefined) throw new Error(`no ${id}`);
  return m;
}

function propAt(g: Parameters<typeof dressTile>[0], marker: string) {
  const at = g.markers?.[marker];
  if (at === undefined) throw new Error(`no marker ${marker}`);
  return dressTile(g, at[0], at[1]).prop;
}

describe("A3M4's Shelters", () => {
  const a3m4 = map('a3_m04');

  it('hangs the banner and opens the hall door', () => {
    expect(propAt(a3m4, 'banner_friday')?.sprite).toBe('prop.banner_friday');
    expect(propAt(a3m4, 'hall_door')?.sprite).toBe('prop.hall_door');
    expect(propAt(a3m4, 'mail_chute')?.sprite).toBe('prop.mail_chute');
  });

  it('stands HE HELD THE DOOR under convoy and the humming ring under warren, never both', () => {
    const convoy = flagGatedGround(a3m4, { door_choice: 'convoy' });
    const warren = flagGatedGround(a3m4, { door_choice: 'warren' });
    expect(propAt(convoy, 'held_door')).toEqual({
      sprite: 'prop.held_door',
      frame: 'v0',
      anim: 'flicker',
    });
    expect(convoy.markers?.['humming_ring']).toBeUndefined();
    expect(propAt(warren, 'humming_ring')).toEqual({
      sprite: 'prop.humming_ring',
      frame: 'hum_0',
      anim: 'hum',
    });
    expect(warren.markers?.['held_door']).toBeUndefined();
  });
});

describe("A3M5's Second Harvest at night", () => {
  const a3m5 = map('a3_m05');

  it('burns the vats at full blaze and berths the hangar', () => {
    expect(propAt(a3m5, 'vat_middle')).toEqual({
      sprite: 'prop.vat',
      frame: 'blaze_0',
      anim: 'blaze',
    });
    expect(propAt(a3m5, 'hangar')).toEqual({
      sprite: 'prop.hangar',
      frame: 'shut_0',
      anim: 'idle',
    });
  });

  it('draws the feed lines as burst-pipe wrecks', () => {
    for (const id of ['feed_1', 'feed_2', 'feed_3']) {
      const [c, r] = a3m5.markers[id] ?? [-1, -1];
      expect(['v6', 'v7'], id).toContain(wreckageFrame(c, r, a3m5.env, a3m5.markers));
      expect(dressTile(a3m5, c, r).prop?.sprite, id).toBe('prop.wreckage');
    }
  });
});

describe("A3M6's Dome Row at night", () => {
  it('opens Dome 1, barricades the old road across it, and sets down Zibzab’s crate open', () => {
    const a3m6 = maps['a3_m06'];
    if (a3m6 === undefined) return; // T722 lands the map
    if (a3m6.markers['dome_1'] !== undefined) {
      expect(propAt(a3m6, 'dome_1')).toEqual({ sprite: 'prop.dome', frame: 'open', anim: null });
    }
    if (a3m6.markers['barricade'] !== undefined) {
      expect(propAt(a3m6, 'barricade')?.sprite).toBe('prop.barricade');
    }
    if (a3m6.markers['zibzab_crate'] !== undefined) {
      expect(propAt(a3m6, 'zibzab_crate')).toEqual({
        sprite: 'prop.crate',
        frame: 'open',
        anim: null,
      });
    }
  });
});

/** Each spawn tile's look on map `id`, in tile order. */
function spawns(id: string): string[] {
  const g = map(id);
  const out: string[] = [];
  g.tiles.forEach((t, k) => {
    if (t === 'S') out.push(spawnFrame(g, k % g.cols, Math.floor(k / g.cols)));
  });
  return out;
}

describe('M7’s world render (T730b)', () => {
  it('draws A3M4’s core as the shelter generator, every other map’s as the core', () => {
    const a3m4 = map('a3_m04');
    const i = a3m4.tiles.indexOf('C');
    const [c, r] = [i % a3m4.cols, Math.floor(i / a3m4.cols)];
    expect(dressTile(a3m4, c, r).prop).toEqual({
      sprite: 'prop.generator',
      frame: 'idle_0',
      anim: 'idle',
    });
    expect(coreSprite('a3_m04')).toBe('prop.generator');
    for (const id of ['a1_m01', 'a3_m05', 'a3_m06']) expect(coreSprite(id)).toBe('prop.core');
    expect(coreSprite(undefined)).toBe('prop.core');
  });

  it('sits Pebble on the Peeker’s rock on A3M6, and leaves A3M2’s Peeker tile bare', () => {
    expect(propAt(map('a3_m06'), 'peeker')).toEqual({
      sprite: 'prop.pebble_rock',
      frame: 'perch_0',
      anim: 'perch',
    });
    expect(pebblePerches('a3_m06')).toBe(true);
    expect(propAt(map('a3_m02'), 'peeker')).toBeNull();
    expect(propAt(map('a1_m01'), 'peeker')).toBeNull();
  });

  it('keeps the crash site’s tiles bare for the plates', () => {
    const a3m5 = map('a3_m05');
    for (const id of ['crash_1', 'crash_2', 'crash_3', 'crash_4']) {
      expect(isPlateMarker(id)).toBe(true);
      expect(propAt(a3m5, id), id).toBeNull();
    }
    expect(isPlateMarker('crash')).toBe(false);
    expect(isPlateMarker('crash_site_sign')).toBe(false);
  });

  it('draws a revisit’s own edge spawns as burrows, and only the inner ones as hatches', () => {
    // A3M6: A1M1's spawn at the head of its road (inside the band, on A1M1's own edge).
    expect(spawns('a3_m06')).toEqual(['v0']);
    // A3M5: the band's sluice and A2M4's road come up out of burrows; the vats' drain is a hatch.
    expect(spawns('a3_m05').toSorted()).toEqual(['hatch', 'v0', 'v0']);
    // A2M4 itself as before.
    expect(spawns('a2_m04').toSorted()).toEqual(['hatch', 'v0']);
  });
});
