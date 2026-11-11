// Thrum's echo (design/maps.md § 5.5, `spared_quiet_wave = false`; T807): a scripted ally that
// drifts out of the Unsung into the song on its own and is laid to rest there. The rules as built:
// - **`spawnEcho: id`** (a map-event action; it needs a song, so a choir: validateFinale.ts) puts
//   one ally of kind `echo` on the field (`AllySpawned`): where the first live boss stands (the
//   Unsung, in the Halls), else at the far end of the choir's road (its spawn end, in the Halls).
//   Its id rides on `enemyId`. It is `stationary` (the allies system leaves it alone), group −1
//   (never a refugee or a Voice), with no attack, and **untargetable**: `vulnerability: 'never'`
//   and no route, so no hush, gather, or other Hollow ability can take it, and towers and allies
//   only ever target enemies.
// - **The walk** (this system, after the choir): it drifts in a straight line toward the choir's
//   leader at ECHO_PACE_TILES_PER_SEC, whatever stands between (nothing halts it).
// - **At rest:** on the tick it stands inside a song circle (choir.ts `inSong`, inclusive; it
//   reaches the leader at worst, inside her circle) it stops, `EchoArrived { id }` fires, and
//   `restTicks` counts up: render turns it warm gold where it stands and rises. After
//   ECHO_RISE_SEC it is gone (`AllyRemoved`).
// - **No rest points:** it isn't a Hollow unit, so the song (sim/song.ts) never counts it, either
//   way; nor does it touch Voices, the medals, or the run's stats.
// Allocation-free per tick.
import { ECHO_PACE_TILES_PER_SEC, ECHO_RISE_SEC } from '../content/rules.ts';
import { TICK_HZ } from '../shared/time.ts';
import { inSong } from './choir.ts';
import { ALLY_BLANK, type Ally } from './entities.ts';
import { poolAlloc } from './pool.ts';
import { emit, takeUid, type SimState } from './state.ts';
import { removeAlly } from './systems/allies.ts';
import type { TickContext } from './tick.ts';

/** The echo's pace, in tiles per tick. */
export const ECHO_STEP_TILES = ECHO_PACE_TILES_PER_SEC / TICK_HZ;
/** The ticks it rises in gold before it is gone. */
export const ECHO_RISE_TICKS = Math.round(ECHO_RISE_SEC * TICK_HZ);

/** Whether `a` is a live echo still walking in (grey), not yet laid to rest. */
export function echoWalking(a: Pick<Ally, 'alive' | 'kind' | 'restTicks'>): boolean {
  return a.alive && a.kind === 'echo' && a.restTicks === 0;
}

/** One tick of every echo: the walk in, the rest, the rise (see the header). */
export function echo(state: SimState, ctx: TickContext): void {
  const pool = state.allies;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!a.alive || a.kind !== 'echo') continue;
    if (a.restTicks > 0) {
      if (++a.restTicks > ECHO_RISE_TICKS) removeAlly(state, a);
      continue;
    }
    if (!inSong(state, ctx.map, a.x, a.y)) {
      const dx = state.choir.x - a.x;
      const dy = state.choir.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= ECHO_STEP_TILES) {
        a.x = state.choir.x;
        a.y = state.choir.y;
      } else {
        a.x += (dx / d) * ECHO_STEP_TILES;
        a.y += (dy / d) * ECHO_STEP_TILES;
      }
      if (!inSong(state, ctx.map, a.x, a.y)) continue;
    }
    a.restTicks = 1;
    emit(state, { type: 'EchoArrived', id: a.enemyId ?? '' });
  }
}

/** The `spawnEcho` action: the echo `id` appears in the Halls (see the header). */
export function spawnEcho(state: SimState, ctx: TickContext, id: string): void {
  const c = ctx.map.choir;
  if (c === null) return; // validateFinale: spawnEcho needs a song, and a song a choir
  const a = poolAlloc(state.allies, ALLY_BLANK, takeUid(state));
  a.kind = 'echo';
  a.mode = 'stationary';
  a.vulnerability = 'never';
  a.enemyId = id;
  a.speedTilesPerTick = ECHO_STEP_TILES;
  const boss = firstLiveBoss(state);
  if (boss !== null) {
    a.x = boss.x;
    a.y = boss.y;
  } else {
    a.x = c.route.xs[0]!; // a route has at least two points
    a.y = c.route.ys[0]!;
  }
  emit(state, { type: 'AllySpawned', uid: a.uid, kind: 'echo', x: a.x, y: a.y });
}

/** The first live boss in pool order (the Unsung), or null. */
function firstLiveBoss(state: SimState): { readonly x: number; readonly y: number } | null {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.alive && e.def !== null && e.def.boss !== null && e.def.neutral !== true) return e;
  }
  return null;
}
