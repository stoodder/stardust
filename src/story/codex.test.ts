import { describe, expect, it } from 'vitest';
import { CODEX, type CodexEntryDef } from '../content/codex/index.ts';
import {
  codexSeenId,
  codexTitle,
  newCodexUnlocks,
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

/** A three-version entry, for the later acts' rules (Act I ships originals only). */
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
    const draft: CodexEntryDef = { ...HAULER, versions: { ...HAULER.versions, corrected: { text: 'x' } } };
    expect(unlockedVersions(draft, ctx('fin_m01'), met)).toEqual(['original', 'annotated']);
  });

  it('lists only what is new, and only entries that gained something', () => {
    const met = { ...NONE, enemies: ['hauler'] };
    expect(newCodexUnlocks({}, ctx('a2_m03'), met, [HAULER])).toEqual({
      codex_test_hauler: ['original', 'annotated'],
    });
    expect(newCodexUnlocks({ codex_test_hauler: ['original'] }, ctx('a2_m03'), met, [HAULER])).toEqual(
      { codex_test_hauler: ['annotated'] },
    );
    expect(
      newCodexUnlocks({ codex_test_hauler: ['original', 'annotated'] }, ctx('a2_m03'), met, [HAULER]),
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

  it('marks a version read in the seen list', () => {
    expect(codexSeenId('codex_nibbler', 'original')).toBe('codex_nibbler__original');
    const seen = [codexSeenId('codex_test_hauler', 'original')];
    expect(unreadVersions('codex_test_hauler', ['original', 'annotated'], seen)).toEqual([
      'annotated',
    ]);
    // A seen id fits the save's free-form id shape (validate.ts: ≤ 48, lowercase snake_case).
    expect(codexSeenId('codex_chitterbloom', 'corrected')).toMatch(/^[a-z][a-z0-9_]{0,47}$/);
  });
});
