// Issued towers (meta/issued.ts): derived from content/upgrades/access.ts's `how: 'issued'` rows.
import { describe, expect, it } from 'vitest';
import { TOWER_ACCESS } from '../content/upgrades/index.ts';
import type { TowerId } from '../content/types.ts';
import { issuedTowers, withIssuedTowers } from './issued.ts';
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

  it('a played but lost map issues nothing; gifts and licenses are never issued', () => {
    const save = createNewSave();
    save.campaign.maps.a1_m01 = { completed: false, medals: [], bestMeter: 0 };
    expect(withIssuedTowers(save)).toBe(save);
    const access = {
      rivet: { how: 'issued', availableAfter: null },
      thumper: { how: 'gift', availableAfter: null },
      sprinkler: { how: 'license', availableAfter: null, currency: 'stardust', price: 100 },
      skyhook: { how: 'gift', availableAfter: 'a1_m01' },
      zapcoil: { how: 'license', availableAfter: null, currency: 'stardust', price: 0 },
    } as const satisfies Record<TowerId, unknown>;
    expect(issuedTowers(createNewSave(), access)).toEqual(['rivet']);
  });

  it('keeps a revoked issued tower owned (revocation is its own list)', () => {
    const save = createNewSave();
    save.unlocks.revokedTowers = ['rivet'];
    expect(withIssuedTowers(save)).toBe(save);
  });
});
