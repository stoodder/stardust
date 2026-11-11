// Act III part two's story/meta (T700b's seams, T710's bodies; D146): the briefing gifts that take
// abilities and conditions, and the four transactions (the jailbreak, inheritance, C4, the crate)
// with their data and refusals. meta/storyTransactions.ts.
import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../content/compileHelpers.ts';
import { createNewSave, type SaveData } from './saveData.ts';
import { validateSave } from './validate.ts';
import { UPGRADES } from '../content/upgrades/index.ts';
import {
  BRIEFING_GIFTS,
  C4_CHOICES,
  C4_EFFECTS,
  C4_IN_PLAY,
  CRATE,
  INHERITED_ABILITIES,
  JAILBREAK,
  STORY_TRANSACTION_RULES,
  abilityGiftGrantId,
  briefingGifts,
  buyJailbreak,
  crateContents,
  crateProtocols,
  giftGrantId,
  inheritAbility,
  jailbreakPrice,
  openCrate,
  resolveC4,
  runEndTransactions,
  type BriefingGiftDef,
  type C4Choice,
} from './storyTransactions.ts';

/** A fresh save with `door` chosen (C3). */
function withDoor(door: 'convoy' | 'warren'): SaveData {
  const save = createNewSave();
  save.story.flags.door_choice = door;
  return save;
}

describe('briefing gifts take abilities and conditions (M7)', () => {
  it("lists A3M4's System Reboot, Hum Choir and the warren's Gloop; A3M5's Sproing; A3M6's convoy Gloop", () => {
    expect(BRIEFING_GIFTS.a3_m04).toEqual([
      { ability: 'system_reboot' },
      { tower: 'choir' },
      { tower: 'gloop', when: { flag: 'door_choice', eq: 'warren' } },
    ]);
    expect(BRIEFING_GIFTS.a3_m05).toEqual([{ tower: 'sproing' }]);
    expect(BRIEFING_GIFTS.a3_m06).toEqual([
      { tower: 'gloop', when: { flag: 'door_choice', eq: 'convoy' } },
    ]);
  });

  it('gives an ability once, recorded gift_<ability>', () => {
    const save = deepFreeze(createNewSave());
    const r = briefingGifts(save, 'a3_m04');
    expect(r.transactions).toContainEqual({ kind: 'gift_ability', ability: 'system_reboot' });
    expect(r.save.unlocks.abilities).toContain('system_reboot');
    expect(r.save.story.granted).toContain(abilityGiftGrantId('system_reboot'));
    expect(abilityGiftGrantId('system_reboot')).toBe('gift_system_reboot');
    expect(validateSave(r.save).ok).toBe(true);
    expect(briefingGifts(r.save, 'a3_m04')).toEqual({ save: r.save, transactions: [] });
  });

  it("gives the Gloop by door: the warren's in A3M4, the convoy's in A3M6", () => {
    for (const door of ['convoy', 'warren'] as const) {
      const a3m4 = briefingGifts(deepFreeze(withDoor(door)), 'a3_m04').save;
      expect(a3m4.unlocks.towers.includes('gloop'), door).toBe(door === 'warren');
      const a3m6 = briefingGifts(a3m4, 'a3_m06').save;
      expect(a3m6.unlocks.towers).toContain('gloop');
      expect(a3m6.story.granted.filter((g) => g === giftGrantId('gloop'))).toHaveLength(1);
    }
    // No door chosen (a dev battle): neither condition holds.
    expect(briefingGifts(createNewSave(), 'a3_m06').transactions).toEqual([]);
  });

  it('only records the Hum Choir for a save that already has it (A3M1 spared)', () => {
    const save = createNewSave();
    save.unlocks.towers.push('choir');
    save.story.granted.push(giftGrantId('choir'));
    const r = briefingGifts(save, 'a3_m04', { a3_m04: [{ tower: 'choir' }] });
    expect(r).toEqual({ save, transactions: [] });
  });

  it('skips a gift whose condition fails over a test table', () => {
    const table: Record<string, readonly BriefingGiftDef[]> = {
      a1_m01: [{ ability: 'scanner_sweep', when: { flag: 'door_choice', eq: 'warren' } }],
    };
    expect(briefingGifts(withDoor('convoy'), 'a1_m01', table).transactions).toEqual([]);
    expect(briefingGifts(withDoor('warren'), 'a1_m01', table).transactions).toEqual([
      { kind: 'gift_ability', ability: 'scanner_sweep' },
    ]);
  });
});

/** A save that has won A3M3 (a bare record), with the Rivet owned and revoked, and `door`. */
function afterA3M3(door: 'convoy' | 'warren', stardust = 400): SaveData {
  const save = withDoor(door);
  save.campaign.maps.a3_m03 = { completed: true, medals: ['victory'], bestMeter: 0 };
  save.unlocks.revokedTowers = ['rivet'];
  save.currencies.stardust = stardust;
  return save;
}

describe('the jailbreak (T710)', () => {
  it('costs 300 Stardust, free under the convoy, stocked after A3M3', () => {
    expect(STORY_TRANSACTION_RULES.jailbreakStardust).toBe(300);
    expect(jailbreakPrice(withDoor('warren'))).toBe(300);
    expect(jailbreakPrice(withDoor('convoy'))).toBe(0);
    expect(jailbreakPrice(createNewSave())).toBe(300);
    expect(JAILBREAK).toMatchObject({ grant: 'jailbreak', availableAfter: 'a3_m03' });
  });

  it('moves every revoked class to jailbroken, takes the price, and records itself once', () => {
    for (const door of ['convoy', 'warren'] as const) {
      const save = deepFreeze(afterA3M3(door));
      const r = buyJailbreak(save);
      expect(r.ok, door).toBe(true);
      if (!r.ok) continue;
      const price = door === 'convoy' ? 0 : 300;
      expect(r.applied).toEqual({ kind: 'jailbreak', towers: ['rivet'], stardust: price });
      expect(r.save.unlocks.revokedTowers).toEqual([]);
      expect(r.save.unlocks.jailbroken).toEqual(['rivet']);
      expect(r.save.currencies.stardust).toBe(400 - price);
      expect(r.save.story.granted).toContain(JAILBREAK.grant);
      expect(validateSave(r.save).ok).toBe(true);
      expect(buyJailbreak(r.save)).toEqual({ ok: true, save: r.save, applied: null });
    }
  });

  it("refuses before A3M3, with nothing revoked, and when the bank can't pay", () => {
    const early = withDoor('warren');
    early.unlocks.revokedTowers = ['rivet'];
    early.currencies.stardust = 999;
    expect(buyJailbreak(early)).toMatchObject({ ok: false, reason: 'not_stocked' });
    const none = afterA3M3('warren');
    none.unlocks.revokedTowers = [];
    expect(buyJailbreak(none)).toMatchObject({ ok: false, reason: 'nothing_revoked' });
    expect(buyJailbreak(afterA3M3('warren', 299))).toMatchObject({ ok: false, reason: 'short' });
    // Free under the convoy with an empty bank.
    expect(buyJailbreak(afterA3M3('convoy', 0))).toMatchObject({ ok: true });
  });
});

describe('inheritAbility (T710)', () => {
  it("inherits Bricks's Suppressing Fire at A3M4's mail and QUILL's Time Dilation under Keep", () => {
    expect(INHERITED_ABILITIES).toEqual({
      suppressing_fire: { map: 'a3_m04', at: 'mail_scene' },
      time_dilation: { map: 'a3_m04', at: 'c4', when: { flag: 'quill_choice', eq: 'keep' } },
    });
  });

  it('makes the ability a Technician ability, recorded inherited, once', () => {
    const save = deepFreeze(createNewSave());
    expect(inheritAbility(save, 'orbital_strike')).toMatchObject({ ok: false, reason: 'invalid' });
    const r = inheritAbility(save, 'suppressing_fire');
    expect(r).toMatchObject({
      ok: true,
      applied: { kind: 'inherit', ability: 'suppressing_fire' },
    });
    if (!r.ok) return;
    expect(r.save.unlocks.abilities).toContain('suppressing_fire');
    expect(r.save.unlocks.inheritedAbilities).toEqual(['suppressing_fire']);
    expect(validateSave(r.save).ok).toBe(true);
    expect(inheritAbility(r.save, 'suppressing_fire')).toEqual({
      ok: true,
      save: r.save,
      applied: null,
    });
  });

  it('refuses Time Dilation unless C4 was Keep (its `when`)', () => {
    expect(inheritAbility(createNewSave(), 'time_dilation')).toMatchObject({ reason: 'invalid' });
    const keep = createNewSave();
    keep.story.flags.quill_choice = 'keep';
    expect(inheritAbility(keep, 'time_dilation')).toMatchObject({ ok: true });
  });

  it("is run end's step 6 on A3M4's first win only (Gerald's mail)", () => {
    const save = deepFreeze(createNewSave());
    const won = runEndTransactions(save, { mapId: 'a3_m04', won: true, wonBefore: false });
    expect(won.transactions).toEqual([{ kind: 'inherit', ability: 'suppressing_fire' }]);
    expect(won.save.unlocks.inheritedAbilities).toEqual(['suppressing_fire']);
    for (const input of [
      { won: false, wonBefore: false },
      { won: true, wonBefore: true },
    ]) {
      expect(runEndTransactions(save, { mapId: 'a3_m04', ...input })).toEqual({
        save,
        transactions: [],
      });
    }
  });
});

describe('resolveC4 (T710)', () => {
  it("takes quill_choice's three values; Keep inherits Time Dilation, Purge refunds QUILL's Rapport", () => {
    expect(C4_CHOICES).toEqual(['purge', 'keep', 'rewrite']);
    expect(C4_EFFECTS).toEqual({
      purge: { inherit: null, refund: 'rapport_quill' },
      keep: { inherit: 'time_dilation', refund: null },
      rewrite: { inherit: null, refund: null },
    });
  });

  it('sets the flag and makes each answer, once', () => {
    const save = createNewSave();
    save.upgrades.rapport_quill = 1;
    save.currencies.intel = 1;
    deepFreeze(save);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a caller's bad value
    expect(resolveC4(save, 'maybe' as C4Choice)).toMatchObject({ ok: false, reason: 'invalid' });
    const rapport = UPGRADES.rapport_quill.ranks[0]!.price;
    for (const c of C4_CHOICES) {
      const r = resolveC4(save, c);
      expect(r.ok, c).toBe(true);
      if (!r.ok) continue;
      expect(r.save.story.flags.quill_choice).toBe(c);
      expect(r.applied).toEqual({
        kind: 'c4',
        choice: c,
        inherited: c === 'keep' ? 'time_dilation' : null,
        refund:
          c === 'purge' ? { upgrade: 'rapport_quill', currency: 'intel', amount: rapport } : null,
      });
      expect(r.save.currencies.intel).toBe(1 + (c === 'purge' ? rapport : 0));
      // The rank stays on record (as the uplink's Mk II): R&D never sells it again.
      expect(r.save.upgrades.rapport_quill).toBe(1);
      expect(r.save.unlocks.abilities.includes('time_dilation')).toBe(c === 'keep');
      expect(validateSave(r.save).ok).toBe(true);
      expect(resolveC4(r.save, 'purge')).toEqual({ ok: true, save: r.save, applied: null });
    }
    // Purge with no Rapport owned refunds nothing.
    const bare = resolveC4(createNewSave(), 'purge');
    expect(bare).toMatchObject({ ok: true, applied: { refund: null } });
  });

  it("puts Purge's armor on Everglow from A3M5, and QUILL offline on A3M5 under Rewrite", () => {
    expect(C4_IN_PLAY).toEqual({
      from: 'a3_m05',
      purgeArmor: {
        when: { flag: 'quill_choice', eq: 'purge' },
        modifier: {
          kind: 'enemyStat',
          stat: 'armor',
          faction: 'everglow',
          flat: -2,
          source: 'c4:purge',
        },
      },
      quillOffline: { map: 'a3_m05', when: { flag: 'quill_choice', eq: 'rewrite' } },
    });
  });
});

/** A save owning the Zapcoil (tune 2) and the Harpoon, and the Rivet (not Vrell). */
function intoA3M6(): SaveData {
  const save = createNewSave();
  save.unlocks.towers.push('zapcoil', 'harpoon');
  save.upgrades = { tune_zapcoil: 2, tune_rivet: 1 };
  return save;
}

describe("Zibzab's crate (T710)", () => {
  it("installs every owned Vrell tower's tune-up ranks the save lacks, at the top rank", () => {
    expect(CRATE).toEqual({ grant: 'crate', map: 'a3_m06', faction: 'vrell' });
    expect(crateContents(intoA3M6())).toEqual({ tune_zapcoil: 3, tune_harpoon: 3 });
    const save = deepFreeze(intoA3M6());
    const r = openCrate(save);
    expect(r).toMatchObject({
      ok: true,
      applied: {
        kind: 'crate',
        upgrades: { tune_zapcoil: 3, tune_harpoon: 3 },
        protocol: null,
      },
    });
    if (!r.ok) return;
    expect(r.save.upgrades).toEqual({ tune_zapcoil: 3, tune_harpoon: 3, tune_rivet: 1 });
    expect(r.save.story.granted).toEqual([...save.story.granted, CRATE.grant]);
    expect(validateSave(r.save).ok).toBe(true);
    expect(openCrate(r.save)).toEqual({ ok: true, save: r.save, applied: null });
    // A pick while it holds tune-ups is a caller's bug.
    expect(openCrate(save, 'head_start')).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it("holds one Field Protocol of the player's pick when every tune-up is owned", () => {
    const full = intoA3M6();
    full.upgrades = { tune_zapcoil: 3, tune_harpoon: 3 };
    deepFreeze(full);
    expect(crateContents(full)).toEqual({});
    expect(crateProtocols(full)).toContain('head_start');
    expect(openCrate(full)).toMatchObject({ ok: false, reason: 'needs_pick' });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a caller's bad id
    expect(openCrate(full, 'no_such_protocol' as never)).toMatchObject({ reason: 'invalid' });
    const r = openCrate(full, 'head_start');
    expect(r).toMatchObject({
      ok: true,
      applied: { kind: 'crate', upgrades: {}, protocol: 'head_start' },
    });
    if (!r.ok) return;
    expect(r.save.unlocks.protocols).toEqual(['head_start']);
    expect(openCrate(r.save, 'head_start')).toEqual({ ok: true, save: r.save, applied: null });
    // A save owning every protocol too opens an empty crate.
    const all = { ...full, unlocks: { ...full.unlocks, protocols: crateProtocols(full) } };
    expect(openCrate(all)).toMatchObject({ ok: true, applied: { upgrades: {}, protocol: null } });
  });
});

describe('SaveData.unlocks.inheritedAbilities (optional, no bump)', () => {
  it('validates absent, and present as known abilities the save owns', () => {
    const save = createNewSave();
    expect('inheritedAbilities' in save.unlocks).toBe(false);
    expect(validateSave(save)).toEqual({ ok: true, value: save });
    const bad: SaveData = {
      ...save,
      unlocks: { ...save.unlocks, inheritedAbilities: ['suppressing_fire'] },
    };
    const r = validateSave(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('\n')).toMatch(/inheritedAbilities/);
  });
});
