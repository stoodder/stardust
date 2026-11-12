// The loadout screen on the post-game's maps and under a run's rules (T803d): a challenge map and
// Endless offer the screen and keep a preset per map (a save holding one still loads); Skitterkin
// Only greys every other faction's tower with why and starts from the warrens' towers (T862);
// Short-Handed caps the pick at 3 and says so (T860); Radio Silence and No Protocols say what they
// switch off. A challenge's run end is meta/challengeRunEnd.test.ts's; here, that recordRun files it.
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore, validateSave, withVeteranPick } from '../meta/index.ts';
import { loadout } from '../ui/screens/loadoutView.ts';
import { battleConfig } from './battleSetup.ts';
import { closeLoadout, openLoadout, savePick, togglePickTower } from './loadout.ts';
import {
  activeSave,
  initSaves,
  loadDevSave,
  loadoutOffered,
  recordRun,
  updateActiveSave,
} from './save.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1);
  closeLoadout();
});

/** The faction of each tower in the live content. */
const FACTION: Readonly<Record<string, string>> = Object.fromEntries(
  Object.values(battleConfig('a1_m01', 1).content.towers).map((t) => [t.id, t.faction]),
);

describe('the post-game maps offer the loadout (T803d)', () => {
  it('Skitterkin Only: the other towers stay home, greyed with why; the pick starts warren-only', () => {
    expect(loadDevSave('after_fin_stay')).toBe(true);
    expect(loadoutOffered('ch_m01')).toBe(true);
    expect(openLoadout('ch_m01')).toBe(true);
    const view = loadout.value!; // opened above
    expect(view.mapName).toBe('Skitterkin Only');
    const home = view.towers.filter((t) => t.stays !== undefined);
    const deploy = view.towers.filter((t) => t.stays === undefined);
    expect(deploy.length).toBeGreaterThan(0);
    for (const t of deploy) expect(FACTION[t.id]).toBe('skitterkin');
    for (const t of home) {
      expect(FACTION[t.id]).not.toBe('skitterkin');
      expect(t.stays).toBe('Skitterkin Only');
    }
    expect(home.length).toBeGreaterThan(0);
    // The towers that deploy lead the grid; those that stay home follow.
    expect(view.towers.slice(0, deploy.length)).toEqual(deploy);
    expect(view.initial.towers.length).toBeGreaterThan(0);
    for (const t of view.initial.towers) expect(FACTION[t]).toBe('skitterkin');
    // A stay-home tower never joins the pick.
    const pick = { ...view.initial, towers: view.initial.towers.slice(0, 1) };
    expect(togglePickTower(pick, home[0]!.id)).toBe(pick);
  });

  it('a challenge keeps its preset per map, and the save still validates', () => {
    loadDevSave('after_fin_stay');
    openLoadout('ch_m01');
    const view = loadout.value!;
    const towers = view.initial.towers.slice(0, 2);
    expect(savePick({ ...view.initial, towers }).ok).toBe(true);
    const save = activeSave()!;
    expect(save.loadouts.byMap.ch_m01?.towers).toEqual(towers);
    expect(validateSave(JSON.parse(JSON.stringify(save))).ok).toBe(true);
  });

  it('Endless gets a loadout screen, and its preset is kept', () => {
    loadDevSave('after_fin_stay');
    expect(loadoutOffered('end_m01')).toBe(true);
    expect(openLoadout('end_m01')).toBe(true);
    const view = loadout.value!;
    expect(view.max).toBe(4);
    expect(view.towers.every((t) => t.stays === undefined)).toBe(true);
    expect(savePick(view.initial).ok).toBe(true);
    const save = activeSave()!;
    expect(save.loadouts.byMap.end_m01?.towers).toEqual(view.initial.towers);
    expect(validateSave(JSON.parse(JSON.stringify(save))).ok).toBe(true);
  });

  it('Glass Core (Radio Silence) says slot 1 stays dark', () => {
    loadDevSave('after_fin_stay');
    openLoadout('ch_m03');
    expect(loadout.value?.rules?.noAbilities).toBe('Glass Core: slot 1 stays dark this shift');
  });

  it('a dev map is still never offered', () => {
    loadDevSave('after_fin_stay');
    expect(loadoutOffered('dev_range')).toBe(false);
    expect(openLoadout('dev_range')).toBe(false);
  });
});

describe("a replay's veteran rules on the loadout (T860)", () => {
  it('Short-Handed caps the pick at 3 and names itself; No Protocols says so', () => {
    loadDevSave('all_unlocked');
    updateActiveSave((s) => withVeteranPick(s, 'a1_m01', ['short_handed', 'no_protocols']));
    openLoadout('a1_m01');
    const view = loadout.value!;
    expect(view.max).toBe(3);
    expect(view.rules).toEqual({
      cap: 'Short-Handed',
      noAbilities: null,
      noProtocols: 'No Protocols: none apply this shift',
    });
    expect(view.initial.towers.length).toBeLessThanOrEqual(3);
    const three = { ...view.initial, towers: view.towers.slice(0, 3).map((t) => t.id) };
    expect(togglePickTower(three, view.towers[3]!.id)).toBe(three);
    // Dropping one makes room again.
    const two = togglePickTower(three, three.towers[0]!);
    expect(togglePickTower(two, view.towers[3]!.id).towers).toHaveLength(3);
  });

  it('without modifiers the limit is 4 and no rule shows', () => {
    loadDevSave('all_unlocked');
    openLoadout('a1_m01');
    expect(loadout.value).toMatchObject({ max: 4 });
    expect(loadout.value?.rules).toBeUndefined();
  });
});

describe('recordRun files a challenge (T803d)', () => {
  it('a win stores its medals and pays Intel once; Endless and dev maps file nothing here', () => {
    loadDevSave('after_fin_stay');
    const before = activeSave()!;
    const input = {
      mapId: 'ch_m01',
      outcome: 'won' as const,
      mapStardust: 0,
      waveCount: 10,
      wavesResolved: 10,
      earnedMedals: ['victory', 'perfect_core'],
      skitterkinKilled: 0,
      meter: 20,
    };
    const first = recordRun(input)!;
    expect(first.intel).toBe(2);
    expect(first.stardust.amount).toBe(0);
    const after = activeSave()!;
    expect(after.campaign.maps.ch_m01).toEqual({
      completed: true,
      medals: ['victory', 'perfect_core'],
      bestMeter: 20,
    });
    expect(after.currencies).toEqual({
      stardust: before.currencies.stardust,
      intel: before.currencies.intel + 2,
    });
    expect(after.story).toEqual(before.story);
    expect(after.stats).toEqual(before.stats);
    expect(validateSave(JSON.parse(JSON.stringify(after))).ok).toBe(true);
    // A replay pays nothing new.
    expect(recordRun(input)?.intel).toBe(0);
    expect(activeSave()!.currencies.intel).toBe(before.currencies.intel + 2);
    expect(recordRun({ ...input, mapId: 'end_m01' })).toBeNull();
    expect(recordRun({ ...input, mapId: 'dev_range' })).toBeNull();
  });
});
