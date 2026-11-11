// M6 review round 2, dialogue in a battle (D144): Bricks's "Lucky too, huh." queued from the real
// Clean Exit cue (S2: held until the cue closes, never dropped by its beat's end or the stale
// clock), a locked choice right after another gets its own lock (S6), and the SEAL's permission
// (S5, S7).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARKS } from '../content/dialogue/index.ts';
import type { Scene } from '../content/dialogue/types.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { createSim, type SimEvent } from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { revokedHud } from '../ui/hud/revokedState.ts';
import { hud, screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setCommandTarget, setSpeed } from './commands.ts';
import {
  bindDialogue,
  chooseOption,
  nextScene,
  playScene,
  setDialogueEnabled,
  skipScene,
  STORY_CHOICE_LOCK_MS,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { startSeal } from './forcedInput.ts';
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
  for (let i = 0; i < 50 && skipScene(); i++); // a scene at a choice keeps taking Esc
  setCommandTarget(null);
  vi.useRealTimers();
  screen.value = null;
  revokedHud.value = { ...revokedHud.value, previewHidden: false, leakLine: null };
});

/** Lucky named (the Thumper, uid 1), then the panel left quiet. */
function nameLucky(): void {
  bind('a3_m02');
  emit({ type: 'TowerBuilt', uid: 1, tower: 'thumper', tile: [0, 0], cost: 0 });
  emit({ type: 'TowerBuilt', uid: 2, tower: 'rivet', tile: [1, 0], cost: 0 });
  emit({ type: 'WaveCleared', wave: 1, bonus: 0 });
  expect(hud.nameTag.value?.uid).toBe(1);
  vi.advanceTimersByTime(30_000);
}

/** Reads the Clean Exit cue out, a press every `everyMs`; what the radio said meanwhile and after. */
function readCueAndListen(everyMs: number, afterMs = 20_000): string[] {
  const heard: string[] = [];
  const listen = (): void => {
    const t = shown();
    if (t !== null && !heard.includes(t)) heard.push(t);
  };
  for (let i = 0; i < 200 && dialogue.scene.value !== null; i++) {
    listen();
    vi.advanceTimersByTime(everyMs);
    nextScene();
  }
  expect(dialogue.scene.value).toBeNull();
  for (let t = 0; t < afterMs; t += 250) {
    listen();
    vi.advanceTimersByTime(250);
  }
  return heard;
}

describe('"Lucky too, huh." from the real Clean Exit cue (S2)', () => {
  it('waits out the cue, then plays', () => {
    nameLucky();
    // The map script's order: the cue, then the revocation (content/maps/a3_m02 `clean_exit`).
    emit({ type: 'ScriptCue', cueId: 'a3_m02_cue_revoke' });
    expect(dialogue.scene.value?.sceneId).toBe('a3_m02_cue_revoke');
    emit({ type: 'TowerRevoked', uid: 1, tower: 'thumper', refund: 0 });
    expect(shown()).toBeNull(); // nothing over the cue
    expect(readCueAndListen(1500)).toContain(text('bricks_tower_revoked_a3_02'));
  });

  it('survives a cue read slower than the stale clock', () => {
    nameLucky();
    emit({ type: 'ScriptCue', cueId: 'a3_m02_cue_revoke' });
    emit({ type: 'TowerRevoked', uid: 1, tower: 'thumper', refund: 0 });
    expect(readCueAndListen(6000)).toContain(text('bricks_tower_revoked_a3_02'));
  });

  it('survives the revocation landing before the cue opens in the same tick', () => {
    nameLucky();
    emit({ type: 'TowerRevoked', uid: 1, tower: 'thumper', refund: 0 });
    emit({ type: 'ScriptCue', cueId: 'a3_m02_cue_revoke' });
    expect(readCueAndListen(1500)).toContain(text('bricks_tower_revoked_a3_02'));
  });
});

describe('a locked choice right after another (S6)', () => {
  const door = (text: string) =>
    ({
      kind: 'choice',
      options: [
        { text, tone: 'earnest', set: { door_choice: 'convoy' } },
        { text: `${text} No.`, tone: 'quiet', set: { door_choice: 'warren' } },
      ],
    }) as const;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test scene, not registered
  const scene = { id: 'dev_m6r2_twice', nodes: [door('First.'), door('Second.')] } as Scene;

  it('waits its own lock from when it shows', () => {
    vi.advanceTimersByTime(1000); // a clock past 0 (0 is "no choice showing")
    playScene(scene, { mode: 'fullscreen', record: false });
    const first = dialogue.scene.value?.choices?.[0]?.lockedUntil ?? 0;
    expect(first).toBeGreaterThan(0);
    vi.advanceTimersByTime(STORY_CHOICE_LOCK_MS);
    chooseOption(0);
    const second = dialogue.scene.value?.choices?.[0];
    expect(second?.text).toBe('Second.');
    expect(second?.lockedUntil).toBe(first + STORY_CHOICE_LOCK_MS);
    // A press a moment after it shows is no answer; one after its lock is.
    vi.advanceTimersByTime(50);
    chooseOption(0);
    expect(dialogue.scene.value?.choices?.[0]?.text).toBe('Second.');
    vi.advanceTimersByTime(STORY_CHOICE_LOCK_MS);
    chooseOption(0);
    expect(dialogue.scene.value).toBeNull();
  });
});

describe("the SEAL's permission, behind a line already on the panel (S5, S7)", () => {
  it('never arms before "Do it, {name}." has typed, and the line stays until the press', () => {
    bind('a3_m03');
    // A refugee's hushed line, 4 s on the panel ahead of the cue (C1's case), and a slower one.
    for (const aheadSec of [4, 9]) {
      const ahead = {
        id: `dev_m6r2_ahead_${aheadSec}`,
        nodes: [{ kind: 'line', speaker: 'bricks', text: '(hush)', durationSec: aheadSec }],
      } as const;
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test scene
      playScene(ahead as unknown as Scene, { mode: 'comms' });
      const seal = startSeal('a3_m03', 'seal');
      emit({ type: 'ScriptCue', cueId: 'a3_m03_cue_seal' });
      let doItAt: number | null = null;
      for (let t = 0; t < 40_000 && seal.permittedAt === null; t += 50) {
        if (doItAt === null && (shown() ?? '').startsWith('Do it, ')) doItAt = performance.now();
        vi.advanceTimersByTime(50);
      }
      expect(doItAt).not.toBeNull();
      expect(seal.permittedAt).not.toBeNull();
      expect(seal.permittedAt!).toBeGreaterThan(doItAt!); // it typed first (checked above)
      // S7: the line stays on the panel while the button waits (short of the waiting line).
      vi.advanceTimersByTime(10_000);
      expect(shown()).toMatch(/^Do it, /);
      // The press: it moves on.
      seal.stop();
      vi.advanceTimersByTime(100);
      expect(shown()).toBeNull();
      unbind();
      unbind = noop;
      bind('a3_m03');
    }
  });

  it('the waiting line takes its place after 20 s', () => {
    bind('a3_m03');
    const seal = startSeal('a3_m03', 'seal');
    emit({ type: 'ScriptCue', cueId: 'a3_m03_cue_seal' });
    for (let t = 0; t < 40_000 && seal.permittedAt === null; t += 50) vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(19_000);
    expect(shown()).toMatch(/^Do it, /);
    vi.advanceTimersByTime(1_500);
    expect(shown()).toMatch(/^Kid\. It's okay\./);
    seal.stop();
  });
});
