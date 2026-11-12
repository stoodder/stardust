// Wave validation (maps.md § 9; the rule list is validateMap.ts's header): [wave],
// [route-walk], [wave-tag], [fleeing-lead], and [quiet-wave-reach].
import { REACH_SLACK_TILES, distanceToRoute, type ReachTile } from './counterAnswers.ts';
import { FLAG_RULES, type FlagRuleCondition } from './dialogue/flags.ts';
import { hushesOf } from './compileEnemy.ts';
import {
  FLEEING_LEAD_MAX_SEC,
  FLEEING_LEAD_MIN_SEC,
  HIGH_GROUND_RANGE_PCT,
  MAX_TIER_BEFORE_SPEC,
  SKITTERKIN_ONLY_TAGS,
} from './rules.ts';
import type { GridPos, IdSpace, Layer, MapDef, TileChar, WaveTag } from './types.ts';
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

/** A run-end flag rule as [wave-tag] reads it: its map and its condition. */
export interface ExceptRule {
  readonly onMapEnd: string;
  readonly value: FlagRuleCondition;
}

/**
 * Every `tagRatio.except` pair in the flag rules that end on `mapId`: `except` → the `tag` it is
 * counted out of. The ratio subtracts `except`'s count from `tag`'s (the stats count per tag), so
 * a unit carrying `except` without `tag` would be subtracted from a count it was never in (D098).
 */
export function exceptTags(rules: readonly ExceptRule[], mapId: string): Map<WaveTag, WaveTag[]> {
  const out = new Map<WaveTag, WaveTag[]>();
  const walk = (c: FlagRuleCondition): void => {
    if ('tagRatio' in c) {
      const { tag, except } = c.tagRatio;
      if (except === undefined) return;
      const tags = out.get(except) ?? [];
      if (!tags.includes(tag)) tags.push(tag);
      out.set(except, tags);
    } else if ('all' in c) c.all.forEach(walk);
    else if ('any' in c) c.any.forEach(walk);
    else if ('not' in c) walk(c.not);
  };
  for (const r of rules) if (r.onMapEnd === mapId) walk(r.value);
  return out;
}

export function validateWaves(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  mapWhere: string,
): void {
  const excepts = exceptTags(ctx.rules.flagRules ?? FLAG_RULES, def.id);
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
    if (wave.noCall !== undefined && w === 0) {
      issues.add('wave', `${where}.noCall`, 'wave 1 is started by the player, never called');
    }
    if (wave.inPhase !== undefined) {
      if (w === 0) issues.add('wave', `${where}.inPhase`, 'wave 1 is started by the player');
      else if (!isPositiveInt(wave.inPhase) || wave.inPhase < 2) {
        issues.add('wave', `${where}.inPhase`, 'must be a whole script phase ≥ 2');
      } else if (wave.countdownAfter !== undefined) {
        issues.add('wave', `${where}.inPhase`, "can't wait for a phase and a boss at once");
      }
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
      for (const t of tags) {
        for (const needed of excepts.get(t) ?? []) {
          if (!tags.includes(needed)) {
            issues.add(
              'wave-tag',
              `${gw}.tags`,
              `'${t}' needs '${needed}' too (a flag rule counts '${t}' out of '${needed}' here)`,
            );
          }
        }
      }
    }
    validateFleeingLead(issues, ctx, wave.groups, where);
  }
  validatePivotFaction(issues, ctx, def, mapWhere);
}

/**
 * [wave]: once a wave sends a boss whose ending is `pivot`, no later wave sends a group of its
 * faction (D138), and neither does the boss's own wave after the boss's group starts (a group
 * whose `delaySec` is later than the boss group's; D139): the pivot stands down only the live
 * units of its side (enemies.md § 6.1), so a later one would walk in hostile after its side has
 * stood down.
 */
function validatePivotFaction(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  mapWhere: string,
): void {
  const pivots = new Map<string, number>(); // faction → the first pivoting boss's wave index
  const bossDelay = new Map<string, number>(); // faction → this wave's earliest pivoting boss delay
  for (const [w, wave] of def.waves.entries()) {
    bossDelay.clear();
    for (const group of wave.groups) {
      const enemy = ctx.enemies.get(group.enemy);
      if (enemy?.boss?.ending !== 'pivot') continue;
      const delay = group.delaySec ?? 0;
      const was = bossDelay.get(enemy.faction);
      if (was === undefined || delay < was) bossDelay.set(enemy.faction, delay);
    }
    for (const [g, group] of wave.groups.entries()) {
      const enemy = ctx.enemies.get(group.enemy);
      if (enemy === undefined) continue;
      const from = pivots.get(enemy.faction);
      const at = `${mapWhere}.waves[${w}].groups[${g}]`;
      if (from !== undefined && w > from) {
        issues.add(
          'wave',
          at,
          `'${enemy.id}' (${enemy.faction}) spawns after wave ${from + 1}'s boss pivots its side`,
        );
        continue;
      }
      const boss = bossDelay.get(enemy.faction);
      if (boss !== undefined && (group.delaySec ?? 0) > boss) {
        issues.add(
          'wave',
          at,
          `'${enemy.id}' (${enemy.faction}) starts after its own wave's pivoting boss ` +
            `(delay ${group.delaySec ?? 0} s > ${boss} s)`,
        );
      }
    }
    for (const [faction] of bossDelay) {
      if (!pivots.has(faction)) pivots.set(faction, w);
    }
  }
}

/** Float slack for authored seconds (2.0 − 0.1 is not quite 1.9). */
const LEAD_EPS_SEC = 1e-9;

/**
 * [fleeing-lead] (enemies.md § 7): in a wave that sends hushing Hollow units down a `fleeing`
 * group's route, the fleeing group spawns FLEEING_LEAD_MIN_SEC–FLEEING_LEAD_MAX_SEC before one of
 * them, so the runners are seen running from something. A fleeing group with no Hollow behind it
 * (A2M1's first waves) is free.
 */
function validateFleeingLead(
  issues: Issues,
  ctx: MapCtx,
  groups: MapDef<IdSpace>['waves'][number]['groups'],
  where: string,
): void {
  for (const [g, group] of groups.entries()) {
    if (!(group.tags ?? []).includes('fleeing')) continue;
    const leads: number[] = [];
    for (const h of groups) {
      const enemy = ctx.enemies.get(h.enemy);
      if (h === group || h.route !== group.route || enemy === undefined || !hushesOf(enemy)) {
        continue;
      }
      leads.push((h.delaySec ?? 0) - (group.delaySec ?? 0));
    }
    if (leads.length === 0) continue;
    const ok = leads.some(
      (s) => s >= FLEEING_LEAD_MIN_SEC - LEAD_EPS_SEC && s <= FLEEING_LEAD_MAX_SEC + LEAD_EPS_SEC,
    );
    if (!ok) {
      issues.add(
        'fleeing-lead',
        `${where}.groups[${g}]`,
        `a fleeing group spawns ${FLEEING_LEAD_MIN_SEC}–${FLEEING_LEAD_MAX_SEC} s before a Hollow group on route '${group.route}' (it leads by ${leads.map((s) => `${s} s`).join(', ')})`,
      );
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
 * investment, D097). Tier patches carry their tier before's targets and range.
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

/**
 * A tower's best tier-1-to-3 reach per layer (`bestT3Reach`) and the campaign index of the map
 * whose win first stocks it (−1 from the start, or for a tower with no access row).
 */
export interface TowerReach {
  readonly tower: string;
  readonly reach: T3Reach;
  readonly firstOwnedAfter: number;
}

/** Every tower's reach (`TowerReach`); `stockedAfter` gives a tower's campaign index. */
export function towerReaches(
  towers: Iterable<readonly [string, TargetedTower]>,
  stockedAfter: (tower: string) => number,
): TowerReach[] {
  const out: TowerReach[] = [];
  for (const [id, t] of towers) {
    out.push({ tower: id, reach: bestT3Reach([t]), firstOwnedAfter: stockedAfter(id) });
  }
  return out;
}

/**
 * The best reach on `layer` over the towers the run that first wins the map at campaign index
 * `mapIndex` can own (−1: not a campaign map, so every tower). Only that run sets the map's flags
 * (story-runtime.md § Flags), so it's the one [quiet-wave-reach] guards: a tower first stocked
 * after the map itself isn't counted there, whatever a replay brings (D107's scope for auras,
 * applied to attack ranges by T408: the Harpoon's 4.0, stocked after A2M1, would reach A1M5's
 * Quiet Wave from two pads).
 */
export function reachOnMap(reaches: readonly TowerReach[], layer: Layer, mapIndex: number): number {
  let best = 0;
  for (const r of reaches) {
    if (mapIndex >= 0 && r.firstOwnedAfter >= mapIndex) continue;
    if (r.reach[layer] > best) best = r.reach[layer];
  }
  return best;
}

/** A tower's tiers as raw content gives them: enough to read its range auras. */
export interface AuraTower {
  readonly tiers: readonly {
    readonly auras?: readonly {
      readonly stat: string;
      readonly pct: number;
      readonly radiusTiles: number;
    }[];
  }[];
}

/**
 * A range aura a pad could take from a support tower beside it (the Lookout Shack's, T406): the
 * tower's best tier-1-to-3 range pct and that aura's radius (specs aren't counted, as in
 * bestT3Reach), and the campaign index of the map whose win first stocks the tower (−1 from the
 * start, or for a tower with no access row).
 */
export interface RangeAura {
  readonly tower: string;
  readonly pct: number;
  readonly radiusTiles: number;
  readonly firstOwnedAfter: number;
}

/**
 * Every tower's best tier-1-to-3 range aura (aura arrays replace whole per tier, so each tier's
 * own list counts). `stockedAfter` gives a tower's campaign index (−1: from the start).
 */
export function rangeAuras(
  towers: Iterable<readonly [string, AuraTower]>,
  stockedAfter: (tower: string) => number,
): RangeAura[] {
  const out: RangeAura[] = [];
  for (const [id, t] of towers) {
    let best: { pct: number; radiusTiles: number } | null = null;
    for (let i = 0; i < Math.min(t.tiers.length, MAX_TIER_BEFORE_SPEC); i++) {
      // i < length
      for (const a of t.tiers[i]!.auras ?? []) {
        if (a.stat === 'range' && a.pct > (best?.pct ?? 0)) best = a;
      }
    }
    if (best !== null) {
      const { pct, radiusTiles } = best;
      out.push({ tower: id, pct, radiusTiles, firstOwnedAfter: stockedAfter(id) });
    }
  }
  return out;
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
 * The best range aura a tower on `site` could take on the map at campaign index `mapIndex` (−1:
 * not a campaign map): a support tower standing on another build site within the aura's radius,
 * owned by the run that first wins the map. Auras of one kind don't stack, so the best one counts.
 *
 * Only the run that first wins a map sets its flags (story-runtime.md § Flags), so that run is the
 * one [quiet-wave-reach] guards: an aura tower first stocked after the map itself (the Lookout,
 * after A1M5) can't stand beside a pad on A1M5's deciding run and isn't counted there (T406).
 */
function bestRangeAura(
  site: { tile: ReachTile },
  sites: readonly { tile: ReachTile }[],
  auras: readonly RangeAura[],
  mapIndex: number,
): number {
  let best = 0;
  for (const a of auras) {
    if (a.pct <= best || (mapIndex >= 0 && a.firstOwnedAfter >= mapIndex)) continue;
    const r2 = a.radiusTiles * a.radiusTiles;
    const beside = sites.some((o) => {
      const dx = o.tile[0] - site.tile[0];
      const dy = o.tile[1] - site.tile[1];
      return o !== site && dx * dx + dy * dy <= r2;
    });
    if (beside) best = a.pct;
  }
  return best;
}

/**
 * [quiet-wave-reach]: no buildable tile's best tier-3 range (`reachOnMap`: over the towers the
 * map's first-win run can own; with the high-ground bonus, the best range aura a support tower
 * beside it could add (`bestRangeAura`), and the static model's REACH_SLACK_TILES, so it holds
 * under any profile's small range bonuses) reaches the first QUIET_WAVE_CLEAR_TILES tiles of a
 * route a `quiet_wave` group walks.
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
      const range = reachOnMap(ctx.towerReaches, enemy.layer, ctx.campaignIndex(def.id));
      if (range <= 0) continue;
      const head = routePrefix(route, QUIET_WAVE_CLEAR_TILES - 1);
      sites ??= buildSites(def, grid);
      for (const s of sites) {
        const aura = bestRangeAura(s, sites, ctx.rangeAuras, ctx.campaignIndex(def.id));
        const bonus = (s.high ? HIGH_GROUND_RANGE_PCT : 0) + aura;
        const reach = range * (1 + bonus) + REACH_SLACK_TILES;
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
