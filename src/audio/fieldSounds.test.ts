import { describe, expect, it } from 'vitest';
import { BOSS_ABILITY_TELL_SEC } from '../content/rules.ts';
import { secToTicks, TICK_HZ } from '../shared/time.ts';
import type { SoundCall } from './eventSounds.ts';
import { DRONE_SOUNDS, ENEMY_LOOPS } from './eventTables.ts';
import {
  createFieldSounds,
  spawnTelling,
  type FieldEnemy,
  type FieldState,
} from './fieldSounds.ts';

const TELL = secToTicks(BOSS_ABILITY_TELL_SEC);
const CLEAR = 360;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Unit = Mutable<FieldEnemy>;

const SNEEZER = {
  id: 'chitterbloom',
  boss: {
    phases: [
      { spawn: { enemy: 'nibbler' }, burrow: null },
      { spawn: null, burrow: { times: 2 } },
    ],
  },
};

const unit = (uid: number, def: FieldEnemy['def'], o: Partial<Unit> = {}): Unit => ({
  uid,
  alive: true,
  def,
  burrowed: false,
  huddleUid: 0,
  bossPhase: 0,
  invulnerableTicks: 0,
  abilityTicks: 0,
  abilityCount: 0,
  leaving: false,
  ...o,
});
const plain = (id: string): FieldEnemy['def'] => ({ id, boss: null });

interface World {
  tick: number;
  enemies: { items: Unit[]; used: number };
  wreckage: { queue: number[]; progressTicks: number };
}
const world = (...items: Unit[]): World => ({
  tick: 0,
  enemies: { items, used: items.length },
  wreckage: { queue: [], progressTicks: 0 },
});

/** Runs one frame and returns the sounds' ids. */
function frame(f: ReturnType<typeof createFieldSounds>, w: World): string[] {
  const out: SoundCall[] = [];
  const view: FieldState = w;
  f.frame(view, out);
  return out.map((c) => c.id);
}

describe('field sounds', () => {
  it('digs and surfaces as a burrower changes, once per change', () => {
    const f = createFieldSounds(CLEAR);
    const digger = unit(1, plain('digger'));
    const w = world(digger);
    expect(frame(f, w)).toEqual([]);
    digger.burrowed = true;
    expect(frame(f, w)).toEqual(['burrow_dig']);
    expect(frame(f, w)).toEqual([]);
    digger.burrowed = false;
    expect(frame(f, w)).toEqual(['burrow_surface']);
    // A unit first seen underground (or a new uid in a reused slot) makes no sound.
    w.enemies.items[0] = unit(2, plain('digger'), { burrowed: true });
    expect(frame(f, w)).toEqual([]);
  });

  it("tells the boss's sneeze as its tell starts, and sneezes as the tell runs out", () => {
    const f = createFieldSounds(CLEAR);
    const boss = unit(9, SNEEZER, { bossPhase: 1, abilityTicks: 300 });
    const w = world(boss);
    expect(frame(f, w)).toEqual([]);
    boss.abilityTicks = TELL;
    expect(spawnTelling(boss)).toBe(true);
    expect(frame(f, w)).toEqual(['sneeze_tell']);
    boss.abilityTicks = 10;
    expect(frame(f, w)).toEqual([]);
    boss.abilityTicks = 300; // the timer reset: she sneezed
    expect(frame(f, w)).toEqual(['sneeze']);
  });

  it("doesn't sneeze when a phase change cuts the tell short, or tell a dig or a surfacing", () => {
    const f = createFieldSounds(CLEAR);
    const boss = unit(9, SNEEZER, { bossPhase: 1, abilityTicks: TELL });
    const w = world(boss);
    expect(frame(f, w)).toEqual(['sneeze_tell']);
    Object.assign(boss, {
      bossPhase: 2,
      invulnerableTicks: 90,
      abilityTicks: 240,
      abilityCount: 2,
    });
    expect(frame(f, w)).toEqual([]);
    // Phase 2: a dig's tell isn't a sneeze; the dig itself is a burrow sound.
    Object.assign(boss, { invulnerableTicks: 0, abilityTicks: TELL });
    expect(spawnTelling(boss)).toBe(false);
    expect(frame(f, w)).toEqual([]);
    Object.assign(boss, { burrowed: true, abilityTicks: 180 });
    expect(frame(f, w)).toEqual(['burrow_dig']);
    Object.assign(boss, { burrowed: false, abilityTicks: TELL });
    expect(frame(f, w)).toEqual(['burrow_surface']);
  });

  it('coos once per huddle leader', () => {
    const f = createFieldSounds(CLEAR);
    const young = [unit(2, plain('nibbler')), unit(3, plain('nibbler'))];
    const w = world(unit(1, plain('elder')), ...young);
    expect(frame(f, w)).toEqual([]);
    for (const y of young) y.huddleUid = 1;
    expect(frame(f, w)).toEqual(['huddle_coo']);
    for (const y of young) y.huddleUid = 0;
    frame(f, w);
    young[0]!.huddleUid = 1;
    expect(frame(f, w)).toEqual([]);
  });

  it("flaps a flock's wings on sim time, one voice for the flock, and stops with it", () => {
    const f = createFieldSounds(CLEAR);
    const every = Math.round(ENEMY_LOOPS['puffwing']!.everySec * TICK_HZ);
    const flock = [1, 2, 3].map((uid) => unit(uid, plain('puffwing')));
    const w = world(...flock);
    expect(frame(f, w)).toEqual(['wing_flap']);
    w.tick = every - 1;
    expect(frame(f, w)).toEqual([]);
    w.tick = every;
    expect(frame(f, w)).toEqual(['wing_flap']);
    // Paused (the tick holds): quiet.
    expect(frame(f, w)).toEqual([]);
    for (const p of flock) p.alive = false;
    w.tick += every;
    expect(frame(f, w)).toEqual([]);
  });

  it('flies the drone out, works the tile after its flight, flies on, and flies home', () => {
    const f = createFieldSounds(CLEAR);
    const w = world();
    expect(frame(f, w)).toEqual([]);
    w.wreckage.queue = [40, 41];
    expect(frame(f, w)).toEqual(['drone_fly']);
    w.tick = 30;
    w.wreckage.progressTicks = 30; // still flying
    expect(frame(f, w)).toEqual([]);
    w.tick = 90;
    w.wreckage.progressTicks = CLEAR * DRONE_SOUNDS.flyFrac;
    expect(frame(f, w)).toEqual(['drone_work']);
    w.tick = 100;
    expect(frame(f, w)).toEqual([]);
    w.tick = 90 + Math.round(DRONE_SOUNDS.workEverySec * TICK_HZ);
    expect(frame(f, w)).toEqual(['drone_work']);
    w.wreckage.queue = [41];
    w.wreckage.progressTicks = 0;
    expect(frame(f, w)).toEqual(['drone_fly']);
    w.wreckage.queue = [];
    const out: SoundCall[] = [];
    f.frame(w, out);
    expect(out).toEqual([
      { kind: 'sfx', id: 'drone_fly', pitch: DRONE_SOUNDS.homePitch, delay: 0 },
    ]);
  });
});
