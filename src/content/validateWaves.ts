// Wave validation (maps.md § 9; the rule list is validateMap.ts's header): [wave],
// [route-walk], [wave-tag], and [quiet-wave-reach].
import { REACH_SLACK_TILES, distanceToRoute, type ReachTile } from './counterAnswers.ts';
import { HIGH_GROUND_RANGE_PCT, MAX_TIER_BEFORE_SPEC, SKITTERKIN_ONLY_TAGS } from './rules.ts';
import type { GridPos, IdSpace, Layer, MapDef, TileChar } from './types.ts';
import type { MapCtx } from './validateMap.ts';
import {
  BUILDABLE,
  Issues,
  duplicates,
  isPositive,
  isPositiveInt,
  type Grid,
} from './validateHelpers.ts';

export type RouteKind = 'path' | 'air' | 'rift';

export function routesOf(
  def: MapDef<IdSpace>,
): Map<string, { kind: RouteKind; opensAtWave: number }> {
  const out = new Map<string, { kind: RouteKind; opensAtWave: number }>();
  // Like compile, the first route with an id wins (a duplicate id is a compile error).
  const add = (id: string, kind: RouteKind, opensAtWave: number): void => {
    if (!out.has(id)) out.set(id, { kind, opensAtWave });
  };
  for (const p of def.paths) add(p.id, 'path', 1);
  for (const p of def.airLanes ?? []) add(p.id, 'air', 1);
  for (const p of def.riftLanes ?? []) add(p.id, 'rift', p.opensAtWave);
  return out;
}

export function validateWaves(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  mapWhere: string,
): void {
  if (def.waves.length === 0)
    issues.add('wave', `${mapWhere}.waves`, 'a map needs at least one wave');
  const routes = routesOf(def);
  for (const [w, wave] of def.waves.entries()) {
    const where = `${mapWhere}.waves[${w}]`;
    if (wave.groups.length === 0) issues.add('wave', where, 'a wave needs at least one group');
    if (wave.countdownSec !== undefined) {
      if (w === 0)
        issues.add(
          'wave',
          `${where}.countdownSec`,
          'wave 1 has no countdown (the player starts it)',
        );
      else if (!isPositive(wave.countdownSec))
        issues.add('wave', `${where}.countdownSec`, 'must be > 0');
    }
    if (wave.countdownAfter !== undefined) {
      const bossBefore = def.waves
        .slice(0, w)
        .some((x) => x.groups.some((g) => ctx.enemies.get(g.enemy)?.boss !== undefined));
      if (wave.countdownAfter !== 'bossEnded') {
        issues.add('wave', `${where}.countdownAfter`, `unknown '${String(wave.countdownAfter)}'`);
      } else if (!bossBefore) {
        issues.add(
          'wave',
          `${where}.countdownAfter`,
          "'bossEnded' needs a boss in an earlier wave (wave 1 has no countdown)",
        );
      }
    }
    for (const [g, group] of wave.groups.entries()) {
      const gw = `${where}.groups[${g}]`;
      if (!isPositiveInt(group.count))
        issues.add('wave', `${gw}.count`, 'must be a whole number ≥ 1');
      if (group.intervalSec !== undefined && !isPositive(group.intervalSec)) {
        issues.add('wave', `${gw}.intervalSec`, 'must be > 0');
      }
      const enemy = ctx.enemies.get(group.enemy);
      const route = routes.get(group.route);
      if (enemy !== undefined && route !== undefined) {
        // Flyers take air lanes and ground units ground routes; a neutral flyer (Gerald, core-loop
        // § 2.7) may also fly a ground path (T304a).
        const air = enemy.layer === 'air';
        const walks =
          route.kind === 'air' ? air : !air || (enemy.neutral === true && route.kind === 'path');
        if (!walks) {
          issues.add(
            'route-walk',
            gw,
            `${enemy.layer} unit '${enemy.id}' can't walk ${route.kind} route '${group.route}'`,
          );
        }
        if (route.kind === 'rift') {
          if (enemy.faction !== 'hollow') {
            issues.add('route-walk', gw, `rift lane '${group.route}' carries only the Hollow`);
          }
          if (w + 1 < route.opensAtWave) {
            issues.add(
              'route-walk',
              gw,
              `rift lane '${group.route}' opens at wave ${route.opensAtWave}, not wave ${w + 1}`,
            );
          }
        }
      }
      const tags = group.tags ?? [];
      for (const t of duplicates(tags))
        issues.add('wave-tag', `${gw}.tags`, `'${t}' is listed twice`);
      if (enemy !== undefined && enemy.faction !== 'skitterkin') {
        for (const t of tags.filter((x) => SKITTERKIN_ONLY_TAGS.includes(x))) {
          issues.add('wave-tag', `${gw}.tags`, `'${t}' is only for Skitterkin (not '${enemy.id}')`);
        }
      }
    }
  }
}

// ── [quiet-wave-reach] ─────────────────────────────────────────────────────────────────────────

/**
 * Route tiles, from the spawn, that no buildable tile may reach on a route a `quiet_wave` group
 * walks (D097): the Quiet Wave is seen walking in before any tower could fire on it, so holding
 * fire is a choice made in time, never a reflex.
 */
export const QUIET_WAVE_CLEAR_TILES = 4;

/** A tower's tiers as raw content gives them: enough to read its targets and range. */
export interface TargetedTower {
  readonly tiers: readonly {
    readonly targets?: { readonly ground?: boolean; readonly air?: boolean };
    readonly attack?: { readonly rangeTiles?: number } | null;
  }[];
}

/** The longest attack range any tower reaches by tier 3, per layer it can hit. */
export type T3Reach = Readonly<Record<Layer, number>>;

/**
 * The best tier-1-to-3 range over `towers`, per layer (specs aren't counted: tier 4 is a later
 * investment, D097). Every tower in the content counts, not only the map's issued ones, since a
 * replay brings whatever the save owns. Tier patches carry their tier before's targets and range.
 */
export function bestT3Reach(towers: Iterable<TargetedTower>): T3Reach {
  const best = { ground: 0, air: 0 };
  for (const t of towers) {
    let ground = false;
    let air = false;
    let range = 0;
    for (let i = 0; i < Math.min(t.tiers.length, MAX_TIER_BEFORE_SPEC); i++) {
      const tier = t.tiers[i]!; // i < length
      ground = tier.targets?.ground ?? ground;
      air = tier.targets?.air ?? air;
      range = Math.max(range, tier.attack?.rangeTiles ?? 0);
      if (ground) best.ground = Math.max(best.ground, range);
      if (air) best.air = Math.max(best.air, range);
    }
  }
  return best;
}

/** The first `lengthTiles` of a polyline through tile centres (cut mid-segment if need be). */
export function routePrefix(route: readonly ReachTile[], lengthTiles: number): ReachTile[] {
  const out: ReachTile[] = [];
  let left = lengthTiles;
  for (let i = 0; i < route.length; i++) {
    const p = route[i]!; // i < length
    out.push(p);
    const q = route[i + 1];
    if (q === undefined || left <= 0) break;
    const seg = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (seg >= left) {
      if (seg > 0) {
        const u = left / seg;
        out.push([p[0] + u * (q[0] - p[0]), p[1] + u * (q[1] - p[1])]);
      }
      break;
    }
    left -= seg;
  }
  return out;
}

/**
 * Every tile a tower could ever stand on: pads, high ground and power nodes, wreckage over one,
 * and a scripted `openTile` that opens one. High ground carries the range bonus.
 */
function buildSites(def: MapDef<IdSpace>, grid: Grid): { tile: ReachTile; high: boolean }[] {
  const out: { tile: ReachTile; high: boolean }[] = [];
  const add = (tile: GridPos, ch: TileChar | undefined): void => {
    if (ch !== undefined && BUILDABLE.has(ch)) out.push({ tile, high: ch === '^' });
  };
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const ch = grid.at([c, r]);
      add([c, r], ch === 'x' ? def.underWreckage?.[`${c},${r}`] : ch);
    }
  }
  for (const e of def.events ?? []) {
    for (const a of e.actions) {
      if (!('openTile' in a)) continue;
      const at = def.markers?.[a.openTile];
      if (at !== undefined) add(at, a.to);
    }
  }
  return out;
}

/**
 * [quiet-wave-reach]: no buildable tile's best tier-3 range (with the high-ground bonus and the
 * static model's REACH_SLACK_TILES, so it holds under any profile's small range bonuses) reaches
 * the first QUIET_WAVE_CLEAR_TILES tiles of a route a `quiet_wave` group walks.
 */
export function validateQuietWaveReach(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  grid: Grid,
  mapWhere: string,
): void {
  const routes = new Map<string, readonly GridPos[]>();
  for (const p of def.paths) routes.set(p.id, p.tiles);
  for (const p of def.airLanes ?? []) routes.set(p.id, p.points);
  for (const p of def.riftLanes ?? []) routes.set(p.id, p.tiles);
  let sites: { tile: ReachTile; high: boolean }[] | null = null;
  const judged = new Set<string>();
  for (const [w, wave] of def.waves.entries()) {
    for (const [g, group] of wave.groups.entries()) {
      if (!(group.tags ?? []).includes('quiet_wave')) continue;
      const route = routes.get(group.route);
      const enemy = ctx.enemies.get(group.enemy);
      if (route === undefined || enemy === undefined) continue; // compile reports these
      const key = `${group.route}/${enemy.layer}`;
      if (judged.has(key)) continue;
      judged.add(key);
      const range = ctx.t3Reach[enemy.layer];
      if (range <= 0) continue;
      const head = routePrefix(route, QUIET_WAVE_CLEAR_TILES - 1);
      sites ??= buildSites(def, grid);
      for (const s of sites) {
        const reach = range * (1 + (s.high ? HIGH_GROUND_RANGE_PCT : 0)) + REACH_SLACK_TILES;
        const d = distanceToRoute(s.tile, head);
        if (d > reach) continue;
        issues.add(
          'quiet-wave-reach',
          `${mapWhere}.waves[${w}].groups[${g}]`,
          `buildable tile (${s.tile[0]},${s.tile[1]}) is ${d.toFixed(2)} tiles from the first ` +
            `${QUIET_WAVE_CLEAR_TILES} tiles of route '${group.route}', within a tier-3 ` +
            `${enemy.layer} reach of ${reach.toFixed(2)}`,
        );
      }
    }
  }
}
