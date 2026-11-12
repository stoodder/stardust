// M8 review round 2, A2-1 and A2-2 (S2-1, S2-8): the knock-knock lands before the logistics.
// - A2-2: a scene's last line counts as typed when the comms panel's typewriter says so
//   (`commsLineTyped`), never on a wall clock while a panel is drawn, so "Who's there?" can't arm
//   before "...Knock knock." has typed on screen.
// - A2-1: the press moves the knock on at once; the restore freezes the battle, the restore's own
//   cue ("Not Everglow." / "...That's the joke.") plays through the pause, and QUILL's rebuild
//   note shows only once the joke has typed. A press of play while the joke types means no note.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { TICK_HZ } from '../shared/time.ts';
import { createSim, type Sim, type SimState } from '../sim/index.ts';
import { setPhase } from '../sim/phases.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { typeMs } from '../ui/dialogue/text.ts';
import { pauseNote } from '../ui/hud/finaleState.ts';
import { screen, speed } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setCommandTarget, setSpeed, togglePause } from './commands.ts';
import {
  bindDialogue,
  commsLineTyped,
  commsPanelMounted,
  lingerLastLine,
  setDialogueEnabled,
  skipScene,
  whenSceneTyped,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { bindFinaleHud, REBUILD_NOTE } from './hudFinale.ts';
import { activeSave, closeSession, initSaves, loadDevSave } from './save.ts';

vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const noop = (): void => {};
let offs: (() => void)[] = [];
let host: Host<IdSpace>;

const DIRECTIVE_0 = 'fin_m01_cue_directive0';
const NOT_EVERGLOW = 'fin_m01_cue_not_everglow';

function linesOf(id: string): string[] {
  const scene = SCENES[id];
  if (scene === undefined) throw new Error(`no scene ${id}`);
  return scene.nodes.flatMap((n) => (n.kind === 'line' ? [n.text] : []));
}

function mut(s: Sim<IdSpace>): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return s.state as unknown as SimState;
}

/** FIN under Keep, Phase 2 begun, the radio and the finale HUD bound, a comms panel "drawn". */
function keepPhaseTwo(): Sim<IdSpace> {
  expect(loadDevSave('after_a3m6_keep')).toBe(true);
  const sim = createSim(battleConfig('fin_m01', 1, activeSave()));
  host = createHost(sim);
  setCommandTarget({
    host,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- nothing here arms or aims
    interaction: {} as BattleInteraction,
    cancel: noop,
  });
  setSpeed(1);
  offs.push(bindDialogue(host, { briefing: false, newTowers: [] }));
  offs.push(bindFinaleHud(host, 1000));
  offs.push(commsPanelMounted());
  setPhase(mut(sim), 2);
  return sim;
}

/**
 * The drawn panel's typewriter: a line on screen reports typed once it has been up its typing time
 * (`typeMs`) plus `lagMs` (the frame-paced typewriter starts as it first renders).
 */
function panel(lagMs: number): { step(ms: number): void; heard: string[] } {
  const heard: string[] = [];
  let id = -1;
  let up = 0;
  return {
    heard,
    step(ms) {
      vi.advanceTimersByTime(ms);
      const line = dialogue.comms.value?.line ?? null;
      if (line === null) return;
      if (line.id !== id) {
        id = line.id;
        up = 0;
        heard.push(line.text);
        return;
      }
      up += ms;
      if (up >= typeMs(line.text) + lagMs) commsLineTyped(line.id);
    },
  };
}

/** Runs the battle to "Who's there?" and the knock on the panel, its permission waited on. */
function toTheKnock(sim: Sim<IdSpace>, lagMs: number) {
  const permitted = { at: null as number | null };
  let ms = 0;
  // The forced input's own wait: the line rests on the panel, permission once it has typed.
  const release = lingerLastLine(DIRECTIVE_0);
  offs.push(release);
  offs.push(whenSceneTyped(DIRECTIVE_0, () => (permitted.at = ms)));
  const p = panel(lagMs);
  for (let k = 0; k < 60 * 4 && sim.state.pendingInput === null; k++) {
    host.fastForward(TICK_HZ / 4);
    p.step(250);
    ms += 250;
  }
  expect(sim.state.pendingInput).toBe('whos_there');
  const knock = linesOf(DIRECTIVE_0).at(-1)!;
  let shownAt: number | null = null;
  for (let k = 0; k < 200 && permitted.at === null; k++) {
    p.step(100);
    ms += 100;
    if (shownAt === null && dialogue.comms.value?.line.text === knock) shownAt = ms;
  }
  return { permitted, shownAt, release, panel: p, knock };
}

beforeEach(() => {
  vi.useFakeTimers();
  setDialogueEnabled(true);
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  screen.value = 'battle';
});
afterEach(() => {
  for (const off of offs) off();
  offs = [];
  for (let i = 0; i < 50 && skipScene(); i++);
  setCommandTarget(null);
  closeSession();
  vi.useRealTimers();
  screen.value = null;
  setSpeed(1);
});

describe('"Who\'s there?" arms from the typewriter, not a clock (A2-2)', () => {
  it('waits for the panel to finish "...Knock knock.", however late its typewriter runs', () => {
    const sim = keepPhaseTwo();
    // A typewriter 1.5 s behind the wall clock (a slow first render).
    const { permitted, shownAt, knock } = toTheKnock(sim, 1500);
    expect(shownAt).not.toBeNull();
    expect(permitted.at).not.toBeNull();
    expect(permitted.at! - shownAt!).toBeGreaterThanOrEqual(typeMs(knock) + 1500 - 100);
  });

  it('with no panel drawn, the typing time still gives it (headless)', () => {
    const sim = keepPhaseTwo();
    // Undraw the panel this test drew.
    offs.pop()?.();
    const { permitted, shownAt, knock } = toTheKnock(sim, 1500);
    expect(permitted.at! - shownAt!).toBeLessThan(typeMs(knock) + 1500);
  });
});

describe('the knock-knock lands before the rebuild note (A2-1)', () => {
  /** Presses "Who's there?" once permitted: the line moves on, the next tick restores the class. */
  function press(sim: Sim<IdSpace>, release: () => void): void {
    host.enqueue({ type: 'scriptInput', id: 'whos_there' });
    release();
    host.fastForward(1);
    expect(sim.state.pendingInput).toBeNull();
  }

  it('freezes the battle, plays "Not Everglow." / "...That\'s the joke.", then shows the note', () => {
    const sim = keepPhaseTwo();
    const { release, panel: p, knock } = toTheKnock(sim, 0);
    press(sim, release);
    expect(speed.value).toBe(0);
    expect(pauseNote.value).toBeNull();
    const tick = sim.state.tick;
    // The knock leaves at the press; the punchline follows at once.
    p.step(50);
    const [notEverglow, joke] = linesOf(NOT_EVERGLOW);
    expect(dialogue.comms.value?.line.text).toBe(notEverglow);
    expect(p.heard.at(-2)).toBe(knock);
    // The joke plays through the pause; the note waits for its last line to type.
    let noteAt: number | null = null;
    let jokeAt: number | null = null;
    for (let ms = 0; ms < 15_000 && noteAt === null; ms += 100) {
      p.step(100);
      if (jokeAt === null && dialogue.comms.value?.line.text === joke) jokeAt = ms;
      if (pauseNote.value !== null) noteAt = ms;
    }
    expect(jokeAt).not.toBeNull();
    expect(noteAt).not.toBeNull();
    expect(noteAt! - jokeAt!).toBeGreaterThanOrEqual(typeMs(joke!) - 100);
    expect(pauseNote.value).toEqual(REBUILD_NOTE);
    expect(speed.value).toBe(0);
    expect(sim.state.tick).toBe(tick);
    // The player's own press of play resumes, and the word goes.
    togglePause();
    expect(speed.value).toBe(1);
    expect(pauseNote.value).toBeNull();
  });

  it('a press of play while the joke types means no note at all', () => {
    const sim = keepPhaseTwo();
    const { release, panel: p } = toTheKnock(sim, 0);
    press(sim, release);
    p.step(50);
    togglePause();
    expect(speed.value).toBe(1);
    for (let ms = 0; ms < 10_000; ms += 100) p.step(100);
    expect(pauseNote.value).toBeNull();
  });

  it('names no key: a mouse player is told to press play, in QUILL\'s voice, no "!"', () => {
    expect(REBUILD_NOTE.text).toBe(
      "I'm holding the clock. Your refund's in your credits. Rebuild, then press play.",
    );
    expect(REBUILD_NOTE.text).not.toMatch(/Space|!/);
  });
});
