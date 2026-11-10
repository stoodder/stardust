// Item copy (copy.ts) against story/style-guide.md § 6.3 (Zibzab) and § 6.4 (QUILL), and
// Ves'thara's Xenotech lines (T509; characters.md: formal, no contractions).
import { describe, expect, it } from 'vitest';
import { TOWERS } from '../towers/index.ts';
import { ITEM_COPY, itemCopy } from './copy.ts';
import {
  ABILITY_ACCESS,
  PROTOCOLS,
  TOWER_ACCESS,
  UPGRADES,
  type Access,
  type ProtocolDef,
  type UpgradeDef,
} from './index.ts';

const upgrades = Object.values<UpgradeDef>(UPGRADES);
const protocols = Object.values<ProtocolDef>(PROTOCOLS);

/** What Zibzab sells, with its prices in rank order (a protocol has one). */
const zibzab = [
  ...upgrades
    .filter((u) => u.kind === 'shop')
    .map((u) => ({ id: u.id, prices: u.ranks.map((r) => r.price) })),
  ...protocols.map((p) => ({ id: p.id, prices: [p.price] })),
];
const quill = upgrades.filter((u) => u.kind === 'rnd');
/** Vrell licenses' copy ids: `license_<tower>` for each `how: 'license'` access row. */
const licenses = Object.entries<Access>(TOWER_ACCESS)
  .filter(([, a]) => a.how === 'license')
  .map(([tower, a]) => ({ id: `license_${tower}`, price: a.how === 'license' ? a.price : 0 }));

/**
 * Xenotech's copy ids (T509): `attune_<tower>` for each `how: 'attune'` row, `gift_<tower>` for an
 * Aelari gift (the Prism Spire), both in Ves'thara's voice.
 */
const vesthara = Object.entries<Access>(TOWER_ACCESS).flatMap(([tower, a]) => {
  if (a.how === 'attune') return [`attune_${tower}`];
  return a.how === 'gift' &&
    (TOWERS as Readonly<Record<string, { readonly faction: string }>>)[tower]?.faction === 'aelari'
    ? [`gift_${tower}`]
    : [];
});

/** R&D's Technician abilities' copy ids: `ability_<id>` for each `how: 'rnd'` access row (T406). */
const rndAbilities = Object.entries<Access | undefined>(ABILITY_ACCESS)
  .filter(([, a]) => a?.how === 'rnd')
  .map(([id]) => `ability_${id}`);

describe('item copy', () => {
  it('every catalog item carries its copy.ts line, and copy.ts has no line for a missing item', () => {
    const ids = [
      ...upgrades.map((u) => u.id),
      ...protocols.map((p) => p.id),
      ...licenses.map((l) => l.id),
      ...rndAbilities,
      ...vesthara,
    ];
    for (const item of [...upgrades, ...protocols]) {
      expect(item.copy, item.id).not.toBeNull();
      expect(item.copy, item.id).toBe(ITEM_COPY[item.id]);
    }
    expect(Object.keys(ITEM_COPY).toSorted()).toEqual(ids.toSorted());
    expect(itemCopy('no_such_item')).toBeNull();
  });

  it('fits the 100-character limit and holds in every act: no exclamation points, no early words', () => {
    for (const [id, text] of Object.entries(ITEM_COPY)) {
      expect(text.length, id).toBeLessThanOrEqual(100);
      expect(text, id).not.toContain('!');
      // style-guide § 3's protected words.
      expect(text, id).not.toMatch(/hollow|refugee|leaving song|directive/i);
    }
  });

  it("Zibzab's lines put the price first, and the price is true", () => {
    for (const { id, prices } of zibzab) {
      const text = ITEM_COPY[id] ?? '';
      const m = /^Price first: (\d+) stardust(?:, then (\d+))?(?:, then (\d+))?[,.]/.exec(text);
      expect(m, id).not.toBeNull();
      // Every price he names is the price of that rank, in order.
      const named = (m ?? [])
        .slice(1)
        .filter((x) => x !== undefined)
        .map(Number);
      expect(named, id).toEqual(prices.slice(0, named.length));
      // He never says "free"; "friend" is said once, in A3M6 (style-guide § 6.3, § 7).
      expect(text, id).not.toMatch(/\bfree\b|\bfriend\b/i);
    }
  });

  it('license lines put the price first; a sample (0) names its price without saying "free"', () => {
    for (const { id, price } of licenses) {
      const text = ITEM_COPY[id] ?? '';
      expect(text, id).toMatch(price === 0 ? /^Price first: your next visit\./ : /^Price first: /);
      if (price > 0) expect(text, id).toContain(`${price} stardust`);
      expect(text, id).not.toMatch(/\bfree\b|\bfriend\b/i);
    }
  });

  it("QUILL's R&D lines are not Zibzab's", () => {
    for (const u of quill) expect(u.copy, u.id).not.toMatch(/^Price first/);
    for (const id of rndAbilities) expect(ITEM_COPY[id], id).not.toMatch(/^Price first/);
  });

  it("Ves'thara's Xenotech lines: no price, no contractions, and never stardust", () => {
    expect(vesthara.toSorted()).toEqual([
      'attune_bloom',
      'attune_lantern',
      'attune_mindspike',
      'gift_prism',
    ]);
    for (const id of vesthara) {
      const text = ITEM_COPY[id] ?? '';
      expect(text, id).not.toBe('');
      expect(text, id).not.toMatch(/^Price first|stardust|intel/i);
      // characters.md: formal and precise, with no contractions.
      expect(text, id).not.toMatch(/n't\b|'(?:s|re|ll|ve|m|d)\b/i);
    }
  });
});
