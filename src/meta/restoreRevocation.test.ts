// Run end's step 3 after the finale's restore (T807; meta/storyTransactions.ts
// `revokedClassFactions`): Directive 0's class came back ("Not Everglow."), so a finale win
// leaves the save's classes untouched, while an unrestored revocation (A3M2's Clean Exit) still
// takes its map-end class.
import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../content/compileHelpers.ts';
import type { IdSpace, ScriptedEvent } from '../content/types.ts';
import { createNewSave } from './saveData.ts';
import { revokedClassFactions, runEndRevocations } from './storyTransactions.ts';

const directive0: ScriptedEvent<IdSpace> = {
  id: 'directive0',
  on: { phase: 2, afterSec: 20 },
  actions: [
    { revokeTowerClass: { select: 'mostInvested' }, refundPct: 100 },
    { lockAbility: 'time_dilation', on: true },
    { forceInput: { id: 'whos_there' } },
  ],
};
const notEverglow: ScriptedEvent<IdSpace> = {
  id: 'not_everglow',
  on: { forcedInputResolved: 'whos_there' },
  actions: [{ restoreTowerClass: 'lastRevoked' }],
};
const cleanExit: ScriptedEvent<IdSpace> = {
  id: 'clean_exit',
  on: { wave: 7, phase: 'start' },
  actions: [{ revokeTowerClass: { select: 'mostInvested', faction: 'everglow' }, refundPct: 100 }],
};

describe('run end after a restored class (T807)', () => {
  it('a restore cancels the cue before it: nothing is taken at map end', () => {
    expect(revokedClassFactions([directive0])).toEqual([null]);
    expect(revokedClassFactions([directive0, notEverglow])).toEqual([]);
    expect(revokedClassFactions([cleanExit, directive0, notEverglow])).toEqual(['everglow']);
  });

  it("a finale win after Directive 0 and the restore leaves the save's classes untouched", () => {
    const save = deepFreeze(createNewSave());
    const atMapEnd = revokedClassFactions([directive0, notEverglow]);
    const r = runEndRevocations(save, {
      won: true,
      wonBefore: false,
      // The sim's state.revoked after the restore: no class (the phase lock is never saved).
      revoked: { towers: [], abilities: [], ...(atMapEnd.length > 0 ? { atMapEnd } : {}) },
    });
    expect(r).toEqual({ save, revocations: [] });
  });

  it('an unrestored revocation (A3M2) still takes its map-end class', () => {
    const save = deepFreeze(createNewSave());
    const r = runEndRevocations(save, {
      won: true,
      wonBefore: false,
      revoked: { towers: [], abilities: [], atMapEnd: revokedClassFactions([cleanExit]) },
    });
    expect(r.revocations).toEqual([{ kind: 'revoke_tower', tower: 'rivet' }]);
  });
});
