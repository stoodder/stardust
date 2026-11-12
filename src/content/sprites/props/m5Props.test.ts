// M5's props and tiles for A2M4–A2M6 (T540c; art-direction §6): the frames render picks say what
// they should at 1×, sit in the environment's value band, and keep the colour language (the vats'
// slurry unsung violet, the seams sung gold). Also T501k's fixes: drill spoil reads off the gold
// grass, and the Vrell towers' tier bases read apart.
import { describe, expect, it } from 'vitest';
import { bodyLuminance, contrastRatio } from '../../__fixtures__/valueBands.ts';
import { ENV_PALETTES } from '../../palettes/env.ts';
import { PALETTES } from '../../palettes/index.ts';
import { rgbOf } from '../../palettes/master.ts';
import type { SpriteId } from '../index.ts';
import { ALL_SPRITES } from '../all.ts';
import type { SpriteDef } from '../types.ts';

function def(id: SpriteId): SpriteDef {
  const d = ALL_SPRITES.find((s) => s.id === id);
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

function anim(id: SpriteId, name: string): { frames: readonly string[]; fps: number } {
  const a = def(id).anims?.[name];
  if (a === undefined || !('frames' in a)) throw new Error(`${id} has no anim ${name}`);
  return a;
}

/** The custom-legend letters of a sprite that map to colours of ramp `ramp` (e.g. `violet`). */
function lettersOf(id: SpriteId, ramp: string): string {
  return Object.entries(def(id).legend ?? {})
    .filter(([, c]) => c?.startsWith(`${ramp}.`))
    .map(([k]) => k)
    .join('');
}

/** The frame's body luminance in the palette it is drawn in on an Act II map. */
function value(id: SpriteId, frame: string, env: 'act2.gold' | 'act2.dusk'): number {
  const d = def(id);
  const env1 = d.variants?.includes(env) === true;
  return bodyLuminance(d, frame, env1 ? ENV_PALETTES[env] : PALETTES[d.palette]);
}

/** The white and teal of a fence run's sign plate. */
function fencePlate(f: string): number {
  return count(grid('prop.relocation_fence', f), '48');
}

describe("A2M4's plant", () => {
  it('fills the vats with churning cold violet slurry (unsung), never gold', () => {
    const churn = anim('prop.vat', 'churn');
    expect(churn.frames).toEqual(['v0', 'v1', 'v2']);
    expect(churn.fps).toBeLessThanOrEqual(3);
    const violet = lettersOf('prop.vat', 'violet');
    for (const f of churn.frames) expect(count(grid('prop.vat', f), violet)).toBeGreaterThan(80);
    expect(lettersOf('prop.vat', 'gold')).toBe('');
    expect(grid('prop.vat', 'v1')).not.toEqual(grid('prop.vat', 'v0'));
  });

  it('veins the seams with sung gold, never violet, and glints under 3 Hz', () => {
    expect(count(grid('prop.seam', 'v0'), lettersOf('prop.seam', 'gold'))).toBeGreaterThan(20);
    expect(lettersOf('prop.seam', 'violet')).toBe('');
    expect(anim('prop.seam', 'glint').fps).toBeLessThan(3);
  });

  it('signs Intake B with a big orange "B" over the hopper mouth', () => {
    expect(count(grid('prop.intake', 'v0'), 'c')).toBeGreaterThanOrEqual(8);
    expect(count(grid('prop.intake', 'v0'), 'K')).toBeGreaterThan(20); // the dark throat
  });

  it('wrecks two intake hoppers with the stake, its manifest, and the vats’ slurry', () => {
    for (const v of ['v4', 'v5']) {
      expect(grid('prop.wreckage', `${v}_lit`), v).not.toEqual(grid('prop.wreckage', v));
      expect(count(grid('prop.wreckage', v), 'O'), v).toBeGreaterThan(8);
      expect(count(grid('prop.wreckage', v), 'R'), v).toBeGreaterThan(0);
      expect(count(grid('prop.wreckage', v), 'F'), v).toBeGreaterThan(0);
      expect(count(grid('prop.wreckage', `${v}_half`), 'WVST'), v).toBeLessThan(
        count(grid('prop.wreckage', v), 'WVST'),
      );
      expect(anim('prop.wreckage', `blink_${v}`).fps).toBe(2);
      expect(anim('prop.wreckage', `idle_${v}`).frames).toHaveLength(8);
    }
    expect(grid('prop.wreckage', 'v4')).not.toEqual(grid('prop.wreckage', 'v5'));
  });

  it('opens a drain hatch in the road with violet in its throat', () => {
    const hatch = grid('tile.spawn', 'hatch');
    expect(hatch).not.toEqual(grid('tile.spawn', 'v0'));
    expect(count(hatch, 'UV')).toBeGreaterThan(8);
  });

  it('keeps a catwalk’s and a watchtower’s plate exactly the pad’s, with their own faces', () => {
    const pad = grid('tile.high_ground', 'v0');
    for (const f of ['catwalk', 'watchtower']) {
      const rows = grid('tile.high_ground', f);
      // Wherever the pad's plate is, the block's plate is the same pixel.
      pad.slice(0, 16).forEach((r, y) => {
        for (let x = 0; x < r.length; x++) {
          const ch = r.charAt(x);
          if ('KLMNPT'.includes(ch)) expect(rows[y]?.charAt(x), `${f} ${x},${y}`).toBe(ch);
        }
      });
      expect(rows, f).not.toEqual(grid('tile.high_ground', 'ledge'));
    }
    // The catwalk is an open trestle: the ground shows through its faces.
    const faces = (f: string): number => count(grid('tile.high_ground', f).slice(16), '.');
    expect(faces('catwalk')).toBeGreaterThan(faces('watchtower') + 40);
  });

  it('unloads the Tidybots: hose down, the remains pouring out, falling frame to frame', () => {
    const unload = anim('prop.tidybot', 'unload');
    expect(unload.frames).toEqual(['unload_0', 'unload_1', 'unload_2']);
    const d = def('prop.tidybot');
    for (const f of unload.frames) {
      const rows = grid('prop.tidybot', f);
      // Pink and gold flecks below the nozzle, down toward the anchor.
      expect(count(rows.slice(d.anchor.y - 6), 'PQ'), f).toBeGreaterThan(0);
    }
    expect(grid('prop.tidybot', 'unload_0')).not.toEqual(grid('prop.tidybot', 'unload_1'));
  });
});

describe("A2M5's Preserve Road and A2M6's wall", () => {
  it('signs the first run of relocation fencing; the next runs are plain', () => {
    expect(fencePlate('v0')).toBeGreaterThan(fencePlate('v1') + 15);
  });

  it('keeps the rig yard’s rig dead and unnumbered', () => {
    expect(count(grid('prop.rig', 'yard'), '+*')).toBe(0);
    expect(grid('prop.rig', 'yard')).not.toEqual(grid('prop.rig', 'nine'));
  });

  it('keeps the parapet low and on the tile’s back edge, and lights the gate lamps warm', () => {
    const d = def('prop.wall');
    for (const f of ['walk_0', 'walk_1']) {
      const rows = grid('prop.wall', f);
      const top = rows.findIndex((r) => /[^.]/.test(r));
      // No more than the wall and a merlon (9 px) over the tile's top vertex (anchor − 8).
      expect(d.anchor.y - 8 - top, f).toBeLessThanOrEqual(9);
      // Nothing on the tile's front half: the pad's plate and the walk stay clear.
      expect(
        rows
          .slice(d.anchor.y + 2)
          .join('')
          .replaceAll('.', ''),
        f,
      ).toBe('');
    }
    for (const f of ['lamp_w', 'lamp_e'])
      expect(count(grid('prop.wall', f), lettersOf('prop.wall', 'gold')), f).toBeGreaterThanOrEqual(
        5,
      );
    expect(grid('prop.wall', 'lamp_w')).not.toEqual(grid('prop.wall', 'lamp_e'));
  });

  it("puts Pebble asleep in the lettuce behind Dome 3's window", () => {
    const w = grid('prop.dome', 'window');
    expect(count(w, 'G')).toBeGreaterThan(3);
    expect(count(w, 'LM')).toBeGreaterThan(6);
    expect(count(w, 'PQ')).toBeGreaterThan(2);
  });
});

describe('value bands (art-direction §1, principle 1)', () => {
  // Scenery: the body of every M5 prop sits under the units' band (≈ 0.39 and up) in both Act II
  // palettes, so a prop never reads as an actor.
  const props: readonly (readonly [SpriteId, string])[] = [
    ['prop.vat', 'v0'],
    ['prop.intake', 'v0'],
    ['prop.seam', 'v0'],
    ['prop.wall', 'walk_0'],
    ['prop.wall', 'lamp_w'],
    ['prop.basin', 'v0'],
    ['prop.relocation_fence', 'v1'],
    ['prop.wreckage', 'v4'],
    ['prop.wreckage', 'v5'],
    ['prop.spoil', 'drill_0'],
  ];
  for (const env of ['act2.gold', 'act2.dusk'] as const) {
    it(`${env}: keeps every M5 prop's body under the units' band`, () => {
      for (const [id, f] of props) expect(value(id, f, env), `${id}:${f}`).toBeLessThan(0.36);
    });

    it(`${env}: sets drill spoil off the gold grass by value and by a cool hue (T501k)`, () => {
      const grass = bodyLuminance(def('tile.grass'), 'v0', ENV_PALETTES[env]);
      for (const f of ['drill_0', 'drill_1']) {
        expect(contrastRatio(grass, value('prop.spoil', f, env)), f).toBeGreaterThanOrEqual(1.4);
      }
      // Its heap ramp is cool (blue over red), where the grass is warm.
      for (const k of ['L', 'M', 'N'] as const) {
        const c = def('prop.spoil').legend?.[k];
        if (c === undefined) throw new Error(k);
        const rgb = rgbOf(c);
        expect(rgb.b, `${k} ${c}`).toBeGreaterThan(rgb.r);
      }
    });
  }
});

describe('Vrell tower bases read apart (T501k)', () => {
  it('patches each tower’s plinth its own way at every tier', () => {
    const ids = ['tower.zapcoil', 'tower.lookout', 'tower.harpoon', 'tower.crane'] as const;
    for (const t of ['t1', 't2', 't3']) {
      const bases = ids.map((id) => grid(id, t).join('\n'));
      expect(new Set(bases).size, t).toBe(ids.length);
    }
  });
});
