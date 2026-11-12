import { describe, expect, it } from 'vitest';
import { createNewSave } from '../meta/saveData.ts';
import { memorialFor } from './memorial.ts';

describe("the memorial wreck's deps (T831)", () => {
  it("draws the save's tagged class and its plate's name, resolved", () => {
    const save = createNewSave();
    save.profile = { name: 'Ada Okafor', address: 'ms', pronouns: 'she', callsign: 'sprout' };
    save.story.memorialTower = 'thumper';
    expect(memorialFor(save)).toEqual({ memorialTower: 'thumper', memorialName: 'Ada Okafor' });
  });

  it('falls back to the class GroundView picks, and the default name, with neither saved', () => {
    const save = createNewSave();
    const deps = memorialFor(save);
    expect(deps.memorialTower).toBeNull();
    expect(deps.memorialName).not.toContain('{');
    expect(deps.memorialName.length).toBeGreaterThan(0);
  });

  it('draws nothing named without a save', () => {
    expect(memorialFor(null)).toEqual({ memorialTower: null, memorialName: '' });
  });
});
