// The reference profile's M5 rows (T500b; story/campaign.md § 4.9): A2M4–A2M6 follow the table,
// and each is priced on the real campaign timeline before its map exists, by standing the map in
// with a copy of A1M5 that pays its first-clear Stardust and carries its row (the
// [purchasable] check, validatePurchasable.ts, reads only registered maps).
import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../campaign.ts';
import { RAW_CONTENT } from '../registry.ts';
import type { IdSpace, MapDef, RawContent } from '../types.ts';
import { DEFAULT_VALIDATION_RULES, validate } from '../validate.ts';
import { LIVE_PURCHASE_RULES, type PurchaseRules } from '../validatePurchasable.ts';
import { REFERENCE_ECONOMY, REFERENCE_PROFILES } from './reference.ts';

/** campaign.md § 4.9's first-clear Stardust for the maps the stand-ins replace. */
const STARDUST = [
  ['a2_m01', 180],
  ['a2_m02', 195],
  ['a2_m03', 210],
  ['a2_m04', 225],
  ['a2_m05', 240],
  ['a2_m06', 260],
  ['a3_m01', 280],
  ['a3_m02', 300],
  ['a3_m03', 320],
] as const;

/** The live campaign with every map through A3M3 present, unbuilt ones stood in. */
function withRows(): RawContent<IdSpace> {
  const a1m5: MapDef<IdSpace> = RAW_CONTENT.maps.a1_m05;
  const maps: Record<string, MapDef<IdSpace>> = { ...RAW_CONTENT.maps };
  const campaign: string[] = [...CAMPAIGN];
  for (const [id, stardust] of STARDUST) {
    if (campaign.includes(id)) continue;
    maps[id] = { ...a1m5, id, stardust, referenceProfile: REFERENCE_PROFILES[id] };
    campaign.push(id);
  }
  return { ...RAW_CONTENT, maps, campaign };
}

/** The [purchasable] errors of `withRows()` under `rules`. */
function purchasable(rules: PurchaseRules): string[] {
  return validate(withRows(), { ...DEFAULT_VALIDATION_RULES, purchases: rules }).filter((e) =>
    e.startsWith('[purchasable]'),
  );
}

describe('REFERENCE_PROFILES, Act II part two (M5)', () => {
  it('follows campaign.md § 4.9 into A2M4 and A2M5', () => {
    const { a2_m03, a2_m04, a2_m05 } = REFERENCE_PROFILES;
    expect(a2_m04.towers).toEqual(a2_m03.towers);
    expect(a2_m04.specs).toEqual(['thumper', 'sprinkler', 'zapcoil']);
    expect(a2_m04.shop).toEqual({ ...a2_m03.shop, tune_zapcoil: 2, tune_rivet: 2 });
    expect(a2_m04.protocols).toEqual(['head_start']);
    expect(a2_m04.technicianAbility).toBe('orbital_strike');
    // C2 Return takes the bank after A2M4: A2M5 buys nothing.
    expect(a2_m05).toEqual(a2_m04);
    expect(REFERENCE_ECONOMY.bankResetAfter).toEqual(['a2_m04']);
  });

  it("follows campaign.md § 4.9 into A2M6: the Prism Spire (A2M5's gift) and Reinforced Core 2", () => {
    const { a2_m05, a2_m06 } = REFERENCE_PROFILES;
    expect(a2_m06.towers).toEqual([...a2_m05.towers, 'prism']);
    expect(a2_m06.specs).toEqual(a2_m05.specs);
    expect(a2_m06.shop).toEqual({ ...a2_m05.shop, reinforced_core: 2 });
  });

  it('prices the rows on the campaign timeline (each stub tower as its task will leave it)', () => {
    // A stub tower (the Scuttle Den until T604) waits for its task: priced as it will be.
    const live = { ...LIVE_PURCHASE_RULES, aheadOfTask: [] };
    expect(purchasable(live)).toEqual([]);
    // While a tower is ahead of its task, every row owning it is refused for it alone.
    const ahead = purchasable({ ...LIVE_PURCHASE_RULES, aheadOfTask: ['burrow'] });
    expect(ahead.length).toBe(3);
    for (const e of ahead)
      expect(e).toMatch(/a3_m0[1-3]\.referenceProfile.*'burrow' waits for its task/);
  });

  it("checks A2M5's row against the bank C2 Return emptied", () => {
    // Anything bought before A2M5 has only what came after the reset to spend: nothing.
    const raw = withRows();
    const a2m5 = raw.maps.a2_m05!;
    const shop = { ...a2m5.referenceProfile.shop, tune_skyhook: 1 };
    const maps = {
      ...raw.maps,
      a2_m05: { ...a2m5, referenceProfile: { ...a2m5.referenceProfile, shop } },
    };
    expect(validate({ ...raw, maps }).join('\n')).toMatch(
      /a2_m05\.referenceProfile: spends 40 Stardust since the bank reset after a2_m04; the maps before it pay 0/,
    );
  });
});

describe('REFERENCE_PROFILES, Act III part one (M6, T600b)', () => {
  const { a2_m06, a3_m01, a3_m02, a3_m03 } = REFERENCE_PROFILES;

  it('follows campaign.md § 4.9 into A3M1: the Scuttle Den (a briefing gift) and Ability Coolant 1', () => {
    expect(a3_m01.towers).toEqual([...a2_m06.towers, 'burrow']);
    expect(a3_m01.specs).toEqual(a2_m06.specs);
    expect(a3_m01.shop).toEqual({ ...a2_m06.shop, ability_coolant: 1 });
    // One slot: Head Start stays on for the Escort.
    expect(a3_m01.protocols).toEqual(['head_start']);
    expect(a3_m01.technicianAbility).toBe('orbital_strike');
  });

  it('follows it into A3M2: the Harpoon and the Mindspike, the Bulkhead on for the Defend', () => {
    expect(a3_m02.towers).toEqual([...a3_m01.towers, 'harpoon', 'mindspike']);
    expect(a3_m02.protocols).toEqual(['emergency_bulkhead']);
    expect(a3_m02.technicianAbility).toBe('orbital_strike');
  });

  it('follows it into A3M3: the Clean Exit took the Rivet and the uplink; Seed Money 2', () => {
    expect(a3_m03.towers).toEqual(a3_m02.towers.filter((t) => t !== 'rivet'));
    expect(a3_m03.towers).toContain('thumper'); // the Everglow class A3M2 didn't take
    expect(a3_m03.shop).toEqual({ ...a3_m02.shop, seed_money: 2 });
    expect(a3_m03.technicianAbility).toBeNull();
  });

  it('every Act III row is affordable: Intel 10 by A3M2, as § 4.9 says', () => {
    const live = { ...LIVE_PURCHASE_RULES, aheadOfTask: [] };
    expect(purchasable(live).filter((e) => /a3_m0\d/.test(e))).toEqual([]);
  });
});
