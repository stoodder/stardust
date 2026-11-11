// Act III part two's story/meta seams (T700b; D146): the briefing gifts that now take abilities
// and conditions, and the four transactions' signatures, argument checks, data, and refusals
// (their bodies are T710's). meta/storyTransactions.ts.
import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../content/compileHelpers.ts';
import { createNewSave, type SaveData } from './saveData.ts';
import { validateSave } from './validate.ts';
import {
  ACT3_PART_TWO_TASK,
  BRIEFING_GIFTS,
  C4_CHOICES,
  C4_EFFECTS,
  CRATE,
  INHERITED_ABILITIES,
  JAILBREAK,
  STORY_TRANSACTION_RULES,
  abilityGiftGrantId,
  briefingGifts,
  buyJailbreak,
  crateContents,
  giftGrantId,
  inheritAbility,
  jailbreakPrice,
  openCrate,
  resolveC4,
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

describe('the jailbreak (signature and data)', () => {
  it('costs 300 Stardust, free under the convoy, stocked after A3M3', () => {
    expect(STORY_TRANSACTION_RULES.jailbreakStardust).toBe(300);
    expect(jailbreakPrice(withDoor('warren'))).toBe(300);
    expect(jailbreakPrice(withDoor('convoy'))).toBe(0);
    expect(jailbreakPrice(createNewSave())).toBe(300);
    expect(JAILBREAK).toMatchObject({ grant: 'jailbreak', availableAfter: 'a3_m03' });
  });

  it(`refuses 'unbuilt' until ${ACT3_PART_TWO_TASK}, and is a no-op once granted`, () => {
    const save = deepFreeze(withDoor('convoy'));
    expect(buyJailbreak(save)).toMatchObject({ ok: false, reason: 'unbuilt' });
    const done = { ...save, story: { ...save.story, granted: [JAILBREAK.grant] } };
    expect(buyJailbreak(done)).toEqual({ ok: true, save: done, applied: null });
  });
});

describe('inheritAbility (signature and data)', () => {
  it("inherits Bricks's Suppressing Fire at A3M4's mail and QUILL's Time Dilation under Keep", () => {
    expect(INHERITED_ABILITIES).toEqual({
      suppressing_fire: { map: 'a3_m04', at: 'mail_scene' },
      time_dilation: { map: 'a3_m04', at: 'c4', when: { flag: 'quill_choice', eq: 'keep' } },
    });
  });

  it("refuses any other ability as 'invalid', and 'unbuilt' for the two", () => {
    const save = deepFreeze(createNewSave());
    expect(inheritAbility(save, 'orbital_strike')).toMatchObject({ ok: false, reason: 'invalid' });
    for (const a of ['suppressing_fire', 'time_dilation'] as const) {
      expect(inheritAbility(save, a)).toMatchObject({ ok: false, reason: 'unbuilt' });
    }
    const had = {
      ...save,
      unlocks: {
        ...save.unlocks,
        abilities: [...save.unlocks.abilities, 'suppressing_fire' as const],
        inheritedAbilities: ['suppressing_fire' as const],
      },
    };
    expect(validateSave(had).ok).toBe(true);
    expect(inheritAbility(had, 'suppressing_fire')).toEqual({ ok: true, save: had, applied: null });
  });
});

describe('resolveC4 (signature and data)', () => {
  it("takes quill_choice's three values; Keep inherits Time Dilation, Purge refunds QUILL's Rapport", () => {
    expect(C4_CHOICES).toEqual(['purge', 'keep', 'rewrite']);
    expect(C4_EFFECTS).toEqual({
      purge: { inherit: null, refund: 'rapport_quill' },
      keep: { inherit: 'time_dilation', refund: null },
      rewrite: { inherit: null, refund: null },
    });
  });

  it("refuses a value outside the flag's as 'invalid', else 'unbuilt'; asked once", () => {
    const save = deepFreeze(createNewSave());
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a caller's bad value
    expect(resolveC4(save, 'maybe' as C4Choice)).toMatchObject({ ok: false, reason: 'invalid' });
    for (const c of C4_CHOICES) {
      const r = resolveC4(save, c);
      expect(r).toMatchObject({ ok: false, reason: 'unbuilt' });
      if (!r.ok) expect(r.message).toContain(ACT3_PART_TWO_TASK);
    }
    const asked = { ...save, story: { ...save.story, flags: { quill_choice: 'keep' as const } } };
    expect(resolveC4(asked, 'purge')).toEqual({ ok: true, save: asked, applied: null });
  });
});

/** A save owning the Zapcoil (tune 2) and the Harpoon, and the Rivet (not Vrell). */
function intoA3M6(): SaveData {
  const save = createNewSave();
  save.unlocks.towers.push('zapcoil', 'harpoon');
  save.upgrades = { tune_zapcoil: 2, tune_rivet: 1 };
  return save;
}

describe("Zibzab's crate (signature and data)", () => {
  it("installs every owned Vrell tower's tune-up ranks the save lacks, at the top rank", () => {
    expect(CRATE).toEqual({ grant: 'crate', map: 'a3_m06', faction: 'vrell' });
    expect(crateContents(intoA3M6())).toEqual({ tune_zapcoil: 3, tune_harpoon: 3 });
    const full = intoA3M6();
    full.upgrades = { tune_zapcoil: 3, tune_harpoon: 3 };
    expect(crateContents(full)).toEqual({});
  });

  it("checks a protocol pick (only when the crate holds no tune-up), else refuses 'unbuilt'", () => {
    const save = deepFreeze(intoA3M6());
    expect(openCrate(save)).toMatchObject({ ok: false, reason: 'unbuilt' });
    expect(openCrate(save, 'head_start')).toMatchObject({ ok: false, reason: 'invalid' });
    const full = intoA3M6();
    full.upgrades = { tune_zapcoil: 3, tune_harpoon: 3 };
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a caller's bad id
    expect(openCrate(full, 'no_such_protocol' as never)).toMatchObject({ reason: 'invalid' });
    expect(openCrate(full, 'head_start')).toMatchObject({ ok: false, reason: 'unbuilt' });
    const opened = { ...save, story: { ...save.story, granted: [CRATE.grant] } };
    expect(openCrate(opened)).toEqual({ ok: true, save: opened, applied: null });
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
