// Act III part one's meta (T610; D141): run end's step 3 with towers.md § 9's map-end rule, the
// memorial tower (towers.md § 8), the Holdout's flat pay (progression.md § 2), A3M1's gifts (the
// Scuttle Den in its briefing, the Hum Choir at its debrief if spared), and the Stasis Bloom's
// attunement stocked after A3M1.
import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../content/compileHelpers.ts';
import type { ScriptedEvent, IdSpace } from '../content/types.ts';
import { TOWER_ACCESS } from '../content/upgrades/access.ts';
import { stubTowerGate } from '../sim/gates.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import { offerFor } from './purchase.ts';
import { runEnd, type RunEndInput } from './runEnd.ts';
import { createNewSave } from './saveData.ts';
import {
  briefingGifts,
  giftGrantId,
  revokedClassFactions,
  runEndRevocations,
  runEndTransactions,
} from './storyTransactions.ts';
import { validateSave } from './validate.ts';

const clean: ScriptedEvent<IdSpace> = {
  id: 'clean_exit',
  on: { wave: 7, phase: 'start' },
  actions: [
    { cue: 'a3_m02_cue_revoke' },
    { revokeTowerClass: { select: 'mostInvested', faction: 'everglow' }, refundPct: 100 },
    { revokeAbility: 'orbital_strike' },
  ],
};

describe("run end step 3: towers.md § 9's map-end class", () => {
  it("reads the map's revokeTowerClass factions, in event order", () => {
    expect(revokedClassFactions(undefined)).toEqual([]);
    expect(revokedClassFactions([clean])).toEqual(['everglow']);
    const any: ScriptedEvent<IdSpace> = {
      id: 'directive_zero',
      on: { wave: 1, phase: 'start' },
      actions: [{ revokeTowerClass: { select: 'mostInvested' }, refundPct: 100 }],
    };
    expect(revokedClassFactions([clean, any])).toEqual(['everglow', null]);
  });

  it('takes the first owned class of the faction when the cue took none mid-map', () => {
    // A fresh save owns the Rivet then the Thumper (both Everglow), in that order.
    const save = deepFreeze(createNewSave());
    expect(save.unlocks.towers.slice(0, 2)).toEqual(['rivet', 'thumper']);
    const revoked = { towers: [], abilities: ['orbital_strike'] } as const;
    const r = runEndRevocations(save, {
      won: true,
      wonBefore: false,
      revoked,
      atMapEnd: ['everglow'],
    });
    expect(r.revocations).toEqual([
      { kind: 'revoke_tower', tower: 'rivet' },
      { kind: 'revoke_ability', ability: 'orbital_strike', refund: null },
    ]);
    expect(r.save.unlocks.revokedTowers).toEqual(['rivet']);
    expect(validateSave(r.save).ok).toBe(true);
  });

  it('adds nothing when the cue took a class of the faction, or the save owns none', () => {
    const save = deepFreeze(createNewSave());
    const took = runEndRevocations(save, {
      won: true,
      wonBefore: false,
      revoked: { towers: ['thumper'], abilities: [] },
      atMapEnd: ['everglow'],
    });
    expect(took.save.unlocks.revokedTowers).toEqual(['thumper']);
    const vrell = runEndRevocations(save, {
      won: true,
      wonBefore: false,
      revoked: { towers: [], abilities: [] },
      atMapEnd: ['vrell'],
    });
    expect(vrell.revocations).toEqual([]);
    // A loss or a replay saves nothing, the map-end class included.
    for (const [won, wonBefore] of [
      [false, false],
      [true, true],
    ] as const) {
      const r = runEndRevocations(save, {
        won,
        wonBefore,
        revoked: { towers: [], abilities: [] },
        atMapEnd: ['everglow'],
      });
      expect(r).toEqual({ save, revocations: [] });
    }
  });

  it('never takes a second class for one cue, nor one already revoked', () => {
    const save = createNewSave();
    save.unlocks.revokedTowers = ['rivet'];
    const r = runEndRevocations(deepFreeze(save), {
      won: true,
      wonBefore: false,
      revoked: { towers: [], abilities: [] },
      atMapEnd: ['everglow'],
    });
    expect(r.revocations).toEqual([{ kind: 'revoke_tower', tower: 'thumper' }]);
  });
});

/** A won run on A1M1 (any registered map serves: these steps read no map data). */
function win(extra: Partial<RunEndInput> = {}): RunEndInput {
  return {
    mapId: 'a1_m01',
    outcome: 'won',
    mapStardust: 320,
    waveCount: 7,
    wavesResolved: 7,
    earnedMedals: ['victory'],
    skitterkinKilled: 0,
    meter: 20,
    ...extra,
  };
}

describe('the memorial tower (towers.md § 8)', () => {
  it("saves the {name} turret's type on the map's first win only", () => {
    const save = deepFreeze(createNewSave());
    const first = runEnd(save, win({ memorialTower: 'burrow' }));
    expect(first.save.story.memorialTower).toBe('burrow');
    // A replay never moves it; a loss never sets it; none given keeps what's saved.
    expect(runEnd(first.save, win({ memorialTower: 'rivet' })).save.story.memorialTower).toBe(
      'burrow',
    );
    const lost = runEnd(save, { ...win({ memorialTower: 'rivet' }), outcome: 'lost' });
    expect(lost.save.story.memorialTower).toBeNull();
    expect(runEnd(save, win({ memorialTower: null })).save.story.memorialTower).toBeNull();
    expect(runEnd(save, win()).save.story.memorialTower).toBeNull();
  });
});

describe("the Holdout's flat pay (progression.md § 2)", () => {
  it('pays the same first-clear Stardust at any Evacuated score', () => {
    const save = deepFreeze(createNewSave());
    const pays = [0, 12, 30, 42].map((meter) => runEnd(save, win({ meter })).summary.stardust);
    for (const p of pays) expect(p).toEqual(pays[0]);
    expect(pays[0]!.amount).toBe(320);
    expect(pays[0]!.source).toBe('first_clear');
  });
});

describe("A3M1's gifts and the Stasis Bloom (act3.md § A3M1, Gifts)", () => {
  it('gives the Scuttle Den as the loadout first opens, the Hum Choir on a spared first win', () => {
    const before = DEV_SAVES.after_a2m6.build();
    expect(before.unlocks.towers).not.toContain('burrow');
    const briefed = briefingGifts(before, 'a3_m01').save;
    expect(briefed.unlocks.towers).toContain('burrow');
    expect(briefed.story.granted).toContain(giftGrantId('burrow'));
    for (const spared of [true, false]) {
      const s = briefingGifts(DEV_SAVES.after_a2m6.build(), 'a3_m01').save;
      s.story.flags.spared_quiet_wave = spared;
      const r = runEndTransactions(s, { mapId: 'a3_m01', won: true, wonBefore: false });
      expect(r.save.unlocks.towers.includes('choir')).toBe(spared);
      expect(r.transactions).toEqual(spared ? [{ kind: 'gift', tower: 'choir' }] : []);
    }
  });

  it("stocks the Stasis Bloom's attunement once A3M1 is won (data until T608 lifts the stub)", () => {
    expect(TOWER_ACCESS.bloom).toMatchObject({
      how: 'attune',
      currency: 'intel',
      price: 3,
      availableAfter: 'a3_m01',
      requires: 'prism',
    });
    const item = { kind: 'attune', tower: 'bloom' } as const;
    const after = DEV_SAVES.after_a3m1_cleared.build();
    expect(after.campaign.maps.a3_m01?.completed).toBe(true);
    if (stubTowerGate('bloom') !== null) {
      // A stub isn't on the shelf yet; the row goes up when the Bloom's task lifts its gate.
      expect(offerFor(after, item)).toBeNull();
      return;
    }
    expect(offerFor(DEV_SAVES.after_a2m6.build(), item)?.refusal).toBe('not_stocked');
    expect(['short', null]).toContain(offerFor(after, item)?.refusal);
  });
});
