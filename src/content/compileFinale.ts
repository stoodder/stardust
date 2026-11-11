// The finale's map data (T800a seams; design/maps.md § 5.5): the choir, the Leaving Song, and the
// secondary timers, compiled for compileMap. Their rules (counts, ranges, the route and its stop)
// are validateFinale.ts's; compile only resolves references and converts seconds to ticks.
import type { CompiledChoir, CompiledRoute, CompiledSong, CompiledTimer } from './compiled.ts';
import { ticks, type Ctx } from './compileHelpers.ts';
import { perSecToPerTick } from '../shared/time.ts';
import type { FlagGateDef, IdSpace, MapDef } from './types.ts';

/** The song's default floor: the share of its radius left with no singer singing (D154). */
export const SONG_SILENT_PCT = 0.6;

/** MapDef.choir with its route and stop resolved (T804 walks it), or null. */
export function compileChoir(
  ctx: Ctx,
  def: MapDef<IdSpace>,
  routes: ReadonlyMap<string, CompiledRoute>,
  where: string,
): CompiledChoir | null {
  const c = def.choir;
  if (c === undefined) return null;
  const route = routes.get(c.route);
  if (route === undefined) {
    ctx.errors.push(`${where}.choir.route: unknown route '${c.route}'`);
    return null;
  }
  const stop = def.markers?.[c.stopAt];
  if (stop === undefined) {
    ctx.errors.push(`${where}.choir.stopAt: unknown marker '${c.stopAt}'`);
    return null;
  }
  const gate = (g: FlagGateDef): FlagGateDef => ({ flag: g.flag, eq: g.eq });
  return {
    leader: c.leader,
    route,
    stopAt: c.stopAt,
    stopTile: [stop[0], stop[1]],
    singers: c.singers,
    paceTilesPerTick: perSecToPerTick(c.pace),
    haltTiles: c.haltTiles,
    groups: (c.groups ?? []).map((g) => ({ when: gate(g.when), singers: g.singers })),
    thrum: c.thrum === undefined ? null : { when: gate(c.thrum.when), radiusBonus: c.thrum.radiusBonus },
    returned:
      c.returned === undefined
        ? null
        : { when: gate(c.returned.when), count: c.returned.count, auraRadius: c.returned.auraRadius },
  };
}

/** MapDef.song per tick, defaults resolved (T805 sings it), or null. */
export function compileSong(ctx: Ctx, def: MapDef<IdSpace>, where: string): CompiledSong | null {
  const s = def.song;
  if (s === undefined) return null;
  return {
    baseRadius: s.baseRadius,
    silentPct: s.silentPct ?? SONG_SILENT_PCT,
    restTarget: s.restTarget,
    restPerTick: perSecToPerTick(s.restPerSec),
    restPerBossHp: s.restPerBossHp ?? 0,
    multipliers: s.multipliers.map((m) => ({ flag: m.flag, value: m.value, mul: m.mul })),
    scatter: {
      reformTicks: ticks(ctx, s.scatter.reformSec, `${where}.song.scatter.reformSec`),
      hpPct: s.scatter.hpPct,
    },
  };
}

/** MapDef.timers in authored order, in ticks (T806 fills them). */
export function compileTimers(ctx: Ctx, def: MapDef<IdSpace>, where: string): CompiledTimer[] {
  return Object.entries(def.timers ?? {}).map(([id, t]) => ({
    id,
    fillTicks: ticks(ctx, t.fillSec, `${where}.timers.${id}.fillSec`),
    bossHpPerTenth: t.bossHpPerTenth ?? 0,
  }));
}
