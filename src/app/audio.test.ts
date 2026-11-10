// The audio binding with a fake engine (T501h, T550; architecture.md § Audio): a battle's events
// play through the engine, a resumed run's replay plays nothing, the Hollow's duck holds while a
// Hollow unit walks and releases as the map ends, Sundown's dark holds the music back, the meters'
// alarm sounds once per crossing, a line dips the sounds under it (a silence doesn't) and a sung
// line plays its cue instead of its blip, and C2's choice plays its sting. No WebAudio: the engine
// is a recorder and the DOM listeners are stubs.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../audio/index.ts';
import { silentEngine } from '../audio/index.ts';
import { DARK_SOUNDS, METER_ALARM } from '../audio/eventTablesAct2b.ts';
import { HOLLOW_DUCK } from '../audio/eventTablesAct2.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimEvent, type SimState } from '../sim/index.ts';
import { dialogue, type LineView, type SceneView } from '../ui/dialogue/state.ts';
import { runResult, type RunResult } from '../ui/screens/state.ts';
import { hud, screen } from '../ui/state.ts';
import { bindBattleAudio, darkDuckLevel, installAudio, playJingle } from './audio.ts';
import { battleConfig } from './battleSetup.ts';
import { createHost, type Host } from './host.ts';
import { initSaves } from './save.ts';

type Ev = SimEvent<IdSpace>;

/** An engine that records what it was told: sounds and cues in order, and the ducks held now. */
function recorder(): { engine: AudioEngine; log: string[]; ducks: Map<string, number> } {
  const log: string[] = [];
  const ducks = new Map<string, number>();
  const engine: AudioEngine = {
    ...silentEngine(),
    play(id) {
      log.push(`sfx:${id}`);
      return true;
    },
    cue(id) {
      log.push(`cue:${id}`);
    },
    holdDuck(key, level) {
      if (level === null) ducks.delete(key);
      else ducks.set(key, level);
    },
    dipUnderSpeech() {
      log.push('dip');
    },
  };
  return { engine, log, ducks };
}

const listeners = { addEventListener: () => {}, removeEventListener: () => {} };

let rec = recorder();
let uninstall: () => void = () => {};

beforeEach(() => {
  vi.stubGlobal('window', listeners);
  vi.stubGlobal('document', { ...listeners, hidden: false });
  rec = recorder();
  uninstall = installAudio(true, () => rec.engine);
});
afterEach(() => {
  uninstall();
  vi.unstubAllGlobals();
  dialogue.scene.value = null;
  dialogue.comms.value = null;
  runResult.value = null;
  hud.asset.value = null;
  hud.escort.value = null;
  screen.value = null;
});

describe('bindBattleAudio', () => {
  let host: Host<IdSpace>;
  let state: SimState;
  let unbind: () => void = () => {};
  const frame = (): void => host.fastForward(0);

  beforeEach(() => {
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    const sim = createSim(battleConfig('a2_m01', 1, null));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
    state = sim.state as unknown as SimState;
    host = createHost(sim, { now: () => 0, speed: 0 });
    unbind = bindBattleAudio(host);
    rec.log.length = 0;
  });
  afterEach(() => unbind());

  /** Puts a live `id` unit on the field at (x, y) (the pool's first slot). */
  const walk = (id: string): void => {
    const def = host.sim.config.content.enemies[id];
    expect(def).toBeDefined();
    const e = state.enemies.items[0]!;
    Object.assign(e, { alive: true, def, leaving: false, x: 3, y: 3, revealedTicks: 0 });
    state.enemies.used = Math.max(state.enemies.used, 1);
  };

  it("plays a battle's events through the engine", () => {
    host.bus.emit({ type: 'TowerBuilt', uid: 50, tower: 'rivet', tile: [1, 1], cost: 50 });
    host.bus.emit({ type: 'RefugeeEvacuated', uid: 3, pebble: true });
    expect(rec.log).toEqual(['sfx:build', 'sfx:pebble_safe']);
  });

  it("holds the Hollow's duck while a Hollow unit walks, and releases it as the map ends", () => {
    walk('mote');
    frame();
    expect(rec.ducks.get(HOLLOW_DUCK.key)).toBe(HOLLOW_DUCK.level);
    // Won with the Mote still on the field: the music comes back.
    state.outcome = 'won';
    frame();
    expect(rec.ducks.has(HOLLOW_DUCK.key)).toBe(false);
  });

  it('releases the Hollow duck when the battle unbinds', () => {
    walk('mote');
    frame();
    expect(rec.ducks.has(HOLLOW_DUCK.key)).toBe(true);
    unbind();
    expect(rec.ducks.has(HOLLOW_DUCK.key)).toBe(false);
  });

  it("sits the music back as Sundown's dark deepens, in steps, and lets it go at the map's end", () => {
    state.dark = 0.5;
    frame();
    expect(rec.ducks.get(DARK_SOUNDS.duck)).toBe(darkDuckLevel(0.5));
    expect(darkDuckLevel(0.5)).toBeCloseTo(1 - DARK_SOUNDS.duckDepth * 0.5);
    expect(darkDuckLevel(0)).toBe(1);
    expect(darkDuckLevel(1)).toBeCloseTo(1 - DARK_SOUNDS.duckDepth);
    state.outcome = 'lost';
    frame();
    expect(rec.ducks.has(DARK_SOUNDS.duck)).toBe(false);
  });

  it("sounds the meters' alarm once as the rigs go critical, and once as an Escort runs low", () => {
    const asset = (damage: 'damaged' | 'critical'): void => {
      hud.asset.value = { name: 'Rigs', value: damage === 'critical' ? 4 : 8, max: 10, damage };
    };
    asset('damaged');
    frame();
    asset('critical');
    frame();
    frame();
    expect(rec.log.filter((s) => s === `sfx:${METER_ALARM}`)).toHaveLength(1);
    hud.escort.value = {
      evacuated: 3,
      total: 36,
      lost: 11,
      maxLost: 14,
      pips: null,
      low: true,
    };
    frame();
    frame();
    expect(rec.log.filter((s) => s === `sfx:${METER_ALARM}`)).toHaveLength(2);
  });

  it("plays nothing while a resumed run's replay catches up", () => {
    const sim = createSim(battleConfig('a2_m01', 1, null));
    const replay = createHost(sim, {
      now: () => 0,
      speed: 0,
      resume: { log: [], checkpoint: { wave: 1, tick: 0, commandCount: 0 } },
    });
    const off = bindBattleAudio(replay);
    rec.log.length = 0;
    expect(replay.replaying).toBe(true);
    replay.bus.emit({ type: 'TowerBuilt', uid: 51, tower: 'rivet', tile: [1, 1], cost: 50 });
    expect(rec.log).toEqual([]);
    off();
  });
});

describe("installAudio's speech and Results", () => {
  let nextId = 1;
  const line = (speaker: LineView['speaker'], o: Partial<LineView> = {}): LineView => ({
    id: nextId++,
    speaker,
    name: speaker.toUpperCase(),
    color: 'gold.3',
    frame: 'portrait',
    portrait: null,
    text: 'Hm.',
    silence: false,
    point: false,
    ...o,
  });
  /** Shows `l` as line `index` of scene `sceneId` (a pausing panel). */
  const show = (sceneId: string, index: number, l: LineView): void => {
    const transcript = Array.from({ length: index }, () => line('bricks'));
    const view: SceneView = {
      sceneId,
      mode: 'panel',
      transcript,
      line: l,
      choices: null,
      remember: null,
      ended: false,
      instant: false,
      typing: { from: 0, done: false },
      staging: null,
    };
    dialogue.scene.value = view;
  };

  it('dips the sounds under each spoken line, never under a silence, and blips its speaker', () => {
    rec.log.length = 0;
    dialogue.comms.value = { line: line('quill'), cue: null, button: null };
    dialogue.comms.value = {
      line: line('bricks', { silence: true, text: '' }),
      cue: null,
      button: null,
    };
    dialogue.comms.value = { line: line('goldie'), cue: null, button: null };
    expect(rec.log).toEqual(['dip', 'sfx:blip.quill', 'dip', 'sfx:blip.goldie']);
    // A line holds the radio's duck on the music; the end of the lines lets it go.
    expect(rec.ducks.has('radio')).toBe(true);
    dialogue.comms.value = null;
    expect(rec.ducks.has('radio')).toBe(false);
  });

  it("sings Pebble's hum in place of her blip, hushes the music through the silence after, and lets go", () => {
    rec.log.length = 0;
    show('a2_m06_base_whistle', 3, line('pebble'));
    expect(rec.log).toEqual(['dip', 'cue:home_hum']);
    const hushed = [...rec.ducks.entries()].find(([k]) => k === 'line_cue');
    expect(hushed?.[1]).toBeLessThan(0.5);
    // Bricks's two seconds of silence keep it hushed; his next line lets the music back.
    show('a2_m06_base_whistle', 4, line('bricks', { silence: true, text: '' }));
    expect(rec.ducks.has('line_cue')).toBe(true);
    show('a2_m06_base_whistle', 5, line('bricks'));
    expect(rec.ducks.has('line_cue')).toBe(false);
    expect(rec.log.at(-1)).toBe('sfx:blip.bricks');
    // The same line in another scene is spoken.
    show('a2_m06_base_loophole', 3, line('pebble'));
    expect(rec.log.at(-1)).toBe('sfx:blip.pebble');
  });

  it("stings C2's choice as it's taken on the card, by what it did, and never on its offer", () => {
    const result = (picked: number | null, choice: 'sold' | 'returned'): RunResult => {
      const base = {
        choice: { by: 'ZIBZAB', bank: 400, options: ['Sell it.', 'Take it to them.'], picked },
        rewards: {
          transactions:
            picked === null ? [] : [{ kind: 'c2', choice, bank: 400, intel: 0, tuneUp: null }],
        },
      };
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only the fields the binder reads
      return base as unknown as RunResult;
    };
    rec.log.length = 0;
    runResult.value = result(null, 'sold');
    expect(rec.log).toEqual([]);
    runResult.value = result(0, 'sold');
    expect(rec.log).toEqual(['cue:c2_sold']);
    // A later change to the same card (its debrief lines) doesn't sting again.
    runResult.value = result(0, 'sold');
    expect(rec.log).toEqual(['cue:c2_sold']);
    runResult.value = result(null, 'returned');
    runResult.value = result(1, 'returned');
    expect(rec.log).toEqual(['cue:c2_sold', 'cue:c2_returned']);
  });

  it("plays the PA's minor shift change on the PA (A2M6's stinger), the bright jingle as its sting", () => {
    rec.log.length = 0;
    playJingle('minor');
    playJingle('bright');
    playJingle('none');
    expect(rec.log).toEqual(['cue:pa_shift_minor', 'cue:bright_sting']);
  });
});
