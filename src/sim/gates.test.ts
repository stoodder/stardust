// T121 (folded into T202b): createSim refuses a loadout whose reachable tiers use an attack kind
// or an on-hit status the towers system doesn't run yet (D013's "refuse, don't ignore"; D020).
import { describe, expect, it } from 'vitest';
import type { CompiledContent, CompiledTier, CompiledTowerDef } from '../content/compiled.ts';
import { FIXTURE_CONTENT, fixtureConfig, fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import { FEATURE_GATES, gateRefusals } from './gates.ts';

const GUN = FIXTURE_CONTENT.towers.fx_gun;

/** fixture content with fx_gun's tier `i` (0-based) replaced. */
function withGunTier(i: 0 | 1 | 2, tier: CompiledTier): CompiledContent<FixtureIds> {
  const tiers = GUN.tiers.map((t, k) => (k === i ? tier : t));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a 3-tuple rebuilt by map
  const gun = { ...GUN, tiers } as unknown as CompiledTowerDef<'fx_gun'>;
  return { ...FIXTURE_CONTENT, towers: { ...FIXTURE_CONTENT.towers, fx_gun: gun } };
}

describe('T121: unsimulated attack kinds and statuses', () => {
  it('a spec counts only once its pair is unlocked (fx_mortar spec A fires a projectile)', () => {
    expect(gateRefusals(fixtureConfig())).toEqual([]);
    expect(gateRefusals(fixtureConfig({ specsUnlocked: ['fx_mortar'] }))).toEqual([
      "a 'projectile' attack (fx_mortar) is not simulated until M3",
    ]);
    expect(() => fixtureSim({ specsUnlocked: ['fx_mortar'] })).toThrow(/'projectile' attack/);
    expect(() => fixtureSim({ specsUnlocked: ['fx_gun'] })).not.toThrow();
  });

  it('refuses a status on any tier 1–3 of a loadout tower', () => {
    const pinned = { status: 'pinned', durationTicks: 60 } as const;
    const content = withGunTier(1, { ...GUN.tiers[1], effects: [pinned] });
    expect(gateRefusals(fixtureConfig({ content }))).toEqual([
      'the pinned status (fx_gun) is not simulated until M3',
    ]);
    // Not in the loadout: nothing to refuse.
    expect(gateRefusals(fixtureConfig({ content, loadout: ['fx_mortar'] }))).toEqual([]);
  });

  it('refuses each kind and status once, and lifts per row', () => {
    const beam = {
      ...GUN.tiers[0].attack!, // fx_gun attacks
      kind: 'beam',
      beamTickTicks: 6,
      beamTickSec: 0.1,
    } as const;
    const content = withGunTier(0, {
      ...GUN.tiers[0],
      attack: beam,
      effects: [
        { status: 'stasis', durationTicks: 60 },
        { status: 'unnerved', durationTicks: 60 },
      ],
    });
    const cfg = fixtureConfig({ content });
    expect(gateRefusals(cfg)).toEqual([
      "a 'beam' attack (fx_gun) is not simulated until M3",
      'the stasis status (fx_gun) is not simulated until M3',
      'the unnerved status (fx_gun) is not simulated until M3',
    ]);
    const lifted = { ...FEATURE_GATES, 'attack.beam': null, 'status.stasis': null };
    expect(gateRefusals(cfg, lifted)).toEqual([
      'the unnerved status (fx_gun) is not simulated until M3',
    ]);
  });

  it('every closed T121 row names M3, and the specs row is open', () => {
    expect(FEATURE_GATES.specs).toBeNull();
    for (const f of ['projectile', 'beam', 'chain', 'spawner'] as const) {
      expect(FEATURE_GATES[`attack.${f}`]).toBe('M3');
    }
    for (const s of ['pinned', 'stasis', 'unnerved'] as const) {
      expect(FEATURE_GATES[`status.${s}`]).toBe('M3');
    }
  });
});
