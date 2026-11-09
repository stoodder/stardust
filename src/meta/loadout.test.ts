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
  equippedProtocols,
  fitProtocols,
  hasProtocolChoice,
  protocolProblems,
  toggleProtocol,
  withPreset,
  withProtocols,
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
  return { ...save, campaign: { ...save.campaign, maps } };
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
      protocols: [],
      protocolSlots: 0,
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
    expect(save.loadouts).toEqual({
      last: preset,
      byMap: { a1_m01: preset },
      protocols: [],
      protocolPicks: {},
    });
    expect(save.loadouts.last).not.toBe(save.loadouts.byMap.a1_m01);
    // (Minus the test's unregistered A1M3 record.)
    expect(validateSave({ ...save, campaign: { ...save.campaign, maps: {} } }).ok).toBe(true);
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

/** after_a1m3 (the shop open, one protocol slot) owning Head Start and Specialist. */
function protocolsOwned(): SaveData {
  const save = DEV_SAVES.after_a1m3.build();
  save.unlocks.protocols = ['head_start', 'specialist'];
  return save;
}

describe('Field Protocols (T308; progression.md § 5)', () => {
  it('a slot and an owned protocol make a choice: the skip rule shows the screen', () => {
    expect(hasProtocolChoice({ towers: [], abilities: [], protocols: ['x'], protocolSlots: 1 })).toBe(
      true,
    );
    expect(hasProtocolChoice({ towers: [], abilities: [], protocols: [], protocolSlots: 1 })).toBe(
      false,
    );
    // Owned before the shop opens (no slot yet): no choice.
    expect(hasProtocolChoice({ towers: [], abilities: [], protocols: ['x'], protocolSlots: 0 })).toBe(
      false,
    );
    const save = loadoutOpen(createNewSave());
    expect(showsLoadoutScreen(save)).toBe(false);
    save.unlocks.protocols = ['head_start'];
    expect(showsLoadoutScreen(save)).toBe(true);
  });

  it('equips owned protocols, each once, up to the slots, with a pick for Specialist', () => {
    const save = protocolsOwned();
    expect(loadoutPools(save).protocolSlots).toBe(1);
    expect(protocolProblems(save, { equipped: ['head_start'], picks: {} })).toEqual([]);
    expect(protocolProblems(save, { equipped: ['head_start', 'specialist'], picks: {} })).toEqual([
      '2 protocols equipped, but only 1 slots',
      "protocol 'specialist' needs a tower pick",
    ]);
    expect(protocolProblems(save, { equipped: ['linked_up'], picks: { specialist: 'rivet' } })).toEqual(
      ["protocol 'linked_up' is not owned", "a pick for protocol 'specialist', which isn't equipped"],
    );
    expect(protocolProblems(save, { equipped: ['specialist'], picks: { specialist: 'rivet' } })).toEqual(
      [],
    );
  });

  it('withProtocols equips save-wide, and the result validates', () => {
    const save = withProtocols(protocolsOwned(), {
      equipped: ['specialist'],
      picks: { specialist: 'thumper' },
    });
    expect(save.loadouts.protocols).toEqual(['specialist']);
    expect(save.loadouts.protocolPicks).toEqual({ specialist: 'thumper' });
    const v = validateSave(save);
    expect(v.ok ? [] : v.errors).toEqual([]);
    expect(() =>
      withProtocols(protocolsOwned(), { equipped: ['head_start', 'specialist'], picks: {} }),
    ).toThrow(RangeError);
  });

  it("withPreset equips the pick's protocols too, and leaves them alone without any", () => {
    const save = protocolsOwned();
    const pick = { towers: ['rivet' as const], ability: 'orbital_strike' as const };
    const equipped = withPreset(save, 'a1_m01', {
      ...pick,
      protocols: { equipped: ['head_start'], picks: {} },
    });
    expect(equipped.loadouts.protocols).toEqual(['head_start']);
    expect(withPreset(equipped, 'a1_m02', pick).loadouts.protocols).toEqual(['head_start']);
  });

  it('fits a stale equipped list: unowned, repeated, and over-slot protocols drop', () => {
    const save = protocolsOwned();
    expect(
      fitProtocols(save, { equipped: ['linked_up', 'head_start', 'head_start'], picks: {} }),
    ).toEqual({ equipped: ['head_start'], picks: {} });
    // Specialist with a revoked or missing pick takes the fallback tower.
    save.unlocks.revokedTowers = ['rivet'];
    expect(
      fitProtocols(save, { equipped: ['specialist'], picks: { specialist: 'rivet' } }, [], 'skyhook'),
    ).toEqual({ equipped: ['specialist'], picks: { specialist: 'skyhook' } });
    // Before the shop opens there are no slots, so nothing is equipped.
    const early = DEV_SAVES.mid_m2.build();
    early.unlocks.protocols = ['head_start'];
    early.loadouts.protocols = ['head_start'];
    expect(equippedProtocols(early)).toEqual({ equipped: [], picks: {} });
  });

  it('toggles: off, on while a slot is free, and a swap with a single full slot', () => {
    expect(toggleProtocol(['a'], 'a', 1)).toEqual([]);
    expect(toggleProtocol([], 'a', 1)).toEqual(['a']);
    expect(toggleProtocol(['a'], 'b', 1)).toEqual(['b']);
    expect(toggleProtocol(['a'], 'b', 2)).toEqual(['a', 'b']);
    const full = ['a', 'b'];
    expect(toggleProtocol(full, 'c', 2)).toBe(full);
  });
});
