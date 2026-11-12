// Run rules (sim/rules.ts; T860): the config checks, Radio Silence's dark slots, and that a config
// without rules runs exactly as before (the balance harness's numbers are `npm run sim`'s check).
import { describe, expect, it } from 'vitest';
import type { IdSpace } from '../content/types.ts';
import { fixtureConfig } from './__fixtures__/sim.ts';
import { createSim, type SimConfig } from './index.ts';
import { slotRevoked } from './revoke.ts';
import { hasRule, radioSilent, ruleConfigErrors, towerTypeLimit, type SimRule } from './rules.ts';

/** The fixture's config: two towers, fx_strike in slot 1. */
const par = (): SimConfig<IdSpace> => fixtureConfig();
const withRules = (rules: readonly SimRule[], cfg = par()): SimConfig<IdSpace> => ({
  ...cfg,
  rules,
});

/** A run's state hash after `ticks` ticks with wave 1 called. */
function hashAfter(cfg: SimConfig<IdSpace>, ticks: number): string {
  const sim = createSim(cfg);
  sim.enqueue({ type: 'callWave' });
  for (let i = 0; i < ticks; i++) sim.step();
  return String(sim.hash());
}

describe('run rules', () => {
  it('a config without rules (or with none) runs exactly as before', () => {
    const cfg = par();
    expect(cfg.rules).toBeUndefined();
    expect(ruleConfigErrors(cfg)).toEqual([]);
    expect(hashAfter(withRules([]), 1200)).toBe(hashAfter(cfg, 1200));
  });

  it('reads the rules: hasRule, radioSilent, towerTypeLimit (the lowest wins)', () => {
    const cfg = withRules([
      { kind: 'maxTowerTypes', max: 3, source: 'veteran:short_handed' },
      { kind: 'maxTowerTypes', max: 2, source: 'challenge:test' },
    ]);
    expect(towerTypeLimit(cfg)).toBe(2);
    expect(towerTypeLimit(par())).toBeNull();
    expect(hasRule(cfg, 'noProtocols')).toBe(false);
    expect(radioSilent(withRules([{ kind: 'noAbilities', source: 's' }]))).toBe(true);
  });

  it('Short-Handed: refuses a loadout over the limit, and a limit below 1', () => {
    const cfg = par();
    expect(cfg.loadout.length).toBe(2);
    expect(ruleConfigErrors(withRules([{ kind: 'maxTowerTypes', max: 2, source: 's' }]))).toEqual(
      [],
    );
    expect(() => createSim(withRules([{ kind: 'maxTowerTypes', max: 1, source: 's' }]))).toThrow(
      /this run allows 1/,
    );
    expect(ruleConfigErrors(withRules([{ kind: 'maxTowerTypes', max: 0, source: 's' }]))).toEqual(
      expect.arrayContaining([expect.stringMatching(/positive integer/)]),
    );
  });

  it('Radio Silence: needs slot 1 empty; then every filled slot is dark', () => {
    const silent = withRules([{ kind: 'noAbilities', source: 's' }]);
    expect(() => createSim(silent)).toThrow(/slot 1 empty/);
    const empty = { ...silent, abilities: { ...silent.abilities, slot1: null } };
    const sim = createSim(empty);
    expect(slotRevoked(sim.state, empty, 1)).toBe(false); // empty: nothing to darken
    // A filled slot reads dark under the rule (a challenge map could leave one filled for show).
    const shown = { ...empty, abilities: { ...empty.abilities, slot1: 'fx_strike' } };
    expect(slotRevoked(sim.state, shown, 1)).toBe(true);
    expect(slotRevoked(sim.state, par(), 1)).toBe(false);
  });

  it("No Protocols: refuses a Field Protocol's modifier", () => {
    const cfg = withRules([{ kind: 'noProtocols', source: 's' }]);
    expect(ruleConfigErrors(cfg)).toEqual([]);
    const head = {
      kind: 'economy',
      stat: 'startCredits',
      pct: 0.1,
      source: 'protocol:head_start',
    } as const;
    expect(() => createSim({ ...cfg, modifiers: [...cfg.modifiers, head] })).toThrow(
      /protocol:head_start/,
    );
  });
});
