// The dev saves against the reference profiles for A3M4–A3M6 (T767; as a3m3Protocols.test.ts does for
// A3M3). The browser builds a battle's meta modifiers from the save (`saveModifiers`), the harness
// from the reference profile (`profileModifiers`), so the two only agree when the save owns what the
// reference owns and equips what it equips:
//
// - each `after_<map>` dev save (the save as that map was won: its prep bought, its protocol equipped,
//   its briefing gifts taken) turns into exactly the reference profile's modifiers for that map, in
//   every door × C4 cell the dev saves cover;
// - the live A3M4 flows load `after_a3m3_*`, which still carries A3M3's Head Start (A3M3 has no core
//   and benched the Bulkhead), and A3M4's reference equips Head Start too (T771: campaign.md § 4.9),
//   so a live A3M4 run plays the harness's numbers with no loadout change. (Before T771 the
//   reference equipped the Bulkhead and a live run ended five short of it.)
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { ProfileDef } from '../content/types.ts';
import { DEV_SAVES, type DevSaveId } from '../meta/__fixtures__/devSaves.ts';
import { equippedProtocols, saveModifiers } from '../meta/loadout.ts';
import { runHeadless, type ScriptFlags } from '../sim/index.ts';
import { buildFor } from './harness.ts';
import { parBuildFor, profileModifiers, referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);

/** A modifier list as a sorted multiset (the two sides list the same modifiers in their own order). */
const norm = (mods: readonly unknown[]): string[] => mods.map((m) => JSON.stringify(m)).toSorted();

/** Each dev save as it was when `map` was won, and the story flags it carries. */
const AFTER: readonly [DevSaveId, 'a3_m04' | 'a3_m05' | 'a3_m06', ScriptFlags][] = [
  ['after_a3m4_keep', 'a3_m04', { door_choice: 'convoy' }],
  ['after_a3m4_keep_warren', 'a3_m04', { door_choice: 'warren' }],
  ['after_a3m5_keep', 'a3_m05', { door_choice: 'convoy', quill_choice: 'keep' }],
  ['after_a3m5_purge', 'a3_m05', { door_choice: 'convoy', quill_choice: 'purge' }],
  ['after_a3m5_rewrite', 'a3_m05', { door_choice: 'convoy', quill_choice: 'rewrite' }],
  ['after_a3m6', 'a3_m06', { door_choice: 'convoy', quill_choice: 'rewrite' }],
];

describe('A3M4–A3M6 dev saves against the reference (T767)', () => {
  it.each(AFTER)('%s turns into %s’s reference modifiers', (id, mapId, flags) => {
    const save = DEV_SAVES[id].build();
    const ref = referenceRunProfile(content.maps[mapId], content, 'standard', undefined, flags);
    expect(norm(saveModifiers(save))).toEqual(norm(ref.modifiers));
  });

  it('carries A3M3’s Head Start into A3M4, which the reference equips too (T771)', () => {
    for (const id of ['after_a3m3_convoy', 'after_a3m3_warren'] as const) {
      const save = DEV_SAVES[id].build();
      expect(equippedProtocols(save).equipped, id).toEqual(['head_start']);
    }
    expect(content.maps.a3_m04.builds.referenceProfile.protocols).toEqual(['head_start']);
  });
});

describe(
  'A3M4 par on the protocol a live flow carries in (T767)',
  { timeout: HARNESS_TEST_TIMEOUT_MS },
  () => {
    const map = content.maps.a3_m04;
    const play = (def: ProfileDef, build: CompiledBuild): number => {
      const r = runHeadless(
        runConfig(
          content,
          map,
          build,
          {
            difficulty: 'standard',
            modifiers: profileModifiers(def, content),
            specs: def.specs,
          },
          1,
          { door_choice: 'convoy' },
        ),
        build,
      );
      expect(r.outcome).toBe('won');
      return r.integrity;
    };

    it('plays par the same on the protocol the live flow carries in: no gap', () => {
      const ref = map.builds.referenceProfile;
      const par = parBuildFor(map, { door_choice: 'convoy' }) ?? buildFor('par', map, content)!;
      const live = DEV_SAVES.after_a3m3_convoy.build();
      const carried = equippedProtocols(live).equipped;
      expect(carried).toEqual(ref.protocols);
      expect(play({ ...ref, protocols: carried }, par)).toBe(play(ref, par));
      expect(play(ref, par)).toBe(15);
    });
  },
);
