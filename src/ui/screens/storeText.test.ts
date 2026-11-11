import { describe, expect, it } from 'vitest';
import { ITEM_COPY } from '../../content/upgrades/copy.ts';
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
    expect(eng.map(effectText)).toEqual([
      'Unlocks tier 4: Rivet Storm or Railspike',
      'Unlocks tier 4: Cluster Thumper or Bunker Buster',
      'Unlocks tier 4: Flash Freeze or Cloudburst', // the Sprinkler's (T407a)
      'Unlocks tier 4: Flak Curtain or Seeker Swarm', // the Skyhook's (T407b)
      'Unlocks tier 4: Overload Coil or Capacitor Bank', // the Zapcoil's (T407b)
      "Unlocks tier 4: Crow's Nest or Overclock Rig", // the Lookout's (T406)
      'Unlocks tier 4: Skewer or Tether', // the Harpoon's (T408)
      "Unlocks tier 4: Haggler's Stall or Magnet Crane", // the Crane's (T408)
      'Unlocks tier 4: Refractor or Sunlance', // the Prism's (T504)
      'Unlocks tier 4: Echo Spike or Dread', // the Mindspike's (T507)
      'Unlocks tier 4: All-Seeing or Truthlight', // the Lantern's (T508)
      'Unlocks tier 4: Big Family or Brave Hearts', // the Scuttle Den's (T604)
      'Unlocks tier 4: Lullaby or Rally Chorus', // the Hum Choir's (T607)
      'Unlocks tier 4: Gravity Well or Timeless Garden', // the Stasis Bloom's (T608)
    ]);
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
    // Every shop, R&D, and Xenotech item has its catalog copy (T210c, T509).
    for (const pane of ['rnd', 'shop', 'xenotech'] as const) {
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
    for (const pane of ['rnd', 'shop', 'engineering', 'xenotech'] as const) {
      for (const o of shelf(DEV_SAVES.all_unlocked.build(), pane, [pane])) {
        expect(offerName(o)).not.toContain('&');
        expect(offerCopy(o) ?? '').not.toContain('&');
      }
    }
  });
});

describe("Xenotech's rows (T509)", () => {
  it('name the tower, say what it adds, and carry her line; the gift reads as given', () => {
    const [prism, mindspike, lantern] = shelf(DEV_SAVES.after_a2m5.build(), 'xenotech');
    if (prism === undefined || mindspike === undefined || lantern === undefined) {
      throw new Error('Xenotech lists three rows after A2M5');
    }
    expect([offerName(prism), offerName(mindspike), offerName(lantern)]).toEqual([
      'Prism Spire',
      'Mindspike Obelisk',
      "Seer's Lantern",
    ]);
    expect(effectText(prism)).toBe('Given: Prism Spire · Ramping beam');
    expect(effectText(mindspike)).toBe(
      'Adds the Mindspike Obelisk to your turrets: Armor-ignoring DPS',
    );
    expect(offerCopy(prism)).toBe(ITEM_COPY.gift_prism);
    expect(offerCopy(lantern)).toBe(ITEM_COPY.attune_lantern);
    expect(priceText(mindspike)).toBe('3 Intel');
  });

  it("Ves'thara speaks without contractions", () => {
    const p = PRESENTERS.xenotech;
    const offer = shelf(DEV_SAVES.after_a2m5.build(), 'xenotech')[1]!;
    expect(p.short(offer, 1)).toBe(
      'It asks 3 Intel. You hold 1. Each medal you earn teaches one more.',
    );
    for (const line of [p.intro, p.owned, ...p.thanks, p.short(offer, 1)]) {
      expect(line).not.toMatch(/n't\b|'(?:s|re|ll|ve|m|d)\b/i);
    }
    expect(p.verb).toBe('Attune');
  });
});

describe("Act III's shelf rows (T609)", () => {
  it('Engineering sells the Skitterkin specs at 3 Intel once each gift is given', () => {
    const eng = shelf(DEV_SAVES.after_a3m1_spared.build(), 'engineering');
    const row = (tower: string) => eng.find((o) => o.tower === tower);
    for (const [tower, pair] of [
      ['burrow', 'Big Family or Brave Hearts'],
      ['choir', 'Lullaby or Rally Chorus'],
    ] as const) {
      const o = row(tower);
      if (o === undefined) throw new Error(`no ${tower} specs row`);
      expect(effectText(o)).toBe(`Unlocks tier 4: ${pair}`);
      expect(priceText(o)).toBe('3 Intel');
      expect(o.refusal).toBe(null);
    }
    expect(offerName(row('burrow')!)).toBe('Scuttle Den specializations');
    // The Choir not given (the Quiet Wave cleared): no row names it before A3M4.
    const cleared = shelf(DEV_SAVES.after_a3m1_cleared.build(), 'engineering');
    expect(cleared.map(offerName)).not.toContain('Hum Choir specializations');
  });

  it("the Stasis Bloom's Xenotech row is live after A3M1, in Ves'thara's settled line", () => {
    const xeno = shelf(DEV_SAVES.after_a3m1_cleared.build(), 'xenotech');
    const bloom = xeno.find((o) => o.tower === 'bloom');
    if (bloom === undefined) throw new Error('no Bloom row');
    expect(bloom.refusal).toBe(null);
    expect(offerName(bloom)).toBe('Stasis Bloom');
    expect(priceText(bloom)).toBe('3 Intel');
    expect(effectText(bloom)).toBe('Adds the Stasis Bloom to your turrets: Hard control');
    expect(offerCopy(bloom)).toBe(ITEM_COPY.attune_bloom);
    // Before A3M1 it is listed, greyed, with its arrival.
    const early = shelf(DEV_SAVES.after_a2m6.build(), 'xenotech').find((o) => o.tower === 'bloom');
    expect(early?.refusal).toBe('not_stocked');
  });

  it("the Seer's Lantern's card says what it is for: what hides, and what digs (T568)", () => {
    const lantern = shelf(DEV_SAVES.after_a2m5.build(), 'xenotech').find(
      (o) => o.tower === 'lantern',
    );
    expect(lantern === undefined ? null : offerCopy(lantern)).toBe(ITEM_COPY.attune_lantern);
    expect(ITEM_COPY.attune_lantern).toMatch(/hides/);
    expect(ITEM_COPY.attune_lantern).toMatch(/digs/);
  });

  it("the Act III tune-ups read their ranks: the Bloom's first is its field's strength", () => {
    const shop = shelf(DEV_SAVES.after_a3m1_spared.build(), 'shop');
    const tune = (id: string) => effectText(byId(shop, id));
    expect(tune('tune_burrow')).toBe('+5% Scuttle Den damage');
    expect(tune('tune_choir')).toBe('+5% Hum Choir aura strength');
    expect(tune('tune_bloom')).toBe('+5% Stasis Bloom field strength');
    expect(UPGRADES.tune_bloom.ranks.map((r) => r.grants.map(grantText))).toEqual([
      ['+5% Stasis Bloom field strength'],
      ['−5% Stasis Bloom build and upgrade cost'],
      ['+5% Stasis Bloom radius'],
    ]);
    for (const id of ['tune_burrow', 'tune_choir', 'tune_bloom']) {
      expect(offerCopy(byId(shop, id))).toBe(ITEM_COPY[id]);
    }
  });
});

describe("Bramble's Rapport row (T609b)", () => {
  it("reads its effect, price, and QUILL's line once A3M1 is won; no row names her before", () => {
    const row = byId(shelf(DEV_SAVES.after_a3m1_cleared.build(), 'rnd'), 'rapport_bramble');
    expect(row.refusal).toBe(null);
    expect(offerName(row)).toBe('Rapport: Bramble');
    expect(effectText(row)).toBe('−15% Underfoot cooldown');
    expect(priceText(row)).toBe('2 Intel');
    expect(offerCopy(row)).toBe(ITEM_COPY.rapport_bramble);
    // QUILL's R&D voice (style guide § 6.4): the number first, ≤ 100 characters, no "!".
    expect(ITEM_COPY.rapport_bramble).toMatch(/^Underfoot recharges 15% faster\. /);
    expect(ITEM_COPY.rapport_bramble!.length).toBeLessThanOrEqual(100);
    expect(ITEM_COPY.rapport_bramble).not.toMatch(/!/);
    const early = shelf(DEV_SAVES.after_a2m6.build(), 'rnd');
    expect(early.map(offerName)).not.toContain('Rapport: Bramble');
  });
});
