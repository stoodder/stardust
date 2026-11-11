// The Technician beside the companion (T501, T807; content/technician.ts): validateBuilds'
// [locked-abilities] checks every build against the companions it runs beside (par beside each
// pick, #15; an alt or no-counter build beside its own), on the dev_bearers fixture map
// (render/__fixtures__/devM7.ts) with Time Dilation in slot 1. And the pure helper the loadout
// greys its slot-1 card with (T809).
import { describe, expect, it } from 'vitest';
import { DEV_CONTENT, type DevIds } from '../src/render/__fixtures__/devBattle.ts';
import { bearersMap } from '../src/render/__fixtures__/devM7.ts';
import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import { technicianClashes, technicianOffBeside } from '../src/content/technician.ts';
import type { IdSpace, MapDef, RawContent } from '../src/content/types.ts';
import { validate } from '../src/content/validate.ts';

const W = 'maps.dev_bearers';
const TD = { ...bearersMap.referenceProfile, technicianAbility: 'time_dilation' as const };

function errors(patch: Partial<MapDef<DevIds>>): string[] {
  const raw: RawContent<IdSpace> = {
    ...DEV_CONTENT,
    maps: { dev_bearers: { ...bearersMap, ...patch } },
  };
  return validate(raw).filter((e) => e.startsWith('[locked-abilities] '));
}

const clash = (at: string, c: string): string =>
  `[locked-abilities] ${W}.${at}: equips 'time_dilation' in slot 1 beside companion '${c}', who brings it in slot 2`;

describe("[locked-abilities]: slot 1 never holds the companion's own ability", () => {
  it('accepts it beside another companion, or beside an absent one', () => {
    expect(errors({ referenceProfile: TD })).toEqual([]);
    expect(
      errors({ referenceProfile: TD, companion: { id: 'vesthara', state: 'present' } }),
    ).toEqual([]);
    expect(errors({ referenceProfile: TD, companion: { id: 'quill', state: 'absent' } })).toEqual(
      [],
    );
  });

  it("rejects every build beside the map's present companion who brings it", () => {
    expect(
      errors({ referenceProfile: TD, companion: { id: 'quill', state: 'present' } }),
    ).toEqual([clash('parBuild', 'quill'), clash('noCounterBuilds.splash', 'quill')]);
  });

  it('on a pick list, checks par beside every pick (#15) and the others beside their own', () => {
    const pick = { pick: ['vesthara', 'quill'] } as const;
    // Par runs with QUILL too; the no-counter build plays the list's first (Ves'thara).
    expect(errors({ referenceProfile: TD, companion: pick })).toEqual([clash('parBuild', 'quill')]);
    // Par carrying no Time Dilation is fine; a no-counter build that picks QUILL isn't.
    const splash = bearersMap.noCounterBuilds.splash!;
    expect(
      errors({
        companion: pick,
        noCounterBuilds: {
          splash: { ...splash, technicianAbility: 'time_dilation', companion: 'quill' },
        },
      }),
    ).toEqual([clash('noCounterBuilds.splash', 'quill')]);
  });
});

describe('technicianOffBeside (the loadout greys these in slot 1, T809)', () => {
  const abilities = compileContent(RAW_CONTENT).abilities;

  it("names the companion's own ability, nothing for no companion", () => {
    expect(technicianOffBeside(abilities, 'quill')).toEqual(['time_dilation']);
    expect(technicianOffBeside(abilities, 'vesthara')).toEqual(['stillness']);
    expect(technicianOffBeside(abilities, null)).toEqual([]);
    expect(technicianClashes(abilities, 'time_dilation', 'quill')).toBe(true);
    expect(technicianClashes(abilities, 'time_dilation', 'vesthara')).toBe(false);
    expect(technicianClashes(abilities, 'suppressing_fire', null)).toBe(false);
    expect(technicianClashes(abilities, null, 'quill')).toBe(false);
    expect(technicianClashes(abilities, 'toString', 'quill')).toBe(false);
  });
});
