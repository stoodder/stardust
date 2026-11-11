// M6's props and tiles for A3M1–A3M3 (T640c; art-direction §3 *Act III*, §6, §8 *Rift cracks*):
// the frames render picks say what they should at 1×: the rift's three statuses read apart, a
// shut door is dark and an open one lit, the dead turrets carry no live light, the shuttle's
// frames line up for its lift, and Act III's crystal stays a dim growth with a few bright tips.
import { describe, expect, it } from 'vitest';
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

/** Pixels that differ between two frames of a sprite. */
function diff(id: SpriteId, a: string, b: string): number {
  const ga = grid(id, a).join('');
  const gb = grid(id, b).join('');
  let n = 0;
  for (let i = 0; i < ga.length; i++) if (ga[i] !== gb[i]) n++;
  return n;
}

function anim(
  id: SpriteId,
  name: string,
): { frames: readonly string[]; fps: number; loop?: boolean } {
  const a = def(id).anims?.[name];
  if (a === undefined || !('frames' in a)) throw new Error(`${id} has no anim ${name}`);
  return a;
}

const EDGES = ['nw', 'ne', 'se', 'sw'] as const;

describe('the rift cracks (`tile.rift`)', () => {
  it('has a scar, a breathing telegraph, and an open tear per half tile, each brighter', () => {
    for (const e of EDGES) {
      const closed = count(grid('tile.rift', `closed_${e}`), '+*W');
      const opening = count(grid('tile.rift', `opening_${e}_0`), '+*W');
      const open = count(grid('tile.rift', `open_${e}_0`), '+*W');
      expect(closed).toBe(0); // the old scar never glows
      expect(opening).toBeGreaterThan(3);
      expect(open).toBeGreaterThan(opening * 2);
      // The loops move (under 3 Hz).
      expect(diff('tile.rift', `opening_${e}_0`, `opening_${e}_1`)).toBeGreaterThan(0);
      expect(diff('tile.rift', `open_${e}_0`, `open_${e}_1`)).toBeGreaterThan(0);
      expect(anim('tile.rift', `opening_${e}`).fps).toBeLessThanOrEqual(3);
      expect(anim('tile.rift', `open_${e}`).fps).toBeLessThanOrEqual(3);
    }
  });

  it("runs each half from the tile's centre to its edge's midpoint, so halves and tiles join", () => {
    const mid = { nw: [8, 4], ne: [24, 4], se: [24, 12], sw: [8, 12] } as const;
    for (const e of EDGES) {
      for (const f of [`opening_${e}_0`, `open_${e}_0`]) {
        const g = grid('tile.rift', f);
        const lit = (x: number, y: number): boolean =>
          [-1, 0, 1].some((dy) => (g[y + dy]?.[x] ?? '.') !== '.');
        expect(lit(15, 7) || lit(16, 7), `${f} centre`).toBe(true);
        const [mx, my] = mid[e];
        expect(lit(mx - (mx > 16 ? 1 : 0), my - 1) || lit(mx, my - 1), `${f} edge`).toBe(true);
      }
    }
  });
});

describe("A3M3's blast doors", () => {
  const WARM = 'OHY';
  it('opens lit warm from inside; shuts dark; seals under the red alarm', () => {
    expect(count(grid('prop.blast_door', 'open'), WARM)).toBeGreaterThan(80);
    expect(count(grid('prop.blast_door', 'open'), 'RS')).toBe(0);
    expect(count(grid('prop.blast_door', 'shut'), WARM)).toBe(0);
    expect(count(grid('prop.blast_door', 'shut'), 'RS+*')).toBe(0); // "shut and dark"
    expect(count(grid('prop.blast_door', 'sealed_0'), 'RS')).toBeGreaterThan(6);
    expect(count(grid('prop.blast_door', 'sealed_0'), WARM)).toBe(0);
  });

  it('runs shut once on the SEAL and then holds the alarm', () => {
    const closing = anim('prop.blast_door', 'closing');
    expect(closing.loop).toBe(false);
    expect(closing.frames.at(-1)).toBe('sealed_0');
    // The light narrows frame by frame.
    const warm = closing.frames.map((f) => count(grid('prop.blast_door', f), WARM));
    for (let i = 1; i < warm.length; i++) expect(warm[i]).toBeLessThan(warm[i - 1]!);
    expect(anim('prop.blast_door', 'sealed').fps).toBeLessThanOrEqual(3);
  });
});

describe("Sterling's shuttle", () => {
  it('stands on its pad with only its nav lights trading, and lifts from the same spot', () => {
    expect(diff('prop.shuttle', 'parked_0', 'parked_1')).toBeLessThanOrEqual(6);
    expect(anim('prop.shuttle', 'parked').fps).toBeLessThanOrEqual(3);
    expect(anim('prop.shuttle', 'lift').frames).toEqual(['ship_0', 'ship_1']);
    // The ship alone leaves the pad behind: none of the pad's bottom rows are drawn.
    const ship = grid('prop.shuttle', 'ship_0');
    const pad = grid('prop.shuttle', 'pad');
    const bottom = pad.length - 1 - pad.toReversed().findIndex((r) => r.replace(/\./g, '') !== '');
    expect(ship[bottom]?.replace(/[._]/g, '')).toBe('');
    // The hull in the air is the hull on the pad: its cabin windows sit on the same pixels.
    const cabin = (f: string): string =>
      grid('prop.shuttle', f)
        .map((r, y) =>
          r
            .split('')
            .map((c, x) => (c === 'H' ? `${x},${y}` : ''))
            .join(''),
        )
        .join('|');
    expect(cabin('ship_0')).toBe(cabin('parked_0'));
  });
});

describe('the dead turrets and the Preserve', () => {
  it('leaves no live light on a dead turret, only the crystal growing on it', () => {
    for (const f of ['v0', 'v1']) {
      expect(count(grid('prop.dead_turret', f), '+*')).toBe(0);
      expect(count(grid('prop.dead_turret', f), 'UVW')).toBeGreaterThan(6);
    }
    expect(diff('prop.dead_turret', 'v0', 'v1')).toBeGreaterThan(40);
  });

  it("tags one warren home and lights another's lantern", () => {
    expect(count(grid('prop.warren_home', 'v0'), '+*')).toBe(0);
    expect(count(grid('prop.warren_home', 'v1'), '+*')).toBeGreaterThan(0);
    expect(count(grid('prop.warren_home', 'v0'), 'W')).toBeGreaterThan(8); // the white tag
  });

  it("spells PRESERVE on the sign's plate", () => {
    expect(count(grid('prop.preserve_sign', 'v0'), '6')).toBeGreaterThan(60);
  });
});

describe("Act III's ground dressing", () => {
  it('grows crystal as a dim growth with a few bright tips, never a bright blob', () => {
    const g = grid('prop.flora', 'crystal');
    const body = count(g, 'abc');
    const bright = count(g, 'de*+');
    expect(body).toBeGreaterThan(30);
    expect(bright).toBeLessThanOrEqual(8);
  });

  it("puts out the domes' window slits but one, on emergency red", () => {
    expect(count(grid('prop.dome', 'dark'), '+*')).toBe(0);
    expect(count(grid('prop.dome', 'dark'), 'RS')).toBe(2);
    expect(count(grid('prop.emergency_lamp', 'v0'), 'RS')).toBeGreaterThan(6);
  });
});
