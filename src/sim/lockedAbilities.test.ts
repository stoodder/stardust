// createSim refuses a slot-1 ability the map locks under the run's story flags (D150): A3M5's
// System Reboot under C4 Rewrite, judged over `scriptFlags` as the loadout screen judges the save's.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { flagConditionHolds, isFlagCondition } from '../content/flagConditions.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { ScriptFlags, SimConfig } from './config.ts';
import { companionSlot } from './companion.ts';
import { createSim } from './sim.ts';

const LIVE = compileContent(RAW_CONTENT);
const A3M5 = LIVE.maps.a3_m05;

function config(slot1: string | null, scriptFlags: ScriptFlags): SimConfig {
  const slot = companionSlot(LIVE, A3M5);
  return {
    content: LIVE,
    mapId: 'a3_m05',
    seed: 1,
    loadout: A3M5.builds.parBuild.loadout,
    companion: slot.companion,
    modifiers: [],
    difficulty: 'standard',
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test: live ability ids
    abilities: { slot1: slot1 as never, slot2: slot.slot2, slot2State: slot.slot2State },
    scriptFlags,
    specsUnlocked: [],
  };
}

describe('lockedAbilities in createSim', () => {
  it('refuses System Reboot in slot 1 on A3M5 under Rewrite', () => {
    expect(() => createSim(config('system_reboot', { quill_choice: 'rewrite' }))).toThrow(
      /abilities\.slot1: 'system_reboot' is locked on 'a3_m05'/,
    );
  });

  it('takes it under Keep, Purge and no answer, and takes another ability under Rewrite', () => {
    for (const flags of [{ quill_choice: 'keep' }, { quill_choice: 'purge' }, {}] as const) {
      expect(() => createSim(config('system_reboot', flags))).not.toThrow();
    }
    expect(() => createSim(config('suppressing_fire', { quill_choice: 'rewrite' }))).not.toThrow();
    expect(() => createSim(config(null, { quill_choice: 'rewrite' }))).not.toThrow();
  });
});

describe('flag conditions', () => {
  const rewrite = { flag: 'quill_choice', eq: 'rewrite' } as const;

  it('judge flag atoms and all/any/not over the flags; unset never matches', () => {
    expect(flagConditionHolds(rewrite, { quill_choice: 'rewrite' })).toBe(true);
    expect(flagConditionHolds(rewrite, {})).toBe(false);
    expect(flagConditionHolds({ not: rewrite }, {})).toBe(true);
    expect(
      flagConditionHolds(
        { all: [rewrite, { flag: 'door_choice', eq: 'warren' }] },
        {
          quill_choice: 'rewrite',
        },
      ),
    ).toBe(false);
    expect(flagConditionHolds({ any: [rewrite, { not: rewrite }] }, {})).toBe(true);
  });

  it('isFlagCondition rejects any run atom, however deep', () => {
    expect(isFlagCondition({ all: [rewrite, { not: rewrite }] })).toBe(true);
    expect(isFlagCondition({ not: { stat: 'abilityUses', gte: 1 } })).toBe(false);
    expect(isFlagCondition({ any: [rewrite, { leaks: 'any', gte: 1 }] } as never)).toBe(false);
  });
});
