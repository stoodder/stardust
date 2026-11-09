// The counter-answer model (design/enemies.md § 3.1; the table is rules.ts COUNTER_ANSWERS): which
// answers to a category a scripted build carries, judged by the tiers and specs its towers reach
// and the abilities it casts. One home for the content validator ([no-counter-build],
// [alt-builds]) and the balance harness's no-counter checks, so the two can't disagree.
//
// Pure, and shape-agnostic: callers turn their raw or compiled build steps into `ReachStep`s.
import {
  MAX_TIER_BEFORE_SPEC,
  TRAIT_COUNTER,
  type CounterAnswers,
  type TowerAnswer,
} from './rules.ts';
import type { Act, Body, CounterId, Layer, Trait } from './types.ts';

/** The steps that change which towers stand and at what tier. Tiles are any stable key. */
export type ReachStep =
  | { readonly op: 'build'; readonly tower: string; readonly tile: string }
  | { readonly op: 'upgrade'; readonly tile: string }
  | { readonly op: 'specialize'; readonly tile: string; readonly spec: 'a' | 'b' }
  | { readonly op: 'sell'; readonly tile: string };

/** The highest tier one placed tower reached (4 once specialized), and its spec. */
export interface ReachedTower {
  readonly tower: string;
  readonly tier: number;
  readonly spec: 'a' | 'b' | null;
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
  const standing = new Map<string, { tower: string; tier: number; spec: 'a' | 'b' | null }>();
  const out: { tower: string; tier: number; spec: 'a' | 'b' | null }[] = [];
  for (const s of steps) {
    if (s.op === 'build') {
      const t = { tower: s.tower, tier: 1, spec: null };
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
  for (const tower of loadout) if (!built.has(tower)) out.push({ tower, tier: 1, spec: null });
  return out;
}

/** What a category's conditional answers depend on: the map's act and its enemies there. */
export interface AnswerScope {
  readonly act: Act;
  /** Bodies of the map's enemies with a trait in the category. */
  readonly bodies: ReadonlySet<Body>;
  /** Whether one of those enemies flies. */
  readonly air: boolean;
}

/** The scope of `category` on a map of `act` whose waves hold `enemies`. */
export function answerScope(
  category: CounterId,
  act: Act,
  enemies: Iterable<{
    readonly traits: readonly Trait[];
    readonly body: Body;
    readonly layer: Layer;
  }>,
): AnswerScope {
  const bodies = new Set<Body>();
  let air = false;
  for (const e of enemies) {
    if (!e.traits.some((t) => TRAIT_COUNTER[t] === category)) continue;
    bodies.add(e.body);
    air ||= e.layer === 'air';
  }
  return { act, bodies, air };
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
 * entry one of its reached towers meets, and every answering ability it casts.
 */
export function answersCarried(
  answers: CounterAnswers,
  scope: AnswerScope,
  towers: readonly ReachedTower[],
  cast: Iterable<string>,
): string[] {
  const out: string[] = [];
  for (const entry of answers.towers) {
    if (applies(entry, scope) && towers.some((t) => reaches(entry, t))) out.push(label(entry));
  }
  for (const a of new Set(cast)) if (answers.abilities.includes(a)) out.push(a);
  return [...new Set(out)];
}
