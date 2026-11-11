// Story transactions (meta-runtime.md § Story transactions): the M5 seam (T500b). The C2 rule's
// numbers, the grant ids, and run end's step 6 hook: which maps transact, only on a first win, in
// table order; the transactions themselves (T510): each pays once, records itself, and leaves its
// input untouched.
import { describe, expect, it } from 'vitest';
import { MAPS } from '../content/maps/index.ts';
import type { MapId } from '../content/types.ts';
import { UPGRADES } from '../content/upgrades/index.ts';
import { createNewSave, type SaveData } from './saveData.ts';
import { SAVE_LIMITS, validateSave } from './validate.ts';
import { runEnd } from './runEnd.ts';
import {
  BRIEFING_GIFTS,
  Q3_BONUS_GRANT,
  REVOCATION_REFUNDS,
  RUN_END_TRANSACTIONS,
  briefingGifts,
  revokeAbility,
  revokeTower,
  runEndRevocations,
  setDoorChoice,
  ZIBZAB_TUNE_UP,
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
  it("lists A2M4's Q3 Bonus, A2M5's Prism gift, and A3M1's Hum Choir if spared", () => {
    expect(RUN_END_TRANSACTIONS).toEqual({
      a2_m04: [{ kind: 'q3_bonus' }],
      a2_m05: [{ kind: 'gift', tower: 'prism' }],
      a3_m01: [{ kind: 'gift', tower: 'choir', when: { flag: 'spared_quiet_wave', eq: true } }],
    });
  });

  it("gives a conditional gift only when its condition holds over the save's flags", () => {
    const table: Record<string, readonly RunEndTransactionDef[]> = {
      a1_m01: [{ kind: 'gift', tower: 'skyhook', when: { flag: 'spared_quiet_wave', eq: true } }],
    };
    const first = { mapId: 'a1_m01', won: true, wonBefore: false } as const;
    const cleared = createNewSave();
    cleared.story.flags.spared_quiet_wave = false;
    expect(runEndTransactions(cleared, first, table).transactions).toEqual([]);
    const spared = createNewSave();
    spared.story.flags.spared_quiet_wave = true;
    expect(runEndTransactions(spared, first, table).transactions).toEqual([
      { kind: 'gift', tower: 'skyhook' },
    ]);
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

  it('pays the table on a first win, and only once a save', () => {
    const save = createNewSave();
    const table: Record<string, readonly RunEndTransactionDef[]> = {
      a1_m01: [{ kind: 'q3_bonus' }, { kind: 'gift', tower: 'skyhook' }],
    };
    const first = runEndTransactions(save, { mapId: 'a1_m01', won: true, wonBefore: false }, table);
    expect(first.transactions).toEqual([
      { kind: 'q3_bonus', stardust: 400 },
      { kind: 'gift', tower: 'skyhook' },
    ]);
    expect(first.save.currencies.stardust).toBe(save.currencies.stardust + 400);
    expect(first.save.unlocks.towers).toContain('skyhook');
    // A save that already holds both grants is never paid again, even on a "first" win.
    const again = runEndTransactions(
      first.save,
      { mapId: 'a1_m01', won: true, wonBefore: false },
      table,
    );
    expect(again).toEqual({ save: first.save, transactions: [] });
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

/** A save with `stardust` banked (and some Intel), deep-frozen so a mutation throws. */
function banked(stardust: number, intel = 5): SaveData {
  const save = createNewSave();
  save.currencies = { stardust, intel };
  return deepFreeze(save);
}

function deepFreeze<T>(o: T): T {
  if (o !== null && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

describe('grantQ3Bonus (progression.md § 2.1)', () => {
  it('pays +400 Stardust and records q3_bonus, once per save', () => {
    const save = banked(225);
    const r = grantQ3Bonus(save);
    expect(r.applied).toEqual({ kind: 'q3_bonus', stardust: 400 });
    expect(r.save.currencies).toEqual({ stardust: 625, intel: 5 });
    expect(r.save.story.granted).toEqual([...save.story.granted, Q3_BONUS_GRANT]);
    expect(save.currencies.stardust).toBe(225); // the input is untouched
    expect(grantQ3Bonus(r.save)).toEqual({ save: r.save, applied: null });
  });

  it('clamps the bank like any payout', () => {
    const r = grantQ3Bonus(banked(SAVE_LIMITS.currency - 10));
    expect(r.save.currencies.stardust).toBe(SAVE_LIMITS.currency);
  });
});

describe('resolveC2 (progression.md § 2.1)', () => {
  it('Sell: the bank to 0, the Intel windfall, and the Zibzab Tune-up at rank 1', () => {
    const save = banked(925);
    const r = resolveC2(save, 'sold');
    expect(r.applied).toEqual({ kind: 'c2', choice: 'sold', bank: 925, intel: 6, tuneUp: true });
    expect(r.save.currencies).toEqual({ stardust: 0, intel: 11 });
    expect(r.save.upgrades[ZIBZAB_TUNE_UP]).toBe(1);
    expect(r.save.story.flags.stardust_choice).toBe('sold');
    expect(UPGRADES[ZIBZAB_TUNE_UP].kind).toBe('grant');
    expect(validateSave(r.save).ok).toBe(true);
  });

  it('Return: the bank to 0 and nothing else but the flag', () => {
    const save = banked(625);
    const r = resolveC2(save, 'returned');
    expect(r.applied).toEqual({
      kind: 'c2',
      choice: 'returned',
      bank: 625,
      intel: 0,
      tuneUp: false,
    });
    expect(r.save.currencies).toEqual({ stardust: 0, intel: 5 });
    expect(r.save.upgrades).toEqual(save.upgrades);
    expect(r.save.story.flags.stardust_choice).toBe('returned');
  });

  it('None: an empty bank changes nothing but the flag', () => {
    const r = resolveC2(banked(0), 'none');
    expect(r.applied).toEqual({ kind: 'c2', choice: 'none', bank: 0, intel: 0, tuneUp: false });
    expect(r.save.currencies).toEqual({ stardust: 0, intel: 5 });
    expect(r.save.story.flags.stardust_choice).toBe('none');
  });

  it('is offered once: a save whose flag is set is left as it is', () => {
    const sold = resolveC2(banked(1_500), 'sold').save;
    const refilled = deepFreeze({ ...sold, currencies: { stardust: 900, intel: 3 } });
    for (const choice of ['sold', 'returned'] as const) {
      expect(resolveC2(refilled, choice)).toEqual({ save: refilled, applied: null });
    }
  });

  it('refuses a choice the bank does not allow', () => {
    expect(() => resolveC2(banked(300), 'none')).toThrow(/none/);
    expect(() => resolveC2(banked(0), 'sold')).toThrow(/sold/);
    expect(() => resolveC2(banked(0), 'returned')).toThrow(/returned/);
  });
});

describe('grantGift', () => {
  it('adds the tower and records gift_<tower>, once', () => {
    const save = deepFreeze(createNewSave());
    const r = grantGift(save, 'skyhook');
    expect(r.applied).toEqual({ kind: 'gift', tower: 'skyhook' });
    expect(r.save.unlocks.towers).toEqual([...save.unlocks.towers, 'skyhook']);
    expect(r.save.story.granted).toEqual([...save.story.granted, giftGrantId('skyhook')]);
    expect(grantGift(r.save, 'skyhook')).toEqual({ save: r.save, applied: null });
  });

  it('records the grant for a tower already owned and adds nothing', () => {
    const save = deepFreeze(createNewSave());
    const owned = save.unlocks.towers[0]!;
    const r = grantGift(save, owned);
    expect(r.save.unlocks.towers).toEqual(save.unlocks.towers);
    expect(r.save.story.granted).toEqual([...save.story.granted, giftGrantId(owned)]);
  });
});

describe('run end with the story transactions', () => {
  const won = {
    outcome: 'won',
    mapStardust: 225,
    waveCount: 12,
    wavesResolved: 12,
    earnedMedals: ['victory'],
    skitterkinKilled: 10,
    meter: 20,
  } as const;

  const a2m4: string = 'a2_m04';
  const a2m5: string = 'a2_m05';

  it.runIf(isMapId(a2m4))("pays A2M4's Q3 Bonus on its first win only", () => {
    if (!isMapId(a2m4)) return;
    const first = runEnd(banked(100), { ...won, mapId: a2m4 });
    expect(first.summary.transactions).toEqual([{ kind: 'q3_bonus', stardust: 400 }]);
    expect(first.save.story.granted).toContain(Q3_BONUS_GRANT);
    expect(first.save.currencies.stardust).toBe(100 + first.summary.stardust.amount + 400);
    const replay = runEnd(first.save, { ...won, mapId: a2m4 });
    expect(replay.summary.transactions).toEqual([]);
  });

  it.runIf(isMapId(a2m5))("gives A2M5's Prism Spire, never as an issued tower", () => {
    if (!isMapId(a2m5)) return;
    const { save, summary } = runEnd(banked(0), { ...won, mapId: a2m5 });
    expect(summary.transactions).toEqual([{ kind: 'gift', tower: 'prism' }]);
    expect(save.unlocks.towers).toContain('prism');
    expect(summary.issued).not.toContain('prism');
  });
});

function isMapId(id: string): id is MapId {
  return Object.hasOwn(MAPS, id);
}

describe('Act III part one (T600b): briefing gifts, revocation, C3', () => {
  it("gives A3M1's Scuttle Den in its briefing, once a save", () => {
    expect(BRIEFING_GIFTS.a3_m01).toEqual([{ tower: 'burrow' }]);
    const save = deepFreeze(createNewSave());
    const r = briefingGifts(save, 'a3_m01');
    expect(r.transactions).toEqual([{ kind: 'gift', tower: 'burrow' }]);
    expect(r.save.unlocks.towers).toContain('burrow');
    expect(r.save.story.granted).toContain(giftGrantId('burrow'));
    expect(briefingGifts(r.save, 'a3_m01')).toEqual({ save: r.save, transactions: [] });
    // A map with none leaves the save as it is.
    expect(briefingGifts(save, 'a3_m02').save).toBe(save);
  });

  it('revokes a class once, only one the save owns', () => {
    const save = deepFreeze(createNewSave());
    const r = revokeTower(save, 'rivet');
    expect(r.applied).toEqual({ kind: 'revoke_tower', tower: 'rivet' });
    expect(r.save.unlocks.revokedTowers).toEqual(['rivet']);
    expect(r.save.unlocks.towers).toEqual(save.unlocks.towers); // still owned (the jailbreak, M7)
    expect(validateSave(r.save).ok).toBe(true);
    expect(revokeTower(r.save, 'rivet')).toEqual({ save: r.save, applied: null });
    expect(revokeTower(save, 'skyhook')).toEqual({ save, applied: null });
  });

  it("revokes the uplink and refunds Orbital Strike Mk II's Intel (progression.md § 7.3)", () => {
    expect(REVOCATION_REFUNDS).toEqual({ orbital_strike: 'orbital_strike_mk2' });
    const plain = deepFreeze(createNewSave());
    const bare = revokeAbility(plain, 'orbital_strike');
    expect(bare.applied).toEqual({
      kind: 'revoke_ability',
      ability: 'orbital_strike',
      refund: null,
    });
    expect(bare.save.unlocks.revokedAbilities).toEqual(['orbital_strike']);
    expect(bare.save.currencies).toEqual(plain.currencies);

    const mk2 = createNewSave();
    mk2.upgrades.orbital_strike_mk2 = 1;
    mk2.currencies.intel = 1;
    const r = revokeAbility(deepFreeze(mk2), 'orbital_strike');
    const price = UPGRADES.orbital_strike_mk2.ranks[0]!.price;
    expect(r.applied).toEqual({
      kind: 'revoke_ability',
      ability: 'orbital_strike',
      refund: { upgrade: 'orbital_strike_mk2', currency: 'intel', amount: price },
    });
    expect(r.save.currencies.intel).toBe(1 + price);
    // The rank stays on record (R&D shows it bought and never sells it again).
    expect(r.save.upgrades.orbital_strike_mk2).toBe(1);
    expect(validateSave(r.save).ok).toBe(true);
    // Once: no second refund.
    expect(revokeAbility(r.save, 'orbital_strike')).toEqual({ save: r.save, applied: null });
  });

  it("saves the run's revocations on its first win only (run end, step 3)", () => {
    const save = createNewSave();
    save.upgrades.orbital_strike_mk2 = 1;
    const revoked = { towers: ['thumper'], abilities: ['orbital_strike'] } as const;
    for (const [won, wonBefore] of [
      [false, false],
      [true, true],
    ] as const) {
      expect(runEndRevocations(save, { won, wonBefore, revoked })).toEqual({
        save,
        revocations: [],
      });
    }
    expect(runEndRevocations(save, { won: true, wonBefore: false })).toEqual({
      save,
      revocations: [],
    });
    const r = runEndRevocations(save, { won: true, wonBefore: false, revoked });
    expect(r.revocations.map((t) => t.kind)).toEqual(['revoke_tower', 'revoke_ability']);
    expect(r.save.unlocks.revokedTowers).toEqual(['thumper']);
    expect(r.save.unlocks.revokedAbilities).toEqual(['orbital_strike']);

    // Through run end: the summary lists them, and the refund lands in the bank with the pay.
    const end = runEnd(save, {
      mapId: 'a1_m01',
      outcome: 'won',
      mapStardust: 0,
      waveCount: 7,
      wavesResolved: 7,
      earnedMedals: ['victory'],
      skitterkinKilled: 0,
      meter: 20,
      revoked,
    });
    expect(end.summary.revocations).toEqual(r.revocations);
    expect(end.save.unlocks.revokedTowers).toEqual(['thumper']);
    expect(end.save.currencies.intel).toBe(save.currencies.intel + 1 + 2);
  });

  it('commits C3 once: the door is never asked again', () => {
    const save = deepFreeze(createNewSave());
    const r = setDoorChoice(save, 'warren');
    expect(r.applied).toEqual({ kind: 'c3', choice: 'warren' });
    expect(r.save.story.flags.door_choice).toBe('warren');
    expect(setDoorChoice(r.save, 'convoy')).toEqual({ save: r.save, applied: null });
    expect(validateSave(r.save).ok).toBe(true);
  });
});
