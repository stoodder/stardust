import { describe, expect, it } from 'vitest';
import type { KnownIds, SaveData } from './saveData.ts';
import { LIVE_KNOWN_IDS, createNewSave } from './saveData.ts';
import { MAX_ERRORS, isPlainRecord, validateEnvelope, validateSave } from './validate.ts';

const DELETE = Symbol('delete');

/**
 * A JSON copy of a new save (untyped, as an import would deliver it) with the field at a dotted
 * path set to `value`, or removed with DELETE.
 */
function variant(path: string, value: unknown): unknown {
  const root: unknown = JSON.parse(JSON.stringify(createNewSave()));
  const keys = path.split('.');
  const last = keys.pop() ?? '';
  let obj = root;
  for (const key of keys) {
    if (!isPlainRecord(obj)) throw new Error(`no object at ${key}`);
    obj = obj[key];
  }
  if (!isPlainRecord(obj)) throw new Error(`no object at ${path}`);
  if (value === DELETE) Reflect.deleteProperty(obj, last);
  else obj[last] = value;
  return root;
}

function errorsOf(x: unknown, known: KnownIds = LIVE_KNOWN_IDS): string[] {
  const r = validateSave(x, known);
  return r.ok ? [] : r.errors;
}

function envelopeErrors(x: unknown): string {
  const r = validateEnvelope(x, 1);
  return r.ok ? '' : r.errors.join('\n');
}

const MAP = 'campaign.maps.a1_m01';
const won = (medals: unknown, extra: object = {}): object => ({
  completed: true,
  medals,
  bestMeter: 0,
  ...extra,
});

describe('validateSave', () => {
  it('accepts a new save and returns a fresh, equal copy', () => {
    const save = createNewSave();
    const r = validateSave(save);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual(save);
    expect(r.value).not.toBe(save);
    expect(r.value.unlocks.towers).not.toBe(save.unlocks.towers);
  });

  it('grants Rivet, Thumper, and Orbital Strike to a new save', () => {
    const save = createNewSave();
    expect(save.profile).toBeNull();
    expect(save.unlocks.towers).toEqual(['rivet', 'thumper']);
    expect(save.unlocks.abilities).toEqual(['orbital_strike']);
    expect(save.currencies).toEqual({ stardust: 0, intel: 0 });
    expect(createNewSave()).not.toBe(createNewSave());
  });

  it('rejects non-objects at the root', () => {
    for (const x of [null, [], 'save', 5, true, undefined]) {
      expect(errorsOf(x).join()).toMatch(/^data: expected an object/);
    }
  });

  // [expected error text, field path, bad value]: every field, wrong type or out-of-range value.
  const cases: [string, string, unknown][] = [
    ['data: missing field "stats"', 'stats', DELETE],
    ['data: unknown field "cheat"', 'cheat', 1],
    ['data.profile', 'profile', { name: 'Jo' }],
    ['data.campaign: expected an object', 'campaign', []],
    ['data.campaign.maps: expected an object', 'campaign.maps', []],
    ['data.campaign.maps: unknown map id', 'campaign.maps.a9_m99', won([])],
    ['data.campaign.maps.a1_m01: expected an object', MAP, 'won'],
    ['data.campaign.maps.a1_m01.completed', MAP, won([], { completed: 'yes' })],
    ['data.campaign.maps.a1_m01.medals: expected a list', MAP, won('victory')],
    ['data.campaign.maps.a1_m01.medals[0]', MAP, won([1])],
    ['duplicate id "victory"', MAP, won(['victory', 'victory'])],
    ['expected at most 3 entries', MAP, won(['a', 'b', 'c', 'd'])],
    ['medals need a win', MAP, won(['victory'], { completed: false })],
    ['data.campaign.maps.a1_m01.bestMeter', MAP, won([], { bestMeter: -1 })],
    ['data.campaign.maps.a1_m01: missing field "bestMeter"', MAP, { completed: true, medals: [] }],
    ['data.currencies.stardust', 'currencies.stardust', -1],
    ['data.currencies.stardust', 'currencies.stardust', 1.5],
    ['data.currencies.stardust', 'currencies.stardust', '100'],
    ['data.currencies.stardust', 'currencies.stardust', 1e12],
    ['data.currencies.intel', 'currencies.intel', null],
    ['data.unlocks.towers: expected a list', 'unlocks.towers', 'rivet'],
    ['data.unlocks.towers[2]: unknown id', 'unlocks.towers', ['rivet', 'thumper', 'death_ray']],
    ['data.unlocks.towers[2]: duplicate id', 'unlocks.towers', ['rivet', 'thumper', 'rivet']],
    ['data.unlocks.specs: "sprinkler" is not in', 'unlocks.specs', ['sprinkler']],
    ['data.unlocks.revokedTowers: "sprinkler"', 'unlocks.revokedTowers', ['sprinkler']],
    ['data.unlocks.jailbroken: "sprinkler"', 'unlocks.jailbroken', ['sprinkler']],
    ['data.unlocks.abilities[0]: unknown id', 'unlocks.abilities', ['nuke']],
    ['data.unlocks.revokedAbilities[0]: unknown id', 'unlocks.revokedAbilities', ['nuke']],
    [
      'data.unlocks.revokedAbilities: "orbital_strike" is not in',
      'unlocks',
      { ...createNewSave().unlocks, abilities: [], revokedAbilities: ['orbital_strike'] },
    ],
    ['data.unlocks: missing field "jailbroken"', 'unlocks.jailbroken', DELETE],
    ['data.upgrades: unknown upgrade id', 'upgrades', { free_money: 1 }],
    ['data.upgrades: expected an object', 'upgrades', []],
    ['data.unlocks.protocols[0]: unknown id', 'unlocks.protocols', ['god_mode']],
    ['data.unlocks: missing field "protocols"', 'unlocks.protocols', DELETE],
    ['data.story.flags: unknown story flag', 'story.flags', { god_mode: true }],
    ['data.story.flags.door_choice', 'story.flags', { door_choice: {} }],
    ['data.story.flags.door_choice', 'story.flags', { door_choice: 'Not An Id!' }],
    ['data.story.flags.door_choice', 'story.flags', { door_choice: 1.5 }],
    ['data.story.seen[0]', 'story.seen', [5]],
    ['data.story.seen[0]: unknown id', 'story.seen', ['Bad Id']],
    ['data.story.memosRead: expected a list', 'story.memosRead', {}],
    ['data.story.memosDelivered[0]', 'story.memosDelivered', [null]],
    ['data.story.codex.nibbler: expected at least one', 'story.codex', { nibbler: [] }],
    ['data.story.codex.nibbler[0]: unknown id', 'story.codex', { nibbler: ['bogus'] }],
    ['data.story.codex: unknown id', 'story.codex', { 'Bad Key': ['original'] }],
    ['data.story.bricksTagIndex', 'story.bricksTagIndex', -1],
    ['data.story.memorialTower: unknown id', 'story.memorialTower', 'death_ray'],
    ['data.story.granted: expected a list', 'story.granted', 'q3_bonus'],
    ['data.stats.runs', 'stats.runs', -1],
    ['data.stats: missing field "pestsProcessed"', 'stats.pestsProcessed', DELETE],
    ['data.stats.pestsProcessed', 'stats.pestsProcessed', 2 ** 60],
    ['data: missing field "settings"', 'settings', DELETE],
    ['data.settings.difficulty: unknown id', 'settings.difficulty', 'normal'],
    ['data.settings: unknown field "devUnlocks"', 'settings.devUnlocks', ['shop']],
    ['data.currencies: expected a plain object', 'currencies', new Map()],
  ];

  it.each(cases)('rejects %s', (expected, path, value) => {
    const errors = errorsOf(variant(path, value));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join('\n')).toContain(expected);
  });

  it('rejects __proto__ and other prototype keys from parsed JSON', () => {
    const base = JSON.stringify(createNewSave());
    const withProto = (path: string): unknown =>
      JSON.parse(base.replace(`"${path}":{}`, `"${path}":{"__proto__":{"x":1}}`));
    expect(errorsOf(withProto('maps')).join()).toContain('unknown map id "__proto__"');
    expect(errorsOf(withProto('upgrades')).join()).toContain('unknown upgrade id "__proto__"');
    expect(errorsOf(withProto('flags')).join()).toContain('unknown story flag "__proto__"');
    expect(errorsOf(withProto('codex')).join()).toContain('unknown id "__proto__"');
    expect(Reflect.get({}, 'x')).toBeUndefined();
  });

  it('checks upgrade ranks against the catalog it is given', () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- UpgradeId is never until T204a, so the test brings its own catalog
    const known = { ...LIVE_KNOWN_IDS, upgrades: ['mk2'] } as unknown as KnownIds;
    expect(validateSave(variant('upgrades', { mk2: 1 }), known).ok).toBe(true);
    expect(errorsOf(variant('upgrades', { mk2: 0 }), known).join()).toContain('data.upgrades.mk2');
    expect(errorsOf(variant('upgrades', { mk2: 11 }), known).join()).toContain('data.upgrades.mk2');
  });

  it('accepts every documented field filled in', () => {
    const save: SaveData = createNewSave();
    save.campaign.maps.a1_m01 = { completed: true, medals: ['victory', 'teamwork'], bestMeter: 20 };
    save.unlocks.towers.push('sprinkler');
    save.unlocks.specs = ['rivet'];
    save.unlocks.revokedTowers = ['thumper'];
    save.unlocks.jailbroken = ['rivet'];
    save.unlocks.revokedAbilities = ['orbital_strike'];
    save.story = {
      flags: { door_choice: 'warren', spared_quiet_wave: true, quill_choice: 2 },
      seen: ['a1_m01_briefing'],
      memosRead: ['welcome'],
      memosDelivered: ['welcome', 'q3_bonus'],
      codex: { nibbler: ['original', 'annotated'] },
      bricksTagIndex: 3,
      memorialTower: 'rivet',
      granted: ['q3_bonus'],
    };
    const r = validateSave(save);
    expect(r).toEqual({ ok: true, value: save });
  });

  it('caps the number of errors it reports', () => {
    const many = variant(
      'story.seen',
      Array.from({ length: 100 }, () => 'Bad'),
    );
    expect(errorsOf(many)).toHaveLength(MAX_ERRORS);
  });
});

describe('validateEnvelope', () => {
  it('checks the version, savedAt, and envelope keys', () => {
    const data = createNewSave();
    expect(validateEnvelope({ v: 1, savedAt: 5, data }, 1).ok).toBe(true);
    expect(envelopeErrors({ v: 2, savedAt: 5, data })).toContain('save.v: expected version 1');
    expect(envelopeErrors({ v: 1, savedAt: -5, data })).toContain('save.savedAt');
    expect(envelopeErrors({ v: 1, savedAt: 'today', data })).toContain('save.savedAt');
    expect(envelopeErrors({ v: 1, savedAt: 5, data, extra: true })).toContain(
      'unknown field "extra"',
    );
    expect(envelopeErrors({ v: 1, savedAt: 5 })).toContain('missing field "data"');
  });
});
