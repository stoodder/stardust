// dev_phases (T808; render/__fixtures__/devM8.ts): the Unsung in whole sims, through commands.
// With its HP cut to 3000 (the fixture's towers can't burn 30000), a build at the Halls mouth
// takes it through its four forms (the gather, the split with no merge and the rise, the two digs
// toward the choir, the Song's Silencers) to Dawn, where it is laid to rest; each form cues the
// tick after its phase begins; the run is deterministic, and a replay of a prefix of its command
// log that ends with the boss dug in (phase 3) lands on the same state. With its real 30000 HP and
// par's towers, the countdown alone lays it to rest. sim/unsung.test.ts has the unit rules;
// smoke/unsung.spec.ts plays the same map.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../src/content/compile.ts';
import type { CompiledContent } from '../src/content/compiled.ts';
import type { IdSpace, RawContent } from '../src/content/types.ts';
import { DEV_CONTENT } from '../src/render/__fixtures__/devBattle.ts';
import { createSim, type Sim, type SimConfig } from '../src/sim/index.ts';
import type { SimEvent } from '../src/sim/events.ts';

const MAP = 'dev_phases';

/** DEV_CONTENT, the Unsung's HP set to `hp`. */
function content(hp: number): CompiledContent<IdSpace> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the dev ids are an IdSpace
  const raw = DEV_CONTENT as unknown as RawContent<IdSpace>;
  const unsung = { ...raw.enemies.unsung!, hp };
  return compileContent({ ...raw, enemies: { ...raw.enemies, unsung } });
}
const CUT = content(3000);
const REAL = content(30000);

function config(c: CompiledContent<IdSpace>, quill: 'keep' | 'rewrite'): SimConfig<IdSpace> {
  const map = c.maps[MAP]!;
  return {
    content: c,
    mapId: MAP,
    seed: 1,
    loadout: map.builds.parBuild.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
    specsUnlocked: [],
    scriptFlags: { quill_choice: quill, spared_quiet_wave: true },
  };
}

/** Rivets round the Halls mouth beside par's, upgraded as credits allow. */
const RING = [
  [8, 1],
  [8, 5],
  [4, 5],
  [1, 3],
  [11, 3],
] as const;

interface Played {
  readonly s: Sim<IdSpace>;
  readonly events: SimEvent<IdSpace>[];
  readonly at: Map<SimEvent<IdSpace>, number>;
  readonly hashes: Map<number, string>;
}

/** Par's builds, the ring (with `ring`), every wave as soon as it can be called; "Who's there?". */
function play(
  c: CompiledContent<IdSpace>,
  quill: 'keep' | 'rewrite',
  ring: boolean,
  marks: readonly number[] = [],
): Played {
  const s = createSim(config(c, quill));
  for (const st of s.map.builds.parBuild.steps) {
    if (st.kind === 'build') s.enqueue({ type: 'build', tower: st.tower, tile: st.tile });
    s.step();
  }
  if (ring) {
    for (const [col, row] of RING) {
      s.enqueue({ type: 'build', tower: 'rivet', tile: [col, row] });
      s.step();
    }
  }
  s.enqueue({ type: 'callWave' });
  const events: SimEvent<IdSpace>[] = [];
  const at = new Map<SimEvent<IdSpace>, number>();
  const hashes = new Map<number, string>();
  while (s.state.outcome === 'playing' && s.state.tick < 60 * 400) {
    s.step();
    const out: SimEvent<IdSpace>[] = [];
    s.drainEvents(out);
    for (const e of out) {
      at.set(e, s.state.tick);
      if (e.type === 'ForcedInputRequested') s.enqueue({ type: 'scriptInput', id: e.id });
    }
    events.push(...out);
    if (marks.includes(s.state.tick)) hashes.set(s.state.tick, s.hash());
    if (ring && s.state.tick % 60 === 0 && s.state.credits >= 200) {
      const t = s.state.towers.items.find((x) => x.alive && x.tier < 3 && x.def?.id === 'rivet');
      if (t !== undefined) s.enqueue({ type: 'upgrade', towerUid: t.uid });
    }
    if (s.state.schedule.phase === 'countdown') s.enqueue({ type: 'callWave' });
  }
  return { s, events, at, hashes };
}

/** A fresh sim fed `log`'s commands before their ticks, stepped to `tick`. */
function replay(
  c: CompiledContent<IdSpace>,
  log: Sim<IdSpace>['state']['commandLog'],
  tick: number,
) {
  const s = createSim(config(c, 'rewrite'));
  let next = 0;
  while (s.state.outcome === 'playing' && s.state.tick < tick) {
    while (next < log.length && log[next]!.tick === s.state.tick) {
      s.enqueue(log[next]!.cmd);
      next++;
    }
    s.step();
  }
  return s;
}

function of<T extends SimEvent<IdSpace>['type']>(events: SimEvent<IdSpace>[], type: T) {
  return events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);
}

describe('dev_phases (T808): the Unsung', () => {
  const played = play(CUT, 'rewrite', true);
  const { events, at } = played;

  it('goes through its four forms to Dawn, where it is laid to rest, and the map is won', () => {
    expect(played.s.state.outcome).toBe('won');
    const phases = of(events, 'BossPhase').filter((e) => e.enemy === 'unsung');
    expect(phases.map((e) => e.phase)).toEqual([1, 2, 3, 4]);
    expect(of(events, 'BossSplit')).toHaveLength(1);
    expect(of(events, 'BossMerged')).toEqual([]);
    const rise = of(events, 'BossRisen');
    expect(rise).toHaveLength(1);
    expect(rise[0]!.uid).toBe(phases[2]!.uid);
    const up = of(events, 'BossSurfaced');
    expect(up).toHaveLength(2);
    expect(up.every((e) => !e.dugOut && e.hushed !== 0)).toBe(true); // no burrow answer here
    expect(of(events, 'BossAdds').length).toBeGreaterThan(0);
    const end = of(events, 'BossEnded');
    expect(end).toEqual([
      { type: 'BossEnded', uid: rise[0]!.uid, enemy: 'unsung', how: 'layToRest' },
    ]);
    expect(at.get(end[0]!)).toBe(at.get(of(events, 'PhaseChanged').at(-1)!)); // at Dawn
    expect(played.s.state.restPoints).toBe(played.s.state.restTarget);
  });

  it('cues each form the tick after its phase begins', () => {
    const phases = of(events, 'BossPhase').filter((e) => e.enemy === 'unsung');
    const cues = of(events, 'ScriptCue').filter((e) => e.cueId.startsWith('dev_phases_cue_unsung'));
    expect(cues.map((c) => c.cueId)).toEqual([1, 2, 3, 4].map((n) => `dev_phases_cue_unsung_${n}`));
    for (let i = 0; i < 4; i++) expect(at.get(cues[i]!)).toBe(at.get(phases[i]!)! + 1);
  });

  it('is deterministic, and a replay ending with it dug in (phase 3) lands on the same state', () => {
    const first = of(events, 'BossSurfaced')[0]!;
    const mid = at.get(first)! - 60; // a second before it comes up: underground
    const again = play(CUT, 'rewrite', true, [mid]);
    expect(again.s.hash()).toBe(played.s.hash());
    const r = replay(CUT, played.s.state.commandLog, mid);
    expect(r.state.enemies.items.some((e) => e.alive && e.def?.id === 'unsung' && e.burrowed)).toBe(
      true,
    );
    expect(r.hash()).toBe(again.hashes.get(mid));
  });

  it('with its real 30000 HP and par’s towers, the countdown alone lays it to rest', () => {
    const real = play(REAL, 'keep', false);
    expect(real.s.state.outcome).toBe('won');
    expect(of(real.events, 'BossEnded')).toMatchObject([{ enemy: 'unsung', how: 'layToRest' }]);
    expect(of(real.events, 'EnemyLeaked').filter((e) => e.enemy === 'unsung')).toEqual([]);
  });
});
