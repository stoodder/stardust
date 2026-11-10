import { describe, expect, it } from 'vitest';
import { PROTOCOLS, UPGRADES } from '../content/upgrades/index.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import { saveModifiers } from './loadout.ts';
import { towerPool } from './pools.ts';
import {
  LIVE_STORE,
  buy,
  offerFor,
  openQuestionOffered,
  refusalMessage,
  shelf,
  type PurchaseItem,
} from './purchase.ts';
import { createNewSave, type SaveData } from './saveData.ts';
import { validateSave } from './validate.ts';

const MK2: PurchaseItem = { kind: 'upgrade', id: 'orbital_strike_mk2' };
const RAPPORT: PurchaseItem = { kind: 'upgrade', id: 'rapport_bricks' };
const SLOTS: PurchaseItem = { kind: 'upgrade', id: 'protocol_slots' };
const QUILL_RAPPORT: PurchaseItem = { kind: 'upgrade', id: 'rapport_quill' };
const ZAPCOIL: PurchaseItem = { kind: 'license', tower: 'zapcoil' };

/** A1M1 through A1M4 won (the shop and Engineering open), with deep pockets. */
function afterA1M4(): SaveData {
  const save = DEV_SAVES.after_a1m1.build();
  for (const id of ['a1_m02', 'a1_m03', 'a1_m04'] as const) {
    // Unregistered maps can't be in a valid save; the pure rules only read `completed`.
    (save.campaign.maps as Record<string, unknown>)[id] = {
      completed: true,
      medals: [],
      bestMeter: 0,
    };
  }
  save.currencies = { stardust: 1000, intel: 20 };
  return save;
}

function expectValid(save: SaveData): void {
  const v = validateSave(save);
  expect(v.ok ? [] : v.errors).toEqual([]);
}

describe('offers', () => {
  it("after A1M1, R&D sells Mk II and Rapport; QUILL's Rapport and the slot arrive after A1M3", () => {
    const save = DEV_SAVES.after_a1m1.build();
    const rnd = shelf(save, 'rnd');
    expect(rnd.map((o) => [o.item, o.refusal])).toEqual([
      [MK2, null],
      [RAPPORT, null],
      [QUILL_RAPPORT, 'not_stocked'],
      [SLOTS, 'not_stocked'],
      // R&D's Technician abilities come after its upgrades (T406).
      [{ kind: 'ability', id: 'scanner_sweep' }, 'not_stocked'],
    ]);
    expect(rnd[0]).toMatchObject({ currency: 'intel', price: 2, owned: 0, ranks: 1 });
    expect(rnd[2]).toMatchObject({ availableAfter: 'a1_m03', price: 2, ranks: 1 });
    expect(rnd[3]).toMatchObject({ availableAfter: 'a1_m03', price: 4, ranks: 2 });
  });

  it("QUILL's Rapport is stocked once QUILL is met (A1M3 won, T308)", () => {
    const save = DEV_SAVES.after_a1m3.build();
    expect(offerFor(save, QUILL_RAPPORT)).toMatchObject({ refusal: null, price: 2 });
    const r = buy(save, QUILL_RAPPORT);
    if (!r.ok) throw new Error(r.message);
    expect(saveModifiers(r.save)).toContainEqual({
      kind: 'abilityStat',
      ability: 'time_dilation',
      stat: 'cooldown',
      pct: -0.15,
      source: 'rnd:rapport_quill',
    });
  });

  it('a pane that has not opened refuses everything', () => {
    const fresh = createNewSave();
    expect(offerFor(fresh, MK2)?.refusal).toBe('pane_locked');
    const shop = shelf(DEV_SAVES.after_a1m1.build(), 'shop');
    // Every shop upgrade but the Aelari tune-ups (kept off the shelf until A2M5: they'd name
    // Ves'thara's towers early, T509), every protocol, and the four Vrell licenses (T408: the
    // Harpoon's and Crane's joined the Zapcoil's and Lookout's). Granted-only upgrades (C2's
    // Zibzab Tune-up) never reach a shelf: the story gives them.
    const shopUpgrades = Object.values(UPGRADES).filter((u) => u.kind === 'shop').length;
    expect(shop.length).toBe(shopUpgrades - 3 + Object.keys(PROTOCOLS).length + 4);
    expect(new Set(shop.map((o) => o.refusal))).toEqual(new Set(['pane_locked']));
    expect(shelf(DEV_SAVES.after_a1m1.build(), 'engineering')[0]?.refusal).toBe('pane_locked');
  });

  it('lists the shop as licenses, then global upgrades, then tune-ups, then protocols', () => {
    const shop = shelf(afterA1M4(), 'shop');
    const kinds = shop.map((o) =>
      o.item.kind === 'protocol' || o.item.kind === 'license'
        ? o.item.kind
        : o.tower === null
          ? 'global'
          : 'tune',
    );
    expect(kinds[0]).toBe('license');
    expect(kinds).toEqual(kinds.toSorted((a, b) => order(a) - order(b)));
    // One per registered tower (the Harpoon's and Crane's since T408), but the Aelari towers': the
    // Prism's, Mindspike's, and Lantern's wait for A2M5 (T509).
    expect(kinds.filter((k) => k === 'tune')).toHaveLength(8);
  });

  it('orders each group by arrival, then entry price, then name', () => {
    const shop = shelf(afterA1M4(), 'shop');
    const globals = shop.filter((o) => o.item.kind === 'upgrade' && o.tower === null);
    expect(globals.map((o) => (o.item.kind === 'upgrade' ? o.item.id : ''))).toEqual([
      'salvage_rights',
      'seed_money',
      'ability_coolant',
      'resale_value',
      'reinforced_core',
      'bounty_hunter',
    ]);
    // A bought rank doesn't move an item.
    const save = afterA1M4();
    save.upgrades.salvage_rights = 1;
    // After the four licenses (Zapcoil's, the Lookout's, then the Crane's and Harpoon's).
    expect(shelf(save, 'shop')[4]?.item).toEqual({ kind: 'upgrade', id: 'salvage_rights' });
  });

  it('a tune-up needs its tower, and a spec unlock needs specs', () => {
    const save = afterA1M4();
    save.unlocks.towers = ['rivet', 'thumper'];
    expect(offerFor(save, { kind: 'upgrade', id: 'tune_sprinkler' })?.refusal).toBe('not_owned');
    expect(offerFor(save, { kind: 'upgrade', id: 'tune_rivet' })?.refusal).toBe(null);
    save.unlocks.towers.push('sprinkler', 'skyhook');
    // The Sprinkler's (T407a) and Skyhook's (T407b) specs are built: Engineering sells them
    // beside Rivet's and Thumper's. No registered tower's specs ship later any more.
    expect(offerFor(save, { kind: 'specs', tower: 'sprinkler' })?.refusal).toBe(null);
    expect(offerFor(save, { kind: 'specs', tower: 'skyhook' })?.refusal).toBe(null);
    const engineering = shelf(save, 'engineering');
    expect(engineering.some((o) => o.refusal === 'no_specs')).toBe(false);
    // Towers not owned still say so first.
    expect(engineering.find((o) => o.tower === 'zapcoil')?.refusal).toBe('not_owned');
    // A tower with no specs authored is still refused `no_specs` (none is registered today).
    const bare = {
      ...LIVE_STORE,
      towers: { ...LIVE_STORE.towers, skyhook: { faction: 'everglow' as const } },
    };
    expect(offerFor(save, { kind: 'specs', tower: 'skyhook' }, [], bare)?.refusal).toBe('no_specs');
  });

  it('prices Engineering by faction', () => {
    const rivet = offerFor(afterA1M4(), { kind: 'specs', tower: 'rivet' });
    expect(rivet).toMatchObject({ currency: 'intel', price: 2, refusal: null, grants: [] });
  });

  it('a short bank refuses with the price kept', () => {
    const save = DEV_SAVES.after_a1m1.build();
    save.currencies.intel = 1;
    expect(offerFor(save, MK2)).toMatchObject({ price: 2, refusal: 'short' });
  });

  it('unknown items have no offer', () => {
    const save = afterA1M4();
    expect(offerFor(save, { kind: 'upgrade', id: 'nope' })).toBeNull();
    expect(offerFor(save, { kind: 'protocol', id: '__proto__' })).toBeNull();
    expect(offerFor(save, { kind: 'specs', tower: 'gloop' })).toBeNull();
    expect(buy(save, { kind: 'upgrade', id: 'nope' })).toMatchObject({
      ok: false,
      reason: 'unknown',
    });
  });

  it('devUnlocks opens a pane fully stocked', () => {
    const save = DEV_SAVES.after_a1m1.build();
    save.currencies.intel = 10;
    expect(offerFor(save, { kind: 'specs', tower: 'rivet' })?.refusal).toBe('pane_locked');
    expect(offerFor(save, { kind: 'specs', tower: 'rivet' }, ['engineering'])?.refusal).toBe(null);
    expect(offerFor(save, SLOTS, ['rnd'])?.refusal).toBe(null);
  });
});

/** A shelf's items as JSON, for membership checks. */
function items(offers: readonly { readonly item: PurchaseItem }[]): string[] {
  return offers.map((o) => JSON.stringify(o.item));
}

describe("Xenotech (progression.md § 7.2: Ves'thara's attunements, T509)", () => {
  const MINDSPIKE: PurchaseItem = { kind: 'attune', tower: 'mindspike' };
  const LANTERN: PurchaseItem = { kind: 'attune', tower: 'lantern' };
  const PRISM: PurchaseItem = { kind: 'attune', tower: 'prism' };

  it('before A2M5: Xenotech is locked, and no shelf names an Aelari tower or her Rapport', () => {
    const save = DEV_SAVES.after_a2m4_returned.build();
    save.currencies = { stardust: 1000, intel: 20 };
    expect(shelf(save, 'xenotech').map((o) => o.refusal)).toEqual(['pane_locked', 'pane_locked']);
    // The Prism isn't given yet, so its row isn't there at all.
    expect(offerFor(save, PRISM)).toBeNull();
    const aelari = new Set(['prism', 'mindspike', 'lantern']);
    for (const pane of ['shop', 'engineering'] as const) {
      expect(shelf(save, pane).filter((o) => aelari.has(o.tower ?? ''))).toEqual([]);
    }
    // The tune-ups still exist, refused as not stocked; they just aren't listed.
    expect(offerFor(save, { kind: 'upgrade', id: 'tune_prism' })?.refusal).toBe('not_stocked');
    expect(items(shelf(save, 'rnd'))).not.toContain(
      JSON.stringify({ kind: 'upgrade', id: 'rapport_vesthara' }),
    );
  });

  it('after A2M5: the Prism given, then the Mindspike and the Lantern at 3 Intel each', () => {
    const save = DEV_SAVES.after_a2m5.build();
    const xeno = shelf(save, 'xenotech');
    expect(xeno.map((o) => [o.item, o.refusal])).toEqual([
      [PRISM, 'maxed'],
      [MINDSPIKE, null],
      [LANTERN, null],
    ]);
    expect(xeno[0]).toMatchObject({ gift: true, price: 0, owned: 1, pane: 'xenotech' });
    expect(xeno[1]).toMatchObject({
      gift: false,
      currency: 'intel',
      price: 3,
      ranks: 1,
      owned: 0,
      availableAfter: 'a2_m05',
      tower: 'mindspike',
      needs: 'prism',
      grants: [],
    });
  });

  it('attuning adds the tower to the save and the loadout pool, once', () => {
    const save = DEV_SAVES.after_a2m5.build();
    const intel = save.currencies.intel;
    const r = buy(save, MINDSPIKE);
    if (!r.ok) throw new Error(r.message);
    expect(r.save.currencies.intel).toBe(intel - 3);
    expect(r.save.unlocks.towers).toContain('mindspike');
    expect(towerPool(r.save)).toContain('mindspike');
    expect(save.unlocks.towers).not.toContain('mindspike'); // the input is untouched
    expectValid(r.save);
    expect(offerFor(r.save, MINDSPIKE)?.refusal).toBe('maxed');
    expect(buy(r.save, MINDSPIKE)).toMatchObject({ ok: false, reason: 'maxed' });
    // after_a2m5 holds 5 Intel: the second attunement waits for another medal.
    expect(offerFor(r.save, LANTERN)).toMatchObject({ refusal: 'short', price: 3 });
  });

  it('needs the Prism Spire owned first', () => {
    const save = DEV_SAVES.after_a2m5.build();
    save.unlocks.towers = save.unlocks.towers.filter((t) => t !== 'prism');
    const offer = offerFor(save, LANTERN);
    expect(offer).toMatchObject({ refusal: 'not_owned', needs: 'prism', tower: 'lantern' });
    expect(refusalMessage(save, LANTERN, offer)).toMatch(/needs the prism owned/);
    expect(buy(save, LANTERN)).toMatchObject({ ok: false, reason: 'not_owned' });
    // Not given, so the Prism's own row is gone, and it can't be bought.
    expect(items(shelf(save, 'xenotech'))).toEqual([
      JSON.stringify(MINDSPIKE),
      JSON.stringify(LANTERN),
    ]);
    expect(buy(save, PRISM)).toMatchObject({ ok: false, reason: 'unknown' });
  });

  it('a gift is never sold: owned, it reads as owned', () => {
    const save = DEV_SAVES.after_a2m5.build();
    expect(buy(save, PRISM)).toMatchObject({ ok: false, reason: 'maxed' });
  });

  it('only Aelari towers are on the shelf; a non-Aelari attune row is not', () => {
    const odd = {
      ...LIVE_STORE,
      towerAccess: {
        ...LIVE_STORE.towerAccess,
        rivet: { how: 'attune', currency: 'intel', price: 3, availableAfter: null },
      } as const,
    };
    const save = DEV_SAVES.after_a2m5.build();
    expect(offerFor(save, { kind: 'attune', tower: 'rivet' }, [], odd)).toBeNull();
    expect(offerFor(save, { kind: 'attune', tower: 'zapcoil' })).toBeNull();
    expect(offerFor(save, { kind: 'attune', tower: 'nope' })).toBeNull();
  });

  it('after A2M5 the Aelari tune-ups and specs are on their shelves, each needing its tower', () => {
    const save = DEV_SAVES.after_a2m5.build();
    save.currencies = { stardust: 1000, intel: 20 };
    const tune = (id: string) => shelf(save, 'shop').find((o) => o.tower === id);
    expect(tune('prism')).toMatchObject({ refusal: null, price: 40, needs: 'prism' });
    expect(tune('mindspike')).toMatchObject({ refusal: 'not_owned', needs: 'mindspike' });
    expect(tune('lantern')?.refusal).toBe('not_owned');
    const specs = (id: string) => shelf(save, 'engineering').find((o) => o.tower === id);
    expect(specs('prism')).toMatchObject({ refusal: null, price: 3, pane: 'engineering' });
    expect(specs('mindspike')?.refusal).toBe('not_owned');
    const r = buy(save, MINDSPIKE);
    if (!r.ok) throw new Error(r.message);
    expect(offerFor(r.save, { kind: 'upgrade', id: 'tune_mindspike' })?.refusal).toBe(null);
    expect(offerFor(r.save, { kind: 'specs', tower: 'mindspike' })?.refusal).toBe(null);
  });

  it("the Lantern's tune-up rank 3 widens its range and its detection radius alike", () => {
    expect(UPGRADES.tune_lantern.ranks[2]?.grants).toEqual([
      { kind: 'towerStat', tower: 'lantern', stat: 'range', pct: 0.05 },
      { kind: 'supportStat', tower: 'lantern', stat: 'radius', pct: 0.05 },
    ]);
  });

  it("Ves'thara's Rapport waits, unlisted, until A2M6 is won (her first map as a companion)", () => {
    const RAPPORT_V: PurchaseItem = { kind: 'upgrade', id: 'rapport_vesthara' };
    const save = DEV_SAVES.after_a2m5.build();
    expect(offerFor(save, RAPPORT_V)).toMatchObject({ refusal: 'not_stocked', price: 2 });
    expect(items(shelf(save, 'rnd'))).not.toContain(JSON.stringify(RAPPORT_V));
    // Listed for a dev pane open by devUnlocks, as everything is.
    expect(items(shelf(save, 'rnd', ['rnd']))).toContain(JSON.stringify(RAPPORT_V));
    (save.campaign.maps as Record<string, unknown>)['a2_m06'] = {
      completed: true,
      medals: [],
      bestMeter: 0,
    };
    expect(items(shelf(save, 'rnd'))).toContain(JSON.stringify(RAPPORT_V));
    const r = buy(save, RAPPORT_V);
    if (!r.ok) throw new Error(r.message);
    expect(saveModifiers(r.save)).toContainEqual({
      kind: 'abilityStat',
      ability: 'stillness',
      stat: 'cooldown',
      pct: -0.15,
      source: 'rnd:rapport_vesthara',
    });
  });
});

function order(kind: string): number {
  return ['license', 'global', 'tune', 'protocol'].indexOf(kind);
}

describe('licenses (progression.md § 4.1)', () => {
  it("the Zapcoil sample: 0 Stardust, stocked when the shop opens, owned once it's given", () => {
    const save = DEV_SAVES.after_a1m3.build();
    expect(offerFor(save, ZAPCOIL)).toMatchObject({
      pane: 'shop',
      currency: 'stardust',
      price: 0,
      owned: 1,
      availableAfter: 'a1_m03',
      tower: 'zapcoil',
      refusal: 'maxed',
    });
    expect(shelf(save, 'shop')[0]?.item).toEqual(ZAPCOIL);
  });

  it('a license not yet owned is bought once and adds its tower', () => {
    const save = afterA1M4();
    expect(save.unlocks.towers).not.toContain('zapcoil');
    const r = buy(save, ZAPCOIL);
    if (!r.ok) throw new Error(r.message);
    expect(r.save.unlocks.towers.at(-1)).toBe('zapcoil');
    expect(r.save.currencies.stardust).toBe(1000);
    expect(buy(r.save, ZAPCOIL)).toMatchObject({ ok: false, reason: 'maxed' });
    // Before the shop opens, it's locked with the rest of the pane.
    expect(offerFor(DEV_SAVES.after_a1m1.build(), ZAPCOIL)?.refusal).toBe('pane_locked');
    // Towers with no license row aren't sold.
    expect(offerFor(save, { kind: 'license', tower: 'rivet' })).toBeNull();
  });
});

describe('buying', () => {
  it("A1M1's 3 Intel buys Mk II or Rapport, not both", () => {
    const save = DEV_SAVES.after_a1m1.build();
    const first = buy(save, MK2);
    if (!first.ok) throw new Error(first.message);
    expect(first.save.upgrades.orbital_strike_mk2).toBe(1);
    expect(first.save.currencies.intel).toBe(1);
    expect(first.offer).toMatchObject({ owned: 1, ranks: 1 });
    // The input is untouched.
    expect(save.currencies.intel).toBe(3);
    expect(save.upgrades).toEqual({});
    expectValid(first.save);

    expect(buy(first.save, MK2)).toMatchObject({ ok: false, reason: 'maxed' });
    const second = buy(first.save, RAPPORT);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe('short');
      expect(second.message).toContain('costs 2 intel; the bank holds 1');
    }
  });

  it('Mk II reaches the battle as +0.5 strike radius', () => {
    const r = buy(DEV_SAVES.after_a1m1.build(), MK2);
    if (!r.ok) throw new Error(r.message);
    expect(saveModifiers(r.save)).toContainEqual({
      kind: 'abilityStat',
      ability: 'orbital_strike',
      stat: 'radius',
      flat: 0.5,
      source: 'rnd:orbital_strike_mk2',
    });
  });

  it('buys ranks in order, each at its own price', () => {
    let save = afterA1M4();
    const core: PurchaseItem = { kind: 'upgrade', id: 'reinforced_core' };
    const paid: number[] = [];
    for (;;) {
      const r = buy(save, core);
      if (!r.ok) {
        expect(r.reason).toBe('maxed');
        break;
      }
      paid.push(save.currencies.stardust - r.save.currencies.stardust);
      save = r.save;
    }
    expect(paid).toEqual([120, 200, 300]);
    expect(save.upgrades.reinforced_core).toBe(3);
    expect(offerFor(save, core)).toMatchObject({ owned: 3, price: 300, refusal: 'maxed' });
  });

  it('a protocol is bought once, with Stardust', () => {
    const r = buy(afterA1M4(), { kind: 'protocol', id: 'head_start' });
    if (!r.ok) throw new Error(r.message);
    expect(r.save.unlocks.protocols).toEqual(['head_start']);
    expect(r.save.currencies).toEqual({ stardust: 900, intel: 20 });
    expect(buy(r.save, { kind: 'protocol', id: 'head_start' })).toMatchObject({
      ok: false,
      reason: 'maxed',
    });
  });

  it('a spec unlock records the tower in unlocks.specs', () => {
    const r = buy(afterA1M4(), { kind: 'specs', tower: 'thumper' });
    if (!r.ok) throw new Error(r.message);
    expect(r.save.unlocks.specs).toEqual(['thumper']);
    expect(r.save.currencies.intel).toBe(18);
    expect(offerFor(r.save, { kind: 'specs', tower: 'thumper' })?.refusal).toBe('maxed');
  });

  it('refuses in check order, with a reason', () => {
    const fresh = createNewSave();
    fresh.currencies.intel = 0;
    // Locked beats short.
    expect(buy(fresh, MK2)).toMatchObject({ ok: false, reason: 'pane_locked' });
    const save = DEV_SAVES.after_a1m1.build();
    save.currencies.intel = 0;
    // Not stocked beats short.
    expect(buy(save, SLOTS)).toMatchObject({ ok: false, reason: 'not_stocked' });
    expect(buy(save, MK2)).toMatchObject({ ok: false, reason: 'short' });
  });

  it('all_unlocked owns everything already', () => {
    const dev = DEV_SAVES.all_unlocked;
    const save = dev.build();
    for (const pane of ['rnd', 'shop', 'engineering', 'xenotech'] as const) {
      const offers = shelf(save, pane, dev.devUnlocks);
      expect(offers.length).toBeGreaterThan(0);
      // Everything is owned, every tower's specs included (T407b shipped the last of them).
      for (const o of offers) expect(o.refusal).toBe('maxed');
    }
  });
});

describe('the open question (progression.md § 4)', () => {
  it('is on the shelf from the shop opening until asked, or until A2M4 is reached', () => {
    expect(openQuestionOffered(DEV_SAVES.mid_m2.build())).toBe(false);
    expect(openQuestionOffered(DEV_SAVES.mid_m2.build(), ['shop'])).toBe(true);
    const save = DEV_SAVES.after_a1m3.build();
    expect(openQuestionOffered(save)).toBe(true);
    save.story.flags.asked_zibzab_early = true;
    expect(openQuestionOffered(save)).toBe(false);
    const later = DEV_SAVES.after_a1m3.build();
    (later.campaign.maps as Record<string, unknown>)['a2_m04'] = {
      completed: false,
      medals: [],
      bestMeter: 0,
    };
    expect(openQuestionOffered(later)).toBe(false);
  });
});
