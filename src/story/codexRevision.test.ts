// A codex version's later wording (T611; content/codex/types.ts `revised`): the Elder's correction
// cites the old survey from A3M1 and the Amended Survey from A3M3. The version stays the one
// unlocked; its text and its read mark follow the wording in force, so the new wording is NEW again.
import { describe, expect, it } from 'vitest';
import { CODEX, type CodexEntryDef } from '../content/codex/index.ts';
import {
  codexSeenId,
  revisionInForce,
  shownVersions,
  unlockedVersions,
  unreadVersions,
  versionSeenId,
  versionText,
} from './codex.ts';
import type { StoryContext } from './conditions.ts';

const ctx = (map: StoryContext['map']): StoryContext => ({
  flags: {},
  map,
  pestsProcessed: 0,
  seen: [],
  run: null,
});

const ELDER = CODEX.codex_elder!;
const MET = { enemies: ['elder'], towers: [], abilities: [] };

describe("the Elder's citation", () => {
  it('cites the old survey from A3M1 and the Amended Survey from A3M3', () => {
    const corrected = ELDER.versions.corrected!;
    expect(revisionInForce(corrected, ctx('a3_m02'))).toBe(false);
    expect(versionText(corrected, ctx('a3_m01'))).toMatch(/\(Survey 2346, Okonkwo\.\)$/);
    expect(versionText(corrected, ctx('a3_m02'))).toBe(corrected.text);
    expect(revisionInForce(corrected, ctx('a3_m03'))).toBe(true);
    expect(versionText(corrected, ctx('a3_m03'))).toBe(
      'Keeps the group at the pace of its slowest member so no one is left behind. The ' +
        "vocalizations are linguistic. (Amended Survey 2346, Okonkwo: 'Correction: they were " +
        "singing.')",
    );
  });

  it('stays the same version, beside the same original, either way', () => {
    for (const map of ['a3_m01', 'a3_m03'] as const) {
      const unlocked = unlockedVersions(ELDER, ctx(map), MET);
      expect(unlocked).toEqual(['original', 'corrected']);
      expect(shownVersions(unlocked, ctx(map))).toEqual(['original', 'corrected']);
    }
  });

  it('is NEW again once reworded, read with its own mark', () => {
    const readAtA3M1 = [codexSeenId('codex_elder', 'original'), 'codex_elder__corrected'];
    const at = (map: 'a3_m01' | 'a3_m03', seen: readonly string[]) =>
      unreadVersions('codex_elder', ['original', 'corrected'], seen, (v) =>
        versionSeenId(ELDER, v, ctx(map)),
      );
    expect(at('a3_m01', readAtA3M1)).toEqual([]);
    expect(versionSeenId(ELDER, 'corrected', ctx('a3_m03'))).toBe(
      'codex_elder__corrected__revised',
    );
    expect(versionSeenId(ELDER, 'original', ctx('a3_m03'))).toBe('codex_elder__original');
    expect(at('a3_m03', readAtA3M1)).toEqual(['corrected']);
    expect(at('a3_m03', [...readAtA3M1, 'codex_elder__corrected__revised'])).toEqual([]);
    // The mark is one a save can hold (meta/validate.ts `isFreeId`'s shape; story can't import meta).
    expect('codex_elder__corrected__revised').toMatch(/^[a-z][a-z0-9_]{0,47}$/);
  });

  it('leaves a version without a revision alone', () => {
    const plain: CodexEntryDef = {
      id: 'codex_x',
      title: 'X',
      kind: 'thing',
      versions: { original: { text: 'Plain.' } },
    };
    expect(versionText(plain.versions.original!, ctx('a3_m03'))).toBe('Plain.');
    expect(versionSeenId(plain, 'original', ctx('a3_m03'))).toBe('codex_x__original');
    // Default read marks are codexSeenId's, as before.
    expect(unreadVersions('codex_x', ['original'], ['codex_x__original'])).toEqual([]);
  });
});
