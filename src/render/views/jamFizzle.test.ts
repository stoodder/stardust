// The fizzle's prediction against the sim (D150; jamLook.ts `tellDoomed`, `ringDoomed`): a System
// Reboot cast in a Silencer's or an Auditor's tell dooms it the same tick (the view snaps it off
// and shows FIZZLED), and a doomed tell never lands; with no Reboot the same tell is never doomed
// and lands. On the dev ranges: dev_silence's Silencer, dev_takeover's W1 Auditors.
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
import { ringDoomed, tellDoomed } from './jamLook.ts';

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
    specsUnlocked: [],
    scriptFlags: {},
  };
  return createSim(config);
}

type Kind = 'tendril' | 'ring';

/** Builds `towers`, calls wave 1, and steps until a `kind` tell is under way; its jammer's uid. */
function untilTell(s: Sim<IdSpace>, kind: Kind, towers: readonly [string, number, number][]) {
  for (const [tower, c, r] of towers) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- dev tower ids
    s.enqueue({ type: 'build', tower: tower as never, tile: [c, r] });
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

/** Whether `uid`'s tell under way is doomed now, as JamView reads it. */
function doomed(s: Sim<IdSpace>, uid: number, kind: Kind): boolean {
  const e = s.state.enemies.items.find((x) => x.alive && x.uid === uid)!;
  if (kind === 'ring') {
    return ringDoomed(e.x, e.y, e.def!.jam!.radiusTiles, e.jamTellTicks, s.state.towers);
  }
  const t = s.state.towers.items.find((x) => x.alive && x.uid === e.jamTarget)!;
  return tellDoomed(t.jamImmuneTicks, e.jamTellTicks);
}

/** Steps until `uid`'s tell is over; the jams it landed, and whether it was doomed each tick. */
function playOut(s: Sim<IdSpace>, uid: number, kind: Kind) {
  const events: SimEvent<IdSpace>[] = [];
  const marks: boolean[] = [];
  const telling = (): boolean => {
    const e = s.state.enemies.items.find((x) => x.alive && x.uid === uid);
    return e !== undefined && e.jamTellTicks > 0 && (kind === 'ring' || e.jamTarget !== 0);
  };
  while (telling()) {
    marks.push(doomed(s, uid, kind));
    s.step();
    s.drainEvents(events);
  }
  const landed = events.filter((ev) => ev.type === 'TowerJammed' && ev.source === uid).length;
  return { landed, marks };
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

describe('the fizzle (D150): a Reboot in the tell dooms it, and a doomed tell never lands', () => {
  for (const [kind, mapId, towers] of [
    ['tendril', 'dev_silence', SILENCE],
    ['ring', 'dev_takeover', AUDIT],
  ] as const) {
    it(`${kind}: no Reboot, never doomed, and it lands`, () => {
      const s = sim(mapId);
      const uid = untilTell(s, kind, towers);
      const { landed, marks } = playOut(s, uid, kind);
      expect(marks.length).toBeGreaterThan(1);
      expect(marks.every((m) => !m)).toBe(true);
      expect(landed).toBeGreaterThan(0);
    });

    it(`${kind}: a Reboot mid-tell dooms it that tick, it stays doomed, and lands nothing`, () => {
      const s = sim(mapId);
      const uid = untilTell(s, kind, towers);
      s.step();
      expect(doomed(s, uid, kind)).toBe(false);
      s.enqueue({ type: 'ability', slot: 1 });
      s.step();
      const { landed, marks } = playOut(s, uid, kind);
      expect(marks.length).toBeGreaterThan(0);
      expect(marks.every((m) => m)).toBe(true);
      expect(landed).toBe(0);
    });
  }

  it('the rule: doomed exactly while the immunity outlasts the tell', () => {
    expect(tellDoomed(0, 30)).toBe(false);
    expect(tellDoomed(30, 30)).toBe(false); // it runs out the tick the tell lands
    expect(tellDoomed(31, 30)).toBe(true);
    expect(tellDoomed(360, 0)).toBe(false); // no tell under way
    const towers = (list: { x: number; y: number; jamImmuneTicks: number }[]) => ({
      used: list.length,
      items: list.map((t) => ({ alive: true, def: {}, ...t })),
    });
    expect(ringDoomed(0, 0, 2, 30, towers([]))).toBe(false); // nothing in reach: not a fizzle
    expect(ringDoomed(0, 0, 2, 30, towers([{ x: 1, y: 0, jamImmuneTicks: 360 }]))).toBe(true);
    const mixed = [
      { x: 1, y: 0, jamImmuneTicks: 360 },
      { x: 0, y: 1, jamImmuneTicks: 0 },
    ];
    expect(ringDoomed(0, 0, 2, 30, towers(mixed))).toBe(false);
    // A tower out of reach doesn't count either way.
    expect(ringDoomed(0, 0, 2, 30, towers([mixed[0]!, { x: 5, y: 0, jamImmuneTicks: 0 }]))).toBe(
      true,
    );
  });
});
