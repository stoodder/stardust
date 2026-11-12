// The finale's story actions (T807; sim/revoke.ts, sim/echo.ts; D154, T501): the restored class
// after "Who's there?" (`restoreTowerClass: 'lastRevoked'`, consistent with M6's revocation), the
// phase-scoped ability lock (`lockAbility`: a cast refused while it holds, ended as the script
// phase rises, never a revocation), and Thrum's echo (`spawnEcho`: walks in from the Halls,
// untargetable, laid to rest in gold, no rest points); each deterministic. On the sim fixture map,
// its script replaced per test.
import { describe, expect, it } from 'vitest';
import type {
  CompiledChoir,
  CompiledMapDef,
  CompiledScriptAction,
  CompiledScriptTrigger,
  CompiledSong,
} from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { IdSpace } from '../content/types.ts';
import { inSong } from './choir.ts';
import type { SimConfig } from './config.ts';
import { echo, ECHO_RISE_TICKS, ECHO_STEP_TILES, echoWalking, spawnEcho } from './echo.ts';
import { isHushableAlly } from './enemyAbilities/hush.ts';
import { ENEMY_BLANK, type Ally } from './entities.ts';
import type { SimEvent } from './events.ts';
import { placeOnRoute } from './path.ts';
import { poolAlloc } from './pool.ts';
import { slotRevoked } from './revoke.ts';
import { createSim, type Sim } from './sim.ts';
import { song, SONG_PHASE } from './song.ts';
import { createState, takeUid, type SimState } from './state.ts';
import { unsupportedScript } from './systems/triggers.ts';
import { createScratch, type TickContext } from './tick.ts';
import { FIXTURE_CONTENT, fixtureConfig, type FixtureIds } from './__fixtures__/sim.ts';

const FX_MAP = FIXTURE_CONTENT.maps.fx_map;
type Ev = SimEvent<FixtureIds>;
type Action = CompiledScriptAction<IdSpace>;

/** fx_map whose script is `events` (each `[trigger, actions]`), and a sim on it. */
function simWith(
  events: readonly (readonly [CompiledScriptTrigger<IdSpace>, readonly Action[]])[],
  over: Partial<SimConfig<FixtureIds>> = {},
  map: Partial<CompiledMapDef<IdSpace>> = {},
): Sim<FixtureIds> {
  const fx_map = {
    ...FX_MAP,
    ...map,
    events: events.map(([on, actions], i) => ({
      id: `e${i}`,
      on,
      when: null,
      actions,
      once: true,
    })),
  };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test: the fixture map re-scripted
  const content = { ...FIXTURE_CONTENT, maps: { fx_map } } as unknown as typeof FIXTURE_CONTENT;
  return createSim(fixtureConfig({ content, ...over }));
}

/** The sim's state, writable: tests set credits by hand. */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the sim's own state, viewed
const mut = (sim: Sim<FixtureIds>): SimState => sim.state as unknown as SimState;

/** Steps until tick `tick` has run, collecting the events. */
function stepTo(sim: Sim<FixtureIds>, tick: number, out: Ev[] = []): Ev[] {
  while (sim.state.tick <= tick) {
    sim.step();
    sim.drainEvents(out);
  }
  return out;
}

/** Applies `cmd` now and returns the events it raised. */
function apply(sim: Sim<FixtureIds>, cmd: Parameters<Sim<FixtureIds>['enqueue']>[0]): Ev[] {
  const out: Ev[] = [];
  sim.enqueue(cmd);
  sim.applyPending();
  sim.drainEvents(out);
  return out;
}

const of = <T extends Ev['type']>(out: readonly Ev[], type: T) =>
  out.filter((e): e is Extract<Ev, { type: T }> => e.type === type);

const REVOKE_EVERGLOW: Action = {
  revokeTowerClass: { select: 'mostInvested', faction: 'everglow' },
  refundPct: 100,
};
const REVOKE_ANY: Action = { revokeTowerClass: { select: 'mostInvested' }, refundPct: 100 };
const RESTORE: Action = { restoreTowerClass: 'lastRevoked' };

describe("restoreTowerClass 'lastRevoked' (the finale's \"Not Everglow.\")", () => {
  it('brings the revoked class back after its revocation in the same run, paying nothing', () => {
    const sim = simWith([
      [{ tick: 5 }, [REVOKE_EVERGLOW]],
      [{ tick: 10 }, [RESTORE]],
    ]);
    mut(sim).credits = 1000;
    const built = of(apply(sim, { type: 'build', tower: 'fx_gun', tile: [1, 1] }), 'TowerBuilt');
    const uid = built[0]!.uid;
    const out = stepTo(sim, 5);
    const refund = of(out, 'ClassRevoked')[0]!.refund;
    expect(refund).toBe(100); // M6's 100% of what was paid
    expect(sim.state.revoked.towers).toEqual(['fx_gun']);
    // Revoked: a build of it is refused.
    expect(
      of(apply(sim, { type: 'build', tower: 'fx_gun', tile: [3, 1] }), 'CommandRejected'),
    ).toEqual([expect.objectContaining({ reason: 'revoked' })]);
    const credits = sim.state.credits;
    const after = stepTo(sim, 10);
    expect(of(after, 'ClassRestored')).toEqual([{ type: 'ClassRestored', tower: 'fx_gun' }]);
    // Nothing paid or charged; the folded tower stays gone (and refused by uid); still counted.
    expect(sim.state.credits).toBe(credits);
    expect(sim.state.revoked).toEqual({ towers: [], abilities: [], uids: [uid] });
    expect(sim.state.stats.revocations).toBe(1);
    expect(sim.state.stats.creditsRefunded).toBe(refund);
    expect(sim.state.towers.live).toBe(0);
    expect(of(apply(sim, { type: 'upgrade', towerUid: uid }), 'CommandRejected')).toEqual([
      expect.objectContaining({ reason: 'revoked' }),
    ]);
    // Buildable again, on its old tile too.
    expect(
      of(apply(sim, { type: 'build', tower: 'fx_gun', tile: [1, 1] }), 'TowerBuilt'),
    ).toHaveLength(1);
  });

  it('restores only the last class revoked, and does nothing with none revoked', () => {
    const sim = simWith([
      [{ tick: 2 }, [RESTORE]],
      [{ tick: 5 }, [REVOKE_ANY, REVOKE_ANY]],
      [{ tick: 10 }, [RESTORE]],
    ]);
    const early = stepTo(sim, 2);
    expect(of(early, 'ClassRestored')).toEqual([]);
    stepTo(sim, 5);
    expect(sim.state.revoked.towers).toEqual(['fx_gun', 'fx_mortar']);
    const out = stepTo(sim, 10);
    expect(of(out, 'ClassRestored')).toEqual([{ type: 'ClassRestored', tower: 'fx_mortar' }]);
    expect(sim.state.revoked.towers).toEqual(['fx_gun']);
  });
});

/** fx_map with one objective whose `onComplete` runs `onComplete`. */
function withObjective(onComplete: readonly Action[]): CompiledMapDef<IdSpace> {
  return {
    ...FX_MAP,
    objectives: [
      {
        id: 'x',
        name: 'x',
        description: 'x',
        condition: { stat: 'lateSells', lte: 0 },
        intel: 0,
        onComplete,
      },
    ],
  };
}

const LOCK: Action = { lockAbility: 'fx_strike', on: true };
const strike = { type: 'ability', slot: 1, target: [2, 2] } as const;

describe('lockAbility (Directive 0: a phase lock, never a revocation; T501)', () => {
  it('darkens the slot and refuses a cast while it holds, then ends as the phase rises', () => {
    const sim = simWith([
      [{ tick: 5 }, [{ setPhase: 2 }, LOCK]],
      [{ tick: 10 }, [{ setPhase: 2 }]], // the same phase: the lock holds
      [{ tick: 20 }, [{ setPhase: 3 }]],
    ]);
    const out = stepTo(sim, 5);
    expect(of(out, 'AbilityLocked')).toEqual([
      { type: 'AbilityLocked', ability: 'fx_strike', on: true },
    ]);
    expect(sim.state.abilitiesLocked).toEqual(['fx_strike']);
    expect(slotRevoked(sim.state, sim.config, 1)).toBe(true);
    expect(of(apply(sim, strike), 'CommandRejected')).toEqual([
      expect.objectContaining({ reason: 'revoked' }),
    ]);
    // Never a revocation: nothing revoked, nothing counted, nothing for run end to save.
    expect(sim.state.revoked.abilities).toEqual([]);
    expect(sim.state.stats.revocations).toBe(0);
    stepTo(sim, 19);
    expect(sim.state.abilitiesLocked).toEqual(['fx_strike']);
    const end = stepTo(sim, 20);
    expect(of(end, 'AbilityLocked')).toEqual([
      { type: 'AbilityLocked', ability: 'fx_strike', on: false },
    ]);
    expect(sim.state.abilitiesLocked).toEqual([]);
    expect(slotRevoked(sim.state, sim.config, 1)).toBe(false);
    expect(of(apply(sim, strike), 'AbilityUsed')).toHaveLength(1);
  });

  it('`on: false` unlocks it; a repeat changes nothing; a setPhase before it in the event does not end it', () => {
    const sim = simWith([
      [{ tick: 3 }, [{ setPhase: 2 }, LOCK, LOCK]],
      [
        { tick: 6 },
        [
          { lockAbility: 'fx_strike', on: false },
          { lockAbility: 'fx_strike', on: false },
        ],
      ],
    ]);
    const out = stepTo(sim, 6);
    expect(of(out, 'AbilityLocked').map((e) => e.on)).toEqual([true, false]);
    expect(sim.state.abilitiesLocked).toEqual([]);
  });

  it("locks the ability in the companion's slot as well (QUILL's Time Dilation, slot 2)", () => {
    const sim = simWith([[{ tick: 3 }, [{ lockAbility: 'fx_chime', on: true }]]], {
      companion: 'quill',
      abilities: { slot1: 'fx_strike', slot2: 'fx_chime', slot2State: 'present' },
    });
    stepTo(sim, 3);
    expect(slotRevoked(sim.state, sim.config, 2)).toBe(true);
    expect(slotRevoked(sim.state, sim.config, 1)).toBe(false);
  });

  it('runs from an objective too; the restore and the echo run from map events only', () => {
    expect(unsupportedScript(withObjective([LOCK]))).toEqual([]);
    expect(unsupportedScript(withObjective([RESTORE, { spawnEcho: 'thrum' }]))).toEqual([
      "objective 'x': action restoreTowerClass runs from map events only",
      "objective 'x': action spawnEcho runs from map events only",
    ]);
  });
});

// ── Thrum's echo ─────────────────────────────────────────────────────────────────────────────

const LIVE = compileContent(RAW_CONTENT);
const ROAD = FX_MAP.routes.a!;
/** dev_song's song (render/__fixtures__/devM8.ts), per tick. */
const SONG: CompiledSong = {
  baseRadius: 2.5,
  silentPct: 0.6,
  restTarget: 40,
  restPerTick: 0.2 / 60,
  restPerBossHp: 0.001,
  multipliers: [],
  scatter: { reformTicks: 240, hpPct: 0.5 },
};
const CHOIR: CompiledChoir = {
  leader: 'pebble',
  route: ROAD,
  stopAt: 'halls',
  stopTile: [5, 4],
  singers: 10,
  paceTilesPerTick: 0.35 / 60,
  haltTiles: 1.5,
  groups: [],
  thrum: null,
  returned: null,
};
const SONG_MAP: CompiledMapDef<IdSpace> = { ...FX_MAP, choir: CHOIR, song: SONG };

function setup(): { state: SimState; ctx: TickContext } {
  const state = createState(SONG_MAP, 1);
  state.choir.singers = 10;
  state.choir.voices = 10;
  state.choir.x = 100; // far off until a test moves her
  state.choir.y = 100;
  state.phase = SONG_PHASE;
  const config = fixtureConfig();
  return {
    state,
    ctx: { content: FIXTURE_CONTENT, map: SONG_MAP, config, scratch: createScratch() },
  };
}

const echoes = (state: SimState): Ally[] =>
  state.allies.items.filter((a) => a.alive && a.kind === 'echo');

/** 30 ticks of the echo and the song with the leader by the road's far end (and the echo, or not). */
function restRun(withEcho: boolean): { points: number; rested: number; resting: boolean } {
  const { state, ctx } = setup();
  state.choir.x = ROAD.xs[0]! + 1; // it starts inside the song
  state.choir.y = ROAD.ys[0]!;
  if (withEcho) spawnEcho(state, ctx, 'thrum');
  for (let i = 0; i < 30; i++) {
    echo(state, ctx);
    song(state, ctx);
  }
  const a = echoes(state)[0];
  return {
    points: state.restPoints,
    rested: state.stats.restedKills,
    resting: a !== undefined && a.restTicks > 0,
  };
}

describe("spawnEcho (Thrum's echo, the cleared path)", () => {
  it('walks in from the Halls (the road’s far end, else the boss), untargetable', () => {
    const { state, ctx } = setup();
    spawnEcho(state, ctx, 'thrum');
    const [a] = echoes(state);
    expect(a).toMatchObject({
      kind: 'echo',
      mode: 'stationary',
      vulnerability: 'never',
      route: null,
      group: -1,
      damage: 0,
      enemyId: 'thrum',
      restTicks: 0,
      x: ROAD.xs[0],
      y: ROAD.ys[0],
    });
    expect(isHushableAlly(a!)).toBe(false);
    expect(state.events).toEqual([
      { type: 'AllySpawned', uid: a!.uid, kind: 'echo', x: a!.x, y: a!.y },
    ]);
    // With the Unsung on the field, it drifts out of her.
    const boss = Object.values(LIVE.enemies).find((d) => d.boss !== null && !d.neutral)!;
    const { state: s2, ctx: c2 } = setup();
    const e = poolAlloc(s2.enemies, ENEMY_BLANK, takeUid(s2));
    e.def = boss;
    e.hp = boss.hp;
    placeOnRoute(e, ROAD, 4);
    spawnEcho(s2, c2, 'thrum');
    expect(echoes(s2)[0]).toMatchObject({ x: e.x, y: e.y });
  });

  it('drifts toward Pebble, is laid to rest in the song (EchoArrived), rises, and is gone', () => {
    const { state, ctx } = setup();
    spawnEcho(state, ctx, 'thrum');
    const a = echoes(state)[0]!;
    const x0 = a.x;
    const y0 = a.y;
    state.choir.x = x0 + 6; // east of it, outside the song's 2.5 tiles
    state.choir.y = y0;
    state.events.length = 0;
    echo(state, ctx);
    expect(a.x).toBeCloseTo(x0 + ECHO_STEP_TILES, 12);
    expect(a.y).toBe(y0);
    expect(echoWalking(a)).toBe(true);
    let ticks = 1;
    while (echoWalking(a) && ticks < 10_000) {
      echo(state, ctx);
      ticks++;
    }
    // It rests on the first tick it stands inside the circle (2.5 tiles out: 3.5 tiles walked).
    expect(inSong(state, SONG_MAP, a.x, a.y)).toBe(true);
    const walk = (6 - 2.5) / ECHO_STEP_TILES; // 210 ticks, give or take a float step
    expect(ticks).toBeGreaterThanOrEqual(walk);
    expect(ticks).toBeLessThanOrEqual(walk + 1);
    expect(state.events).toEqual([{ type: 'EchoArrived', id: 'thrum' }]);
    const at = { x: a.x, y: a.y };
    for (let i = 0; i < ECHO_RISE_TICKS - 1; i++) echo(state, ctx);
    expect(a.alive).toBe(true);
    expect({ x: a.x, y: a.y }).toEqual(at); // it rises where it stands
    echo(state, ctx);
    expect(a.alive).toBe(false);
    expect(state.events.at(-1)).toEqual({ type: 'AllyRemoved', uid: a.uid });
  });

  it('earns no rest points and costs none, inside the song or out (the trickle alone)', () => {
    expect(restRun(true)).toEqual({ ...restRun(false), resting: true });
  });
});

/** A run with the restore, the lock, and the echo: its hash and event types. */
function storyRun(): { hash: string; types: string[] } {
  const sim = simWith(
    [
      [{ tick: 30 }, [REVOKE_ANY, LOCK, { setPhase: 2 }]],
      [{ tick: 60 }, [RESTORE, { spawnEcho: 'thrum' }]],
      [{ tick: 600 }, [{ setPhase: 3 }]],
    ],
    {},
    { choir: CHOIR, song: SONG },
  );
  mut(sim).credits = 1000;
  apply(sim, { type: 'build', tower: 'fx_gun', tile: [1, 1] });
  sim.enqueue({ type: 'callWave' });
  const out = stepTo(sim, 900);
  return { hash: sim.hash(), types: out.map((e) => e.type) };
}

describe('determinism', () => {
  it('a run with the restore, the lock, and the echo replays to the same hash and events', () => {
    const a = storyRun();
    expect(a.types).toEqual(
      expect.arrayContaining(['ClassRevoked', 'AbilityLocked', 'ClassRestored', 'AllySpawned']),
    );
    expect(storyRun()).toEqual(a);
  });
});
