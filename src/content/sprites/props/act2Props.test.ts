// Act II's props and tiles (T440c; art-direction §6): the frames render picks exist and say what
// they should at 1×.
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

function anim(
  id: SpriteId,
  name: string,
): { frames: readonly string[]; fps: number; loop?: boolean } {
  const a = def(id).anims?.[name];
  if (a === undefined || !('frames' in a)) throw new Error(`${id} has no anim ${name}`);
  return a;
}

function glass(f: string): number {
  return count(grid('prop.rigs', f), 'RST');
}

function lit(f: string): number {
  return count(grid('prop.rigs', f), '*');
}

function tall(f: string): number {
  return grid('prop.rigs', f).findIndex((r) => /[^._]/.test(r));
}

function ink(f: string): number {
  return count(grid('tile.hush', f), 'K');
}

describe('Act II wreckage: the broken mining rigs (A2M1)', () => {
  it('has a derrick and a pump house, each with its stake, beacon, half frame, and crew log', () => {
    for (const v of ['v2', 'v3']) {
      expect(grid('prop.wreckage', `${v}_lit`), v).not.toEqual(grid('prop.wreckage', v));
      expect(count(grid('prop.wreckage', v), 'O'), v).toBeGreaterThan(4); // the stake's stripes
      expect(count(grid('prop.wreckage', v), 'R'), v).toBeGreaterThan(0); // the log's screen
      expect(count(grid('prop.wreckage', v), 'F'), v).toBeGreaterThan(0); // unsung spoil flecks
      expect(count(grid('prop.wreckage', `${v}_half`), 'WVST'), v).toBeLessThan(
        count(grid('prop.wreckage', v), 'WVST'),
      );
      expect(anim('prop.wreckage', `blink_${v}`).fps).toBe(2);
      const idle = anim('prop.wreckage', `idle_${v}`);
      expect(idle.frames.length / idle.fps, v).toBeGreaterThanOrEqual(1);
    }
    expect(grid('prop.wreckage', 'v2')).not.toEqual(grid('prop.wreckage', 'v3'));
  });
});

describe('Rigs 7 and 8 (A2M2, the Protect asset)', () => {
  const frames = ['intact', 'damaged', 'critical_0', 'critical_1', 'lost'];

  it('has a frame per damage band, each different, and the alarm blinks under 3 Hz', () => {
    for (let i = 1; i < frames.length; i++) {
      expect(grid('prop.rigs', frames[i]!), frames[i]).not.toEqual(
        grid('prop.rigs', frames[i - 1]!),
      );
    }
    const alarm = anim('prop.rigs', 'critical');
    expect(alarm.frames).toEqual(['critical_0', 'critical_1']);
    expect(alarm.fps).toBeLessThanOrEqual(3);
    expect(count(grid('prop.rigs', 'critical_0'), 'O')).toBeGreaterThan(0);
  });

  it('shows the damage: glass in the steel, then one derrick down, then both', () => {
    expect(glass('intact')).toBe(0);
    expect(glass('damaged')).toBeGreaterThan(0);
    expect(glass('critical_0')).toBeGreaterThan(glass('damaged'));
    // Lit beacons: two intact, one at the alarm's dark beat, none lost.
    expect(lit('intact')).toBe(2);
    expect(lit('critical_1')).toBe(0);
    expect(lit('lost')).toBe(0);
    expect(tall('lost')).toBeGreaterThan(tall('intact') + 8);
  });
});

describe("the Peeker's rock as a clickable object (A2M3, D115)", () => {
  it('holds Pebble up on the rock, looking about, and stands bare in the same rock', () => {
    const hold = anim('prop.peeker', 'hold');
    expect(hold.loop).not.toBe(false);
    expect(new Set(hold.frames)).toEqual(new Set(['hold_0', 'hold_1', 'hold_2']));
    const critter = 'KLMNQW';
    expect(count(grid('prop.peeker', 'hold_0'), critter)).toBeGreaterThan(
      count(grid('prop.peeker', 'peek_0'), critter),
    );
    expect(count(grid('prop.peeker', 'empty'), critter)).toBe(0);
    // The empty rock is the rock she held: the bottom rows match the hold frame's.
    const base = (f: string): readonly string[] => grid('prop.peeker', f).slice(-6);
    expect(base('empty')).toEqual(base('hidden'));
  });
});

describe('Evie peeling (Act II billboards)', () => {
  it('peels the same panel to the grimy board, in the same canvas', () => {
    const beaming = grid('prop.billboard', 'beaming');
    const peeling = grid('prop.billboard', 'peeling');
    expect(peeling.length).toBe(beaming.length);
    expect(count(peeling, 'JK')).toBeGreaterThan(40);
    expect(count(peeling, 'G')).toBeGreaterThan(0); // Evie's sun still smiles
  });
});

describe('Tidybots (render-only cleanup drones)', () => {
  it('flies, vacuums with its nozzle down at the anchor, and chimes once', () => {
    const d = def('prop.tidybot');
    expect(d.anchor.y).toBe(d.size.h - 1);
    expect(anim('prop.tidybot', 'fly').frames).toEqual(['fly_0', 'fly_1']);
    expect(anim('prop.tidybot', 'vacuum').frames).toHaveLength(3);
    expect(anim('prop.tidybot', 'chime').loop).toBe(false);
    const lowest = (f: string): number =>
      grid('prop.tidybot', f).findLastIndex((r) => /[cd]/.test(r));
    expect(lowest('vac_0')).toBeGreaterThanOrEqual(d.anchor.y - 2);
    expect(lowest('fly_0')).toBeLessThan(d.anchor.y - 6);
    expect(count(grid('prop.tidybot', 'chime_0'), '*')).toBeGreaterThan(
      count(grid('prop.tidybot', 'fly_0'), '*'),
    );
  });
});

describe('Act II ground: conduit, ledges, outcrops, the hush', () => {
  it('runs cold violet stardust through the conduit node, stepping each frame', () => {
    const conduit = anim('tile.power_node', 'conduit');
    expect(conduit.frames).toHaveLength(4);
    for (const f of conduit.frames)
      expect(count(grid('tile.power_node', f), 'UV')).toBeGreaterThan(12);
    expect(grid('tile.power_node', 'conduit_0')).not.toEqual(grid('tile.power_node', 'conduit_1'));
    expect(def('tile.power_node').legend).toMatchObject({ U: 'violet.3', V: 'violet.4' });
  });

  it('weaves thread-glass through an outcrop, and a ledge is rock', () => {
    expect(count(grid('tile.high_ground', 'outcrop'), 'GHI')).toBeGreaterThan(30);
    expect(count(grid('tile.high_ground', 'ledge'), 'GHI')).toBe(0);
    expect(grid('tile.high_ground', 'ledge')).not.toEqual(grid('tile.high_ground', 'v0'));
  });

  it('deepens the hush step by step', () => {
    expect(ink('d1')).toBeGreaterThan(0);
    expect(ink('d2')).toBeGreaterThan(ink('d1'));
    expect(ink('d3')).toBeGreaterThan(ink('d2'));
  });
});

describe('Act II decor', () => {
  it('draws the crew, the warrens with their eggs, and both kinds of spoil', () => {
    // Three hushed miners: three hard-hat brims.
    expect(grid('prop.crew_hut', 'v0').join('').split('44443').length - 1).toBe(3);
    for (const v of ['v0', 'v1']) expect(count(grid('prop.warren', v), 'E')).toBeGreaterThan(10);
    expect(count(grid('prop.spoil', 'drill_0'), 'UV')).toBeGreaterThan(0);
    expect(count(grid('prop.spoil', 'warren'), 'UV')).toBe(0); // a warren's earth is never unsung
    expect(grid('prop.rig', 'nine')).not.toEqual(grid('prop.rig', 'v0'));
    expect(count(grid('prop.rig', 'nine'), '+*')).toBe(0); // Rig Nine is dead
    expect(grid('prop.scarecrow', 'faded')).not.toEqual(grid('prop.scarecrow', 'v0'));
    expect(count(grid('prop.scarecrow', 'faded'), 'Yw')).toBeLessThan(
      count(grid('prop.scarecrow', 'v0'), 'Yw'),
    );
  });
});
