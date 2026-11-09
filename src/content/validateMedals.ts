// Medal and condition validation (design/progression.md § 3; story-runtime.md § Conditions). The
// sim evaluates the conditions (sim/conditions.ts) and settles the medals (sim/medals.ts).
//
// Checked here:
// - [medals]: every campaign map has a Challenge medal (`medals.challenge`; CHALLENGE_PENDING
//   lists the maps still waiting for theirs, each with its task); its id is snake_case and not a
//   built-in medal id; its name and description fit the briefing; its condition never references
//   medal-exempt units (no `tagRatio`, and a `passedMarker` enemy must walk in a group that isn't
//   exempt; design/core-loop.md § 2.7); every flag it reads has a `flagVariants` entry; and
//   `parMedals` has no repeats and names `challenge` only on a map that has one.
// - [condition]: every condition on a map (the Challenge, objectives, events' `when`, ability
//   locks): `stat` and `towers` have a bound (`gte` and/or `lte`, whole numbers ≥ 0, gte ≤ lte);
//   `tagRatio.gte` is in (0, 1]; `all` and `any` are non-empty; a `passedMarker` names a marker
//   within PASSED_MARKER_REACH_TILES of a route its units walk (else "past it" means nothing).
import type {
  ConditionDef,
  GridPos,
  IdSpace,
  MapDef,
  RawContent,
  ScriptFlagId,
  WaveTag,
} from './types.ts';
import { Issues, duplicates, isNonNegativeInt } from './validateHelpers.ts';

/**
 * Units in groups with these tags are medal-exempt: their leaks never break Perfect Core and no
 * Challenge may reference them (design/core-loop.md § 2.7). `youngling` is the youngling modifier.
 * TODO(orchestrator): move to rules.ts once T208 frees it.
 */
export const MEDAL_EXEMPT_TAGS: readonly WaveTag[] = [
  'quiet_wave',
  'youngling',
  'fleeing',
  'medal_exempt',
];

/** Medal ids every map has (sim/medals.ts), plus the dev saves' old placeholder: no Challenge may use them. */
export const RESERVED_MEDAL_IDS: readonly string[] = ['victory', 'perfect_core', 'challenge'];

/** Campaign maps still waiting for their Challenge medal, each with the task that adds it. */
export const CHALLENGE_PENDING: Readonly<Record<string, string>> = { a1_m01: 'T125' };

/** Briefing limits for a Challenge's name and description (characters). */
export const MEDAL_NAME_MAX = 40;
export const MEDAL_DESCRIPTION_MAX = 100;

/** How close (tiles, center to route) a `passedMarker` marker must sit to a route its units walk. */
export const PASSED_MARKER_REACH_TILES = 1.5;

const MEDAL_ID_RE = /^[a-z][a-z0-9_]*$/;

type Condition = ConditionDef<IdSpace>;

/** Validates every map's medals and conditions. */
export function validateMedals<K extends IdSpace>(issues: Issues, raw: RawContent<K>): void {
  const campaign = new Set<string>(raw.campaign);
  for (const def of Object.values<MapDef<IdSpace>>(raw.maps)) {
    validateMapMedals(issues, def, campaign.has(def.id));
  }
}

function validateMapMedals(issues: Issues, def: MapDef<IdSpace>, inCampaign: boolean): void {
  const where = `maps.${def.id}`;
  const conditions: [Condition, string][] = [];
  const challenge = def.medals?.challenge;
  if (challenge === undefined) {
    if (inCampaign && CHALLENGE_PENDING[def.id] === undefined) {
      issues.add('medals', `${where}.medals`, 'a campaign map needs a Challenge medal');
    }
  } else {
    const w = `${where}.medals.challenge`;
    conditions.push([challenge.condition, `${w}.condition`]);
    if (!MEDAL_ID_RE.test(challenge.id)) {
      issues.add('medals', `${w}.id`, `'${challenge.id}' must be snake_case`);
    } else if (RESERVED_MEDAL_IDS.includes(challenge.id)) {
      issues.add('medals', `${w}.id`, `'${challenge.id}' is a built-in medal id`);
    }
    text(issues, challenge.name, MEDAL_NAME_MAX, `${w}.name`);
    text(issues, challenge.description, MEDAL_DESCRIPTION_MAX, `${w}.description`);
    exemptRefs(issues, def, challenge.condition, `${w}.condition`);
    const variants = def.flagVariants ?? {};
    for (const f of flagsOf(challenge.condition)) {
      if (variants[f] === undefined) {
        issues.add('flag-variants', `${w}.condition`, `reads flag '${f}', so flagVariants needs a '${f}' entry`);
      }
    }
  }
  const par = def.parMedals ?? [];
  for (const m of duplicates(par)) issues.add('medals', `${where}.parMedals`, `'${m}' is listed twice`);
  if (par.includes('challenge') && challenge === undefined) {
    issues.add('medals', `${where}.parMedals`, "'challenge' needs a Challenge medal on the map");
  }

  for (const [i, o] of (def.objectives ?? []).entries()) {
    conditions.push([o.condition, `${where}.objectives[${i}].condition`]);
  }
  for (const [i, e] of (def.events ?? []).entries()) {
    if (e.when !== undefined) conditions.push([e.when, `${where}.events[${i}].when`]);
  }
  for (const [i, l] of (def.lockedAbilities ?? []).entries()) {
    conditions.push([l.when, `${where}.lockedAbilities[${i}].when`]);
  }
  for (const [c, w] of conditions) validateCondition(issues, def, c, w);
}

function text(issues: Issues, s: string, max: number, where: string): void {
  if (s.trim() === '' || s.length > max) {
    issues.add('medals', where, `must be 1–${max} characters (is ${s.length})`);
  }
}

/** [medals]: a Challenge never references medal-exempt units. */
function exemptRefs(issues: Issues, def: MapDef<IdSpace>, c: Condition, where: string): void {
  if ('all' in c || 'any' in c) {
    const list = 'all' in c ? c.all : c.any;
    for (const [i, s] of list.entries()) exemptRefs(issues, def, s, `${where}.${'all' in c ? 'all' : 'any'}[${i}]`);
  } else if ('not' in c) {
    exemptRefs(issues, def, c.not, `${where}.not`);
  } else if ('tagRatio' in c) {
    issues.add('medals', where, 'a Challenge may not reference medal-exempt units (tagRatio)');
  } else if ('passedMarker' in c && c.passedMarker.enemy !== undefined) {
    const enemy = c.passedMarker.enemy;
    const counted = def.waves.some((w) =>
      w.groups.some((g) => g.enemy === enemy && !(g.tags ?? []).some((t) => MEDAL_EXEMPT_TAGS.includes(t))),
    );
    if (!counted) {
      issues.add(
        'medals',
        where,
        `'${enemy}' never appears outside medal-exempt groups, so a Challenge can't reference it`,
      );
    }
  }
}

/** [condition]: the shape rules every condition follows. */
function validateCondition(issues: Issues, def: MapDef<IdSpace>, c: Condition, where: string): void {
  if ('all' in c || 'any' in c) {
    const key = 'all' in c ? 'all' : 'any';
    const list = 'all' in c ? c.all : c.any;
    if (list.length === 0) issues.add('condition', where, `'${key}' needs at least one condition`);
    for (const [i, s] of list.entries()) validateCondition(issues, def, s, `${where}.${key}[${i}]`);
  } else if ('not' in c) {
    validateCondition(issues, def, c.not, `${where}.not`);
  } else if ('stat' in c || 'towers' in c) {
    const { gte, lte } = c;
    if (gte === undefined && lte === undefined) {
      issues.add('condition', where, 'needs a bound (gte and/or lte)');
    }
    for (const [k, v] of [['gte', gte], ['lte', lte]] as const) {
      if (v !== undefined && !isNonNegativeInt(v)) {
        issues.add('condition', `${where}.${k}`, `${v} must be a whole number ≥ 0`);
      }
    }
    if (gte !== undefined && lte !== undefined && gte > lte) {
      issues.add('condition', where, `gte ${gte} is above lte ${lte}: it can never hold`);
    }
  } else if ('tagRatio' in c) {
    const g = c.tagRatio.gte;
    if (!(g > 0 && g <= 1)) issues.add('condition', `${where}.tagRatio.gte`, `${g} must be in (0, 1]`);
  } else if ('passedMarker' in c) {
    passedMarker(issues, def, c.passedMarker.marker, c.passedMarker.enemy, where);
  }
}

function passedMarker(
  issues: Issues,
  def: MapDef<IdSpace>,
  marker: string,
  enemy: string | undefined,
  where: string,
): void {
  const pos = def.markers?.[marker];
  if (pos === undefined) {
    issues.add('condition', `${where}.passedMarker`, `unknown marker '${marker}'`);
    return;
  }
  const walked = new Set<string>();
  for (const w of def.waves) {
    for (const g of w.groups) if (enemy === undefined || g.enemy === enemy) walked.add(g.route);
  }
  const routes: [string, readonly GridPos[]][] = [
    ...def.paths.map((p): [string, readonly GridPos[]] => [p.id, p.tiles]),
    ...(def.airLanes ?? []).map((p): [string, readonly GridPos[]] => [p.id, p.points]),
    ...(def.riftLanes ?? []).map((p): [string, readonly GridPos[]] => [p.id, p.tiles]),
  ];
  const reach = PASSED_MARKER_REACH_TILES * PASSED_MARKER_REACH_TILES;
  const near = routes.some(([id, pts]) => walked.has(id) && distSqToPolyline(pos, pts) <= reach);
  if (!near) {
    issues.add(
      'condition',
      `${where}.passedMarker`,
      `marker '${marker}' is more than ${PASSED_MARKER_REACH_TILES} tiles from every route ${enemy === undefined ? 'enemies walk' : `'${enemy}' walks`}`,
    );
  }
}

/** Squared distance from a tile's center to a polyline through tile centers. */
function distSqToPolyline([px, py]: GridPos, pts: readonly GridPos[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i]!; // i + 1 < length
    const [bx, by] = pts[i + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const ex = ax + t * dx - px;
    const ey = ay + t * dy - py;
    best = Math.min(best, ex * ex + ey * ey);
  }
  return best;
}

/** Every story flag a condition reads. */
function flagsOf(c: Condition): ScriptFlagId[] {
  if ('flag' in c) return [c.flag];
  if ('all' in c) return c.all.flatMap(flagsOf);
  if ('any' in c) return c.any.flatMap(flagsOf);
  if ('not' in c) return flagsOf(c.not);
  return [];
}
