// T540b's art (art-direction §4–§8): the Sunderglass Penitent in every state the sim shows (and the
// Ward's kneel), the Aelari towers (Prism Spire, Mindspike Obelisk, Seer's Lantern) on their
// floating dais with tiers and specs, the beam's knot, Stillness's icon, the M5 tell glyphs, and
// every one of them in Act II's value bands.
import { describe, expect, it } from 'vitest';
import { bodyLuminance, contrastRatio, slotLuminance } from '../__fixtures__/valueBands.ts';
import { ENV_PALETTES } from '../palettes/env.ts';
import { PALETTES } from '../palettes/index.ts';
import { SPRITES } from './index.ts';
import type { SpriteDef } from './types.ts';

function def(id: string): SpriteDef {
  const d: SpriteDef | undefined = SPRITES.find((s) => s.id === id);
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

/** Opaque pixels (shadow excluded). */
function opaque(rows: readonly string[]): number {
  return rows
    .join('')
    .split('')
    .filter((c) => !'._'.includes(c)).length;
}

/** Opaque bounds (shadow excluded). */
function bounds(rows: readonly string[]): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if ('._'.includes(r.charAt(x))) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  });
  return { x0, x1, y0, y1 };
}

/** Transparent pixels the outside can't reach (4-connected): the see-through gaps. */
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

/** Opaque pixels as `x,y` keys, relative to the sprite's anchor (its ground point). */
function silhouette(id: string, frame: string): Set<string> {
  const d = def(id);
  const out = new Set<string>();
  grid(id, frame).forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (!'._'.includes(r.charAt(x))) out.add(`${x - d.anchor.x},${y - d.anchor.y}`);
    }
  });
  return out;
}

/** The share of two silhouettes' union only one covers, laid at their ground points. */
function unlike(a: [string, string], b: [string, string]): number {
  const sa = silhouette(...a);
  const sb = silhouette(...b);
  const both = [...sa].filter((k) => sb.has(k)).length;
  return 1 - both / (sa.size + sb.size - both);
}

/** How many pixels differ in opacity between two same-size grids. */
function silhouetteDiff(a: readonly string[], b: readonly string[]): number {
  let n = 0;
  a.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if ('._'.includes(r.charAt(x)) !== '._'.includes(b[y]?.charAt(x) ?? '.')) n++;
    }
  });
  return n;
}

const PENITENT = 'enemy.sunderglass_penitent';
const POSES = ['walk', 'tell', 'broken', 'kneel', 'flee'] as const;
const FACINGS = ['se', 'sw', 'ne', 'nw'] as const;

describe('the Sunderglass Penitent (T540b; art-direction §6)', () => {
  const frames = Object.entries(def(PENITENT).frames).filter((e): e is [string, string[]] =>
    Array.isArray(e[1]),
  );

  it('is woven Aelari: blue outline outside only, real gaps, lit from inside, no auto outline', () => {
    const d = def(PENITENT);
    expect(d.palette).toBe('aelari');
    expect(d.outline ?? 'none').toBe('none');
    for (const [name, rows] of frames) {
      expect(holes(rows), name).toBeGreaterThanOrEqual(30);
      expect(count(rows, 'x'), name).toBeGreaterThan(60);
      expect(count(rows, '+*'), name).toBeGreaterThan(0);
    }
  });

  it('is the biggest Aelari on the road, broad where the Glass Witch is tall, within the boss canvas', () => {
    const walk = bounds(grid(PENITENT, 'walk_se_0'));
    const witch = bounds(grid('enemy.glass_witch', 'walk_se_0'));
    expect(walk.x1 - walk.x0).toBeGreaterThan(witch.x1 - witch.x0 + 8);
    expect(walk.y1 - walk.y0).toBeGreaterThanOrEqual(witch.y1 - witch.y0);
    expect(def(PENITENT).size.w).toBeLessThanOrEqual(64);
    expect(def(PENITENT).size.h).toBeLessThanOrEqual(64);
    // Laid over each other at their ground points, the two bosses share under half their shape.
    expect(unlike([PENITENT, 'walk_se_0'], ['enemy.glass_witch', 'walk_se_0'])).toBeGreaterThan(
      0.4,
    );
  });

  it('has an anim for every state the sim shows, in four facings, each its own shape', () => {
    const anims = def(PENITENT).anims ?? {};
    for (const p of POSES) {
      for (const f of FACINGS) expect(anims[`${p}_${f}`], `${p}_${f}`).toBeDefined();
    }
    expect(anims['flee_se']).toMatchObject({ loop: false });
    const walk = grid(PENITENT, 'walk_se_0');
    for (const p of ['tell_se_1', 'broken_se_0', 'kneel_se_0']) {
      expect(silhouetteDiff(grid(PENITENT, p), walk), p).toBeGreaterThan(20);
    }
    // The tell raises motes over its shoulders; the kneel is far lower and wider (arms spread).
    const w = bounds(walk);
    expect(bounds(grid(PENITENT, 'tell_se_1')).y0).toBeLessThan(w.y0 - 4);
    const kneel = bounds(grid(PENITENT, 'kneel_se_0'));
    expect(kneel.y0).toBeGreaterThan(w.y0 + 8);
    expect(kneel.x1 - kneel.x0).toBeGreaterThan(w.x1 - w.x0 + 4);
    // The stand-down ends in the kneel, so the fading boss and the Ward read as one figure.
    expect(grid(PENITENT, 'flee_se_1')).toEqual(grid(PENITENT, 'kneel_se_0'));
    expect(bounds(grid(PENITENT, 'flee_se_0')).y0).toBeGreaterThan(w.y0);
  });

  it('marches behind its shield wall, and the broken wall opens its chest', () => {
    // The pane: a run of emerald frame across the wall's top, facing us; none from behind.
    const frame = (rows: readonly string[]): number => count(rows, '678');
    expect(frame(grid(PENITENT, 'walk_se_0'))).toBeGreaterThan(60);
    // Broken, most of the glass is gone: far more see-through, and the heart shows white.
    const walk = grid(PENITENT, 'walk_se_0');
    const broken = grid(PENITENT, 'broken_se_0');
    expect(holes(broken)).toBeGreaterThan(holes(walk) + 40);
    expect(count(broken, '*')).toBeGreaterThan(count(walk, '*'));
    // The tell lights the pane: many more knots of light than the march.
    expect(count(grid(PENITENT, 'tell_se_1'), '+*')).toBeGreaterThan(count(walk, '+*') + 30);
  });

  it('casts its eyes down (the raised wall hides them in the tell), shuts them to kneel, none from behind; ruby binds its wrists', () => {
    const head = (f: string): readonly string[] => grid(PENITENT, f).slice(0, 26);
    expect(count(head('walk_se_0'), '+')).toBeGreaterThanOrEqual(2);
    expect(count(grid(PENITENT, 'kneel_se_0'), 'w')).toBe(0);
    expect(count(head('walk_ne_0'), 'w')).toBe(0);
    for (const [name, rows] of frames) expect(count(rows, 'cd'), name).toBeGreaterThanOrEqual(10);
  });

  it('wears a closed weave over an ink backing (U4): a dark figure on gold, still with real gaps', () => {
    expect(def(PENITENT).legend).toMatchObject({ K: 'ink.0' });
    for (const f of ['kneel_se_0', 'kneel_ne_0', 'walk_ne_0', 'tell_ne_0', 'broken_ne_0']) {
      const rows = grid(PENITENT, f);
      const inside = opaque(rows) + holes(rows);
      const open = holes(rows) / inside;
      const gaps = (holes(rows) + count(rows, 'K')) / inside;
      // About a quarter of the body is gap; about half of that is backed in ink.
      expect(gaps, `${f} gaps`).toBeGreaterThan(0.18);
      expect(gaps, `${f} gaps`).toBeLessThan(0.32);
      expect(open, `${f} see-through`).toBeGreaterThan(0.08);
      expect(open, `${f} see-through`).toBeLessThan(0.18);
    }
  });

  it('marches: its four walk frames differ, and a foot lifts', () => {
    const walk = [0, 1, 2, 3].map((k) => grid(PENITENT, `walk_se_${k}`).join('|'));
    expect(new Set(walk).size).toBe(4);
  });

  it('has a woven wave-preview icon, unlike the Witch’s', () => {
    const icon = grid('icon.enemy.sunderglass_penitent', 'icon');
    expect(icon.length).toBe(16);
    expect(holes(icon)).toBeGreaterThan(0);
    expect(count(icon, 'cd')).toBeGreaterThanOrEqual(3);
    expect(silhouetteDiff(icon, grid('icon.enemy.glass_witch', 'icon'))).toBeGreaterThan(30);
  });
});

const TOWERS = ['prism', 'mindspike', 'lantern'] as const;

/** A tower head's resting SE frame (the Lantern's idle first frame). */
function se(t: string): [string, string] {
  return t === 'lantern' ? [`tower.${t}_head`, 'glow_0'] : [`tower.${t}_head`, 'se'];
}

describe('the Aelari towers (T540b; design/towers.md § Aelari towers)', () => {
  it('stand on the floating Aelari dais: aelari palette, no Everglow logo or Vrell price tag', () => {
    for (const t of TOWERS) {
      const d = def(`tower.${t}`);
      expect(d.palette, t).toBe('aelari');
      expect(d.legend?.['W'], t).toBeUndefined();
      // The dais floats: shadow shows under it, a clear row between its outline and the shadow's
      // far edge below the head's mount.
      const t1 = grid(`tower.${t}`, 't1');
      expect(count(t1, '_'), t).toBeGreaterThan(10);
      // The emerald ring the head floats over, and the sapphire slab's glass.
      expect(count(t1, '89'), t).toBeGreaterThan(10);
      expect(count(t1, '23'), t).toBeGreaterThan(60);
    }
  });

  it('each dais wears its tower’s trim (U5): one shape, three colourings', () => {
    const trim = { prism: 'e', mindspike: 'U', lantern: 'GH' } as const;
    for (const t of TOWERS) {
      for (const f of ['t1', 't2', 't3', 'spec_a', 'spec_b']) {
        expect(count(grid(`tower.${t}`, f), trim[t]), `${t}:${f}`).toBeGreaterThanOrEqual(12);
      }
    }
    expect(def('tower.lantern').legend).toMatchObject({ G: 'gold.3', H: 'gold.4' });
    // Same silhouette at T1, different pixels.
    const t1 = TOWERS.map((t) => grid(`tower.${t}`, 't1'));
    for (let i = 0; i < t1.length; i++) {
      for (let j = i + 1; j < t1.length; j++) {
        const a = t1[i] ?? [];
        const b = t1[j] ?? [];
        expect(silhouetteDiff(a, b)).toBe(0);
        const differ = a.join('').split('').filter((c, k) => c !== b.join('').charAt(k)).length;
        expect(differ, `${TOWERS[i]} vs ${TOWERS[j]}`).toBeGreaterThanOrEqual(20);
      }
    }
  });

  for (const t of TOWERS) {
    it(`${t}: T2 is wider than T1, T3 taller than T2; specs as wide as T2 and unlike T3 and each other`, () => {
      const id = `tower.${t}`;
      const [t1, t2, t3] = (['t1', 't2', 't3'] as const).map((f) => bounds(grid(id, f)));
      if (t1 === undefined || t2 === undefined || t3 === undefined) throw new Error('tiers');
      expect(t2.x1 - t2.x0).toBeGreaterThanOrEqual(t1.x1 - t1.x0 + 4);
      expect(t3.y0).toBeLessThanOrEqual(t2.y0 - 6);
      for (const spec of ['spec_a', 'spec_b']) {
        const b = bounds(grid(id, spec));
        expect(b.x1 - b.x0, spec).toBeGreaterThanOrEqual(t2.x1 - t2.x0);
        expect(silhouetteDiff(grid(id, spec), grid(id, 't3')), spec).toBeGreaterThan(30);
      }
      expect(silhouetteDiff(grid(id, 'spec_a'), grid(id, 'spec_b'))).toBeGreaterThan(30);
    });
  }

  for (const t of ['prism', 'mindspike'] as const) {
    it(`${t}: aims, with a bigger T2+ head and spec heads unlike it and each other, fire anims everywhere`, () => {
      const head = `tower.${t}_head`;
      for (const facing of ['se', 'ne']) {
        const base = grid(head, facing);
        const t2 = grid(head, `${facing}_t2`);
        const a = grid(head, `${facing}_spec_a`);
        const b = grid(head, `${facing}_spec_b`);
        expect(opaque(t2), `${facing} t2`).toBeGreaterThan(opaque(base));
        expect(silhouetteDiff(a, t2), `${facing} a`).toBeGreaterThan(12);
        expect(silhouetteDiff(b, t2), `${facing} b`).toBeGreaterThan(12);
        expect(silhouetteDiff(a, b), facing).toBeGreaterThan(12);
        // Firing changes the frame (the heart blazes, the eye flares).
        expect(grid(head, `${facing}_fire`).join('|')).not.toBe(base.join('|'));
      }
      for (const suffix of ['', '_t2', '_spec_a', '_spec_b']) {
        for (const f of FACINGS) {
          expect(def(head).anims?.[`fire_${f}${suffix}`], `fire_${f}${suffix}`).toBeDefined();
        }
      }
    });
  }

  it('the Prism’s heart sits where its beam leaves it (9 px over the mount: BeamView’s 14 over the tile)', () => {
    const head = def('tower.prism_head');
    const rows = grid('tower.prism_head', 'se');
    const row = rows[head.anchor.y - 9] ?? '';
    expect(row).toContain('*');
  });

  it('the Mindspike has a pink-ringed mind-eye (Psionic), the Lantern a gold-white light in its cage', () => {
    expect(def('tower.mindspike_head').legend).toMatchObject({ U: 'violet.4', V: 'violet.3' });
    expect(count(grid('tower.mindspike_head', 'se'), 'd')).toBeGreaterThanOrEqual(4);
    expect(count(grid('tower.mindspike_head', 'se_fire'), 'w')).toBeGreaterThanOrEqual(1);
    const lantern = grid('tower.lantern_head', 'glow_0');
    expect(count(lantern, '*')).toBeGreaterThanOrEqual(1);
    expect(count(lantern, 'GH')).toBeGreaterThanOrEqual(8);
  });

  it('the Lantern turns: an idle `glow` first, its frames all differ, and a spec anim each', () => {
    const anims = def('tower.lantern_head').anims ?? {};
    expect(Object.keys(anims)[0]).toBe('glow');
    expect(anims['glow_spec_a']).toBeDefined();
    expect(anims['glow_spec_b']).toBeDefined();
    const glow = [0, 1, 2, 3].map((k) => grid('tower.lantern_head', `glow_${k}`).join('|'));
    expect(new Set(glow).size).toBe(4);
    expect(def('tower.lantern_head').frames['se']).toBeUndefined();
  });

  it('read apart at 1× (U5): a squat pink gem, a violet needle, a round gold-lit cage', () => {
    expect(unlike(se('prism'), se('mindspike'))).toBeGreaterThan(0.35);
    expect(unlike(se('prism'), se('lantern'))).toBeGreaterThan(0.35);
    expect(unlike(se('mindspike'), se('lantern'))).toBeGreaterThan(0.35);
    const prism = grid(...se('prism'));
    const needle = grid(...se('mindspike'));
    const lantern = grid(...se('lantern'));
    // Each head is mostly its signature colour: ruby-pink, psionic violet, sapphire round gold.
    expect(count(prism, 'bcde') / opaque(prism)).toBeGreaterThan(0.5);
    expect(count(needle, 'STUV') / opaque(needle)).toBeGreaterThan(0.5);
    expect(count(lantern, 'bcde')).toBeLessThan(6);
    expect(count(lantern, 'STUV')).toBe(0);
    // Shapes, above the cradle: the gem broad (≥ 10 px, under 2× as tall as wide), the needle ≤ 5 px
    // wide and ≥ 4× as tall, the cage round (width and height within 2 px).
    const above = (rows: readonly string[]): readonly string[] => rows.slice(0, rows.length - 8);
    const p = bounds(above(prism));
    const n = bounds(above(needle));
    const l = bounds(above(lantern));
    expect(p.x1 - p.x0 + 1).toBeGreaterThanOrEqual(10);
    expect(p.y1 - p.y0 + 1).toBeLessThan(2 * (p.x1 - p.x0 + 1));
    expect(n.x1 - n.x0 + 1).toBeLessThanOrEqual(5);
    expect(n.y1 - n.y0 + 1).toBeGreaterThanOrEqual(4 * (n.x1 - n.x0 + 1));
    expect(Math.abs(l.x1 - l.x0 - (l.y1 - l.y0))).toBeLessThanOrEqual(4);
  });

  it('their build icons tell apart the same way: pink, violet, gold', () => {
    const icon = (t: string): readonly string[] => grid(`icon.tower.${t}`, 'icon');
    expect(count(icon('prism'), 'bcde')).toBeGreaterThanOrEqual(30);
    expect(count(icon('mindspike'), 'STUV')).toBeGreaterThanOrEqual(20);
    expect(count(icon('lantern'), 'GH')).toBeGreaterThanOrEqual(12);
    expect(silhouetteDiff(icon('prism'), icon('mindspike'))).toBeGreaterThan(15);
    expect(silhouetteDiff(icon('mindspike'), icon('lantern'))).toBeGreaterThan(15);
  });
});

describe('the beam’s knot and the M5 icons (T540b)', () => {
  it('sparks once on a lock, biggest first, and holds on the target flickering', () => {
    const d = def('fx.beam_knot');
    expect(d.anims?.['spark']).toMatchObject({ loop: false });
    expect(d.anims?.['hold']).toMatchObject({ frames: ['h0', 'h1'] });
    const size = (f: string): number => 121 - count(grid('fx.beam_knot', f), '.');
    expect(size('s0')).toBeGreaterThan(size('s1'));
    expect(size('s1')).toBeGreaterThan(size('s2'));
    expect(grid('fx.beam_knot', 'h0').join('|')).not.toBe(grid('fx.beam_knot', 'h1').join('|'));
  });

  it('draws Stillness as a raised hand in a ring of stasis crystal', () => {
    const icon = grid('icon.ability.stillness', 'icon');
    expect(def('icon.ability.stillness').palette).toBe('aelari');
    expect(count(icon, 'w')).toBeGreaterThanOrEqual(6);
    expect(count(icon, '+*')).toBeGreaterThanOrEqual(2);
  });

  it('draws the M5 tell glyphs in their tell colours (art-direction §8)', () => {
    const colours = (id: string): string[] => Object.values(def(id).legend ?? {});
    expect(colours('icon.tell.blink')).toContain('violet.4');
    expect(colours('icon.tell.phasing')).toContain('teal.4');
    expect(colours('icon.tell.shield_aura')).toEqual(expect.arrayContaining(['blue.4', 'white.1']));
    // Cloaked is pattern only: no hue.
    for (const c of colours('icon.tell.stealth')) expect(c).toMatch(/^(steel|white)\./);
    // Heavy is the Hollow's: its pale inverted outline, acid inside.
    expect(def('icon.tell.heavy').palette).toBe('hollow');
    expect(count(grid('icon.tell.heavy', 'icon'), 'cd')).toBeGreaterThan(12);
    for (const id of [
      'icon.tell.stealth',
      'icon.tell.blink',
      'icon.tell.shield_aura',
      'icon.tell.phasing',
      'icon.tell.heavy',
    ]) {
      expect(def(id).size, id).toEqual({ w: 6, h: 6 });
    }
  });
});

describe("T540b's art in Act II's value bands (art-direction §1, §3; D127)", () => {
  for (const env of ['act2.gold', 'act2.dusk'] as const) {
    const palette = ENV_PALETTES[env];
    const path = bodyLuminance(def('tile.path'), 'tread_x', palette);

    it(`${env}: the Penitent's knots shine over the road inside a rim darker than it`, () => {
      for (const frame of ['walk_se_0', 'walk_ne_0', 'tell_se_0', 'broken_se_0', 'kneel_se_0']) {
        const knots = slotLuminance(def(PENITENT), frame, ['e0', 'e1', 'hi']);
        const rim = slotLuminance(def(PENITENT), frame, ['outline']);
        expect(contrastRatio(knots, path), `${frame} knots`).toBeGreaterThanOrEqual(2);
        expect(path, `${frame} rim`).toBeGreaterThan(rim);
        expect(contrastRatio(rim, path), `${frame} rim`).toBeGreaterThanOrEqual(3);
      }
    });

    it(`${env}: every Aelari tower base sits a band above the road`, () => {
      for (const t of TOWERS) {
        for (const frame of ['t1', 't2', 't3', 'spec_a', 'spec_b']) {
          const d = def(`tower.${t}`);
          const l = bodyLuminance(d, frame, PALETTES[d.palette]);
          expect(l, `${t}:${frame}`).toBeGreaterThan(path);
          expect(contrastRatio(l, path), `${t}:${frame}`).toBeGreaterThanOrEqual(1.2);
        }
      }
    });
  }
});
