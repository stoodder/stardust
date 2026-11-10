import { describe, expect, it } from 'vitest';
import { CODEX, type CodexEntryDef } from '../content/codex/index.ts';
import {
  codexSeenId,
  codexTitle,
  isNoteVersion,
  newCodexUnlocks,
  notesShown,
  shownVersions,
  unlockedVersions,
  unreadVersions,
  type CodexEncounters,
} from './codex.ts';
import type { StoryContext } from './conditions.ts';

const ctx = (map: StoryContext['map'], flags: StoryContext['flags'] = {}): StoryContext => ({
  flags,
  map,
  pestsProcessed: 0,
  seen: [],
  run: null,
});
const NONE: CodexEncounters = { enemies: [], towers: [], abilities: [] };

/** A three-version entry, for the later acts' rules (no shipped entry has a correction yet). */
const HAULER: CodexEntryDef = {
  id: 'codex_test_hauler',
  title: 'Brood Hauler',
  kind: 'enemy',
  subject: { enemy: 'hauler' },
  versions: {
    original: { text: 'Big, slow, and greedy!' },
    annotated: { text: '[QUILL: Cargo inspected.]', when: { mapAtLeast: 'a2_m03' } },
    corrected: { text: 'An adult who carries the young.', when: { mapAtLeast: 'a3_m01' } },
  },
};

describe('codex unlocks', () => {
  it('unlocks a subject entry on first encounter: an enemy seen, a tower or ability owned', () => {
    const met = { enemies: ['nibbler'], towers: ['rivet'], abilities: ['orbital_strike'] };
    expect(unlockedVersions(CODEX.codex_nibbler!, ctx(null), met)).toEqual(['original']);
    expect(unlockedVersions(CODEX.codex_rivet!, ctx(null), met)).toEqual(['original']);
    expect(unlockedVersions(CODEX.codex_orbital_strike!, ctx(null), met)).toEqual(['original']);
    expect(unlockedVersions(CODEX.codex_zoomer!, ctx('a1_m05'), met)).toEqual([]);
    expect(unlockedVersions(CODEX.codex_thumper!, ctx('a1_m05'), met)).toEqual([]);
  });

  it('unlocks a place, person, or thing once its map is won', () => {
    expect(unlockedVersions(CODEX.codex_rig_3!, ctx('a1_m01'), NONE)).toEqual([]);
    expect(unlockedVersions(CODEX.codex_rig_3!, ctx('a1_m02'), NONE)).toEqual(['original']);
    expect(unlockedVersions(CODEX.codex_rig_3!, ctx('a1_m05'), NONE)).toEqual(['original']);
    expect(unlockedVersions(CODEX.codex_tidybot!, ctx(null), NONE)).toEqual([]);
  });

  it('unlocks later versions by their conditions, never before the subject is met', () => {
    const met = { ...NONE, enemies: ['hauler'] };
    expect(unlockedVersions(HAULER, ctx('a2_m03'), NONE)).toEqual([]);
    expect(unlockedVersions(HAULER, ctx('a1_m05'), met)).toEqual(['original']);
    expect(unlockedVersions(HAULER, ctx('a2_m03'), met)).toEqual(['original', 'annotated']);
    expect(unlockedVersions(HAULER, ctx('a3_m01'), met)).toEqual([
      'original',
      'annotated',
      'corrected',
    ]);
    // A later version with no condition never unlocks (a draft can't leak early).
    const draft: CodexEntryDef = {
      ...HAULER,
      versions: { ...HAULER.versions, corrected: { text: 'x' } },
    };
    expect(unlockedVersions(draft, ctx('fin_m01'), met)).toEqual(['original', 'annotated']);
  });

  it('lists only what is new, and only entries that gained something', () => {
    const met = { ...NONE, enemies: ['hauler'] };
    expect(newCodexUnlocks({}, ctx('a2_m03'), met, [HAULER])).toEqual({
      codex_test_hauler: ['original', 'annotated'],
    });
    expect(
      newCodexUnlocks({ codex_test_hauler: ['original'] }, ctx('a2_m03'), met, [HAULER]),
    ).toEqual({ codex_test_hauler: ['annotated'] });
    expect(
      newCodexUnlocks({ codex_test_hauler: ['original', 'annotated'] }, ctx('a2_m03'), met, [
        HAULER,
      ]),
    ).toEqual({});
  });

  it('unlocks every Act I entry once Act I is won and its subjects met', () => {
    const met: CodexEncounters = {
      enemies: ['nibbler', 'zoomer', 'chonk', 'hauler', 'puffwing', 'gerald', 'bunchling', 'elder'],
      towers: ['rivet', 'thumper', 'sprinkler', 'skyhook', 'zapcoil'],
      abilities: ['orbital_strike'],
    };
    const all = newCodexUnlocks({}, ctx('a1_m05'), {
      ...met,
      enemies: [...met.enemies, 'digger', 'chitterbloom'],
    });
    expect(Object.keys(all)).toHaveLength(32);
    // Without A1M5's enemies, their entries wait.
    const before = newCodexUnlocks({}, ctx('a1_m05'), met);
    expect(Object.keys(before)).not.toContain('codex_digger');
    expect(Object.keys(before)).not.toContain('codex_chitterbloom');
  });

  it("unlocks the crew log only with A2M1's Crew Logs objective on file (T411)", () => {
    const won = ctx('a2_m01');
    expect(newCodexUnlocks({}, won, NONE)).not.toHaveProperty('codex_crew_log');
    const logs = { ...won, objectives: { a2_m01: ['crew_logs'] } };
    expect(newCodexUnlocks({}, logs, NONE).codex_crew_log).toEqual(['original']);
  });

  it("adds Act II's annotations to Act I entries: Rig Nine from A2M1, QUILL's from A2M3", () => {
    const met: CodexEncounters = { ...NONE, enemies: ['hauler', 'mote'] };
    const have = { codex_brood_hauler: ['original'], codex_rig_nine: ['original'] } as const;
    const a2m1 = newCodexUnlocks(have, ctx('a2_m01'), met);
    expect(a2m1.codex_rig_nine).toEqual(['annotated']);
    expect(a2m1).not.toHaveProperty('codex_brood_hauler');
    expect(a2m1.codex_mote).toEqual(['original']);
    const a2m3 = newCodexUnlocks(
      { ...have, codex_rig_nine: ['original', 'annotated'], codex_mote: ['original'] },
      ctx('a2_m03'),
      met,
    );
    expect(a2m3.codex_brood_hauler).toEqual(['annotated']);
    expect(a2m3.codex_mote).toEqual(['annotated']);
    expect(a2m3.codex_rig_3).toEqual(['original', 'annotated']);
    expect(a2m3.codex_pebble).toEqual(['original']);
    expect(shownVersions(['original', 'annotated'], ctx('a2_m03'))).toEqual(['annotated']);
  });

  it("adds QUILL's A2M4 notes and the A2M4–A2M6 entries as their maps are won (T511)", () => {
    const met: CodexEncounters = {
      enemies: ['veilwalker', 'blinkstrider', 'cantor', 'sunderglass_penitent'],
      towers: ['prism'],
      abilities: [],
    };
    const have = { codex_tidybot: ['original'], codex_stardust: ['original'] } as const;
    const a2m4 = newCodexUnlocks(have, ctx('a2_m04'), met);
    expect(a2m4.codex_tidybot).toEqual(['annotated']);
    expect(a2m4.codex_stardust).toEqual(['annotated']);
    for (const id of ['codex_second_harvest', 'codex_kip', 'codex_veilwalker', 'codex_cantor']) {
      expect(a2m4[id], id).toEqual(['original']);
    }
    // The manifest waits for its objective; the places wait for their maps.
    expect(a2m4).not.toHaveProperty('codex_intake_manifest');
    expect(a2m4).not.toHaveProperty('codex_preserve');
    const manifest = { ...ctx('a2_m04'), objectives: { a2_m04: ['intake_manifest'] } };
    expect(newCodexUnlocks(have, manifest, met).codex_intake_manifest).toEqual(['original']);
    const a2m5 = newCodexUnlocks({}, ctx('a2_m05'), met);
    expect(a2m5.codex_preserve).toEqual(['original']);
    expect(a2m5.codex_vesthara).toEqual(['original']);
    expect(a2m5.codex_prism).toEqual(['original']);
    expect(a2m5).not.toHaveProperty('codex_long_night');
    expect(newCodexUnlocks({}, ctx('a2_m06'), NONE).codex_long_night).toEqual(['original']);
  });

  it("writes Ves'thara's margin notes once Sundown is won, over QUILL's (T501e)", () => {
    const met: CodexEncounters = { ...NONE, enemies: ['hauler', 'glass_witch'] };
    const have = {
      codex_brood_hauler: ['original', 'annotated'],
      codex_glass_witch: ['original'],
    } as const;
    expect(newCodexUnlocks(have, ctx('a2_m05'), met)).not.toHaveProperty('codex_brood_hauler');
    const a2m6 = newCodexUnlocks(have, ctx('a2_m06'), met);
    expect(a2m6.codex_brood_hauler).toEqual(['margin']);
    expect(a2m6.codex_glass_witch).toEqual(['margin']);
    expect(shownVersions(['original', 'annotated', 'margin'], ctx('a2_m06'))).toEqual(['margin']);
  });
});

describe('the codex title and its versions on screen', () => {
  it('is the Pest Field Guide until A3M1, then the Field Journal', () => {
    expect(codexTitle(ctx(null))).toBe('Pest Field Guide');
    expect(codexTitle(ctx('a2_m06'))).toBe('Pest Field Guide');
    expect(codexTitle(ctx('a3_m01'))).toBe('Field Journal');
    expect(codexTitle(ctx('fin_m01'))).toBe('Field Journal');
  });

  it('shows the newest version, and original beside corrected in the Field Journal', () => {
    expect(shownVersions([], ctx('a1_m01'))).toEqual([]);
    expect(shownVersions(['original'], ctx('a1_m05'))).toEqual(['original']);
    expect(shownVersions(['original', 'annotated'], ctx('a2_m03'))).toEqual(['annotated']);
    expect(shownVersions(['original', 'annotated', 'corrected'], ctx('a3_m01'))).toEqual([
      'original',
      'corrected',
    ]);
  });

  it('shows a note with the notes written before it, oldest first', () => {
    expect(isNoteVersion('annotated')).toBe(true);
    expect(isNoteVersion('margin')).toBe(true);
    expect(isNoteVersion('original')).toBe(false);
    expect(isNoteVersion('corrected')).toBe(false);
    expect(notesShown('margin', ['original', 'annotated', 'margin'])).toEqual([
      'annotated',
      'margin',
    ]);
    // A margin note on an entry with no annotation stands alone under the record.
    expect(notesShown('margin', ['original', 'margin'])).toEqual(['margin']);
    expect(notesShown('annotated', ['original', 'annotated', 'margin'])).toEqual(['annotated']);
    expect(notesShown('original', ['original', 'annotated'])).toEqual([]);
    expect(notesShown('corrected', ['original', 'annotated', 'corrected'])).toEqual([]);
    // The Field Journal sets the correction beside the original; the notes step aside.
    expect(shownVersions(['original', 'annotated', 'margin', 'corrected'], ctx('a3_m01'))).toEqual([
      'original',
      'corrected',
    ]);
  });

  it('marks a version read in the seen list', () => {
    expect(codexSeenId('codex_nibbler', 'original')).toBe('codex_nibbler__original');
    const seen = [codexSeenId('codex_test_hauler', 'original')];
    expect(unreadVersions('codex_test_hauler', ['original', 'annotated'], seen)).toEqual([
      'annotated',
    ]);
    // A seen id fits the save's free-form id shape (validate.ts: ≤ 48, lowercase snake_case).
    expect(codexSeenId('codex_chitterbloom', 'corrected')).toMatch(/^[a-z][a-z0-9_]{0,47}$/);
    expect(codexSeenId('codex_intake_manifest', 'margin')).toMatch(/^[a-z][a-z0-9_]{0,47}$/);
  });
});
