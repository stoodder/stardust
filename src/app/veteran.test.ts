// The briefing's veteran picker in the app (T860): when it shows, what a toggle writes, the
// restart the router makes on Clock in, and Results' Veteran medal row.
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../meta/index.ts';
import { battleConfig } from './battleSetup.ts';
import { activeSave, initSaves, loadDevSave } from './save.ts';
import { briefingChangedBattle } from './storyMeta.ts';
import { toggleVeteran, veteranMedalOffered, veteranPickerView } from './veteran.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1);
  loadDevSave('after_a2m6');
});

describe('the veteran picker', () => {
  it('shows on a won campaign map only', () => {
    expect(veteranPickerView(null, 'a2_m01')).toBeNull();
    expect(veteranPickerView(activeSave(), 'a3_m01')).toBeNull(); // not won yet
    expect(veteranPickerView(activeSave(), 'dev_range')).toBeNull();
    expect(veteranPickerView(activeSave(), null)).toBeNull();
    const view = veteranPickerView(activeSave(), 'a2_m01')!;
    expect(view.rows).toHaveLength(8);
    expect(view.total).toBe(0);
    expect(view.medal).toEqual({ held: false, reached: false, at: 100 });
  });

  it('a toggle writes the save, sums the bonus, and reaches the medal at +100%', () => {
    for (const id of ['hardened_hides', 'glass_core', 'short_handed'] as const) {
      expect(toggleVeteran('a2_m01', id)).toBe(true);
    }
    const view = veteranPickerView(activeSave(), 'a2_m01')!;
    expect(view.total).toBe(120);
    expect(view.medal.reached).toBe(true);
    expect(activeSave()?.veteran?.a2_m01?.mods).toEqual([
      'hardened_hides',
      'glass_core',
      'short_handed',
    ]);
    // Off again.
    toggleVeteran('a2_m01', 'glass_core');
    expect(veteranPickerView(activeSave(), 'a2_m01')!.total).toBe(80);
  });

  it('never toggles a dimmed modifier (Glass Core with no core)', () => {
    loadDevSave('after_a3m1_spared');
    const view = veteranPickerView(activeSave(), 'a3_m01')!;
    expect(view.rows.find((r) => r.id === 'glass_core')?.available).toBe(false);
    expect(toggleVeteran('a3_m01', 'glass_core')).toBe(false);
    expect(activeSave()?.veteran).toBeUndefined();
  });

  it('a pick on the briefing changes the battle (the router restarts it on Clock in)', () => {
    const cfg = battleConfig('a2_m01', 5, activeSave());
    expect(briefingChangedBattle(cfg, activeSave())).toBe(false);
    toggleVeteran('a2_m01', 'radio_silence'); // rules and slot 1 only, no modifier
    expect(briefingChangedBattle(cfg, activeSave())).toBe(true);
  });

  it("names the Veteran medal for Results when the run's mods reach +100%", () => {
    toggleVeteran('a2_m01', 'hardened_hides');
    expect(veteranMedalOffered(battleConfig('a2_m01', 5, activeSave()))).toEqual([]);
    toggleVeteran('a2_m01', 'glass_core');
    toggleVeteran('a2_m01', 'rush_hour');
    expect(veteranMedalOffered(battleConfig('a2_m01', 5, activeSave()))).toEqual([
      { id: 'veteran', name: 'Veteran' },
    ]);
  });
});
