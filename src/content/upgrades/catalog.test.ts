// The catalog matches design/progression.md §§ 4–7 (prices, ranks, currencies) and
// story/campaign.md § 4.1–4.6 (when each item is stocked), and every item grants something.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN, CAMPAIGN_PLAN, CAMPAIGN_PLAN_IDS } from '../campaign.ts';
import { MAPS } from '../maps/index.ts';
import { TOWERS, TOWERS_AHEAD_OF_TASK } from '../towers/index.ts';
import {
  ABILITY_ACCESS,
  ENGINEERING,
  PROTOCOLS,
  TOWER_ACCESS,
  UPGRADES,
  type GrantKind,
  type ProtocolDef,
  type UpgradeDef,
} from './index.ts';
import { REFERENCE_ECONOMY } from './reference.ts';

const upgrades = Object.values<UpgradeDef>(UPGRADES);
const protocols = Object.values<ProtocolDef>(PROTOCOLS);
const prices = (u: UpgradeDef): number[] => u.ranks.map((r) => r.price);
const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

const GRANT_KINDS: ReadonlySet<GrantKind> = new Set<GrantKind>([
  'towerStat',
  'towerCost',
  'economy',
  'sellRefund',
  'abilityStat',
  // A support tower's tune-up (the Lookout's; T406).
  'supportStat',
  'linkBonus',
  'tileBonus',
  'leakAbsorb',
  'firstBuildFree',
  'freeCast',
]);

describe('catalog: shape', () => {
  it('every item grants a known modifier kind (or, for R&D slots, a protocol slot)', () => {
    for (const u of upgrades) {
      expect(u.ranks.length, u.id).toBeGreaterThan(0);
      for (const r of u.ranks) {
        expect(r.grants.length + (r.protocolSlots ?? 0), u.id).toBeGreaterThan(0);
        for (const g of r.grants) expect(GRANT_KINDS.has(g.kind), `${u.id}: ${g.kind}`).toBe(true);
      }
    }
    for (const p of protocols) {
      expect(p.grants.length, p.id).toBeGreaterThan(0);
      for (const g of p.grants) expect(GRANT_KINDS.has(g.kind), `${p.id}: ${g.kind}`).toBe(true);
    }
  });

  it('the shop sells for Stardust and R&D for Intel; prices are whole and positive', () => {
    for (const u of upgrades) {
      if (u.kind === 'grant') continue; // never sold (below)
      expect(u.currency, u.id).toBe(u.kind === 'shop' ? 'stardust' : 'intel');
      for (const p of prices(u)) expect(Number.isInteger(p) && p > 0, u.id).toBe(true);
    }
    for (const p of protocols) expect(Number.isInteger(p.price) && p.price > 0, p.id).toBe(true);
  });

  it('a granted item (a story transaction gives it) has one rank at price 0', () => {
    const grants = upgrades.filter((u) => u.kind === 'grant');
    expect(grants.map((u) => u.id)).toEqual(['tune_zibzab']);
    for (const u of grants) expect(prices(u), u.id).toEqual([0]);
  });

  it('ids are unique across upgrades and protocols, and every item has a name', () => {
    const ids = [...upgrades.map((u) => u.id), ...protocols.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of [...upgrades, ...protocols]) expect(item.name.length).toBeGreaterThan(0);
  });

  it('every availableAfter is a planned campaign map', () => {
    const plan = new Set<string>(CAMPAIGN_PLAN_IDS);
    const afters = [
      ...upgrades.map((u) => u.availableAfter),
      ...protocols.map((p) => p.availableAfter),
      ...Object.values(TOWER_ACCESS).map((a) => a.availableAfter),
      ...Object.values(ABILITY_ACCESS).map((a) => a?.availableAfter ?? null),
      ENGINEERING.availableAfter,
      ...REFERENCE_ECONOMY.bankResetAfter,
    ];
    for (const m of afters) if (m !== null) expect(plan.has(m), m).toBe(true);
  });

  it('every registered tower has an access entry and one tune-up', () => {
    for (const id of Object.keys(TOWERS)) {
      expect(Object.hasOwn(TOWER_ACCESS, id), id).toBe(true);
      // A stub registered ahead of its task gets its tune-up with that task (T406, T408).
      const tunes = TOWERS_AHEAD_OF_TASK.includes(id) ? [] : [`tune_${id}`];
      expect(upgrades.filter((u) => u.tower === id).map((u) => u.id)).toEqual(tunes);
    }
  });
});

describe('catalog: progression.md numbers', () => {
  it('global upgrades (§ 4.3): prices, ranks, and the 2,640 total', () => {
    expect(prices(UPGRADES.reinforced_core)).toEqual([120, 200, 300]);
    expect(prices(UPGRADES.seed_money)).toEqual([80, 120, 180, 260]);
    expect(prices(UPGRADES.salvage_rights)).toEqual([60, 120]);
    expect(prices(UPGRADES.resale_value)).toEqual([100, 200]);
    expect(prices(UPGRADES.ability_coolant)).toEqual([100, 160, 240]);
    expect(prices(UPGRADES.bounty_hunter)).toEqual([150, 250]);
    const globals = upgrades.filter((u) => u.kind === 'shop' && u.tower === undefined);
    expect(sum(globals.flatMap(prices))).toBe(2640);
  });

  it('global upgrade effects (§ 4.3)', () => {
    expect(UPGRADES.reinforced_core.ranks[0]?.grants).toEqual([
      { kind: 'economy', stat: 'coreIntegrity', flat: 1 },
    ]);
    expect(UPGRADES.resale_value.ranks.flatMap((r) => r.grants)).toEqual([
      { kind: 'sellRefund', flat: 0.05 },
      { kind: 'sellRefund', flat: 0.05 },
    ]);
    expect(UPGRADES.ability_coolant.ranks[2]?.grants).toEqual([
      { kind: 'abilityStat', ability: '*', stat: 'cooldown', pct: -0.05 },
    ]);
  });

  it('tune-ups (§ 4.2): 40 / 80 / 140 for damage, cost, range', () => {
    const t = UPGRADES.tune_thumper;
    expect(prices(t)).toEqual([40, 80, 140]);
    expect(t.ranks.map((r) => r.grants)).toEqual([
      [{ kind: 'towerStat', tower: 'thumper', stat: 'damage', pct: 0.05 }],
      [{ kind: 'towerCost', tower: 'thumper', tiers: 'all', pct: -0.05 }],
      [{ kind: 'towerStat', tower: 'thumper', stat: 'range', pct: 0.05 }],
    ]);
  });

  it('a support tower tunes aura strength and radius instead (§ 4.2; the Lookout, T406)', () => {
    const t = UPGRADES.tune_lookout;
    expect(prices(t)).toEqual([40, 80, 140]);
    expect(t.ranks.map((r) => r.grants)).toEqual([
      [{ kind: 'supportStat', tower: 'lookout', stat: 'aura', pct: 0.05 }],
      [{ kind: 'towerCost', tower: 'lookout', tiers: 'all', pct: -0.05 }],
      [{ kind: 'supportStat', tower: 'lookout', stat: 'radius', pct: 0.05 }],
    ]);
  });

  it('the Zibzab Tune-up (§ 2.1, C2 Sell): +8% damage on every Vrell tower', () => {
    const vrell = Object.values(TOWERS).filter((t) => t.faction === 'vrell');
    expect(vrell.map((t) => t.id)).toEqual(['zapcoil', 'lookout', 'harpoon', 'crane']);
    expect(UPGRADES.tune_zibzab.ranks.flatMap((r) => r.grants)).toEqual(
      vrell.map((t) => ({ kind: 'towerStat', tower: t.id, stat: 'damage', pct: 0.08 })),
    );
  });

  it('Field Protocols (§ 5): ten, 1,420 Stardust in all', () => {
    expect(protocols).toHaveLength(10);
    expect(sum(protocols.map((p) => p.price))).toBe(1420);
    expect(PROTOCOLS.head_start.grants).toEqual([
      { kind: 'economy', stat: 'startCredits', pct: 0.1 },
    ]);
    expect(PROTOCOLS.emergency_bulkhead.grants).toEqual([{ kind: 'leakAbsorb', flat: 5 }]);
    expect(PROTOCOLS.linked_up.grants).toEqual([{ kind: 'linkBonus', pct: 0.5 }]);
    expect(PROTOCOLS.specialist.choice).toBe('tower');
  });

  it('R&D Command (§ 7.3, D031): Mk II and Bricks Rapport cost 2 Intel each, after A1M1', () => {
    for (const u of [UPGRADES.orbital_strike_mk2, UPGRADES.rapport_bricks]) {
      expect(u.kind).toBe('rnd');
      expect(prices(u)).toEqual([2]);
      expect(u.availableAfter).toBe('a1_m01');
    }
    expect(UPGRADES.orbital_strike_mk2.ranks[0]?.grants).toEqual([
      { kind: 'abilityStat', ability: 'orbital_strike', stat: 'radius', flat: 0.5 },
    ]);
    expect(UPGRADES.rapport_bricks.ranks[0]?.grants).toEqual([
      { kind: 'abilityStat', ability: 'suppressing_fire', stat: 'cooldown', pct: -0.15 },
    ]);
    expect(prices(UPGRADES.protocol_slots)).toEqual([4, 6]);
  });

  it("QUILL's Rapport (§ 7.3, T308): 2 Intel, Time Dilation −15% cooldown, once QUILL is met", () => {
    const u = UPGRADES.rapport_quill;
    expect(u.kind).toBe('rnd');
    expect(u.companion).toBe('quill');
    expect(prices(u)).toEqual([2]);
    // Time Dilation first plays on A1M3 (QUILL's map), so it's stocked once A1M3 is won.
    expect(u.availableAfter).toBe('a1_m03');
    expect(u.ranks[0]?.grants).toEqual([
      { kind: 'abilityStat', ability: 'time_dilation', stat: 'cooldown', pct: -0.15 },
    ]);
  });

  it("Ves'thara's Rapport (§ 7.3, T509): 2 Intel, Stillness −15% cooldown, after A2M6", () => {
    const u = UPGRADES.rapport_vesthara;
    expect(u).toMatchObject({
      kind: 'rnd',
      companion: 'vesthara',
      availableAfter: 'a2_m06',
      hideUntilStocked: true,
    });
    expect(prices(u)).toEqual([2]);
    expect(u.ranks[0]?.grants).toEqual([
      { kind: 'abilityStat', ability: 'stillness', stat: 'cooldown', pct: -0.15 },
    ]);
  });

  it('Xenotech (§ 7.2, T509): the Prism given, the other Aelari attuned for 3 Intel once it is owned', () => {
    expect(TOWER_ACCESS.prism).toEqual({ how: 'gift', availableAfter: 'a2_m05' });
    const attuned = Object.entries(TOWER_ACCESS).filter(([, a]) => a.how === 'attune');
    expect(attuned.map(([t]) => t)).toEqual(['mindspike', 'lantern', 'bloom']);
    for (const [tower, a] of attuned) {
      expect(
        (TOWERS as Readonly<Record<string, { readonly faction: string }>>)[tower]?.faction,
        tower,
      ).toBe('aelari');
      expect(a, tower).toEqual({
        how: 'attune',
        currency: 'intel',
        price: 3,
        // The Stasis Bloom after A3M1 (campaign.md § 4.1; T600a's stub, T608's tower).
        availableAfter: tower === 'bloom' ? 'a3_m01' : 'a2_m05',
        requires: 'prism',
      });
    }
  });

  it('Engineering (§ 7.1): Everglow specs 2 Intel, the rest 3, after A1M4', () => {
    expect(ENGINEERING).toEqual({
      currency: 'intel',
      availableAfter: 'a1_m04',
      priceByFaction: { everglow: 2, vrell: 3, aelari: 3, skitterkin: 3 },
    });
  });

  it('stocking (campaign.md § 4.6): the shop and protocols after A1M3, R&D Command after A1M1', () => {
    // The Aelari tune-ups wait for their towers, the Prism (Ves'thara's gift), the Mindspike and
    // the Lantern (attuned), all after A2M5 (T504, T507, T508).
    // The Scuttle Den's waits for its gift, after A2M6 (T604); the Hum Choir's for its earliest,
    // after A3M1 (T607).
    const aelari = new Set(['tune_prism', 'tune_mindspike', 'tune_lantern']);
    const later: Readonly<Record<string, string>> = { tune_burrow: 'a2_m06', tune_choir: 'a3_m01' };
    const after = (id: string): string => (aelari.has(id) ? 'a2_m05' : (later[id] ?? 'a1_m03'));
    for (const u of upgrades.filter((x) => x.kind === 'shop')) {
      expect(u.availableAfter, u.id).toBe(after(u.id));
    }
    for (const p of protocols) expect(p.availableAfter, p.id).toBe('a1_m03');
    expect(UPGRADES.protocol_slots.availableAfter).toBe('a1_m03');
    expect(TOWER_ACCESS.sprinkler.availableAfter).toBe('a1_m01');
    expect(ABILITY_ACCESS.orbital_strike?.availableAfter).toBeNull();
  });
});

describe('campaign order', () => {
  it('plans all 18 maps from A1M1 to the finale (story/campaign.md § 2)', () => {
    expect(CAMPAIGN_PLAN).toHaveLength(18);
    expect(CAMPAIGN_PLAN_IDS.slice(0, 2)).toEqual(['a1_m01', 'a1_m02']);
    expect(CAMPAIGN_PLAN_IDS.at(-1)).toBe('fin_m01');
    expect(new Set(CAMPAIGN_PLAN_IDS).size).toBe(18);
  });

  it('CAMPAIGN is the registered maps, in plan order', () => {
    expect(CAMPAIGN).toEqual(CAMPAIGN_PLAN_IDS.filter((id) => Object.hasOwn(MAPS, id)));
    expect(CAMPAIGN[0]).toBe('a1_m01');
  });
});
