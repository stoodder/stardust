// Towers registered ahead of their task (T400a: content/towers/index.ts TOWERS_AHEAD_OF_TASK, each
// gated by its `tower.<id>` row in sim/gates.ts) are on no shelf: their licenses (the Lookout's
// after A1M5, the Harpoon's and Crane's after A2M1) and spec unlocks are data until the task lifts
// the gate, and buying one by id is refused as not in the catalog.
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
    expect(TOWERS_AHEAD_OF_TASK).toContain('lookout');
  });
});
