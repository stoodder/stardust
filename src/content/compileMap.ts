// Map compilation: tile grid, routes as polylines, waves in ticks with resolved references,
// towerUnlockWave compiled into script events, and script time triggers in ticks. Route geometry
// is part of the route format, so compile checks it (design/maps.md §4): a path lists its spawn
// `S`, every `#` tile, and the core `C`, in order, one orthogonal step at a time. A Protect map's
// asset routes end beside the asset instead (AssetDef; T305a). A revisit arrives composed with its
// original (compileRevisit.ts).
import type {
  CompiledAllyPost,
  CompiledAsset,
  CompiledEscort,
  CompiledLight,
  CompiledRoute,
  CompiledMapDef,
  CompiledScriptAction,
  CompiledScriptTrigger,
  CompiledScriptedEvent,
  CompiledWave,
  CompiledWaveGroup,
} from './compiled.ts';
import { compileBuilds } from './compileBuilds.ts';
import { checkId, entriesOf, periodTicks, ticks, type Ctx, type Refs } from './compileHelpers.ts';
import {
  DEFAULT_CORE_INTEGRITY,
  DEFAULT_COUNTDOWN_SEC,
  LAMP_RADIUS_TILES,
  REFUGEE_GROUP_SIZE,
  REFUGEE_SPACING_TILES,
  REFUGEE_SPEED_TILES_PER_SEC,
} from './rules.ts';
import { perSecToPerTick } from '../shared/time.ts';
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

const TILE_CHARS: ReadonlySet<string> = new Set<TileChar>(['#', 'o', '^', '+', 'x', '.', 'S', 'C']);

export function compileMap<K extends IdSpace>(
  ctx: Ctx,
  refs: Refs<K>,
  def: MapDef<K, K['map']>,
  /** A revisit's original's size (compileRevisit.ts has composed its layout), else null. */
  revisitSize: { readonly cols: number; readonly rows: number } | null = null,
): CompiledMapDef<K> | null {
  const where = `maps.${def.id}`;
  const errorsBefore = ctx.errors.length;
  const tiles = compileTiles(ctx, def, where);
  // Route geometry is checked against the grid only when the grid itself compiled cleanly.
  const grid = ctx.errors.length === errorsBefore ? { cols: def.size.cols, tiles } : null;
  const routes = compileRoutes(ctx, def, grid, where);
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
      name: o.name,
      description: o.description,
      condition: o.condition,
      intel: o.intel,
      onComplete: (o.onComplete ?? []).map((a, j) =>
        compileAction(ctx, refs, a, `${w}.onComplete[${j}]`),
      ),
    };
  });

  const allies = compileAllies(ctx, def, where);
  const asset = compileAsset(ctx, def, routes, where);
  const lights = compileLights(ctx, def, where);
  const escort = compileEscort(ctx, def, routes, where);
  const builds = compileBuilds(ctx, refs, def, where);
  if (ctx.errors.length > errorsBefore) return null;
  return {
    id: def.id,
    act: def.act,
    env: def.env,
    objective: def.objective,
    meterLabel: def.meterLabel ?? null,
    maxLost: def.maxLost ?? null,
    maxLostPct: def.maxLostPct ?? null,
    minVoices: def.minVoices ?? null,
    evacuatedFloor: def.evacuatedFloor ?? null,
    cols: def.size.cols,
    rows: def.size.rows,
    tiles,
    terraces: def.terraces === undefined ? null : def.terraces.join('').split('').map(Number),
    underWreckage: { ...def.underWreckage },
    salvage: { ...def.salvage },
    routes: Object.fromEntries(routes),
    routeList: [...routes.values()],
    markers: { ...def.markers },
    startCredits: def.startCredits,
    coreIntegrity: def.coreIntegrity ?? DEFAULT_CORE_INTEGRITY,
    stardust: def.stardust,
    lockedTowersAtStart: unlocks.map((u) => u.tower),
    threatIntel: def.threatIntel,
    requiredCounters: def.requiredCounters,
    waves,
    events,
    medals: def.medals ?? null,
    objectives,
    companion: def.companion,
    lockedAbilities: def.lockedAbilities ?? [],
    allies,
    revisitOf: def.revisitOf ?? null,
    revisitAt: def.revisitAt === undefined ? null : [def.revisitAt[0], def.revisitAt[1]],
    revisitSize:
      def.revisitOf === undefined || revisitSize === null
        ? null
        : { cols: revisitSize.cols, rows: revisitSize.rows },
    lighting: (def.lighting ?? []).map((k) => ({ wave: k.wave, env: k.env, dark: k.dark ?? 0 })),
    dark: (def.lighting ?? []).some((k) => (k.dark ?? 0) > 0),
    lights,
    escort,
    dressing: def.dressing ?? [],
    asset,
    clickables: { ...def.clickables },
    builds,
  };
}

/** The Protect map's asset (T305a): its marker resolved, its routes checked against the map's. */
function compileAsset(
  ctx: Ctx,
  def: MapDef<IdSpace>,
  routes: ReadonlyMap<string, unknown>,
  where: string,
): CompiledAsset | null {
  const a = def.asset;
  if (a === undefined) return null;
  const tile = def.markers?.[a.marker];
  if (tile === undefined) ctx.errors.push(`${where}.asset.marker: unknown marker '${a.marker}'`);
  for (const r of a.routes) {
    if (!routes.has(r)) ctx.errors.push(`${where}.asset.routes: unknown route '${r}'`);
  }
  if (tile === undefined) return null;
  return {
    name: a.name,
    integrity: a.integrity,
    marker: a.marker,
    tile: [tile[0], tile[1]],
    routes: [...a.routes],
  };
}

/** Lamps (MapDef.lights; T505): each marker resolved to its tile centre, its radius filled in. */
function compileLights(ctx: Ctx, def: MapDef<IdSpace>, where: string): CompiledLight[] {
  const out: CompiledLight[] = [];
  for (const [i, l] of (def.lights ?? []).entries()) {
    const tile = def.markers?.[l.marker];
    if (tile === undefined) {
      ctx.errors.push(`${where}.lights[${i}].marker: unknown marker '${l.marker}'`);
      continue;
    }
    const r = l.radiusTiles ?? LAMP_RADIUS_TILES;
    out.push({
      marker: l.marker,
      x: tile[0] + 0.5,
      y: tile[1] + 0.5,
      radiusTiles: r,
      radiusSq: r * r,
    });
  }
  return out;
}

/**
 * Escort data (MapDef.safeExit and refugees; T305c): the exit's marker resolved, each group's
 * route resolved (validateMap checks it's a path that ends on the exit), the rule numbers filled in.
 */
function compileEscort(
  ctx: Ctx,
  def: MapDef<IdSpace>,
  routes: ReadonlyMap<string, CompiledRoute>,
  where: string,
): CompiledEscort | null {
  if (def.safeExit === undefined || def.refugees === undefined) return null; // validateMap pairs them
  const tile = def.markers?.[def.safeExit];
  if (tile === undefined) {
    ctx.errors.push(`${where}.safeExit: unknown marker '${def.safeExit}'`);
    return null;
  }
  const groups: CompiledEscort['groups'][number][] = [];
  let total = 0;
  for (const [id, g] of Object.entries(def.refugees)) {
    const route = routes.get(g.route);
    if (route === undefined) {
      ctx.errors.push(`${where}.refugees.${id}.route: unknown route '${g.route}'`);
      continue;
    }
    const count = g.count ?? REFUGEE_GROUP_SIZE;
    const exit = g.exit ?? def.safeExit;
    const exitTile = def.markers?.[exit];
    if (exitTile === undefined) {
      ctx.errors.push(`${where}.refugees.${id}.exit: unknown marker '${exit}'`);
      continue;
    }
    total += count;
    groups.push({
      id,
      route,
      count,
      withPebble: g.withPebble === true,
      exit,
      exitTile: [exitTile[0], exitTile[1]],
      when: g.when === undefined ? null : { flag: g.when.flag, eq: g.when.eq },
      spacingTiles: REFUGEE_SPACING_TILES,
      speedTilesPerTick: perSecToPerTick(REFUGEE_SPEED_TILES_PER_SEC),
    });
  }
  return { safeExit: def.safeExit, exitTile: [tile[0], tile[1]], groups, total };
}

/** Ally posts: the marker resolved to its tile (validateMap checks it's decor), rates in ticks. */
function compileAllies(ctx: Ctx, def: MapDef<IdSpace>, where: string): CompiledAllyPost[] {
  const out: CompiledAllyPost[] = [];
  for (const [i, a] of (def.allies ?? []).entries()) {
    const w = `${where}.allies[${i}]`;
    const tile = def.markers?.[a.post];
    if (tile === undefined) {
      ctx.errors.push(`${w}.post: unknown marker '${a.post}'`);
      continue;
    }
    const at = a.attack;
    out.push({
      kind: a.kind,
      post: a.post,
      tile: [tile[0], tile[1]],
      attack: {
        type: at.type,
        damage: at.damage,
        periodTicks: periodTicks(ctx, at.ratePerSec, `${w}.attack.ratePerSec`),
        rangeTiles: at.rangeTiles,
        rangeSq: at.rangeTiles * at.rangeTiles,
        hitsGround: at.targets.ground,
        hitsAir: at.targets.air,
      },
      block:
        a.block === undefined
          ? null
          : {
              capacity: a.block.capacity,
              health: a.block.health.map((k) => ({ wave: k.wave, pct: k.pct })),
            },
    });
  }
  return out;
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

function compileRoutes(
  ctx: Ctx,
  def: MapDef<IdSpace>,
  grid: RouteGrid | null,
  where: string,
): Map<string, CompiledRoute> {
  const routes = new Map<string, CompiledRoute>();
  const add = (r: CompiledRoute, w: string): void => {
    if (routes.has(r.id)) ctx.errors.push(`${w}: duplicate route id '${r.id}'`);
    else routes.set(r.id, r);
  };
  for (const [i, p] of def.paths.entries()) {
    const w = `${where}.paths[${i}]`;
    const end = assetEnd(def, p.id);
    if (grid !== null) checkGroundRoute(ctx, grid, p.tiles, 'path', w, end);
    add(compileRoute(ctx, p.id, 'path', p.tiles, null, w), w);
  }
  for (const [i, p] of (def.airLanes ?? []).entries()) {
    const w = `${where}.airLanes[${i}]`;
    if (grid !== null) checkAirLane(ctx, grid, p.points, w, assetEnd(def, p.id));
    add(compileRoute(ctx, p.id, 'air', p.points, null, w), w);
  }
  for (const [i, p] of (def.riftLanes ?? []).entries()) {
    const w = `${where}.riftLanes[${i}]`;
    if (grid !== null) checkGroundRoute(ctx, grid, p.tiles, 'rift', w, null);
    if (assetEnd(def, p.id) !== null) ctx.errors.push(`${w}: a rift lane can't lead to the asset`);
    add(compileRoute(ctx, p.id, 'rift', p.tiles, p.opensAtWave, w), w);
  }
  if (grid !== null) checkPathTilesUsed(ctx, grid, def.paths, where);
  return routes;
}

/**
 * Where route `id` ends when it leads to the Protect map's asset (AssetDef.routes): the asset's
 * marker tile, or null for a route to the core (or an unknown marker, which compileAsset reports).
 */
function assetEnd(def: MapDef<IdSpace>, id: string): GridPos | null {
  const a = def.asset;
  if (a === undefined || !a.routes.includes(id)) return null;
  return def.markers?.[a.marker] ?? null;
}

/** The compiled grid, for route geometry checks. */
interface RouteGrid {
  readonly cols: number;
  readonly tiles: readonly TileChar[];
}

function gridTile(grid: RouteGrid, [c, r]: GridPos): TileChar | undefined {
  if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= grid.cols) {
    return undefined;
  }
  return grid.tiles[r * grid.cols + c];
}

/**
 * The route format (design/maps.md §4): a ground path lists every tile it walks, from its spawn
 * `S` through `#` tiles to the core `C`, each step one tile up, down, left, or right. A path to
 * a Protect map's asset (`asset`: its marker tile) ends on a `#` orthogonally next to it instead.
 * A rift lane walks the same way but over decor, never a buildable tile.
 */
function checkGroundRoute(
  ctx: Ctx,
  grid: RouteGrid,
  tiles: readonly GridPos[],
  kind: 'path' | 'rift',
  where: string,
  asset: GridPos | null,
): void {
  const last = tiles.length - 1;
  for (const [i, pos] of tiles.entries()) {
    const at = `${where}.tiles[${i}] (${pos[0]},${pos[1]})`;
    const tile = gridTile(grid, pos);
    if (tile === undefined) {
      ctx.errors.push(`${at}: not a tile on the map`);
      continue;
    }
    if (kind === 'path') {
      const want = i === 0 ? 'S' : i === last && asset === null ? 'C' : '#';
      if (tile !== want)
        ctx.errors.push(
          `${at}: is '${tile}', but a path's ${routeRole(i, last)} must be '${want}'`,
        );
    } else if (tile === 'o' || tile === '^' || tile === '+') {
      ctx.errors.push(`${at}: a rift lane never crosses a buildable tile ('${tile}')`);
    }
    const prev = tiles[i - 1];
    if (prev !== undefined && Math.abs(pos[0] - prev[0]) + Math.abs(pos[1] - prev[1]) !== 1) {
      ctx.errors.push(`${at}: not one orthogonal step from the tile before`);
    }
    if (
      i === last &&
      asset !== null &&
      Math.abs(pos[0] - asset[0]) + Math.abs(pos[1] - asset[1]) !== 1
    ) {
      ctx.errors.push(`${at}: a path to the asset ends next to it (${asset[0]},${asset[1]})`);
    }
  }
}

/**
 * An air lane (design/maps.md §4) is a polyline through tile centers that may cross any tile, from
 * an air spawn to the core: every point lies on the map, and the last is the core `C`, so a flyer
 * leaks at the core like a ground unit (T304a). A lane to a Protect map's asset (`asset`) ends on
 * the asset's marker tile instead.
 */
function checkAirLane(
  ctx: Ctx,
  grid: RouteGrid,
  points: readonly GridPos[],
  where: string,
  asset: GridPos | null,
): void {
  const last = points.length - 1;
  for (const [i, pos] of points.entries()) {
    const at = `${where}.points[${i}] (${pos[0]},${pos[1]})`;
    const tile = gridTile(grid, pos);
    if (tile === undefined) {
      ctx.errors.push(`${at}: not a tile on the map`);
      continue;
    }
    if (i !== last || last === 0) continue;
    if (asset === null) {
      if (tile !== 'C')
        ctx.errors.push(`${at}: is '${tile}', but an air lane ends on the core 'C'`);
    } else if (pos[0] !== asset[0] || pos[1] !== asset[1]) {
      ctx.errors.push(`${at}: an air lane to the asset ends on it (${asset[0]},${asset[1]})`);
    }
  }
}

function routeRole(i: number, last: number): string {
  return i === 0 ? 'first tile' : i === last ? 'last tile' : 'middle tiles';
}

/** Every drawn path tile and spawn is walked by some path (a decorative road is drawn as decor). */
function checkPathTilesUsed(
  ctx: Ctx,
  grid: RouteGrid,
  paths: MapDef<IdSpace>['paths'],
  where: string,
): void {
  const used = new Set<number>();
  for (const p of paths) for (const [c, r] of p.tiles) used.add(r * grid.cols + c);
  for (const [i, tile] of grid.tiles.entries()) {
    if ((tile === '#' || tile === 'S') && !used.has(i)) {
      const c = i % grid.cols;
      const r = (i - c) / grid.cols;
      ctx.errors.push(`${where}.tiles: '${tile}' at (${c},${r}) is on no path`);
    }
  }
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
    countdownAfter: wave.countdownAfter ?? null,
    teach: wave.teach ?? false,
    noCall: wave.noCall === true,
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
  } else if ('passedMarker' in c && c.passedMarker.enemy !== undefined) {
    checkId(ctx, refs.enemies, c.passedMarker.enemy, `${where}.passedMarker`, 'enemy');
  } else if ('leaks' in c && c.leaks.enemy !== undefined) {
    checkId(ctx, refs.enemies, c.leaks.enemy, `${where}.leaks`, 'enemy');
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
