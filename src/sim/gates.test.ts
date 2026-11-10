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
    // Projectiles run since T304a; a closed row shows the spec is counted once unlocked.
    const closed = { ...FEATURE_GATES, 'attack.projectile': 'T304a' } as const;
    expect(gateRefusals(fixtureConfig(), closed)).toEqual([]);
    expect(gateRefusals(fixtureConfig({ specsUnlocked: ['fx_mortar'] }), closed)).toEqual([
      "a 'projectile' attack (fx_mortar) is not simulated until T304a",
    ]);
    expect(() => fixtureSim({ specsUnlocked: ['fx_mortar'] })).not.toThrow();
    expect(() => fixtureSim({ specsUnlocked: ['fx_gun'] })).not.toThrow();
  });

  it('refuses a status on any tier 1–3 of a loadout tower', () => {
    const unnerved = { status: 'unnerved', durationTicks: 60 } as const;
    const content = withGunTier(1, { ...GUN.tiers[1], effects: [unnerved] });
    expect(gateRefusals(fixtureConfig({ content }))).toEqual([
      'the unnerved status (fx_gun) is not simulated until T507',
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
      rampPctPerTick: 0,
      rampCap: 1,
      beams: 1,
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
    // Beams run since T504 and Stasis since T407a; closing their rows again refuses them.
    const closed = { ...FEATURE_GATES, 'attack.beam': 'T504', 'status.stasis': 'T407a' } as const;
    expect(gateRefusals(cfg, closed)).toEqual([
      "a 'beam' attack (fx_gun) is not simulated until T504",
      'the stasis status (fx_gun) is not simulated until T407a',
      'the unnerved status (fx_gun) is not simulated until T507',
    ]);
    const lifted = { ...closed, 'attack.beam': null, 'status.stasis': null };
    expect(gateRefusals(cfg, lifted)).toEqual([
      'the unnerved status (fx_gun) is not simulated until T507',
    ]);
  });

  it('every closed T121 row names its task (D064: M3 lifts projectiles and chains; D101: M4)', () => {
    expect(FEATURE_GATES.specs).toBeNull();
    expect(FEATURE_GATES['attack.projectile']).toBeNull(); // T304a
    expect(FEATURE_GATES['attack.chain']).toBeNull(); // T304b
    expect(FEATURE_GATES['attack.beam']).toBeNull(); // the Prism (T504)
    expect(FEATURE_GATES['attack.spawner']).toBe('M6'); // Scuttle Den
    expect(FEATURE_GATES['status.stasis']).toBeNull(); // Flash Freeze (T407a)
    expect(FEATURE_GATES['status.pinned']).toBeNull(); // Tether, Magnet Crane (T408)
    expect(FEATURE_GATES['status.unnerved']).toBe('T507'); // Mindspike
  });
});
