// The loadout after A3M2's Clean Exit (D143 R4, R9): the revoked class stays on the screen as a
// stamped card ("License revoked"), never in the pickable pool, and the revoked Orbital Strike reads
// "Uplink revoked" in the Technician column; and on a map with no core (A3M3's Holdout, A3M1's
// Escort) a core-only protocol (Emergency Bulkhead) reads "No core on this shift", still equippable.
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../meta/index.ts';
import { loadout } from '../ui/screens/loadoutView.ts';
import {
  BENCHED_TEXT,
  NO_CORE_TEXT,
  benchInert,
  closeLoadout,
  coreOnly,
  openLoadout,
  togglePickProtocol,
  togglePickTower,
} from './loadout.ts';
import { activeSave, initSaves, loadDevSave } from './save.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1);
  closeLoadout();
});

describe('a revoked class and uplink on the loadout screen', () => {
  it('shows the Thumper stamped and out of the pool; the strike as "Uplink revoked"', () => {
    loadDevSave('after_a3m2_thumper');
    expect(openLoadout('a3_m03')).toBe(true);
    const view = loadout.value!; // opened above
    expect(view.revoked.map((r) => r.id)).toEqual(['thumper']);
    expect(view.revoked[0]?.name).toBe('Thumper');
    expect(view.towers.map((t) => t.id)).not.toContain('thumper');
    expect(view.revokedAbilities.map((r) => r.id)).toEqual(['orbital_strike']);
    expect(view.abilities.map((a) => a.id)).not.toContain('orbital_strike');
    // Unpickable: a toggle naming it changes nothing.
    const pick = { ...view.initial, towers: view.initial.towers.slice(0, 3) };
    expect(togglePickTower(pick, 'thumper')).toBe(pick);
  });

  it('shows the Rivet stamped on the other branch, and nothing before the Clean Exit', () => {
    loadDevSave('after_a3m2_rivet');
    openLoadout('a3_m03');
    expect(loadout.value?.revoked.map((r) => r.id)).toEqual(['rivet']);
    loadDevSave('after_a3m1_cleared');
    openLoadout('a3_m02');
    expect(loadout.value?.revoked).toEqual([]);
    expect(loadout.value?.revokedAbilities).toEqual([]);
  });
});

describe('a core-only protocol on a map with no core', () => {
  it('is Emergency Bulkhead alone', () => {
    expect(coreOnly('emergency_bulkhead')).toBe(true);
    expect(coreOnly('head_start')).toBe(false);
  });

  it('reads "No core on this shift" on the Holdout and the Escort, and still equips', () => {
    loadDevSave('after_a3m2_rivet');
    const save = activeSave()!; // loaded above
    if (!save.unlocks.protocols.includes('emergency_bulkhead')) {
      save.unlocks.protocols.push('emergency_bulkhead');
    }
    for (const map of ['a3_m03', 'a3_m01']) {
      openLoadout(map);
      const p = loadout.value?.protocols.find((x) => x.id === 'emergency_bulkhead');
      expect(p?.inert).toBe(NO_CORE_TEXT);
      expect(togglePickProtocol(loadout.value!.initial, 'emergency_bulkhead')).not.toBe(
        loadout.value!.initial,
      );
    }
    // A map with a core: nothing to say.
    openLoadout('a3_m02');
    const p = loadout.value?.protocols.find((x) => x.id === 'emergency_bulkhead');
    expect(p?.inert).toBeNull();
  });
});

describe('a core-only protocol carried onto a map with no core (D144 S1b)', () => {
  it('is benched for the first owned protocol that acts, and says so; it can come back', () => {
    loadDevSave('after_a3m2_thumper');
    // A3M2's reference carries the Bulkhead into A3M3.
    expect(activeSave()?.loadouts.protocols).toEqual(['emergency_bulkhead']);
    openLoadout('a3_m03');
    const view = loadout.value!; // opened above
    expect(view.initial.protocols).toEqual(['head_start']);
    const bulkhead = view.protocols.find((p) => p.id === 'emergency_bulkhead');
    expect(bulkhead?.benched).toBe(BENCHED_TEXT);
    expect(bulkhead?.inert).toBe(NO_CORE_TEXT);
    expect(BENCHED_TEXT).not.toMatch(/!/); // Act III: no system "!"
    expect(view.protocols.find((p) => p.id === 'head_start')?.benched).toBeNull();
    // The player can still pick it (one slot: a swap).
    expect(togglePickProtocol(view.initial, 'emergency_bulkhead').protocols).toEqual([
      'emergency_bulkhead',
    ]);
  });

  it('stays on a map with a core, and when nothing else is owned', () => {
    loadDevSave('after_a3m2_thumper');
    openLoadout('a3_m02');
    expect(loadout.value?.initial.protocols).toEqual(['emergency_bulkhead']);
    expect(loadout.value?.protocols.every((p) => p.benched === null)).toBe(true);
    const save = activeSave()!; // loaded above
    save.unlocks.protocols = save.unlocks.protocols.filter((p) => p === 'emergency_bulkhead');
    openLoadout('a3_m03');
    expect(loadout.value?.initial.protocols).toEqual(['emergency_bulkhead']);
    expect(loadout.value?.protocols[0]?.benched).toBeNull();
  });

  it('swaps in place, skips what is already equipped, and gives a tower pick its tower', () => {
    const p = (id: string, inert: string | null, takesTower = false) => ({
      id,
      name: id,
      effect: '',
      takesTower,
      inert,
      benched: null,
    });
    const offered = [
      p('emergency_bulkhead', NO_CORE_TEXT),
      p('head_start', null),
      p('specialist', null, true),
    ];
    const start = {
      towers: ['rivet'],
      protocols: ['head_start', 'emergency_bulkhead'],
      protocolPicks: {},
    };
    expect(benchInert(start, offered, 'zapcoil')).toEqual({
      pick: { protocols: ['head_start', 'specialist'], protocolPicks: { specialist: 'rivet' } },
      benched: ['emergency_bulkhead'],
    });
    const none = { towers: [], protocols: ['head_start'], protocolPicks: {} };
    expect(benchInert(none, offered, 'zapcoil').benched).toEqual([]);
  });
});
