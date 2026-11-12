// Act II's unit art (T440a; art-direction §4, §6, §8): the Mote and its Heavy walk, the woven
// Aelari constructs with their see-through gaps, and the fleeing runners' scurry, glance, and hop.
import { describe, expect, it } from 'vitest';
import { ALL_SPRITES } from '../all.ts';
import type { SpriteDef } from '../types.ts';
import { YOUNG_HEADROOM } from './sack.ts';

function def(id: string): SpriteDef {
  const d: SpriteDef | undefined = ALL_SPRITES.find((s) => s.id === id);
  if (d === undefined) throw new Error(`no sprite ${id}`);
  return d;
}

function grid(id: string, frame: string): readonly string[] {
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

function opaque(rows: readonly string[]): number {
  return rows
    .join('')
    .split('')
    .filter((c) => c !== '.' && c !== '_').length;
}

/** Transparent pixels the outside can't reach (4-connected): the holes in a silhouette. */
function holes(rows: readonly string[]): number {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const seen = new Set<number>();
  const stack: number[] = [];
  const push = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const k = y * w + x;
    if (seen.has(k) || rows[y]?.[x] !== '.') return;
    seen.add(k);
    stack.push(k);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length > 0) {
    const k = stack.pop() ?? 0;
    const x = k % w;
    const y = Math.floor(k / w);
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  return count(rows, '.') - seen.size;
}

describe('the Mote (art-direction §6)', () => {
  const walk = ['walk_se_0', 'walk_se_1', 'walk_se_2'].map((f) => grid('enemy.mote', f));

  it('is a Hollow shape: pale outline, drained greys, a few acid eyes, a violet speck', () => {
    const d = def('enemy.mote');
    expect(d.palette).toBe('hollow');
    expect(d.outline).toBe('auto');
    for (const f of walk) {
      expect(count(f, '+*'), 'acid eyes, never many').toBeGreaterThanOrEqual(2);
      expect(count(f, '+*')).toBeLessThanOrEqual(4);
      expect(count(f, 'VU'), 'the unsung speck').toBe(1);
      expect(count(f, '0123K'), 'the drained body').toBeGreaterThan(30);
      // Its edge inked `ink.0` under the pale outline (U12), so clusters stay separate shapes.
      expect(count(f, 'K'), 'the ink contour').toBeGreaterThanOrEqual(16);
    }
    // Small: it takes the small contact shadow.
    expect(d.size.w).toBeLessThanOrEqual(15);
  });

  it('moves wrong: every walk frame differs, legs and missing pixels and all', () => {
    expect(new Set(walk.map((f) => f.join('|'))).size).toBe(walk.length);
  });

  it('turns Heavy: swollen, the victim pale inside, a doubled outline, speed lines', () => {
    for (const facing of ['se', 'ne']) {
      for (let i = 0; i < 3; i++) {
        const heavy = grid('enemy.mote', `heavy_${facing}_${i}`);
        const plain = grid('enemy.mote', `walk_${facing}_${i}`);
        expect(opaque(heavy), `heavy_${facing}_${i}`).toBeGreaterThan(opaque(plain));
        // The victim: pale (hi) pixels inside the body; the inner ring of the 2 px outline.
        expect(count(heavy, 'w')).toBeGreaterThanOrEqual(8);
        expect(count(heavy, 'x')).toBeGreaterThan(20);
      }
    }
    expect(def('enemy.mote').anims?.['heavy_sw']).toEqual({ mirrorOf: 'heavy_se' });
  });

  it('reaches in its hush tell, and leaves no body when it dies (it unravels)', () => {
    for (const f of ['se', 'ne']) {
      expect(def('enemy.mote').anims?.[`tell_${f}`]).toBeDefined();
      // The limbs reach out ahead of it, to the canvas edge, where its walk barely goes.
      const reach = grid('enemy.mote', `tell_${f}_0`);
      const ahead = (rows: readonly string[]): number =>
        count(
          rows.map((r) => r.slice(-3)),
          '0123w',
        );
      expect(ahead(reach)).toBeGreaterThan(ahead(walk[0] ?? []));
    }
    expect(def('enemy.mote').anims?.['death']).toBeUndefined();
  });
});

describe('the Aelari constructs (woven, never plated: art-direction §4)', () => {
  const units = ['enemy.glimmer', 'enemy.weft_warden', 'enemy.lightwing'] as const;

  it('show the ground through real gaps in the weave, outlined in blue on the outside only', () => {
    for (const id of units) {
      const d = def(id);
      expect(d.palette, id).toBe('aelari');
      expect(d.outline ?? 'none', id).toBe('none');
      for (const [name, f] of Object.entries(d.frames)) {
        if (!Array.isArray(f)) continue;
        const rows: readonly string[] = f;
        expect(holes(rows), `${id}:${name}`).toBeGreaterThanOrEqual(6);
        // The outline rings the outside: no outline pixel sits in a gap.
        expect(count(rows, 'x'), `${id}:${name}`).toBeGreaterThan(20);
        // Lit from inside: a white-hot heart or its teal glow.
        expect(count(rows, '+*'), `${id}:${name}`).toBeGreaterThan(0);
      }
    }
  });

  it('read apart at 1×: the Warden towers over the Glimmer, the Lightwing outspans the Puffwing', () => {
    expect(def('enemy.weft_warden').size.h).toBeGreaterThan(def('enemy.glimmer').size.h + 4);
    expect(def('enemy.lightwing').size.w).toBeGreaterThan(def('enemy.puffwing').size.w);
    // The Lightwing beats its wings: three distinct strokes.
    const strokes = ['walk_se_0', 'walk_se_1', 'walk_se_2'].map((f) => grid('enemy.lightwing', f));
    expect(new Set(strokes.map((f) => f.join('|'))).size).toBe(3);
  });

  it('hum: their two glide frames differ', () => {
    for (const id of units) {
      expect(grid(id, 'walk_se_0').join('|'), id).not.toBe(grid(id, 'walk_se_1').join('|'));
    }
  });
});

/** The topmost row with tuft (moss) in it. */
function topOf(rows: readonly string[]): number {
  return rows.findIndex((r) => /[a-e]/.test(r));
}

/** The eyes in the top rows: the young's, in the sack's mouth, above the Hauler's own face. */
/** The young's eyes (custom `K`, sack.ts YOUNG_HEAD) over the sack's rim, in the top rows. */
function eyesUp(rows: readonly string[]): number {
  return count(rows.slice(0, 10), 'K');
}

describe('the fleeing runners (art-direction §6, §8 Skittish)', () => {
  const fleeing = ALL_SPRITES.filter((s) => s.id.startsWith('enemy.') && s.id.endsWith('_fleeing')).map(
    (s) => s.id,
  );

  it('draws a fleeing body for each Skitterkin that runs in Act II', () => {
    expect(fleeing.toSorted()).toEqual(
      [
        'enemy.brood_hauler_fleeing',
        'enemy.bunchling_fleeing',
        'enemy.digger_fleeing',
        'enemy.elder_fleeing',
        'enemy.nibbler_fleeing',
        'enemy.puffwing_fleeing',
        'enemy.youngling_fleeing',
        'enemy.zoomer_fleeing',
      ].toSorted(),
    );
  });

  it('keeps its body’s size, anchor, and shadow, and adds the glance and the panic hop', () => {
    for (const id of fleeing) {
      const d = def(id);
      const base = def(id.replace(/_fleeing$/, ''));
      // Its body's canvas with room on top for the hop: the same width and ground point (the
      // Hauler's with room for its young's heads too, D134).
      const room = 2 + (id === 'enemy.brood_hauler_fleeing' ? YOUNG_HEADROOM : 0);
      expect(d.size, id).toEqual({ w: base.size.w, h: base.size.h + room });
      expect(d.anchor, id).toEqual({ x: base.anchor.x, y: base.anchor.y + room });
      expect(d.variants, id).toBeUndefined();
      for (const a of ['walk', 'glance', 'panic']) {
        for (const f of ['se', 'sw', 'ne', 'nw'])
          expect(d.anims?.[`${a}_${f}`], `${id} ${a}_${f}`).toBeDefined();
      }
      expect(d.anims?.['death'], id).toMatchObject({ loop: false });
      // The hop: clear of the ground (its feet's row empty), with sweat flying.
      const hop = grid(id, 'panic_se_0');
      const walk = grid(id, 'walk_se_0');
      const feet = walk.findLastIndex((r) => /[^._]/.test(r));
      expect(/[^._]/.test(hop[feet] ?? ''), `${id} lands its feet`).toBe(false);
      expect(count(grid(id, 'glance_se_0'), 'Z'), id).toBeGreaterThan(0);
      expect(grid(id, 'glance_se_0').join('|'), id).not.toBe(walk.join('|'));
    }
  });

  it('flattens the tuft: none of it stands above the crown where it stood before', () => {
    for (const id of [
      'enemy.nibbler_fleeing',
      'enemy.zoomer_fleeing',
      'enemy.puffwing_fleeing',
    ] as const) {
      const scurry = grid(id, 'walk_se_0');
      const walk = grid(id.replace(/_fleeing$/, ''), 'walk_se_0');
      expect(topOf(scurry), id).toBeGreaterThan(topOf(walk));
    }
  });

  it("shows the Hauler's young in its untied sack, eyes and all", () => {
    const se = grid('enemy.brood_hauler_fleeing', 'walk_se_0');
    const act1 = grid('enemy.brood_hauler', 'walk_se_0');
    // Three young over the rim (D134), two eyes each, above the Hauler's own face, in every walk
    // frame and both facings; the middle one jostles against the bag between the two steps.
    expect(eyesUp(se)).toBe(6);
    expect(eyesUp(act1)).toBe(0);
    for (const f of ['walk_se_1', 'walk_ne_0', 'walk_ne_1']) {
      expect(eyesUp(grid('enemy.brood_hauler_fleeing', f)), f).toBe(6);
    }
    // Each head wears the youngling's seedling (green leaves over a stem).
    expect(count(se.slice(0, 6), 'L')).toBeGreaterThanOrEqual(6);
    // Behind them the sack is lit pale: more lit burlap than the Act I sack shows.
    expect(count(se, 'G')).toBeGreaterThan(count(act1, 'G'));
  });
});
