// Act III part two's meta in the app (T710; D146): C4 on the card (asked once, committed on the
// answer, its payroll rows), C4 committed from any scene that sets it, C4's effects in a battle
// (Purge's armor from A3M5 on, slot-1 exclusions, QUILL offline), Zibzab's crate as A3M6's briefing
// closes (and the restart it calls for), and the jailbreak on the shop's shelf.
import { beforeEach, describe, expect, it } from 'vitest';
import { createNewSave, MemoryStore, shelf, buy, type SaveData } from '../meta/index.ts';
import { abilitiesOffOn, onOrAfter, quillOffline, storyModifiers } from '../meta/storyInPlay.ts';
import { C4_IN_PLAY } from '../meta/storyTransactions.ts';
import { createSim } from '../sim/index.ts';
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { runResult } from '../ui/screens/state.ts';
import { battleConfig } from './battleSetup.ts';
import { withSceneEffects } from './dialogue.ts';
import { pickResultsChoice, withResultsChoice } from './resultsFlow.ts';
import { transactionView } from './resultsStory.ts';
import { runResultOf, type RunEndInput } from './runResult.ts';
import { activeSave, initSaves, loadDevSave, updateActiveSave } from './save.ts';
import {
  briefingChangedBattle,
  crateOffer,
  openCrateAtBriefing,
  quillOfflineHere,
} from './storyMeta.ts';
import { SCENES } from '../content/dialogue/index.ts';

const NO_EFFECTS = { flags: {}, callsign: null } as const;

/** A fresh save with C4 answered `quill` (or not). */
function withC4(quill?: 'purge' | 'keep' | 'rewrite'): SaveData {
  const save = createNewSave();
  if (quill !== undefined) save.story.flags.quill_choice = quill;
  return save;
}

/** A won A3M4 run's facts, as the card reads them. */
const A3M4_WON: RunEndInput = {
  mapId: 'a3_m04',
  act: 3,
  waveCount: 16,
  maxIntegrity: 20,
  integrity: 18,
  skitterkinKilled: 0,
  wavesCleared: 16,
  firstLeakAgo: null,
  stardust: 330,
  medals: [],
  earnedMedals: [],
  objectives: [],
  resumedFromWave: null,
  checkpointWave: null,
};

describe('C4 on the card (D146: asked once, committed on the answer)', () => {
  beforeEach(() => initSaves(new MemoryStore()));

  it("offers QUILL's directives under their own title, nothing priced", () => {
    const save = withC4();
    const card = withResultsChoice(
      runResultOf(A3M4_WON, 'won', null),
      A3M4_WON,
      'won',
      save,
      false,
    );
    expect(card.choice?.title).toBe("QUILL's directives");
    expect(card.choice?.options).toEqual([
      'Purge them. All of them.',
      'Keep them. Stay yourself.',
      'Write your own.',
    ]);
    expect(card.choice?.pays.every((p) => p.intel === 0 && p.note === '')).toBe(true);
    // Asked once: a save that answered isn't offered it again; a loss never offers it.
    const asked = withResultsChoice(
      runResultOf(A3M4_WON, 'won', null),
      A3M4_WON,
      'won',
      withC4('keep'),
      false,
    );
    expect(asked.choice).toBeNull();
    expect(
      withResultsChoice(runResultOf(A3M4_WON, 'lost', null), A3M4_WON, 'lost', save, false).choice,
    ).toBeNull();
  });

  it.each([
    ['purge', 0],
    ['keep', 1],
    ['rewrite', 2],
  ] as const)('commits %s on the save in play at once', (quill, index) => {
    expect(loadDevSave('after_a2m6')).toBe(true);
    updateActiveSave((s) => ({ ...s, upgrades: { ...s.upgrades, rapport_quill: 1 } }));
    const before = activeSave()!;
    runResult.value = withResultsChoice(
      runResultOf(A3M4_WON, 'won', null),
      A3M4_WON,
      'won',
      before,
      true,
    );
    expect(runResult.value.choice?.picked).toBeNull();
    pickResultsChoice(index);
    const after = activeSave()!;
    expect(after.story.flags.quill_choice).toBe(quill);
    expect(after.story.seen).toContain('a3_m04_debrief');
    expect(after.unlocks.abilities.includes('time_dilation')).toBe(
      before.unlocks.abilities.includes('time_dilation') || quill === 'keep',
    );
    expect(after.unlocks.inheritedAbilities?.includes('time_dilation') === true).toBe(
      quill === 'keep',
    );
    expect(after.currencies.intel - before.currencies.intel).toBe(quill === 'purge' ? 2 : 0);
    expect(runResult.value.choice?.picked).toBe(index);
    // A second pick does nothing.
    pickResultsChoice((index + 1) % 3);
    expect(activeSave()?.story.flags.quill_choice).toBe(quill);
  });

  it('shows Keep as an inheritance and Purge as a refund row; the mail as an inheritance', () => {
    expect(
      transactionView({
        kind: 'c4',
        choice: 'keep',
        inherited: 'time_dilation',
        refund: null,
      }),
    ).toEqual({ kind: 'c4', choice: 'keep', inherited: 'Time Dilation', refund: null });
    expect(
      transactionView({
        kind: 'c4',
        choice: 'purge',
        inherited: null,
        refund: { upgrade: 'rapport_quill', currency: 'intel', amount: 2 },
      }),
    ).toEqual({
      kind: 'c4',
      choice: 'purge',
      inherited: null,
      refund: { name: 'Rapport: QUILL', currency: 'intel', amount: 2 },
    });
    expect(transactionView({ kind: 'inherit', ability: 'suppressing_fire' })).toEqual({
      kind: 'inherit',
      ability: 'Suppressing Fire',
    });
  });

  it('commits C4 through resolveC4 from any scene that sets it (Keep inherits)', () => {
    const save = withSceneEffects(withC4(), 'a3_m04_debrief', {
      ...NO_EFFECTS,
      flags: { quill_choice: 'keep' },
    });
    expect(save.story.flags.quill_choice).toBe('keep');
    expect(save.unlocks.inheritedAbilities).toEqual(['time_dilation']);
    // Asked once: a later scene can't change it.
    const again = withSceneEffects(save, 'a3_m04_debrief', {
      ...NO_EFFECTS,
      flags: { quill_choice: 'purge' },
    });
    expect(again.story.flags.quill_choice).toBe('keep');
  });

  it("plays A3M4's registered debrief and Night Shift", () => {
    expect(SCENES['a3_m04_debrief']).toBeDefined();
    expect(SCENES['a3_m04_base_night_shift']).toBeDefined();
  });
});

describe("C4's effects in a battle (core-loop.md § 6.11)", () => {
  it('puts Purge on Everglow from A3M5 on (and on a dev battle), never before', () => {
    expect(onOrAfter('a3_m04', C4_IN_PLAY.from)).toBe(false);
    expect(onOrAfter('a3_m05', C4_IN_PLAY.from)).toBe(true);
    expect(onOrAfter('a3_m06', C4_IN_PLAY.from)).toBe(true);
    expect(onOrAfter('dev_heal', C4_IN_PLAY.from)).toBe(true);
    const purge = C4_IN_PLAY.purgeArmor.modifier;
    expect(storyModifiers('a3_m05', withC4('purge'))).toEqual([purge]);
    expect(storyModifiers('a3_m04', withC4('purge'))).toEqual([]);
    for (const q of ['keep', 'rewrite', undefined] as const) {
      expect(storyModifiers('a3_m05', withC4(q))).toEqual([]);
    }
    // The battle carries it: a dev battle under Purge, and not a pre-A3M5 campaign map.
    expect(battleConfig('dev_heal', 1, withC4('purge')).modifiers).toContainEqual(purge);
    expect(battleConfig('dev_heal', 1, withC4('keep')).modifiers).not.toContainEqual(purge);
    expect(battleConfig('a1_m01', 1, withC4('purge')).modifiers).not.toContainEqual(purge);
  });

  it('takes QUILL offline on A3M5 under Rewrite only', () => {
    expect(quillOffline('a3_m05', withC4('rewrite'))).toBe(true);
    expect(quillOffline('a3_m06', withC4('rewrite'))).toBe(false);
    expect(quillOffline('a3_m05', withC4('keep'))).toBe(false);
    expect(quillOffline('a3_m05', null)).toBe(false);
    initSaves(new MemoryStore());
    expect(quillOfflineHere('a3_m05')).toBe(false); // no save in play
  });

  it("keeps out of slot 1 the map's locked abilities under the save's flags", () => {
    const a3m5 = battleConfig('a3_m05', 1, withC4('rewrite')).content.maps.a3_m05!;
    expect(abilitiesOffOn(a3m5, withC4('rewrite'))).toEqual(['system_reboot']);
    expect(abilitiesOffOn(a3m5, withC4('keep'))).toEqual([]);
    // A run atom never holds before the battle.
    const run: CompiledMapDef<IdSpace> = {
      ...a3m5,
      lockedAbilities: [{ ability: 'scanner_sweep', when: { stat: 'abilityUses', gte: 0 } }],
    };
    expect(abilitiesOffOn(run, withC4())).toEqual([]);
  });

  it("judges a lock on a gated flag as createSim does: over the map's defaults (D151)", () => {
    // A3M3's door gates its refugee groups: unset, the run plays `convoy` (gatedFlagDefaults).
    const unset = withC4('keep');
    const cfg = battleConfig('a3_m03', 1, unset);
    const lock = {
      ability: cfg.abilities.slot1!,
      when: { flag: 'door_choice', eq: 'convoy' } as const,
    };
    const a3m3: CompiledMapDef<IdSpace> = { ...cfg.content.maps.a3_m03!, lockedAbilities: [lock] };
    expect(abilitiesOffOn(a3m3, unset)).toEqual([lock.ability]);
    // The sim refuses the same pick under the same flags, so the loadout never offers it.
    const map = { ...cfg.content.maps, a3_m03: a3m3 };
    expect(() => createSim({ ...cfg, content: { ...cfg.content, maps: map } })).toThrow(/locked/);
    const warren = withC4('keep');
    warren.story.flags.door_choice = 'warren';
    expect(abilitiesOffOn(a3m3, warren)).toEqual([]);
  });
});

describe("Zibzab's crate as A3M6's briefing closes", () => {
  beforeEach(() => initSaves(new MemoryStore()));

  it('opens once on A3M6 only, installing its tune-ups into the save in play', () => {
    expect(loadDevSave('after_a2m6')).toBe(true);
    const offer = crateOffer(activeSave());
    expect(offer).not.toBeNull();
    expect(Object.keys(offer?.tuneUps ?? {}).length).toBeGreaterThan(0);
    expect(offer?.protocols).toEqual([]);
    expect(openCrateAtBriefing('a3_m05')).toBeNull();
    const made = openCrateAtBriefing('a3_m06');
    expect(made?.kind).toBe('crate');
    expect(activeSave()?.story.granted).toContain('crate');
    expect(crateOffer(activeSave())).toBeNull();
    expect(openCrateAtBriefing('a3_m06')).toBeNull();
  });

  it('waits for a protocol pick when it holds no tune-up', () => {
    expect(loadDevSave('fresh')).toBe(true);
    const offer = crateOffer(activeSave());
    expect(offer?.tuneUps).toEqual({});
    expect(offer?.protocols.length).toBeGreaterThan(0);
    expect(openCrateAtBriefing('a3_m06')).toBeNull();
    expect(activeSave()?.story.granted).not.toContain('crate');
    const pick = offer!.protocols[0]!;
    expect(openCrateAtBriefing('a3_m06', pick)).toMatchObject({ kind: 'crate', protocol: pick });
    expect(activeSave()?.unlocks.protocols).toContain(pick);
  });

  it('restarts a battle whose modifiers the briefing changed', () => {
    const before = createNewSave();
    before.unlocks.towers.push('zapcoil');
    const cfg = battleConfig('a1_m01', 1, before);
    expect(briefingChangedBattle(cfg, before)).toBe(false);
    const after = { ...before, upgrades: { ...before.upgrades, tune_zapcoil: 3 } };
    expect(briefingChangedBattle(cfg, after)).toBe(true);
    expect(briefingChangedBattle(cfg, null)).toBe(false);
  });
});

/** A save into A3M4 (`after_a3m3_<door>`), its bank set. */
function intoA3M4(door: 'convoy' | 'warren', stardust: number): SaveData {
  initSaves(new MemoryStore());
  loadDevSave(`after_a3m3_${door}`);
  const save = activeSave()!;
  return { ...save, currencies: { ...save.currencies, stardust } };
}

describe('the jailbreak on the shop shelf (D146)', () => {
  it('is listed once A3M3 is won with a class revoked, priced by the door', () => {
    for (const [door, price] of [
      ['convoy', 0],
      ['warren', 300],
    ] as const) {
      const save = intoA3M4(door, 400);
      if (!save.campaign.maps.a3_m03?.completed) continue; // A3M3 not registered
      const row = shelf(save, 'shop').find((o) => o.item.kind === 'jailbreak');
      expect(row, door).toMatchObject({ price, refusal: null, owned: 0 });
      const r = buy(save, { kind: 'jailbreak' });
      expect(r.ok, door).toBe(true);
      if (!r.ok) continue;
      expect(r.save.unlocks.jailbroken).toEqual(['rivet']);
      expect(r.save.unlocks.revokedTowers).toEqual([]);
      expect(r.save.currencies.stardust).toBe(400 - price);
      // Taken: still listed, owned.
      expect(shelf(r.save, 'shop').find((o) => o.item.kind === 'jailbreak')).toMatchObject({
        owned: 1,
        refusal: 'maxed',
      });
    }
    // Short under the warren.
    const poor = intoA3M4('warren', 100);
    if (poor.campaign.maps.a3_m03?.completed === true) {
      expect(buy(poor, { kind: 'jailbreak' })).toMatchObject({ ok: false, reason: 'short' });
    }
  });

  it('is never listed before A3M3, or with nothing revoked', () => {
    expect(shelf(createNewSave(), 'shop', ['shop']).some((o) => o.item.kind === 'jailbreak')).toBe(
      false,
    );
  });
});
