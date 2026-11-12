// Validation of the save's optional endgame fields (meta-runtime.md § Validation; D154): the
// finale's persisted run (`pendingRun`), the veteran records (`veteran`), and the endless score
// table (`endless`). Each is absent until its feature first writes it, so an absent field stays
// absent and needs no SaveData bump. Saves are untrusted input: a persisted run's command log is
// checked command by command (shape, ids, bounds) so a hostile code can't replay into a crash.
import type { CompanionId, MapId, TargetPriority } from '../content/types.ts';
import type { Command, CommandLogEntry, CommandType } from '../sim/index.ts';
import type {
  EndlessScore,
  KnownIds,
  LoadoutPreset,
  PendingCheckpoint,
  PendingRun,
  SaveData,
  VeteranRecord,
} from './saveData.ts';
import { Checker, describe, isMember } from './saveChecker.ts';
import { VETERAN_MAX_PCT, VETERAN_MODIFIER_IDS } from './veteran.ts';

/** Bounds for the endgame fields (beside validate.ts's SAVE_LIMITS). */
export const ENDGAME_LIMITS = {
  /** A persisted run's logged commands (a 25-minute finale logs a few hundred). */
  pendingLog: 10_000,
  /** Endless's score table (D154: ten per save). */
  endlessScores: 10,
  /** The most waves an endless score records. */
  endlessWave: 100_000,
  /** A wave number a checkpoint names. */
  wave: 1_000,
  /** A grid coordinate a command names (maps are far smaller). */
  tile: 255,
} as const;

/**
 * The companions a persisted run or a loadout preset may carry (content/types.ts `CompanionId`).
 */
export const COMPANIONS = [
  'bricks',
  'quill',
  'zibzab',
  'vesthara',
  'bramble',
] as const satisfies readonly CompanionId[];
/** Targeting modes (content/types.ts `TargetPriority`). */
const TARGETING = ['first', 'last', 'strong', 'close'] as const satisfies readonly TargetPriority[];

/** Each command type's fields beside `type` (a new command type must be listed: compile error). */
const COMMAND_FIELDS: Readonly<
  Record<CommandType, { readonly keys: readonly string[]; readonly optional?: readonly string[] }>
> = {
  build: { keys: ['tile', 'tower'] },
  upgrade: { keys: ['towerUid'] },
  specialize: { keys: ['towerUid', 'spec'] },
  sell: { keys: ['towerUid'] },
  targeting: { keys: ['towerUid', 'mode'] },
  holdFire: { keys: ['target', 'on'] },
  spareRunners: { keys: ['target', 'on'] },
  clear: { keys: ['tile'] },
  interact: { keys: ['marker'] },
  ability: { keys: ['slot'], optional: ['target'] },
  callWave: { keys: [] },
  scriptInput: { keys: ['id'] },
};
const isCommandType = (k: string): k is CommandType => Object.hasOwn(COMMAND_FIELDS, k);
const COMMAND_TYPES: readonly CommandType[] = Object.keys(COMMAND_FIELDS).filter(isCommandType);

/** How validate.ts checks a loadout preset (passed in, so the two files don't import each other). */
export type PresetCheck = (x: unknown, path: string) => LoadoutPreset | null;

/** The endgame fields of a save, each kept absent when absent (or when it failed its check). */
export interface EndgameFields {
  pendingRun?: PendingRun;
  veteran?: Partial<Record<MapId, VeteranRecord>>;
  endless?: EndlessScore[];
}

/**
 * Checks the root's optional `pendingRun`, `veteran`, and `endless` (`root` the save's raw object,
 * `campaign` its checked records: a veteran record needs its map won).
 */
export function checkEndgame(
  c: Checker,
  root: Record<string, unknown>,
  path: string,
  known: KnownIds,
  campaign: SaveData['campaign'],
  checkPreset: PresetCheck,
): EndgameFields {
  const out: EndgameFields = {};
  if (root['pendingRun'] !== undefined) {
    const run = checkPendingRun(c, root['pendingRun'], `${path}.pendingRun`, known, checkPreset);
    if (run !== null) out.pendingRun = run;
  }
  if (root['veteran'] !== undefined) {
    const vet = checkVeteran(c, root['veteran'], `${path}.veteran`, known, campaign);
    if (vet !== null) out.veteran = vet;
  }
  if (root['endless'] !== undefined) {
    out.endless = checkEndless(c, root['endless'], `${path}.endless`);
  }
  return out;
}

function checkPendingRun(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
  checkPreset: PresetCheck,
): PendingRun | null {
  const r = c.object(
    x,
    path,
    ['map', 'seed', 'loadout', 'companion', 'checkpoint', 'log', 'killsBefore', 'configHash'],
    ['retriedFrom'],
  );
  if (r === null) return null;
  const map = c.id(r['map'], `${path}.map`, known.maps);
  const seed = c.int(r['seed'], `${path}.seed`, 0, 2 ** 32 - 1);
  const loadout = checkPreset(r['loadout'], `${path}.loadout`);
  const companion =
    r['companion'] === null ? null : c.id(r['companion'], `${path}.companion`, COMPANIONS);
  const checkpoint = checkCheckpoint(c, r['checkpoint'], `${path}.checkpoint`);
  const log = checkLog(c, r['log'], `${path}.log`, known);
  const killsBefore = c.int(r['killsBefore'], `${path}.killsBefore`, 0, Number.MAX_SAFE_INTEGER);
  const hash = r['configHash'];
  if (typeof hash !== 'string' || !/^[0-9a-f]{8}$/.test(hash)) {
    c.fail(`${path}.configHash`, `expected 8 lowercase hex digits, got ${describe(hash)}`);
  }
  if (checkpoint !== null && log !== null) {
    if (checkpoint.commandCount !== log.length) {
      c.fail(
        `${path}.checkpoint.commandCount`,
        `expected the log's length ${log.length}, got ${checkpoint.commandCount}`,
      );
    }
    const late = log.findIndex((e) => e.tick >= checkpoint.tick);
    if (late >= 0) c.fail(`${path}.log[${late}].tick`, 'logged at or after the checkpoint');
  }
  if (
    map === null ||
    loadout === null ||
    (r['companion'] !== null && companion === null) ||
    checkpoint === null ||
    log === null ||
    typeof hash !== 'string'
  ) {
    return null;
  }
  const run: PendingRun = {
    map,
    seed,
    loadout,
    companion,
    checkpoint,
    log,
    killsBefore,
    configHash: hash,
  };
  if (r['retriedFrom'] === undefined) return run;
  // A retry before it resumed from an earlier (or the same) checkpoint of the run.
  const retried = checkCheckpoint(c, r['retriedFrom'], `${path}.retriedFrom`);
  if (retried !== null && retried.tick > checkpoint.tick) {
    c.fail(`${path}.retriedFrom.tick`, 'after the checkpoint it leads to');
  }
  return retried === null ? null : { ...run, retriedFrom: retried };
}

function checkCheckpoint(c: Checker, x: unknown, path: string): PendingCheckpoint | null {
  const p = c.object(x, path, ['wave', 'tick', 'commandCount'], ['label']);
  if (p === null) return null;
  const out: PendingCheckpoint = {
    wave: c.int(p['wave'], `${path}.wave`, 0, ENDGAME_LIMITS.wave),
    tick: c.int(p['tick'], `${path}.tick`, 0, Number.MAX_SAFE_INTEGER),
    commandCount: c.int(p['commandCount'], `${path}.commandCount`, 0, ENDGAME_LIMITS.pendingLog),
  };
  if (p['label'] === undefined) return out;
  const label = c.freeId(p['label'], `${path}.label`);
  return label === null ? null : { label, ...out };
}

function checkLog(c: Checker, x: unknown, path: string, known: KnownIds): CommandLogEntry[] | null {
  if (!Array.isArray(x)) {
    c.fail(path, `expected a list, got ${describe(x)}`);
    return null;
  }
  if (x.length > ENDGAME_LIMITS.pendingLog) {
    c.fail(path, `expected at most ${ENDGAME_LIMITS.pendingLog} entries, got ${x.length}`);
    return null;
  }
  const out: CommandLogEntry[] = [];
  let ok = true;
  let last = 0;
  x.forEach((item: unknown, i) => {
    const at = `${path}[${i}]`;
    const e = c.object(item, at, ['tick', 'cmd']);
    if (e === null) {
      ok = false;
      return;
    }
    const tick = c.int(e['tick'], `${at}.tick`, 0, Number.MAX_SAFE_INTEGER);
    if (tick < last) c.fail(`${at}.tick`, `logged before the entry ahead of it (${last})`);
    last = Math.max(last, tick);
    const cmd = checkCommand(c, e['cmd'], `${at}.cmd`, known);
    if (cmd === null) ok = false;
    else out.push({ tick, cmd });
  });
  return ok ? out : null;
}

/** A grid tile `[col, row]`. */
function checkTile(c: Checker, x: unknown, path: string): readonly [number, number] | null {
  if (!Array.isArray(x) || x.length !== 2) {
    c.fail(path, `expected [col, row], got ${describe(x)}`);
    return null;
  }
  return [
    c.int(x[0], `${path}[0]`, 0, ENDGAME_LIMITS.tile),
    c.int(x[1], `${path}[1]`, 0, ENDGAME_LIMITS.tile),
  ];
}

/** A tower uid, or `'all'` (Hold Fire and the spare-runners filter). */
function checkTarget(c: Checker, x: unknown, path: string): number | 'all' {
  return x === 'all' ? 'all' : c.int(x, path, 0, Number.MAX_SAFE_INTEGER);
}

/** One logged command (sim/commands.ts `Command`), rebuilt fresh; null after reporting. */
export function checkCommand(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
): Command | null {
  const rec = c.record(x, path);
  if (rec === null) return null;
  const type = c.id(rec['type'], `${path}.type`, COMMAND_TYPES);
  if (type === null) return null;
  const fields = COMMAND_FIELDS[type];
  const f = c.object(x, path, ['type', ...fields.keys], fields.optional ?? []);
  if (f === null) return null;
  const errors = c.errors.length;
  const uid = (): number => c.int(f['towerUid'], `${path}.towerUid`, 0, Number.MAX_SAFE_INTEGER);
  let cmd: Command | null = null;
  switch (type) {
    case 'build': {
      const tile = checkTile(c, f['tile'], `${path}.tile`);
      const tower = c.id(f['tower'], `${path}.tower`, known.towers);
      if (tile !== null && tower !== null) cmd = { type, tile, tower };
      break;
    }
    case 'upgrade':
    case 'sell':
      cmd = { type, towerUid: uid() };
      break;
    case 'specialize': {
      const spec = c.id(f['spec'], `${path}.spec`, ['a', 'b'] as const);
      if (spec !== null) cmd = { type, towerUid: uid(), spec };
      break;
    }
    case 'targeting': {
      const mode = c.id(f['mode'], `${path}.mode`, TARGETING);
      if (mode !== null) cmd = { type, towerUid: uid(), mode };
      break;
    }
    case 'holdFire':
    case 'spareRunners':
      cmd = {
        type,
        target: checkTarget(c, f['target'], `${path}.target`),
        on: c.bool(f['on'], `${path}.on`),
      };
      break;
    case 'clear': {
      const tile = checkTile(c, f['tile'], `${path}.tile`);
      if (tile !== null) cmd = { type, tile };
      break;
    }
    case 'interact': {
      const marker = c.freeId(f['marker'], `${path}.marker`);
      if (marker !== null) cmd = { type, marker };
      break;
    }
    case 'ability': {
      const slot = c.int(f['slot'], `${path}.slot`, 1, 2) === 2 ? 2 : 1;
      if (f['target'] === undefined) cmd = { type, slot };
      else {
        const target = checkTile(c, f['target'], `${path}.target`);
        if (target !== null) cmd = { type, slot, target };
      }
      break;
    }
    case 'callWave':
      cmd = { type };
      break;
    case 'scriptInput': {
      const id = c.freeId(f['id'], `${path}.id`);
      if (id !== null) cmd = { type, id };
      break;
    }
  }
  return c.errors.length > errors ? null : cmd;
}

function checkVeteran(
  c: Checker,
  x: unknown,
  path: string,
  known: KnownIds,
  campaign: SaveData['campaign'],
): Partial<Record<MapId, VeteranRecord>> | null {
  const rec = c.record(x, path);
  if (rec === null) return null;
  const out: Partial<Record<MapId, VeteranRecord>> = {};
  for (const [mapId, raw] of Object.entries(rec)) {
    if (!isMember(known.maps, mapId)) {
      c.fail(path, `unknown map id ${JSON.stringify(mapId.slice(0, 64))}`);
      continue;
    }
    const at = `${path}.${mapId}`;
    const v = c.object(raw, at, ['mods', 'best']);
    if (v === null) continue;
    // Veteran modifiers unlock on a map once its Victory is earned (progression.md § 6).
    if (campaign.maps[mapId]?.completed !== true) c.fail(at, 'a veteran record needs the map won');
    const mods = c.ids(v['mods'], `${at}.mods`, VETERAN_MODIFIER_IDS);
    out[mapId] = { mods, best: c.int(v['best'], `${at}.best`, 0, VETERAN_MAX_PCT) };
  }
  return out;
}

function checkEndless(c: Checker, x: unknown, path: string): EndlessScore[] {
  if (!Array.isArray(x)) {
    c.fail(path, `expected a list, got ${describe(x)}`);
    return [];
  }
  if (x.length > ENDGAME_LIMITS.endlessScores) {
    c.fail(path, `expected at most ${ENDGAME_LIMITS.endlessScores} entries, got ${x.length}`);
    return [];
  }
  const out: EndlessScore[] = [];
  x.forEach((item: unknown, i) => {
    const at = `${path}[${i}]`;
    const s = c.object(item, at, ['seed', 'wave']);
    if (s === null) return;
    const seed = c.int(s['seed'], `${at}.seed`, 0, 2 ** 32 - 1);
    const wave = c.int(s['wave'], `${at}.wave`, 0, ENDGAME_LIMITS.endlessWave);
    if (out.some((o) => o.seed === seed)) c.fail(`${at}.seed`, `seed ${seed} is listed twice`);
    else out.push({ seed, wave });
  });
  return out;
}
