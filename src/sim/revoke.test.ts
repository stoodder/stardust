// Revocation's script rules on the sim fixture (sim/revoke.ts; T606): the actions run from map
// events only (an objective's `onComplete` has no run context), and with no class of the cue's
// faction in the loadout nothing is revoked mid-map. The whole Clean Exit on a dev range is
// render/__fixtures__/devRevokeSim.test.ts's.
import { describe, expect, it } from 'vitest';
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { FIXTURE_CONTENT, fixtureConfig } from './__fixtures__/sim.ts';
import { selectRevokedClass } from './revoke.ts';
import { createSim } from './sim.ts';
import { unsupportedScript } from './systems/triggers.ts';

const MAP: CompiledMapDef<IdSpace> = FIXTURE_CONTENT.maps.fx_map;

/** fx_map with one objective whose `onComplete` runs `onComplete`. */
function withObjective(
  onComplete: CompiledMapDef<IdSpace>['objectives'][number]['onComplete'],
): CompiledMapDef<IdSpace> {
  return {
    ...MAP,
    objectives: [
      {
        id: 'x',
        name: 'x',
        description: 'x',
        condition: { stat: 'lateSells', lte: 0 },
        intel: 0,
        onComplete,
      },
    ],
  };
}

describe('revocation script rules (T606)', () => {
  it('runs from map events only, never from an objective', () => {
    expect(unsupportedScript(withObjective([{ revokeAbility: 'fx_strike' }]))).toEqual([
      "objective 'x': action revokeAbility runs from map events only",
    ]);
    expect(
      unsupportedScript(
        withObjective([
          { revokeTowerClass: { select: 'mostInvested', faction: 'vrell' }, refundPct: 100 },
        ]),
      ),
    ).toEqual(["objective 'x': action revokeTowerClass runs from map events only"]);
    // setModifier needs no run context: an objective may run it.
    expect(unsupportedScript(withObjective([{ setModifier: 'previewHidden', on: true }]))).toEqual(
      [],
    );
  });

  it('takes nothing from a loadout with no class of the faction', () => {
    const sim = createSim(fixtureConfig());
    const ctx = { content: sim.config.content, config: sim.config };
    expect(selectRevokedClass(sim.state, ctx, 'vrell')).toBe(null);
    expect(selectRevokedClass(sim.state, ctx, 'everglow')).toBe('fx_gun');
  });
});
