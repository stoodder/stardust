import { describe, expect, it } from 'vitest';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import {
  abilityAnswers,
  fitPick,
  hasLoadoutChoice,
  initialPick,
  linksAmong,
  loadoutPools,
  mapCounters,
  pickProblems,
  resolveLoadout,
  showsLoadoutScreen,
  toggleTower,
  towerAnswers,
  uncoveredCounters,
  withPreset,
  type LoadoutMap,
  type LoadoutPick,
  type LoadoutPools,
} from './loadout.ts';
import { createNewSave, type SaveData } from './saveData.ts';
import { validateSave } from './validate.ts';

/** Five tower types and one ability: more than fit (towers the registries don't hold yet). */
const FIVE: LoadoutPools<string, string> = {
  towers: ['rivet', 'thumper', 'sprinkler', 'skyhook', 'zapcoil'],
  abilities: ['orbital_strike'],
};
const FOUR: LoadoutPools<string, string> = { towers: FIVE.towers.slice(0, 4), abilities: ['a'] };

/** A save with A1M3 won (the loadout system's gate) on top of `save`. */
function loadoutOpen(save: SaveData): SaveData {
  // a1_m03 isn't registered yet, so the record goes in under the gate's plain id.
  const maps: Record<string, unknown> = { ...save.campaign.maps };
  maps['a1_m03'] = { completed: true, medals: [], bestMeter: 20 };
  return { ...save, campaign: { maps } };
}

/** An Act I map: Fast and Armored threats, Armor required, Bricks in slot 2. */
const ARMOR_MAP: LoadoutMap = {
  act: 1,
  threatIntel: ['fast', 'armored'],
  requiredCounters: ['armor'],
  enemies: [
    { traits: ['fast'], body: 'organic', layer: 'ground' },
    { traits: ['armored'], body: 'organic', layer: 'ground' },
  ],
  slot2: 'suppressing_fire',
};

describe('the skip rule', () => {
  it('is a choice with more than four tower types or more than one ability', () => {
    expect(hasLoadoutChoice(FIVE)).toBe(true);
    expect(hasLoadoutChoice({ towers: FIVE.towers.slice(0, 4), abilities: ['a'] })).toBe(false);
    expect(hasLoadoutChoice({ towers: ['rivet'], abilities: ['a', 'b'] })).toBe(true);
    expect(hasLoadoutChoice({ towers: ['rivet'], abilities: [] })).toBe(false);
  });

  it('counts only unrevoked towers and abilities', () => {
    const save = createNewSave();
    save.unlocks.towers.push('sprinkler');
    save.unlocks.abilities.push('suppressing_fire');
    expect(hasLoadoutChoice(loadoutPools(save))).toBe(true);
    save.unlocks.revokedAbilities = ['suppressing_fire'];
    expect(loadoutPools(save)).toEqual({
      towers: ['rivet', 'thumper', 'sprinkler'],
      abilities: ['orbital_strike'],
    });
    expect(hasLoadoutChoice(loadoutPools(save))).toBe(false);
  });

  it('is skipped until the loadout system opens (A1M3 won), even with a choice', () => {
    const save = createNewSave();
    save.unlocks.abilities.push('suppressing_fire');
    expect(showsLoadoutScreen(save)).toBe(false);
    expect(showsLoadoutScreen(loadoutOpen(save))).toBe(true);
    expect(showsLoadoutScreen(save, ['loadout'])).toBe(true);
  });

  it('is skipped with the system open but no choice: A1M1 and A1M2 saves never see it', () => {
    expect(showsLoadoutScreen(loadoutOpen(createNewSave()))).toBe(false);
    expect(showsLoadoutScreen(DEV_SAVES.mid_m2.build())).toBe(false);
  });

  it('shows for the all_unlocked dev save (two abilities owned, every system open)', () => {
    const dev = DEV_SAVES.all_unlocked;
    expect(showsLoadoutScreen(dev.build(), dev.devUnlocks)).toBe(true);
  });
});

describe('picks', () => {
  it('holds one to four distinct pool towers and a pool ability', () => {
    expect(pickProblems({ towers: ['rivet'], ability: 'orbital_strike' }, FIVE)).toEqual([]);
    expect(pickProblems({ towers: FIVE.towers, ability: 'orbital_strike' }, FIVE)).toEqual([
      'at most 4 towers, got 5',
    ]);
    expect(pickProblems({ towers: [], ability: 'orbital_strike' }, FIVE)).toEqual([
      'pick at least one tower',
    ]);
    expect(pickProblems({ towers: ['rivet', 'rivet'], ability: null }, FIVE)).toEqual([
      "'rivet' is picked twice",
      'pick a Technician ability',
    ]);
    expect(pickProblems({ towers: ['prism'], ability: 'stillness' }, FIVE)).toEqual([
      "'prism' is not in the tower pool",
      "'stillness' is not in the ability pool",
    ]);
    // No ability owned: slot 1 stays empty.
    expect(pickProblems({ towers: ['rivet'], ability: null }, { ...FIVE, abilities: [] })).toEqual(
      [],
    );
  });

  it('toggles towers in build-slot order and stops at four', () => {
    let pick: LoadoutPick<string, string> = { towers: [], ability: 'orbital_strike' };
    for (const t of ['zapcoil', 'rivet', 'thumper', 'skyhook']) pick = toggleTower(pick, t, FIVE);
    expect(pick.towers).toEqual(['zapcoil', 'rivet', 'thumper', 'skyhook']);
    // Full: a fifth is refused.
    expect(toggleTower(pick, 'sprinkler', FIVE)).toBe(pick);
    // Dropping one moves the rest up; then there's room again.
    const dropped = toggleTower(pick, 'rivet', FIVE);
    expect(dropped.towers).toEqual(['zapcoil', 'thumper', 'skyhook']);
    expect(toggleTower(dropped, 'sprinkler', FIVE).towers).toEqual([
      'zapcoil',
      'thumper',
      'skyhook',
      'sprinkler',
    ]);
    // Not in the pool: unchanged.
    expect(toggleTower(dropped, 'prism', FIVE)).toBe(dropped);
  });

  it('fits a stale pick to the pools', () => {
    expect(
      fitPick({ towers: ['prism', 'rivet', 'rivet', 'thumper'], ability: 'stillness' }, FOUR),
    ).toEqual({ towers: ['rivet', 'thumper'], ability: 'a' });
    expect(fitPick({ towers: FIVE.towers, ability: null }, FIVE).towers).toHaveLength(4);
  });
});

/** An open loadout system with Sprinkler and Suppressing Fire owned: a choice to make. */
function twoAbilities(): SaveData {
  const save = loadoutOpen(createNewSave());
  save.unlocks.towers.push('sprinkler');
  save.unlocks.abilities.push('suppressing_fire');
  return save;
}

describe('presets', () => {
  const fallback = {
    towers: ['rivet', 'thumper', 'sprinkler'] as const,
    ability: 'orbital_strike' as const,
  };

  it('remembers a pick per map and as the last one, and the result validates', () => {
    const save = withPreset(twoAbilities(), 'a1_m01', {
      towers: ['sprinkler', 'rivet'],
      ability: 'suppressing_fire',
    });
    const preset = { towers: ['sprinkler', 'rivet'], ability: 'suppressing_fire' };
    expect(save.loadouts).toEqual({ last: preset, byMap: { a1_m01: preset } });
    expect(save.loadouts.last).not.toBe(save.loadouts.byMap.a1_m01);
    // (Minus the test's unregistered A1M3 record.)
    expect(validateSave({ ...save, campaign: { maps: {} } }).ok).toBe(true);
  });

  it('refuses an invalid pick', () => {
    expect(() =>
      withPreset(twoAbilities(), 'a1_m01', { towers: [], ability: 'orbital_strike' }),
    ).toThrow(RangeError);
  });

  it('starts the screen from the map preset, else the last one, else the fallback', () => {
    const save = twoAbilities();
    expect(initialPick(save, 'a1_m01', fallback)).toEqual(fallback);
    const last = { towers: ['thumper' as const], ability: 'suppressing_fire' as const };
    save.loadouts.last = { ...last, towers: [...last.towers] };
    expect(initialPick(save, 'a1_m01', fallback)).toEqual(last);
    save.loadouts.byMap.a1_m01 = { towers: ['rivet'], ability: 'orbital_strike' };
    expect(initialPick(save, 'a1_m01', fallback)).toEqual({
      towers: ['rivet'],
      ability: 'orbital_strike',
    });
    // A preset whose towers were all revoked falls through.
    save.unlocks.revokedTowers = ['rivet'];
    expect(initialPick(save, 'a1_m01', fallback)).toEqual(last);
  });

  it('the battle uses the map preset only while there is a choice and it still fits', () => {
    const save = twoAbilities();
    expect(resolveLoadout(save, 'a1_m01', fallback)).toBe(fallback);
    const chosen = withPreset(save, 'a1_m01', { towers: ['thumper'], ability: 'suppressing_fire' });
    expect(resolveLoadout(chosen, 'a1_m01', fallback)).toEqual({
      towers: ['thumper'],
      ability: 'suppressing_fire',
    });
    // Suppressing Fire revoked: no choice left, so the skip rule's everything-owned wins.
    chosen.unlocks.revokedAbilities = ['suppressing_fire'];
    expect(resolveLoadout(chosen, 'a1_m01', fallback)).toBe(fallback);
  });
});

describe('counters and links', () => {
  it("lists the map's counters from its threat intel and required counters", () => {
    expect(mapCounters(ARMOR_MAP)).toEqual(['armor']);
    expect(
      mapCounters({ ...ARMOR_MAP, threatIntel: ['flying', 'huddle'], requiredCounters: ['armor'] }),
    ).toEqual(['armor', 'air', 'splash']);
  });

  it('notes how each tower answers: Thumper from T1 in Act I, Rivet from T3, specs only owned', () => {
    expect(towerAnswers('thumper', false, ARMOR_MAP)).toEqual([
      { counter: 'armor', minTier: 1, spec: null },
    ]);
    expect(towerAnswers('rivet', false, ARMOR_MAP)).toEqual([
      { counter: 'armor', minTier: 3, spec: null },
    ]);
    expect(towerAnswers('sprinkler', true, ARMOR_MAP)).toEqual([]);
    // Act III: Thumper's light-armor answer is gone; Bunker Buster needs the Engineering unlock.
    const act3 = { ...ARMOR_MAP, act: 3 as const };
    expect(towerAnswers('thumper', false, act3)).toEqual([]);
    expect(towerAnswers('thumper', true, act3, () => 'Bunker Buster')).toEqual([
      { counter: 'armor', minTier: 4, spec: 'Bunker Buster' },
    ]);
  });

  it('warns about required counters the pick leaves unanswered', () => {
    const save = createNewSave();
    save.unlocks.towers.push('sprinkler');
    expect(uncoveredCounters({ towers: ['sprinkler'], ability: null }, save, ARMOR_MAP)).toEqual([
      'armor',
    ]);
    expect(uncoveredCounters({ towers: ['rivet'], ability: null }, save, ARMOR_MAP)).toEqual([]);
    const act3 = { ...ARMOR_MAP, act: 3 as const };
    expect(uncoveredCounters({ towers: ['thumper'], ability: null }, save, act3)).toEqual([
      'armor',
    ]);
    save.unlocks.specs = ['thumper'];
    expect(uncoveredCounters({ towers: ['thumper'], ability: null }, save, act3)).toEqual([]);
  });

  it('counts answering abilities, the companion included', () => {
    const jam: LoadoutMap = {
      ...ARMOR_MAP,
      threatIntel: ['jammer'],
      requiredCounters: ['jam'],
      slot2: null,
    };
    expect(abilityAnswers('stillness', jam)).toEqual(['jam']);
    expect(abilityAnswers('orbital_strike', jam)).toEqual([]);
    const save = createNewSave();
    expect(uncoveredCounters({ towers: ['rivet'], ability: null }, save, jam)).toEqual(['jam']);
    expect(
      uncoveredCounters({ towers: ['rivet'], ability: null }, save, { ...jam, slot2: 'stillness' }),
    ).toEqual([]);
  });

  it('finds the links a set of towers can form', () => {
    const links = [
      { id: 'crossfire', partners: [{ tower: 'rivet' }, { tower: 'thumper' }] as const },
      { id: 'sitting_ducks', partners: [{ tower: 'thumper' }, { tower: 'sprinkler' }] as const },
    ];
    expect(linksAmong(['rivet', 'thumper'], links).map((l) => l.id)).toEqual(['crossfire']);
    expect(linksAmong(['thumper', 'sprinkler', 'rivet'], links).map((l) => l.id)).toEqual([
      'crossfire',
      'sitting_ducks',
    ]);
    expect(linksAmong(['rivet', 'sprinkler'], links)).toEqual([]);
  });
});
