// T809: the loadout's companion pick and the Technician slot beside it (core-loop.md § 3.1; T501;
// content/technician.ts). The finale isn't registered with its pick list yet, so A3M6 stands in
// with the finale's list (`companion: { pick }`, the registry mocked): who may walk with you (QUILL
// gone under C4 Purge, Ves'thara first), the slot-1 card greyed with why beside the companion who
// brings it, the pick moving slot 1 off a clash, and the lock-in reaching the save and the battle.
// A map with one present companion greys its ability too (A1M5: Bricks's Suppressing Fire).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../meta/index.ts';
import { loadout } from '../ui/screens/loadoutView.ts';
import { battleConfig } from './battleSetup.ts';
import {
  abilityGreyed,
  openLoadout,
  pickAbility,
  pickCompanion,
  savePick,
} from './loadout.ts';
import { activeSave, initSaves, loadDevSave, updateActiveSave } from './save.ts';

vi.mock('../content/registry.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../content/registry.ts')>();
  const a3m6 = real.RAW_CONTENT.maps.a3_m06!; // registered
  return {
    ...real,
    RAW_CONTENT: {
      ...real.RAW_CONTENT,
      maps: {
        ...real.RAW_CONTENT.maps,
        a3_m06: { ...a3m6, companion: { pick: ['vesthara', 'bramble', 'zibzab', 'quill'] } },
      },
    },
  };
});

const MAP = 'a3_m06';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  loadDevSave('all_unlocked');
});

const withChoice = (choice: 'keep' | 'purge'): void => {
  updateActiveSave((s) => ({
    ...s,
    story: { ...s.story, flags: { ...s.story.flags, quill_choice: choice } },
  }));
};

describe('the companion pick on the loadout screen', () => {
  it("lists who may walk with you, Ves'thara first; QUILL gone under Purge", () => {
    withChoice('keep');
    expect(openLoadout(MAP)).toBe(true);
    const view = loadout.value!;
    expect(view.companions?.map((k) => k.id)).toEqual(['vesthara', 'bramble', 'zibzab', 'quill']);
    expect(view.companions?.map((k) => k.name)).toEqual(["Ves'thara", 'Bramble', 'Zibzab', 'QUILL']);
    expect(view.companions?.map((k) => k.ability)).toEqual([
      'Stillness',
      'Underfoot',
      'Clearance Sale',
      'Time Dilation',
    ]);
    expect(view.initial.companion).toBe('vesthara');

    withChoice('purge');
    expect(openLoadout(MAP)).toBe(true);
    expect(loadout.value?.companions?.map((k) => k.id)).toEqual(['vesthara', 'bramble', 'zibzab']);
  });

  it('greys the Technician card the companion brings, with why, and moves slot 1 off it', () => {
    withChoice('keep');
    openLoadout(MAP);
    const view = loadout.value!;
    const td = view.abilities.find((a) => a.id === 'time_dilation');
    expect(td?.brings).toEqual({ companion: 'quill', reason: 'QUILL brings it' });
    expect(view.abilities.find((a) => a.id === 'stillness')?.brings).toEqual({
      companion: 'vesthara',
      reason: "Ves'thara brings it",
    });
    // Beside Ves'thara, Time Dilation is the Technician's to take; Stillness isn't.
    let pick = pickAbility(view.initial, 'time_dilation');
    expect(pick.ability).toBe('time_dilation');
    expect(abilityGreyed(pick, 'time_dilation')).toBe(false);
    expect(abilityGreyed(pick, 'stillness')).toBe(true);
    expect(pickAbility(pick, 'stillness')).toBe(pick);
    // QUILL walks: her own Time Dilation leaves slot 1 for the first ability that doesn't clash.
    pick = pickCompanion(pick, 'quill');
    expect(pick.companion).toBe('quill');
    expect(pick.ability).not.toBe('time_dilation');
    expect(pick.ability).not.toBeNull();
    expect(abilityGreyed(pick, 'time_dilation')).toBe(true);
    expect(pickAbility(pick, 'time_dilation')).toBe(pick);
    // A companion the list doesn't offer changes nothing.
    expect(pickCompanion(pick, 'bricks')).toBe(pick);

    // Locked in: the map's preset keeps who walks; the battle brings them in slot 2.
    expect(savePick(pick)).toEqual({ ok: true });
    expect(activeSave()?.loadouts.byMap[MAP]?.companion).toBe('quill');
    const cfg = battleConfig(MAP, 1, activeSave());
    expect(cfg.companion).toBe('quill');
    expect(cfg.abilities.slot2).toBe('time_dilation');
    expect(cfg.abilities.slot1).toBe(pick.ability);
    // The screen opens on it next time.
    openLoadout(MAP);
    expect(loadout.value?.initial.companion).toBe('quill');
  });

  it('a preset QUILL falls back to the default once Purged', () => {
    withChoice('keep');
    openLoadout(MAP);
    expect(savePick(pickCompanion(loadout.value!.initial, 'quill'))).toEqual({ ok: true });
    withChoice('purge');
    expect(battleConfig(MAP, 1, activeSave()).companion).toBe('vesthara');
    openLoadout(MAP);
    expect(loadout.value?.initial.companion).toBe('vesthara');
  });
});

describe("a map's one companion greys what they bring (A1M5's Bricks)", () => {
  it('Suppressing Fire reads "Bricks brings it" and is never the pick', () => {
    expect(openLoadout('a1_m05')).toBe(true);
    const view = loadout.value!;
    expect(view.companions).toBeUndefined();
    expect(view.abilities.find((a) => a.id === 'suppressing_fire')?.brings).toEqual({
      companion: 'bricks',
      reason: 'Bricks brings it',
    });
    expect(view.initial.ability).not.toBe('suppressing_fire');
    expect(abilityGreyed(view.initial, 'suppressing_fire')).toBe(true);
    expect(pickAbility(view.initial, 'suppressing_fire')).toBe(view.initial);
    expect(battleConfig('a1_m05', 1, activeSave()).abilities.slot1).not.toBe('suppressing_fire');
  });
});
