import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../meta/index.ts';
import { loadout } from '../ui/screens/loadoutView.ts';
import { battleConfig } from './battleSetup.ts';
import {
  closeLoadout,
  formedLinks,
  loadoutMapId,
  openLoadout,
  pickWarnings,
  savePick,
  togglePickTower,
} from './loadout.ts';
import { activeSave, initSaves, loadDevSave, loadoutOffered, newGame } from './save.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1);
  closeLoadout();
});

describe('the loadout screen (app side)', () => {
  it('is offered only with the system open and a choice to make, on campaign maps', () => {
    expect(loadoutOffered('a1_m01')).toBe(false); // no save
    newGame(1);
    expect(loadoutOffered('a1_m01')).toBe(false); // locked, and no choice
    loadDevSave('all_unlocked');
    expect(loadoutOffered('a1_m01')).toBe(true);
    expect(loadoutOffered('dev_range')).toBe(false);
  });

  it("builds A1M2's view: towers with costs and counters, abilities, links, slot 2", () => {
    expect(openLoadout('a1_m02')).toBe(false); // no save
    loadDevSave('all_unlocked');
    expect(openLoadout('dev_range')).toBe(false);
    expect(openLoadout('a1_m02')).toBe(true);
    const view = loadout.value!; // opened above
    expect(loadoutMapId()).toBe('a1_m02');
    expect(view).toMatchObject({ mapName: 'Hatching Season', shift: 2, max: 4 });
    // The briefing's strip exactly (D059): the Hauler's Carrier tell too.
    expect(view.threats).toEqual(['Fast', 'Armored', 'Carrier']);
    expect(view.counters).toEqual([{ id: 'armor', label: 'Armor', required: true }]);
    expect(view.towers.map((t) => [t.id, t.answers.map((a) => a.via ?? 'T1')])).toEqual([
      ['rivet', ['T3']],
      ['thumper', ['T1']],
      ['sprinkler', []],
    ]);
    // Costs after the save's tune-ups (the sim charges the same: costFor).
    const cfg = battleConfig('a1_m02', 0, activeSave());
    expect(view.towers[0]?.cost).toBeLessThan(cfg.content.towers['rivet']!.tiers[0].cost);
    expect(view.abilities.map((a) => a.name)).toEqual(['Orbital Strike', 'Suppressing Fire']);
    expect(view.links.map((l) => l.name)).toEqual(['Crossfire', 'Sitting Ducks']);
    expect(view.links[1]?.bonus).toBe('Thumper +20% damage vs Chilled · Sprinkler +0.3 range');
    expect(view.initial).toEqual({
      towers: ['rivet', 'thumper', 'sprinkler'],
      ability: 'orbital_strike',
    });
  });

  it('toggles, forms links, warns kindly, and saves the pick as the preset', () => {
    loadDevSave('all_unlocked');
    openLoadout('a1_m02');
    let pick = loadout.value!.initial; // opened above
    expect(formedLinks(pick)).toEqual(['crossfire', 'sitting_ducks']);
    expect(pickWarnings(pick)).toEqual([]);
    pick = togglePickTower(togglePickTower(pick, 'rivet'), 'thumper');
    expect(pick.towers).toEqual(['sprinkler']);
    expect(formedLinks(pick)).toEqual([]);
    expect(pickWarnings(pick)).toEqual([
      'Heads up: this shift needs an answer to Armor, and nothing here has one. Rivet (T3) or ' +
        'Thumper would.',
    ]);
    expect(savePick({ ...pick, ability: 'suppressing_fire' })).toEqual({ ok: true });
    const preset = { towers: ['sprinkler'], ability: 'suppressing_fire' };
    expect(activeSave()?.loadouts).toEqual({ last: preset, byMap: { a1_m02: preset } });
    // The battle plays it.
    const cfg = battleConfig('a1_m02', 0, activeSave());
    expect(cfg.loadout).toEqual(['sprinkler']);
    expect(cfg.abilities.slot1).toBe('suppressing_fire');
    // The screen opens on it next time.
    openLoadout('a1_m02');
    expect(loadout.value?.initial).toEqual(preset);
  });
});
