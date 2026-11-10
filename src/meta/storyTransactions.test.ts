// Story transactions (meta-runtime.md § Story transactions): the M5 seam (T500b). The C2 rule's
// numbers, the grant ids, and run end's step 6 hook: which maps transact, only on a first win, in
// table order. The transaction bodies are T510's; their tests join with them.
import { describe, expect, it } from 'vitest';
import { createNewSave } from './saveData.ts';
import { runEnd } from './runEnd.ts';
import {
  Q3_BONUS_GRANT,
  RUN_END_TRANSACTIONS,
  c2Windfall,
  giftGrantId,
  grantGift,
  grantQ3Bonus,
  resolveC2,
  runEndTransactions,
  type RunEndTransactionDef,
} from './storyTransactions.ts';

describe('the C2 rule (progression.md § 2.1)', () => {
  it('pays one Intel per 150 Stardust, clamped to 3–8', () => {
    expect(c2Windfall(0)).toBe(3);
    expect(c2Windfall(449)).toBe(3);
    expect(c2Windfall(600)).toBe(4);
    expect(c2Windfall(1_049)).toBe(6);
    expect(c2Windfall(1_200)).toBe(8);
    expect(c2Windfall(99_999)).toBe(8);
    expect(c2Windfall(-5)).toBe(3);
  });
});

describe('grant ids', () => {
  it('records the Q3 Bonus and gifts in story.granted as snake_case ids', () => {
    expect(Q3_BONUS_GRANT).toBe('q3_bonus');
    expect(giftGrantId('rivet')).toBe('gift_rivet');
    for (const id of [Q3_BONUS_GRANT, giftGrantId('skyhook')])
      expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});

describe('run end step 6 (runEndTransactions)', () => {
  it("lists A2M4's Q3 Bonus as its run-end transaction", () => {
    expect(RUN_END_TRANSACTIONS.a2_m04).toEqual([{ kind: 'q3_bonus' }]);
  });

  it('transacts only on a first win, in table order', () => {
    const save = createNewSave();
    const table: Record<string, readonly RunEndTransactionDef[]> = {
      a1_m01: [{ kind: 'q3_bonus' }, { kind: 'gift', tower: 'skyhook' }],
    };
    for (const [won, wonBefore] of [
      [false, false],
      [true, true],
      [false, true],
    ] as const) {
      expect(runEndTransactions(save, { mapId: 'a1_m01', won, wonBefore }, table)).toEqual({
        save,
        transactions: [],
      });
    }
    // A map with none leaves the save as it is.
    const none = runEndTransactions(save, { mapId: 'a1_m02', won: true, wonBefore: false }, table);
    expect(none.save).toBe(save);
    expect(none.transactions).toEqual([]);
  });

  it('the stubs leave the save unchanged until T510 builds them', () => {
    const save = createNewSave();
    expect(grantQ3Bonus(save)).toEqual({ save, applied: null });
    expect(grantGift(save, 'skyhook')).toEqual({ save, applied: null });
    expect(resolveC2(save, 'returned')).toEqual({ save, applied: null });
    const first = runEndTransactions(
      save,
      { mapId: 'a1_m01', won: true, wonBefore: false },
      {
        a1_m01: [{ kind: 'q3_bonus' }],
      },
    );
    expect(first.save).toBe(save);
  });

  it('reports step 6 in the run-end summary (none on an Act I map)', () => {
    const { summary } = runEnd(createNewSave(), {
      mapId: 'a1_m01',
      outcome: 'won',
      mapStardust: 0,
      waveCount: 7,
      wavesResolved: 7,
      earnedMedals: ['victory'],
      skitterkinKilled: 10,
      meter: 20,
    });
    expect(summary.transactions).toEqual([]);
    expect(summary.issued).toEqual(['sprinkler']);
  });
});
