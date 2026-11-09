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
  setProtocolTower,
  togglePickProtocol,
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
      // all_unlocked owns every tower's specs, Skyhook's M4 Seeker Swarm too (T304a report).
      ['skyhook', ['Seeker Swarm']],
      ['zapcoil', []], // plays since T304b; A1M2 asks only for Armor
      ['lookout', []], // plays since T406
    ]);
    // Costs after the save's tune-ups (the sim charges the same: costFor).
    const cfg = battleConfig('a1_m02', 0, activeSave());
    expect(view.towers[0]?.cost).toBeLessThan(cfg.content.towers['rivet']!.tiers[0].cost);
    expect(view.abilities.map((a) => a.name)).toEqual([
      'Orbital Strike',
      'Suppressing Fire',
      'Time Dilation', // plays since T304d
      'Clearance Sale',
      'Scanner Sweep', // plays since T406
    ]);
    expect(view.links.map((l) => l.name)).toEqual([
      'Crossfire',
      'Sitting Ducks',
      'Conductive',
      'Overwatch', // the Lookout's (T406)
      'Skywatch',
    ]);
    expect(view.links[3]?.bonus).toContain('Lookout Shack +0.5 detection radius');
    expect(view.links[1]?.bonus).toBe('Thumper +20% damage vs Chilled · Sprinkler +0.3 range');
    expect(view.links[2]?.bonus).toBe('Sprinkler Soaks for 3 s · Zapcoil +2 chain jumps');
    expect(view.initial).toEqual({
      towers: ['rivet', 'thumper', 'sprinkler', 'skyhook'],
      ability: 'orbital_strike',
      protocols: [],
      protocolPicks: {},
    });
    // Every protocol owned, one slot plus R&D's two (T308).
    expect(view.protocolSlots).toBe(3);
    expect(view.protocols).toHaveLength(10);
    expect(view.protocols[0]).toEqual({
      id: 'head_start',
      name: 'Head Start',
      effect: '+10% starting credits',
      takesTower: false,
    });
  });

  it('toggles, forms links, warns kindly, and saves the pick as the preset', () => {
    loadDevSave('all_unlocked');
    openLoadout('a1_m02');
    let pick = loadout.value!.initial; // opened above
    expect(formedLinks(pick)).toEqual(['crossfire', 'sitting_ducks']);
    expect(pickWarnings(pick)).toEqual([]);
    pick = togglePickTower(togglePickTower(togglePickTower(pick, 'rivet'), 'thumper'), 'skyhook');
    expect(pick.towers).toEqual(['sprinkler']);
    expect(formedLinks(pick)).toEqual([]);
    expect(pickWarnings(pick)).toEqual([
      'Heads up: this shift needs an answer to Armor, and nothing here has one. Rivet (T3) or ' +
        'Thumper or Skyhook (Seeker Swarm) would.',
    ]);
    expect(savePick({ ...pick, ability: 'suppressing_fire' })).toEqual({ ok: true });
    const preset = { towers: ['sprinkler'], ability: 'suppressing_fire' };
    expect(activeSave()?.loadouts).toEqual({
      last: preset,
      byMap: { a1_m02: preset },
      protocols: [],
      protocolPicks: {},
    });
    // The battle plays it.
    const cfg = battleConfig('a1_m02', 0, activeSave());
    expect(cfg.loadout).toEqual(['sprinkler']);
    expect(cfg.abilities.slot1).toBe('suppressing_fire');
    // The screen opens on it next time.
    openLoadout('a1_m02');
    expect(loadout.value?.initial).toEqual({ ...preset, protocols: [], protocolPicks: {} });
  });

  it('equips Field Protocols save-wide, Specialist with its tower (T308)', () => {
    loadDevSave('after_a1m3');
    activeSave()!.unlocks.protocols.push('head_start', 'specialist');
    expect(openLoadout('a1_m03')).toBe(true);
    const view = loadout.value!; // opened above
    expect(view.protocolSlots).toBe(1);
    expect(view.protocols.map((p) => p.id)).toEqual(['head_start', 'specialist']);
    let pick = togglePickProtocol(view.initial, 'head_start');
    expect(pick.protocols).toEqual(['head_start']);
    // One slot: picking another swaps it in, and Specialist starts on the pick's first tower.
    pick = togglePickProtocol(pick, 'specialist');
    expect(pick.protocols).toEqual(['specialist']);
    expect(pick.protocolPicks).toEqual({ specialist: pick.towers[0] });
    pick = setProtocolTower(pick, 'specialist', 'skyhook');
    expect(setProtocolTower(pick, 'specialist', 'prism')).toBe(pick); // not in the pool
    expect(savePick(pick)).toEqual({ ok: true });
    expect(activeSave()?.loadouts.protocols).toEqual(['specialist']);
    expect(activeSave()?.loadouts.protocolPicks).toEqual({ specialist: 'skyhook' });
    // Save-wide: another map's battle has it too, and its screen starts with it equipped.
    const cfg = battleConfig('a1_m01', 0, activeSave());
    expect(cfg.modifiers).toContainEqual({
      kind: 'towerCost',
      tower: 'skyhook',
      tiers: 'spec',
      pct: -0.25,
      source: 'protocol:specialist',
    });
    openLoadout('a1_m01');
    expect(loadout.value?.initial.protocols).toEqual(['specialist']);
    // Toggled off, it leaves the save on the next lock-in.
    const off = togglePickProtocol(loadout.value!.initial, 'specialist');
    expect(off).toMatchObject({ protocols: [], protocolPicks: {} });
    expect(savePick(off)).toEqual({ ok: true });
    expect(activeSave()?.loadouts.protocols).toEqual([]);
  });
});
