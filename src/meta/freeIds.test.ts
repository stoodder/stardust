// Every id the game writes to `story.seen` passes the save's free-id check (meta/validate.ts
// `isFreeId`), so playing a scene, a once-per-campaign bark, or opening a codex version can never
// write a save that validation then refuses (D097, C5).
import { describe, expect, it } from 'vitest';
import { CODEX_ENTRIES, CODEX_VERSIONS } from '../content/codex/index.ts';
import { BARKS, SCENES } from '../content/dialogue/index.ts';
import { MEMO_IDS } from '../content/memos/index.ts';
import { codexSeenId } from '../story/codex.ts';
import { FIRST_PAYDAY_SEEN_ID } from './runEnd.ts';
import { isFreeId } from './validate.ts';

const bad = (ids: Iterable<string>): string[] => [...ids].filter((id) => !isFreeId(id));

describe('story.seen ids are free ids', () => {
  it('every scene and bark id', () => {
    expect(bad(Object.keys(SCENES))).toEqual([]);
    expect(bad(Object.keys(BARKS))).toEqual([]);
  });

  it('every codex version an entry has (codexSeenId)', () => {
    const ids = CODEX_ENTRIES.flatMap((e) =>
      CODEX_VERSIONS.filter((v) => e.versions[v] !== undefined).map((v) => codexSeenId(e.id, v)),
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(bad(ids)).toEqual([]);
  });

  it('every memo id, and the first payday mark', () => {
    expect(bad(MEMO_IDS)).toEqual([]);
    expect(isFreeId(FIRST_PAYDAY_SEEN_ID)).toBe(true);
  });

  it('refuses ids a save would refuse', () => {
    expect(isFreeId('A1_scene')).toBe(false);
    expect(isFreeId('1_scene')).toBe(false);
    expect(isFreeId(`a${'b'.repeat(48)}`)).toBe(false);
    expect(isFreeId('a1_m05_scene_party')).toBe(true);
  });
});
