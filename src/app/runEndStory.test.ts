// T413: a run's end on the story side. A won run applies its debrief's `set` effects once a
// campaign (A2M2's Thorn), the scenes around Results read the run that ended (T329), and a win
// lets the lines cued before it finish on the comms panel before Results (A2M2's retreat line).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import type { Scene } from '../content/dialogue/types.ts';
import type { IdSpace } from '../content/types.ts';
import { createNewSave, MemoryStore, type SaveData } from '../meta/index.ts';
import { createSim, type SimEvent, type SimState } from '../sim/index.ts';
import { readThrough } from '../story/runner.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import {
  bindDialogue,
  endLineMs,
  playMapEndLines,
  playScene,
  setDialogueEnabled,
  setStoryRun,
  skipScene,
} from './dialogue.ts';
import { createHost } from './host.ts';
import { endRunStory, withDebriefEffects } from './runResult.ts';
import { activeSave, initSaves, newGame } from './save.ts';

const PROFILE = { name: 'Ada', address: 'ms', pronouns: 'she', callsign: 'sprout' } as const;
type Ev = SimEvent<IdSpace>;
const noop = (): void => {};
const shown = (): string | null => dialogue.comms.value?.line.text ?? null;
/** The first line of scene `id`. */
const text = (id: string): string => {
  const n = SCENES[id]?.nodes[0];
  return n?.kind === 'line' ? n.text : `<no scene ${id}>`;
};
/** Every line the scene on screen has shown, the one on screen last. */
const said = (): string[] => {
  const v = dialogue.scene.value;
  return [...(v?.transcript ?? []), ...(v?.line === null || v === null ? [] : [v.line])].map(
    (l) => l.text,
  );
};

function saveWith(callsign: 'sprout' | 'thorn' | 'waykeeper' = 'sprout'): SaveData {
  return { ...createNewSave(), profile: { ...PROFILE, callsign } };
}

describe("a won run applies its debrief's effects (T413)", () => {
  it("names the player Thorn on A2M2's win, and marks the debrief seen", () => {
    const save = withDebriefEffects(saveWith(), { mapId: 'a2_m02' }, 'won');
    expect(save.profile?.callsign).toBe('thorn');
    expect(save.story.seen).toContain('a2_m02_debrief');
  });

  it('applies nothing on a loss, off the campaign, or on a map without a debrief', () => {
    const save = saveWith();
    expect(withDebriefEffects(save, { mapId: 'a2_m02' }, 'lost')).toBe(save);
    expect(withDebriefEffects(save, { mapId: 'test_map' }, 'won')).toBe(save);
  });

  it('applies once a campaign: a replay never takes back a later callsign', () => {
    const first = withDebriefEffects(saveWith(), { mapId: 'a2_m02' }, 'won');
    // Waykeeper comes at A3M6; replaying A2M2 after it (or winning it again after a checkpoint
    // retry) leaves the save as it is.
    const later: SaveData = { ...first, profile: { ...PROFILE, callsign: 'waykeeper' } };
    expect(withDebriefEffects(later, { mapId: 'a2_m02' }, 'won')).toBe(later);
  });

  it("applies every debrief's set nodes as a win plays them (none is dropped)", () => {
    const debriefs = Object.values(SCENES).filter((s) => s.id.endsWith('_debrief'));
    expect(debriefs.length).toBeGreaterThan(5);
    for (const scene of debriefs) {
      const map = scene.id.replace(/_debrief$/, '');
      const save = withDebriefEffects(saveWith(), { mapId: map }, 'won');
      expect(save.story.seen, scene.id).toContain(scene.id);
      const ctx = {
        flags: {},
        map: null,
        pestsProcessed: 0,
        seen: [],
        run: { outcome: 'won' as const, ruleFlags: {} },
      };
      const { effects } = readThrough(scene, ctx).cursor;
      expect(save.profile?.callsign, scene.id).toBe(effects.callsign ?? 'sprout');
      for (const [flag, value] of Object.entries(effects.flags)) {
        expect(save.story.flags, `${scene.id}: ${flag}`).toHaveProperty(flag, value);
      }
    }
  });

  it('reaches the save in play at the run end', () => {
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    expect(newGame(1, (s) => ({ ...s, profile: { ...PROFILE } })).ok).toBe(true);
    endRunStory({ mapId: 'a2_m02' }, 'lost');
    expect(activeSave()?.profile?.callsign).toBe('sprout');
    endRunStory({ mapId: 'a2_m02' }, 'won');
    expect(activeSave()?.profile?.callsign).toBe('thorn');
    expect(activeSave()?.story.seen).toContain('a2_m02_debrief');
    setStoryRun(null);
  });
});

describe('the scenes around Results read the run that ended (T329)', () => {
  /** A full-screen scene that says how the run went. */
  const check: Scene = {
    id: 'a1_m05_scene_check',
    nodes: [
      { kind: 'branch', cond: { outcome: 'won' }, goto: 'won' },
      { kind: 'line', speaker: 'narrator', text: 'No run.' },
      { kind: 'end' },
      { label: 'won', kind: 'line', speaker: 'narrator', text: 'Won.' },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
  });
  afterEach(() => {
    skipScene();
    setStoryRun(null);
    vi.useRealTimers();
  });

  it('reads `outcome` once the run end sets it, and nothing before', () => {
    playScene(check);
    expect(said()).toEqual(['No run.']);
    skipScene();
    endRunStory({ mapId: 'a1_m05' }, 'won');
    playScene(check);
    expect(said()).toEqual(['Won.']);
  });
});

describe('the results hold lets cued lines finish on a win (T413)', () => {
  let unbind = noop;
  let emit: (e: Ev) => void = noop;

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    setSpeed(1);
    const sim = createSim(battleConfig('a2_m02', 1, null));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
    (sim.state as unknown as SimState).credits = 0;
    const host = createHost(sim);
    emit = (e) => host.bus.emit(e);
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
  });
  afterEach(() => {
    unbind();
    vi.useRealTimers();
    screen.value = null;
  });

  it("holds Results for A2M2's retreat line, queued behind the strike line as she breaks", () => {
    emit({ type: 'ScriptCue', cueId: 'a2_m02_cue_witch_strike' });
    vi.advanceTimersByTime(1000);
    emit({ type: 'ScriptCue', cueId: 'a2_m02_cue_witch_retreat' });
    expect(shown()).toBe(text('a2_m02_cue_witch_strike'));
    const strike = text('a2_m02_cue_witch_strike');
    const retreat = text('a2_m02_cue_witch_retreat');
    const ms = playMapEndLines([], 'won');
    // The strike line ends a beat after its typing; then the retreat line types and holds a beat.
    expect(ms).toBe(endLineMs(strike) - 1000 + endLineMs(retreat));
    vi.advanceTimersByTime(endLineMs(strike) - 1000);
    expect(shown()).toBe(retreat);
    vi.advanceTimersByTime(endLineMs(retreat) - 1);
    expect(shown()).toBe(retreat);
  });

  it('waits for nothing on a loss, on an idle panel, or for a bark alone', () => {
    emit({ type: 'ScriptCue', cueId: 'a2_m02_cue_witch_retreat' });
    expect(playMapEndLines([], 'lost')).toBe(0);
    vi.advanceTimersByTime(30_000);
    expect(playMapEndLines([], 'won')).toBe(0);
    // W2 (Glimmers): a clean wave with something hostile in it earns its bark (W1's runners
    // alone earn no praise, D138).
    emit({ type: 'WaveStarted', wave: 2, early: false, bonus: 0 });
    emit({ type: 'WaveCleared', wave: 2, bonus: 0 });
    expect(shown()).not.toBeNull();
    expect(playMapEndLines([], 'won')).toBe(0);
  });
});
