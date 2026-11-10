import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { BOSS_ABILITY_TELL_SEC } from '../content/rules.ts';
import type { EnemyFaction } from '../content/types.ts';
import { secToTicks, TICK_HZ } from '../shared/time.ts';
import type { SoundCall } from './eventSounds.ts';
import { DRONE_SOUNDS, ENEMY_LOOPS } from './eventTables.ts';
import { CHARGE_SOUNDS, CLOAK_SOUNDS, HOLLOW_QUIET } from './eventTablesAct2.ts';
import {
  createFieldSounds,
  spawnTelling,
  type FieldEnemy,
  type FieldState,
  type FieldTower,
} from './fieldSounds.ts';

const TELL = secToTicks(BOSS_ABILITY_TELL_SEC);
const CLEAR = 360;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Unit = Mutable<FieldEnemy>;

const SNEEZER = {
  id: 'chitterbloom',
  faction: 'skitterkin' as const,
  cloaked: false,
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
  x: 0,
  y: 0,
  revealedTicks: 0,
  ...o,
});
const plain = (
  id: string,
  faction: EnemyFaction = 'skitterkin',
  cloaked = false,
): FieldEnemy['def'] => ({ id, faction, cloaked, boss: null });

type Bank = Mutable<FieldTower>;
interface World {
  tick: number;
  enemies: { items: Unit[]; used: number };
  towers: { items: Bank[]; used: number };
  wreckage: { queue: number[]; progressTicks: number };
}
const world = (...items: Unit[]): World => ({
  tick: 0,
  enemies: { items, used: items.length },
  towers: { items: [], used: 0 },
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

/** The live Capacitor Bank (the Zapcoil's spec b): a charge attack. */
const BANK = compileContent(RAW_CONTENT).towers.zapcoil.specs!.b;

describe('Act II field sounds (T450)', () => {
  it("keeps the Hollow units' quiet where they stood last frame, and drops it when they're gone", () => {
    const f = createFieldSounds(CLEAR);
    const mote = unit(1, plain('mote', 'hollow'), { x: 5, y: 5 });
    const w = world(mote, unit(2, plain('nibbler'), { x: 9, y: 9 }));
    expect(f.quietAt(5, 5)).toBe(false); // nothing seen yet
    expect(f.hollowLive()).toBe(false);
    frame(f, w);
    const r = HOLLOW_QUIET.radiusTiles;
    expect(f.quietAt(5, 5)).toBe(true);
    expect(f.hollowLive()).toBe(true); // the music's steady duck holds (HOLLOW_DUCK)
    expect(f.quietAt(5 + r * 0.7, 5 + r * 0.7)).toBe(true);
    expect(f.quietAt(5 + r, 5 + r)).toBe(false);
    expect(f.quietAt(9, 9)).toBe(false); // a Skitterkin makes no quiet
    mote.leaving = true;
    frame(f, w);
    expect(f.quietAt(5, 5)).toBe(false);
    expect(f.hollowLive()).toBe(false);
    mote.leaving = false;
    frame(f, w);
    expect(f.hollowLive()).toBe(true);
    mote.alive = false;
    frame(f, w);
    expect(f.quietAt(5, 5)).toBe(false);
    expect(f.hollowLive()).toBe(false);
  });

  it('hums for the Hollow and the Aelari while they are on the field', () => {
    const f = createFieldSounds(CLEAR);
    const w = world(unit(1, plain('mote', 'hollow')), unit(2, plain('glimmer', 'aelari')));
    expect(frame(f, w).toSorted()).toEqual(['aelari_hum', 'hollow_hum']);
    w.tick = Math.round(ENEMY_LOOPS['glimmer']!.everySec * TICK_HZ);
    expect(frame(f, w)).toEqual(['aelari_hum']);
    w.tick = Math.round(ENEMY_LOOPS['mote']!.everySec * TICK_HZ);
    expect(frame(f, w).toSorted()).toEqual(['aelari_hum', 'hollow_hum']);
  });

  it("walks a hidden cloaked unit's footsteps on sim time, one voice, and stops once it's revealed", () => {
    const f = createFieldSounds(CLEAR);
    const every = Math.round(CLOAK_SOUNDS.everySec * TICK_HZ);
    const sneak = unit(1, plain('nibbler', 'skitterkin', true));
    const w = world(sneak, unit(2, plain('nibbler', 'skitterkin', true)));
    expect(frame(f, w)).toEqual(['cloak_steps']);
    w.tick = every - 1;
    expect(frame(f, w)).toEqual([]);
    w.tick = every;
    expect(frame(f, w)).toEqual(['cloak_steps']);
    for (const u of w.enemies.items) u.revealedTicks = 60;
    w.tick = every * 2;
    expect(frame(f, w)).toEqual([]);
    // Hidden again: the steps come back at once.
    sneak.revealedTicks = 0;
    w.tick += 1;
    expect(frame(f, w)).toEqual(['cloak_steps']);
  });

  it("climbs a Capacitor Bank's hum a step each quarter of its charge, and starts over after", () => {
    const f = createFieldSounds(CLEAR);
    expect(BANK.attack?.kind).toBe('charge');
    const full = BANK.attack?.kind === 'charge' ? BANK.attack.chargeTicks : 0;
    const bank: Bank = {
      uid: 7,
      alive: true,
      tierDef: BANK,
      chargeTicks: 0,
      flatRate: 0,
      pctRate: 0,
    };
    const w = world();
    w.towers = { items: [bank], used: 1 };
    const hums = (): number[] => {
      const out: SoundCall[] = [];
      f.frame(w, out);
      return out.flatMap((c) => (c.kind === 'sfx' && c.id === CHARGE_SOUNDS.hum ? [c.pitch] : []));
    };
    expect(hums()).toEqual([]);
    bank.chargeTicks = 1;
    expect(hums()).toEqual([0]);
    bank.chargeTicks = Math.floor(full / 4);
    expect(hums()).toEqual([]);
    bank.chargeTicks = Math.floor(full / 4) + 1;
    expect(hums()).toEqual([CHARGE_SOUNDS.pitchPerStep]);
    bank.chargeTicks = full; // skipping a quarter (a slow frame) plays only the latest step
    expect(hums()).toEqual([3 * CHARGE_SOUNDS.pitchPerStep]);
    bank.chargeTicks = 0; // it discharged (or fizzled)
    expect(hums()).toEqual([]);
    bank.chargeTicks = 1;
    expect(hums()).toEqual([0]);
  });
});
