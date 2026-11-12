// M7's tower art (T740b; art-direction §4, §5, §7, §8; tech-spec § Format rules): the Gloop
// Spitter (an ex-Chonk that aims and spits) and the Sproing Pad (the mushroom pad and its leaper,
// idling and bouncing) on the warren footing, the `everglow.jailbroken` palette and the four
// Everglow bases' `_jb` twins, Big Glorp's `fx.puddle`, the Acid Rain and Sticky Flak tethers, the
// build icons, System Reboot's icon, and the `disabler`, `healer`, and Jammed glyphs.
import { describe, expect, it } from 'vitest';
import { bodyLuminance, contrastRatio, sprite } from '../__fixtures__/valueBands.ts';
import { ENV_PALETTES } from '../palettes/env.ts';
import { FACTION_PALETTES } from '../palettes/factions.ts';
import { PALETTES } from '../palettes/index.ts';
import { ALL_SPRITES } from './all.ts';
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

const TOWERS = ['tower.gloop', 'tower.sproing'] as const;
const EVERGLOW = ['tower.rivet', 'tower.thumper', 'tower.sprinkler', 'tower.skyhook'] as const;

describe('M7 tower bases (tech-spec § Format rules)', () => {
  for (const id of TOWERS) {
    it(`${id}: T2 is 4+ px wider than T1 and T3 6+ px taller, in the allied Skitterkin palette`, () => {
      const [t1, t2, t3] = (['t1', 't2', 't3'] as const).map((t) => bounds(grid(id, t)));
      if (t1 === undefined || t2 === undefined || t3 === undefined) throw new Error('tiers');
      expect(t2.x1 - t2.x0).toBeGreaterThanOrEqual(t1.x1 - t1.x0 + 4);
      expect(t3.y0).toBeLessThanOrEqual(t2.y0 - 6);
      expect(sprite(id).palette).toBe('skitterkin.ally');
      expect(sprite(`${id}_head`).palette).toBe('skitterkin.ally');
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

    it(`${id}: stands on earth with one glowworm lantern per tier`, () => {
      const lights = (f: string): number => count(grid(id, f).slice(20), '*');
      expect(lights('t1')).toBe(1);
      expect(lights('t2')).toBe(2);
      expect(lights('t3')).toBe(3);
      expect(sprite(id).legend?.F).toBe('skin.b.3');
    });
  }

  it('every M7 tower, base and head, reads a band above Act III’s road', () => {
    const road = bodyLuminance(sprite('tile.path'), 'tread_x', ENV_PALETTES.act3);
    for (const [id, frames] of [
      ['tower.gloop', ['t1', 't3']],
      ['tower.sproing', ['t1', 't3']],
      ['tower.gloop_head', ['se', 'ne']],
      ['tower.sproing_head', ['rest0', 'empty0']],
    ] as const) {
      const d: SpriteDef = sprite(id);
      for (const f of frames) {
        const l = bodyLuminance(d, f, PALETTES[d.palette]);
        expect(contrastRatio(l, road), `${id}:${f}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('the Gloop Spitter’s head: an ex-Chonk that aims and spits', () => {
  const head = 'tower.gloop_head';

  it('aims (an `se` frame) with a spit anim for every facing, tier-2 head, and spec', () => {
    expect(Object.hasOwn(sprite(head).frames, 'se')).toBe(true);
    for (const suffix of ['', '_t2', '_spec_a', '_spec_b']) {
      for (const f of ['se', 'sw', 'ne', 'nw']) {
        const a = sprite(head).anims?.[`fire_${f}${suffix}`];
        expect(a, `fire_${f}${suffix}`).toBeDefined();
      }
      expect(anim(head, `fire_se${suffix}`).loop).toBe(false);
    }
  });

  it('wears the Chonk’s steel-rimmed back bands and its teal tuft, facing either way', () => {
    for (const f of ['se', 'ne', 'se_spec_b']) {
      expect(count(grid(head, f), 'VS'), f).toBeGreaterThan(8);
      expect(count(grid(head, f), 'cd'), f).toBeGreaterThanOrEqual(3);
    }
  });

  it('spits: each fire frame throws more acid than its rest frame', () => {
    for (const f of ['se', 'ne', 'se_t2', 'se_spec_a', 'se_spec_b', 'ne_spec_b']) {
      expect(count(grid(head, `${f}_fire`), 'AG'), f).toBeGreaterThan(count(grid(head, f), 'AG'));
    }
  });

  it('each spec head differs from the T2+ head and the other spec', () => {
    for (const facing of ['se', 'ne']) {
      const t2 = grid(head, `${facing}_t2`);
      const a = grid(head, `${facing}_spec_a`);
      const b = grid(head, `${facing}_spec_b`);
      expect(silhouetteDiff(a, t2), facing).toBeGreaterThan(12);
      expect(silhouetteDiff(a, b), facing).toBeGreaterThan(12);
    }
    // The T2 gourd on its back; Corrosive Kiss's pink lips; Big Glorp's drool.
    expect(count(grid(head, 'se_t2'), 'MNO')).toBeGreaterThan(count(grid(head, 'se'), 'MNO'));
    expect(count(grid(head, 'se_spec_b'), 'PR')).toBeGreaterThan(4);
    expect(count(grid(head, 'se_spec_a'), 'AG')).toBeGreaterThan(count(grid(head, 'se_t2'), 'AG'));
  });
});

describe('the Sproing Pad’s head: the mushroom pad and its leaper, idling and bouncing', () => {
  const head = 'tower.sproing_head';

  it('idles (no aim) on `idle`, with each spec’s own idle', () => {
    expect(Object.hasOwn(sprite(head).frames, 'se')).toBe(false);
    expect(Object.keys(sprite(head).anims ?? {})[0]).toBe('idle');
    const first = anim(head, 'idle').frames[0] ?? '';
    for (const spec of ['spec_a', 'spec_b']) {
      const a = anim(head, `idle_${spec}`);
      expect(a.frames.length, spec).toBeGreaterThanOrEqual(4);
      expect(
        silhouetteDiff(grid(head, a.frames[0] ?? ''), grid(head, first)),
        spec,
      ).toBeGreaterThan(12);
    }
    const frames = new Set(anim(head, 'idle').frames.map((f) => grid(head, f).join('|')));
    expect(frames.size).toBeGreaterThan(1);
  });

  it('bounces once per leap (render’s idle-head `fire`): pressed, sprung empty, wobbling', () => {
    for (const suffix of ['', '_spec_a', '_spec_b']) {
      const a = anim(head, `fire${suffix}`);
      expect(a.loop, suffix).toBe(false);
      expect(a.frames.length / a.fps, suffix).toBeLessThanOrEqual(0.5);
      // The leaper's eyes are on the pad while pressed, gone once it has sprung.
      const eyes = (f: string): number => count(grid(head, f), 'w');
      expect(eyes(a.frames[0] ?? ''), suffix).toBeGreaterThan(0);
      expect(eyes(a.frames[1] ?? ''), suffix).toBe(0);
    }
  });

  it('has an empty pad for while its leaper is out, and Sky Bouncers seats two', () => {
    for (const suffix of ['', '_spec_a', '_spec_b']) {
      for (const f of anim(head, `empty${suffix}`).frames)
        expect(count(grid(head, f), 'wk3')).toBe(0);
    }
    expect(count(grid(head, 'rest0_spec_a'), 'w')).toBe(2 * count(grid(head, 'rest0'), 'w'));
    // The pad's blue cap is the leaper helmet's blue (ally.leaper).
    expect(sprite(head).legend?.R).toBe(sprite('ally.leaper').legend?.R);
  });
});

describe('the jailbroken Everglow towers (`everglow.jailbroken`; towers.md § 9)', () => {
  it('is everglow.worn with the status lights gone Vrell orange', () => {
    const jb = FACTION_PALETTES['everglow.jailbroken'];
    const worn = FACTION_PALETTES['everglow.worn'];
    expect({ ...jb, e0: worn.e0, e1: worn.e1 }).toEqual(worn);
    expect([jb.e0, jb.e1]).toEqual([FACTION_PALETTES.vrell.e0, FACTION_PALETTES.vrell.e1]);
    expect(jb.e0).not.toBe(FACTION_PALETTES.everglow.e0);
  });

  for (const id of EVERGLOW) {
    it(`${id}: bakes the palette, base and head, and a \`_jb\` twin of every base frame`, () => {
      expect(sprite(id).variants).toContain('everglow.jailbroken');
      expect(sprite(`${id}_head`).variants).toContain('everglow.jailbroken');
      for (const f of ['t1', 't2', 't3', 'spec_a', 'spec_b']) {
        const plain = grid(id, f);
        const jb = grid(id, `${f}_jb`);
        // The scratched cross and the brass patch, and nothing else changed but the plate.
        expect(count(jb, 'X'), f).toBeGreaterThanOrEqual(3);
        expect(count(jb, 'YZ'), f).toBeGreaterThanOrEqual(2);
        expect(silhouetteDiff(plain, jb), f).toBe(0);
        let changed = 0;
        jb.forEach((r, y) => {
          for (let x = 0; x < r.length; x++) if (r[x] !== plain[y]?.[x]) changed++;
        });
        expect(changed, f).toBeLessThanOrEqual(14);
      }
      // The logo chevron (`8` on the left face, rows 24–26) is scratched out.
      expect(count(grid(id, 't1_jb').slice(24, 27), '8')).toBeLessThan(
        count(grid(id, 't1').slice(24, 27), '8'),
      );
    });
  }
});

describe('Big Glorp’s puddle (`fx.puddle`) and the M7 link tethers', () => {
  it('is a pool two tiles across, its fill a dither, bubbling, then drying once', () => {
    const d = sprite('fx.puddle');
    expect(d.size).toEqual({ w: 64, h: 32 });
    expect(anim('fx.puddle', 'pool').loop).not.toBe(false);
    expect(anim('fx.puddle', 'dry').loop).toBe(false);
    // The fill: no two fill pixels side by side in the pool's middle row.
    const mid = grid('fx.puddle', 'pool_0')[16] ?? '';
    expect(mid.slice(8, 56)).not.toMatch(/GG/);
    expect(count(grid('fx.puddle', 'pool_0'), 'w')).toBeGreaterThanOrEqual(3);
    expect(count(grid('fx.puddle', 'dry_2'), 'AGH')).toBeLessThan(
      count(grid('fx.puddle', 'dry_0'), 'AGH') / 5,
    );
  });

  it('draws Acid Rain and Sticky Flak tethers in every direction, each its own shape', () => {
    for (const link of ['acid_rain', 'sticky_flak']) {
      for (const dir of ['e', 'se', 'ne', 's']) {
        expect(sprite('fx.link_tether').anims?.[`${link}_${dir}`], `${link}_${dir}`).toBeDefined();
      }
    }
    const crossfire = grid('fx.link_tether', 'crossfire_e_0');
    for (const link of ['acid_rain', 'sticky_flak']) {
      expect(grid('fx.link_tether', `${link}_e_0`).join('|')).not.toBe(crossfire.join('|'));
    }
    // Acid Rain drips (drops under the line); Sticky Flak's line is 2 px thick.
    expect(count(grid('fx.link_tether', 'acid_rain_e_0'), 'A')).toBeGreaterThan(3);
    expect(count(grid('fx.link_tether', 'sticky_flak_e_0'), 'H')).toBeGreaterThan(20);
  });
});

describe('M7 icons and glyphs (art-direction §5, §8)', () => {
  it('registers no placeholders: each draws its own art, not a borrowed shape', () => {
    for (const [id, old] of [
      ['icon.tower.gloop', 'icon.tower.burrow'],
      ['icon.tower.sproing', 'icon.tower.choir'],
      ['icon.ability.system_reboot', 'icon.ability.underfoot'],
      ['icon.tell.disabler', 'icon.tell.heavy'],
      ['icon.tell.healer', 'icon.tell.regen'],
      ['tower.gloop_head', 'tower.burrow_head'],
      ['tower.sproing_head', 'tower.choir_head'],
    ] as const) {
      const a = sprite(id);
      const b = sprite(old);
      expect(JSON.stringify(a.frames), id).not.toBe(JSON.stringify(b.frames));
    }
    expect(ALL_SPRITES.filter((d) => d.id === 'icon.jammed')).toHaveLength(1);
  });

  it('sizes the icons 14×14 and the glyphs 6×6, each in its own colour', () => {
    for (const id of ['icon.tower.gloop', 'icon.tower.sproing', 'icon.ability.system_reboot']) {
      expect(sprite(id).size, id).toEqual({ w: 14, h: 14 });
    }
    for (const id of ['icon.tell.disabler', 'icon.tell.healer', 'icon.jammed']) {
      expect(sprite(id).size, id).toEqual({ w: 6, h: 6 });
    }
    expect(sprite('icon.tell.disabler').legend).toMatchObject({ C: 'orange.3' });
    expect(sprite('icon.tell.healer').legend).toMatchObject({ G: 'green.3' });
    // The healer's plus: a cross, its corners clear.
    const plus = grid('icon.tell.healer', 'icon');
    expect([plus[0]?.[0], plus[0]?.[5], plus[5]?.[0], plus[5]?.[5]]).toEqual(['.', '.', '.', '.']);
  });
});
