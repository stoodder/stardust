// The companion slot (T207a): a map's companion resolves into SimConfig's slot-2 fields.
import { describe, expect, it } from 'vitest';
import type { CompiledMapDef } from '../content/compiled.ts';
import { FIXTURE_CONTENT, type FixtureIds } from './__fixtures__/sim.ts';
import { companionAbility, companionSlot } from './companion.ts';

const base = FIXTURE_CONTENT.maps.fx_map;
const withCompanion = (companion: CompiledMapDef<FixtureIds>['companion']) => ({
  ...base,
  companion,
});

describe('companionAbility', () => {
  it("finds a companion's ability by its `companion` field", () => {
    expect(companionAbility(FIXTURE_CONTENT, 'bricks')).toBe('fx_suppress');
    expect(companionAbility(FIXTURE_CONTENT, 'quill')).toBe('fx_chime');
    expect(companionAbility(FIXTURE_CONTENT, 'zibzab')).toBeNull();
  });
});

describe('companionSlot', () => {
  it('no companion: the slot is hidden', () => {
    expect(companionSlot(FIXTURE_CONTENT, base)).toEqual({
      companion: null,
      slot2: null,
      slot2State: 'none',
    });
    expect(() => companionSlot(FIXTURE_CONTENT, base, 'bricks')).toThrow(/no companion/);
  });

  it('one companion: present or absent, with its ability either way', () => {
    const present = withCompanion({ id: 'bricks', state: 'present' });
    expect(companionSlot(FIXTURE_CONTENT, present)).toEqual({
      companion: 'bricks',
      slot2: 'fx_suppress',
      slot2State: 'present',
    });
    expect(companionSlot(FIXTURE_CONTENT, present, 'bricks').companion).toBe('bricks');
    expect(() => companionSlot(FIXTURE_CONTENT, present, 'quill')).toThrow(/not 'quill'/);
    const absent = withCompanion({ id: 'bricks', state: 'absent' });
    expect(companionSlot(FIXTURE_CONTENT, absent).slot2State).toBe('absent');
  });

  it("a pick list: the first by default, or the player's pick from it", () => {
    const pick = withCompanion({ pick: ['quill', 'bricks'] });
    expect(companionSlot(FIXTURE_CONTENT, pick)).toEqual({
      companion: 'quill',
      slot2: 'fx_chime',
      slot2State: 'present',
    });
    expect(companionSlot(FIXTURE_CONTENT, pick, 'bricks').slot2).toBe('fx_suppress');
    expect(() => companionSlot(FIXTURE_CONTENT, pick, 'zibzab')).toThrow(/pick list/);
  });
});
