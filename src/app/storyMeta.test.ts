// Act III part one's meta in the app (T610; D141): briefing gifts into the save in play, what run
// end reads (revocations, the {name} turret), the restart a briefing's C3 calls for, C3 committed
// once, its 700 ms lock, and the Results views (gift stones, the refund row, the held card).
import { beforeEach, describe, expect, it } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { MemoryStore, createNewSave, type RunEndSummary, type SaveData } from '../meta/index.ts';
import { runEnd } from '../meta/runEnd.ts';
import { battleConfig } from './battleSetup.ts';
import { isStoryChoice, LOCKED_CHOICE_FLAGS, withSceneEffects } from './dialogue.ts';
import { giftStones, runResultOf, runRewardsOf, type RunEndInput } from './runResult.ts';
import { activeSave, initSaves, loadDevSave } from './save.ts';
import {
  grantBriefingGifts,
  memorialAtEnd,
  revocationView,
  revokedAtEnd,
  scriptFlagsChanged,
} from './storyMeta.ts';

const NO_EFFECTS = { flags: {}, callsign: null } as const;

/** A tag def whose plate reads the player's name (A3M3's). */
const named = () => ({ name: '{name}' });

/** A save with C3 set (or not). */
function withDoor(door?: 'convoy' | 'warren'): SaveData {
  const save = createNewSave();
  if (door !== undefined) save.story.flags.door_choice = door;
  return save;
}

describe('briefing gifts (D141: as the loadout first opens)', () => {
  beforeEach(() => initSaves(new MemoryStore()));

  it("gives A3M1's Scuttle Den into the save in play, once", () => {
    expect(grantBriefingGifts('a3_m01')).toEqual([]); // no save in play
    expect(loadDevSave('after_a2m6')).toBe(true);
    expect(activeSave()?.unlocks.towers).not.toContain('burrow');
    expect(grantBriefingGifts('a3_m01')).toEqual([{ kind: 'gift', tower: 'burrow' }]);
    expect(activeSave()?.unlocks.towers).toContain('burrow');
    expect(grantBriefingGifts('a3_m01')).toEqual([]);
    // Another map, or a dev map, gives nothing.
    expect(grantBriefingGifts('a2_m06')).toEqual([]);
    expect(grantBriefingGifts('dev_holdout')).toEqual([]);
  });
});

describe('what run end reads from the battle', () => {
  it("keeps the script's revocations that name live ids", () => {
    expect(
      revokedAtEnd({ towers: ['rivet', 'nope'], abilities: ['orbital_strike', 'nope'] }),
    ).toEqual({ towers: ['rivet'], abilities: ['orbital_strike'] });
  });

  it("passes the factions of the class cues that fired, for towers.md § 9's map-end class", () => {
    const events = [
      { actions: [{ cue: 'a3_m02_cue_revoke' }] },
      {
        actions: [
          { revokeTowerClass: { select: 'mostInvested', faction: 'everglow' }, refundPct: 100 },
        ],
      },
      { actions: [{ revokeTowerClass: { select: 'mostInvested' }, refundPct: 100 }] },
    ] as const;
    const none = { towers: [], abilities: [] };
    // A run lost before the cue fired: nothing at map end.
    expect(revokedAtEnd(none, events, [true, false, false])).toEqual(none);
    expect(revokedAtEnd(none, events, [true, true, false]).atMapEnd).toEqual(['everglow']);
    expect(revokedAtEnd(none, events, [true, true, true]).atMapEnd).toEqual(['everglow', null]);
  });

  const towers = {
    used: 3,
    items: [
      { uid: 4, alive: true, def: { id: 'rivet' } },
      { uid: 7, alive: true, def: { id: 'burrow' } },
      { uid: 9, alive: false, def: { id: 'thumper' } },
    ],
  };
  const sim = (id: string) => ({ map: { id }, state: { towers } });

  it('reads the turret under the {name} plate, on a map whose tag carries it', () => {
    expect(memorialAtEnd(sim('a3_m03'), { uid: 7 }, named)).toBe('burrow');
    // No plate, a gone turret, another map's tag, or a dev map: none.
    expect(memorialAtEnd(sim('a3_m03'), null, named)).toBeNull();
    expect(memorialAtEnd(sim('a3_m03'), { uid: 9 }, named)).toBeNull();
    expect(memorialAtEnd(sim('a3_m02'), { uid: 7 }, () => ({ name: 'Lucky' }))).toBeNull();
    expect(memorialAtEnd(sim('dev_holdout'), { uid: 7 }, named)).toBeNull();
    // The live tag list puts `{name}` on A3M3 only.
    expect(memorialAtEnd(sim('a3_m03'), { uid: 7 })).toBe('burrow');
    expect(memorialAtEnd(sim('a2_m05'), { uid: 7 })).toBeNull();
  });
});

describe("C3 in A3M3's briefing (D141)", () => {
  it('restarts the battle only when the committed door differs from the one it was built on', () => {
    // A battle built before the answer opens the first door its flagVariants list (the convoy).
    const cfg = battleConfig('dev_holdout', 1, withDoor());
    expect(cfg.scriptFlags.door_choice).toBe('convoy');
    expect(scriptFlagsChanged(cfg, withDoor())).toBe(false);
    expect(scriptFlagsChanged(cfg, withDoor('convoy'))).toBe(false);
    expect(scriptFlagsChanged(cfg, withDoor('warren'))).toBe(true);
    expect(scriptFlagsChanged(cfg, null)).toBe(false);
    // Rebuilt on the answer, it matches.
    const warren = battleConfig('dev_holdout', 1, withDoor('warren'));
    expect(warren.scriptFlags.door_choice).toBe('warren');
    expect(scriptFlagsChanged(warren, withDoor('warren'))).toBe(false);
    // A map no flag gates never restarts.
    expect(scriptFlagsChanged(battleConfig('a1_m01', 1, withDoor()), withDoor('warren'))).toBe(
      false,
    );
  });

  it('commits the door as the briefing closes, and never changes it after', () => {
    const save = withDoor();
    const first = withSceneEffects(save, 'a3_m03_brief', {
      ...NO_EFFECTS,
      flags: { door_choice: 'warren' },
    });
    expect(first.story.flags.door_choice).toBe('warren');
    expect(first.story.seen).toContain('a3_m03_brief');
    const again = withSceneEffects(first, 'a3_m03_brief', {
      ...NO_EFFECTS,
      flags: { door_choice: 'convoy', held_fire_second_look: true },
    });
    expect(again.story.flags.door_choice).toBe('warren');
    // The scene's other flags still land.
    expect(again.story.flags.held_fire_second_look).toBe(true);
  });

  it("locks and holds C3's choice only (D141), not every choice that sets a flag", () => {
    expect(LOCKED_CHOICE_FLAGS).toEqual(['door_choice']);
    expect(
      isStoryChoice([{ set: { door_choice: 'convoy' } }, { set: { door_choice: 'warren' } }]),
    ).toBe(true);
    // A1M3's early ask and A2M4's C2 (whose card has its own lock, D138) take a press at once.
    expect(isStoryChoice([{ set: { asked_zibzab_early: true } }, {}])).toBe(false);
    expect(isStoryChoice([{ set: { stardust_choice: 'sold' } }])).toBe(false);
    expect(isStoryChoice([{}, {}])).toBe(false);
  });
});

/** A finished run's facts, for the card. */
function input(mapId: string, act: 1 | 2 | 3): RunEndInput {
  return {
    mapId,
    act,
    waveCount: 14,
    maxIntegrity: 20,
    integrity: 20,
    skitterkinKilled: 0,
    wavesCleared: 14,
    firstLeakAgo: null,
    stardust: 300,
    medals: [],
    earnedMedals: ['victory'],
  };
}

describe('Results in Act III (core-loop.md § 6.2)', () => {
  it('shows the Stardust as gift stones in Act III and the finale', () => {
    const acts = [1, 2, 3, 'finale'] as const;
    expect(acts.map((a) => giftStones(a))).toEqual([false, false, true, true]);
    const summary = runEnd(createNewSave(), {
      mapId: 'a1_m01',
      outcome: 'won',
      mapStardust: 300,
      waveCount: 14,
      wavesResolved: 14,
      earnedMedals: ['victory'],
      skitterkinKilled: 0,
      meter: 20,
    }).summary;
    expect(runRewardsOf(input('a3_m02', 3), summary).stones).toBe(true);
    expect(runRewardsOf(input('a2_m06', 2), summary).stones).toBe(false);
  });

  it('lists the revocations, the uplink with its refund row', () => {
    expect(revocationView({ kind: 'revoke_tower', tower: 'rivet' })).toEqual({
      kind: 'tower',
      name: 'Rivet',
    });
    expect(
      revocationView({
        kind: 'revoke_ability',
        ability: 'orbital_strike',
        refund: { upgrade: 'orbital_strike_mk2', currency: 'intel', amount: 2 },
      }),
    ).toEqual({
      kind: 'ability',
      name: 'Orbital Strike',
      refund: { name: 'Orbital Strike Mk II', currency: 'intel', amount: 2 },
    });
    const save = createNewSave();
    save.upgrades.orbital_strike_mk2 = 1;
    const end = runEnd(save, {
      mapId: 'a1_m01',
      outcome: 'won',
      mapStardust: 300,
      waveCount: 14,
      wavesResolved: 14,
      earnedMedals: ['victory'],
      skitterkinKilled: 0,
      meter: 20,
      revoked: { towers: ['thumper'], abilities: ['orbital_strike'] },
    });
    const summary: RunEndSummary = end.summary;
    expect(runRewardsOf(input('a3_m02', 3), summary).revocations).toEqual([
      { kind: 'tower', name: 'Thumper' },
      {
        kind: 'ability',
        name: 'Orbital Strike',
        refund: { name: 'Orbital Strike Mk II', currency: 'intel', amount: 2 },
      },
    ]);
  });

  it("holds A3M3's rewards back for the base (its presentation dial), no other card's", () => {
    expect(runResultOf(input('a3_m03', 3), 'won').heldRewards).toBe(true);
    expect(runResultOf(input('a3_m01', 3), 'won').heldRewards).toBe(false);
    expect(runResultOf(input('a1_m01', 1), 'won').heldRewards).toBe(false);
  });

  it('the dev saves carry what the app would have saved', () => {
    // After A3M1 (registered), both C1 branches own the Den from its briefing.
    for (const id of ['after_a3m1_spared', 'after_a3m1_cleared'] as const) {
      expect(DEV_SAVES[id].build().unlocks.towers).toContain('burrow');
    }
  });
});
