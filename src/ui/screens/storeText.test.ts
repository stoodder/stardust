import { describe, expect, it } from 'vitest';
import { PROTOCOLS, UPGRADES } from '../../content/upgrades/index.ts';
import { DEV_SAVES } from '../../meta/__fixtures__/devSaves.ts';
import { shelf, type Offer } from '../../meta/index.ts';
import {
  MISSING_COPY,
  PRESENTERS,
  arrivalText,
  effectText,
  grantText,
  offerCopy,
  offerName,
  priceText,
} from './storeText.ts';

const byId = (offers: readonly Offer[], id: string): Offer => {
  const o = offers.find((x) => 'id' in x.item && x.item.id === id);
  if (o === undefined) throw new Error(`no offer ${id}`);
  return o;
};

describe('effect summaries', () => {
  it('derive from the grants', () => {
    expect(
      grantText({ kind: 'abilityStat', ability: 'orbital_strike', stat: 'radius', flat: 0.5 }),
    ).toBe('+0.5 Orbital Strike radius');
    expect(
      grantText({ kind: 'abilityStat', ability: 'suppressing_fire', stat: 'cooldown', pct: -0.15 }),
    ).toBe('−15% Suppressing Fire cooldown');
    expect(grantText({ kind: 'abilityStat', ability: '*', stat: 'cooldown', pct: -0.05 })).toBe(
      '−5% ability cooldowns',
    );
    expect(grantText({ kind: 'towerCost', tower: 'rivet', tiers: 'all', pct: -0.05 })).toBe(
      '−5% Rivet build and upgrade cost',
    );
    expect(grantText({ kind: 'economy', stat: 'coreIntegrity', flat: 1 })).toBe(
      '+1 core integrity',
    );
    expect(grantText({ kind: 'sellRefund', flat: 0.05 })).toBe('+5% sell refund');
    expect(grantText({ kind: 'tileBonus', tile: 'highGround', flat: 0.15 })).toBe(
      '+15% high-ground range',
    );
  });

  it('cover every catalog item, with no exclamation points', () => {
    for (const u of Object.values(UPGRADES)) {
      for (const r of u.ranks) for (const g of r.grants) expect(grantText(g)).toMatch(/\S/);
    }
    for (const p of Object.values(PROTOCOLS)) {
      for (const g of p.grants) expect(grantText(g)).not.toContain('!');
    }
  });

  it('name the next rank, the slot a protocol-slot rank adds, and a spec unlock’s pair', () => {
    const dev = DEV_SAVES.after_a1m1;
    const rnd = shelf(dev.build(), 'rnd', ['rnd']);
    expect(effectText(byId(rnd, 'orbital_strike_mk2'))).toBe('+0.5 Orbital Strike radius');
    expect(effectText(byId(rnd, 'protocol_slots'))).toBe('+1 Field Protocol slot');
    const eng = shelf(dev.build(), 'engineering', ['engineering']);
    expect(eng.slice(0, 4).map(effectText)).toEqual([
      'Unlocks tier 4: Rivet Storm or Railspike',
      'Unlocks tier 4: Cluster Thumper or Bunker Buster',
      'Unlocks tier 4: Flash Freeze or Cloudburst', // the Sprinkler's (T407a)
      "Unlocks tier 4: Crow's Nest or Overclock Rig", // the Lookout's (T406)
    ]);
    // A tower whose specs ship later (D064; Skyhook's, T407b) has no pair to name yet.
    const later = eng.find((o) => o.tower === 'skyhook');
    expect(later === undefined ? null : effectText(later)).toBe(
      'Unlocks both tier-4 specializations',
    );
    // R&D's Technician ability (T406).
    const sweep = rnd.find((o) => o.item.kind === 'ability');
    expect(sweep === undefined ? null : effectText(sweep)).toBe(
      'Adds Scanner Sweep to your Technician abilities (slot 1)',
    );
    expect(sweep === undefined ? null : offerName(sweep)).toBe('Scanner Sweep');
    expect(eng.slice(0, 2).map(offerName)).toEqual([
      'Rivet specializations',
      'Thumper specializations',
    ]);
  });
});

describe('offer text', () => {
  it('reads names, copy, prices, and arrivals', () => {
    const rnd = shelf(DEV_SAVES.after_a1m1.build(), 'rnd');
    const mk2 = byId(rnd, 'orbital_strike_mk2');
    expect(offerName(mk2)).toBe('Orbital Strike Mk II');
    expect(priceText(mk2)).toBe('2 Intel');
    expect(offerCopy(mk2)).toBe(UPGRADES.orbital_strike_mk2.copy);
    expect(arrivalText(byId(rnd, 'protocol_slots'))).toBe('Arrives after Special Delivery');
    // Every shop and R&D item has its catalog copy (T210c).
    for (const pane of ['rnd', 'shop'] as const) {
      const all = shelf(DEV_SAVES.all_unlocked.build(), pane, [pane]);
      for (const o of all) expect(offerCopy(o)).not.toBe(MISSING_COPY);
    }
  });

  it('the presenters use no exclamation points, and no "&" (Silkscreen draws it as "$"; D059)', () => {
    for (const p of Object.values(PRESENTERS)) {
      for (const line of [p.who, p.intro, p.owned, ...p.thanks]) {
        expect(line).not.toContain('!');
        expect(line).not.toContain('&');
      }
    }
  });

  it('never hands an "&" to Silkscreen: every name and copy line goes through silkText', () => {
    for (const pane of ['rnd', 'shop', 'engineering'] as const) {
      for (const o of shelf(DEV_SAVES.all_unlocked.build(), pane, [pane])) {
        expect(offerName(o)).not.toContain('&');
        expect(offerCopy(o) ?? '').not.toContain('&');
      }
    }
  });
});
