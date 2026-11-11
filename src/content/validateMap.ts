// Map validation (design/maps.md § 9's validation rules; architecture.md § Validation). The route
// format itself is a compile error (compileMap.ts); this adds the rest:
// - [asset]: a Protect map has an `asset` (and only it does): a short name, a meter ≥ 1, one or more
//   routes, none twice; its marker sits on decor ([marker]). Its routes end beside it (compile).
// - [companion]: a present companion and every pick-list entry has a slot-2 ability in the
//   content; a pick list is non-empty with no repeats.
// - [ally]: ally posts have a positive attack rate and range, damage ≥ 0, and a layer to hit;
//   no two share a post, and Bricks is on a map at most once. A blocker (`block`, T600a) holds a
//   whole number ≥ 1 of units, and its health keys name the map's waves in rising order, each in
//   [BLOCKER_HEALTH_FLOOR, 1], and its post lies within BLOCKER_REACH_TILES of a ground route (a
//   path or rift lane's polyline through its tile centres; T605b), else it would block nothing.
//   (The post marker resolving is a compile error; [marker] puts it on decor.)
// - [holdout] (T605b): a Holdout has an event forcing an input (`forceInput`: the SEAL) and one
//   ending the map (`endMap`), so it can end at all (it has no defeat). Every build on a map with a
//   `forceInput` ends with a `scriptInput` step (validateBuilds.ts [build-step]).
// - [map-range]: start credits, core integrity, and first-clear Stardust.
// - [grid-span]: campaign maps fit on one screen, `cols + rows ≤ 36` (maps.md § 1).
// - [core]: a Defend, Protect, Escort, or Choir map has exactly one core `C` (an Escort's is its safe exit)
//   besides its bearers' doors home (T700a: a bearer group's exit, on a core tile of its own); a
//   Holdout has at least one (each a door its refugees leave by: A3M3's two blast doors).
// - [escort], [darkness]: validateEscort.ts (T500a): refugees and the safe exit; Sundown's `dark`
//   keys and lamps.
// - [marker]: markers sit inside the map, off the path (`#`, `S`, `C`); ally posts and scripted
//   tile changes (`openTile`), and a Protect map's asset sit on decor (§ 3; D042). The markers on
//   a path tile are an Escort's `safeExit` and its groups' `exit`s, on a core ([escort]).
// - [terraces]: the render-only terrace levels, if given, are shaped like `tiles`, one digit
//   '0'–'3' per tile.
// - [wreckage]: every `x` says what lies under it (a pad, high ground, power node, or decor) and
//   pays 30–80 salvage; nothing else does.
// - [wave]: a map has at least one wave; every wave has groups; counts and intervals are
//   positive; wave 1 has no countdown, and `noCall` is never on wave 1; no group of a pivoting
//   boss's faction spawns in a wave after that boss's (D138).
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
//   (D097: the Quiet Wave is seen before any tower could fire on it), counting only the towers
//   and range auras the run that first wins the map can own (T406, T408).
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
// - [revisit]: `revisitOf` names another map; `revisitAt` goes with it. The layout rules (the
//   original centred, its footprint unchanged, new pads only in the band, no route, marker, or
//   wreckage collisions) are compileRevisit.ts's, which composes a revisit before validation.
// - [lighting]: the lighting schedule's keys name the map's waves in rising order, and it leaves
//   the map's env or darkens (a Sundown `dark` > 0; A2M6 stays on `act2.dusk`) at some point.
// - [dressing]: dressing over a revisit's `original` or `band` needs a revisit; a corner-to-corner
//   area lies on the map; no layer twice.
// - [clickable]: each `clickables` entry is a marker with a name; `setClickable` and the
//   `interacted` trigger name one ([script] also checks `wreckageCleared` and `cleared` markers
//   sit on wreckage, `cleared.byWave` names a later wave of the map, and `objectiveDone` names
//   another objective of the map).
// - [flag-gate], [bearers], [script-group], [jettison]: validateM7.ts (T700a): flag gates on
//   posts, dressing, and decor; bearer groups; script groups and `spawnWave`; jettison plates.
// - [choir], [song], [timers], and the finale's [script] parts: validateFinale.ts (T800a): the
//   choir and its Voices floor, the Leaving Song, secondary timers, phases, and the finale's
//   triggers and actions.
// Parts: this file (the map loop, feature guards, ranges, geometry), validateWaves.ts ([wave],
// [route-walk], [wave-tag], [fleeing-lead], [quiet-wave-reach]), validateThreats.ts (intel,
// counters, teach, novelty), validateScripts.ts ([script], [flag-variants]), and validateBuilds.ts
// (builds).
//
// Medals and conditions ([medals], [condition]) are validateMedals.ts's, run by validate.ts.
import {
  BLOCKER_HEALTH_FLOOR,
  BLOCKER_REACH_TILES,
  MAX_CAMPAIGN_GRID_SPAN,
  SALVAGE_MAX,
  SALVAGE_MIN,
} from './rules.ts';
import type { EnemyDef, GridPos, IdSpace, MapDef, RawContent, TowerFaction } from './types.ts';
import type { ValidationRules } from './validate.ts';
import { validateBuilds } from './validateBuilds.ts';
import { revocationCandidates, type RevocationWindow } from './validateRevocation.ts'; // T606
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
import { validateDarkness, validateEscort } from './validateEscort.ts';
import { validateScripts } from './validateScripts.ts';
import { validateM7Map } from './validateM7.ts';
import { validateFinaleMap } from './validateFinale.ts'; // T800a
import { TOWERS_AHEAD_OF_TASK } from './towers/index.ts';
import type { RangedTower } from './counterAnswers.ts';
import { emptyHistory, validateNovelty, validateThreats, type History } from './validateThreats.ts';
import { CAMPAIGN_PLAN_IDS } from './campaign.ts';
import { TOWER_ACCESS } from './upgrades/access.ts';
import {
  rangeAuras,
  towerReaches,
  validateQuietWaveReach,
  validateWaves,
  type AuraTower,
  type RangeAura,
  type TargetedTower,
  type TowerReach,
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
  const stockedAfter = (id: string): number => {
    const access: Readonly<Record<string, { availableAfter: string | null }>> = TOWER_ACCESS;
    const after = Object.hasOwn(access, id) ? (access[id]?.availableAfter ?? null) : null;
    return after === null ? -1 : planIndex(after);
  };
  // Stubs registered ahead of their task don't count yet (towers/index.ts TOWERS_AHEAD_OF_TASK).
  const live = Object.entries<TargetedTower & AuraTower>(raw.towers).filter(
    ([id]) => !TOWERS_AHEAD_OF_TASK.includes(id),
  );
  // [revocation] (T606): each campaign map's window, the latest earlier map whose cue revokes a
  // class (validateRevocation.ts).
  const factions = new Map<string, TowerFaction>(
    Object.values<{ id: string; faction: TowerFaction }>(raw.towers).map((t) => [t.id, t.faction]),
  );
  const factionOf = (t: string): TowerFaction | undefined => factions.get(t);
  const windows: (RevocationWindow | null)[] = [];
  let lastCue: RevocationWindow | null = null;
  for (const id of raw.campaign) {
    windows.push(lastCue);
    const def = maps.get(id);
    const classes = def === undefined ? null : revocationCandidates(def, factionOf);
    if (classes !== null) lastCue = { map: id, classes };
  }
  const ctx = {
    enemies,
    towers,
    factionOf,
    revocationWindow: (index: number): RevocationWindow | null => windows[index] ?? null,
    // Each tower's tier-3 reach and range aura, by when it's first stocked ([quiet-wave-reach]).
    towerReaches: towerReaches(live, stockedAfter),
    rangeAuras: rangeAuras(live, stockedAfter),
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
  /** Every tower's best tier-3 range per layer, with when it's first stocked ([quiet-wave-reach]). */
  readonly towerReaches: readonly TowerReach[];
  /** Every tower's best tier-3 range aura, with when it's first stocked ([quiet-wave-reach]). */
  readonly rangeAuras: readonly RangeAura[];
  /** A map's index in the campaign plan (−1: not a campaign map). */
  readonly campaignIndex: (map: string) => number;
  readonly towersWithSpecs: ReadonlySet<string>;
  /** A tower's faction (T606: the classes a `revokeTowerClass` could take). */
  readonly factionOf: (tower: string) => TowerFaction | undefined;
  /** The earlier cue whose revoked class campaign map `index` may lack ([revocation]; T606). */
  readonly revocationWindow: (index: number) => RevocationWindow | null;
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

  // Holdout is content (T600a's shapes) and simulated (T605); the Choir is content since T800a
  // ([choir]: validateFinale.ts) and refused by createSim until T804 (`map.choir`).
  validateAsset(issues, def, where);
  validateEscort(issues, def, where);
  validateDarkness(issues, def, where);
  validateCompanion(issues, ctx, def, where);
  validateAllies(issues, def, where);
  validateHoldout(issues, def, where);

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
  // The revisit layout rules (centred, the footprint unchanged, new pads only in the band, no
  // collisions) are compileRevisit.ts's, run as it composes the revisit.
  validateLighting(issues, def, where);
  validateDressing(issues, def, where);

  // Before validateNovelty adds this map's counters to the history.
  const introducesCounter =
    campaign !== null && def.requiredCounters.some((c) => !campaign.history.counters.has(c));
  if (grid !== null) validateGeometry(issues, def, grid, campaign !== null, where);
  validateWaves(issues, ctx, def, where);
  if (grid !== null) validateQuietWaveReach(issues, ctx, def, grid, where);
  validateThreats(issues, ctx, def, campaign?.history ?? emptyHistory(), where);
  if (campaign !== null) validateNovelty(issues, ctx, def, grid, campaign.history, where);
  validateScripts(issues, def, where);
  validateM7Map(issues, ctx.enemies, def, grid, where); // T700a: [flag-gate], [bearers], …
  validateFinaleMap(issues, def, where); // T800a: [choir], [song], [timers], the finale's [script]
  validateBuilds(issues, def, grid, ctx, campaign?.index ?? null, introducesCounter);
}

/**
 * [lighting]: the schedule's keys name waves of the map, in rising order (the light before wave
 * 1 is the map's `env`), and the schedule changes something: a key leaves the map's env or carries
 * a Sundown `dark` level above 0.
 */
function validateLighting(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const keys = def.lighting;
  if (keys === undefined) return;
  if (keys.length === 0) issues.add('lighting', `${where}.lighting`, 'has no keys (omit it)');
  let prev = { wave: 0, env: def.env };
  for (const [i, k] of keys.entries()) {
    const w = `${where}.lighting[${i}]`;
    if (!Number.isInteger(k.wave) || k.wave < 1 || k.wave > def.waves.length) {
      issues.add('lighting', w, `wave ${k.wave} is not a wave of this map`);
    } else if (k.wave <= prev.wave) {
      issues.add('lighting', w, `wave ${k.wave} is not after the key before (${prev.wave})`);
    }
    prev = k;
  }
  if (keys.length > 0 && keys.every((k) => k.env === def.env && (k.dark ?? 0) === 0)) {
    issues.add(
      'lighting',
      `${where}.lighting`,
      `never leaves the map's env '${def.env}' and never darkens`,
    );
  }
}

/**
 * [dressing]: a revisit's areas (`original`, `band`) need a revisit; a corner-to-corner area lies
 * on the map, `from` above and left of `to`; no layer twice.
 */
function validateDressing(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const seen = new Set<string>();
  const { cols, rows } = def.size;
  const on = ([c, r]: GridPos): boolean =>
    Number.isInteger(c) && Number.isInteger(r) && c >= 0 && r >= 0 && c < cols && r < rows;
  for (const [i, d] of (def.dressing ?? []).entries()) {
    const w = `${where}.dressing[${i}]`;
    const a = d.area;
    if (typeof a !== 'string') {
      if (!on(a.from) || !on(a.to) || a.from[0] > a.to[0] || a.from[1] > a.to[1]) {
        issues.add(
          'dressing',
          `${w}.area`,
          'runs from a tile to one below and right of it, on the map',
        );
      }
    } else if (a !== 'all' && def.revisitOf === undefined) {
      issues.add('dressing', w, `area '${a}' needs a revisit (revisitOf)`);
    }
    const key = `${d.kind}:${JSON.stringify(a)}`;
    if (seen.has(key)) issues.add('dressing', w, `${d.kind} over the same area twice`);
    seen.add(key);
  }
}

/** The distinct tiles bearer groups leave by (their `exit`, else the map's `safeExit`). */
function bearerHomes(def: MapDef<IdSpace>): number {
  const tiles = new Set<string>();
  for (const g of Object.values(def.refugees ?? {})) {
    if (g.kind !== 'bearer') continue;
    const exit = g.exit ?? def.safeExit;
    const at = exit === undefined ? undefined : def.markers?.[exit];
    if (at !== undefined) tiles.add(`${at[0]},${at[1]}`);
  }
  return tiles.size;
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
  const cored = def.objective === 'defend' || def.objective === 'protect';
  // A bearer group's exit is a door home of its own, on a core tile beside the map's core (A3M5's
  // west edge; T700a), so it isn't counted.
  const homes = bearerHomes(def);
  if ((cored || def.objective === 'escort' || def.objective === 'choir') && grid.count('C') - homes !== 1) {
    issues.add(
      'core',
      `${where}.tiles`,
      `a Defend, Protect, Escort, or Choir map has exactly one core 'C' besides its bearers' doors (found ${grid.count('C') - homes})`,
    );
  }
  if (def.objective === 'holdout' && grid.count('C') < 1) {
    issues.add('core', `${where}.tiles`, "a Holdout map has at least one core 'C' (its doors)");
  }
  const exits = new Set<string>([
    ...(def.safeExit === undefined ? [] : [def.safeExit]),
    ...Object.values(def.refugees ?? {}).flatMap((g) => (g.exit === undefined ? [] : [g.exit])),
  ]);
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
    if (exits.has(name)) continue; // on a core ([escort])
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

/** The asset meter's label fits the HUD's status panel beside its number (ui/hud/AssetMeter.tsx). */
const ASSET_NAME_MAX_CHARS = 10;

/** [asset]: a Protect map has an asset and only it does; its meter is a whole number ≥ 1. */
function validateAsset(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const a = def.asset;
  if ((a !== undefined) !== (def.objective === 'protect')) {
    issues.add('asset', `${where}.asset`, "goes with objective 'protect' (and only with it)");
  }
  if (a === undefined) return;
  if (a.name.trim() === '' || a.name.length > ASSET_NAME_MAX_CHARS) {
    issues.add(
      'asset',
      `${where}.asset.name`,
      `names the meter in 1–${ASSET_NAME_MAX_CHARS} characters`,
    );
  }
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
    const b = a.block;
    if (b === undefined) continue;
    const post = def.markers?.[a.post];
    if (post !== undefined && !nearGroundRoute(def, post)) {
      bad(`post '${a.post}' is more than ${BLOCKER_REACH_TILES} tile from every ground route`);
    }
    if (!isPositiveInt(b.capacity)) bad('block.capacity must be a whole number ≥ 1');
    let last = 0;
    for (const [k, key] of b.health.entries()) {
      if (!isPositiveInt(key.wave) || key.wave > def.waves.length || key.wave <= last) {
        bad(`block.health[${k}].wave ${key.wave} must name a wave of the map, in rising order`);
      }
      last = key.wave;
      if (!(key.pct >= BLOCKER_HEALTH_FLOOR && key.pct <= 1)) {
        bad(`block.health[${k}].pct ${key.pct} must be in [${BLOCKER_HEALTH_FLOOR}, 1]`);
      }
    }
  }
}

/** Whether a ground route (a path or rift lane) passes within BLOCKER_REACH_TILES of `pos`. */
function nearGroundRoute(def: MapDef<IdSpace>, pos: GridPos): boolean {
  const reachSq = BLOCKER_REACH_TILES * BLOCKER_REACH_TILES + 1e-9;
  const routes = [...def.paths, ...(def.riftLanes ?? [])];
  for (const r of routes) {
    for (let i = 0; i < r.tiles.length; i++) {
      const a = r.tiles[i]!; // i < length
      const b = r.tiles[i + 1] ?? a;
      if (segmentDistSq(pos, a, b) <= reachSq) return true;
    }
  }
  return false;
}

/** Squared distance from tile `p`'s centre to the segment between tiles `a` and `b`'s centres. */
function segmentDistSq(p: GridPos, a: GridPos, b: GridPos): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t =
    len === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len));
  const x = a[0] + t * dx - p[0];
  const y = a[1] + t * dy - p[1];
  return x * x + y * y;
}

/** [holdout] (T605b): a Holdout forces an input and ends the map by script (see the header). */
function validateHoldout(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  if (def.objective !== 'holdout') return;
  const actions = (def.events ?? []).flatMap((e) => e.actions);
  if (!actions.some((a) => 'forceInput' in a)) {
    issues.add('holdout', `${where}.events`, 'a Holdout needs an event with a `forceInput` action');
  }
  if (!actions.some((a) => 'endMap' in a)) {
    issues.add('holdout', `${where}.events`, 'a Holdout needs an event with an `endMap` action');
  }
}
