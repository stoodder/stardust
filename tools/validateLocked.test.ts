// validateBuilds' [locked-abilities] and [flag-profile]'s reachability (D150), on the dev_bearers
// fixture map (render/__fixtures__/devM7.ts): its militia post is gated by `door_choice`, so every
// run sets the convoy's door unless it names another.
import { describe, expect, it } from 'vitest';
import { DEV_CONTENT, type DevIds } from '../src/render/__fixtures__/devBattle.ts';
import { bearersMap } from '../src/render/__fixtures__/devM7.ts';
import type { IdSpace, MapDef, RawContent } from '../src/content/types.ts';
import { validate } from '../src/content/validate.ts';

const W = 'maps.dev_bearers';

function errors(patch: Partial<MapDef<DevIds>>, rule: string): string[] {
  const raw: RawContent<IdSpace> = {
    ...DEV_CONTENT,
    maps: { dev_bearers: { ...bearersMap, ...patch } },
  };
  return validate(raw).filter((e) => e.startsWith(`[${rule}] `));
}

const warren = { flag: 'door_choice', eq: 'warren' } as const;
const convoy = { flag: 'door_choice', eq: 'convoy' } as const;

describe('[locked-abilities]', () => {
  it('accepts a lock no run equips under its flags', () => {
    expect(errors({}, 'locked-abilities')).toEqual([]);
    // Par under the warren equips the profile's dev_strike, but its cell plays a par without it.
    const cell = {
      when: { door_choice: 'warren' as const },
      profile: { ...bearersMap.referenceProfile, technicianAbility: null },
      parBuild: bearersMap.parBuild,
    };
    const locked = [{ ability: 'dev_strike' as const, when: warren }];
    expect(
      errors({ lockedAbilities: locked, referenceProfileByFlag: [cell] }, 'locked-abilities'),
    ).toEqual([]);
  });

  it("rejects par equipping a locked ability under one of the map's flag assignments (#14)", () => {
    const locked = [{ ability: 'dev_strike' as const, when: warren }];
    expect(errors({ lockedAbilities: locked }, 'locked-abilities')).toEqual([
      `[locked-abilities] ${W}.parBuild: equips 'dev_strike' in slot 1 under door_choice=warren, where the map locks it`,
    ]);
  });

  it('rejects an alt or no-counter build equipping one under the flags every run sets', () => {
    // The militia's gate sets the convoy's door on every run that names no door.
    const locked = [{ ability: 'dev_strike' as const, when: convoy }];
    expect(errors({ lockedAbilities: locked }, 'locked-abilities')).toEqual([
      `[locked-abilities] ${W}.parBuild: equips 'dev_strike' in slot 1 under door_choice=convoy, where the map locks it`,
      `[locked-abilities] ${W}.noCounterBuilds.splash: equips 'dev_strike' in slot 1 under door_choice=convoy, where the map locks it`,
    ]);
  });

  it('rejects a lock condition that reads anything but story flags', () => {
    const when = { all: [warren, { stat: 'abilityUses' as const, gte: 1 }] };
    expect(
      errors({ lockedAbilities: [{ ability: 'dev_strike', when }] }, 'locked-abilities'),
    ).toEqual([
      `[locked-abilities] ${W}.lockedAbilities[0].when: must read story flags only (flag atoms, and all/any/not over them): it is judged before the battle`,
    ]);
  });
});

describe('[flag-profile] reachability', () => {
  it('rejects a cell an earlier cell covers (first match wins)', () => {
    const profile = bearersMap.referenceProfile;
    const cells = [
      { when: { door_choice: 'warren' as const }, profile },
      { when: { door_choice: 'warren' as const, quill_choice: 'purge' as const }, profile },
      { when: { quill_choice: 'purge' as const }, profile },
    ];
    const flagVariants = {
      door_choice: ['convoy', 'warren'] as const,
      quill_choice: ['keep', 'purge'] as const,
    };
    expect(errors({ referenceProfileByFlag: cells, flagVariants }, 'flag-profile')).toEqual([
      `[flag-profile] ${W}.referenceProfileByFlag[1].when: unreachable: referenceProfileByFlag[0] matches every run this cell does (first match wins)`,
    ]);
  });
});
