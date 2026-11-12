// The finale's audio binding (T850; architecture.md § Audio): the music follows the script phase
// and swells with the Voices, the song lets go of the Hollow's duck, the Voices' low mark falters
// instead of sounding the klaxon, a waymark lantern relit catches, and the campaign's close holds
// Dawn's music over the screens from the counter's flip to the epilogue's end. A fake engine
// records it; no WebAudio.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../audio/index.ts';
import { silentEngine } from '../audio/index.ts';
import { voicesLevel } from '../audio/director.ts';
import { HOLLOW_DUCK } from '../audio/eventTablesAct2.ts';
import { METER_ALARM } from '../audio/eventTablesAct2b.ts';
import { CHOIR_SOUNDS } from '../audio/eventTablesFin.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimState } from '../sim/index.ts';
import { hud, screen } from '../ui/state.ts';
import { bindBattleAudio, installAudio } from './audio.ts';
import { battleConfig } from './battleSetup.ts';
import { endingCue } from './ending.ts';
import { createHost, type Host } from './host.ts';
import { initSaves } from './save.ts';

interface Music {
  readonly theme: string | null;
  readonly layers: Readonly<Record<string, number>>;
}

function recorder(): {
  engine: AudioEngine;
  log: string[];
  ducks: Map<string, number>;
  music: Music[];
} {
  const log: string[] = [];
  const ducks = new Map<string, number>();
  const music: Music[] = [];
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
    setMusic(theme, layers) {
      music.push({ theme, layers: { ...layers } });
    },
  };
  return { engine, log, ducks, music };
}

const noop = (): void => {};
const listeners = { addEventListener: noop, removeEventListener: noop };
let rec = recorder();
let uninstall: () => void = noop;
const lastMusic = (): Music | undefined => rec.music.at(-1);

beforeEach(() => {
  vi.stubGlobal('window', listeners);
  vi.stubGlobal('document', { ...listeners, hidden: false });
  rec = recorder();
  uninstall = installAudio(true, () => rec.engine, null);
});
afterEach(() => {
  uninstall();
  vi.unstubAllGlobals();
  hud.escort.value = null;
  screen.value = null;
});

describe("the finale's battle audio (T850)", () => {
  let host: Host<IdSpace>;
  let state: SimState;
  let unbind: () => void = noop;
  const frame = (): void => host.fastForward(0);

  beforeEach(() => {
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    const sim = createSim(battleConfig('fin_m01', 1, null));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
    state = sim.state as unknown as SimState;
    host = createHost(sim, { now: () => 0, speed: 0 });
    unbind = bindBattleAudio(host);
    rec.log.length = 0;
  });
  afterEach(() => unbind());

  const walk = (id: string): void => {
    const def = host.sim.config.content.enemies[id];
    expect(def).toBeDefined();
    const e = state.enemies.items[0]!;
    Object.assign(e, { alive: true, def, leaving: false, x: 3, y: 3, revealedTicks: 0 });
    state.enemies.used = Math.max(state.enemies.used, 1);
  };

  it('walks to the Long Walk, sings the hymn in Phase 2 at the Voices, and breaks into Dawn', () => {
    expect(state.choir.singers).toBeGreaterThan(0);
    frame();
    expect(lastMusic()?.theme).toBe('fin_walk');
    expect(lastMusic()?.layers.lead).toBe(1);
    state.phase = 2;
    state.choir.voices = Math.ceil(state.choir.singers / 2);
    frame();
    expect(lastMusic()).toMatchObject({
      theme: 'choir_hymn',
      layers: { lead: 1, choir: voicesLevel(state.choir.voices / state.choir.singers) },
    });
    state.phase = 3;
    frame();
    expect(lastMusic()).toMatchObject({ theme: 'dawn_major', layers: { lead: 1, choir: 1 } });
  });

  it("lets go of the Hollow's duck once the song sings over them", () => {
    walk('mote');
    frame();
    expect(rec.ducks.get(HOLLOW_DUCK.key)).toBe(HOLLOW_DUCK.level);
    state.phase = 2;
    frame();
    expect(rec.ducks.has(HOLLOW_DUCK.key)).toBe(false);
  });

  it("falters the choir at the Voices' low mark, never the klaxon", () => {
    hud.escort.value = { evacuated: 6, total: 20, lost: 12, maxLost: 14, pips: null, low: true };
    frame();
    frame();
    expect(rec.log.filter((s) => s === `sfx:${CHOIR_SOUNDS.low}`)).toHaveLength(1);
    expect(rec.log).not.toContain(`sfx:${METER_ALARM}`);
  });

  it('lights a waymark lantern as its wreckage clears', () => {
    const at = host.sim.map.markers['waymark_1']!;
    host.bus.emit({ type: 'WreckageCleared', tile: at, to: '.', salvage: 10 });
    expect(rec.log).toEqual(['sfx:drone_cleared', 'sfx:lantern_lit']);
  });
});

describe("the campaign's close (T850)", () => {
  it("holds Dawn from the counter's flip under every screen, and lets go at the epilogue's end", () => {
    screen.value = 'results';
    expect(lastMusic()?.theme).toBeNull();
    endingCue('counter_flip');
    expect(lastMusic()).toEqual({
      theme: 'dawn_major',
      layers: { base: 1, drums: 1, lead: 1, choir: 1 },
    });
    // A screen changing under the credits keeps it.
    screen.value = 'campaign';
    expect(lastMusic()?.theme).toBe('dawn_major');
    endingCue('epilogue_end');
    // Back to the screen's own: the menus keep the title's (no save: not the post-game's).
    expect(lastMusic()?.theme).toBe('title');
  });

  it('leaves the cue player inert once the audio is uninstalled', () => {
    uninstall();
    uninstall = noop;
    const before = rec.music.length;
    endingCue('counter_flip');
    expect(rec.music).toHaveLength(before);
  });
});

describe("the owner's listen list (T850)", () => {
  it('holds a theme with every layer up, or the finale singers at the Voices asked', async () => {
    const { listenMusic } = await import('./audioListen.ts');
    expect(listenMusic('dawn_major', 1)?.layers).toEqual({ base: 1, drums: 1, lead: 1, choir: 1 });
    expect(listenMusic('choir_hymn', 0.3)).toMatchObject({
      theme: 'choir_hymn',
      layers: { lead: 1, choir: voicesLevel(0.3) },
    });
    expect(listenMusic('fin_walk', 0.5)?.layers.lead).toBe(voicesLevel(0.5));
    expect(listenMusic('nope', 1)).toBeNull();
  });
});
