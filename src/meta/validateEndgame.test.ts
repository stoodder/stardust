// The save's optional endgame fields (T800b; D154): the finale's persisted run, veteran records,
// and endless scores validate, survive a code round trip, stay absent when absent, and refuse what
// a hostile code could slip in (a malformed command, a log past its checkpoint, a record on a map
// not won).
import { describe, expect, it } from 'vitest';
import { exportCode, importCode } from './codec.ts';
import { createNewSave, type PendingRun, type SaveData } from './saveData.ts';
import { validateSave } from './validate.ts';
import { ENDGAME_LIMITS } from './validateEndgame.ts';
import { VETERAN_MAX_PCT, VETERAN_MODIFIER_IDS, veteranBonusPct } from './veteran.ts';

/** A new save with A1M1 won (a map a veteran record may name). */
function base(): SaveData {
  const save = createNewSave();
  save.campaign.maps.a1_m01 = { completed: true, medals: ['victory'], bestMeter: 20 };
  return save;
}

/** A persisted run on A1M1 (the finale isn't registered yet; any known map validates). */
function pending(): PendingRun {
  return {
    map: 'a1_m01',
    seed: 4_000_000_000,
    loadout: { towers: ['rivet', 'thumper'], ability: 'orbital_strike' },
    companion: 'vesthara',
    checkpoint: { label: 'halls', wave: 19, tick: 900, commandCount: 6 },
    log: [
      { tick: 0, cmd: { type: 'build', tile: [3, 4], tower: 'rivet' } },
      { tick: 10, cmd: { type: 'callWave' } },
      { tick: 200, cmd: { type: 'upgrade', towerUid: 1 } },
      { tick: 300, cmd: { type: 'holdFire', target: 'all', on: true } },
      { tick: 400, cmd: { type: 'ability', slot: 1, target: [5, 5] } },
      { tick: 800, cmd: { type: 'scriptInput', id: 'whos_there' } },
    ],
    killsBefore: 0,
    configHash: '0a1b2c3d',
  };
}

function errors(x: unknown): string {
  const r = validateSave(x);
  return r.ok ? '' : r.errors.join('\n');
}

/** The errors of a save carrying `run` (any shape) as its pending run. */
const withRun = (run: unknown): string => errors({ ...base(), pendingRun: run });

/** `pending()` with log entry `i`'s command replaced by `cmd` (any shape). */
function cmdAt(i: number, cmd: unknown): unknown {
  const run = pending();
  return { ...run, log: run.log.map((e, j) => (j === i ? { ...e, cmd } : e)) };
}

/** `pending()` with log entry `i`'s tick replaced by `tick`. */
function tickAt(i: number, tick: number): unknown {
  const run = pending();
  return { ...run, log: run.log.map((e, j) => (j === i ? { ...e, tick } : e)) };
}

/** The errors of a save carrying `veteran` (any shape). */
const vet = (veteran: unknown): string => errors({ ...base(), veteran });
/** The errors of a save carrying `endless` (any shape). */
const end = (endless: unknown): string => errors({ ...base(), endless });

describe('the endgame save fields (optional, no SaveData bump)', () => {
  it('are absent from a new save and stay absent through validation', () => {
    const save = base();
    const r = validateSave(save);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value)).not.toContain('pendingRun');
    expect(Object.keys(r.value)).not.toContain('veteran');
    expect(Object.keys(r.value)).not.toContain('endless');
  });

  it('validate and survive an export code round trip when present', async () => {
    const save: SaveData = {
      ...base(),
      pendingRun: pending(),
      veteran: { a1_m01: { mods: ['glass_core', 'short_handed'], best: 80 } },
      endless: [
        { seed: 7, wave: 41 },
        { seed: 12345, wave: 18 },
      ],
    };
    expect(validateSave(save)).toEqual({ ok: true, value: save });
    expect(await importCode(await exportCode(save, 0))).toMatchObject({ ok: true, save });
    // A wave checkpoint has no label.
    const run = pending();
    const { label: _, ...wave } = run.checkpoint;
    expect(validateSave({ ...base(), pendingRun: { ...run, checkpoint: wave } }).ok).toBe(true);
  });

  describe('pendingRun', () => {
    const run = pending();
    it.each([
      ['an unknown map', { ...run, map: 'nowhere' }, 'pendingRun.map'],
      ['a seed past 32 bits', { ...run, seed: 2 ** 32 }, 'seed'],
      [
        'an unowned tower',
        { ...run, loadout: { towers: ['harpoon'], ability: null } },
        'loadout.towers',
      ],
      ['an unknown companion', { ...run, companion: 'gerald' }, 'companion'],
      ['a bad hash', { ...run, configHash: 'XYZ' }, 'configHash'],
      [
        'a count off the log',
        { ...run, checkpoint: { ...run.checkpoint, commandCount: 5 } },
        'commandCount',
      ],
      ['an unknown field', { ...run, extra: 1 }, 'unknown field'],
      ['a command at the checkpoint', tickAt(5, 900), 'log[5].tick'],
      ['a log out of order', tickAt(2, 5), 'log[2].tick'],
      ['an unknown command', cmdAt(1, { type: 'nuke' }), 'log[1].cmd.type'],
      [
        'an unknown tower built',
        cmdAt(0, { type: 'build', tile: [3, 4], tower: 'deathray' }),
        'log[0].cmd.tower',
      ],
      [
        'a tile off any grid',
        cmdAt(0, { type: 'build', tile: [3, -1], tower: 'rivet' }),
        'log[0].cmd.tile[1]',
      ],
      [
        'a command with a stray field',
        cmdAt(1, { type: 'callWave', now: true }),
        'log[1].cmd: unknown field',
      ],
      [
        'a bad targeting mode',
        cmdAt(2, { type: 'targeting', towerUid: 1, mode: 'nearest' }),
        'log[2].cmd.mode',
      ],
      ['ability slot 3', cmdAt(4, { type: 'ability', slot: 3 }), 'log[4].cmd.slot'],
      [
        'a non-boolean hold',
        cmdAt(3, { type: 'holdFire', target: 'all', on: 'yes' }),
        'log[3].cmd.on',
      ],
    ])('refuses %s', (_, bad, path) => {
      expect(withRun(bad)).toContain(path);
    });

    it('caps the log', () => {
      const log = Array.from({ length: ENDGAME_LIMITS.pendingLog + 1 }, () => ({
        tick: 0,
        cmd: { type: 'callWave' },
      }));
      expect(withRun({ ...run, log })).toContain(
        `expected at most ${ENDGAME_LIMITS.pendingLog} entries`,
      );
    });
  });

  describe('veteran', () => {
    it('needs the map won, known modifiers, and a bonus the table can reach', () => {
      expect(vet({ a1_m02: { mods: [], best: 0 } })).toContain('needs the map won');
      expect(vet({ a1_m01: { mods: ['god_mode'], best: 0 } })).toContain('veteran.a1_m01.mods[0]');
      expect(vet({ a1_m01: { mods: [], best: VETERAN_MAX_PCT + 1 } })).toContain('best');
      expect(vet({ nowhere: { mods: [], best: 0 } })).toContain('unknown map id');
      expect(vet({ a1_m01: { mods: [], best: VETERAN_MAX_PCT } })).toBe('');
    });

    it("sums progression.md § 6's bonuses (Hides + Glass Core + Short-Handed = 120%)", () => {
      expect(veteranBonusPct(['hardened_hides', 'glass_core', 'short_handed'])).toBe(120);
      expect(VETERAN_MAX_PCT).toBe(240);
      expect(VETERAN_MODIFIER_IDS).toHaveLength(8);
    });

    it('lets a map record hold the Veteran medal beside the other three', () => {
      const save = base();
      save.campaign.maps.a1_m01 = {
        completed: true,
        medals: ['victory', 'perfect_core', 'challenge', 'veteran'],
        bestMeter: 20,
      };
      expect(validateSave(save).ok).toBe(true);
    });
  });

  describe('endless', () => {
    it('holds at most ten scores, one per seed', () => {
      expect(
        end([
          { seed: 1, wave: 3 },
          { seed: 1, wave: 9 },
        ]),
      ).toContain('listed twice');
      const eleven = Array.from({ length: 11 }, (_, i) => ({ seed: i, wave: 1 }));
      expect(end(eleven)).toContain('at most 10 entries');
      expect(end([{ seed: -1, wave: 1 }])).toContain('endless[0].seed');
      expect(end([{ seed: 1, wave: 1, name: 'x' }])).toContain('unknown field');
      expect(end([])).toBe('');
    });
  });
});
