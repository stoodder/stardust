// The fizzle's prediction against the sim (D150, D151; jamLook.ts `tellDoomed`, `lasersDoomed`):
// a System Reboot cast in a Silencer's tendril dooms it the same tick, and a doomed tell never
// lands; with no Reboot the same tell is never doomed and lands. An Auditor's ring has no fixed
// targets, so it is never called early: the sim says on its landing tick whether a counter turned
// it (JamFizzled, T777; JamView fizzles on it): after a Reboot it lands nothing and fizzles, but it
// still jams a tower built in its reach after the Reboot, and doesn't fizzle.
// Hostile Takeover's laser after a Reboot is doomed (`lasersDoomed`) and lands nothing. On the dev
// ranges: dev_silence's Silencer, dev_takeover's W1 Auditors and W2's "Shareholder Value".
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import {
  createSim,
  ringTelling,
  type Sim,
  type SimConfig,
  type SimEvent,
} from '../../sim/index.ts';
import { DEV_CONTENT } from '../__fixtures__/devBattle.ts';
import { lasersDoomed, tellDoomed } from './jamLook.ts';

const dev = compileContent(DEV_CONTENT);
const maps: Readonly<Record<string, (typeof dev.maps)[keyof typeof dev.maps]>> = dev.maps;

function sim(mapId: string): Sim<IdSpace> {
  const map = maps[mapId]!;
  const config: SimConfig<IdSpace> = {
    content: dev,
    mapId,
    seed: 1,
    loadout: map.builds.parBuild.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: {
      slot1: map.builds.referenceProfile.technicianAbility,
      slot2: null,
      slot2State: 'none',
    },
    specsUnlocked: map.builds.referenceProfile.specs,
    scriptFlags: {},
  };
  return createSim(config);
}

type Kind = 'tendril' | 'ring';

/** A tower pool as `lasersDoomed` reads it. */
function towers(list: { uid: number; jamImmuneTicks: number; alive?: boolean }[]) {
  return { used: list.length, items: list.map((t) => ({ alive: true, ...t })) };
}

/** Builds `build`, calls wave 1, and steps until a `kind` tell is under way; its jammer's uid. */
function untilTell(s: Sim<IdSpace>, kind: Kind, build: readonly [string, number, number][]) {
  for (const [tower, c, r] of build) {
    s.enqueue({ type: 'build', tower, tile: [c, r] });
  }
  s.step();
  s.enqueue({ type: 'callWave' });
  for (let k = 0; k < 60 * 120; k++) {
    s.step();
    const e = s.state.enemies.items.find((x) =>
      kind === 'ring' ? ringTelling(x) : x.alive && x.jamTarget !== 0 && x.jamTellTicks > 0,
    );
    if (e !== undefined) return e.uid;
  }
  throw new Error(`no ${kind} tell`);
}

/** Whether `uid`'s tendril under way is doomed now, as JamView reads it. */
function doomed(s: Sim<IdSpace>, uid: number): boolean {
  const e = s.state.enemies.items.find((x) => x.alive && x.uid === uid)!;
  const t = s.state.towers.items.find((x) => x.alive && x.uid === e.jamTarget)!;
  return tellDoomed(t.jamImmuneTicks, e.jamTellTicks);
}

/** Whether `uid`'s tell (a tendril, a ring, or a Takeover laser) is under way. */
function telling(s: Sim<IdSpace>, uid: number): boolean {
  const e = s.state.enemies.items.find((x) => x.alive && x.uid === uid);
  return (
    e !== undefined &&
    e.jamTellTicks > 0 &&
    (e.jamTarget !== 0 || ringTelling(e) || e.takeoverTowers.length > 0)
  );
}

/**
 * Steps until `uid`'s tell is over (calling `each` on every tick of it first); the jams it landed,
 * its JamFizzled events, and the ticks it took from the first step.
 */
function playOut(s: Sim<IdSpace>, uid: number, each: () => void = () => {}) {
  const events: SimEvent<IdSpace>[] = [];
  let ticks = 0;
  while (telling(s, uid)) {
    each();
    s.step();
    ticks++;
    s.drainEvents(events);
  }
  const landed = events.filter((ev) => ev.type === 'TowerJammed' && ev.source === uid).length;
  const fizzled = events.filter((ev) => ev.type === 'JamFizzled' && ev.uid === uid).length;
  return { landed, fizzled, ticks };
}

/** The ticks left of `uid`'s tell now. */
function left(s: Sim<IdSpace>, uid: number): number {
  return s.state.enemies.items.find((x) => x.alive && x.uid === uid)!.jamTellTicks;
}

const SILENCE: [string, number, number][] = [
  ['choir', 7, 2],
  ['rivet', 12, 2],
];
const AUDIT: [string, number, number][] = [
  ['choir', 7, 2],
  ['rivet', 5, 2],
  ['rivet', 3, 2],
  ['rivet', 7, 4],
];

/** Casts System Reboot (slot 1) and steps a tick. */
function reboot(s: Sim<IdSpace>): void {
  s.enqueue({ type: 'ability', slot: 1 });
  s.step();
}

describe('the fizzle (D150, D151): a tendril doomed by a Reboot never lands', () => {
  it('no Reboot: never doomed, and it lands', () => {
    const s = sim('dev_silence');
    const uid = untilTell(s, 'tendril', SILENCE);
    const marks: boolean[] = [];
    const { landed } = playOut(s, uid, () => marks.push(doomed(s, uid)));
    expect(marks.length).toBeGreaterThan(1);
    expect(marks.every((m) => !m)).toBe(true);
    expect(landed).toBeGreaterThan(0);
  });

  it('a Reboot mid-tell dooms it that tick, it stays doomed, and lands nothing', () => {
    const s = sim('dev_silence');
    const uid = untilTell(s, 'tendril', SILENCE);
    s.step();
    expect(doomed(s, uid)).toBe(false);
    reboot(s);
    const marks: boolean[] = [];
    const { landed } = playOut(s, uid, () => marks.push(doomed(s, uid)));
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((m) => m)).toBe(true);
    expect(landed).toBe(0);
  });
});

describe('the fizzle (D151, T777): a ring is judged only on its landing tick', () => {
  it('no Reboot: it runs its whole tell and lands, no fizzle', () => {
    const s = sim('dev_takeover');
    const uid = untilTell(s, 'ring', AUDIT);
    const was = left(s, uid);
    const { landed, fizzled, ticks } = playOut(s, uid);
    expect(ticks).toBe(was);
    expect(landed).toBeGreaterThan(0);
    expect(fizzled).toBe(0);
  });

  it('a Reboot mid-ring: it still ends on its landing tick, landing nothing (FIZZLED then)', () => {
    const s = sim('dev_takeover');
    const uid = untilTell(s, 'ring', AUDIT);
    s.step();
    reboot(s);
    const was = left(s, uid);
    const { landed, fizzled, ticks } = playOut(s, uid);
    expect(ticks).toBe(was);
    expect(landed).toBe(0);
    expect(fizzled).toBe(1);
  });

  it('a tower built in its reach after the Reboot is still jammed: no early fizzle', () => {
    const s = sim('dev_takeover');
    const uid = untilTell(s, 'ring', AUDIT);
    s.step();
    reboot(s);
    // Every Rivet the ring reached is immune now; a new one built in its reach isn't.
    const e = s.state.enemies.items.find((x) => x.alive && x.uid === uid)!;
    const before = s.state.towers.items.filter((t) => t.alive).length;
    for (const [dc, r] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 2],
      [1, 2],
      [-1, 2],
    ] as const) {
      s.enqueue({ type: 'build', tower: 'rivet', tile: [Math.round(e.x) + dc, r] });
      s.step();
      if (s.state.towers.items.filter((t) => t.alive).length > before) break;
    }
    const built = s.state.towers.items.filter((t) => t.alive && t.jamImmuneTicks === 0);
    expect(built.some((t) => Math.hypot(t.x - e.x, t.y - e.y) <= 2)).toBe(true);
    const { landed, fizzled } = playOut(s, uid);
    expect(landed).toBeGreaterThan(0);
    expect(fizzled).toBe(0);
  });
});

/** dev_takeover under takeover.spec's build, stepped to "Shareholder Value"'s first laser. */
function untilLaser(): { s: Sim<IdSpace>; uid: number } {
  const s = sim('dev_takeover');
  const at = (c: number, r: number) =>
    s.state.towers.items.find((t) => t.alive && t.col === c && t.row === r)!.uid;
  const rivets = [
    [5, 2],
    [7, 4],
    [3, 2],
    [12, 4],
    [12, 2],
  ] as const;
  for (const [c, r] of rivets) s.enqueue({ type: 'build', tower: 'rivet', tile: [c, r] });
  s.enqueue({ type: 'build', tower: 'choir', tile: [7, 2] });
  s.step();
  for (const [c, r] of rivets.filter(([x, y]) => !(x === 12 && y === 4))) {
    s.enqueue({ type: 'upgrade', towerUid: at(c, r) });
    s.step();
    s.enqueue({ type: 'upgrade', towerUid: at(c, r) });
    s.step();
    s.enqueue({ type: 'specialize', towerUid: at(c, r), spec: 'b' });
    s.step();
  }
  s.enqueue({ type: 'callWave' });
  for (let k = 0; k < 60 * 600; k++) {
    if (s.state.wave < 2 && s.state.schedule.phase === 'countdown') {
      s.enqueue({ type: 'callWave' });
    }
    s.step();
    const e = s.state.enemies.items.find(
      (x) => x.alive && x.jamTellTicks > 0 && x.takeoverTowers.length > 0,
    );
    if (e !== undefined) return { s, uid: e.uid };
  }
  throw new Error('no laser');
}

/** Whether `uid`'s laser is doomed now, as JamView reads it. */
function laserDoomed(s: Sim<IdSpace>, uid: number): boolean {
  const e = s.state.enemies.items.find((x) => x.alive && x.uid === uid)!;
  return lasersDoomed(e.takeoverTowers, e.jamTellTicks, s.state.towers);
}

describe('the fizzle (D151): a Takeover laser spent by a Reboot', () => {
  it('no Reboot: never doomed, and it lands', () => {
    const { s, uid } = untilLaser();
    const marks: boolean[] = [];
    const { landed } = playOut(s, uid, () => marks.push(laserDoomed(s, uid)));
    expect(marks.length).toBeGreaterThan(1);
    expect(marks.every((m) => !m)).toBe(true);
    expect(landed).toBeGreaterThan(0);
  });

  it('a Reboot mid-laser dooms it that tick, it stays doomed, and lands nothing', () => {
    const { s, uid } = untilLaser();
    s.step();
    expect(laserDoomed(s, uid)).toBe(false);
    reboot(s);
    const marks: boolean[] = [];
    const { landed } = playOut(s, uid, () => marks.push(laserDoomed(s, uid)));
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((m) => m)).toBe(true);
    expect(landed).toBe(0);
  });

  it('lasersDoomed: every standing pick immune past the landing, at least one standing', () => {
    expect(lasersDoomed([1, 2], 30, towers([{ uid: 1, jamImmuneTicks: 360 }]))).toBe(true);
    const both = [
      { uid: 1, jamImmuneTicks: 360 },
      { uid: 2, jamImmuneTicks: 0 },
    ];
    expect(lasersDoomed([1, 2], 30, towers(both))).toBe(false);
    expect(lasersDoomed([1], 30, towers([{ uid: 1, jamImmuneTicks: 30 }]))).toBe(false);
    expect(lasersDoomed([3], 30, towers(both))).toBe(false); // sold: not a fizzle
    expect(lasersDoomed([1], 30, towers([{ uid: 1, jamImmuneTicks: 360, alive: false }]))).toBe(
      false,
    );
    expect(lasersDoomed([1], 0, towers([{ uid: 1, jamImmuneTicks: 360 }]))).toBe(false);
  });
});

describe('the rules', () => {
  it('doomed exactly while the immunity outlasts the tell', () => {
    expect(tellDoomed(0, 30)).toBe(false);
    expect(tellDoomed(30, 30)).toBe(false); // it runs out the tick the tell lands
    expect(tellDoomed(31, 30)).toBe(true);
    expect(tellDoomed(360, 0)).toBe(false); // no tell under way
  });
});
