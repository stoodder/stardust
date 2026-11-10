// T431, the HUD: the objective tracker follows the sim (D090), the "Checkpoint" cue, the Spare
// runners teach, the name tag's signal, flak splash on the stat line, the locked tier-4 copy, the
// threat strip's "Hollow clusters", and slot 2's companion.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { nameTagImage, nameTagText } from '../render/vfx/nameTagPixels.ts';
import { createSim, towerStats, type SimEvent, type SimState } from '../sim/index.ts';
import { pickHint } from '../ui/hud/Notices.tsx';
import { hud, screen } from '../ui/state.ts';
import { startAutoplay } from './autoplay.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import { bindDialogue, setDialogueEnabled } from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import {
  bindHud,
  CHECKPOINT_CUE_MS,
  hudSaveInfo,
  runnerWaves,
  SPARE_HINT_WAVES,
  spareRunnersHintShows,
  type HudSaveInfo,
} from './hud.ts';
import { specLockText, statLineText, threatLabel } from './hudText.ts';
import { abilitySlots, companionView, threatNames } from './hudViews.ts';
import { initSaves } from './save.ts';

type H = Host<IdSpace>;

/** The save as the HUD reads it, without one: `over` changes a field. */
function saveInfo(mapId: string, loadout: readonly string[], over: Partial<HudSaveInfo> = {}) {
  return { ...hudSaveInfo(mapId, loadout), ...over };
}

/** A paused host on `mapId` with the HUD bound; `over` changes what the HUD reads of the save. */
function hudOn(mapId: string, over: Partial<HudSaveInfo> = {}): { host: H; unbind: () => void } {
  const host = createHost(createSim(battleConfig(mapId, 7)), { now: () => 0, speed: 0 });
  const unbind = bindHud(host, new BattleInteraction(), {
    briefing: false,
    save: saveInfo(mapId, host.sim.config.loadout, over),
  });
  return { host, unbind };
}

/** Steps `host` a tick at a time (dispatching each) until `done`, or throws. */
function stepUntil(host: H, done: () => boolean, max = 60 * 60 * 20): void {
  for (let i = 0; i < max; i++) {
    if (done()) return;
    host.fastForward(1);
  }
  throw new Error(`stepUntil: not done after ${max} ticks`);
}

/** The sim's state, writable (tests set it up directly). */
function mut(host: H): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return host.sim.state as unknown as SimState;
}

beforeEach(() => {
  vi.useFakeTimers();
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  setSpeed(1);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the objective tracker follows the sim (D090: objectiveStatusById)', () => {
  it("shows Clean Audit failed the moment a late sell fails it (A1M4's)", () => {
    const { host, unbind } = hudOn('a1_m04');
    expect(hud.objectives.value.map((o) => [o.id, o.status])).toEqual([['clean_audit', 'open']]);
    const map = host.sim.map;
    const pad = map.tiles.findIndex((t) => t === 'o');
    const tile: [number, number] = [pad % map.cols, Math.floor(pad / map.cols)];
    mut(host).credits = 10_000;
    host.sim.enqueue({ type: 'build', tile, tower: host.sim.config.loadout[0]! });
    host.fastForward(1);
    const uid = host.sim.state.towers.items.find((t) => t.alive)!.uid;
    host.sim.enqueue({ type: 'callWave' });
    stepUntil(host, () => host.sim.state.wave >= 1);
    host.fastForward(60 * 10); // past the misclick grace: a real (late) sale
    host.sim.enqueue({ type: 'sell', towerUid: uid });
    host.fastForward(1);
    expect(hud.objectives.value[0]?.status).toBe('failed');
    unbind();
    expect(hud.objectives.value).toEqual([]);
  });

  it("marks an objective the save holds (the briefing's On file)", () => {
    const { unbind } = hudOn('a2_m01', { heldObjectives: ['crew_logs'] });
    expect(hud.objectives.value.map((o) => [o.name, o.held])).toEqual([['Crew Logs', true]]);
    unbind();
  });
});

describe('the Checkpoint cue (core-loop §2.12)', () => {
  it("shows as W5's countdown takes the checkpoint, for a few seconds", () => {
    const { host, unbind } = hudOn('a2_m02');
    startAutoplay(host, 'par');
    expect(hud.checkpoint.value).toBeNull();
    stepUntil(host, () => host.checkpoints.length > 0);
    expect(hud.checkpoint.value?.wave).toBe(5);
    vi.advanceTimersByTime(CHECKPOINT_CUE_MS);
    expect(hud.checkpoint.value).toBeNull();
    unbind();
  }, 60_000);
});

describe('the Spare runners teach (A2M1)', () => {
  it('shows from the first wave with runners until the filter is used', () => {
    expect(runnerWaves(createSim(battleConfig('a2_m01', 1)).map.waves)[0]).toBe(true);
    expect(spareRunnersHintShows(true, true, false, true)).toBe(true);
    expect(spareRunnersHintShows(false, true, false, true)).toBe(false);
    expect(spareRunnersHintShows(true, false, false, true)).toBe(false);
    expect(spareRunnersHintShows(true, true, true, true)).toBe(false);
    expect(spareRunnersHintShows(true, true, false, true, SPARE_HINT_WAVES)).toBe(false);

    const { host, unbind } = hudOn('a2_m01', { spareRunnersOpen: true, spareRunnersTeach: true });
    expect(hud.spareRunnersTeach.value).toBe(false);
    host.sim.enqueue({ type: 'callWave' });
    stepUntil(host, () => host.sim.state.wave >= 1);
    host.fastForward(1);
    expect(hud.spareRunnersTeach.value).toBe(true);
    host.sim.enqueue({ type: 'spareRunners', target: 'all', on: true });
    host.fastForward(1);
    expect(hud.spareRunnersTeach.value).toBe(false);
    unbind();
  });

  it('never shows once A2M1 is won, or without the controls', () => {
    const { host, unbind } = hudOn('a2_m01', { spareRunnersOpen: true, spareRunnersTeach: false });
    host.sim.enqueue({ type: 'callWave' });
    stepUntil(host, () => host.sim.state.wave >= 1);
    host.fastForward(1);
    expect(hud.spareRunnersTeach.value).toBe(false);
    unbind();
  });

  it('takes the hint slot after the Time Dilation teach, before salvage', () => {
    const none = {
      holdFireOne: false,
      holdFireTeach: false,
      holdFireAll: false,
      timeDilation: false,
      salvage: false,
      upgrade: false,
      selected: false,
    };
    expect(pickHint({ ...none, spare: true, salvage: true, upgrade: true })).toBe('spare');
    expect(pickHint({ ...none, spare: true, timeDilation: true })).toBe('timeDilation');
  });
});

describe("Bricks's name tag (T431: the app's signal for the plate)", () => {
  beforeEach(() => {
    setDialogueEnabled(true);
    screen.value = 'battle';
  });
  afterEach(() => {
    screen.value = null;
  });

  it('goes on the earliest attacking turret at the first clear, and off when it is sold', () => {
    const host = createHost(createSim(battleConfig('a1_m02', 1, null)));
    const unbind = bindDialogue(host, { briefing: false, newTowers: [] });
    const emit = (e: SimEvent<IdSpace>): void => host.bus.emit(e);
    emit({ type: 'TowerBuilt', uid: 6, tower: 'rivet', tile: [0, 0], cost: 0 });
    emit({ type: 'TowerBuilt', uid: 7, tower: 'thumper', tile: [0, 0], cost: 0 });
    expect(hud.nameTag.value).toBeNull();
    emit({ type: 'WaveCleared', wave: 1, bonus: 0 });
    expect(hud.nameTag.value).toEqual({ uid: 6, text: 'Denise' });
    emit({ type: 'TowerSold', uid: 7, refund: 0 });
    expect(hud.nameTag.value?.uid).toBe(6);
    emit({ type: 'TowerSold', uid: 6, refund: 0 });
    expect(hud.nameTag.value).toBeNull();
    unbind();
  });

  it('draws the plate in the 3×5 font: capitals, nothing it has no glyph for', () => {
    expect(nameTagText('Auntie Funmi')).toBe('AUNTIE FUNMI');
    expect(nameTagText("O'Neil  Jr.")).toBe('ONEIL JR.');
    expect(nameTagText('x'.repeat(20))).toHaveLength(16);
    const img = nameTagImage('BISCUIT');
    // 4 px a character less 1, the font's 1 px pad each side, then the 1 px edge.
    expect([img.w, img.h]).toEqual([7 * 4 - 1 + 2 + 2, 5 + 2 + 2]);
    expect(img.data[3]).toBe(0); // a clipped corner
    expect(img.data[(1 * img.w + 0) * 4 + 3]).toBe(255); // the edge
  });
});

describe('the tower panel and the briefing words', () => {
  const sky = battleConfig('a1_m03', 1);

  it('shows a flak burst as splash on the stat line, Flak Curtain included', () => {
    const def = sky.content.towers.skyhook!;
    expect(statLineText(towerStats(def, 1), def.tiers[0])).toContain('splash 0.8');
    expect(statLineText(towerStats(def, 4, undefined, [], 'a'), def.specs!.a)).toContain(
      'splash 1.2',
    );
    // Seeker Swarm's missiles each hit their own target: no splash.
    expect(statLineText(towerStats(def, 4, undefined, [], 'b'), def.specs!.b)).not.toContain(
      'splash',
    );
  });

  it('names the map Engineering opens after, as the base does (D095, D102)', () => {
    expect(specLockText(false)).toBe('Engineering unlocks after The Audit');
    expect(specLockText(true)).toBe('Unlock in Engineering');
  });

  it('calls the Motes\' trait "Hollow clusters" (campaign.md § 4.8)', () => {
    expect(threatLabel('clustered')).toBe('Hollow clusters');
    expect(threatLabel('armored')).toBe('Armored');
    expect(threatNames(createSim(battleConfig('a2_m01', 1)).map)).toContain('Hollow clusters');
  });

  it("puts the companion's portrait on slot 2 (T216)", () => {
    const cfg = battleConfig('a2_m01', 1);
    expect(companionView('bricks')).toEqual({
      name: 'Bricks',
      portrait: 'portrait.bricks',
      color: 'orange.4',
    });
    expect(companionView(null)).toBeNull();
    const [one, two] = abilitySlots(cfg);
    expect(one?.companion).toBeNull();
    expect(two?.companion?.portrait).toBe('portrait.bricks');
  });
});
