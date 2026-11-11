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
import { FORCED_INPUT_SOUNDS } from '../audio/eventTablesAct3.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimState } from '../sim/index.ts';
import { dialogue, type LineView, type SceneView } from '../ui/dialogue/state.ts';
import { baseChoice, runResult, type BaseChoiceView, type RunResult } from '../ui/screens/state.ts';
import { hud, screen } from '../ui/state.ts';
import { bindBattleAudio, darkDuckLevel, installAudio, playJingle } from './audio.ts';
import { battleConfig } from './battleSetup.ts';
import { createHost, type Host } from './host.ts';
import { initSaves } from './save.ts';

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
    stop(id) {
      log.push(`stop:${id}`);
    },
    stopCue(id) {
      log.push(`stopCue:${id}`);
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

const noop = (): void => {};
const listeners = { addEventListener: noop, removeEventListener: noop };

/** Shows the rigs' meter in `damage`'s band (app/hudAsset.ts). */
const asset = (damage: 'damaged' | 'critical'): void => {
  hud.asset.value = { name: 'Rigs', value: damage === 'critical' ? 4 : 8, max: 10, damage };
};

/** A Results card with C2 offered (`picked` null) or taken, and the transaction it made. */
const c2Card = (picked: number | null, choice: 'sold' | 'returned'): RunResult => {
  const base = {
    choice: {
      by: 'ZIBZAB',
      bank: 400,
      options: ['Sell it.', 'Take it to them.'],
      pays: [],
      picked,
    },
    rewards: {
      transactions:
        picked === null ? [] : [{ kind: 'c2', choice, bank: 400, intel: 0, tuneUp: null }],
    },
  };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only the fields the binder reads
  return base as unknown as RunResult;
};

/** The base's C2 panel (D138), offered (`made` null) or taken. */
const panel = (made: BaseChoiceView['made']): BaseChoiceView => ({
  lines: [],
  choice: c2Card(null, 'returned').choice!,
  made,
  notice: null,
});

let rec = recorder();
let uninstall: () => void = noop;

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
  baseChoice.value = null;
  hud.asset.value = null;
  hud.escort.value = null;
  screen.value = null;
});

describe('bindBattleAudio', () => {
  let host: Host<IdSpace>;
  let state: SimState;
  let unbind: () => void = noop;
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

  it('falls the music away while the SEAL waits, cuts the door hum dead on its press, then slams', () => {
    state.pendingInput = 'seal';
    frame();
    expect(rec.ducks.get(FORCED_INPUT_SOUNDS.duckKey)).toBe(FORCED_INPUT_SOUNDS.duck);
    rec.log.length = 0;
    host.bus.emit({ type: 'ForcedInputResolved', id: 'seal' });
    expect(rec.log).toEqual(['stop:door_hum', 'sfx:door_seal']);
    state.pendingInput = null;
    frame();
    expect(rec.ducks.has(FORCED_INPUT_SOUNDS.duckKey)).toBe(false);
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
    const hum = { text: 'Hm. Hm-hm. Hmmm.' };
    show('a2_m06_base_whistle', 3, line('pebble', hum));
    // Sung, not spoken: no blip, and no dip under it.
    expect(rec.log).toEqual(['cue:home_hum']);
    const hushed = [...rec.ducks.entries()].find(([k]) => k === 'line_cue');
    expect(hushed?.[1]).toBeLessThan(0.5);
    // Bricks's two seconds of silence keep it hushed; his next line lets the music back.
    show('a2_m06_base_whistle', 4, line('bricks', { silence: true, text: '' }));
    expect(rec.ducks.has('line_cue')).toBe(true);
    show('a2_m06_base_whistle', 5, line('bricks'));
    expect(rec.ducks.has('line_cue')).toBe(false);
    expect(rec.log.at(-1)).toBe('sfx:blip.bricks');
    // The same line in another scene is spoken.
    show('a2_m06_base_loophole', 3, line('pebble', hum));
    expect(rec.log.at(-1)).toBe('sfx:blip.pebble');
  });

  it("sings the Leaving Song: Pebble alone, Thrum taking over from the top, the player's hum along", () => {
    rec.log.length = 0;
    const scene = 'a3_m01_scene_song';
    const hum = { text: '(hum, six notes)' };
    show(scene, 0, line('pebble', hum));
    show(scene, 1, line('thrum', hum));
    expect(rec.log).toEqual(['cue:leaving_hum', 'stopCue:leaving_hum', 'cue:leaving_hum_two']);
    // QUILL speaks; the pick "(hum along)" joins the transcript as Ves'thara's line shows.
    show(scene, 2, line('quill', { text: "Melody match: 'Everglow Bright.'" }));
    rec.log.length = 0;
    const transcript = [
      ...Array.from({ length: 4 }, () => line('pebble')),
      line('player', { text: '(hum along)' }),
    ];
    const view = dialogue.scene.value!;
    dialogue.scene.value = { ...view, transcript, line: line('vesthara') };
    expect(rec.log).toEqual([
      'stopCue:leaving_hum_two',
      'cue:leaving_hum_along',
      'dip',
      'sfx:blip.vesthara',
    ]);
  });

  it("hums the SEAL's lines over the door hum: no blip, no dip, and the music hushed", () => {
    rec.log.length = 0;
    dialogue.comms.value = {
      line: line('bricks', { text: '(hum, six notes, slow)' }),
      cue: null,
      button: null,
    };
    expect(rec.log).toEqual([]);
    expect(rec.ducks.get('line_cue')).toBeLessThan(0.2);
    dialogue.comms.value = {
      line: line('bricks', { text: 'Do it, Thorn.' }),
      cue: null,
      button: null,
    };
    expect(rec.log).toEqual(['dip', 'sfx:blip.bricks']);
    expect(rec.ducks.has('line_cue')).toBe(false);
  });

  it("lets the music fall away under Sterling's Clean Exit, and brings it back after", () => {
    show('a3_m02_cue_revoke', 0, line('sterling'));
    expect(rec.ducks.get('cue_hush')).toBeLessThan(0.1);
    show('a3_m02_cue_revoke', 3, line('sterling', { silence: true, text: '' }));
    expect(rec.ducks.has('cue_hush')).toBe(true);
    dialogue.scene.value = null;
    expect(rec.ducks.has('cue_hush')).toBe(false);
    // Other pausing cues keep the music.
    show('a2_m05_cue_pivot', 0, line('vesthara'));
    expect(rec.ducks.has('cue_hush')).toBe(false);
  });

  it('stings C2 when it is answered at the base instead of on the card (T569)', () => {
    rec.log.length = 0;
    baseChoice.value = panel(null);
    expect(rec.log).toEqual([]);
    baseChoice.value = panel({ kind: 'c2', choice: 'returned', bank: 0, intel: 0, tuneUp: null });
    expect(rec.log).toEqual(['cue:c2_returned']);
    baseChoice.value = panel({ kind: 'c2', choice: 'returned', bank: 0, intel: 0, tuneUp: null });
    baseChoice.value = null;
    expect(rec.log).toEqual(['cue:c2_returned']);
  });

  it("stings C2's choice as it's taken on the card, by what it did, and never on its offer", () => {
    rec.log.length = 0;
    runResult.value = c2Card(null, 'sold');
    expect(rec.log).toEqual([]);
    runResult.value = c2Card(0, 'sold');
    expect(rec.log).toEqual(['cue:c2_sold']);
    // A later change to the same card (its debrief lines) doesn't sting again.
    runResult.value = c2Card(0, 'sold');
    expect(rec.log).toEqual(['cue:c2_sold']);
    runResult.value = c2Card(null, 'returned');
    runResult.value = c2Card(1, 'returned');
    expect(rec.log).toEqual(['cue:c2_sold', 'cue:c2_returned']);
  });

  it("plays the PA's minor shift change on the PA (A2M6's stinger), the bright jingle as its sting", () => {
    rec.log.length = 0;
    playJingle('minor');
    playJingle('bright');
    playJingle('none');
    expect(rec.log).toEqual(['cue:pa_shift_minor', 'cue:bright_sting']);
  });

  it("makes Bricks's silences truly silent: the music falls to nothing, then comes back (T750)", () => {
    dialogue.comms.value = { line: line('quill'), cue: null, button: null };
    expect(rec.ducks.has('silence')).toBe(false);
    dialogue.comms.value = {
      line: line('bricks', { silence: true, text: '' }),
      cue: null,
      button: null,
    };
    expect(rec.ducks.get('silence')).toBe(0);
    // Another speaker's silence keeps the radio's duck only (QUILL's Purge blink).
    dialogue.comms.value = {
      line: line('quill', { silence: true, text: '' }),
      cue: null,
      button: null,
    };
    expect(rec.ducks.has('silence')).toBe(false);
    dialogue.comms.value = {
      line: line('bricks', { silence: true, text: '' }),
      cue: null,
      button: null,
    };
    dialogue.comms.value = null;
    expect(rec.ducks.has('silence')).toBe(false);
  });

  it("opens A3M4's mail scene on Gerald's delivery, once (T750)", () => {
    rec.log.length = 0;
    show('a3_m04_scene_mail', 0, line('narrator'));
    show('a3_m04_scene_mail', 1, line('narrator'));
    expect(rec.log.filter((l) => l === 'sfx:mail_delivered')).toHaveLength(1);
    show('a3_m04_debrief', 0, line('quill'));
    expect(rec.log.filter((l) => l === 'sfx:mail_delivered')).toHaveLength(1);
  });

  it("knocks twice on the dome's door for Pebble's knock-knock, then squeaks (T750)", () => {
    rec.log.length = 0;
    dialogue.comms.value = {
      line: line('pebble', { text: 'Knock knock! (squeak)' }),
      cue: null,
      button: "Who's there?",
    };
    expect(rec.log).toEqual(['dip', 'sfx:knock_knock', 'sfx:blip.pebble']);
  });

  it("stings Waykeeper once as the plate turns in A3M6's debrief, never elsewhere (T750)", () => {
    rec.log.length = 0;
    const naming = line('pebble', { text: 'I picked Waykeeper. You have to like it.' });
    const view = (sceneId: string, typedAt: number): SceneView => ({
      sceneId,
      mode: 'fullscreen',
      transcript: [],
      line: naming,
      choices: null,
      remember: null,
      ended: false,
      instant: false,
      typing: { from: typedAt, done: true },
      staging: null,
    });
    // Her line was whole long enough ago: the plate has turned.
    dialogue.scene.value = view('a2_m02_debrief', performance.now() - 10_000);
    expect(rec.log.filter((l) => l.startsWith('cue:'))).toEqual([]);
    dialogue.scene.value = view('a3_m06_debrief', performance.now() - 10_000);
    dialogue.scene.value = { ...view('a3_m06_debrief', performance.now() - 10_000) };
    expect(rec.log.filter((l) => l.startsWith('cue:'))).toEqual(['cue:waykeeper']);
  });
});
