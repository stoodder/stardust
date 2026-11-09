// R&D Command's Technician abilities (T406; design/progression.md § 7.3): Scanner Sweep is sold on
// R&D's shelf after A2M1 for 2 Intel, bought once, and owning it puts it in the loadout's slot-1
// pool beside Orbital Strike. A2M1 isn't registered yet, so its win is a hand-made record.
import { describe, expect, it } from 'vitest';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import { loadoutPools } from './loadout.ts';
import { abilityPool } from './pools.ts';
import { buy, offerFor, refusalMessage, shelf, type StoreCatalog, LIVE_STORE } from './purchase.ts';
import type { SaveData } from './saveData.ts';

const SWEEP = { kind: 'ability', id: 'scanner_sweep' } as const;

/** The reference save into A2M1, with `intel` in the bank and A2M1 won if `won`. */
function save(intel: number, won: boolean): SaveData {
  const s = DEV_SAVES.after_a1m5_ref.build();
  s.currencies.intel = intel;
  if (won) {
    const maps: Record<string, unknown> = s.campaign.maps;
    maps.a2_m01 = { ...s.campaign.maps.a1_m05, completed: true };
  }
  return s;
}

describe('R&D ability purchases (T406)', () => {
  it("isn't stocked until A2M1 is won, then costs 2 Intel", () => {
    expect(offerFor(save(5, false), SWEEP)).toMatchObject({
      pane: 'rnd',
      currency: 'intel',
      price: 2,
      owned: 0,
      ranks: 1,
      availableAfter: 'a2_m01',
      refusal: 'not_stocked',
    });
    expect(offerFor(save(5, true), SWEEP)?.refusal).toBeNull();
    expect(offerFor(save(1, true), SWEEP)?.refusal).toBe('short');
    // The dev hook stocks the whole pane.
    expect(offerFor(save(5, false), SWEEP, ['rnd'])?.refusal).toBeNull();
  });

  it('buying it adds it to the save once, and to the slot-1 pool', () => {
    const before = save(5, true);
    expect(abilityPool(before)).toEqual(['orbital_strike']);
    const r = buy(before, SWEEP);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.currencies.intel).toBe(3);
    expect(r.save.unlocks.abilities).toEqual([...before.unlocks.abilities, 'scanner_sweep']);
    expect(abilityPool(r.save)).toEqual(['orbital_strike', 'scanner_sweep']);
    expect(loadoutPools(r.save).abilities).toContain('scanner_sweep');
    expect(before.unlocks.abilities).not.toContain('scanner_sweep'); // the input is untouched
    expect(buy(r.save, SWEEP)).toMatchObject({ ok: false, reason: 'maxed' });
    expect(offerFor(r.save, SWEEP)).toMatchObject({ owned: 1, refusal: 'maxed' });
  });

  it("is on R&D's shelf after its upgrades, and nowhere else", () => {
    const s = save(5, true);
    const rnd = shelf(s, 'rnd');
    expect(rnd.at(-1)?.item).toEqual(SWEEP);
    expect(rnd.filter((o) => o.item.kind === 'ability')).toHaveLength(1);
    for (const pane of ['shop', 'engineering'] as const) {
      expect(shelf(s, pane, [pane]).some((o) => o.item.kind === 'ability')).toBe(false);
    }
  });

  it('refuses a gift ability and one outside the catalog as unknown', () => {
    const s = save(9, true);
    expect(offerFor(s, { kind: 'ability', id: 'orbital_strike' })).toBeNull();
    expect(buy(s, { kind: 'ability', id: 'no_such' })).toMatchObject({
      ok: false,
      reason: 'unknown',
    });
    expect(refusalMessage(s, SWEEP, offerFor(save(0, true), SWEEP))).toMatch(/costs 2 intel/);
    // A fixture catalog's ability that isn't live can be offered but never stored.
    const fixture: StoreCatalog = {
      ...LIVE_STORE,
      abilityAccess: { fx_scan: { how: 'rnd', currency: 'intel', price: 1, availableAfter: null } },
    };
    expect(offerFor(s, { kind: 'ability', id: 'fx_scan' }, [], fixture)?.refusal).toBeNull();
    expect(buy(s, { kind: 'ability', id: 'fx_scan' }, [], fixture)).toMatchObject({
      ok: false,
      reason: 'unknown',
    });
  });
});
