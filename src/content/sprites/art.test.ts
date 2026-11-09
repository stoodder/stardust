// Readability rules for specific sprites (art-direction §1, §5, §6, §7, §8): tier and spec
// silhouettes, the Thumper's NE muzzle, M3's towers, flyers, and Skitterkin (T311a), the explosion's punch, the Zoomer's `fast` tell, contact
// shadows, the apron's dither, the Brood Hauler's sack, Bricks, the raised and powered tiles, and
// link tethers.
import { describe, expect, it } from 'vitest';
import { luminance } from '../palettes/color.ts';
import { rgbOf, type ColorName } from '../palettes/master.ts';
import { DEATH_ANIM, DEATH_FRAMES } from './enemies/death.ts';
import { SACK_LEGEND } from './enemies/sack.ts';
import { peekerFrame } from './props/peeker.ts';
import { tetherDir } from './fx/link_tether.ts';
import { SPRITES, type SpriteId } from './index.ts';
import { GROUND_SHADOW_ALPHA, groundShadowFor } from './shadows.ts';
import { APRON_RINGS } from './tiles/apron.ts';
import type { SpriteDef } from './types.ts';

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

/** The opaque, non-shadow pixels' bounding box. */
function bounds(rows: readonly string[]): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const ch = r.charAt(x);
      if (ch === '.' || ch === '_') continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  });
  return { x0, x1, y0, y1 };
}

function lum(c: ColorName): number {
  return luminance(rgbOf(c));
}

function count(rows: readonly string[], chars: string): number {
  return rows
    .join('')
    .split('')
    .filter((c) => chars.includes(c)).length;
}

describe('tower tier silhouettes', () => {
  for (const id of [
    'tower.rivet',
    'tower.thumper',
    'tower.sprinkler',
    'tower.skyhook',
    'tower.zapcoil',
  ] as const) {
    it(`${id}: T2 is wider than T1 and T3 taller than T2`, () => {
      const [t1, t2, t3] = (['t1', 't2', 't3'] as const).map((t) => bounds(grid(id, t)));
      if (t1 === undefined || t2 === undefined || t3 === undefined) throw new Error('tiers');
      expect(t2.x1 - t2.x0).toBeGreaterThanOrEqual(t1.x1 - t1.x0 + 4);
      expect(t3.y0).toBeLessThanOrEqual(t2.y0 - 6);
    });
  }
});

/** The opaque pixels of a grid as a set of `x,y` keys (shadow pixels excluded). */
function opaque(rows: readonly string[]): Set<string> {
  const out = new Set<string>();
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (!'._'.includes(r.charAt(x))) out.add(`${x},${y}`);
  });
  return out;
}

/** How many pixels differ in opacity between two same-size grids (the silhouette difference). */
function silhouetteDiff(a: readonly string[], b: readonly string[]): number {
  const sa = opaque(a);
  const sb = opaque(b);
  return [...sa].filter((k) => !sb.has(k)).length + [...sb].filter((k) => !sa.has(k)).length;
}

describe('tier-4 spec frames (the tower changed, base and head)', () => {
  for (const [base, head] of [
    ['tower.rivet', 'tower.rivet_head'],
    ['tower.thumper', 'tower.thumper_head'],
  ] as const) {
    it(`${base}: each spec base is as wide as T2 and its silhouette differs from T3 and the other`, () => {
      const t2 = bounds(grid(base, 't2'));
      for (const spec of ['spec_a', 'spec_b']) {
        const b = bounds(grid(base, spec));
        expect(b.x1 - b.x0, spec).toBeGreaterThanOrEqual(t2.x1 - t2.x0);
        expect(silhouetteDiff(grid(base, spec), grid(base, 't3')), spec).toBeGreaterThan(30);
      }
      expect(silhouetteDiff(grid(base, 'spec_a'), grid(base, 'spec_b'))).toBeGreaterThan(30);
    });

    it(`${head}: each spec head differs from the T2+ head and the other spec, with fire anims`, () => {
      for (const facing of ['se', 'ne']) {
        const t2 = grid(head, `${facing}_t2`);
        const a = grid(head, `${facing}_spec_a`);
        const b = grid(head, `${facing}_spec_b`);
        expect(silhouetteDiff(a, t2), `${facing} a`).toBeGreaterThan(12);
        expect(silhouetteDiff(b, t2), `${facing} b`).toBeGreaterThan(12);
        expect(silhouetteDiff(a, b), facing).toBeGreaterThan(12);
      }
      for (const spec of ['spec_a', 'spec_b']) {
        for (const f of ['se', 'sw', 'ne', 'nw']) {
          expect(def(head).anims?.[`fire_${f}_${spec}`], `fire_${f}_${spec}`).toMatchObject({});
        }
      }
    });
  }

  it('Rivet Storm is short and fat, Railspike long and thin', () => {
    const storm = bounds(grid('tower.rivet_head', 'se_spec_a'));
    const rail = bounds(grid('tower.rivet_head', 'se_spec_b'));
    expect(rail.x1).toBeGreaterThan(storm.x1 + 3);
  });

  it('Cluster Thumper flings bomblets, which pop small', () => {
    expect(def('projectile.thumper_bomblet').size.w).toBeLessThan(
      def('projectile.thumper_shell').size.w,
    );
    expect(def('fx.bomblet_burst').size.w).toBeLessThan(def('fx.explosion').size.w);
    expect(def('fx.bomblet_burst').anims?.['burst']).toMatchObject({ loop: false });
  });
});

describe('Thumper NE muzzle', () => {
  it('shows a 1 px bore sliver under the far lip, with no tube showing above it', () => {
    for (const f of ['ne', 'ne_t2', 'ne_spec_a', 'ne_spec_b']) {
      const rows = grid('tower.thumper_head', f);
      const boreRows = rows.flatMap((r, y) => (r.includes('k') ? [y] : []));
      expect(boreRows, f).toHaveLength(1);
      // At most the far lip's one row sits above the bore.
      expect(boreRows[0]! - bounds(rows).y0, f).toBeLessThanOrEqual(1);
    }
  });
});

describe('explosion punch (D024)', () => {
  it('opens on its biggest, brightest frame', () => {
    const area = (f: string): number => opaque(grid('fx.explosion', f)).size;
    const white = (f: string): number => count(grid('fx.explosion', f), 'w');
    expect(white('f0')).toBeGreaterThan(white('f1'));
    const b0 = bounds(grid('fx.explosion', 'f0'));
    expect(b0.x1 - b0.x0 + 1).toBeGreaterThanOrEqual(17);
    expect(area('f1')).toBeGreaterThan(150);
    // Four frames at 12 fps: render/vfx/fxTiming.ts BURST_MS assumes it.
    expect(def('fx.explosion').anims?.['burst']).toMatchObject({
      frames: ['f0', 'f1', 'f2', 'f3'],
      fps: 12,
      loop: false,
    });
  });
});

/** The 4 columns behind a Zoomer's body, where its speed lines run. */
function trail(rows: readonly string[]): string {
  return rows.map((r) => r.slice(0, 4)).join('|');
}

describe('Zoomer fast tell', () => {
  it('runs hot (orange body) and trails speed lines on alternating frames', () => {
    const z = def('enemy.zoomer');
    expect(z.legend).toMatchObject({ O: 'orange.3', P: 'orange.4' });
    const f0 = grid('enemy.zoomer', 'walk_se_0');
    const f1 = grid('enemy.zoomer', 'walk_se_1');
    expect(count(f0, 'O')).toBeGreaterThan(count(f0, '2'));
    // Speed lines live in the 4 columns behind the body, and differ between steps.
    expect(
      count(
        f0.map((r) => r.slice(0, 4)),
        'P',
      ),
    ).toBeGreaterThan(4);
    expect(trail(f0)).not.toEqual(trail(f1));
  });

  it('has an 8×8 glyph', () => {
    const g = def('icon.tell.fast');
    expect(g.size).toEqual({ w: 6, h: 6 });
    expect(g.outline).toBe('auto');
  });
});

describe('contact shadows', () => {
  it('size by the actor and draw at 35%', () => {
    expect(groundShadowFor('enemy.nibbler').frame).toBe('small');
    expect(groundShadowFor('enemy.zoomer').frame).toBe('medium');
    expect(groundShadowFor('enemy.chonk').frame).toBe('large');
    expect(GROUND_SHADOW_ALPHA * 0.5).toBeCloseTo(0.35);
    const s = groundShadowFor('enemy.chonk');
    expect(def(s.sprite).frames[s.frame]).toBeDefined();
  });
});

describe('apron tiles', () => {
  it('dither to ink more on every ring outward', () => {
    let last = -1;
    for (let ring = 1; ring <= APRON_RINGS; ring++) {
      const ink = count(grid('tile.apron', `r${ring}`), 'k');
      expect(ink).toBeGreaterThan(last);
      last = ink;
      for (const axis of ['x', 'y']) {
        expect(grid('tile.apron', `road_${axis}_r${ring}`)).toHaveLength(16);
      }
    }
    expect(count(grid('tile.apron', 'r1'), 'k')).toBe(0);
  });
});

describe('tier-2 heads (D029: the upgrade reads in the head too)', () => {
  for (const id of [
    'tower.rivet_head',
    'tower.thumper_head',
    'tower.skyhook_head',
    'tower.zapcoil_head',
  ] as const) {
    it(`${id}: the T2+ head is bigger than T1's in every authored facing`, () => {
      for (const f of ['se', 'ne', 'se_fire', 'ne_fire']) {
        const t1 = bounds(grid(id, f));
        const t2 = bounds(grid(id, f.replace(/^(se|ne)/, '$1_t2')));
        const area = (b: typeof t1): number => (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1);
        expect(area(t2), `${id}:${f}`).toBeGreaterThan(area(t1) * 1.1);
      }
      for (const a of ['fire_se_t2', 'fire_sw_t2', 'fire_ne_t2', 'fire_nw_t2']) {
        expect(def(id).anims?.[a], a).toBeDefined();
      }
    });
  }
});

describe('Brood Hauler and its sack', () => {
  it('carries a sack (the `carrier` tell) over its body in every facing', () => {
    for (const f of ['walk_se_0', 'walk_se_1', 'walk_ne_0', 'walk_ne_1']) {
      const rows = grid('enemy.brood_hauler', f);
      expect(count(rows, 'GHJ'), f).toBeGreaterThan(40);
      // The sack rides above the body: its top is the sprite's top.
      const sackTop = rows.findIndex((r) => /[GHJ]/.test(r));
      expect(sackTop, f).toBeLessThanOrEqual(bounds(rows).y0 + 1);
    }
    expect(def('enemy.brood_hauler').legend).toMatchObject({ S: 'white.0', T: 'steel.4' });
  });

  it("keeps the burlap below the glitter's gold, so the flecks read (the m2 art verdict)", () => {
    expect(lum(SACK_LEGEND.G)).toBeLessThan(lum(SACK_LEGEND.Y));
    expect(lum(SACK_LEGEND.G)).toBeLessThan(lum('gold.4'));
  });

  it('has an 8×8 carrier glyph and a wave-preview icon', () => {
    expect(def('icon.tell.carrier').size).toEqual({ w: 6, h: 6 });
    expect(def('icon.enemy.brood_hauler').size).toEqual({ w: 14, h: 14 });
  });

  it('bursts once, and its young are tiny', () => {
    const burst = def('fx.sack_burst');
    expect(burst.anims?.['burst']).toMatchObject({ loop: false });
    expect(def('enemy.hauler_young').size.w).toBeLessThan(def('enemy.nibbler').size.w);
  });
});

describe("A1M2's decor (act1.md § A1M2)", () => {
  it('fits each prop on one tile, standing on its tile center', () => {
    for (const id of ['prop.rig', 'prop.housing', 'prop.scarecrow'] as const) {
      const d = def(id);
      expect(d.size.w, id).toBeLessThanOrEqual(32);
      expect(d.size.h, id).toBeLessThanOrEqual(48);
      expect(bounds(grid(id, 'v0')).y1, id).toBeGreaterThanOrEqual(d.anchor.y);
    }
  });

  it("paints Rig 3's number and its spoil cold violet (unsung: art-direction §1, principle 6)", () => {
    expect(def('prop.rig').legend).toMatchObject({ U: 'violet.3', V: 'violet.4' });
    expect(count(grid('prop.rig', 'v0'), 'UV')).toBeGreaterThan(0);
    expect(count(grid('prop.rig', 'v0'), 'd')).toBeGreaterThanOrEqual(8); // the orange "3"
  });

  it('gives the scarecrow his faded cap and his Employee of the Month badge', () => {
    const rows = grid('prop.scarecrow', 'v0');
    expect(count(rows, '7')).toBeGreaterThan(8); // the cap, teal.2: faded
    expect(def('prop.scarecrow').legend).toMatchObject({ Y: 'gold.3' });
    expect(count(rows, 'Y')).toBeGreaterThan(0);
  });

  it('lights the housing block warm: people live there', () => {
    expect(count(grid('prop.housing', 'v0'), 'KL')).toBeGreaterThanOrEqual(4);
  });
});

describe('the road verge (art-direction §3 mid-darks)', () => {
  it('draws only mid-dark grass, on each edge, in two variants', () => {
    for (const edge of ['nw', 'ne', 'se', 'sw']) {
      for (const k of [0, 1]) {
        const rows = grid('tile.verge', `${edge}_${k}`);
        expect(count(rows, '01'), `${edge}_${k}`).toBeGreaterThan(12);
        expect(count(rows, '234'), `${edge}_${k}`).toBe(0);
      }
    }
  });
});

describe('the armored tell glyph', () => {
  it('is an 8×8 steel plate', () => {
    const g = def('icon.tell.armored');
    expect(g.size).toEqual({ w: 6, h: 6 });
    expect(g.legend).toMatchObject({ C: 'steel.4' });
  });
});

describe('Bricks at his post', () => {
  it('idles, fires, and lowers his cannon in four facings (SE and NE authored, mirrored)', () => {
    const anims = Object.keys(def('ally.bricks').anims ?? {}).toSorted();
    expect(anims).toEqual(
      [
        'fire_ne',
        'fire_nw',
        'fire_se',
        'fire_sw',
        'idle_ne',
        'idle_nw',
        'idle_se',
        'idle_sw',
        'lowered_ne',
        'lowered_nw',
        'lowered_se',
        'lowered_sw',
      ].toSorted(),
    );
    // Lowered, the cannon is grounded (S11): its top sits well down his body, not up by his head
    // as the shouldered tube does, and it stands on end, a tall run of tube pixels down to its
    // dark butt on the post plate, with skin (his hands) resting right on its muzzle.
    const tubeTop = (f: string): number =>
      grid('ally.bricks', f).findIndex((r) => /[1-4]/.test(r));
    for (const facing of ['se', 'ne']) {
      for (const k of [0, 1]) {
        const f = `lowered_${facing}_${k}`;
        const rows = grid('ally.bricks', f);
        expect(tubeTop(f), f).toBeGreaterThanOrEqual(tubeTop(`idle_${facing}_0`) + 6);
        let standing = false;
        for (let x = 0; x < rows[0]!.length; x++) {
          const col = rows.map((r) => r.charAt(x));
          const butt = col.lastIndexOf('0', 25);
          const top = col.findIndex((c, y) => y < butt && /[1-4]/.test(c));
          const run = col.slice(top, butt).every((c) => /[0-4b-ew]/.test(c));
          const hands = /[A-D]/.test(col.slice(Math.max(0, top - 3), top).join(''));
          if (butt >= 23 && top >= 0 && butt - top >= 9 && run && hands) standing = true;
        }
        expect(standing, f).toBe(true);
      }
    }
    // Human-scale: 16–24 px of figure above the post (art-direction §6).
    const b = bounds(grid('ally.bricks', 'idle_se_0'));
    expect(def('ally.bricks').anchor.y - b.y0).toBeGreaterThanOrEqual(16);
    expect(def('ally.bricks').anchor.y - b.y0).toBeLessThanOrEqual(24);
  });
});

describe('high ground and power node tiles', () => {
  it('raises high ground one step: a 32×24 block anchored at its ground-plane top vertex', () => {
    const d = def('tile.high_ground');
    expect(d.size).toEqual({ w: 32, h: 24 });
    expect(d.anchor).toEqual({ x: 16, y: 8 });
    const rows = grid('tile.high_ground', 'v0');
    // The bottom vertex sits on the ground diamond's bottom row (24 − 1), cliff faces above it.
    expect(rows[23]?.slice(15, 17)).not.toBe('..');
    expect(count(rows.slice(16), 'abcd')).toBeGreaterThan(100);
  });

  it('pulses the power node through four distinct frames', () => {
    const d = def('tile.power_node');
    expect(d.anims?.['pulse']).toMatchObject({ frames: ['v0', 'pulse_1', 'pulse_2', 'pulse_3'] });
    const frames = ['v0', 'pulse_1', 'pulse_2', 'pulse_3'].map((f) =>
      grid('tile.power_node', f).join(''),
    );
    expect(new Set(frames).size).toBe(4);
    expect(count(grid('tile.power_node', 'v0'), '+*')).toBeGreaterThan(30);
  });
});

describe('link tethers', () => {
  it('covers every 8-neighbour with a left-to-right (or top-to-bottom) frame set', () => {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const t = tetherDir(dc, dr);
        if (dc === 0 && dr === 0) expect(t).toBeNull();
        else expect(t, `${dc},${dr}`).not.toBeNull();
        // A pair and its reverse use the same frames from opposite ends.
        if (t !== null) expect(tetherDir(-dc, -dr)).toEqual({ dir: t.dir, fromB: !t.fromB });
      }
    }
  });

  it('draws each link in its own shape and colour, animated', () => {
    const d = def('fx.link_tether');
    for (const link of ['crossfire', 'sitting_ducks']) {
      for (const dir of ['e', 'se', 'ne', 's']) {
        expect(d.anims?.[`${link}_${dir}`], `${link}_${dir}`).toBeDefined();
        expect(grid('fx.link_tether', `${link}_${dir}_0`)).not.toEqual(
          grid('fx.link_tether', `${link}_${dir}_1`),
        );
      }
    }
    // Crossfire is a solid orange line; Sitting Ducks a dashed blue one with gaps.
    const cf = grid('fx.link_tether', 'crossfire_e_0');
    const sd = grid('fx.link_tether', 'sitting_ducks_e_0');
    expect(count(cf, 'd')).toBeGreaterThan(count(sd, 'd'));
    expect(count(sd, 'B')).toBeGreaterThan(0);
    expect(count(sd, 'Bw')).toBeLessThan(count(cf, 'dew'));
  });
});

/** A frame's opaque height in pixels. */
function tall(id: SpriteId, f: string): number {
  const b = bounds(grid(id, f));
  return b.y1 - b.y0;
}

/** A frame's emissive pixels (`+` and `*`) in reading order. */
function spots(rows: readonly string[]): string {
  return rows.join('').replace(/[^+*]/g, '');
}

describe("M3's towers (T311a)", () => {
  it('Skyhook aims at the sky: its barrels stand taller than any ground gun', () => {
    expect(tall('tower.skyhook_head', 'se')).toBeGreaterThan(tall('tower.rivet_head', 'se') + 6);
    expect(def('tower.skyhook').legend).toMatchObject({ B: 'blue.3' });
  });

  it('Zapcoil is Vrell scrap: no Everglow logo, a price tag, and blue-white arcs when it fires', () => {
    expect(def('tower.zapcoil').palette).toBe('vrell');
    expect(count(grid('tower.zapcoil', 't1'), '8')).toBe(0);
    expect(count(grid('tower.zapcoil', 't1'), 'W')).toBeGreaterThan(4);
    expect(def('tower.zapcoil_head').legend).toMatchObject({ Z: 'blue.4' });
    for (const f of ['se', 'ne']) {
      const at = count(grid('tower.zapcoil_head', f), 'Zw');
      expect(count(grid('tower.zapcoil_head', `${f}_fire`), 'Zw'), f).toBeGreaterThan(at + 8);
    }
  });
});

describe("M3's enemies (T311a)", () => {
  const nibbler = bounds(grid('enemy.nibbler', 'walk_se_0'));
  const width = (b: typeof nibbler): number => b.x1 - b.x0 + 1;

  it('Puffwing and Gerald are flyers: winged or rotored, wider than a Nibbler, and they flap', () => {
    for (const id of ['enemy.puffwing', 'enemy.gerald'] as const) {
      expect(width(bounds(grid(id, 'walk_se_0'))), id).toBeGreaterThan(width(nibbler) + 4);
      expect(grid(id, 'walk_se_0'), id).not.toEqual(grid(id, 'walk_se_1'));
    }
    // The Puffwing's fluff wings are the brightest mass on it.
    expect(count(grid('enemy.puffwing', 'walk_se_1'), 'Fw')).toBeGreaterThan(30);
    // Gerald is Everglow's: white and teal, with his satchel and a letter in it.
    expect(def('enemy.gerald').palette).toBe('everglow');
    expect(count(grid('enemy.gerald', 'walk_se_0'), 'de')).toBeGreaterThan(10);
  });

  it('Bunchling is packed: three lobes, three tufts, stretched pink between them', () => {
    const rows = grid('enemy.bunchling', 'walk_se_0');
    expect(def('enemy.bunchling').legend).toMatchObject({ P: 'pink.3' });
    expect(count(rows, 'P')).toBeGreaterThan(5);
    expect(width(bounds(rows))).toBeGreaterThan(width(nibbler) + 3);
  });

  it('Digger has a dig-in tell (burrower): nose down, dirt flung, in four facings', () => {
    const d = def('enemy.digger');
    for (const f of ['se', 'sw', 'ne', 'nw']) expect(d.anims?.[`dig_${f}`], f).toBeDefined();
    for (const f of ['se', 'ne']) {
      expect(count(grid('enemy.digger', `walk_${f}_0`), 'MO'), f).toBeLessThan(6);
      expect(count(grid('enemy.digger', `dig_${f}_0`), 'NO'), f).toBeGreaterThan(10);
      expect(grid('enemy.digger', `dig_${f}_0`), f).not.toEqual(grid('enemy.digger', `dig_${f}_1`));
    }
    // Low and long: wider than it is tall.
    const b = bounds(grid('enemy.digger', 'walk_se_0'));
    expect(b.x1 - b.x0).toBeGreaterThan((b.y1 - b.y0) * 1.5);
  });

  it('Elder is big and old: white brows and whiskers, armored steel, and pulsing huddle spots', () => {
    const f0 = grid('enemy.elder', 'walk_se_0');
    const f1 = grid('enemy.elder', 'walk_se_1');
    expect(width(bounds(f0))).toBeGreaterThan(width(nibbler) * 1.5);
    expect(count(f0, 'W')).toBeGreaterThan(8);
    expect(count(f0, 'S')).toBeGreaterThan(10);
    // The huddle spots trade their bright and dim steps between the two walk frames.
    expect(spots(f0).length).toBeGreaterThanOrEqual(4);
    expect(spots(f0)).not.toEqual(spots(f1));
  });

  it('the youngling is a small Nibbler, and the Peeker is that youngling behind a rock', () => {
    expect(def('enemy.youngling').size.w).toBeLessThan(def('enemy.nibbler').size.w);
    // Its seedling (two leaves, D097) sets it apart from a Nibbler's or a Hauler's young.
    for (const f of ['walk_se_0', 'walk_se_1', 'walk_ne_0', 'walk_ne_1']) {
      expect(count(grid('enemy.youngling', f).slice(0, 2), 'de'), f).toBeGreaterThanOrEqual(6);
    }
    expect(def('enemy.youngling').size.w).toBeGreaterThan(def('enemy.hauler_young').size.w);
    const p = def('prop.peeker');
    // Each map's own cover (T311c) repeats the four poses behind it: `<cover>_<frame>`.
    for (const cover of ['rock', 'planter'] as const) {
      for (const f of ['hidden', 'peek_0', 'peek_1', 'duck']) {
        expect(Object.keys(p.frames)).toContain(peekerFrame(cover, f));
      }
      expect(p.anims?.[peekerFrame(cover, 'duck')]).toMatchObject({ loop: false });
    }
    expect(p.anims?.['duck']).toMatchObject({ loop: false });
    // The little one keeps its Skitterkin colors in every act (custom legend, not the env's).
    expect(p.legend).toMatchObject({ M: 'coral.3', V: 'green.3' });
    expect(count(grid('prop.peeker', 'peek_0'), 'Q')).toBeGreaterThan(
      count(grid('prop.peeker', 'hidden'), 'Q'),
    );
    expect(count(grid('prop.peeker', 'peek_1'), 'Q')).toBeLessThan(
      count(grid('prop.peeker', 'peek_0'), 'Q'),
    );
  });
});

describe('Act I deaths and props (T311c)', () => {
  it('gives every Act I Skitterkin a towers can kill the comic pop: four frames, played once', () => {
    for (const id of [
      'enemy.nibbler',
      'enemy.zoomer',
      'enemy.chonk',
      'enemy.brood_hauler',
      'enemy.youngling',
      'enemy.puffwing',
      'enemy.bunchling',
      'enemy.digger',
      'enemy.elder',
    ] as const) {
      const d = def(id);
      expect(Object.keys(d.frames), id).toEqual(expect.arrayContaining([...DEATH_FRAMES]));
      expect(d.anims?.['death'], id).toEqual(DEATH_ANIM);
      // The squash keeps the body (wider, flatter); the pop throws confetti; the last frame is
      // almost empty, so the unit is gone when the anim ends.
      expect(count(grid(id, 'death_0'), '.')).toBeGreaterThan(count(grid(id, 'walk_se_0'), '.'));
      expect(count(grid(id, 'death_3'), '.')).toBeGreaterThan(count(grid(id, 'death_1'), '.'));
    }
    // Gerald is never killed (he's the mail) and the Matriarch is driven off: no death pop.
    expect(def('enemy.gerald').anims?.['death']).toBeUndefined();
    expect(def('enemy.chitterbloom').anims?.['death']).toBeUndefined();
  });

  it("draws the Chonk's scutes as separate plates with steel rims (the Armored tell)", () => {
    for (const f of ['walk_se_0', 'walk_ne_0']) {
      expect(
        count(grid('enemy.chonk', f), 'S') + count(grid('enemy.chonk', f), 'T'),
      ).toBeGreaterThan(8);
    }
  });
});

describe('M3 tell glyphs (art-direction §8)', () => {
  it('are 8×8, in their tell colors', () => {
    for (const [id, c] of [
      ['icon.tell.flying', 'white.0'],
      ['icon.tell.burrower', 'grime.4'],
      ['icon.tell.splitter', 'pink.3'],
      ['icon.tell.huddle', 'gold.3'],
      ['icon.tell.boss', 'gold.4'],
    ] as const) {
      expect(def(id).size, id).toEqual({ w: 6, h: 6 });
      expect(Object.values(def(id).legend ?? {}), id).toContain(c);
    }
    // D097: the burrower's arrow has a white-hot core so it reads on dirt and grass.
    expect(def('icon.tell.burrower').legend).toMatchObject({ W: 'white.1' });
  });
});

/** The opaque silhouette's width. */
function spanW(rows: readonly string[]): number {
  const b = bounds(rows);
  return b.x1 - b.x0 + 1;
}

describe('Matriarch Chitterbloom (T311b)', () => {
  const id = 'enemy.chitterbloom';

  it('is the biggest thing on the road, within the boss canvas (tech-spec: up to 64×64)', () => {
    const d = def(id);
    expect(d.size.w + 2).toBeLessThanOrEqual(64);
    expect(d.size.h + 2).toBeLessThanOrEqual(64);
    const her = spanW(grid(id, 'walk_se_0'));
    for (const big of ['enemy.brood_hauler', 'enemy.elder'] as const) {
      expect(her, big).toBeGreaterThan(spanW(grid(big, 'walk_se_0')) + 8);
    }
  });

  it('has every boss state the sim reads, in four facings where she moves', () => {
    const anims = def(id).anims ?? {};
    for (const a of [
      'walk',
      'tell',
      'sneeze',
      'dig',
      'under',
      'surface',
      'panic',
      'puff',
      'flee',
    ]) {
      for (const f of ['se', 'sw', 'ne', 'nw'])
        expect(anims[`${a}_${f}`], `${a}_${f}`).toBeDefined();
    }
    // The one-shot beats play once; the tells and states loop.
    expect(anims['sneeze_se']).toMatchObject({ loop: false });
    expect(anims['surface_se']).toMatchObject({ loop: false });
    expect(anims['tell_se']).not.toHaveProperty('loop');
  });

  it('wears her blossom crown in every pose, even underground', () => {
    for (const f of [
      'walk_se_0',
      'walk_ne_0',
      'dig_se_0',
      'under_se_0',
      'panic_ne_1',
      'flee_se_0',
    ]) {
      expect(count(grid(id, f), 'PQ'), f).toBeGreaterThan(20);
    }
    expect(def(id).legend).toMatchObject({ P: 'pink.3', Q: 'pink.4' });
  });

  it('shows each tell with a shape change, not only a color', () => {
    const walk = grid(id, 'walk_se_1');
    // The sneeze tell stretches her taller; the sneeze squashes her and blows fluff out in front.
    const bodyHeight = (f: string): number => {
      const b = bounds(grid(id, f).map((r) => r.replace(/[PQcdbF+*]/g, '.')));
      return b.y1 - b.y0;
    };
    expect(bodyHeight('tell_se_1')).toBeGreaterThan(bodyHeight('walk_se_1'));
    expect(count(grid(id, 'sneeze_se_0'), 'Fw')).toBeGreaterThan(count(walk, 'Fw') + 20);
    // The dig flings dirt; phase 3 trails the haste speed lines; the puff bristles wider.
    expect(count(grid(id, 'dig_se_0'), 'MNO')).toBeGreaterThan(40);
    expect(count(grid(id, 'panic_se_0'), 'L')).toBeGreaterThan(6);
    expect(spanW(grid(id, 'puff_se_0'))).toBeGreaterThan(spanW(walk));
    // Underground she is a mound, far lower than her standing silhouette.
    const under = bounds(grid(id, 'under_se_0'));
    expect(under.y1 - under.y0).toBeLessThan(bodyHeight('walk_se_1') / 2);
  });

  it('has a wave-preview icon with the crown', () => {
    expect(count(grid('icon.enemy.chitterbloom', 'icon'), 'PQ')).toBeGreaterThan(6);
  });
});

describe('wreckage and the salvage drone (T311b)', () => {
  it('stands each wreck on its tile center, with lit and half-cleared frames', () => {
    const d = def('prop.wreckage');
    expect(d.size.w).toBe(32);
    expect(d.anchor).toEqual({ x: 16, y: d.size.h - 8 });
    for (const v of ['v0', 'v1']) {
      expect(grid('prop.wreckage', `${v}_lit`), v).not.toEqual(grid('prop.wreckage', v));
      expect(count(grid('prop.wreckage', `${v}_half`), 'WVST'), v).toBeLessThan(
        count(grid('prop.wreckage', v), 'WVST') / 2,
      );
      // The salvage stake's hazard stripes: the "clear me" cue on every wreck.
      expect(count(grid('prop.wreckage', v), 'O'), v).toBeGreaterThan(4);
    }
    // Dead hardware (D097): no Everglow white left on the wreck, the stake keeps its orange, and
    // the patch is a burnt ink.1 heart with a grime rim; custom legend, so it holds in every act.
    expect(d.legend).toMatchObject({ W: 'steel.3', O: 'orange.3', K: 'ink.1', J: 'grime.1' });
    expect(Object.values(d.legend ?? {})).not.toContain('white.1');
    expect(Object.values(d.legend ?? {})).not.toContain('white.0');
    for (const v of ['v0', 'v1']) {
      expect(count(grid('prop.wreckage', v), 'K'), v).toBeGreaterThan(12);
      expect(count(grid('prop.wreckage', v), 'J'), v).toBeGreaterThan(8);
    }
    // The stake's beacon winks slowly while the wreck waits (≤ 3 Hz), faster once queued.
    for (const v of ['v0', 'v1']) {
      const idle = d.anims?.[`idle_${v}`];
      expect(
        idle && 'frames' in idle ? idle.frames.length / idle.fps : 0,
        v,
      ).toBeGreaterThanOrEqual(1);
    }
    expect(d.variants).toContain('act3');
  });

  it('flies the drone with blurring rotors and clears with a beam down to its anchor', () => {
    const d = def('prop.salvage_drone');
    expect(d.anims?.['fly']).toBeDefined();
    expect(d.anims?.['work']).toBeDefined();
    expect(grid('prop.salvage_drone', 'fly_0')).not.toEqual(grid('prop.salvage_drone', 'fly_1'));
    // No beam in flight; while working, the beam's emissive reaches the ground point.
    const beamRow = (f: string): string => grid('prop.salvage_drone', f)[d.anchor.y] ?? '';
    expect(count([beamRow('fly_0')], '+*')).toBe(0);
    expect(count([beamRow('work_0')], '+*')).toBeGreaterThan(2);
    // Boxy Everglow white with orange hazard bands, not Gerald's round capsule.
    expect(d.palette).toBe('everglow');
    expect(count(grid('prop.salvage_drone', 'fly_0'), 'bc')).toBeGreaterThan(6);
  });
});

/** The highest opaque row of a confetti frame. */
function confettiTop(f: string): number {
  return bounds(grid('fx.confetti_burst', f)).y0;
}

describe("Act I's payoff staging (D097: the stinger and the party)", () => {
  it('runs the Rig 9 feed: live, static, six frames of the wrong shape, then NO SIGNAL', () => {
    const d = def('scene.rig9_feed');
    const frames = Object.keys(d.frames);
    for (const f of ['live_0', 'live_1', 'no_signal_0', 'no_signal_1']) expect(frames).toContain(f);
    const smudge = d.anims?.['smudge'];
    // Six frames, about half a second, once.
    expect(smudge).toMatchObject({ fps: 12, loop: false });
    expect(smudge && 'frames' in smudge ? smudge.frames : []).toHaveLength(6);
    expect(d.anims?.['static']).toBeDefined();
    // The shape is the Hollow: its palette's reserved acid and pale outline show only on the
    // smudge frames, never on the quiet feed or the NO SIGNAL card.
    expect(d.palette).toBe('hollow');
    for (const f of ['live_0', 'live_1', 'no_signal_0'])
      expect(count(grid('scene.rig9_feed', f), 'abcde+*x')).toBe(0);
    for (const f of ['smudge_1', 'smudge_3', 'smudge_4']) {
      expect(count(grid('scene.rig9_feed', f), 'cd'), f).toBeGreaterThan(0);
      expect(count(grid('scene.rig9_feed', f), 'NO'), f).toBeGreaterThan(
        count(grid('scene.rig9_feed', 'live_0'), 'NO'),
      );
    }
    // It grows: each smudge frame shows more of it than the one before, up to the tear.
    const body = (k: number): number => count(grid('scene.rig9_feed', `smudge_${k}`), 'NOx');
    expect(body(1)).toBeGreaterThan(body(0));
    expect(body(3)).toBeGreaterThan(body(1));
    expect(body(4)).toBeGreaterThan(body(3));
    // The NO SIGNAL card blinks its text (lit, then dim), under 3 Hz.
    expect(grid('scene.rig9_feed', 'no_signal_0')).not.toEqual(
      grid('scene.rig9_feed', 'no_signal_1'),
    );
    expect(d.anims?.['no_signal']).toMatchObject({ fps: 1 });
  });

  it('throws confetti from the cannon’s muzzle, and drifts it down in a seamless loop', () => {
    const d = def('fx.confetti_burst');
    const burst = d.anims?.['burst'];
    expect(burst).toMatchObject({ loop: false });
    expect(burst && 'frames' in burst ? burst.frames : []).toHaveLength(6);
    // The fountain rises: the highest piece climbs over the first frames.
    expect(confettiTop('burst_2')).toBeLessThan(confettiTop('burst_0'));
    // Every party colour shows.
    const all = Object.keys(d.frames).map((f) => grid('fx.confetti_burst', f).join(''));
    for (const ch of ['P', 'G', 'B', 'T', 'O', 'R']) expect(all.join('')).toContain(ch);
    const fall = d.anims?.['fall'];
    expect(fall && 'frames' in fall ? fall.frames.length : 0).toBeGreaterThanOrEqual(6);
    // The cannon it stages with fires once.
    expect(def('prop.confetti_cannon').anims?.['fire']).toMatchObject({ loop: false });
  });
});
