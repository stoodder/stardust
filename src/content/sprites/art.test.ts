// Readability rules for specific sprites (art-direction §1, §5, §8): tier silhouettes, the
// Zoomer's `fast` tell, contact shadows, and the apron's dither.
import { describe, expect, it } from 'vitest';
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
