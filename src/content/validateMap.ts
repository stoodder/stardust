// Map validation (design/maps.md § 9's validation rules; architecture.md § Validation). The route
// format itself is a compile error (compileMap.ts); this adds the rest:
// - [feature]: Defend and Protect maps only until T305c (Escort safe exits, Holdout, Choir).
// - [asset]: a Protect map has an `asset` (and only it does): a name, a meter ≥ 1, at least one
//   route, none twice; its marker sits on decor ([marker]). Its routes end beside it (compile).
// - [companion]: a present companion and every pick-list entry has a slot-2 ability in the
//   content; a pick list is non-empty with no repeats.
// - [ally]: ally posts have a positive attack rate and range, damage ≥ 0, and a layer to hit;
//   no two share a post, and Bricks is on a map at most once. (The post marker resolving is a
//   compile error; [marker] puts it on decor.)
// - [map-range]: start credits, core integrity, and first-clear Stardust.
// - [grid-span]: campaign maps fit on one screen, `cols + rows ≤ 36` (maps.md § 1).
// - [core]: a Defend or Protect map has exactly one core `C`.
// - [marker]: markers sit inside the map, off the path (`#`, `S`, `C`); ally posts and scripted
//   tile changes (`openTile`), and a Protect map's asset sit on decor (§ 3; D042).
// - [terraces]: the render-only terrace levels, if given, are shaped like `tiles`, one digit
//   '0'–'3' per tile.
// - [wreckage]: every `x` says what lies under it (a pad, high ground, power node, or decor) and
//   pays 30–80 salvage; nothing else does.
// - [wave]: a map has at least one wave; every wave has groups; counts and intervals are
//   positive; wave 1 has no countdown.
// - [route-walk]: every group can walk its route (flyers on air lanes, ground units on paths or
//   rift lanes; a neutral flyer, Gerald, may fly a path; rift lanes carry only the Hollow, from
//   the wave they open).
// - [wave-tag]: no duplicate tags; `fleeing`, `youngling`, and `quiet_wave` only on Skitterkin;
//   on a flag rule's map, a group carrying a `tagRatio.except` tag also carries its `tag` (D098:
//   A1M5's younglings carry `quiet_wave`). `countdownAfter: 'bossEnded'` needs a boss in an
//   earlier wave.
// - [fleeing-lead]: in a wave that sends hushing Hollow units down a `fleeing` group's route, the
//   fleeing group spawns 2–4 s before one of them (enemies.md § 7; FLEEING_LEAD_*_SEC).
// - [quiet-wave-reach]: no buildable tile's best tier-3 range (high ground's bonus and
//   REACH_SLACK_TILES included) reaches the first 4 tiles of a route a `quiet_wave` group walks
//   (D097: the Quiet Wave is seen before any tower could fire on it).
// - [threat-intel]: `threatIntel` is exactly the set of traits in the waves.
// - [required-counters]: at most 3, no duplicates, each with a `noCounterBuilds` entry.
// - [soft-traits]: soft enemies are ≤ 15% of every wave's threat (maps.md § 6.2).
// - [teach]: each `teach` wave or group teaches a trait new to the campaign, at most one per trait.
// - [new-threats], [new-counter]: in campaign order, at most two new threats and one new
//   required-counter category per map (maps.md § 6.3); a capstone boss (known traits, known
//   brood) is not a new threat.
// - [script]: wave triggers name a wave of the map; markers, objectives, and forced inputs that
//   scripts name exist; cue ids follow `<map_id>_wNN` or `<map_id>_<slot>`; `grantCredits` is a
//   whole number ≥ 1.
// - [flag-variants]: every flag an event or ability lock reads has a `flagVariants` entry.
// - [revisit]: `revisitOf` names another map; `revisitAt` goes with it.
// - [clickable]: each `clickables` entry is a marker with a name; `setClickable` and the
//   `interacted` trigger name one ([script] also checks `wreckageCleared` markers sit on
//   wreckage and `objectiveDone` names another objective of the map).
// Parts: this file (the map loop, feature guards, ranges, geometry), validateWaves.ts ([wave],
// [route-walk], [wave-tag], [fleeing-lead], [quiet-wave-reach]), validateThreats.ts (intel,
// counters, teach, novelty), validateScripts.ts ([script], [flag-variants]), and validateBuilds.ts
// (builds).
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
import { TOWERS_AHEAD_OF_TASK } from './towers/index.ts';
import type { RangedTower } from './counterAnswers.ts';
import { emptyHistory, validateNovelty, validateThreats, type History } from './validateThreats.ts';
import { CAMPAIGN_PLAN_IDS } from './campaign.ts';
import { TOWER_ACCESS } from './upgrades/access.ts';
import {
  bestT3Reach,
  rangeAuras,
  validateQuietWaveReach,
  validateWaves,
  type AuraTower,
  type RangeAura,
  type T3Reach,
  type TargetedTower,
} from './validateWaves.ts';

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
    // Stubs registered ahead of their task don't count yet (towers/index.ts TOWERS_AHEAD_OF_TASK).
    t3Reach: bestT3Reach(
      Object.entries<TargetedTower>(raw.towers)
        .filter(([id]) => !TOWERS_AHEAD_OF_TASK.includes(id))
        .map(([, t]) => t),
    ),
    // Range auras a pad could take ([quiet-wave-reach]), by when each tower is first stocked.
    rangeAuras: rangeAuras(
      Object.entries<AuraTower>(raw.towers).filter(([id]) => !TOWERS_AHEAD_OF_TASK.includes(id)),
      (id) => {
        const access: Readonly<Record<string, { availableAfter: string | null }>> = TOWER_ACCESS;
        const after = Object.hasOwn(access, id) ? (access[id]?.availableAfter ?? null) : null;
        return after === null ? -1 : planIndex(after);
      },
    ),
    campaignIndex: planIndex,
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

/** A map's index in the campaign plan (content/campaign.ts), or −1 for a map outside it. */
function planIndex(id: string): number {
  const ids: readonly string[] = CAMPAIGN_PLAN_IDS;
  return ids.indexOf(id);
}

export interface MapCtx {
  readonly enemies: ReadonlyMap<string, EnemyDef>;
  /** Each tower's tiers and specs, for the range a placed tower reaches (counterAnswers.ts). */
  readonly towers: ReadonlyMap<string, RangedTower>;
  /** The best tier-3 range any tower brings, per layer ([quiet-wave-reach]). */
  readonly t3Reach: T3Reach;
  /** Every tower's best tier-3 range aura, with when it's first stocked ([quiet-wave-reach]). */
  readonly rangeAuras: readonly RangeAura[];
  /** A map's index in the campaign plan (−1: not a campaign map). */
  readonly campaignIndex: (map: string) => number;
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

  // Feature guards. Protect is content now (A2M2) and createSim refuses it until T305a
  // (`map.protect`); Escort, Holdout, and Choir arrive with T305c (M5).
  if (def.objective !== 'defend' && def.objective !== 'protect') {
    issues.add(
      'feature',
      `${where}.objective`,
      `'${def.objective}' maps arrive with T305c (Escort safe exits, Holdout, Choir); 'defend' and 'protect' only`,
    );
  }
  validateAsset(issues, def, where);
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
  if ((def.revisitAt !== undefined) !== (def.revisitOf !== undefined)) {
    issues.add('revisit', `${where}.revisitAt`, 'goes with `revisitOf` (and only with it)');
  }
  // TODO(A3M6, M5): revisit layout rules — the original's pads unchanged, new pads only in the
  // added band, the original layout centred.

  // Before validateNovelty adds this map's counters to the history.
  const introducesCounter =
    campaign !== null && def.requiredCounters.some((c) => !campaign.history.counters.has(c));
  if (grid !== null) validateGeometry(issues, def, grid, campaign !== null, where);
  validateWaves(issues, ctx, def, where);
  if (grid !== null) validateQuietWaveReach(issues, ctx, def, grid, where);
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
  if ((def.objective === 'defend' || def.objective === 'protect') && grid.count('C') !== 1) {
    issues.add(
      'core',
      `${where}.tiles`,
      `a Defend or Protect map has exactly one core 'C' (found ${grid.count('C')})`,
    );
  }
  // A marker may sit on any non-path tile (D042: A1M2's pump station marks its power node), but
  // an ally post or a scripted tile change takes the tile, so those markers stay on decor.
  const decorOnly = new Set<string>([
    ...(def.allies ?? []).map((a) => a.post),
    ...(def.asset === undefined ? [] : [def.asset.marker]),
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

/** [asset]: a Protect map has an asset and only it does; its meter is a whole number ≥ 1. */
function validateAsset(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const a = def.asset;
  if ((a !== undefined) !== (def.objective === 'protect')) {
    issues.add('asset', `${where}.asset`, "goes with objective 'protect' (and only with it)");
  }
  if (a === undefined) return;
  if (a.name.trim() === '') issues.add('asset', `${where}.asset.name`, 'names the meter');
  if (!isPositiveInt(a.integrity)) {
    issues.add('asset', `${where}.asset.integrity`, 'must be a whole number ≥ 1');
  }
  if (a.routes.length === 0) {
    issues.add('asset', `${where}.asset.routes`, 'names at least one route whose leaks hit it');
  }
  for (const r of duplicates(a.routes)) {
    issues.add('asset', `${where}.asset.routes`, `'${r}' is listed twice`);
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
