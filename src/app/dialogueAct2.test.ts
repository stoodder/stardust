// Act II's radio in play (T420): A2M1's runner barks (`skitterkin_killed_ahead` when the player
// kills a fleeing Skitterkin, `skitterkin_hushed` on the map's first hush), the Mote's `new_enemy`
// line, and the map's cue scenes (the Spare runners teach; the crew-log line, once a battle however
// many events cue it). Real-time holds run on fake timers; sim time is the sim's tick.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARKS, SCENES } from '../content/dialogue/index.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore } from '../meta/index.ts';
import { createSim, type SimEvent, type SimState } from '../sim/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import { bindDialogue, setDialogueEnabled } from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { initSaves } from './save.ts';

// The router's battle and backdrop are stubbed: these paths never draw (router.test.ts).
vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

type Ev = SimEvent<IdSpace>;
const noop = (): void => {};

const shown = (): string | null => dialogue.comms.value?.line.text ?? null;
const bark = (id: string): string => BARKS[id]?.text ?? `<no bark ${id}>`;
const line = (scene: string): string => {
  const n = SCENES[scene]?.nodes[0];
  return n?.kind === 'line' ? n.text : `<no scene ${scene}>`;
};
/** A Mote hushing a fleeing Nibbler. */
const hush = (uid: number): Ev => ({
  type: 'Hushed',
  uid,
  enemy: 'mote',
  victim: uid + 100,
  victimEnemy: 'nibbler',
  x: 0,
  y: 0,
});
/** Lets the panel play out (every line's hold). */
const drain = (): void => {
  vi.advanceTimersByTime(30_000);
};

describe('A2M1 on the radio', () => {
  let unbind: () => void = noop;
  let host: Host<IdSpace>;
  let state: SimState;
  const emit = (e: Ev): void => host.bus.emit(e);
  const at = (sec: number): void => {
    state.tick = Math.round(sec * 60);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    setSpeed(1);
    const sim = createSim(battleConfig('a2_m01', 1, null));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
    state = sim.state as unknown as SimState;
    state.credits = 0;
    host = createHost(sim);
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
    drain(); // the start's barks, if any
  });
  afterEach(() => {
    unbind();
    unbind = noop;
    vi.useRealTimers();
    screen.value = null;
  });

  /** A live Mote walking `route` (the Hollow the runners flee), straight into the sim's pool. */
  const moteOn = (route: string): void => {
    const group = host.sim.map.waves.flatMap((w) => w.groups).find((g) => g.enemy.id === 'mote');
    const e = state.enemies.items[0]!;
    e.alive = true;
    e.def = group!.enemy;
    e.route = host.sim.map.routes[route]!;
    state.enemies.used = Math.max(state.enemies.used, 1);
  };
  /** A fleeing Nibbler on `route`, met earlier (its NEW line drained), killed now. */
  const killRunner = (uid: number, route: string): void => {
    emit({ type: 'EnemySpawned', uid, enemy: 'nibbler', route, wave: 2 });
    drain();
    at(100);
    state.stats.tagKilled.fleeing += 1;
    emit({
      type: 'EnemyDied',
      uid,
      enemy: 'nibbler',
      bounty: 1,
      killer: { kind: 'tower', uid: 9 },
      x: 0,
      y: 0,
    });
  };

  it('QUILL notices a runner the player killed (skitterkin_killed_ahead)', () => {
    moteOn('spires');
    killRunner(4, 'spires');
    expect(shown()).toBe(bark('quill_skitterkin_killed_ahead_a2_01'));
    expect(shown()).toBe('That one was running. From it.');
  });

  it('says nothing of a runner killed with no Hollow on its route (D134)', () => {
    const other = Object.keys(host.sim.map.routes).find((r) => r !== 'spires');
    expect(other).toBeDefined();
    moteOn('spires');
    killRunner(4, other!);
    expect(shown()).not.toBe(bark('quill_skitterkin_killed_ahead_a2_01'));
  });

  it("doesn't call a kill that wasn't a runner one", () => {
    at(100);
    emit({
      type: 'EnemyDied',
      uid: 4,
      enemy: 'mote',
      bounty: 2,
      killer: { kind: 'tower', uid: 9 },
      x: 0,
      y: 0,
    });
    expect(shown()).not.toBe(bark('quill_skitterkin_killed_ahead_a2_01'));
  });

  it('QUILL logs the first hush on the map, and only the first (skitterkin_hushed)', () => {
    at(100);
    emit(hush(1));
    expect(shown()).toBe(bark('quill_skitterkin_hushed_a2_01'));
    drain();
    at(200);
    emit(hush(2));
    expect(shown()).toBeNull();
  });

  it('QUILL meets the first Mote with its own line', () => {
    at(50);
    emit({ type: 'EnemySpawned', uid: 3, enemy: 'mote', route: 'spires', wave: 3 });
    expect(shown()).toBe(bark('quill_new_enemy_a2_01'));
  });

  it('plays the Spare runners teach on its cue', () => {
    emit({ type: 'ScriptCue', cueId: 'a2_m01_cue_spare_runners' });
    expect(shown()).toBe(line('a2_m01_cue_spare_runners'));
    expect(shown()).toMatch(/Spare runners, Alt\+H/);
  });

  it('plays the crew-log line once, whichever event cues it first', () => {
    at(60);
    emit({ type: 'ScriptCue', cueId: 'a2_m01_cue_crew_log' });
    expect(shown()).toBe(line('a2_m01_cue_crew_log'));
    drain();
    at(400);
    emit({ type: 'ScriptCue', cueId: 'a2_m01_cue_crew_log' });
    expect(shown()).toBeNull();
  });
});
