// Readability rules for specific sprites (art-direction §1, §5, §6, §8): tier silhouettes, the
// Zoomer's `fast` tell, contact shadows, the apron's dither, the Brood Hauler's sack, Bricks, the
// raised and powered tiles, and link tethers.
import { describe, expect, it } from 'vitest';
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

function count(rows: readonly string[], chars: string): number {
  return rows
    .join('')
    .split('')
    .filter((c) => chars.includes(c)).length;
}

describe('tower tier silhouettes', () => {
  for (const id of ['tower.rivet', 'tower.thumper', 'tower.sprinkler'] as const) {
    it(`${id}: T2 is wider than T1 and T3 taller than T2`, () => {
      const [t1, t2, t3] = (['t1', 't2', 't3'] as const).map((t) => bounds(grid(id, t)));
      if (t1 === undefined || t2 === undefined || t3 === undefined) throw new Error('tiers');
      expect(t2.x1 - t2.x0).toBeGreaterThanOrEqual(t1.x1 - t1.x0 + 4);
      expect(t3.y0).toBeLessThanOrEqual(t2.y0 - 6);
    });
  }
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
  for (const id of ['tower.rivet_head', 'tower.thumper_head'] as const) {
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
    expect(def('enemy.brood_hauler').legend).toMatchObject({ S: 'steel.4', T: 'steel.3' });
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

describe('Bricks at his post', () => {
  it('idles and fires in four facings (SE and NE authored, mirrored)', () => {
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
      ].toSorted(),
    );
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
