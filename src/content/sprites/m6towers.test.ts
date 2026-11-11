// M6's tower art (T640b; art-direction §4, §5, §6, §7, §8; tech-spec § Format rules): the Scuttle
// Den (a home) and the Hum Choir (a ring, with Thrum's variant) on the warren footing, the Stasis
// Bloom on the Aelari dais with its spec frames and pulse burst, the build icons, Underfoot's icon,
// the REVOKED stamps, and the `consumer`, `haste_aura` and retuned `burrower` glyphs.
import { describe, expect, it } from 'vitest';
import { bodyLuminance, contrastRatio, sprite } from '../__fixtures__/valueBands.ts';
import { ENV_PALETTES } from '../palettes/env.ts';
import { PALETTES } from '../palettes/index.ts';
import { SPRITES } from './index.ts';
import type { FramesAnim, SpriteDef } from './types.ts';

function grid(id: string, frame: string): readonly string[] {
  const f = sprite(id).frames[frame];
  if (f === undefined || !Array.isArray(f)) throw new Error(`${id}:${frame} is not a grid`);
  return f;
}

const solid = (c: string | undefined): boolean => c !== undefined && c !== '.' && c !== '_';

function bounds(rows: readonly string[]): { x0: number; x1: number; y0: number } {
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = -1;
  let y0 = Number.POSITIVE_INFINITY;
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (!solid(r[x])) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
    }
  });
  return { x0, x1, y0 };
}

function silhouetteDiff(a: readonly string[], b: readonly string[]): number {
  let n = 0;
  a.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (solid(r[x]) !== solid(b[y]?.[x])) n++;
  });
  return n;
}

function count(rows: readonly string[], chars: string): number {
  return rows
    .join('')
    .split('')
    .filter((c) => chars.includes(c)).length;
}

function anim(id: string, name: string): FramesAnim {
  const a = sprite(id).anims?.[name];
  if (a === undefined || !('frames' in a)) throw new Error(`${id}: no anim ${name}`);
  return a;
}

const TOWERS = [
  { id: 'tower.burrow', idle: 'peek', palette: 'skitterkin.ally' },
  { id: 'tower.choir', idle: 'hum', palette: 'skitterkin.ally' },
  { id: 'tower.bloom', idle: 'pulse', palette: 'aelari' },
] as const;

describe('M6 tower bases (tech-spec § Format rules)', () => {
  for (const { id, palette } of TOWERS) {
    it(`${id}: T2 is 4+ px wider than T1 and T3 6+ px taller, in its faction's palette`, () => {
      const [t1, t2, t3] = (['t1', 't2', 't3'] as const).map((t) => bounds(grid(id, t)));
      if (t1 === undefined || t2 === undefined || t3 === undefined) throw new Error('tiers');
      expect(t2.x1 - t2.x0).toBeGreaterThanOrEqual(t1.x1 - t1.x0 + 4);
      expect(t3.y0).toBeLessThanOrEqual(t2.y0 - 6);
      expect(sprite(id).palette).toBe(palette);
      expect(sprite(`${id}_head`).palette).toBe(palette);
    });

    it(`${id}: each spec base is as wide as T2 and its silhouette differs from T3 and the other`, () => {
      const t2 = bounds(grid(id, 't2'));
      for (const spec of ['spec_a', 'spec_b']) {
        const b = bounds(grid(id, spec));
        expect(b.x1 - b.x0, spec).toBeGreaterThanOrEqual(t2.x1 - t2.x0);
        expect(silhouetteDiff(grid(id, spec), grid(id, 't3')), spec).toBeGreaterThan(30);
      }
      expect(silhouetteDiff(grid(id, 'spec_a'), grid(id, 'spec_b'))).toBeGreaterThan(30);
    });
  }

  it('the Skitterkin towers stand on earth, with one glowworm lantern per tier', () => {
    for (const id of ['tower.burrow', 'tower.choir']) {
      // The lanterns are the footing's only gold lights from its top face down (rows 20+).
      const lights = (f: string): number => count(grid(id, f).slice(20), '*');
      expect(lights('t1'), id).toBe(1);
      expect(lights('t2'), id).toBe(2);
      expect(lights('t3'), id).toBe(3);
      expect(sprite(id).legend?.F, id).toBe('skin.b.3');
    }
  });

  it('every M6 tower reads a band above Act III’s road', () => {
    const road = bodyLuminance(sprite('tile.path'), 'tread_x', ENV_PALETTES.act3);
    for (const { id } of TOWERS) {
      const d: SpriteDef = sprite(id);
      for (const f of ['t1', 't3']) {
        const l = bodyLuminance(d, f, PALETTES[d.palette]);
        expect(contrastRatio(l, road), `${id}:${f}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('M6 tower heads: idle, never aimed (towers.md §8)', () => {
  for (const { id, idle } of TOWERS) {
    const head = `${id}_head`;
    it(`${head}: idles on \`${idle}\`, with each spec's own idle that changes the head`, () => {
      // render's headStyle: a head with no `se` frame plays its first anim.
      expect(Object.hasOwn(sprite(head).frames, 'se')).toBe(false);
      expect(Object.keys(sprite(head).anims ?? {})[0]).toBe(idle);
      const first = anim(head, idle).frames[0] ?? '';
      for (const spec of ['spec_a', 'spec_b']) {
        const a = anim(head, `${idle}_${spec}`);
        expect(a.frames.length, spec).toBeGreaterThanOrEqual(4);
        const f = a.frames[0] ?? '';
        expect(silhouetteDiff(grid(head, f), grid(head, first)), spec).toBeGreaterThan(12);
      }
      // Its idle moves: the frames aren't all one picture.
      const frames = new Set(anim(head, idle).frames.map((f) => grid(head, f).join('|')));
      expect(frames.size).toBeGreaterThan(1);
    });
  }

  it('the Den’s family peeks: eyes in the dark doorway, then a resident’s face out of it', () => {
    const eyes = grid('tower.burrow_head', 'peek_0');
    const out = grid('tower.burrow_head', 'peek_2');
    expect(count(eyes, 'w')).toBeGreaterThanOrEqual(2);
    expect(count(out, '9')).toBeGreaterThan(count(eyes, '9'));
    // Brave Hearts' resident wears the Champions' red headband; Big Family has a second door.
    expect(count(grid('tower.burrow_head', 'peek_spec_b_2'), 'R')).toBeGreaterThan(
      count(grid('tower.burrow_head', 'peek_2'), 'R'),
    );
    expect(count(grid('tower.burrow_head', 'peek_spec_a_0'), 'k')).toBeGreaterThan(
      count(eyes, 'k'),
    );
  });

  it('Thrum’s ring: every Choir idle has a Thrum twin with her mossed shell and shimmer', () => {
    for (const idle of ['hum', 'hum_spec_a', 'hum_spec_b']) {
      const plain = anim('tower.choir_head', idle);
      const theirs = anim('tower.choir_head', idle.replace('hum', 'hum_thrum'));
      expect(theirs.frames.length, idle).toBe(plain.frames.length);
      expect(theirs.fps, idle).toBe(plain.fps);
      const t = grid('tower.choir_head', theirs.frames[0] ?? '');
      const p = grid('tower.choir_head', plain.frames[0] ?? '');
      // Her steel plates (`S`, `V`) and the pink-gold shimmer in their seams (`P`).
      expect(count(t, 'SV'), idle).toBeGreaterThan(6);
      expect(count(t, 'P'), idle).toBeGreaterThan(1);
      expect(count(p, 'SVP'), idle).toBe(0);
    }
    // The first anim stays the plain ring (render's default idle).
    expect(Object.keys(sprite('tower.choir_head').anims ?? {})[0]).toBe('hum');
  });

  it('the Lullaby turns the notes moonlight blue; Rally Chorus raises paws', () => {
    expect(count(grid('tower.choir_head', 'hum_spec_a_0'), 'BC')).toBeGreaterThan(4);
    expect(count(grid('tower.choir_head', 'hum_0'), 'BC')).toBe(0);
    const raised = (f: string): number => bounds(grid('tower.choir_head', f)).y0;
    expect(raised('hum_spec_b_0')).toBeLessThan(raised('hum_0') + 1);
  });

  it('the Bloom’s pulse burst: a one-shot fire per look, about 0.3 s, flaring white', () => {
    for (const suffix of ['', '_spec_a', '_spec_b']) {
      const a = anim('tower.bloom_head', `fire${suffix}`);
      expect(a.loop, suffix).toBe(false);
      expect(a.frames.length / a.fps, suffix).toBeCloseTo(0.3, 5);
      const flash = grid('tower.bloom_head', a.frames[0] ?? '');
      const rest = grid('tower.bloom_head', `pulse${suffix}_0`);
      expect(count(flash, 'w*'), suffix).toBeGreaterThan(count(rest, 'w*'));
    }
    // Gravity Well's dark heart in its white ring.
    expect(count(grid('tower.bloom_head', 'pulse_spec_a_0'), 'x')).toBeGreaterThan(4);
  });
});

/** A stamp's top line (rows 2–6) and its bottom line (rows 8–12), its worn rim ink made whole. */
const top = (id: string): string => grid(id, 'icon').slice(2, 7).join('|');
const bottom = (id: string): string => grid(id, 'icon').slice(8, 13).join('|').replace(/Q/g, 'R');

describe('M6 icons (art-direction §5)', () => {
  it('draws the build icons and Underfoot’s from their own art, not borrowed shapes', () => {
    const borrowed = new Map([
      ['icon.tower.burrow', 'icon.tower.thumper'],
      ['icon.tower.choir', 'icon.tower.lookout'],
      ['icon.tower.bloom', 'icon.tower.prism'],
      ['icon.ability.underfoot', 'icon.ability.suppressing_fire'],
    ]);
    for (const [id, old] of borrowed) {
      expect(grid(id, 'icon').join('|'), id).not.toBe(grid(old, 'icon').join('|'));
    }
  });

  it('stamps LICENSE / UPLINK REVOKED in red on white paper', () => {
    const lic = sprite('icon.stamp.license_revoked');
    const up = sprite('icon.stamp.uplink_revoked');
    for (const d of [lic, up]) {
      expect(d.legend).toMatchObject({ P: 'white.0', R: 'red.3' });
      const rows = grid(d.id, 'icon');
      expect(count(rows, 'R'), d.id).toBeGreaterThan(80);
      expect(count(rows, 'P'), d.id).toBeGreaterThan(count(rows, 'R'));
    }
    // The two say different things on their top line (rows 2–6) and the same below.
    expect(top(lic.id)).not.toBe(top(up.id));
    expect(bottom(lic.id)).toBe(bottom(up.id));
  });
});

describe('M6 tell glyphs (art-direction §8)', () => {
  it('`consumer` is the Hollow’s: acid inward wedges round a dark mouth, in its pale outline', () => {
    const d = sprite('icon.tell.consumer');
    expect(d.palette).toBe('hollow');
    expect(PALETTES.hollow.outline).toBe('hollow.4');
    const rows = grid(d.id, 'icon');
    expect(count(rows, '+*')).toBeGreaterThan(10);
    expect(count(rows, 'k')).toBe(2);
    // Mirror-symmetric: the wedges press in from both sides.
    expect(rows.map((r) => r.split('').toReversed().join(''))).toEqual(rows);
  });

  it('`haste_aura` is `fast`’s orange double chevron over a swing arc, never `fast` itself', () => {
    const d = sprite('icon.tell.haste_aura');
    expect(Object.values(d.legend ?? {})).toEqual(
      expect.arrayContaining(['orange.2', 'orange.3', 'orange.4']),
    );
    expect(grid(d.id, 'icon').join('|')).not.toBe(grid('icon.tell.fast', 'icon').join('|'));
    expect(grid(d.id, 'icon').slice(4).join('')).toMatch(/B/);
  });

  it('`burrower` reads on Act III’s near-black ground: a white arrow into a gap in the ground', () => {
    const rows = grid('icon.tell.burrower', 'icon');
    // A white shaft, head and point (its shape alone, where the ink outline sinks into the dark).
    expect(count(rows.slice(0, 5), 'W')).toBeGreaterThanOrEqual(14);
    const ground = rows[5] ?? '';
    expect(ground.slice(2, 4)).toBe('..');
    expect(count([ground], 'D')).toBe(4);
    // Every lit pixel is far brighter than Act III's darkest ground.
    const dark = bodyLuminance(sprite('tile.path'), 'tread_x', ENV_PALETTES.act3);
    const l = bodyLuminance(sprite('icon.tell.burrower'), 'icon', PALETTES.everglow);
    expect(contrastRatio(l, dark)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the M6 placeholders are gone', () => {
  it('no M6 sprite borrows another’s frames any more', () => {
    const ids = SPRITES.map((s) => s.id);
    for (const id of ['tower.burrow', 'tower.choir', 'tower.bloom', 'icon.tell.consumer']) {
      expect(ids, id).toContain(id);
    }
    expect(grid('icon.tell.consumer', 'icon').join('|')).not.toBe(
      grid('icon.tell.hollow', 'icon').join('|'),
    );
    expect(grid('icon.tell.haste_aura', 'icon').join('|')).not.toBe(
      grid('icon.tell.fast', 'icon').join('|'),
    );
  });
});
