// M7's unit art (T740a; art-direction §4, §6, §8; design/enemies.md § 5.3, § 5.4, § 6): Everglow
// Security's part two, the Silencer, "Shareholder Value", the Gathering Maw (growth, parts, the
// merge), the leapers, bearers and militia, and the Jammed static and Purge's open panel. Each
// reads apart at 1×, sits in Act III's value bands, and draws every pose its view plays.
import { describe, expect, it } from 'vitest';
import { bodyLuminance, contrastRatio, sprite } from '../../__fixtures__/valueBands.ts';
import { ENV_PALETTES } from '../../palettes/env.ts';
import { PALETTES } from '../../palettes/index.ts';
import { luminance } from '../../palettes/color.ts';
import { rgbOf } from '../../palettes/master.ts';
import { SPRITES } from '../index.ts';
import type { SpriteDef } from '../types.ts';
import { GATHERING_MAW_STAGES } from './gathering_maw.ts';
import { M7_ALLIES, M7_UNIT_FX, M7_UNITS } from './m7.ts';
import { M7_UNIT_ICONS } from '../icons/m7_enemies.ts';

function grid(id: string, frame: string): readonly string[] {
  const f = sprite(id).frames[frame];
  if (f === undefined || !Array.isArray(f)) throw new Error(`${id}:${frame} is not a grid`);
  return f;
}

const solid = (c: string | undefined): boolean => c !== undefined && c !== '.' && c !== '_';

function count(rows: readonly string[], chars: string): number {
  return rows
    .join('')
    .split('')
    .filter((c) => chars.includes(c)).length;
}

function opaque(rows: readonly string[]): number {
  return rows
    .join('')
    .split('')
    .filter((c) => solid(c)).length;
}

function bounds(rows: readonly string[]): { w: number; h: number; x0: number; y0: number } {
  let x0 = Infinity;
  let x1 = -1;
  let y0 = Infinity;
  let y1 = -1;
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (!solid(r[x])) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  });
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0 };
}

/** The share of two SE walk silhouettes' union only one covers, laid at their ground points. */
function unlike(a: string, b: string): number {
  const da: SpriteDef = sprite(a);
  const db: SpriteDef = sprite(b);
  const ra = grid(a, 'walk_se_0');
  const rb = grid(b, 'walk_se_0');
  let both = 0;
  let either = 0;
  for (let y = -50; y < 10; y++) {
    for (let x = -40; x < 40; x++) {
      const pa = solid(ra[da.anchor.y + y]?.[da.anchor.x + x]);
      const pb = solid(rb[db.anchor.y + y]?.[db.anchor.x + x]);
      if (pa && pb) both++;
      if (pa || pb) either++;
    }
  }
  return 1 - both / either;
}

/** A unit's SE walk bounds. */
function walkBounds(id: string): ReturnType<typeof bounds> {
  return bounds(grid(id, 'walk_se_0'));
}

const FACINGS = ['se', 'sw', 'ne', 'nw'] as const;

function hasAnims(id: string, poses: readonly string[]): void {
  const anims = sprite(id).anims ?? {};
  for (const p of poses)
    for (const f of FACINGS) expect(anims[`${p}_${f}`], `${id} ${p}_${f}`).toBeDefined();
}

const act3 = ENV_PALETTES.act3;
const road = bodyLuminance(sprite('tile.path'), 'tread_x', act3);

const EVERGLOW = [
  'enemy.auditor',
  'enemy.associate',
  'enemy.liability',
  'enemy.gunship',
  'enemy.blackbudget',
  'enemy.shareholder_value',
] as const;
const GMAWS = [
  'enemy.gathering_maw',
  ...Array.from({ length: GATHERING_MAW_STAGES }, (_, i) => `enemy.gathering_maw_g${i + 1}`),
];
const HOLLOW = ['enemy.silencer', ...GMAWS, 'enemy.gathering_maw_part'];

describe('M7 registers real art for every unit (no placeholders left for T740a)', () => {
  it('registers the units, allies, overlays, and icons (placeholders/m7.ts is gone, T740b)', () => {
    const ids = new Set(SPRITES.map((d) => d.id as string));
    for (const d of [...M7_UNITS, ...M7_ALLIES, ...M7_UNIT_FX, ...M7_UNIT_ICONS])
      expect(ids.has(d.id), d.id).toBe(true);
  });

  it('gives each unit an icon, 14×14, in its own palette', () => {
    for (const d of M7_UNIT_ICONS) {
      expect(d.size, d.id).toEqual({ w: 14, h: 14 });
      const unit = sprite(d.id.replace('icon.', ''));
      expect(d.palette, d.id).toBe(unit.palette);
      expect(opaque(grid(d.id, 'icon')), d.id).toBeGreaterThan(40);
    }
  });

  it('keeps every colour hued: no pure black anywhere in its palettes or legends', () => {
    for (const d of [...M7_UNITS, ...M7_ALLIES, ...M7_UNIT_FX] as readonly SpriteDef[]) {
      const colors = [...Object.values(PALETTES[d.palette]), ...Object.values(d.legend ?? {})];
      for (const c of colors) expect(luminance(rgbOf(c)), `${d.id} ${c}`).toBeGreaterThan(0);
    }
  });
});

describe('Everglow Security, part two (enemies.md § 5.3)', () => {
  it('walks in the Everglow palette, lit well above the Act III road', () => {
    for (const id of EVERGLOW) {
      const d = sprite(id);
      expect(d.palette, id).toBe('everglow');
      hasAnims(id, ['walk']);
      expect(d.anims?.['death'], `${id}: it shuts down`).toBeUndefined();
      for (const f of ['walk_se_0', 'walk_ne_0']) {
        const l = bodyLuminance(d, f, PALETTES.everglow);
        expect(contrastRatio(l, road), `${id}:${f}`).toBeGreaterThanOrEqual(2.5);
      }
      const walk = Object.keys(d.frames).filter((n) => n.startsWith('walk_se_'));
      expect(new Set(walk.map((n) => grid(id, n).join('|'))).size, id).toBe(walk.length);
    }
  });

  it('read apart from each other, from M6’s walkers and from Gerald at 1×', () => {
    const walkers = [
      'enemy.compliance',
      'enemy.expediter',
      'enemy.auditor',
      'enemy.associate',
      'enemy.liability',
      'enemy.blackbudget',
    ];
    for (const [i, a] of walkers.entries())
      for (const b of walkers.slice(i + 1))
        expect(unlike(a, b), `${a} vs ${b}`).toBeGreaterThan(0.3);
    expect(unlike('enemy.gunship', 'enemy.gerald')).toBeGreaterThan(0.3);
    const b = walkBounds;
    // The Liability is the widest walker; the Associate low and wide; the Operative tall and thin.
    expect(b('enemy.liability').w).toBeGreaterThan(b('enemy.compliance').w + 6);
    expect(b('enemy.associate').w).toBeGreaterThan(b('enemy.associate').h);
    expect(b('enemy.blackbudget').h).toBeGreaterThan(b('enemy.blackbudget').w + 4);
  });

  it('the Auditor wears Prim’s orange LED eyes, and its ring tell raises an orange emitter', () => {
    hasAnims('enemy.auditor', ['walk', 'tell']);
    expect(count(grid('enemy.auditor', 'walk_se_0'), 'k')).toBeGreaterThanOrEqual(12); // visor
    expect(count(grid('enemy.auditor', 'walk_se_0'), 'd')).toBeGreaterThanOrEqual(2); // eyes
    for (const f of ['tell_se_0', 'tell_se_1', 'tell_ne_0']) {
      const top = grid('enemy.auditor', f).slice(0, 3);
      expect(count(top, 'de'), f).toBeGreaterThanOrEqual(5);
    }
  });

  it('the Associate wears the healer’s green ✚; the Gunship has two rotors and a claw', () => {
    expect(sprite('enemy.associate').legend).toMatchObject({ G: 'green.3', H: 'green.4' });
    for (const f of ['walk_se_0', 'walk_ne_1'])
      expect(count(grid('enemy.associate', f), 'GH'), f).toBe(5);
    const rotors = [0, 1, 2, 3].map((i) => grid('enemy.gunship', `walk_se_${i}`).slice(0, 4));
    expect(new Set(rotors.map((r) => r.join('|'))).size).toBe(4);
    expect(count(grid('enemy.gunship', 'walk_se_0').slice(-3), '3')).toBeGreaterThanOrEqual(5);
  });

  it('the Black Budget Operative asks for the baked `cloak` variant its faction never had', () => {
    expect(sprite('enemy.blackbudget').cloak).toBe(true);
    expect(sprite('enemy.compliance').cloak).toBeUndefined();
  });
});

describe('"Shareholder Value" (enemies.md § 6)', () => {
  const id = 'enemy.shareholder_value';

  it('draws every state the sim shows, the biggest Everglow body, within a boss canvas', () => {
    hasAnims(id, ['walk', 'tell', 'aim', 'panic', 'puff', 'flee']);
    const d = sprite(id);
    expect(d.size.w).toBeLessThanOrEqual(64);
    expect(d.size.h).toBeLessThanOrEqual(64);
    expect(opaque(grid(id, 'walk_se_0'))).toBeGreaterThan(
      3 * opaque(grid('enemy.liability', 'walk_se_0')),
    );
  });

  it('wears its four plates until the jettison, then its bare frame and a crashing chart', () => {
    for (const f of ['walk_se_0', 'tell_se_0', 'aim_se_0', 'puff_se_0']) {
      expect(count(grid(id, f), 'T'), f).toBeGreaterThan(100);
    }
    for (const f of ['panic_se_0', 'panic_ne_3']) {
      expect(count(grid(id, f), 'T'), f).toBe(0);
      expect(count(grid(id, f), 'e'), `${f} sparks`).toBeGreaterThanOrEqual(3);
    }
    expect(count(grid(id, 'walk_se_0'), 'PY')).toBeGreaterThanOrEqual(10); // the chart going up
    expect(count(grid(id, 'panic_se_0'), 'RQ')).toBeGreaterThanOrEqual(10); // and down
  });

  it('opens its hangar on a drone in the tell, and raises its dish with a red lens to aim', () => {
    expect(count(grid(id, 'tell_se_0'), '7')).toBeGreaterThan(count(grid(id, 'walk_se_0'), '7'));
    for (const f of ['aim_se_0', 'aim_ne_1']) {
      const top = grid(id, f).slice(0, 7);
      expect(count(top, 'RQ'), f).toBeGreaterThanOrEqual(8);
    }
    expect(count(grid(id, 'walk_se_0').slice(0, 7), 'RQ')).toBe(0);
  });
});

describe('the Hollow’s new shapes (enemies.md § 5.4, § 6)', () => {
  it('pale rim on dark bodies, the ink contour, acid eyes, unsung violet', () => {
    const rim = luminance(rgbOf(PALETTES.hollow.outline));
    for (const id of HOLLOW) {
      const d = sprite(id);
      expect(d.palette, id).toBe('hollow');
      expect(d.legend, id).toMatchObject({ K: 'ink.0', V: 'violet.3' });
      for (const f of ['walk_se_0', 'walk_ne_0']) {
        const rows = grid(id, f);
        const l = bodyLuminance(d, f, PALETTES.hollow);
        expect(contrastRatio(rim, l), `${id}:${f} rim`).toBeGreaterThanOrEqual(3);
        expect(l, `${id}:${f}`).toBeLessThan(0.15);
        expect(count(rows, '+*'), `${id}:${f} eyes`).toBeGreaterThanOrEqual(2);
        expect(count(rows, 'K'), `${id}:${f} contour`).toBeGreaterThan(10);
      }
      expect(count(grid(id, 'walk_se_0'), 'VU'), id).toBeGreaterThanOrEqual(1);
    }
  });

  it('the Silencer: tall, its black tendril behind it, uncoiled to the leading edge in its tell', () => {
    const id = 'enemy.silencer';
    hasAnims(id, ['walk', 'tell', 'heavy']);
    const b = bounds(grid(id, 'walk_se_0'));
    expect(b.h).toBeGreaterThan(b.w + 4);
    for (const f of ['tell_se_0', 'tell_se_1', 'tell_ne_0']) {
      const rows = grid(id, f);
      const w = rows[0]?.length ?? 0;
      expect(
        rows.some((r) => r[w - 1] === 'w'),
        `${f} pale tip at the edge`,
      ).toBe(true);
      expect(count(rows, 'K'), f).toBeGreaterThan(count(grid(id, 'walk_se_0'), 'K'));
    }
    expect(count(grid(id, 'heavy_se_0'), 'w')).toBeGreaterThanOrEqual(8);
    for (const other of ['enemy.mote', 'enemy.maw', 'enemy.undertow', 'enemy.fracture'])
      expect(unlike(id, other), other).toBeGreaterThan(0.3);
  });

  it('the Gathering Maw grows +10% a step, a face per absorb, and dwarfs the Maw', () => {
    for (const id of GMAWS) hasAnims(id, ['walk', 'tell', 'panic', 'puff']);
    const area = GMAWS.map((id) => opaque(grid(id, 'walk_se_0')));
    const w = GMAWS.map((id) => bounds(grid(id, 'walk_se_0')).w);
    for (let i = 1; i < GMAWS.length; i++) {
      expect(area[i], GMAWS[i]).toBeGreaterThan(area[i - 1] ?? 0);
      const pale = (k: number): number => count(grid(GMAWS[k] ?? '', 'walk_se_0'), 'w');
      expect(pale(i), GMAWS[i]).toBeGreaterThan(pale(i - 1));
    }
    const ratio = (w[GATHERING_MAW_STAGES] ?? 0) / (w[0] ?? 1);
    expect(ratio).toBeGreaterThan(1.35);
    expect(ratio).toBeLessThan(1.65);
    expect(area[0]).toBeGreaterThan(2 * opaque(grid('enemy.maw', 'walk_se_0')));
    for (const id of GMAWS) expect(sprite(id).size.w, id).toBeLessThanOrEqual(64);
  });

  it('its seams glow where it will tear; merged, they blaze and every mouth gapes', () => {
    const id = 'enemy.gathering_maw';
    const walkSeam = count(grid(id, 'walk_se_0'), 'U');
    expect(count(grid(id, 'walk_se_0'), 'VU')).toBeGreaterThanOrEqual(15);
    expect(count(grid(id, 'panic_se_0'), 'U')).toBeGreaterThan(walkSeam * 2);
    expect(count(grid(id, 'panic_se_0'), 'k')).toBeGreaterThan(count(grid(id, 'walk_se_0'), 'k'));
    const tell = grid(id, 'tell_se_0');
    const w = tell[0]?.length ?? 0;
    expect(tell.filter((r) => r[w - 1] === 'w').length).toBe(3);
  });

  it('a part is one torn lobe: bigger than a Maw, smaller than the whole, with a merge tell', () => {
    const id = 'enemy.gathering_maw_part';
    hasAnims(id, ['walk', 'tell', 'puff']);
    const part = opaque(grid(id, 'walk_se_0'));
    expect(part).toBeGreaterThan(opaque(grid('enemy.maw', 'walk_se_0')));
    expect(part).toBeLessThan(opaque(grid('enemy.gathering_maw', 'walk_se_0')) * 0.7);
    expect(count(grid(id, 'walk_se_0'), 'VU')).toBeGreaterThanOrEqual(4); // its torn side
  });
});

describe("M7's allies (maps.md § 5.4; towers.md § Sproing Pad)", () => {
  it('stand well above the Act III road', () => {
    for (const [id, f] of [
      ['ally.leaper', 'walk_se_0'],
      ['ally.leaper', 'walk_se_1'],
      ['ally.bearer', 'walk_se_0'],
      ['ally.bearer', 'walk_ne_0'],
      ['ally.militia', 'idle_se_0'],
      ['ally.militia', 'idle_ne_0'],
    ] as const) {
      const d = sprite(id);
      const l = bodyLuminance(d, f, PALETTES[d.palette]);
      expect(contrastRatio(l, road), `${id}:${f}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('a leaper tucks for the boing and stretches out, in its blue mushroom cap', () => {
    hasAnims('ally.leaper', ['walk', 'land']);
    expect(sprite('ally.leaper').palette).toBe('skitterkin.ally');
    const tuck = bounds(grid('ally.leaper', 'walk_se_0'));
    const stretch = bounds(grid('ally.leaper', 'walk_se_1'));
    expect(stretch.h).toBeGreaterThan(tuck.h);
    for (const f of ['walk_se_0', 'walk_ne_1', 'land_se_0'])
      expect(count(grid('ally.leaper', f), 'R'), f).toBeGreaterThanOrEqual(10);
    expect(unlike('ally.leaper', 'ally.swarmling')).toBeGreaterThan(0.3);
  });

  it('a bearer is the Hauler with its burden glowing unsung violet, warming to gold when sung', () => {
    hasAnims('ally.bearer', ['walk', 'sung']);
    const legend = sprite('ally.bearer').legend ?? {};
    for (const c of ['G', 'H', 'J', 'I'] as const) expect(legend[c], c).toMatch(/^violet\./);
    for (const c of ['A', 'B', 'F'] as const) expect(legend[c], c).toMatch(/^gold\./);
    expect(count(grid('ally.bearer', 'walk_se_0'), 'GHJI')).toBeGreaterThan(40);
    expect(count(grid('ally.bearer', 'sung_se_0'), 'GHJI')).toBe(0);
    expect(count(grid('ally.bearer', 'sung_se_0'), 'ABFN')).toBe(
      count(grid('ally.bearer', 'walk_se_0'), 'GHJI'),
    );
  });

  it('the militia hold a crate post, breathe, and fire with a flash', () => {
    hasAnims('ally.militia', ['idle', 'fire']);
    expect(grid('ally.militia', 'idle_se_0').join('|')).not.toBe(
      grid('ally.militia', 'idle_se_1').join('|'),
    );
    for (const f of ['fire_se_0', 'fire_ne_0'])
      expect(count(grid('ally.militia', f), 'e'), f).toBeGreaterThanOrEqual(4);
    expect(count(grid('ally.militia', 'idle_se_0'), 'L'), 'the lettuce').toBeGreaterThanOrEqual(2);
  });
});

describe("M7's overlays", () => {
  it('the Jammed static crackles in four different frames of dashes over an ink under-stroke', () => {
    const d = sprite('fx.jam_static');
    expect(Object.keys(d.frames)).toEqual(['s0', 's1', 's2', 's3']);
    const frames = Object.keys(d.frames).map((f) => grid('fx.jam_static', f));
    expect(new Set(frames.map((r) => r.join('|'))).size).toBe(4);
    for (const r of frames) {
      expect(count(r, '4*w'), 'dashes').toBeGreaterThanOrEqual(12);
      expect(count(r, 'x'), 'under-stroke').toBeGreaterThanOrEqual(12);
    }
  });

  it('the open panel hangs off a flank, its spark lit on one frame of two', () => {
    expect(count(grid('fx.open_panel', 'dark'), 'e')).toBe(0);
    expect(count(grid('fx.open_panel', 'spark'), 'e')).toBeGreaterThanOrEqual(2);
    expect(count(grid('fx.open_panel', 'dark'), 'T')).toBeGreaterThanOrEqual(5); // the door
  });
});
