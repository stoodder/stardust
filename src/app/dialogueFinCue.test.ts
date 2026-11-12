// M8 review round 1, A1 (D156): a script cue plays only when its scene's `when` holds. FIN's
// `c4_line` cues every C4 answer's Phase 2 line at once (content/maps/fin_m01 `PHASE_2_EVENTS`);
// each answer hears exactly its own line, on the real sim's script, and under Keep the radio is free
// when Directive 0 comes 20 s in, so its "...Knock knock." (the forced input's permission line)
// types within seconds, not behind another answer's log.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import type { IdSpace } from '../content/types.ts';
import { C4_LINE_SEC, DIRECTIVE_0_SEC } from '../content/maps/fin_m01/map.ts';
import { MemoryStore } from '../meta/index.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { TICK_HZ } from '../shared/time.ts';
import { createSim, type Sim, type SimState } from '../sim/index.ts';
import { setPhase } from '../sim/phases.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setCommandTarget, setSpeed } from './commands.ts';
import { bindDialogue, setDialogueEnabled, skipScene } from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { activeSave, closeSession, initSaves, loadDevSave } from './save.ts';

vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const noop = (): void => {};
let unbind: () => void = noop;
let host: Host<IdSpace>;

function mut(s: Sim<IdSpace>): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return s.state as unknown as SimState;
}

/** Every line of a scene's text, as authored. */
function linesOf(id: string): string[] {
  const scene = SCENES[id];
  if (scene === undefined) throw new Error(`no scene ${id}`);
  return scene.nodes.flatMap((n) => (n.kind === 'line' ? [n.text] : []));
}

/** FIN on the `after_a3m6_<c4>` save, Phase 2 just begun (the radio bound, the briefing done). */
function phaseTwo(c4: 'keep' | 'rewrite' | 'purge'): Sim<IdSpace> {
  expect(loadDevSave(`after_a3m6_${c4}`)).toBe(true);
  const sim = createSim(battleConfig('fin_m01', 1, activeSave()));
  host = createHost(sim);
  setCommandTarget({
    host,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- nothing here arms or aims
    interaction: {} as BattleInteraction,
    cancel: noop,
  });
  setSpeed(1);
  unbind = bindDialogue(host, { briefing: false, newTowers: [] });
  setPhase(mut(sim), 2);
  return sim;
}

/** Runs the sim `sec` seconds while the radio plays in real time; returns the lines it showed. */
function listen(sec: number, heard: string[] = []): string[] {
  for (let t = 0; t < sec * 4; t++) {
    host.fastForward(TICK_HZ / 4);
    vi.advanceTimersByTime(250);
    const line = dialogue.comms.value?.line.text ?? null;
    if (line !== null && heard.at(-1) !== line) heard.push(line);
  }
  return heard;
}

beforeEach(() => {
  vi.useFakeTimers();
  setDialogueEnabled(true);
  initSaves(new MemoryStore(), () => 1_793_000_000_000);
  screen.value = 'battle';
});
afterEach(() => {
  unbind();
  unbind = noop;
  for (let i = 0; i < 50 && skipScene(); i++);
  setCommandTarget(null);
  closeSession();
  vi.useRealTimers();
  screen.value = null;
});

const C4_LINES = {
  rewrite: 'fin_m01_cue_log',
  keep: 'fin_m01_cue_holding',
  purge: 'fin_m01_cue_not_nothing',
} as const;

describe('FIN Phase 2: each C4 answer hears its own line only (A1)', () => {
  for (const c4 of ['rewrite', 'keep', 'purge'] as const) {
    it(`${c4}: ${C4_LINES[c4]}, and no other answer's`, () => {
      phaseTwo(c4);
      const heard = listen(C4_LINE_SEC + 12);
      const own = linesOf(C4_LINES[c4]);
      expect(heard).toContain(own[0]);
      for (const [other, id] of Object.entries(C4_LINES)) {
        if (other === c4) continue;
        for (const line of linesOf(id)) expect(heard).not.toContain(line);
      }
    });
  }

  it("keep: Directive 0's knock-knock types within seconds of 20 s in (the radio is free)", () => {
    const sim = phaseTwo('keep');
    const heard = listen(DIRECTIVE_0_SEC);
    // The sim stops on the forced input the tick Directive 0 fires.
    for (let k = 0; k < TICK_HZ && sim.state.pendingInput === null; k++) host.fastForward(1);
    expect(sim.state.pendingInput).toBe('whos_there');
    expect(Math.round((sim.state.tick - sim.state.phaseTick) / TICK_HZ)).toBe(DIRECTIVE_0_SEC);
    // Directive 0 is on the radio at once, and its last line (the permission) within ~25 s at 1×.
    const d0 = linesOf('fin_m01_cue_directive0');
    const at = (line: string): number => heard.indexOf(line);
    let waited = 0;
    for (; waited < 30_000 && !heard.includes(d0.at(-1)!); waited += 250) {
      vi.advanceTimersByTime(250);
      const line = dialogue.comms.value?.line.text ?? null;
      if (line !== null && heard.at(-1) !== line) heard.push(line);
      if (waited === 1000) expect(heard).toContain(d0[0]);
    }
    expect(heard).toContain(d0.at(-1));
    expect(waited).toBeLessThan(25_000);
    expect(at(d0[0]!)).toBeGreaterThan(at(linesOf('fin_m01_cue_holding')[0]!));
    for (const line of linesOf('fin_m01_cue_log')) expect(heard).not.toContain(line);
  });
});
