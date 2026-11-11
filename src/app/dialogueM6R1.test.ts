// M6 review round 1, dialogue in a battle (D143): the SEAL's permission line (`whenSceneTyped`:
// R2), a revocation that takes Bricks's named turret (R5: the plate goes, his `tower_revoked` line
// queues, never the sold bark), a leak line shown in the wave panel's slot isn't said again on the
// radio (R13), and Bricks's "Build what you've got." plays under par's real A3M2 timing (R6).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARKS, SCENES } from '../content/dialogue/index.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { createSim, type SimEvent } from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { revokedHud } from '../ui/hud/revokedState.ts';
import { hud, screen } from '../ui/state.ts';
import { startAutoplay } from './autoplay.ts';
import { battleConfig } from './battleSetup.ts';
import { setCommandTarget, setSpeed } from './commands.ts';
import {
  bindDialogue,
  nextScene,
  setDialogueEnabled,
  skipScene,
  whenSceneTyped,
} from './dialogue.ts';
import { TICK_MS, createHost, type Host } from './host.ts';
import { initSaves } from './save.ts';

vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

type Ev = SimEvent<IdSpace>;
const noop = (): void => {};
const shown = (): string | null => dialogue.comms.value?.line.text ?? null;
const text = (id: string): string => BARKS[id]?.text ?? `<no bark ${id}>`;

let unbind: () => void = noop;
let host: Host<IdSpace>;

const emit = (e: Ev): void => host.bus.emit(e);

/** Binds the radio to a fresh battle on `map` (the reference profile's par setup). */
function bind(map: string): void {
  host = createHost(createSim(battleConfig(map, 1, null)));
  setCommandTarget({
    host,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- nothing here arms or aims
    interaction: {} as BattleInteraction,
    cancel: noop,
  });
  setSpeed(1);
  unbind = bindDialogue(host, { briefing: false, newTowers: [] });
  vi.advanceTimersByTime(30_000);
}

beforeEach(() => {
  vi.useFakeTimers();
  setDialogueEnabled(true);
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  screen.value = 'battle';
  revokedHud.value = { ...revokedHud.value, previewHidden: false, leakLine: null };
});
afterEach(() => {
  unbind();
  unbind = noop;
  while (skipScene());
  setCommandTarget(null);
  vi.useRealTimers();
  screen.value = null;
  revokedHud.value = { ...revokedHud.value, previewHidden: false, leakLine: null };
});

describe("the SEAL's permission line (R2)", () => {
  it("goes on once the cue's last line has typed, not before", () => {
    bind('a3_m03');
    const given = { n: 0 };
    whenSceneTyped('a3_m03_cue_seal', () => given.n++);
    emit({ type: 'ScriptCue', cueId: 'a3_m03_cue_seal' });
    expect(shown()).toBe("That's all we're getting through.");
    expect(given.n).toBe(0);
    // Three lines on, "Do it, {name}." shows and types; then permission.
    for (let i = 0; i < 40; i++) {
      if (given.n > 0) break;
      vi.advanceTimersByTime(500);
    }
    expect(given.n).toBe(1);
    expect(shown()).toMatch(/^Do it, /);
    // Already typed: a later waiter goes on at once.
    whenSceneTyped('a3_m03_cue_seal', () => given.n++);
    expect(given.n).toBe(2);
  });

  it('with the radio off, nothing waits', () => {
    setDialogueEnabled(false);
    bind('a3_m03');
    let given = 0;
    whenSceneTyped('a3_m03_cue_seal', () => given++);
    expect(given).toBe(1);
  });
});

describe("the Clean Exit takes Lucky's turret (R5)", () => {
  it('takes the plate, queues his tower_revoked line, and never the sold bark', () => {
    bind('a3_m02');
    emit({ type: 'TowerBuilt', uid: 1, tower: 'thumper', tile: [0, 0], cost: 0 });
    emit({ type: 'TowerBuilt', uid: 2, tower: 'rivet', tile: [1, 0], cost: 0 });
    emit({ type: 'WaveCleared', wave: 1, bonus: 0 });
    expect(hud.nameTag.value?.uid).toBe(1);
    vi.advanceTimersByTime(30_000);
    emit({ type: 'TowerRevoked', uid: 1, tower: 'thumper', refund: 0 });
    expect(hud.nameTag.value).toBeNull();
    const heard: string[] = [];
    for (let i = 0; i < 40; i++) {
      const t = shown();
      if (t !== null && !heard.includes(t)) heard.push(t);
      vi.advanceTimersByTime(250);
    }
    expect(heard).toContain(text('bricks_tower_revoked_a3_02'));
    const sold = Object.values(BARKS).filter((b) => b.trigger.on === 'tower_sold');
    expect(heard.some((h) => sold.some((b) => b.text === h))).toBe(false);
  });
});

describe('a leak line in the wave panel is said once (R13)', () => {
  const leak = Object.values(SCENES).find((s) => s.id.startsWith('a3_m02_cue_leak_'));
  it('with the preview locked, the slot has it and the radio stays quiet', () => {
    expect(leak).toBeDefined();
    bind('a3_m02');
    revokedHud.value = { ...revokedHud.value, previewHidden: true };
    host.bus.emit({ type: 'ScriptCue', cueId: leak!.id }); // found above
    expect(revokedHud.value.leakLine).not.toBeNull();
    expect(dialogue.comms.value).toBeNull();
  });

  it('with the preview open, it still plays on the radio', () => {
    bind('a3_m02');
    host.bus.emit({ type: 'ScriptCue', cueId: leak!.id }); // found above
    expect(dialogue.comms.value).not.toBeNull();
  });
});

describe('"Build what you\'ve got." under par\'s A3M2 (R6)', () => {
  it('waits behind a line on the panel after a revocation, instead of dropping', () => {
    bind('a3_m02');
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets the run's stat
    (host.sim.state.stats as { revocations: number }).revocations = 1;
    host.bus.emit({ type: 'ScriptCue', cueId: 'a3_m02_cue_name_tag' });
    const radio = shown();
    expect(radio).not.toBeNull();
    host.bus.emit({ type: 'TowerBuilt', uid: 9, tower: 'rivet', tile: [0, 0], cost: 0 });
    // The panel's line holds; the bark waits behind it, then plays.
    expect(shown()).toBe(radio);
    const heard: string[] = [];
    for (let i = 0; i < 80; i++) {
      const t = shown();
      if (t !== null && !heard.includes(t)) heard.push(t);
      vi.advanceTimersByTime(250);
    }
    expect(heard).toContain(text('bricks_tower_built_a3_02'));
  });

  it('plays after the Clean Exit, in real time at 1×, through the panel and the leak line', () => {
    bind('a3_m02');
    startAutoplay(host, 'par');
    const want = text('bricks_tower_built_a3_02');
    let heard = false;
    let sinceNext = 0;
    for (let f = 0; f < 60 * 60 * 20 && !heard; f++) {
      host.frame(TICK_MS);
      vi.advanceTimersByTime(TICK_MS);
      if (shown() === want) heard = true;
      // A pausing panel (the Clean Exit cue) waits for Next: a player reads on every half second.
      if (dialogue.scene.value !== null && (sinceNext += TICK_MS) >= 500) {
        sinceNext = 0;
        nextScene();
      }
      if (host.sim.state.outcome !== 'playing') break;
    }
    expect(host.sim.state.stats.revocations).toBeGreaterThan(0);
    expect(heard).toBe(true);
  });
});
