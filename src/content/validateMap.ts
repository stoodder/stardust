// Map validation (design/maps.md § 9's validation rules; architecture.md § Validation). The route
// format itself is a compile error (compileMap.ts); this adds the rest:
// - [feature]: Defend maps only until T305 (Escort safe exits, Holdout, Protect, Choir).
// - [companion]: a present companion and every pick-list entry has a slot-2 ability in the
//   content; a pick list is non-empty with no repeats.
// - [ally]: ally posts have a positive attack rate and range, damage ≥ 0, and a layer to hit;
//   no two share a post, and Bricks is on a map at most once. (The post marker resolving is a
//   compile error; [marker] puts it on decor.)
// - [map-range]: start credits, core integrity, and first-clear Stardust.
// - [grid-span]: campaign maps fit on one screen, `cols + rows ≤ 36` (maps.md § 1).
// - [core]: a Defend map has exactly one core `C`.
// - [marker]: markers sit inside the map, off the path (`#`, `S`, `C`); ally posts and scripted
//   tile changes (`openTile`) sit on decor (§ 3; D042).
// - [terraces]: the render-only terrace levels, if given, are shaped like `tiles`, one digit
//   '0'–'3' per tile.
// - [wreckage]: every `x` says what lies under it (a pad, high ground, power node, or decor) and
//   pays 30–80 salvage; nothing else does.
// - [wave]: a map has at least one wave; every wave has groups; counts and intervals are
//   positive; wave 1 has no countdown.
// - [route-walk]: every group can walk its route (flyers on air lanes, ground units on paths or
//   rift lanes; a neutral flyer, Gerald, may fly a path; rift lanes carry only the Hollow, from
//   the wave they open).
// - [wave-tag]: no duplicate tags; `fleeing`, `youngling`, and `quiet_wave` only on Skitterkin.
// - [threat-intel]: `threatIntel` is exactly the set of traits in the waves.
// - [required-counters]: at most 3, no duplicates, each with a `noCounterBuilds` entry.
// - [soft-traits]: soft enemies are ≤ 15% of every wave's threat (maps.md § 6.2).
// - [teach]: each `teach` wave or group teaches a trait new to the campaign, at most one per trait.
// - [new-threats], [new-counter]: in campaign order, at most two new threats and one new
//   required-counter category per map (maps.md § 6.3).
// - [script]: wave triggers name a wave of the map; markers, objectives, and forced inputs that
//   scripts name exist; cue ids follow `<map_id>_wNN` or `<map_id>_<slot>`; `grantCredits` is a
//   whole number ≥ 1.
// - [flag-variants]: every flag an event or ability lock reads has a `flagVariants` entry.
// - [revisit]: `revisitOf` names another map.
// Parts: this file (the map loop, feature guards, ranges, geometry), validateWaves.ts ([wave],
// [route-walk], [wave-tag]), validateThreats.ts (intel, counters, teach, novelty),
// validateScripts.ts ([script], [flag-variants]), and validateBuilds.ts (builds).
//
// Medals and conditions ([medals], [condition]) are validateMedals.ts's, run by validate.ts.
//
// TODO stubs (their content can't exist yet): the revisit layout rules (A3M6, M5).
import { MAX_CAMPAIGN_GRID_SPAN, SALVAGE_MAX, SALVAGE_MIN } from './rules.ts';
import type { EnemyDef, IdSpace, MapDef, RawContent } from './types.ts';
import type { ValidationRules } from './validate.ts';
import { validateBuilds } from './validateBuilds.ts';
import {
  Issues,
  duplicates,
  fmt,
  gridOf,
  isNonNegativeInt,
  isPositiveInt,
  parseKey,
  type Grid,
} from './validateHelpers.ts';
import { validateScripts } from './validateScripts.ts';
import type { RangedTower } from './counterAnswers.ts';
import { emptyHistory, validateNovelty, validateThreats, type History } from './validateThreats.ts';
import { validateWaves } from './validateWaves.ts';

/** Validates every map: campaign maps in campaign order (with history), then the rest. */
export function validateCampaignMaps<K extends IdSpace>(
  issues: Issues,
  raw: RawContent<K>,
  rules: ValidationRules,
): void {
  const maps = new Map<string, MapDef<IdSpace>>(Object.entries<MapDef<IdSpace>>(raw.maps));
  const enemies = new Map<string, EnemyDef>(Object.entries<EnemyDef>(raw.enemies));
  const towersWithSpecs = new Set<string>(
    Object.values<{ id: string; specs?: unknown }>(raw.towers)
      .filter((t) => t.specs !== undefined)
      .map((t) => t.id),
  );
  const companionAbilities = new Map<string, string>();
  for (const a of Object.values<{ id: string; companion?: string }>(raw.abilities)) {
    if (a.companion !== undefined) companionAbilities.set(a.companion, a.id);
  }
  const towers = new Map<string, RangedTower>(Object.entries<RangedTower>(raw.towers));
  const ctx = {
    enemies,
    towers,
    towersWithSpecs,
    companionAbilities,
    rules,
    mapIds: new Set(maps.keys()),
  };
  const history = emptyHistory();
  const done = new Set<string>();
  for (const [index, id] of raw.campaign.entries()) {
    const def = maps.get(id);
    if (def === undefined || done.has(id)) continue; // compile reports unknown ids
    done.add(id);
    validateMap(issues, ctx, def, { index, history });
  }
  for (const [id, def] of maps) {
    if (!done.has(id)) validateMap(issues, ctx, def, null);
  }
}

export interface MapCtx {
  readonly enemies: ReadonlyMap<string, EnemyDef>;
  /** Each tower's tiers and specs, for the range a placed tower reaches (counterAnswers.ts). */
  readonly towers: ReadonlyMap<string, RangedTower>;
  readonly towersWithSpecs: ReadonlySet<string>;
  /** Each companion with a slot-2 ability in the content → that ability's id. */
  readonly companionAbilities: ReadonlyMap<string, string>;
  readonly rules: ValidationRules;
  readonly mapIds: ReadonlySet<string>;
}

function validateMap(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  campaign: { readonly index: number; readonly history: History } | null,
): void {
  const where = `maps.${def.id}`;
  const grid = gridOf(def);

  // Feature guards.
  if (def.objective !== 'defend') {
    issues.add(
      'feature',
      `${where}.objective`,
      `'${def.objective}' maps arrive with T305 (Escort safe exits, Holdout, Protect); only 'defend' runs now`,
    );
  }
  validateCompanion(issues, ctx, def, where);
  validateAllies(issues, def, where);

  if (!isNonNegativeInt(def.startCredits)) {
    issues.add('map-range', `${where}.startCredits`, 'must be a whole number ≥ 0');
  }
  if (def.coreIntegrity !== undefined && !isPositiveInt(def.coreIntegrity)) {
    issues.add('map-range', `${where}.coreIntegrity`, 'must be a whole number ≥ 1');
  }
  if (!isNonNegativeInt(def.stardust)) {
    issues.add('map-range', `${where}.stardust`, 'must be a whole number ≥ 0');
  }
  if (def.revisitOf !== undefined && (def.revisitOf === def.id || !ctx.mapIds.has(def.revisitOf))) {
    issues.add('revisit', `${where}.revisitOf`, `'${def.revisitOf}' is not another map`);
  }
  // TODO(A3M6, M5): revisit layout rules — the original's pads unchanged, new pads only in the
  // added band, the original layout centred.

  // Before validateNovelty adds this map's counters to the history.
  const introducesCounter =
    campaign !== null && def.requiredCounters.some((c) => !campaign.history.counters.has(c));
  if (grid !== null) validateGeometry(issues, def, grid, campaign !== null, where);
  validateWaves(issues, ctx, def, where);
  validateThreats(issues, ctx, def, campaign?.history ?? emptyHistory(), where);
  if (campaign !== null) validateNovelty(issues, ctx, def, grid, campaign.history, where);
  validateScripts(issues, def, where);
  validateBuilds(issues, def, grid, ctx, campaign?.index ?? null, introducesCounter);
}

/** Tiles a route walks: a marker never sits on one. */
const PATH_TILES: ReadonlySet<string> = new Set(['#', 'S', 'C']);

// ── Geometry ─────────────────────────────────────────────────────────────────────────────────

function validateGeometry(
  issues: Issues,
  def: MapDef<IdSpace>,
  grid: Grid,
  isCampaign: boolean,
  where: string,
): void {
  if (isCampaign && grid.cols + grid.rows > MAX_CAMPAIGN_GRID_SPAN) {
    issues.add(
      'grid-span',
      `${where}.size`,
      `cols + rows is ${grid.cols + grid.rows}; a campaign map fits one screen (≤ ${MAX_CAMPAIGN_GRID_SPAN})`,
    );
  }
  if (def.objective === 'defend' && grid.count('C') !== 1) {
    issues.add(
      'core',
      `${where}.tiles`,
      `a Defend map has exactly one core 'C' (found ${grid.count('C')})`,
    );
  }
  // A marker may sit on any non-path tile (D042: A1M2's pump station marks its power node), but
  // an ally post or a scripted tile change takes the tile, so those markers stay on decor.
  const decorOnly = new Set<string>([
    ...(def.allies ?? []).map((a) => a.post),
    ...(def.events ?? []).flatMap((e) =>
      e.actions.flatMap((a) => ('openTile' in a ? [a.openTile] : [])),
    ),
  ]);
  for (const [name, pos] of Object.entries(def.markers ?? {})) {
    const t = grid.at(pos);
    const ok = decorOnly.has(name) ? t === '.' : t !== undefined && !PATH_TILES.has(t);
    if (!ok) {
      issues.add(
        'marker',
        `${where}.markers.${name}`,
        `${fmt(pos)} is ${t === undefined ? 'off the map' : `'${t}'`}; ${
          decorOnly.has(name)
            ? "an ally post or a scripted tile change sits on decor ('.')"
            : 'markers sit off the path'
        }`,
      );
    }
  }
  if (def.terraces !== undefined) {
    const t = def.terraces;
    const shaped =
      t.length === grid.rows && t.every((row) => /^[0-3]*$/.test(row) && row.length === grid.cols);
    if (!shaped) {
      issues.add(
        'terraces',
        `${where}.terraces`,
        `must be ${grid.rows} rows of ${grid.cols} digits '0'–'3' (one per tile, like tiles)`,
      );
    }
  }
  const under = def.underWreckage ?? {};
  const salvage = def.salvage ?? {};
  for (const [key, ch] of Object.entries(under)) {
    const pos = parseKey(key);
    if (pos === null || grid.at(pos) !== 'x') {
      issues.add('wreckage', `${where}.underWreckage.${key}`, "is not a wreckage tile ('x')");
    } else if (ch === undefined || !['o', '^', '+', '.'].includes(ch)) {
      issues.add(
        'wreckage',
        `${where}.underWreckage.${key}`,
        `'${String(ch)}' can't lie under wreckage (a pad, high ground, power node, or decor)`,
      );
    }
  }
  for (const [key, credits] of Object.entries(salvage)) {
    const pos = parseKey(key);
    if (pos === null || grid.at(pos) !== 'x') {
      issues.add('wreckage', `${where}.salvage.${key}`, "is not a wreckage tile ('x')");
    } else if (
      !Number.isInteger(credits) ||
      (credits ?? 0) < SALVAGE_MIN ||
      (credits ?? 0) > SALVAGE_MAX
    ) {
      issues.add(
        'wreckage',
        `${where}.salvage.${key}`,
        `${String(credits)} must be a whole number of credits in ${SALVAGE_MIN}–${SALVAGE_MAX}`,
      );
    }
  }
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.at([c, r]) !== 'x') continue;
      const key = `${c},${r}`;
      if (!(key in under)) {
        issues.add(
          'wreckage',
          `${where}.underWreckage`,
          `wreckage at ${fmt([c, r])} needs an entry`,
        );
      }
      if (!(key in salvage)) {
        issues.add('wreckage', `${where}.salvage`, `wreckage at ${fmt([c, r])} needs an entry`);
      }
    }
  }
}

function validateCompanion(issues: Issues, ctx: MapCtx, def: MapDef<IdSpace>, where: string): void {
  const c = def.companion;
  if (c === null) return;
  const needAbility = (id: string, w: string): void => {
    if (!ctx.companionAbilities.has(id)) {
      issues.add(
        'companion',
        w,
        `'${id}' has no ability with \`companion: '${id}'\` in the content`,
      );
    }
  };
  if ('pick' in c) {
    if (c.pick.length === 0) issues.add('companion', `${where}.companion.pick`, 'is empty');
    for (const id of duplicates(c.pick)) {
      issues.add('companion', `${where}.companion.pick`, `'${id}' is listed twice`);
    }
    for (const id of c.pick) needAbility(id, `${where}.companion.pick`);
  } else if (c.state === 'present') {
    needAbility(c.id, `${where}.companion`);
  }
}

function validateAllies(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const posts = new Set<string>();
  let bricks = 0;
  for (const [i, a] of (def.allies ?? []).entries()) {
    const w = `${where}.allies[${i}]`;
    const bad = (msg: string): void => issues.add('ally', w, msg);
    if (posts.has(a.post)) bad(`post '${a.post}' already has an ally`);
    posts.add(a.post);
    if (a.kind === 'bricks' && ++bricks === 2) bad('Bricks is on this map twice');
    const at = a.attack;
    if (!(at.damage >= 0)) bad('attack.damage must be ≥ 0');
    if (!(at.ratePerSec > 0)) bad('attack.ratePerSec must be > 0');
    if (!(at.rangeTiles > 0)) bad('attack.rangeTiles must be > 0');
    if (!at.targets.ground && !at.targets.air) bad('attack.targets hits neither layer');
  }
}
