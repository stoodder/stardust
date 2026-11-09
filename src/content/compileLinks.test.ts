// Link compilation (T202a): the live registry (Crossfire, Sitting Ducks, Conductive; towers.md
// § 6.2)
// and every compile error a malformed link raises.
import { describe, expect, it } from 'vitest';
import { FIXTURE } from './__fixtures__/content.ts';
import { compileContent, ContentCompileError } from './compile.ts';
import { RAW_CONTENT } from './registry.ts';
import { STATUS_BITS, statusMask } from './rules.ts';
import type { IdSpace, LinkDef, RawContent } from './types.ts';

const live = compileContent(RAW_CONTENT);

function errorsFor(links: Record<string, LinkDef<IdSpace>>): readonly string[] {
  const raw: RawContent<IdSpace> = { ...FIXTURE, links };
  try {
    compileContent(raw);
  } catch (e) {
    if (e instanceof ContentCompileError) return e.errors;
    throw e;
  }
  return [];
}

const link = (over: Partial<LinkDef<IdSpace>> = {}): LinkDef<IdSpace> => ({
  id: 'fx_link',
  name: 'Fixture Link',
  partners: [
    { tower: 'fx_gun', bonuses: [{ stat: 'rate', pct: 0.1 }] },
    { tower: 'fx_mortar', bonuses: [{ stat: 'rate', pct: 0.1 }] },
  ],
  ...over,
});

describe('the live links (towers.md § 6.2)', () => {
  it('Crossfire: Rivet + Thumper, both +10% fire rate', () => {
    const [rivet, thumper] = live.links[0]!.partners;
    expect(live.links[0]).toMatchObject({ id: 'crossfire', name: 'Crossfire', index: 0, bit: 1 });
    expect(rivet).toMatchObject({ tower: 'rivet', pctRate: 0.1, pctDamage: 0, flatRange: 0 });
    expect(thumper).toMatchObject({ tower: 'thumper', pctRate: 0.1, vsStatusMask: 0 });
  });

  it('Sitting Ducks: Thumper +20% damage vs Chilled, Sprinkler +0.3 radius', () => {
    const [thumper, sprinkler] = live.links[1]!.partners;
    expect(live.links[1]).toMatchObject({ id: 'sitting_ducks', index: 1, bit: 2 });
    expect(thumper).toMatchObject({
      tower: 'thumper',
      pctDamage: 0,
      vsStatusMask: statusMask(['chilled']),
      vsStatusPct: 0.2,
    });
    expect(sprinkler).toMatchObject({ tower: 'sprinkler', flatRange: 0.3, pctRange: 0 });
  });

  it('Conductive: Zapcoil +2 chain jumps, the Sprinkler Soaks for 3 s (T304b)', () => {
    const [sprinkler, zapcoil] = live.links[2]!.partners;
    expect(live.links[2]).toMatchObject({ id: 'conductive', index: 2, bit: 4 });
    expect(sprinkler).toMatchObject({ tower: 'sprinkler', soakedTicks: 180, chainJumps: 0 });
    expect(zapcoil).toMatchObject({ tower: 'zapcoil', chainJumps: 2, soakedTicks: 0 });
    expect(live.links[0]!.partners[0]).toMatchObject({ chainJumps: 0, soakedTicks: 0 });
  });

  it('lists each tower’s links on its compiled def', () => {
    expect(live.towers.rivet.links).toEqual(['crossfire']);
    expect(live.towers.thumper.links).toEqual(['crossfire', 'sitting_ducks']);
    expect(live.towers.sprinkler.links).toEqual(['sitting_ducks', 'conductive']);
    expect(live.towers.zapcoil.links).toEqual(['conductive']);
  });

  it('refuses chain jumps that aren’t a whole number > 0, and a Soak that isn’t > 0', () => {
    const [gun, mortar] = link().partners;
    for (const chainJumps of [0, 1.5, -1]) {
      expect(errorsFor({ fx_link: link({ partners: [{ ...gun, chainJumps }, mortar] }) })).toEqual([
        'links.fx_link.partners[0].chainJumps: needs a whole number > 0',
      ]);
    }
    for (const soakedSec of [0, -3, Number.NaN]) {
      expect(errorsFor({ fx_link: link({ partners: [gun, { ...mortar, soakedSec }] }) })).toEqual([
        'links.fx_link.partners[1].soakedSec: needs a duration > 0',
      ]);
    }
  });

  it('numbers statuses in EffectDef order (the vsStatus mask bits)', () => {
    expect(STATUS_BITS).toEqual([
      'chilled',
      'soaked',
      'corroded',
      'marked',
      'pinned',
      'stasis',
      'unnerved',
    ]);
    expect(statusMask(['chilled', 'marked'])).toBe(0b1001);
    expect(statusMask([])).toBe(0);
  });
});

describe('link compile errors', () => {
  it('accepts a well-formed link', () => {
    expect(errorsFor({ fx_link: link() })).toEqual([]);
  });

  it('refuses an unknown tower, the same tower twice, and a key that isn’t its id', () => {
    const partner = { tower: 'fx_nope', bonuses: [{ stat: 'rate' as const, pct: 0.1 }] };
    expect(errorsFor({ fx_link: link({ partners: [link().partners[0], partner] }) })).toEqual([
      "links.fx_link: unknown tower 'fx_nope'",
    ]);
    const gun = link().partners[0];
    expect(errorsFor({ fx_link: link({ partners: [gun, gun] }) })).toEqual([
      'links.fx_link: partners must be two different towers',
    ]);
    expect(errorsFor({ other: link() })).toEqual([
      "links.other: registered under 'other' but its id is 'fx_link'",
    ]);
  });

  it('refuses a bonus with nothing in it, and a vsStatus bonus that isn’t a damage pct', () => {
    const [gun, mortar] = link().partners;
    const empty = { tower: 'fx_gun', bonuses: [{ stat: 'rate' as const }] };
    expect(errorsFor({ fx_link: link({ partners: [empty, mortar] }) })).toEqual([
      'links.fx_link.partners[0].bonuses[0]: needs a finite, non-zero flat or pct',
    ]);
    const flatVs = {
      tower: 'fx_mortar',
      bonuses: [{ stat: 'damage' as const, flat: 2, vsStatus: ['chilled' as const] }],
    };
    const rangeVs = {
      tower: 'fx_mortar',
      bonuses: [{ stat: 'range' as const, pct: 0.2, vsStatus: ['chilled' as const] }],
    };
    for (const bad of [flatVs, rangeVs]) {
      expect(errorsFor({ fx_link: link({ partners: [gun, bad] }) })).toEqual([
        'links.fx_link.partners[1].bonuses[0]: a vsStatus bonus is a damage pct against at least one status',
      ]);
    }
  });

  it('refuses two vsStatus bonuses on one tower (the sim holds one per tower)', () => {
    const vs = {
      tower: 'fx_mortar',
      bonuses: [{ stat: 'damage' as const, pct: 0.2, vsStatus: ['chilled' as const] }],
    };
    const gun = link().partners[0];
    const sprinkler = { tower: 'fx_sprinkler', bonuses: [{ stat: 'range' as const, flat: 0.3 }] };
    expect(
      errorsFor({
        fx_a: link({ id: 'fx_a', partners: [gun, vs] }),
        fx_b: link({ id: 'fx_b', partners: [vs, sprinkler] }),
      }),
    ).toEqual([
      "links.fx_b: 'fx_mortar' already has a vsStatus bonus (from 'fx_a'); a tower takes one",
    ]);
  });
});
