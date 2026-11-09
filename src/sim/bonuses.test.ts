// The stacking formula on a tier's attack (design/towers.md § 4; T202a).
import { describe, expect, it } from 'vitest';
import { STAT_PCT_CAPS, statusMask } from '../content/rules.ts';
import { GUN, MORTAR, WALKER, setup, spawn } from './__fixtures__/combat.ts';
import {
  NO_BONUSES,
  bonusDamage,
  bonusDamageVs,
  bonusPeriodTicks,
  bonusRangeTiles,
  hasStatusIn,
} from './bonuses.ts';

const gun = GUN.tiers[0].attack!; // 10 dmg, 30-tick period (2/s), range 3
const mortar = MORTAR.tiers[0].attack!; // 20 dmg, 120 ticks, range 3.5

describe('the stacking formula', () => {
  it('is the tier’s stat exactly with no bonuses', () => {
    expect(bonusDamage(gun, NO_BONUSES)).toBe(10);
    expect(bonusPeriodTicks(gun, NO_BONUSES)).toBe(30);
    expect(bonusRangeTiles(gun, NO_BONUSES)).toBe(3);
  });

  it('adds flats first, then the summed percent (never multiplied)', () => {
    const b = {
      ...NO_BONUSES,
      flatDamage: 2,
      pctDamage: 0.1 + 0.2,
      flatRange: 0.5,
      pctRange: 0.25,
    };
    expect(bonusDamage(gun, b)).toBeCloseTo(15.6, 12); // (10 + 2) × 1.3
    expect(bonusRangeTiles(gun, b)).toBeCloseTo(4.375, 12); // (3 + 0.5) × 1.25
  });

  it('caps each stat’s percent total: +150% damage, +100% rate, +60% range', () => {
    expect(STAT_PCT_CAPS).toEqual({ damage: 1.5, rate: 1, range: 0.6 });
    const huge = { ...NO_BONUSES, pctDamage: 9, pctRate: 9, pctRange: 9 };
    expect(bonusDamage(gun, huge)).toBe(25);
    expect(bonusPeriodTicks(gun, huge)).toBe(15); // 4/s
    expect(bonusRangeTiles(gun, huge)).toBeCloseTo(4.8, 12);
  });

  it('rounds the bonus rate back to whole ticks, like compiled content', () => {
    expect(bonusPeriodTicks(gun, { ...NO_BONUSES, pctRate: 0.1 })).toBe(27); // 60 / 2.2 = 27.3
    expect(bonusPeriodTicks(mortar, { ...NO_BONUSES, pctRate: 0.1 })).toBe(109); // 60 / 0.55
    expect(bonusPeriodTicks(gun, { ...NO_BONUSES, flatRate: 1 })).toBe(20); // 3/s
    // A rate bonus never stops a tower.
    expect(bonusPeriodTicks(gun, { ...NO_BONUSES, flatRate: -5 })).toBe(30);
  });

  it('adds a conditional vsStatus percent to the damage percent, under the same cap', () => {
    const b = { ...NO_BONUSES, pctDamage: 0.1, vsStatusMask: 1, vsStatusPct: 0.2 };
    expect(bonusDamageVs(mortar, b)).toBeCloseTo(26, 12); // 20 × 1.3
    expect(bonusDamageVs(mortar, { ...b, pctDamage: 1.45 })).toBe(50); // capped at +150%
  });
});

describe('hasStatusIn', () => {
  it('reads each status bit off the enemy’s status fields', () => {
    const { state } = setup();
    const e = spawn(state, WALKER);
    const all = statusMask(['chilled', 'soaked', 'corroded', 'marked']);
    expect(hasStatusIn(e, all)).toBe(false);
    expect(hasStatusIn(e, 0)).toBe(false);
    e.chillPct = 0.25;
    expect(hasStatusIn(e, statusMask(['chilled']))).toBe(true);
    expect(hasStatusIn(e, statusMask(['soaked']))).toBe(false);
    e.chillPct = 0;
    e.soakedTicks = 1;
    expect(hasStatusIn(e, statusMask(['soaked']))).toBe(true);
    e.soakedTicks = 0;
    e.corrodedStacks = 1;
    expect(hasStatusIn(e, statusMask(['corroded']))).toBe(true);
    e.corrodedStacks = 0;
    e.markTicks = 1;
    expect(hasStatusIn(e, statusMask(['marked', 'chilled']))).toBe(true);
  });
});
