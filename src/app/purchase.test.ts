// app/save.ts's purchases (T204d): a purchase at the base writes the slot at once.
import { beforeEach, describe, expect, it } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { MemoryStore, loadSlot, writeSlot } from '../meta/index.ts';
import { campaign } from '../ui/screens/state.ts';
import { activeSave, initSaves, loadDevSave, openSlot, purchase, storeShelf } from './save.ts';

const MK2 = { kind: 'upgrade', id: 'orbital_strike_mk2' } as const;

describe('purchases in the save session', () => {
  let store: MemoryStore;
  beforeEach(() => {
    store = new MemoryStore();
    initSaves(store, () => 1000);
    writeSlot(store, 2, DEV_SAVES.after_a1m1.build(), 0);
    expect(openSlot(2)).toEqual({ ok: true });
  });

  it('buys Mk II and writes the slot at once', () => {
    const r = purchase(MK2);
    expect(r).toMatchObject({ ok: true, writeFailed: null, offer: { owned: 1 } });
    const stored = loadSlot(store, 2);
    expect(stored.status === 'ok' ? stored.save.upgrades : null).toEqual({ orbital_strike_mk2: 1 });
    expect(stored.status === 'ok' ? stored.save.currencies.intel : null).toBe(1);
    // The views follow: the bank and the shelf.
    expect(campaign.value?.intel).toBe(1);
    expect(
      storeShelf('rnd').find((o) => o.item.kind === 'upgrade' && o.item.id === MK2.id),
    ).toMatchObject({ owned: 1, refusal: 'maxed' });
  });

  it('refuses without spending, and without a save', () => {
    purchase(MK2);
    const r = purchase({ kind: 'upgrade', id: 'rapport_bricks' });
    expect(r).toMatchObject({ ok: false, reason: 'short' });
    expect(activeSave()?.currencies.intel).toBe(1);
    initSaves(new MemoryStore());
    expect(purchase(MK2)).toMatchObject({ ok: false, reason: 'unknown' });
    expect(storeShelf('rnd')).toEqual([]);
  });

  it("honours a dev save's devUnlocks", () => {
    expect(loadDevSave('after_a1m1')).toBe(true);
    expect(storeShelf('engineering')[0]?.refusal).toBe('pane_locked');
    expect(loadDevSave('all_unlocked')).toBe(true);
    expect(storeShelf('engineering').map((o) => o.refusal)).toEqual([
      'maxed',
      'maxed',
      'maxed', // the Sprinkler's (T407a)
      'maxed', // the Lookout's (T406)
      'maxed', // Skyhook's and Zapcoil's (T407b)
      'maxed',
      'maxed', // the Harpoon's and Crane's (T408)
      'maxed',
      'maxed', // the Prism's (T504)
      'maxed', // the Mindspike's (T507)
      'maxed', // the Lantern's (T508)
      'maxed', // the Scuttle Den's (T604)
      'maxed', // the Hum Choir's (T607)
      'maxed', // the Stasis Bloom's (T608)
      'maxed', // the Gloop Spitter's (T705)
      'maxed', // the Sproing Pad's (T704)
    ]);
  });
});
