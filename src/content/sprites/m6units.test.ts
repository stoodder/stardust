// M6's unit art (T640a; art-direction §4, §6, §7, §8): the Maw at every growth step and its tendril
// pose, the Undertow with its ripple, Everglow Security's Compliance Drone and Expediter (apart from
// each other and from Gerald), the Scuttle Den's swarmlings and Champions, Bricks's blocker stances,
// the shutdown's power-off line and price tag, the unravel mote, and the Fracture/Shard contour.
import { describe, expect, it } from 'vitest';
import { bodyLuminance, contrastRatio, sprite } from '../__fixtures__/valueBands.ts';
import { compileContent } from '../compile.ts';
import { RAW_CONTENT } from '../registry.ts';
import { ENV_PALETTES } from '../palettes/env.ts';
import { PALETTES } from '../palettes/index.ts';
import { MAW_STAGES } from './enemies/maw.ts';
import { STANCE_DROP } from './allies/bricks.ts';
import type { SpriteDef } from './types.ts';

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

function hasAnims(id: string, poses: readonly string[]): void {
  const anims = sprite(id).anims ?? {};
  for (const p of poses)
    for (const f of FACINGS) expect(anims[`${p}_${f}`], `${id} ${p}_${f}`).toBeDefined();
}

const MAWS = ['enemy.maw', ...Array.from({ length: MAW_STAGES }, (_, i) => `enemy.maw_g${i + 1}`)];

describe('the Maw (enemies.md § 5.4; art-direction §8 `consumer`)', () => {
  it('is a Hollow shape at every growth step: pale outline, contour, acid eyes, unsung violet', () => {
    for (const id of MAWS) {
      const d = sprite(id);
      expect(d.palette, id).toBe('hollow');
      expect(d.outline, id).toBe('auto');
      expect(d.legend, id).toMatchObject({ K: 'ink.0', V: 'violet.3' });
      hasAnims(id, ['walk', 'tell']);
      expect(d.anims?.['heavy_se'], `${id}: a Maw never turns Heavy`).toBeUndefined();
      expect(d.anims?.['death'], id).toBeUndefined();
      for (const f of ['walk_se_0', 'walk_ne_1', 'tell_se_0']) {
        const rows = grid(id, f);
        expect(count(rows, '+*'), `${id}:${f} eyes`).toBeGreaterThanOrEqual(3);
        expect(count(rows, 'VU'), `${id}:${f} violet`).toBeGreaterThanOrEqual(1);
        expect(count(rows, 'K'), `${id}:${f} contour`).toBeGreaterThan(10);
      }
      // Its walk lurches: every frame differs.
      const walk = ['walk_se_0', 'walk_se_1', 'walk_se_2'].map((f) => grid(id, f).join('|'));
      expect(new Set(walk).size, id).toBe(3);
    }
  });

  it('grows in pixel steps, +10% a step, with a gathered face stuck in its hide per absorb', () => {
    const w = MAWS.map((id) => bounds(grid(id, 'walk_se_0')).w);
    const area = MAWS.map((id) => opaque(grid(id, 'walk_se_0')));
    for (let i = 1; i < MAWS.length; i++) {
      expect(area[i], MAWS[i]).toBeGreaterThan(area[i - 1] ?? 0);
      expect(w[i], MAWS[i]).toBeGreaterThanOrEqual(w[i - 1] ?? 0);
    }
    const ratio = (w[MAW_STAGES] ?? 0) / (w[0] ?? 1);
    expect(ratio).toBeGreaterThan(1.35);
    expect(ratio).toBeLessThan(1.65);
    // The pale faces of what it took: more pale pixels with every absorb, in either facing.
    for (const f of ['walk_se_0', 'walk_ne_0']) {
      const pale = MAWS.map((id) => count(grid(id, f), 'w'));
      for (let i = 1; i < MAWS.length; i++)
        expect(pale[i], `${MAWS[i]}:${f}`).toBeGreaterThan(pale[i - 1] ?? 0);
    }
    // Bigger than the Fracture, the biggest Hollow body before it; a large contact shadow.
    expect(area[0]).toBeGreaterThan(opaque(grid('enemy.fracture', 'walk_se_0')));
    expect(sprite('enemy.maw').size.w).toBeGreaterThan(20);
  });

  it('gapes and sends tendrils to the leading edge in its tell, a toothy mouth facing us', () => {
    for (const id of MAWS) {
      const walk = grid(id, 'walk_se_0');
      const tell = grid(id, 'tell_se_0');
      const w = tell[0]?.length ?? 0;
      expect(count(walk, 'w'), `${id} teeth`).toBeGreaterThanOrEqual(4);
      expect(count(tell, 'k'), `${id} gapes`).toBeGreaterThan(count(walk, 'k'));
      // Three pale tendril tips on the leading edge.
      expect(tell.filter((r) => r[w - 1] === 'w').length, id).toBe(3);
      expect(grid(id, 'tell_se_0').join('|'), id).not.toBe(grid(id, 'tell_se_1').join('|'));
    }
  });
});

describe('the Undertow (enemies.md § 5.4)', () => {
  const id = 'enemy.undertow';

  it('is long and low with dorsal plates, a Hollow shape that burrows, hushes and reaches', () => {
    const d = sprite(id);
    expect(d.palette).toBe('hollow');
    hasAnims(id, ['walk', 'dig', 'under', 'heavy', 'tell']);
    expect(d.anims?.['death']).toBeUndefined();
    for (const f of ['walk_se_0', 'walk_se_1', 'walk_ne_0']) {
      const b = bounds(grid(id, f));
      expect(b.w, f).toBeGreaterThan(b.h * 1.6);
      expect(count(grid(id, f), 'VU'), `${f} lateral line`).toBeGreaterThanOrEqual(3);
      expect(count(grid(id, f), 'K'), `${f} contour`).toBeGreaterThan(10);
    }
    const walk = ['walk_se_0', 'walk_se_1', 'walk_se_2'].map((f) => grid(id, f).join('|'));
    expect(new Set(walk).size).toBe(3);
    expect(count(grid(id, 'heavy_se_0'), 'w')).toBeGreaterThanOrEqual(8);
    const tell = grid(id, 'tell_se_0');
    expect(tell.some((r) => solid(r[(r.length ?? 1) - 1]))).toBe(true);
    // Medium contact shadow (shadows.ts sizes by authored width).
    expect(d.size.w).toBeLessThanOrEqual(20);
  });

  it('dives nose-first, and underground shows only its plates in a ripple, low on the road', () => {
    const dig = grid(id, 'dig_se_0');
    expect(count(dig, 'GH'), 'clods flung').toBeGreaterThanOrEqual(4);
    expect(dig.join('|')).not.toBe(grid(id, 'walk_se_0').join('|'));
    for (const f of ['under_se_0', 'under_se_1', 'under_ne_0']) {
      const rows = grid(id, f);
      const b = bounds(rows);
      expect(b.h, f).toBeLessThanOrEqual(8);
      expect(b.y0, f).toBeGreaterThanOrEqual(5);
      expect(count(rows, '23'), `${f} plates`).toBeGreaterThanOrEqual(6);
      expect(count(rows, '+*'), `${f} an eye`).toBeGreaterThanOrEqual(1);
    }
    expect(grid(id, 'under_se_0').join('|')).not.toBe(grid(id, 'under_se_1').join('|'));
  });
});

describe('Everglow Security (enemies.md § 5.3)', () => {
  const UNITS = ['enemy.compliance', 'enemy.expediter'] as const;

  it('walks in the Everglow palette, four frames that all differ, lit enough for the night', () => {
    for (const id of UNITS) {
      const d = sprite(id);
      expect(d.palette, id).toBe('everglow');
      hasAnims(id, ['walk']);
      const walk = [0, 1, 2, 3].map((i) => grid(id, `walk_se_${i}`).join('|'));
      expect(new Set(walk).size, id).toBe(4);
      expect(d.anims?.['death'], id).toBeUndefined();
      // White paint and teal: well above Act III's road.
      const path = bodyLuminance(sprite('tile.path'), 'tread_x', ENV_PALETTES.act3);
      for (const f of ['walk_se_0', 'walk_ne_0']) {
        const l = bodyLuminance(d, f, PALETTES.everglow);
        expect(contrastRatio(l, path), `${id}:${f}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('read apart from each other and from Gerald: a squat walker, a tall wheeled pacer', () => {
    expect(unlike('enemy.compliance', 'enemy.expediter')).toBeGreaterThan(0.3);
    expect(unlike('enemy.compliance', 'enemy.gerald')).toBeGreaterThan(0.3);
    expect(unlike('enemy.expediter', 'enemy.gerald')).toBeGreaterThan(0.3);
    const drone = bounds(grid('enemy.compliance', 'walk_se_0'));
    const pacer = bounds(grid('enemy.expediter', 'walk_se_0'));
    expect(pacer.h).toBeGreaterThan(drone.h + 2);
    expect(pacer.w).toBeLessThanOrEqual(drone.w + 2); // its mast and pendulum, not its body
  });

  it("the Expediter's metronome swings and its stopwatch ticks; the drone wears a PA horn", () => {
    const bob = [0, 1, 2, 3].map((i) => grid('enemy.expediter', `walk_se_${i}`)[2]?.indexOf('e'));
    expect(new Set(bob).size).toBe(3); // left, middle, right
    expect(count(grid('enemy.expediter', 'walk_se_0'), 'w')).toBeGreaterThanOrEqual(8); // the dial
    expect(count(grid('enemy.compliance', 'walk_se_0').slice(0, 3), 'cd')).toBeGreaterThanOrEqual(
      3,
    );
    expect(count(grid('enemy.compliance', 'walk_se_0'), '67')).toBeGreaterThanOrEqual(8); // visor
  });
});

describe("the Scuttle Den's swarmlings and Champions (towers.md §8)", () => {
  const UNITS = ['ally.swarmling', 'ally.champion'] as const;

  it("dash and latch in four facings, in the Skitterkin allies' palette", () => {
    for (const id of UNITS) {
      const d = sprite(id);
      expect(d.palette, id).toBe('skitterkin');
      expect(d.variants, id).toContain('skitterkin.ally');
      hasAnims(id, ['walk', 'latch']);
      // Latched, it squashes flat over its hold.
      expect(bounds(grid(id, 'latch_se_0')).h, id).toBeLessThan(bounds(grid(id, 'walk_se_0')).h);
      expect(grid(id, 'latch_se_0').join('|'), id).not.toBe(grid(id, 'latch_se_1').join('|'));
    }
  });

  it('a swarmling is small, a Champion a size up in its red headband', () => {
    const sw = opaque(grid('ally.swarmling', 'walk_se_0'));
    const ch = opaque(grid('ally.champion', 'walk_se_0'));
    expect(sw).toBeLessThan(opaque(grid('ally.refugee', 'walk_se_0')));
    expect(ch).toBeGreaterThan(sw * 1.3);
    for (const f of ['walk_se_0', 'walk_ne_1', 'latch_se_0']) {
      expect(count(grid('ally.champion', f), 'RS'), f).toBeGreaterThanOrEqual(6);
    }
    expect(sprite('ally.champion').legend).toMatchObject({ R: 'red.3', S: 'red.4' });
  });
});

describe('Bricks at the Gap (design/maps.md § 5.4; BlockerView)', () => {
  const STANCES = ['block', 'strain', 'last'] as const;

  it('braces, strains and kneels in four facings, each with its own shot', () => {
    for (const s of STANCES) hasAnims('ally.bricks', [s, `${s}_fire`]);
    for (const f of ['se', 'ne']) {
      const idleTop = bounds(grid('ally.bricks', `idle_${f}_0`));
      const block = bounds(grid('ally.bricks', `block_${f}_0`));
      // Holding the line: his free arm out past where it hangs at ease.
      expect(block.x0, f).toBeLessThan(idleTop.x0);
      // Down on one knee: his head (the figure's top) sinks by the stance's drop.
      for (const s of STANCES) {
        const top = bounds(grid('ally.bricks', `${s}_${f}_0`)).y0;
        expect(top - idleTop.y0, `${s}_${f}`).toBeGreaterThanOrEqual(STANCE_DROP[s] - 1);
      }
      expect(count(grid('ally.bricks', `strain_${f}_0`), 'T'), f).toBeGreaterThanOrEqual(2);
      expect(count(grid('ally.bricks', `last_${f}_0`), 'T'), f).toBeGreaterThanOrEqual(2);
      expect(count(grid('ally.bricks', `block_${f}_0`), 'T'), f).toBe(0);
    }
    expect(STANCE_DROP.last).toBeGreaterThan(STANCE_DROP.strain);
  });
});

describe("M6's deaths (art-direction §7)", () => {
  it('the power-off line collapses a pixel each side per frame to a dot', () => {
    const d = sprite('fx.power_off');
    const names = ['w6', 'w5', 'w4', 'w3', 'w2', 'w1', 'dot'];
    expect(Object.keys(d.frames)).toEqual(names);
    names.forEach((n, i) => expect(count(grid('fx.power_off', n), 'w'), n).toBe(13 - 2 * i));
    expect(d.outline).toBe('auto');
  });

  it('the price tag hangs, flutters and lies on its side, on one canvas', () => {
    const d = sprite('fx.price_tag');
    expect(Object.keys(d.frames)).toEqual(['hang', 'flutter_0', 'flutter_1', 'lie']);
    for (const f of Object.keys(d.frames)) {
      expect(count(grid('fx.price_tag', f), 'G'), `${f} its price`).toBeGreaterThanOrEqual(2);
      expect(count(grid('fx.price_tag', f), 'O'), `${f} its hole`).toBe(1);
    }
    const lie = bounds(grid('fx.price_tag', 'lie'));
    expect(lie.w).toBeGreaterThan(lie.h);
    expect(lie.y0 + lie.h).toBe(d.size.h - 1); // resting just above its canvas's foot
  });

  it('the unravel mote is cold: violet and white only, twinkling', () => {
    const d = sprite('fx.unravel_mote');
    expect(Object.values(d.legend ?? {}).every((c) => /^(violet|white)\./.test(c))).toBe(true);
    expect(
      new Set(Object.keys(d.frames).map((f) => grid('fx.unravel_mote', f).join('|'))).size,
    ).toBe(3);
  });
});

describe('the Fracture and its Shard wear the Mote’s contour (T569)', () => {
  it('ink their edge inside the pale outline, the crack lit to the rim', () => {
    for (const id of ['enemy.mote', 'enemy.fracture', 'enemy.fracture_shard']) {
      expect(sprite(id).legend, id).toMatchObject({ K: 'ink.0' });
      for (const f of ['walk_se_0', 'walk_ne_0', 'heavy_se_0']) {
        expect(count(grid(id, f), 'K'), `${id}:${f}`).toBeGreaterThan(12);
      }
    }
    expect(count(grid('enemy.fracture', 'walk_se_0'), 'VU')).toBeGreaterThanOrEqual(8);
  });
});

describe("Act III's still Skitterkin body (T601)", () => {
  it('is never needed: no Act III map sends a Skitterkin enemy (act3.md: they are refugees or allies)', () => {
    const content = compileContent(RAW_CONTENT);
    const act3 = Object.values(content.maps).filter((m) => m.id.startsWith('a3_'));
    expect(act3.length).toBeGreaterThan(0);
    for (const m of act3) {
      for (const [w, wave] of m.waves.entries()) {
        for (const g of wave.groups) {
          expect(g.enemy.faction, `${m.id} W${w + 1} ${g.enemy.id}`).not.toBe('skitterkin');
        }
      }
    }
  });
});
