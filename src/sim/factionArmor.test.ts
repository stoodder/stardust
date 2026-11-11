// C4 Purge's faction armor modifier (T703; factionArmor.ts, systems/waves.ts `waveModifiers`): the
// faction scope, the 0 floor, `openPanel`, stacking with the pct modifiers, the damage it lets
// through, the lifted gate, and determinism. battleSetup adds it from A3M5 on (T710).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { SIM_FIXTURE, fixtureConfig } from './__fixtures__/sim.ts';
import type { Modifier } from './config.ts';
import { factionArmorFlat, withFactionArmor } from './factionArmor.ts';
import { FEATURE_GATES, gateRefusals } from './gates.ts';
import { createSim } from './sim.ts';
import { waveModifiers } from './systems/waves.ts';

const LIVE = compileContent(RAW_CONTENT);
const DEFS = Object.values(LIVE.enemies);
const PURGE = {
  kind: 'enemyStat',
  stat: 'armor',
  faction: 'everglow',
  flat: -2,
  source: 'c4:purge',
} as const satisfies Modifier;

describe('the faction armor modifier (core-loop.md § 6.11: Purge, −2 Everglow armor, min 0)', () => {
  it('lowers every unit of its faction by flat, sets openPanel, and leaves the others alone', () => {
    const { enemies } = waveModifiers([PURGE], DEFS);
    for (const def of DEFS) {
      const out = enemies.get(def.id);
      if (def.faction !== 'everglow') {
        expect(out, def.id).toBeUndefined(); // spawns with its content def
        continue;
      }
      expect(out?.armor, def.id).toBe(Math.max(0, def.armor - 2));
      expect(out?.openPanel, def.id).toBe(true);
      expect(def.openPanel, def.id).toBe(false); // content is untouched
    }
    expect(enemies.get('liability')?.armor).toBe(10);
    expect(enemies.get('associate')?.armor).toBe(1);
    expect(enemies.get('shareholder_value')?.armor).toBe(13); // a boss too
  });

  it('never below 0, and sums per faction', () => {
    expect(withFactionArmor(LIVE.enemies.associate, -5).armor).toBe(0);
    expect(withFactionArmor(LIVE.enemies.associate, 0)).toBe(LIVE.enemies.associate);
    const up = withFactionArmor(LIVE.enemies.compliance, 1);
    expect([up.armor, up.openPanel]).toEqual([5, false]);
    const twice = factionArmorFlat([PURGE, { ...PURGE, source: 'x' }]);
    expect(twice?.get('everglow')).toBe(-4);
    expect(factionArmorFlat([{ kind: 'countdown', pct: 0.5, source: 'story' }])).toBeNull();
    expect(() => factionArmorFlat([{ ...PURGE, flat: Number.NaN }])).toThrow(RangeError);
  });

  it('stacks with Story difficulty’s pct scaling on the same def', () => {
    const { enemies } = waveModifiers(
      [{ kind: 'enemyStat', stat: 'hp', pct: -0.3, source: 'difficulty:story' }, PURGE],
      DEFS,
    );
    const liability = enemies.get('liability')!;
    expect([liability.hp, liability.armor, liability.openPanel]).toEqual([420, 10, true]);
    const mote = enemies.get('mote')!;
    expect([mote.hp, mote.openPanel]).toEqual([LIVE.enemies.mote.hp * 0.7, false]);
  });

  it('with no faction modifier the scaled defs are as before (A1M1–A3M3’s numbers hold)', () => {
    expect(waveModifiers([], DEFS).enemies.size).toBe(0);
  });
});

describe('the gate and a whole run', () => {
  it('T703 lifts modifier.enemyStat.faction', () => {
    expect(FEATURE_GATES['modifier.enemyStat.faction']).toBeNull();
    expect(gateRefusals(fixtureConfig({ modifiers: [PURGE] }))).toEqual([]);
  });

  it('a run with it plays deterministically, and a non-Everglow map plays as without it', () => {
    const run = (modifiers: readonly (typeof PURGE)[]): string => {
      const sim = createSim(fixtureConfig({ modifiers }));
      sim.enqueue({ type: 'callWave' });
      for (let i = 0; i < 600; i++) sim.step();
      return sim.hash();
    };
    expect(run([PURGE])).toBe(run([PURGE]));
    // fx_map sends no Everglow unit, so Purge changes nothing there.
    expect(SIM_FIXTURE.enemies.fx_walker.faction).not.toBe('everglow');
    expect(run([PURGE])).toBe(run([]));
  });
});
