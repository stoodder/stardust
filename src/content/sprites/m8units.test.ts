// M8's unit art (T841; art-direction §1 principle 6, §4, §6, §7; design/maps.md § 5.5; design/
// enemies.md § 6): the Unsung in every form, the choir, Thrum's echo, the song's motes and the Deep
// Bore's drill head. Each draws every state T830's views play, keeps the colour language (rest is
// warm gold, scatter cold violet, the Hollow pale-outlined and drained), and reads apart at 1×.
import { describe, expect, it } from 'vitest';
import { sprite } from '../__fixtures__/valueBands.ts';
import { PALETTES } from '../palettes/index.ts';
import type { ColorName } from '../palettes/master.ts';
import { M8_ALLIES, M8_UNIT_FX, M8_UNITS } from './enemies/m8.ts';
import { GATHERING_MAW_STAGES } from './enemies/gathering_maw.ts';
import {
  UNSUNG_FORM_SPRITE,
  UNSUNG_PART_SPRITE,
  UNSUNG_REST_SPRITE,
  UNSUNG_STAGES,
} from './enemies/unsung.ts';
import { M8_UNIT_ICONS } from './icons/m8_enemies.ts';
import { ALL_SPRITES } from './all.ts';
import { isCustomChar, STANDARD_LEGEND } from './legend.ts';
import type { SpriteDef } from './types.ts';

const FACINGS = ['se', 'sw', 'ne', 'nw'] as const;

function grid(id: string, frame: string): readonly string[] {
  const f = sprite(id).frames[frame];
  if (f === undefined || !Array.isArray(f)) throw new Error(`${id}:${frame} is not a grid`);
  return f;
}

const solid = (c: string | undefined): boolean => c !== undefined && c !== '.' && c !== '_';

function width(rows: readonly string[]): number {
  let x0 = Infinity;
  let x1 = -1;
  for (const r of rows) {
    for (let x = 0; x < r.length; x++) {
      if (!solid(r[x])) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }
  }
  return x1 - x0 + 1;
}

function count(rows: readonly string[], chars: string): number {
  return rows
    .join('')
    .split('')
    .filter((c) => chars.includes(c)).length;
}

/** Every colour a frame shows under its default palette (custom legend and slots). */
function colours(def: SpriteDef, frame: string): Set<ColorName> {
  const pal = PALETTES[def.palette];
  const out = new Set<ColorName>();
  for (const ch of grid(def.id, frame).join('')) {
    if (ch === '.' || ch === '_') continue;
    const custom = isCustomChar(ch) ? def.legend?.[ch] : undefined;
    if (custom !== undefined) out.add(custom);
    else {
      const slot = STANDARD_LEGEND[ch];
      if (slot !== undefined) out.add(pal[slot]);
    }
  }
  return out;
}

function hasAnims(id: string, poses: readonly string[]): void {
  const anims = sprite(id).anims ?? {};
  for (const p of poses)
    for (const f of FACINGS) expect(anims[`${p}_${f}`], `${id} ${p}_${f}`).toBeDefined();
}

const ramp = (c: ColorName): string => c.split('.')[0] ?? '';

/** An authored anim's frame rate (0 for a mirror). */
function fps(d: SpriteDef, a: string): number {
  const an = d.anims?.[a];
  return an !== undefined && 'fps' in an ? an.fps : 0;
}

describe('M8 registers real art for every finale unit (placeholders/m8.ts is gone)', () => {
  it('registers the units, the choir, the effects, and the icon', () => {
    const ids = new Set(ALL_SPRITES.map((d) => d.id as string));
    for (const d of [...M8_UNITS, ...M8_ALLIES, ...M8_UNIT_FX, ...M8_UNIT_ICONS])
      expect(ids.has(d.id), d.id).toBe(true);
    for (const id of [
      ...Object.values(UNSUNG_FORM_SPRITE),
      UNSUNG_PART_SPRITE,
      UNSUNG_REST_SPRITE,
      'ally.singer',
      'ally.pebble_lead',
      'ally.thrum',
      'fx.echo',
      'fx.rest_mote',
      'fx.scatter_mote',
      'fx.ishael_mote',
      'fx.bore_head',
      'icon.enemy.unsung',
    ])
      expect(ids.has(id), id).toBe(true);
  });

  it("is no longer the Maw's body under the Unsung's id", () => {
    expect(sprite('enemy.unsung').frames['walk_se_0']).not.toEqual(
      sprite('enemy.maw').frames['walk_se_0'],
    );
    expect(sprite('icon.enemy.unsung').size).toEqual({ w: 14, h: 14 });
  });
});

describe('the Unsung (enemies/unsung.ts)', () => {
  it('draws every pose each form plays, in four facings', () => {
    for (const id of [
      'enemy.unsung',
      'enemy.unsung_split',
      'enemy.unsung_part',
      'enemy.unsung_song',
    ])
      hasAnims(id, ['walk', 'tell', 'puff']);
    hasAnims('enemy.unsung_burrow', ['walk', 'dig', 'under', 'surface', 'phase', 'puff']);
    hasAnims('enemy.unsung_rest', ['rest', 'walk']);
    expect(sprite('enemy.unsung_burrow').anims?.['surface_se']).toMatchObject({ loop: false });
    expect(sprite('enemy.unsung_rest').anims?.['rest_se']).toMatchObject({ loop: false });
  });

  it('is the biggest Hollow on the road: wider than the Gathering Maw, its parts smaller', () => {
    const unsung = width(grid('enemy.unsung', 'walk_se_0'));
    expect(unsung).toBeGreaterThan(width(grid('enemy.gathering_maw', 'walk_se_0')) + 4);
    expect(width(grid('enemy.unsung_part', 'walk_se_0'))).toBeLessThan(unsung * 0.6);
  });

  it('grows a step per absorb, as the Gathering Maw does (form 1 only)', () => {
    expect(UNSUNG_STAGES).toBe(GATHERING_MAW_STAGES);
    let last = width(grid('enemy.unsung', 'walk_se_0'));
    for (let i = 1; i <= UNSUNG_STAGES; i++) {
      const w = width(grid(`enemy.unsung_g${i}`, 'walk_se_0'));
      expect(w, `g${i}`).toBeGreaterThan(last);
      last = w;
    }
    expect(last / width(grid('enemy.unsung', 'walk_se_0'))).toBeGreaterThan(1.35);
  });

  it('is the Hollow: drained, pale-outlined, unsung violet in it, and every form reads apart', () => {
    for (const id of [...Object.values(UNSUNG_FORM_SPRITE), UNSUNG_PART_SPRITE]) {
      const d = sprite(id);
      expect(d.palette, id).toBe('hollow');
      expect(d.outline, id).toBe('auto');
      expect(count(grid(id, 'walk_se_0'), 'VU'), id).toBeGreaterThan(4);
    }
    // The split's chasm, the burrow's clods, the Song's raised stalks: each walk its own.
    const walks = Object.values(UNSUNG_FORM_SPRITE).map((id) => grid(id, 'walk_se_0').join('\n'));
    expect(new Set(walks).size).toBe(walks.length);
    expect(count(grid('enemy.unsung_split', 'walk_se_0'), 'VU')).toBeGreaterThan(
      2 * count(grid('enemy.unsung', 'walk_se_0'), 'VU'),
    );
    expect(count(grid('enemy.unsung_burrow', 'walk_se_0'), 'NO')).toBeGreaterThan(10);
    expect(count(grid('enemy.unsung_burrow', 'under_se_0'), 'MNO')).toBeGreaterThan(40);
  });

  it('turns gold from the outline in when laid to rest, and stays gold', () => {
    const rest = sprite(UNSUNG_REST_SPRITE);
    const grey = 'ABCDEKRVU';
    const gold = 'WGLFHI*+';
    const steps = [0, 1, 2, 3].map((i) => grid(rest.id, `rest_se_${i}`));
    // The first step turns only the ring; each later step more; the last leaves no grey.
    expect(count(steps[0]!, 'F')).toBeGreaterThan(20);
    expect(count(steps[0]!, 'ABCD')).toBeGreaterThan(100);
    for (let i = 1; i < steps.length; i++)
      expect(count(steps[i]!, gold), `step ${i}`).toBeGreaterThan(count(steps[i - 1]!, gold));
    expect(count(steps[3]!, grey)).toBe(0);
    expect(count(grid(rest.id, 'walk_se_0'), grey)).toBe(0);
    // Warm in every channel once rested: no Hollow grey, acid, or violet left.
    for (const c of colours(rest, 'walk_se_0'))
      expect(['gold', 'pink', 'white'], c).toContain(ramp(c));
  });
});

describe('the choir (allies/choir.ts)', () => {
  it('sings in every pose, hushed in grey', () => {
    hasAnims('ally.singer', ['walk', 'sing', 'hushed']);
    hasAnims('ally.pebble_lead', ['walk', 'sing', 'halt']);
    hasAnims('ally.thrum', ['walk', 'sing']);
    for (const id of ['ally.singer', 'ally.pebble_lead', 'ally.thrum'])
      expect(sprite(id).palette, id).toBe('skitterkin.ally');
  });

  it('carries a gold note in every singing frame (it reads from behind), none when hushed or halted', () => {
    const singing: [string, string][] = [
      ['ally.singer', 'walk'],
      ['ally.singer', 'sing'],
      ['ally.pebble_lead', 'walk'],
      ['ally.pebble_lead', 'sing'],
      ['ally.thrum', 'walk'],
      ['ally.thrum', 'sing'],
    ];
    for (const [id, look] of singing)
      for (const f of ['se', 'ne'])
        for (const s of [0, 1]) {
          const rows = grid(id, `${look}_${f}_${s}`);
          // The note (custom gold), in the top five rows.
          expect(count(rows.slice(0, 5), 'YZ'), `${id} ${look}_${f}_${s}`).toBeGreaterThanOrEqual(
            3,
          );
        }
    for (const f of ['se', 'ne'])
      for (const s of [0, 1]) {
        expect(count(grid('ally.singer', `hushed_${f}_${s}`), 'YZ*+')).toBe(0);
        expect(count(grid('ally.pebble_lead', `halt_${f}_${s}`), 'YZ')).toBe(0);
      }
  });

  it('drains a hushed singer to steel: no coral, no gold, no teal', () => {
    const d = sprite('ally.singer');
    for (const f of ['se', 'ne'])
      for (const c of colours(d, `hushed_${f}_0`))
        expect(['steel', 'ink', 'white'], `${f} ${c}`).toContain(ramp(c));
  });

  it("keeps Pebble's cap white and her seedling green, drooping at a halt", () => {
    const d = sprite('ally.pebble_lead');
    for (const look of ['walk', 'sing', 'halt'])
      for (const f of ['se', 'ne']) {
        const cs = colours(d, `${look}_${f}_0`);
        expect(cs.has('white.1'), `${look}_${f}`).toBe(true);
        expect(cs.has('green.3'), `${look}_${f}`).toBe(true);
      }
    expect(grid(d.id, 'halt_se_0')).not.toEqual(grid(d.id, 'walk_se_0'));
  });

  it("gives Old Thrum the Elder's breadth, her moss green and her seams pink-gold", () => {
    const d = sprite('ally.thrum');
    expect(width(grid(d.id, 'walk_se_0'))).toBeGreaterThanOrEqual(
      width(grid('enemy.elder', 'walk_se_0')) - 1,
    );
    const cs = colours(d, 'walk_se_0');
    for (const c of ['green.3', 'pink.3', 'gold.3'] as const) expect(cs.has(c), c).toBe(true);
  });
});

describe("Thrum's echo (fx/echo.ts)", () => {
  const d = sprite('fx.echo');
  const grey = 'ABCDEKRVU';
  const gold = 'WGLFHI*+';

  it('drifts in grey, warms gold from the outline in, and rises gold, in four facings', () => {
    hasAnims(d.id, ['walk', 'warm', 'rise']);
    expect(d.anims?.['warm_se']).toMatchObject({ loop: false });
    for (const f of ['se', 'ne']) {
      expect(count(grid(d.id, `walk_${f}_0`), gold), f).toBe(0);
      let last = 0;
      for (let i = 0; i < 4; i++) {
        const n = count(grid(d.id, `warm_${f}_${i}`), gold);
        expect(n, `warm_${f}_${i}`).toBeGreaterThan(last);
        last = n;
      }
      expect(count(grid(d.id, `rise_${f}_0`), grey), f).toBe(0);
    }
  });

  it('is never hungry: no acid in it', () => {
    for (const c of Object.values(d.legend ?? {})) expect(ramp(c)).not.toBe('acid');
  });
});

describe("the song's motes (fx/song_motes.ts)", () => {
  it('rest motes are warm (gold, pink, white) and rise; Ishael is larger and slower', () => {
    const rest = sprite('fx.rest_mote');
    for (const f of Object.keys(rest.frames))
      for (const c of colours(rest, f)) expect(['gold', 'pink', 'white'], c).toContain(ramp(c));
    expect(rest.anims?.['rise']).toBeDefined();
    const ishael = sprite('fx.ishael_mote');
    expect(count(grid(ishael.id, 'i0'), 'W')).toBe(4);
    expect(fps(ishael, 'glow')).toBeLessThan(fps(rest, 'rise'));
  });

  it('scatter motes are cold (violet, white), never warm; they drift, pull in, and flash once', () => {
    const sc = sprite('fx.scatter_mote');
    for (const f of Object.keys(sc.frames))
      for (const c of colours(sc, f)) expect(['violet', 'white'], c).toContain(ramp(c));
    for (const a of ['drift', 'pull', 'reform']) expect(sc.anims?.[a], a).toBeDefined();
    expect(sc.anims?.['reform']).toMatchObject({ loop: false });
  });
});

describe("the Deep Bore's drill head (fx/bore_head.ts)", () => {
  it('idles, drills (its flights turning, violet at the bit), and breaks through once', () => {
    const d = sprite('fx.bore_head');
    for (const a of ['idle', 'drill', 'breach']) expect(d.anims?.[a], a).toBeDefined();
    expect(d.anims?.['breach']).toMatchObject({ loop: false });
    const drills = [0, 1, 2, 3].map((i) => grid(d.id, `drill_${i}`).join('\n'));
    expect(new Set(drills).size).toBe(4);
    expect(count(grid(d.id, 'idle'), 'VU')).toBe(0);
    expect(count(grid(d.id, 'drill_0'), 'VU')).toBeGreaterThan(2);
    const tip = grid(d.id, 'drill_0')[d.anchor.y] ?? '';
    expect(tip[d.anchor.x]).toBe('U');
    expect(count(grid(d.id, 'breach_2'), 'VUW')).toBeGreaterThan(
      count(grid(d.id, 'breach_0'), 'VUW'),
    );
  });
});
