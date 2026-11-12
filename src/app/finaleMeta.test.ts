// T809, the finale's app and meta layer: checkpoint labels ("Retry from the Halls", the HUD's cue,
// the notices), the Halls retry through the router on dev_bore, the Phase 2 countdown model
// (N × (1 − p)) and REMEMBERED: {n}, the companion pick (QUILL gone under Purge, Ves'thara by
// default, the Technician slot greyed beside the companion that brings its ability), the speaker
// rules (A1M5's party hats, Ves'thara's `dawn`, QUILL `damaged` after "Who's there?"), the forced
// input reused for the knock-knock, and the finale's rewards. The persisted resume is resume.test.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { SPEAKER_DEFS } from '../content/dialogue/speakers.ts';
import type { SpeakerId } from '../content/dialogue/types.ts';
import { forcedInputDef, WHOS_THERE_INPUT } from '../content/forcedInputs.ts';
import { RESULTS_FLOW } from '../content/dialogue/resultsFlow.ts';
import type { IdSpace } from '../content/types.ts';
import {
  companionChoices,
  createNewSave,
  medalPayout,
  pickedCompanion,
  stardustPayout,
  validateSave,
  withPreset,
  type SaveData,
} from '../meta/index.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { createSim, type SimConfig } from '../sim/index.ts';
import { evaluateCondition, type StoryContext } from '../story/conditions.ts';
import { runResult } from '../ui/screens/state.ts';
import { hud, screen, speed } from '../ui/state.ts';
import { startAutoplay } from './autoplay.ts';
import type { Battle, BattleStart } from './battle.ts';
import { battleConfig, slot1Beside } from './battleSetup.ts';
import { checkpointOf, checkpointPlace, retryLabel } from './checkpoints.ts';
import { countdownModel, countdownStart, trackCountdown } from './countdown.ts';
import { permissionSceneId, waitSceneId } from './forcedInput.ts';
import { createHost } from './host.ts';
import { createRouter, resumedNotice, type Router } from './router.ts';
import { checkpointPlaces, resultsStats } from './runResult.ts';
import { resumedNote } from '../ui/screens/Results.tsx';
import { RAW_CONTENT } from '../content/registry.ts';
import { objectivePayout } from '../meta/rewards.ts';

// A real sim and host per battle, without a scene (as checkpoints.test.ts).
vi.mock('./battle.ts', async () => {
  const { createSim: create } = await import('../sim/index.ts');
  const { createHost: host } = await import('./host.ts');
  return {
    startBattle: (
      _game: unknown,
      cfg: SimConfig<IdSpace>,
      _hud: unknown,
      start: BattleStart = {},
    ): Partial<Battle> => {
      const h = host(create(cfg), {
        now: () => 0,
        speed: 0,
        ...(start.resume === undefined ? {} : { resume: start.resume }),
      });
      start.listen?.(h);
      h.catchUp();
      return { host: h, firstFrame: Promise.resolve(), stop: () => undefined };
    },
  };
});
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const fakeGame: unknown = {
  scene: { isActive: () => false, start: () => undefined, stop: () => undefined },
};
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the parts the router uses
const game = fakeGame as Phaser.Game;

afterEach(() => {
  runResult.value = null;
});

describe('checkpoint labels (core-loop.md § 2.12; finale.md: "Retry from the Halls")', () => {
  it('checkpointOf keeps the sim\'s label; a wave checkpoint has none', () => {
    const log = [{ tick: 3 }, { tick: 9 }, { tick: 12 }];
    expect(checkpointOf({ wave: 18, tick: 10, label: 'halls' }, log)).toEqual({
      label: 'halls',
      wave: 18,
      tick: 10,
      commandCount: 2,
    });
    expect(checkpointOf({ wave: 5, tick: 10 }, log)).toEqual({ wave: 5, tick: 10, commandCount: 2 });
    expect(Object.hasOwn(checkpointOf({ wave: 5, tick: 10 }, log), 'label')).toBe(false);
  });

  it('names the place: "the Halls" for the label, "wave N" otherwise', () => {
    expect(checkpointPlace({ wave: 18, label: 'halls' })).toBe('the Halls');
    expect(checkpointPlace({ wave: 5 })).toBe('wave 5');
    expect(checkpointPlace({ wave: 2, label: 'somewhere' })).toBe('somewhere');
    expect(retryLabel({ wave: 18, label: 'halls' })).toBe('Retry from the Halls');
    expect(retryLabel({ wave: 10 })).toBe('Retry from wave 10');
    expect(resumedNotice(18, 'the Halls')).toBe(
      'Resumed at the Halls. Unpause when ready. Perfect Core and the Challenge need a shift from wave 1.',
    );
    expect(resumedNotice(5)).toMatch(/^Resumed before wave 5\. /);
    expect(resumedNote(18, 'the Halls')).toBe(
      'Resumed from the Halls: Perfect Core and the Challenge need a shift from wave 1.',
    );
    expect(resumedNote(5)).toMatch(/^Resumed from wave 5:/);
  });

  it("gives the card a labelled loss's retry button and a resumed run's place", () => {
    expect(checkpointPlaces({ checkpointWave: 18, checkpointLabel: 'halls' }, 'lost')).toEqual({
      retryLabel: 'Retry from the Halls',
    });
    expect(checkpointPlaces({ checkpointWave: 10, checkpointLabel: null }, 'lost')).toEqual({
      retryLabel: 'Retry from wave 10',
    });
    // A win offers no retry; a resumed run names where it picked up only when labelled.
    expect(checkpointPlaces({ checkpointWave: 10 }, 'won')).toEqual({});
    expect(
      checkpointPlaces({ resumedFromWave: 18, resumedFromLabel: 'halls' }, 'won'),
    ).toEqual({ resumedPlace: 'the Halls' });
    expect(checkpointPlaces({ resumedFromWave: 5, resumedFromLabel: null }, 'won')).toEqual({});
  });
});

describe('the Halls retry through the router (dev_bore)', () => {
  let router: Router;
  const host = () => {
    const b = router.battle;
    if (b === null) throw new Error('no battle');
    return b.host;
  };
  const step = (until: () => boolean, max = 60 * 60 * 5): void => {
    for (let i = 0; i < max && !until(); i++) host().fastForward(1);
    if (!until()) throw new Error(`not done by tick ${host().sim.state.tick}`);
  };

  it(
    'cues "The Halls", offers "Retry from the Halls" after a loss, and resumes in Phase 2',
    async () => {
      router = createRouter(game, { mapId: 'dev_bore', seed: 1 });
      await router.goto('battle');
      startAutoplay(host(), 'par');
      step(() => host().sim.state.phase >= 2);
      const halls = host().checkpoints.at(-1)!;
      expect(halls.label).toBe('halls');
      // The HUD's cue isn't bound here (no HUD); its text is the capitalized place.
      const hash = host().sim.hash();
      host().fastForward(60 * 3);
      await router.endRun('lost');
      const card = runResult.value!;
      expect(card.retryFromWave).toBe(halls.wave);
      expect(card.retryLabel).toBe('Retry from the Halls');

      await router.retryFromCheckpoint();
      expect(screen.value).toBe('battle');
      const h = host();
      expect(h.resumedFrom).toEqual(halls);
      expect(h.sim.state.phase).toBe(2);
      expect(h.sim.hash()).toBe(hash);
      expect(speed.value).toBe(0);
      expect(hud.notice.value?.text).toBe(resumedNotice(halls.wave, 'the Halls'));

      // Won from there: the card says it resumed from the Halls.
      startAutoplay(h, 'par');
      step(() => h.sim.state.outcome !== 'playing');
      await router.flushResults();
      expect(runResult.value?.outcome).toBe('won');
      expect(runResult.value?.resumedPlace).toBe('the Halls');
      expect(runResult.value?.retryLabel).toBeUndefined();
    },
    60_000,
  );
});

describe('the Phase 2 countdown (maps.md § 5.5: N × (1 − p))', () => {
  it('N is the lifetime count plus the kills not yet filed as Phase 2 began', () => {
    expect(countdownStart(1234, 0, 0)).toBe(1234);
    expect(countdownStart(1234, 40, 0)).toBe(1274);
    // A retry from the Halls: the replayed kills were filed by the attempt before.
    expect(countdownStart(1274, 40, 40)).toBe(1274);
    expect(countdownStart(1274, 30, 40)).toBe(1274);
  });

  it('falls as rest progress rises, to 0 at the target', () => {
    expect(countdownModel(1000, 0, 400)).toEqual({ start: 1000, progress: 0, shown: 1000 });
    expect(countdownModel(1000, 100, 400)).toEqual({ start: 1000, progress: 0.25, shown: 750 });
    expect(countdownModel(1000, 398, 400).shown).toBe(5); // round(1000 × 0.005)
    expect(countdownModel(1000, 400, 400)).toEqual({ start: 1000, progress: 1, shown: 0 });
    expect(countdownModel(1000, 999, 400).progress).toBe(1); // clamped
    expect(countdownModel(1000, 5, 0).shown).toBe(0); // no target reads as done
  });

  it('the tracker records Phase 2\'s kills, and models only Phase 2 (dev_bore)', () => {
    const h = createHost(createSim(battleConfig('dev_bore', 1)), { now: () => 0, speed: 0 });
    const t = trackCountdown(h);
    startAutoplay(h, 'par');
    expect(t.start(500)).toBeNull();
    expect(t.model(500)).toBeNull();
    for (let i = 0; i < 60 * 60 * 5 && h.sim.state.phase < 2; i++) h.fastForward(1);
    expect(h.sim.state.phase).toBe(2);
    expect(t.killsAtStart).toBe(h.sim.state.stats.skitterkinKilled);
    expect(t.start(500)).toBe(500 + (t.killsAtStart ?? 0));
    // dev_bore has no song: no rest target, so the counter reads done (0).
    expect(t.model(500)).toEqual({ start: t.start(500), progress: 1, shown: 0 });
    t.off();
  });
});

describe('the companion pick (core-loop.md § 3.1; finale.md § FIN)', () => {
  const PICK = { pick: ['vesthara', 'bramble', 'zibzab', 'quill'] } as const;
  const keep = (flag: 'keep' | 'purge' | 'rewrite'): SaveData => {
    const s = createNewSave();
    s.story.flags = { quill_choice: flag };
    return s;
  };

  it('offers the list in order; QUILL is gone under Purge', () => {
    expect(companionChoices(keep('keep'), PICK)).toEqual(['vesthara', 'bramble', 'zibzab', 'quill']);
    expect(companionChoices(keep('rewrite'), PICK)).toEqual(PICK.pick);
    expect(companionChoices(keep('purge'), PICK)).toEqual(['vesthara', 'bramble', 'zibzab']);
    expect(companionChoices(null, PICK)).toEqual(PICK.pick);
    // No pick list, no choices.
    expect(companionChoices(keep('keep'), { id: 'bricks', state: 'present' })).toEqual([]);
    expect(companionChoices(keep('keep'), null)).toEqual([]);
  });

  it("picks the preset's companion while offered, else the first (Ves'thara)", () => {
    const save = DEV_SAVES.all_unlocked.build();
    const choices = companionChoices(save, PICK);
    expect(pickedCompanion(save, 'a3_m06', choices)).toBe('vesthara');
    const picked = withPreset(save, 'a3_m06', {
      towers: ['rivet'],
      ability: 'orbital_strike',
      companion: 'quill',
    });
    expect(picked.loadouts.byMap.a3_m06).toEqual({
      towers: ['rivet'],
      ability: 'orbital_strike',
      companion: 'quill',
    });
    // The last-used preset never carries a companion.
    expect(picked.loadouts.last).toEqual({ towers: ['rivet'], ability: 'orbital_strike' });
    expect(pickedCompanion(picked, 'a3_m06', choices)).toBe('quill');
    // Purged since: back to the default.
    picked.story.flags = { quill_choice: 'purge' };
    expect(pickedCompanion(picked, 'a3_m06', companionChoices(picked, PICK))).toBe('vesthara');
  });

  it('validates a preset companion: optional, a known companion', () => {
    const save = withPreset(DEV_SAVES.all_unlocked.build(), 'a3_m06', {
      towers: ['rivet'],
      ability: 'orbital_strike',
      companion: 'bramble',
    });
    expect(validateSave(JSON.parse(JSON.stringify(save))).ok).toBe(true);
    const bad: unknown = JSON.parse(JSON.stringify(save));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- staging a bad field
    (bad as { loadouts: { byMap: Record<string, { companion: string }> } }).loadouts.byMap[
      'a3_m06'
    ]!.companion = 'gerald';
    const r = validateSave(bad);
    expect(r.ok).toBe(false);
  });

  it('slot 1 gives way to what the companion brings (T501: Time Dilation beside QUILL)', () => {
    const content = battleConfig('a1_m01', 1).content;
    const pool = ['time_dilation', 'orbital_strike', 'suppressing_fire'];
    expect(slot1Beside(content, 'time_dilation', 'quill', pool)).toBe('orbital_strike');
    expect(slot1Beside(content, 'time_dilation', 'vesthara', pool)).toBe('time_dilation');
    expect(slot1Beside(content, 'suppressing_fire', 'bricks', pool)).toBe('time_dilation');
    expect(slot1Beside(content, 'orbital_strike', null, pool)).toBe('orbital_strike');
    expect(slot1Beside(content, 'time_dilation', 'quill', ['time_dilation'])).toBeNull();
  });

  it('a fixed loadout (the persisted run) plays as it was, its companion included', () => {
    const save = DEV_SAVES.all_unlocked.build();
    const cfg = battleConfig('a1_m05', 3, save, {
      towers: ['rivet', 'zapcoil'],
      ability: 'orbital_strike',
      companion: 'bricks',
    });
    expect(cfg.loadout).toEqual(['rivet', 'zapcoil']);
    expect(cfg.abilities.slot1).toBe('orbital_strike');
    expect(cfg.companion).toBe('bricks');
  });
});

/** The variant a speaker's portrait shows in `ctx` (app/dialogue.ts lineView's rule, minus silences). */
function variantIn(speaker: SpeakerId, ctx: StoryContext): string | null {
  return (
    SPEAKER_DEFS[speaker].variants.find(
      (r) => r.silenceOnly !== true && evaluateCondition(r.when, ctx),
    )?.variant ?? null
  );
}

describe('speaker rules (T809)', () => {
  const base: StoryContext = { flags: {}, map: 'a1_m05', pestsProcessed: 0, seen: [], run: null };

  it('A1M5 is a party: all five, and QUILL, in hats the whole map', () => {
    for (const id of ['bricks', 'sterling', 'kip', 'goldie', 'zibzab', 'quill'] as const) {
      expect(variantIn(id, base), id).toBe('party_hat');
      expect(variantIn(id, { ...base, map: 'a1_m04' }), id).not.toBe('party_hat');
    }
  });

  const fin: StoryContext = { ...base, map: 'fin_m01', flags: { quill_choice: 'keep' } };
  const live = (phase: number, resolved: readonly string[] = []): StoryContext => ({
    ...fin,
    liveScript: { phase, resolved },
  });

  it("Ves'thara wears `dawn` from Phase 3 (live or the ended run's), and off the map after Dawn", () => {
    expect(variantIn('vesthara', live(2))).toBe('touched_deep');
    expect(variantIn('vesthara', live(3))).toBe('dawn');
    const ended: StoryContext = {
      ...fin,
      run: { outcome: 'won', ruleFlags: {}, script: { phase: 3, resolved: [] } },
    };
    expect(variantIn('vesthara', ended)).toBe('dawn');
    // A replay of the finale starts before Dawn, the scene seen or not.
    expect(variantIn('vesthara', { ...live(1), seen: ['fin_m01_scene_dawn'] })).toBe('touched_deep');
    // The post-game: no run, off the finale.
    const after: StoryContext = { ...base, map: 'a3_m06', seen: ['fin_m01_scene_dawn'] };
    expect(variantIn('vesthara', after)).toBe('dawn');
    // The scene the rule names is the finale's before-Results scene.
    expect(RESULTS_FLOW.fin_m01?.beforeResults).toContain('fin_m01_scene_dawn');
  });

  it('QUILL is `damaged` under Keep once "Who\'s there?" is answered, never otherwise', () => {
    expect(variantIn('quill', live(2))).toBeNull();
    expect(variantIn('quill', live(2, [WHOS_THERE_INPUT]))).toBe('damaged');
    expect(variantIn('quill', live(3, [WHOS_THERE_INPUT]))).toBe('damaged');
    const rewrite = { ...live(2, [WHOS_THERE_INPUT]), flags: { quill_choice: 'rewrite' } };
    expect(variantIn('quill', rewrite as StoryContext)).toBeNull();
    const purge = { ...live(2), flags: { quill_choice: 'purge' } } as StoryContext;
    expect(variantIn('quill', purge)).toBe('purge');
    // The epilogue reads the ended run's script.
    const ended: StoryContext = {
      ...fin,
      run: { outcome: 'won', ruleFlags: {}, script: { phase: 3, resolved: [WHOS_THERE_INPUT] } },
    };
    expect(variantIn('quill', ended)).toBe('damaged');
  });

  it('phaseAtLeast and inputResolved are false outside a run', () => {
    expect(evaluateCondition({ phaseAtLeast: 1 }, fin)).toBe(false);
    expect(evaluateCondition({ inputResolved: WHOS_THERE_INPUT }, fin)).toBe(false);
    expect(evaluateCondition({ phaseAtLeast: 1 }, live(1))).toBe(true);
    expect(evaluateCondition({ phaseAtLeast: 2 }, live(1))).toBe(false);
  });
});

describe('"Who\'s there?" reuses the forced input (core-loop.md § 2.11)', () => {
  it('labels the button, waits on Directive 0\'s cue, and hums nothing', () => {
    expect(forcedInputDef(WHOS_THERE_INPUT)).toEqual({
      label: "Who's there?",
      permission: 'directive0',
      hum: null,
    });
    expect(permissionSceneId('fin_m01', WHOS_THERE_INPUT)).toBe('fin_m01_cue_directive0');
    expect(waitSceneId('fin_m01', WHOS_THERE_INPUT)).toBe('fin_m01_cue_whos_there_wait');
    // A3M3's SEAL as before.
    expect(forcedInputDef('seal')).toEqual({ label: 'SEAL', hum: 'door_hum' });
    expect(permissionSceneId('a3_m03', 'seal')).toBe('a3_m03_cue_seal');
    expect(forcedInputDef('mystery')).toEqual({ label: 'MYSTERY', hum: null });
  });
});

describe("the finale's Results and rewards (finale.md § FIN)", () => {
  it('lists Voices in Core integrity\'s place on a choir map', () => {
    const r = {
      wavesSurvived: 26,
      waveCount: 26,
      integrity: 20,
      maxIntegrity: 20,
      escort: null,
      asset: null,
    };
    expect(resultsStats({ ...r, voices: { n: 7, total: 10 } }).map((s) => s.id)).toEqual([
      'waves',
      'voices',
    ]);
    expect(resultsStats({ ...r, voices: { n: 7, total: 10 } })[1]?.value).toBe('7 / 10');
    expect(resultsStats(r).map((s) => s.id)).toEqual(['waves', 'integrity']);
  });

  it('pays 500 Stardust on the first clear, and Intel 3 (+1 for Waymarks)', () => {
    const pay = stardustPayout({
      won: true,
      wonBefore: false,
      stardust: 500,
      wavesResolved: 26,
      waveCount: 26,
      veteranBonus: 0,
    });
    expect(pay.amount).toBe(500);
    const medals = medalPayout([], ['victory', 'perfect', 'challenge']);
    expect(medals.reduce((n, m) => n + m.intel, 0)).toBe(3);
    const obj = objectivePayout([], [{ id: 'waymarks', intel: 1 }]);
    expect(obj.reduce((n, o) => n + o.intel, 0)).toBe(1);
  });

  it.runIf(Object.hasOwn(RAW_CONTENT.maps, 'fin_m01'))(
    "the registered finale's data matches: 500 Stardust, Waymarks +1, Ves'thara first",
    () => {
      const map = Object.values(RAW_CONTENT.maps).find((m) => m.id === 'fin_m01')!;
      expect(map.stardust).toBe(500);
      expect(map.objectives?.map((o) => o.intel)).toEqual([1]);
      expect(companionChoices(null, map.companion)[0]).toBe('vesthara');
      expect(map.act).toBe('finale');
    },
  );
});
