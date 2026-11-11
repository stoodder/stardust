// Issued towers (meta/issued.ts): derived from content/upgrades/access.ts's `how: 'issued'` rows.
import { describe, expect, it } from 'vitest';
import { TOWER_ACCESS } from '../content/upgrades/index.ts';
import type { TowerId } from '../content/types.ts';
import { issuedTowers, withIssuedTowers } from './issued.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import { STARTING_TOWERS, createNewSave } from './saveData.ts';

describe('issued towers', () => {
  it("a new save owns exactly the towers issued from the start (access.ts's null rows)", () => {
    const fromStart = Object.entries(TOWER_ACCESS)
      .filter(([, a]) => a.how === 'issued' && a.availableAfter === null)
      .map(([id]) => id);
    expect([...STARTING_TOWERS]).toEqual(fromStart);
    expect(issuedTowers(createNewSave())).toEqual(fromStart);
    const fresh = createNewSave();
    expect(withIssuedTowers(fresh)).toBe(fresh);
  });

  it('A1M1 won issues the Sprinkler for A1M2 (campaign.md § 4.1)', () => {
    const save = createNewSave();
    save.campaign.maps.a1_m01 = { completed: true, medals: [], bestMeter: 20 };
    expect(issuedTowers(save)).toEqual(['rivet', 'thumper', 'sprinkler']);
    const next = withIssuedTowers(save);
    expect(next.unlocks.towers).toEqual(['rivet', 'thumper', 'sprinkler']);
    expect(save.unlocks.towers).toEqual(['rivet', 'thumper']); // the input is untouched
    expect(withIssuedTowers(next)).toBe(next); // idempotent
  });

  it('a played but lost map issues nothing; gifts and paid licenses are never issued', () => {
    const save = createNewSave();
    save.campaign.maps.a1_m01 = { completed: false, medals: [], bestMeter: 0 };
    expect(withIssuedTowers(save)).toBe(save);
    const access = {
      rivet: { how: 'issued', availableAfter: null },
      thumper: { how: 'gift', availableAfter: null },
      sprinkler: { how: 'license', availableAfter: null, currency: 'stardust', price: 100 },
      skyhook: { how: 'gift', availableAfter: 'a1_m01' },
      zapcoil: { how: 'license', availableAfter: 'a1_m01', currency: 'stardust', price: 0 },
      lookout: { how: 'license', availableAfter: null, currency: 'stardust', price: 150 },
      harpoon: { how: 'gift', availableAfter: 'a1_m02' },
      crane: { how: 'license', availableAfter: null, currency: 'intel', price: 2 },
      prism: { how: 'gift', availableAfter: null },
      mindspike: { how: 'attune', availableAfter: null, currency: 'intel', price: 3 },
      lantern: { how: 'attune', availableAfter: null, currency: 'intel', price: 3 },
      burrow: { how: 'gift', availableAfter: null },
      choir: { how: 'gift', availableAfter: null },
      bloom: { how: 'attune', availableAfter: null, currency: 'intel', price: 3 },
      gloop: { how: 'gift', availableAfter: null },
      sproing: { how: 'gift', availableAfter: null },
    } as const satisfies Record<TowerId, unknown>;
    expect(issuedTowers(createNewSave(), access)).toEqual(['rivet']);
  });

  it("Zibzab's Zapcoil sample is given the moment the shop opens: A1M3 won (T308)", () => {
    const save = DEV_SAVES.mid_m2.build();
    expect(issuedTowers(save)).not.toContain('zapcoil');
    save.campaign.maps.a1_m03 = { completed: true, medals: ['victory'], bestMeter: 20 };
    expect(issuedTowers(save)).toContain('zapcoil');
    const next = withIssuedTowers(save);
    expect(next.unlocks.towers.at(-1)).toBe('zapcoil');
    expect(withIssuedTowers(next)).toBe(next);
    // A paid license is never given: a free one only.
    const access = {
      ...TOWER_ACCESS,
      zapcoil: { how: 'license', availableAfter: 'a1_m03', currency: 'stardust', price: 40 },
    } as const;
    expect(issuedTowers(save, access)).not.toContain('zapcoil');
  });

  it('keeps a revoked issued tower owned (revocation is its own list)', () => {
    const save = createNewSave();
    save.unlocks.revokedTowers = ['rivet'];
    expect(withIssuedTowers(save)).toBe(save);
  });
});
