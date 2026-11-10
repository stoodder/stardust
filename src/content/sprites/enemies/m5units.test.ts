// M5's unit art (T540a, T501d; art-direction §4, §6, §8): the Veilwalker, Blinkstrider, Aegis
// Cantor and Glimmer-shard woven like every Aelari construct, the Fracture, its Shard and the Rift
// Moth drawn in the Hollow's grammar, every Aelari construct's fray, and the refugees with Pebble
// among them. Silhouettes must read apart at 1×, and every body sits in Act II's value bands.
import { describe, expect, it } from 'vitest';
import {
  bodyLuminance,
  contrastRatio,
  slotLuminance,
  sprite,
} from '../../__fixtures__/valueBands.ts';
import { ENV_PALETTES } from '../../palettes/env.ts';
import { PALETTES } from '../../palettes/index.ts';
import type { SpriteDef } from '../types.ts';

function grid(id: string, frame: string): readonly string[] {
  const f = sprite(id).frames[frame];
  if (f === undefined || !Array.isArray(f)) throw new Error(`${id}:${frame} is not a grid`);
  return f;
}

function count(rows: readonly string[], chars: string): number {
  return rows
    .join('')
    .split('')
    .filter((c) => chars.includes(c)).length;
}

const solid = (c: string | undefined): boolean => c !== undefined && c !== '.' && c !== '_';

function opaque(rows: readonly string[]): number {
  return rows
    .join('')
    .split('')
    .filter((c) => solid(c)).length;
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
    push((k % w) - 1, Math.floor(k / w));
    push((k % w) + 1, Math.floor(k / w));
    push(k % w, Math.floor(k / w) - 1);
    push(k % w, Math.floor(k / w) + 1);
  }
  return count(rows, '.') - seen.size;
}

/** The opaque box: its width and height. */
function bounds(rows: readonly string[]): { w: number; h: number; x0: number; x1: number } {
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = -1;
  let y0 = Number.POSITIVE_INFINITY;
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
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, x1 };
}

/**
 * How unlike two silhouettes are, laid over each other at their ground points: the share of
 * their union that only one of them covers (0 the same shape, 1 no overlap at all).
 */
function unlike(a: string, b: string): number {
  const da: SpriteDef = sprite(a);
  const db: SpriteDef = sprite(b);
  const ra = grid(a, 'walk_se_0');
  const rb = grid(b, 'walk_se_0');
  let both = 0;
  let either = 0;
  for (let y = -40; y < 10; y++) {
    for (let x = -30; x < 30; x++) {
      const pa = solid(ra[da.anchor.y + y]?.[da.anchor.x + x]);
      const pb = solid(rb[db.anchor.y + y]?.[db.anchor.x + x]);
      if (pa && pb) both++;
      if (pa || pb) either++;
    }
  }
  return 1 - both / either;
}

const FACINGS = ['se', 'sw', 'ne', 'nw'] as const;

/** A unit's body area (opaque pixels) in its SE walk. */
function area(id: string): number {
  return opaque(grid(id, 'walk_se_0'));
}

const NEW_AELARI = [
  'enemy.veilwalker',
  'enemy.blinkstrider',
  'enemy.cantor',
  'enemy.glimmer_shard',
] as const;
const NEW_HOLLOW = ['enemy.fracture', 'enemy.fracture_shard', 'enemy.riftmoth'] as const;
/** Every Aelari construct that frays when hurt (the bosses draw their own hurt). */
const FRAYING = ['enemy.glimmer', 'enemy.weft_warden', 'enemy.lightwing', ...NEW_AELARI] as const;

describe("M5's Aelari constructs (woven, never plated: art-direction §4)", () => {
  it('show the ground through real gaps, outlined in blue on the outside only, lit inside', () => {
    for (const id of NEW_AELARI) {
      const d = sprite(id);
      expect(d.palette, id).toBe('aelari');
      expect(d.outline ?? 'none', id).toBe('none');
      for (const [name, f] of Object.entries(d.frames)) {
        if (!Array.isArray(f)) continue;
        const rows: readonly string[] = f;
        expect(holes(rows), `${id}:${name}`).toBeGreaterThanOrEqual(4);
        expect(count(rows, 'x'), `${id}:${name}`).toBeGreaterThan(14);
        expect(count(rows, '+*'), `${id}:${name}`).toBeGreaterThan(0);
      }
    }
  });

  it('hum: their glide frames differ', () => {
    for (const id of NEW_AELARI) {
      expect(grid(id, 'walk_se_0').join('|'), id).not.toBe(grid(id, 'walk_se_1').join('|'));
    }
  });

  it('read apart at 1×: a Veilwalker from a Glimmer, a Cantor from a Weft Warden', () => {
    expect(unlike('enemy.veilwalker', 'enemy.glimmer')).toBeGreaterThan(0.4);
    expect(unlike('enemy.cantor', 'enemy.weft_warden')).toBeGreaterThan(0.4);
    expect(unlike('enemy.blinkstrider', 'enemy.glimmer')).toBeGreaterThan(0.4);
    expect(unlike('enemy.glimmer_shard', 'enemy.glimmer')).toBeGreaterThan(0.3);
    // The Veilwalker is the only one draped in emerald; the Glimmer is sapphire.
    const vw = grid('enemy.veilwalker', 'walk_se_0');
    const gl = grid('enemy.glimmer', 'walk_se_0');
    expect(count(vw, '56789')).toBeGreaterThan(count(vw, '01234'));
    expect(count(gl, '56789')).toBeLessThan(count(gl, '01234'));
    // The Cantor's open lyre has far more see-through than the Warden's woven cloth.
    expect(holes(grid('enemy.cantor', 'walk_se_0'))).toBeGreaterThan(
      holes(grid('enemy.weft_warden', 'walk_se_0')),
    );
    // The Glimmer-shard is a small piece, smaller than the Glimmer it isn't.
    expect(opaque(grid('enemy.glimmer_shard', 'walk_se_0'))).toBeLessThan(
      opaque(grid('enemy.glimmer', 'walk_se_0')),
    );
  });

  it('strides on long legs, and coils low and long to blink', () => {
    const d = sprite('enemy.blinkstrider');
    for (const f of FACINGS) expect(d.anims?.[`blink_${f}`], `blink_${f}`).toBeDefined();
    const walk = grid('enemy.blinkstrider', 'walk_se_0');
    const coiled = grid('enemy.blinkstrider', 'blink_se_0');
    // Tall on its legs; pressed low to spring (its top row well down), thrust further ahead.
    expect(bounds(walk).h).toBeGreaterThanOrEqual(24);
    expect(bounds(coiled).h).toBeLessThan(bounds(walk).h - 6);
    expect(bounds(coiled).x1).toBeGreaterThan(bounds(walk).x1);
    // Its four stride steps all differ.
    const steps = [0, 1, 2, 3].map((i) => grid('enemy.blinkstrider', `walk_se_${i}`).join('|'));
    expect(new Set(steps).size).toBe(4);
  });

  it('the Cantor sounds: its strings bow one way, then the other', () => {
    const beats = [0, 1, 2].map((i) => grid('enemy.cantor', `walk_se_${i}`).join('|'));
    expect(new Set(beats).size).toBe(3);
  });
});

describe('the Aelari fray (art-direction §4; T501d)', () => {
  it('gives every construct fray1_ and fray2_ looks in four facings, as long as its walk', () => {
    for (const id of FRAYING) {
      const anims = sprite(id).anims ?? {};
      for (const band of ['fray1', 'fray2']) {
        for (const f of FACINGS) expect(anims[`${band}_${f}`], `${id} ${band}_${f}`).toBeDefined();
        for (const f of ['se', 'ne']) {
          const walk = anims[`walk_${f}`];
          const fr = anims[`${band}_${f}`];
          if (walk === undefined || fr === undefined || !('frames' in walk) || !('frames' in fr))
            throw new Error(`${id} ${band}_${f}`);
          expect(fr.frames.length, `${id} ${band}_${f}`).toBe(walk.frames.length);
          expect(fr.fps, `${id} ${band}_${f}`).toBe(walk.fps);
        }
      }
    }
  });

  it('pulls loose thread-ends out past the edge, more when worse hurt, the same size canvas', () => {
    for (const id of FRAYING) {
      for (const name of Object.keys(sprite(id).frames).filter((n) => n.startsWith('walk_'))) {
        const walk = grid(id, name);
        const f1 = grid(id, name.replace(/^walk_/, 'fray1_'));
        const f2 = grid(id, name.replace(/^walk_/, 'fray2_'));
        expect(f1.length, `${id}:${name}`).toBe(walk.length);
        expect(f1[0]?.length, `${id}:${name}`).toBe(walk[0]?.length);
        // Thread-ends where the walk frame is clear (outside its outline).
        const outside = (rows: readonly string[]): number =>
          rows.reduce(
            (n, r, y) =>
              n + r.split('').filter((c, x) => solid(c) && c !== 'x' && !solid(walk[y]?.[x])).length,
            0,
          );
        const changed = (rows: readonly string[]): number =>
          rows.reduce((n, r, y) => n + r.split('').filter((c, x) => c !== walk[y]?.[x]).length, 0);
        expect(outside(f1), `${id}:${name} fray1`).toBeGreaterThan(0);
        expect(outside(f2), `${id}:${name} fray2`).toBeGreaterThanOrEqual(outside(f1));
        expect(changed(f2), `${id}:${name} fray2`).toBeGreaterThan(changed(f1));
        // Badly hurt, more of the ground shows through.
        expect(holes(f2), `${id}:${name} fray2 holes`).toBeGreaterThanOrEqual(holes(walk));
      }
    }
  });
});

describe("M5's Hollow units (art-direction §4 The Hollow)", () => {
  it('are Hollow shapes: pale outline, drained greys, a few acid eyes, unsung violet', () => {
    for (const id of NEW_HOLLOW) {
      const d = sprite(id);
      expect(d.palette, id).toBe('hollow');
      expect(d.outline, id).toBe('auto');
      for (const f of ['walk_se_0', 'walk_se_1', 'walk_ne_0']) {
        const rows = grid(id, f);
        expect(count(rows, '+*'), `${id}:${f} acid eyes`).toBeGreaterThanOrEqual(2);
        expect(count(rows, 'VU'), `${id}:${f} unsung violet`).toBeGreaterThanOrEqual(1);
        expect(count(rows, '0123'), `${id}:${f} drained body`).toBeGreaterThan(30);
      }
    }
    // The Fracture's crack and the Shard's broken edge glow down their length.
    expect(count(grid('enemy.fracture', 'walk_se_0'), 'VU')).toBeGreaterThanOrEqual(8);
    expect(count(grid('enemy.fracture_shard', 'walk_se_0'), 'VU')).toBeGreaterThanOrEqual(5);
  });

  it('move wrong: every walk frame differs', () => {
    for (const id of NEW_HOLLOW) {
      const frames = Object.keys(sprite(id).frames).filter((n) => n.startsWith('walk_se_'));
      const set = new Set(frames.map((f) => grid(id, f).join('|')));
      expect(set.size, id).toBe(frames.length);
    }
  });

  it('turn Heavy and reach, as every Hollow unit that hushes', () => {
    for (const id of NEW_HOLLOW) {
      const anims = sprite(id).anims ?? {};
      for (const pose of ['heavy', 'tell']) {
        for (const f of FACINGS) expect(anims[`${pose}_${f}`], `${id} ${pose}_${f}`).toBeDefined();
      }
      const heavy = grid(id, 'heavy_se_0');
      expect(opaque(heavy), id).toBeGreaterThan(opaque(grid(id, 'walk_se_0')));
      expect(count(heavy, 'w'), `${id} the victim`).toBeGreaterThanOrEqual(8);
      // The reach goes to the leading edge.
      const tell = grid(id, 'tell_se_0');
      const w = tell[0]?.length ?? 0;
      expect(
        tell.some((r) => solid(r[w - 1])),
        `${id} reaches`,
      ).toBe(true);
      expect(anims['death'], id).toBeUndefined();
    }
  });

  it('read apart: a Shard is half a Fracture, bigger than a Mote; shadows by size', () => {
    expect(area('enemy.fracture_shard')).toBeLessThan(area('enemy.fracture'));
    expect(area('enemy.fracture_shard')).toBeGreaterThan(area('enemy.mote') * 0.8);
    // Small, medium contact shadows (shadows.ts sizes by authored width).
    expect(sprite('enemy.fracture_shard').size.w).toBeLessThanOrEqual(15);
    expect(sprite('enemy.fracture').size.w).toBeLessThanOrEqual(20);
    expect(sprite('enemy.fracture').size.w).toBeGreaterThan(15);
  });

  it("the Rift Moth's wings beat out of step, and it folds into a rift to phase", () => {
    const beat = [0, 1, 2, 3].map((i) => grid('enemy.riftmoth', `walk_se_${i}`).join('|'));
    expect(new Set(beat).size).toBe(4);
    const anims = sprite('enemy.riftmoth').anims ?? {};
    for (const f of FACINGS) expect(anims[`phase_${f}`], `phase_${f}`).toBeDefined();
    const flying = bounds(grid('enemy.riftmoth', 'walk_se_1'));
    for (const f of ['phase_se_0', 'phase_se_1', 'phase_ne_0']) {
      const blade = grid('enemy.riftmoth', f);
      // Edge-on: a tall, thin blade, split by the violet seam.
      expect(bounds(blade).w, f).toBeLessThanOrEqual(9);
      expect(bounds(blade).w, f).toBeLessThan(flying.w / 2);
      expect(count(blade, 'VU'), f).toBeGreaterThanOrEqual(8);
    }
    // Wider than the Lightwing's woven glide? No: a different shape, not a bigger one.
    expect(unlike('enemy.riftmoth', 'enemy.lightwing')).toBeGreaterThan(0.3);
  });
});

describe('the refugees and Pebble (design/maps.md § 5.2)', () => {
  it('walk in the allies’ palette in four facings', () => {
    for (const id of ['ally.refugee', 'ally.pebble']) {
      const d = sprite(id);
      expect(d.palette, id).toBe('skitterkin');
      expect(d.variants, id).toContain('skitterkin.ally');
      for (const f of FACINGS) expect(d.anims?.[`walk_${f}`], `${id} walk_${f}`).toBeDefined();
    }
    for (const f of FACINGS) expect(sprite('ally.refugee').anims?.[`carry_${f}`]).toBeDefined();
  });

  it('carry their belongings; Pebble wears the cap, her green seedling through it', () => {
    expect(count(grid('ally.refugee', 'walk_se_0'), 'GHJ')).toBeGreaterThanOrEqual(15);
    for (const f of ['walk_se_0', 'walk_se_1', 'walk_ne_0']) {
      const p = grid('ally.pebble', f);
      expect(count(p, 'C'), f).toBeGreaterThanOrEqual(5); // the cap's white top
      expect(count(p, 'SR'), f).toBeGreaterThanOrEqual(4); // its crimped skirt
      expect(count(p, 'LMN'), f).toBeGreaterThanOrEqual(5); // the seedling, green in any palette
    }
    expect(sprite('ally.pebble').legend).toMatchObject({ M: 'green.3', N: 'green.4' });
    // She's a youngling among adults.
    expect(opaque(grid('ally.pebble', 'walk_se_0'))).toBeLessThan(
      opaque(grid('ally.refugee', 'walk_se_0')),
    );
  });
});

describe("M5's units in Act II's value bands (art-direction §1, §3; D127)", () => {
  for (const env of ['act2.gold', 'act2.dusk'] as const) {
    const palette = ENV_PALETTES[env];
    const grass = bodyLuminance(sprite('tile.grass'), 'v0', palette);
    const path = bodyLuminance(sprite('tile.path'), 'tread_x', palette);

    it(`${env}: the Hollow sits well below the ground it crosses, Heavy too`, () => {
      for (const id of NEW_HOLLOW) {
        for (const frame of ['walk_se_0', 'walk_ne_0', 'heavy_se_0']) {
          const l = bodyLuminance(sprite(id), frame, PALETTES.hollow);
          expect(contrastRatio(l, path), `${id}:${frame}`).toBeGreaterThanOrEqual(2);
          expect(contrastRatio(l, grass), `${id}:${frame}`).toBeGreaterThanOrEqual(1.6);
        }
      }
    });

    it(`${env}: the Aelari's knots shine over the road inside a rim darker than it`, () => {
      for (const id of NEW_AELARI) {
        for (const frame of ['walk_se_0', 'walk_ne_0']) {
          const knots = slotLuminance(sprite(id), frame, ['e0', 'e1', 'hi']);
          const rim = slotLuminance(sprite(id), frame, ['outline']);
          expect(contrastRatio(knots, path), `${id}:${frame} knots`).toBeGreaterThanOrEqual(2);
          expect(path, `${id}:${frame} rim`).toBeGreaterThan(rim);
          expect(contrastRatio(rim, path), `${id}:${frame} rim`).toBeGreaterThanOrEqual(3);
        }
      }
    });

    // Facing us, as the band list holds every Skitterkin (valueBands.ts ACT2_BAND_ACTORS); from
    // behind, a Skitterkin's back is a step darker (no butter belly) in every palette.
    it(`${env}: the refugees and Pebble walk a band above the road`, () => {
      for (const id of ['ally.refugee', 'ally.pebble']) {
        for (const frame of ['walk_se_0', 'walk_se_1', 'carry_se_0']) {
          if (sprite(id).frames[frame] === undefined) continue;
          const l = bodyLuminance(sprite(id), frame, PALETTES['skitterkin.ally']);
          expect(l, `${id}:${frame}`).toBeGreaterThan(path);
          expect(contrastRatio(l, path), `${id}:${frame}`).toBeGreaterThanOrEqual(1.2);
        }
      }
    });
  }
});
