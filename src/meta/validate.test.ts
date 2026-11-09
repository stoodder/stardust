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

/** A valid profile. */
const PROFILE = { name: "Jo O'Neil-Park", pronouns: 'they', callsign: 'sprout' };

/** A valid preset for a new save. */
const PRESET = { towers: ['thumper', 'rivet'], ability: 'orbital_strike' };

/** A new save owning `owned` protocols, with `loadouts` fields replaced. */
function withProtocols(loadouts: object, owned: string[] = ['head_start', 'specialist']): unknown {
  const save: unknown = variant('unlocks.protocols', owned);
  if (!isPlainRecord(save) || !isPlainRecord(save['loadouts'])) throw new Error('shape');
  Object.assign(save['loadouts'], loadouts);
  return save;
}

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
    ['data.profile: missing field "pronouns"', 'profile', { name: 'Jo' }],
    ['data.profile: expected an object', 'profile', 'Jo'],
    ['data.profile.name: expected 1–16', 'profile', { ...PROFILE, name: '' }],
    ['data.profile.name: expected 1–16', 'profile', { ...PROFILE, name: 'A'.repeat(17) }],
    ['data.profile.name: expected 1–16', 'profile', { ...PROFILE, name: 'Jo<script>' }],
    ['data.profile.name: expected 1–16', 'profile', { ...PROFILE, name: ' Jo' }],
    ['data.profile.name: expected 1–16', 'profile', { ...PROFILE, name: 7 }],
    ['data.profile.pronouns: unknown id', 'profile', { ...PROFILE, pronouns: 'xe' }],
    ['data.profile.callsign: unknown id', 'profile', { ...PROFILE, callsign: 'ace' }],
    [
      'data.profile: unknown field "arrivalReason"',
      'profile',
      { ...PROFILE, arrivalReason: 'bonus' },
    ],
    ['data.campaign: missing field "seenEnemies"', 'campaign.seenEnemies', DELETE],
    ['data.campaign.seenEnemies[0]: unknown id', 'campaign.seenEnemies', ['dragon']],
    ['data.campaign.seenEnemies[1]: duplicate id', 'campaign.seenEnemies', ['nibbler', 'nibbler']],
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
    // T218: each flag holds one of its own declared values.
    ['data.story.flags.door_choice: expected one of', 'story.flags', { door_choice: 'garage' }],
    ['data.story.flags.door_choice: expected one of', 'story.flags', { door_choice: true }],
    ['data.story.flags.spared_quiet_wave', 'story.flags', { spared_quiet_wave: 'yes' }],
    ['data.story.flags.spared_quiet_wave', 'story.flags', { spared_quiet_wave: 1 }],
    ['data.story.flags.arrival_reason', 'story.flags', { arrival_reason: 'adventure' }],
    ['data.story.flags.stardust_choice', 'story.flags', { stardust_choice: 'convoy' }],
    ['data.story.memosRead: "welcome" is not in', 'story.memosRead', ['welcome']],
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
    ['data: missing field "loadouts"', 'loadouts', DELETE],
    ['data.loadouts.byMap: unknown map id', 'loadouts.byMap', { a9_m99: PRESET }],
    [
      'data.loadouts.last.towers: expected at most 4',
      'loadouts.last',
      { towers: ['rivet', 'thumper', 'sprinkler', 'rivet', 'thumper'], ability: null },
    ],
    [
      'data.loadouts.last.towers[1]: duplicate id',
      'loadouts.last',
      { towers: ['rivet', 'rivet'], ability: null },
    ],
    [
      'data.loadouts.last.towers: expected at least one tower',
      'loadouts.last',
      { towers: [], ability: null },
    ],
    [
      'data.loadouts.byMap.a1_m01.towers: "sprinkler" is not in unlocks.towers',
      'loadouts.byMap',
      { a1_m01: { towers: ['sprinkler'], ability: null } },
    ],
    [
      'data.loadouts.last.ability: "suppressing_fire" is not in unlocks.abilities',
      'loadouts.last',
      { towers: ['rivet'], ability: 'suppressing_fire' },
    ],
    [
      'data.loadouts.last: unknown field "protocols"',
      'loadouts.last',
      { ...PRESET, protocols: [] },
    ],
    ['data.loadouts: missing field "protocols"', 'loadouts.protocols', DELETE],
    ['data.loadouts.protocols[0]: unknown id', 'loadouts.protocols', ['god_mode']],
    [
      'data.loadouts.protocols: "head_start" is not in unlocks.protocols',
      'loadouts.protocols',
      ['head_start'],
    ],
    ['data.loadouts.protocolPicks: expected an object', 'loadouts.protocolPicks', []],
    [
      'a pick for "specialist", which isn\'t equipped',
      'loadouts.protocolPicks',
      { specialist: 'rivet' },
    ],
    ['data: missing field "seenHints"', 'seenHints', DELETE],
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
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test brings its own catalog ids
    const known = { ...LIVE_KNOWN_IDS, upgradeRanks: { mk2: 1, tune: 3 } } as unknown as KnownIds;
    expect(validateSave(variant('upgrades', { mk2: 1, tune: 3 }), known).ok).toBe(true);
    expect(errorsOf(variant('upgrades', { mk2: 0 }), known).join()).toContain('data.upgrades.mk2');
    expect(errorsOf(variant('upgrades', { mk2: 11 }), known).join()).toContain('data.upgrades.mk2');
  });

  it("refuses a rank past the item's own rank count (C1: it would crash every battle start)", () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test brings its own catalog ids
    const known = { ...LIVE_KNOWN_IDS, upgradeRanks: { mk2: 1, tune: 3 } } as unknown as KnownIds;
    expect(errorsOf(variant('upgrades', { mk2: 2 }), known)).toEqual([
      'data.upgrades.mk2: expected an integer in [1, 1], got 2',
    ]);
    expect(errorsOf(variant('upgrades', { tune: 4 }), known).join()).toContain('[1, 3], got 4');
    // The live catalog: every item's top rank is valid, one past it is not.
    for (const [id, ranks] of Object.entries(LIVE_KNOWN_IDS.upgradeRanks)) {
      expect(validateSave(variant('upgrades', { [id]: ranks })).ok, id).toBe(true);
      expect(validateSave(variant('upgrades', { [id]: (ranks ?? 0) + 1 })).ok, id).toBe(false);
    }
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
      flags: {
        door_choice: 'warren',
        spared_quiet_wave: true,
        quill_choice: 'keep',
        arrival_reason: 'lettuce',
      },
      seen: ['a1_m01_briefing'],
      memosRead: ['welcome'],
      memosDelivered: ['welcome', 'q3_bonus'],
      codex: { nibbler: ['original', 'annotated'] },
      bricksTagIndex: 3,
      memorialTower: 'rivet',
      granted: ['q3_bonus'],
    };
    save.profile = { name: 'Jo', pronouns: 'she', callsign: 'thorn' };
    save.campaign.seenEnemies = ['nibbler', 'zoomer'];
    save.unlocks.protocols = ['head_start', 'specialist'];
    save.loadouts = {
      last: { towers: ['sprinkler', 'rivet'], ability: null },
      byMap: { a1_m01: { towers: ['thumper', 'rivet', 'sprinkler'], ability: 'orbital_strike' } },
      protocols: ['specialist'],
      protocolPicks: { specialist: 'thumper' },
    };
    save.seenHints = ['upgrade'];
    const r = validateSave(save);
    expect(r).toEqual({ ok: true, value: save });
  });

  describe('equipped Field Protocols (the rules metaModifiers refuses)', () => {
    it('accepts protocols up to the slots, with a pick for Specialist', () => {
      const ok = withProtocols({
        protocols: ['specialist'],
        protocolPicks: { specialist: 'rivet' },
      });
      expect(errorsOf(ok)).toEqual([]);
    });

    it('refuses more protocols than slots', () => {
      const two = withProtocols({
        protocols: ['head_start', 'specialist'],
        protocolPicks: { specialist: 'rivet' },
      });
      expect(errorsOf(two).join()).toContain('2 protocols equipped, but only 1 slots');
      const slotted = withProtocols({
        protocols: ['head_start', 'specialist'],
        protocolPicks: { specialist: 'rivet' },
      });
      if (!isPlainRecord(slotted)) throw new Error('shape');
      slotted['upgrades'] = { protocol_slots: 1 };
      expect(errorsOf(slotted)).toEqual([]);
    });

    it('refuses Specialist without a pick, a pick for a protocol that takes none, and an unowned pick', () => {
      expect(errorsOf(withProtocols({ protocols: ['specialist'] })).join()).toContain(
        'protocol "specialist" is equipped with no tower pick',
      );
      expect(
        errorsOf(
          withProtocols({ protocols: ['head_start'], protocolPicks: { head_start: 'rivet' } }),
        ).join(),
      ).toContain('protocol "head_start" takes no pick');
      expect(
        errorsOf(
          withProtocols({ protocols: ['specialist'], protocolPicks: { specialist: 'sprinkler' } }),
        ).join(),
      ).toContain('"sprinkler" is not in unlocks.towers');
    });

    it('refuses a protocol equipped twice', () => {
      expect(errorsOf(withProtocols({ protocols: ['head_start', 'head_start'] })).join()).toContain(
        'duplicate id "head_start"',
      );
    });
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
