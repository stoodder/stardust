// Map compilation: tile grid, routes as polylines, waves in ticks with resolved references,
// towerUnlockWave compiled into script events, and script time triggers in ticks.
import type {
  CompiledRoute,
  CompiledMapDef,
  CompiledScriptAction,
  CompiledScriptTrigger,
  CompiledScriptedEvent,
  CompiledWave,
  CompiledWaveGroup,
} from './compiled.ts';
import { compileBuilds } from './compileBuilds.ts';
import { checkId, entriesOf, ticks, type Ctx, type Refs } from './compileHelpers.ts';
import type {
  Act,
  ConditionDef,
  GridPos,
  IdSpace,
  MapDef,
  ScriptAction,
  ScriptTrigger,
  TileChar,
  WaveDef,
} from './types.ts';

/** The build-phase countdown when a wave doesn't set one (design/core-loop.md §2.1). */
export const DEFAULT_COUNTDOWN_SEC: Readonly<Record<Act, number>> = {
  1: 25,
  2: 20,
  3: 15,
  finale: 20,
  challenge: 20,
  endless: 20,
};
export const DEFAULT_CORE_INTEGRITY = 20;

const TILE_CHARS: ReadonlySet<string> = new Set<TileChar>(['#', 'o', '^', '+', 'x', '.', 'S', 'C']);

export function compileMap<K extends IdSpace>(
  ctx: Ctx,
  refs: Refs<K>,
  def: MapDef<K, K['map']>,
): CompiledMapDef<K> | null {
  const where = `maps.${def.id}`;
  const errorsBefore = ctx.errors.length;
  const tiles = compileTiles(ctx, def, where);
  const routes = compileRoutes(ctx, def, where);
  const waves = def.waves.map((w, i) => compileWave(ctx, refs, routes, def.act, w, i, where));

  // towerUnlockWave → one `countdown` unlock event per tower, ordered by wave then id, ahead of
  // the authored events so a cue on the same trigger plays after its tower unlocks.
  const unlocks: { wave: number; tower: K['tower'] }[] = [];
  for (const [id, wave] of entriesOf<number | undefined>(def.towerUnlockWave ?? {})) {
    const tower = refs.towers.get(id);
    if (tower === undefined) {
      ctx.errors.push(`${where}.towerUnlockWave: unknown tower '${id}'`);
    } else if (wave === undefined || !Number.isInteger(wave) || wave < 1 || wave > waves.length) {
      ctx.errors.push(
        `${where}.towerUnlockWave.${id}: wave ${String(wave)} is not a wave of this map`,
      );
    } else {
      unlocks.push({ wave, tower: tower.id });
    }
  }
  unlocks.sort((a, b) => a.wave - b.wave || (a.tower < b.tower ? -1 : a.tower > b.tower ? 1 : 0));
  const events: CompiledScriptedEvent<K>[] = unlocks.map((u) => ({
    id: `unlock_tower_${u.tower}`,
    on: { wave: u.wave, phase: 'countdown' },
    when: null,
    actions: [{ unlockTowerClass: u.tower }],
    once: true,
  }));
  for (const [i, e] of (def.events ?? []).entries()) {
    const w = `${where}.events[${i}]`;
    if (e.when !== undefined) checkCondition(ctx, refs, e.when, `${w}.when`);
    events.push({
      id: e.id,
      on: compileTrigger(ctx, refs, e.on, `${w}.on`),
      when: e.when ?? null,
      actions: e.actions.map((a, j) => compileAction(ctx, refs, a, `${w}.actions[${j}]`)),
      once: e.once ?? true,
    });
  }
  const seen = new Set<string>();
  for (const e of events) {
    if (seen.has(e.id)) ctx.errors.push(`${where}.events: duplicate event id '${e.id}'`);
    seen.add(e.id);
  }

  for (const [i, l] of (def.lockedAbilities ?? []).entries()) {
    checkId(ctx, refs.abilities, l.ability, `${where}.lockedAbilities[${i}]`, 'ability');
    checkCondition(ctx, refs, l.when, `${where}.lockedAbilities[${i}].when`);
  }
  if (def.medals !== undefined) {
    checkCondition(ctx, refs, def.medals.challenge.condition, `${where}.medals.challenge`);
  }
  const objectives = (def.objectives ?? []).map((o, i) => {
    const w = `${where}.objectives[${i}]`;
    checkCondition(ctx, refs, o.condition, `${w}.condition`);
    return {
      id: o.id,
      condition: o.condition,
      intel: o.intel,
      onComplete: (o.onComplete ?? []).map((a, j) =>
        compileAction(ctx, refs, a, `${w}.onComplete[${j}]`),
      ),
    };
  });

  const builds = compileBuilds(ctx, refs, def, where);
  if (ctx.errors.length > errorsBefore) return null;
  return {
    id: def.id,
    act: def.act,
    env: def.env,
    objective: def.objective,
    meterLabel: def.meterLabel ?? null,
    maxLost: def.maxLost ?? null,
    minVoices: def.minVoices ?? null,
    evacuatedFloor: def.evacuatedFloor ?? null,
    cols: def.size.cols,
    rows: def.size.rows,
    tiles,
    underWreckage: { ...def.underWreckage },
    salvage: { ...def.salvage },
    routes: Object.fromEntries(routes),
    markers: { ...def.markers },
    startCredits: def.startCredits,
    coreIntegrity: def.coreIntegrity ?? DEFAULT_CORE_INTEGRITY,
    stardust: def.stardust,
    briefing: def.briefing ?? null,
    lockedTowersAtStart: unlocks.map((u) => u.tower),
    threatIntel: def.threatIntel,
    requiredCounters: def.requiredCounters,
    waves,
    events,
    medals: def.medals ?? null,
    objectives,
    companion: def.companion,
    lockedAbilities: def.lockedAbilities ?? [],
    revisitOf: def.revisitOf ?? null,
    builds,
  };
}

function compileTiles(ctx: Ctx, def: MapDef<IdSpace>, where: string): TileChar[] {
  const { cols, rows } = def.size;
  const out: TileChar[] = [];
  if (def.tiles.length !== rows) {
    ctx.errors.push(`${where}.tiles: ${def.tiles.length} rows, but size.rows is ${rows}`);
  }
  for (const [r, row] of def.tiles.entries()) {
    if (row.length !== cols) {
      ctx.errors.push(`${where}.tiles[${r}]: ${row.length} columns, but size.cols is ${cols}`);
    }
    for (let c = 0; c < row.length; c++) {
      const ch = row.charAt(c);
      if (isTileChar(ch)) out.push(ch);
      else ctx.errors.push(`${where}.tiles[${r}][${c}]: '${ch}' is not in the tile legend`);
    }
  }
  return out;
}

function isTileChar(ch: string): ch is TileChar {
  return TILE_CHARS.has(ch);
}

function compileRoutes(ctx: Ctx, def: MapDef<IdSpace>, where: string): Map<string, CompiledRoute> {
  const routes = new Map<string, CompiledRoute>();
  const add = (r: CompiledRoute, w: string): void => {
    if (routes.has(r.id)) ctx.errors.push(`${w}: duplicate route id '${r.id}'`);
    else routes.set(r.id, r);
  };
  for (const [i, p] of def.paths.entries()) {
    add(
      compileRoute(ctx, p.id, 'path', p.tiles, null, `${where}.paths[${i}]`),
      `${where}.paths[${i}]`,
    );
  }
  for (const [i, p] of (def.airLanes ?? []).entries()) {
    const w = `${where}.airLanes[${i}]`;
    add(compileRoute(ctx, p.id, 'air', p.points, null, w), w);
  }
  for (const [i, p] of (def.riftLanes ?? []).entries()) {
    const w = `${where}.riftLanes[${i}]`;
    add(compileRoute(ctx, p.id, 'rift', p.tiles, p.opensAtWave, w), w);
  }
  return routes;
}

/** A polyline through tile centers with cumulative lengths (Math.sqrt is exactly rounded). */
function compileRoute(
  ctx: Ctx,
  id: string,
  kind: CompiledRoute['kind'],
  tiles: readonly GridPos[],
  opensAtWave: number | null,
  where: string,
): CompiledRoute {
  if (tiles.length < 2) ctx.errors.push(`${where}: a route needs at least 2 tiles`);
  const xs = tiles.map((t) => t[0] + 0.5);
  const ys = tiles.map((t) => t[1] + 0.5);
  const cumLenTiles = [0];
  let len = 0;
  for (let i = 1; i < tiles.length; i++) {
    const dx = (xs[i] ?? 0) - (xs[i - 1] ?? 0);
    const dy = (ys[i] ?? 0) - (ys[i - 1] ?? 0);
    len += Math.sqrt(dx * dx + dy * dy);
    cumLenTiles.push(len);
  }
  return {
    id,
    kind,
    layer: kind === 'air' ? 'air' : 'ground',
    opensAtWave,
    tiles,
    xs,
    ys,
    cumLenTiles,
    lengthTiles: len,
  };
}

function compileWave<K extends IdSpace>(
  ctx: Ctx,
  refs: Refs<K>,
  routes: ReadonlyMap<string, CompiledRoute>,
  act: Act,
  wave: WaveDef<K>,
  index: number,
  mapWhere: string,
): CompiledWave<K> {
  const where = `${mapWhere}.waves[${index}]`;
  const groups: CompiledWaveGroup<K>[] = [];
  let lastSpawnTicks = 0;
  for (const [i, g] of wave.groups.entries()) {
    const w = `${where}.groups[${i}]`;
    const enemy = refs.enemies.get(g.enemy);
    const route = routes.get(g.route);
    if (enemy === undefined) ctx.errors.push(`${w}: unknown enemy '${g.enemy}'`);
    if (route === undefined) ctx.errors.push(`${w}: unknown route '${g.route}'`);
    if (enemy === undefined || route === undefined) continue;
    const intervalTicks =
      g.intervalSec === undefined
        ? enemy.spawnIntervalTicks
        : ticks(ctx, g.intervalSec, `${w}.intervalSec`);
    const delayTicks = ticks(ctx, g.delaySec ?? 0, `${w}.delaySec`);
    groups.push({
      enemy,
      count: g.count,
      intervalTicks,
      delayTicks,
      route,
      tags: g.tags ?? [],
      teach: g.teach ?? false,
    });
    lastSpawnTicks = Math.max(
      lastSpawnTicks,
      delayTicks + Math.max(0, g.count - 1) * intervalTicks,
    );
  }
  return {
    number: index + 1,
    countdownTicks: ticks(
      ctx,
      wave.countdownSec ?? DEFAULT_COUNTDOWN_SEC[act],
      `${where}.countdownSec`,
    ),
    teach: wave.teach ?? false,
    groups,
    lastSpawnTicks,
  };
}

function checkCondition<K extends IdSpace>(
  ctx: Ctx,
  refs: Refs<K>,
  c: ConditionDef<K>,
  where: string,
): void {
  if ('towers' in c && c.towers.tower !== undefined) {
    checkId(ctx, refs.towers, c.towers.tower, `${where}.towers`, 'tower');
  } else if ('all' in c) {
    for (const [i, s] of c.all.entries()) checkCondition(ctx, refs, s, `${where}.all[${i}]`);
  } else if ('any' in c) {
    for (const [i, s] of c.any.entries()) checkCondition(ctx, refs, s, `${where}.any[${i}]`);
  } else if ('not' in c) {
    checkCondition(ctx, refs, c.not, `${where}.not`);
  }
}

function compileTrigger<K extends IdSpace>(
  ctx: Ctx,
  refs: Refs<K>,
  t: ScriptTrigger<K>,
  where: string,
): CompiledScriptTrigger<K> {
  if ('wave' in t) {
    if (typeof t.phase === 'string') return { wave: t.wave, phase: t.phase };
    return {
      wave: t.wave,
      phase: { afterTicks: ticks(ctx, t.phase.afterSec, `${where}.afterSec`) },
    };
  }
  if ('bossHpPct' in t && t.boss !== undefined) checkId(ctx, refs.enemies, t.boss, where, 'enemy');
  return t;
}

function compileAction<K extends IdSpace>(
  ctx: Ctx,
  refs: Refs<K>,
  a: ScriptAction<K>,
  where: string,
): CompiledScriptAction<K> {
  if ('setClickable' in a) {
    const { marker, on, fallback } = a.setClickable;
    return {
      setClickable: {
        marker,
        on,
        fallback:
          fallback === undefined ? null : compileTrigger(ctx, refs, fallback, `${where}.fallback`),
      },
    };
  }
  if ('unlockTowerClass' in a) checkId(ctx, refs.towers, a.unlockTowerClass, where, 'tower');
  if ('revokeAbility' in a) checkId(ctx, refs.abilities, a.revokeAbility, where, 'ability');
  return a;
}
