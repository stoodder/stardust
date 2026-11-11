// M7's props and tiles for A3M4–A3M6 (T740c; art-direction §6, act3.md per map): the frames say
// what they should at 1×. The words on the banner and the door are there to read, the flames and
// the hum move under 3 Hz, the generator stands in for the core frame for frame, the vats burn
// brighter at full blaze, the feed lines bleed violet, the plates are no salvage, Dome 1 opens
// and then frosts, Pebble sits up on a rock in the dark, and the 2-wide lane has no seam.
import { describe, expect, it } from 'vitest';
import { GLYPHS, textPixels } from '../font3x5.ts';
import { inTileMask } from '../helpers.ts';
import { SPRITES, type SpriteId } from '../index.ts';
import type { SpriteDef } from '../types.ts';

function def(id: SpriteId): SpriteDef {
  const d = SPRITES.find((s) => s.id === id);
  if (d === undefined) throw new Error(`no sprite ${id}`);
  return d;
}

function grid(id: SpriteId, frame: string): readonly string[] {
  const f = def(id).frames[frame];
  if (f === undefined || !Array.isArray(f)) throw new Error(`${id}:${frame} is not a grid`);
  return f;
}

function count(rows: readonly string[], chars: string): number {
  return rows
    .join('')
    .split('')
    .filter((c) => chars.includes(c)).length;
}

function diff(id: SpriteId, a: string, b: string): number {
  const ga = grid(id, a).join('');
  const gb = grid(id, b).join('');
  let n = 0;
  for (let i = 0; i < ga.length; i++) if (ga[i] !== gb[i]) n++;
  return n;
}

function anim(id: SpriteId, name: string): { frames: readonly string[]; fps: number } {
  const a = def(id).anims?.[name];
  if (a === undefined || !('frames' in a)) throw new Error(`${id} has no anim ${name}`);
  return a;
}

describe('the 3×5 font', () => {
  it('draws V apart from U (A3M1\'s sign read "PRESERUE")', () => {
    const v = GLYPHS['V'] ?? [];
    const u = GLYPHS['U'] ?? [];
    expect(v.filter((r, i) => r !== u[i]).length).toBeGreaterThanOrEqual(2);
    expect(v.at(-1)).toBe('.#.'); // it comes to a point
  });
});

describe("A3M4's Shelters", () => {
  it('stands the generator in for the core: same frames, anim, and glowing heart', () => {
    const core = def('prop.core');
    const gen = def('prop.generator');
    expect(Object.keys(gen.frames)).toEqual(Object.keys(core.frames));
    expect(anim('prop.generator', 'idle').frames).toEqual(anim('prop.core', 'idle').frames);
    expect(gen.glow?.slots).toEqual(core.glow?.slots);
    expect(count(grid('prop.generator', 'idle_0'), '+*')).toBeGreaterThan(8);
    expect(diff('prop.generator', 'idle_0', 'idle_1')).toBeGreaterThan(0);
  });

  it('spells FUN FRIDAY on the banner', () => {
    expect(count(grid('prop.banner_friday', 'v0'), 'Y')).toBeGreaterThanOrEqual(
      textPixels('FUN FRIDAY', 0, 0).length,
    );
  });

  it('paints HE HELD THE DOOR on the door, its candles trading under 3 Hz', () => {
    const words = textPixels('HE HELD', 0, 0).length + textPixels('THE DOOR', 0, 0).length;
    expect(count(grid('prop.held_door', 'v0'), 'W')).toBeGreaterThanOrEqual(words);
    expect(count(grid('prop.held_door', 'v0'), '+*')).toBeGreaterThan(2);
    expect(diff('prop.held_door', 'v0', 'v1')).toBeGreaterThan(0);
    expect(anim('prop.held_door', 'flicker').fps).toBeLessThanOrEqual(3);
  });

  it('hums: the ring sways in turn round a stone that glows in every frame', () => {
    const frames = anim('prop.humming_ring', 'hum').frames;
    expect(frames).toHaveLength(3);
    expect(anim('prop.humming_ring', 'hum').fps).toBeLessThanOrEqual(3);
    for (const f of frames) expect(count(grid('prop.humming_ring', f), 'P')).toBeGreaterThan(1);
    expect(diff('prop.humming_ring', 'hum_0', 'hum_1')).toBeGreaterThan(10);
  });

  it('keeps the hall door low, so it never hides the generator behind it', () => {
    const rows = grid('prop.hall_door', 'v0');
    const top = rows.findIndex((r) => /[^._]/.test(r));
    expect(def('prop.hall_door').anchor.y - top).toBeLessThanOrEqual(16);
    expect(count(rows, 'OHY')).toBeGreaterThan(30); // the hall lit warm through it
  });

  it('furnishes two bays apart', () => {
    expect(diff('prop.shelter_bay', 'v0', 'v1')).toBeGreaterThan(30);
  });
});

describe("A3M5's Second Harvest at night", () => {
  it('burns the vats brighter at full blaze, a white-hot heart in the slurry', () => {
    for (const k of [0, 1, 2]) {
      const v = grid('prop.vat', `v${k}`);
      const b = grid('prop.vat', `blaze_${k}`);
      expect(count(b, 'Z'), `blaze_${k}`).toBeGreaterThan(0);
      expect(count(v, 'Z')).toBe(0);
      expect(count(b, 'YZ')).toBeGreaterThan(count(v, 'YZ'));
    }
    expect(anim('prop.vat', 'blaze').fps).toBeLessThanOrEqual(4);
  });

  it('bleeds the vats’ violet out of the burst feed lines, which keep the salvage stake', () => {
    for (const v of ['v6', 'v7']) {
      expect(count(grid('prop.wreckage', v), 'CFP'), v).toBeGreaterThan(30);
      expect(diff('prop.wreckage', v, `${v}_lit`)).toBeGreaterThan(0); // the stake's beacon
      expect(count(grid('prop.wreckage', `${v}_half`), 'CFP')).toBeGreaterThan(0);
    }
  });

  it('opens the hangar on a dark bay with its launch lamp lit', () => {
    expect(count(grid('prop.hangar', 'open'), 'JK')).toBeGreaterThan(
      count(grid('prop.hangar', 'shut_0'), 'JK') + 40,
    );
    expect(count(grid('prop.hangar', 'open'), 'S')).toBeGreaterThan(0);
    expect(count(grid('prop.hangar', 'shut_0'), 'S')).toBe(0);
    expect(diff('prop.hangar', 'shut_0', 'shut_1')).toBeGreaterThan(0);
  });

  it('lands four plates apart, centred on their tiles, with no salvage stake', () => {
    const plates = ['v0', 'v1', 'v2', 'v3'];
    for (let i = 0; i < plates.length; i++) {
      for (let j = i + 1; j < plates.length; j++) {
        expect(diff('prop.crash_plate', plates[i]!, plates[j]!)).toBeGreaterThan(30);
      }
    }
    expect(def('prop.crash_plate').anchor.x).toBe(def('prop.wreckage').anchor.x);
    expect(def('prop.crash_plate').anims).toBeUndefined(); // nothing blinks: not a job
  });
});

describe("A3M6's Dome Row at night", () => {
  it('opens Dome 1 warm, then frosts it in two steps', () => {
    const warm = (f: string): number => count(grid('prop.dome', f), 'HY');
    const frost = (f: string): number => count(grid('prop.dome', f), 'FI');
    expect(warm('open')).toBeGreaterThan(20);
    expect(warm('dark')).toBe(0);
    expect(frost('open')).toBe(0);
    expect(frost('frost_1')).toBeGreaterThan(10);
    expect(frost('frost_2')).toBeGreaterThan(frost('frost_1') * 1.5);
  });

  it('sits Pebble, in Bricks’s cap, on a rock that stays in the dark', () => {
    const g = grid('prop.pebble_rock', 'perch_0');
    expect(count(g, 'C')).toBeGreaterThan(3); // the cap's white top
    expect(count(g, 'de*+')).toBe(0); // no bright crystal steps on the rock
    expect(diff('prop.pebble_rock', 'perch_0', 'perch_1')).toBeGreaterThan(0);
    expect(diff('prop.pebble_rock', 'perch_0', 'perch_2')).toBeGreaterThan(0);
  });

  it('stacks the barricade along each axis with its IN board readable on both', () => {
    for (const f of ['x', 'y']) {
      expect(count(grid('prop.barricade', f), 'S'), f).toBeGreaterThan(15);
      expect(count(grid('prop.barricade', f), 'BCDE'), f).toBeGreaterThan(150);
    }
  });

  it('opens Zibzab’s crate on its parts; both keep the peeled sticker’s patch', () => {
    expect(count(grid('prop.crate', 'open'), '+*')).toBeGreaterThan(0);
    expect(count(grid('prop.crate', 'shut'), '+*')).toBe(0);
    for (const f of ['shut', 'open']) expect(count(grid('prop.crate', f), 'R')).toBeGreaterThan(0);
  });

  it('runs the 2-wide lane with no worn rim on the edge its two tiles share', () => {
    // The rim on an edge: '7' or '9' on that edge's mask-boundary pixels.
    const rim = (frame: string, edge: 'nw' | 'ne' | 'se' | 'sw'): number => {
      const g = grid('tile.path', frame);
      let n = 0;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 32; x++) {
          if (!inTileMask(x, y)) continue;
          const onEdge =
            !inTileMask(x - 1, y) ||
            !inTileMask(x + 1, y) ||
            !inTileMask(x, y - 1) ||
            !inTileMask(x, y + 1);
          const e = y < 8 ? (x < 16 ? 'nw' : 'ne') : x < 16 ? 'sw' : 'se';
          if (onEdge && e === edge && '79'.includes(g[y]?.[x] ?? '.')) n++;
        }
      }
      return n;
    };
    const shared = [
      ['wide_x_ne', 'sw'],
      ['wide_x_sw', 'ne'],
      ['wide_y_nw', 'se'],
      ['wide_y_se', 'nw'],
    ] as const;
    for (const [frame, edge] of shared) {
      expect(rim(frame, edge), frame).toBeLessThan(rim('v0', edge));
    }
  });
});
