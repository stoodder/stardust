// Towers registered ahead of their task (T400a: content/towers/index.ts TOWERS_AHEAD_OF_TASK, each
// gated by its `tower.<id>` row in sim/gates.ts) are on no shelf: their licenses (the Harpoon's
// and Crane's after A2M1) and spec unlocks are data until the task lifts the gate, and buying one
// by id is refused as not in the catalog. The Lookout's license went live with T406.
import { describe, expect, it } from 'vitest';
import { TOWERS_AHEAD_OF_TASK } from '../content/towers/index.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import { buy, offerFor, shelf } from './purchase.ts';

describe('stub towers stay off the shelves (T400a)', () => {
  it('lists no license or spec unlock for a stub, even with every pane open and the bank full', () => {
    const save = DEV_SAVES.all_unlocked.build();
    save.currencies = { stardust: 99_999, intel: 999 };
    const panes = ['shop', 'engineering'] as const;
    const towers = panes.flatMap((p) =>
      shelf(save, p, [...panes]).flatMap((o) => (o.tower === null ? [] : [o.tower])),
    );
    for (const id of TOWERS_AHEAD_OF_TASK) {
      expect(towers, id).not.toContain(id);
      expect(offerFor(save, { kind: 'license', tower: id }, ['shop']), id).toBeNull();
      expect(offerFor(save, { kind: 'specs', tower: id }, ['engineering']), id).toBeNull();
      expect(buy(save, { kind: 'license', tower: id }, ['shop']), id).toMatchObject({
        ok: false,
        reason: 'unknown',
      });
    }
    expect(TOWERS_AHEAD_OF_TASK).not.toContain('lookout');
  });

  it("puts the Lookout's license on the shelf after A1M5, for 150 (T406)", () => {
    const m4 = DEV_SAVES.after_a1m4.build();
    m4.currencies.stardust = 1000;
    expect(offerFor(m4, { kind: 'license', tower: 'lookout' })).toMatchObject({
      price: 150,
      availableAfter: 'a1_m05',
      refusal: 'not_stocked',
    });
    const m5 = DEV_SAVES.after_a1m5.build();
    m5.currencies.stardust = 1000;
    const offers = shelf(m5, 'shop').filter((o) => o.item.kind === 'license');
    expect(offers.map((o) => [o.tower, o.refusal])).toContainEqual(['lookout', null]);
    const r = buy(m5, { kind: 'license', tower: 'lookout' });
    expect(r.ok && r.save.unlocks.towers.includes('lookout')).toBe(true);
    expect(r.ok && r.save.currencies.stardust).toBe(850);
    // Its tune-up is on the shelf once it's owned.
    expect(offerFor(m5, { kind: 'upgrade', id: 'tune_lookout' })?.refusal).toBe('not_owned');
    if (r.ok) {
      expect(offerFor(r.save, { kind: 'upgrade', id: 'tune_lookout' })).toMatchObject({
        price: 40,
        refusal: null,
      });
    }
  });
});
