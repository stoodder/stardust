// The counter-answer model (design/enemies.md § 3.1; the table is rules.ts COUNTER_ANSWERS): which
// answers to a category a scripted build carries, judged by the tiers and specs its towers reach
// and the abilities it casts. One home for the content validator ([no-counter-build],
// [alt-builds]) and the balance harness's no-counter checks, so the two can't disagree.
//
// Pure, and shape-agnostic: callers turn their raw or compiled build steps into `ReachStep`s.
//
// **Placement-aware (T313):** a placed tower answers a category only if one of its placements can
// reach a route that category's enemies take: the tile's distance to the route's polyline is
// within the range it reaches (with the high-ground bonus and REACH_SLACK_TILES). So A1M3's no-air
// build can carry Rivets "out of the air lane's reach" (act1.md § A1M3). A loadout tower the build
// never builds has no placement and still counts (it could go anywhere), and so does a tower whose
// range or routes the caller doesn't give. Neutral units (Gerald) belong to no category (D072).
import {
  HIGH_GROUND_RANGE_PCT,
  MAX_TIER_BEFORE_SPEC,
  TRAIT_COUNTER,
  type CounterAnswers,
  type TowerAnswer,
} from './rules.ts';
import type { Act, Body, CounterId, Layer, Trait } from './types.ts';

/** A tile, [col, row]. */
export type ReachTile = readonly [number, number];

/** Where a placed tower stands: its tile, and whether that's high ground (the range bonus). */
export interface Placement {
  readonly tile: ReachTile;
  readonly highGround: boolean;
}

/**
 * Range the static model grants beyond a placement's tier range and the high-ground bonus, in
 * tiles: the small bonuses it doesn't track (a range tune-up's +5%, Sitting Ducks's +0.3, the
 * high-ground protocol). Generous on purpose, so "out of reach" holds under any profile; the
 * harness's #5 and #6 runs stay the real test.
 */
export const REACH_SLACK_TILES = 0.5;

/**
 * The steps that change which towers stand and at what tier. Tiles are any stable key; a build
 * step's `at` places it (without one, the tower counts wherever it stands).
 */
export type ReachStep =
  | {
      readonly op: 'build';
      readonly tower: string;
      readonly tile: string;
      readonly at?: Placement;
    }
  | { readonly op: 'upgrade'; readonly tile: string }
  | { readonly op: 'specialize'; readonly tile: string; readonly spec: 'a' | 'b' }
  | { readonly op: 'sell'; readonly tile: string };

/** The highest tier one placed tower reached (4 once specialized), its spec, and where it stood. */
export interface ReachedTower {
  readonly tower: string;
  readonly tier: number;
  readonly spec: 'a' | 'b' | null;
  /**
   * Where it stood; null or absent for a loadout tower the build never builds, a build step that
   * gave no placement, or a hypothetical tower (the loadout screen's "what could answer").
   */
  readonly at?: Placement | null;
}

/**
 * Every tower a build reaches: each placed tower at the highest tier and spec any step takes it
 * to (selling it later doesn't undo that), plus each loadout tower it never builds, at tier 1.
 * Steps on an empty tile are ignored (the validator reports those as [build-step]).
 */
export function towersReached(
  loadout: readonly string[],
  steps: Iterable<ReachStep>,
): ReachedTower[] {
  type Mutable = { tower: string; tier: number; spec: 'a' | 'b' | null; at: Placement | null };
  const standing = new Map<string, Mutable>();
  const out: Mutable[] = [];
  for (const s of steps) {
    if (s.op === 'build') {
      const t: Mutable = { tower: s.tower, tier: 1, spec: null, at: s.at ?? null };
      standing.set(s.tile, t);
      out.push(t);
      continue;
    }
    const t = standing.get(s.tile);
    if (t === undefined) continue;
    if (s.op === 'upgrade') t.tier = Math.min(t.tier + 1, MAX_TIER_BEFORE_SPEC);
    else if (s.op === 'specialize') {
      t.tier = MAX_TIER_BEFORE_SPEC + 1;
      t.spec = s.spec;
    } else standing.delete(s.tile);
  }
  const built = new Set(out.map((t) => t.tower));
  for (const tower of loadout)
    if (!built.has(tower)) out.push({ tower, tier: 1, spec: null, at: null });
  return out;
}

/** One tier's attack range, as raw tier patches and compiled tiers both carry it. */
interface RangedTier {
  readonly attack?: { readonly rangeTiles?: number } | null;
}
/** A tower's tiers and specs, raw (patches) or compiled: enough to read the range it reaches. */
export interface RangedTower {
  readonly tiers: readonly RangedTier[];
  readonly specs?: { readonly a: RangedTier; readonly b: RangedTier } | null;
}

/**
 * The longest attack range `t` reaches: its tiers' up to the one it reached (a patch without a
 * range keeps the tier before's), and its spec's. Null when it never has an attack (support
 * towers), so it isn't judged by reach.
 */
export function rangeReached(def: RangedTower, t: ReachedTower): number | null {
  let range: number | null = null;
  let best: number | null = null;
  for (let i = 0; i < Math.min(t.tier, MAX_TIER_BEFORE_SPEC); i++) {
    range = def.tiers[i]?.attack?.rangeTiles ?? range;
    if (range !== null) best = Math.max(best ?? 0, range);
  }
  const spec = t.spec === null ? undefined : def.specs?.[t.spec]?.attack?.rangeTiles;
  if (spec !== undefined) best = Math.max(best ?? 0, spec);
  return best;
}

/** The distance from tile `p` to the polyline through `route`'s tiles (both by tile centers). */
export function distanceToRoute(p: ReachTile, route: readonly ReachTile[]): number {
  let best = Infinity;
  for (let i = 0; i < route.length; i++) {
    const a = route[i]!; // i < length
    const b = route[i + 1] ?? a;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const u =
      len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    best = Math.min(best, Math.hypot(p[0] - (a[0] + u * dx), p[1] - (a[1] + u * dy)));
  }
  return best;
}

/** What a category's conditional answers depend on: the map's act and its enemies there. */
export interface AnswerScope {
  readonly act: Act;
  /** Bodies of the map's enemies with a trait in the category. */
  readonly bodies: ReadonlySet<Body>;
  /** Whether one of those enemies flies. */
  readonly air: boolean;
  /**
   * The routes those enemies take (tile polylines), which a placed tower must reach to answer;
   * null when unknown (no such enemy, or one given without its route), so placement isn't judged.
   */
  readonly routes: readonly (readonly ReachTile[])[] | null;
}

/** One enemy in a wave, as answerScope reads it: its traits, body, layer, and route. */
export interface ScopeEnemy {
  readonly traits: readonly Trait[];
  readonly body: Body;
  readonly layer: Layer;
  /** A neutral unit (Gerald) is in no category (D072). */
  readonly neutral?: boolean;
  /** The route its group takes (tiles); without it, the scope's routes are unknown. */
  readonly route?: readonly ReachTile[];
}

/** The scope of `category` on a map of `act` whose waves hold `enemies`. */
export function answerScope(
  category: CounterId,
  act: Act,
  enemies: Iterable<ScopeEnemy>,
): AnswerScope {
  const bodies = new Set<Body>();
  const routes = new Set<readonly ReachTile[]>();
  let air = false;
  let known = true;
  for (const e of enemies) {
    if (e.neutral === true || !e.traits.some((t) => TRAIT_COUNTER[t] === category)) continue;
    bodies.add(e.body);
    air ||= e.layer === 'air';
    if (e.route === undefined) known = false;
    else routes.add(e.route);
  }
  return { act, bodies, air, routes: known && routes.size > 0 ? [...routes] : null };
}

/**
 * Whether placed tower `t` can reach one of the scope's routes (true when it has no placement,
 * the scope no routes, or `rangeOf` no range for it).
 */
export function placementReaches(
  scope: AnswerScope,
  t: ReachedTower,
  rangeOf?: (t: ReachedTower) => number | null,
): boolean {
  const at = t.at ?? null;
  if (at === null || scope.routes === null || rangeOf === undefined) return true;
  const range = rangeOf(t);
  if (range === null) return true;
  const reach = range * (1 + (at.highGround ? HIGH_GROUND_RANGE_PCT : 0)) + REACH_SLACK_TILES;
  const tile = at.tile;
  return scope.routes.some((r) => distanceToRoute(tile, r) <= reach);
}

/** Whether `entry` applies on this map at all (its act, body, and layer conditions). */
function applies(entry: TowerAnswer, scope: AnswerScope): boolean {
  if (entry.acts !== undefined && !entry.acts.includes(scope.act)) return false;
  if (entry.vsBodies !== undefined && !entry.vsBodies.some((b) => scope.bodies.has(b))) {
    return false;
  }
  return entry.vsAir !== true || scope.air;
}

/** Whether a reached tower meets `entry`'s tower, tier, and spec. */
function reaches(entry: TowerAnswer, t: ReachedTower): boolean {
  if (t.tower !== entry.tower || t.tier < (entry.minTier ?? 1)) return false;
  return entry.spec === undefined || t.spec === entry.spec;
}

/** "rivet T3", "thumper [Bunker Buster]", or "harpoon". */
function label(entry: TowerAnswer): string {
  if (entry.spec !== undefined) return `${entry.tower} [${entry.specName ?? entry.spec}]`;
  return entry.minTier !== undefined ? `${entry.tower} T${entry.minTier}` : entry.tower;
}

/**
 * The answers to a category a build carries, as labels (empty when it carries none): every
 * entry one of its reached towers meets from a placement that reaches the category's routes
 * (`rangeOf` gives a placed tower's range; without it, placement isn't judged), and every
 * answering ability it casts.
 */
export function answersCarried(
  answers: CounterAnswers,
  scope: AnswerScope,
  towers: readonly ReachedTower[],
  cast: Iterable<string>,
  rangeOf?: (t: ReachedTower) => number | null,
): string[] {
  const out: string[] = [];
  for (const entry of answers.towers) {
    if (!applies(entry, scope)) continue;
    const meets = (t: ReachedTower): boolean =>
      reaches(entry, t) && placementReaches(scope, t, rangeOf);
    if (towers.some(meets)) out.push(label(entry));
  }
  for (const a of new Set(cast)) if (answers.abilities.includes(a)) out.push(a);
  return [...new Set(out)];
}
