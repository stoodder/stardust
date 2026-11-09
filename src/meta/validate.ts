// The strict schema check for SaveData. Saves are untrusted input (a pasted code, a hand-edited
// localStorage value), so validation never trusts a field: every key must be known, every id must
// exist in the live registries, every number must be a bounded integer, and nothing outside the
// schema survives. On success it returns a freshly built copy, so the caller never holds the
// parsed object (no extra keys, no shared references, no prototype tricks).
import type { FlagValue, MapId } from '../content/types.ts';
import type { KnownIds, MapRecord, SaveData, SaveEnvelope, StoryFlagId } from './saveData.ts';
import { CODEX_VERSIONS, DIFFICULTIES, LIVE_KNOWN_IDS } from './saveData.ts';

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/** Validation stops collecting after this many errors. */
export const MAX_ERRORS = 20;
/** Bounds that no legitimate save comes near; they keep hostile values out of the game. */
export const SAVE_LIMITS = {
  currency: 1_000_000_000,
  count: Number.MAX_SAFE_INTEGER,
  meter: 1_000_000,
  medalsPerMap: 3,
  upgradeRank: 10,
  /** Longest list of free-form ids (scenes, memos, codex entries, grants). */
  idList: 1024,
  bricksTagIndex: 10_000,
} as const;

/** Ids with no registry yet (scenes, memos, codex entries, grants, medals, flag values). */
const FREE_ID = /^[a-z][a-z0-9_]{0,47}$/;

/** True for a plain object (from JSON.parse or a literal): not null, not a list, not a class. */
export function isPlainRecord(x: unknown): x is Record<string, unknown> {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const proto: unknown = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

/** Narrows `x` to a member of `list`. */
function isMember<T extends string>(list: readonly T[], x: string): x is T {
  const wide: readonly string[] = list;
  return wide.includes(x);
}

class Checker {
  readonly errors: string[] = [];

  fail(path: string, message: string): void {
    if (this.errors.length < MAX_ERRORS) this.errors.push(`${path}: ${message}`);
  }

  /** Checks `x` is a plain object with exactly `keys`; returns it, or null after reporting. */
  object(x: unknown, path: string, keys: readonly string[]): Record<string, unknown> | null {
    const obj = this.record(x, path);
    if (obj === null) return null;
    for (const key of keys) {
      if (!Object.hasOwn(obj, key)) this.fail(path, `missing field "${key}"`);
    }
    for (const key of Object.keys(obj)) {
      if (!keys.includes(key)) this.fail(path, `unknown field ${JSON.stringify(key.slice(0, 64))}`);
    }
    return obj;
  }

  /** Checks `x` is a plain object (any keys); returns it, or null after reporting. */
  record(x: unknown, path: string): Record<string, unknown> | null {
    if (isPlainRecord(x)) return x;
    const isObject = typeof x === 'object' && x !== null && !Array.isArray(x);
    this.fail(
      path,
      isObject ? 'expected a plain object' : `expected an object, got ${describe(x)}`,
    );
    return null;
  }

  int(x: unknown, path: string, min: number, max: number): number {
    if (typeof x !== 'number' || !Number.isSafeInteger(x) || x < min || x > max) {
      this.fail(path, `expected an integer in [${min}, ${max}], got ${describe(x)}`);
      return min;
    }
    return x;
  }

  bool(x: unknown, path: string): boolean {
    if (typeof x !== 'boolean') {
      this.fail(path, `expected a boolean, got ${describe(x)}`);
      return false;
    }
    return x;
  }

  /** An id from `known`. */
  id<T extends string>(x: unknown, path: string, known: readonly T[]): T | null {
    if (typeof x !== 'string') {
      this.fail(path, `expected an id string, got ${describe(x)}`);
      return null;
    }
    if (!isMember(known, x)) {
      this.fail(path, `unknown id ${JSON.stringify(x.slice(0, 64))}`);
      return null;
    }
    return x;
  }

  /** A free-form id (no registry yet): lowercase snake_case, starting with a letter. */
  freeId(x: unknown, path: string): string | null {
    if (typeof x !== 'string') {
      this.fail(path, `expected an id string, got ${describe(x)}`);
      return null;
    }
    if (!FREE_ID.test(x)) {
      this.fail(path, `unknown id ${JSON.stringify(x.slice(0, 64))}`);
      return null;
    }
    return x;
  }

  /** A list of distinct ids from `known` (or free-form ids, when `known` is null). */
  ids<T extends string>(x: unknown, path: string, known: readonly T[], max?: number): T[];
  ids(x: unknown, path: string, known: null, max: number): string[];
  ids(
    x: unknown,
    path: string,
    known: readonly string[] | null,
    max = known?.length ?? 0,
  ): string[] {
    if (!Array.isArray(x)) {
      this.fail(path, `expected a list, got ${describe(x)}`);
      return [];
    }
    if (x.length > max) {
      this.fail(path, `expected at most ${max} entries, got ${x.length}`);
      return [];
    }
    const out: string[] = [];
    x.forEach((item: unknown, i) => {
      const at = `${path}[${i}]`;
      const id = known === null ? this.freeId(item, at) : this.id(item, at, known);
      if (id === null) return;
      if (out.includes(id)) this.fail(at, `duplicate id "${id}"`);
      else out.push(id);
    });
    return out;
  }

  subset(sub: readonly string[], of: readonly string[], path: string, ofPath: string): void {
    for (const id of sub) {
      if (!of.includes(id)) this.fail(path, `"${id}" is not in ${ofPath}`);
    }
  }
}

function describe(x: unknown): string {
  if (x === null) return 'null';
  if (Array.isArray(x)) return 'a list';
  if (typeof x === 'string') return `the string ${JSON.stringify(x.slice(0, 32))}`;
  if (typeof x === 'number') return String(x);
  return typeof x;
}

/**
 * Validates untrusted SaveData of the current version against the known ids. Returns a fresh,
 * normalized copy, or every error found (up to MAX_ERRORS), each prefixed with its field path.
 */
export function validateSave(x: unknown, known: KnownIds = LIVE_KNOWN_IDS): Validated<SaveData> {
  const c = new Checker();
  const data = checkSave(c, x, 'data', known);
  return data === null || c.errors.length > 0
    ? { ok: false, errors: c.errors }
    : { ok: true, value: data };
}

/** Validates an envelope `{ v, savedAt, data }` whose data is already at the current version. */
export function validateEnvelope(
  x: unknown,
  version: number,
  known: KnownIds = LIVE_KNOWN_IDS,
): Validated<SaveEnvelope> {
  const c = new Checker();
  const env = c.object(x, 'save', ['v', 'savedAt', 'data']);
  if (env === null) return { ok: false, errors: c.errors };
  if (env['v'] !== version)
    c.fail('save.v', `expected version ${version}, got ${describe(env['v'])}`);
  const savedAt = c.int(env['savedAt'], 'save.savedAt', 0, Number.MAX_SAFE_INTEGER);
  const data = checkSave(c, env['data'], 'save.data', known);
  return data === null || c.errors.length > 0
    ? { ok: false, errors: c.errors }
    : { ok: true, value: { v: version, savedAt, data } };
}

function checkSave(c: Checker, x: unknown, path: string, known: KnownIds): SaveData | null {
  const root = c.object(x, path, [
    'profile',
    'campaign',
    'currencies',
    'unlocks',
    'upgrades',
    'story',
    'stats',
    'settings',
  ]);
  if (root === null) return null;
  if (root['profile'] !== null) {
    c.fail(
      `${path}.profile`,
      `expected null until character creation (T306), got ${describe(root['profile'])}`,
    );
  }
  const campaign = checkCampaign(c, root['campaign'], `${path}.campaign`, known);
  const currencies = checkCurrencies(c, root['currencies'], `${path}.currencies`);
  const unlocks = checkUnlocks(c, root['unlocks'], `${path}.unlocks`, known);
  const upgrades = checkUpgrades(c, root['upgrades'], `${path}.upgrades`, known);
  const story = checkStory(c, root['story'], `${path}.story`, known);
  const stats = checkStats(c, root['stats'], `${path}.stats`);
  const settings = checkSettings(c, root['settings'], `${path}.settings`);
  if (!campaign || !currencies || !unlocks || !upgrades || !story || !stats || !settings) {
    return null;
  }
  return { profile: null, campaign, currencies, unlocks, upgrades, story, stats, settings };
}

function checkCampaign(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['campaign'] | null {
  const campaign = c.object(x, path, ['maps']);
  if (campaign === null) return null;
  const maps = c.record(campaign['maps'], `${path}.maps`);
  if (maps === null) return null;
  const out: Partial<Record<MapId, MapRecord>> = {};
  for (const [mapId, raw] of Object.entries(maps)) {
    const mapPath = `${path}.maps.${mapId}`;
    if (!isMember(known.maps, mapId)) {
      c.fail(`${path}.maps`, `unknown map id ${JSON.stringify(mapId.slice(0, 64))}`);
      continue;
    }
    const rec = c.object(raw, mapPath, ['completed', 'medals', 'bestMeter']);
    if (rec === null) continue;
    const completed = c.bool(rec['completed'], `${mapPath}.completed`);
    const medals = c.ids(rec['medals'], `${mapPath}.medals`, null, SAVE_LIMITS.medalsPerMap);
    if (medals.length > 0 && !completed) {
      c.fail(`${mapPath}.medals`, 'medals need a win, but the map is not completed');
    }
    const bestMeter = c.int(rec['bestMeter'], `${mapPath}.bestMeter`, 0, SAVE_LIMITS.meter);
    out[mapId] = { completed, medals, bestMeter };
  }
  return { maps: out };
}

function checkCurrencies(c: Checker, x: unknown, path: string): SaveData['currencies'] | null {
  const cur = c.object(x, path, ['stardust', 'intel']);
  if (cur === null) return null;
  return {
    stardust: c.int(cur['stardust'], `${path}.stardust`, 0, SAVE_LIMITS.currency),
    intel: c.int(cur['intel'], `${path}.intel`, 0, SAVE_LIMITS.currency),
  };
}

function checkUnlocks(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['unlocks'] | null {
  const u = c.object(x, path, [
    'towers',
    'specs',
    'revokedTowers',
    'jailbroken',
    'abilities',
    'revokedAbilities',
    'protocols',
  ]);
  if (u === null) return null;
  const towers = c.ids(u['towers'], `${path}.towers`, known.towers);
  const specs = c.ids(u['specs'], `${path}.specs`, known.towers);
  const revokedTowers = c.ids(u['revokedTowers'], `${path}.revokedTowers`, known.towers);
  const jailbroken = c.ids(u['jailbroken'], `${path}.jailbroken`, known.towers);
  const abilities = c.ids(u['abilities'], `${path}.abilities`, known.abilities);
  const revokedAbilities = c.ids(
    u['revokedAbilities'],
    `${path}.revokedAbilities`,
    known.abilities,
  );
  const towersPath = `${path}.towers`;
  c.subset(specs, towers, `${path}.specs`, towersPath);
  c.subset(revokedTowers, towers, `${path}.revokedTowers`, towersPath);
  c.subset(jailbroken, towers, `${path}.jailbroken`, towersPath);
  c.subset(revokedAbilities, abilities, `${path}.revokedAbilities`, `${path}.abilities`);
  const protocols = c.ids(u['protocols'], `${path}.protocols`, known.protocols);
  return { towers, specs, revokedTowers, jailbroken, abilities, revokedAbilities, protocols };
}

function checkUpgrades(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['upgrades'] | null {
  const ups = c.record(x, path);
  if (ups === null) return null;
  // Keyed by string so this compiles while UpgradeId is never; every key is checked below.
  const out: Record<string, number> = {};
  for (const [id, rank] of Object.entries(ups)) {
    if (!isMember(known.upgrades, id)) {
      c.fail(path, `unknown upgrade id ${JSON.stringify(id.slice(0, 64))}`);
      continue;
    }
    out[id] = c.int(rank, `${path}.${id}`, 1, SAVE_LIMITS.upgradeRank);
  }
  return out;
}

function checkStory(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['story'] | null {
  const s = c.object(x, path, [
    'flags',
    'seen',
    'memosRead',
    'memosDelivered',
    'codex',
    'bricksTagIndex',
    'memorialTower',
    'granted',
  ]);
  if (s === null) return null;
  const flags = checkFlags(c, s['flags'], `${path}.flags`, known);
  const codex = checkCodex(c, s['codex'], `${path}.codex`);
  if (flags === null || codex === null) return null;
  const memorial = s['memorialTower'];
  const max = SAVE_LIMITS.idList;
  return {
    flags,
    seen: c.ids(s['seen'], `${path}.seen`, null, max),
    memosRead: c.ids(s['memosRead'], `${path}.memosRead`, null, max),
    memosDelivered: c.ids(s['memosDelivered'], `${path}.memosDelivered`, null, max),
    codex,
    bricksTagIndex: c.int(
      s['bricksTagIndex'],
      `${path}.bricksTagIndex`,
      0,
      SAVE_LIMITS.bricksTagIndex,
    ),
    memorialTower: memorial === null ? null : c.id(memorial, `${path}.memorialTower`, known.towers),
    granted: c.ids(s['granted'], `${path}.granted`, null, max),
  };
}

function checkFlags(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): SaveData['story']['flags'] | null {
  const flags = c.record(x, path);
  if (flags === null) return null;
  const out: Partial<Record<StoryFlagId, FlagValue>> = {};
  for (const [id, value] of Object.entries(flags)) {
    if (!isMember(known.storyFlags, id)) {
      c.fail(path, `unknown story flag ${JSON.stringify(id.slice(0, 64))}`);
      continue;
    }
    const valid =
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isSafeInteger(value)) ||
      (typeof value === 'string' && FREE_ID.test(value));
    if (valid) out[id] = value;
    else {
      c.fail(
        `${path}.${id}`,
        `expected a boolean, an integer, or an id string, got ${describe(value)}`,
      );
    }
  }
  return out;
}

function checkCodex(c: Checker, x: unknown, path: string): SaveData['story']['codex'] | null {
  const codex = c.record(x, path);
  if (codex === null) return null;
  const entries = Object.entries(codex);
  if (entries.length > SAVE_LIMITS.idList) {
    c.fail(path, `expected at most ${SAVE_LIMITS.idList} entries, got ${entries.length}`);
    return null;
  }
  const out: SaveData['story']['codex'] = {};
  for (const [id, list] of entries) {
    if (c.freeId(id, path) === null) continue;
    const versions = c.ids(list, `${path}.${id}`, CODEX_VERSIONS);
    if (Array.isArray(list) && list.length === 0) {
      c.fail(`${path}.${id}`, 'expected at least one version');
    }
    out[id] = versions;
  }
  return out;
}

function checkStats(c: Checker, x: unknown, path: string): SaveData['stats'] | null {
  const s = c.object(x, path, ['pestsProcessed', 'runs']);
  if (s === null) return null;
  return {
    pestsProcessed: c.int(s['pestsProcessed'], `${path}.pestsProcessed`, 0, SAVE_LIMITS.count),
    runs: c.int(s['runs'], `${path}.runs`, 0, SAVE_LIMITS.count),
  };
}

function checkSettings(c: Checker, x: unknown, path: string): SaveData['settings'] | null {
  const s = c.object(x, path, ['difficulty']);
  if (s === null) return null;
  const difficulty = c.id(s['difficulty'], `${path}.difficulty`, DIFFICULTIES);
  return difficulty === null ? null : { difficulty };
}
