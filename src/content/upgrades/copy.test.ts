// Item copy (copy.ts) against story/style-guide.md § 6.3 (Zibzab) and § 6.4 (QUILL).
import { describe, expect, it } from 'vitest';
import { ITEM_COPY, itemCopy } from './copy.ts';
import { PROTOCOLS, UPGRADES, type ProtocolDef, type UpgradeDef } from './index.ts';

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

describe('item copy', () => {
  it('every catalog item carries its copy.ts line, and copy.ts has no line for a missing item', () => {
    const ids = [...upgrades.map((u) => u.id), ...protocols.map((p) => p.id)];
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

  it("QUILL's R&D lines are not Zibzab's", () => {
    for (const u of quill) expect(u.copy, u.id).not.toMatch(/^Price first/);
  });
});
