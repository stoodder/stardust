import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN_IDS } from '../campaign.ts';
import { CODEX, CODEX_ENTRIES, CODEX_ID } from '../codex/index.ts';
import { MEMO_ID, MEMO_LIST, MEMOS } from '../memos/index.ts';
import { isColorName } from '../palettes/master.ts';
import {
  BARK_ID,
  BARKS,
  MAP_DIALOGUE,
  SCENE_ID,
  SCENES,
  SPEAKER_DEFS,
  barksFor,
  mapDialogue,
  sceneById,
} from './index.ts';
import {
  ARRIVAL_REASONS,
  CALLSIGN_IDS,
  CALLSIGNS,
  PRONOUN_IDS,
  PRONOUN_SETS,
  isValidPlayerName,
} from './profile.ts';
import { FLAGS } from './flags.ts';
import { ACT1_SPEAKERS } from './speakers.ts';
import { EXPRESSION_EXTRAS, SPEAKER_IDS } from './types.ts';

describe('speakers (style-guide § 5.1)', () => {
  it('registers every speaker id, in order', () => {
    expect(Object.keys(SPEAKER_DEFS)).toEqual(SPEAKER_IDS);
  });

  it('gives each a palette color, and a portrait exactly when its frame shows one', () => {
    for (const id of SPEAKER_IDS) {
      const s = SPEAKER_DEFS[id];
      expect(isColorName(s.color), id).toBe(true);
      const framed = s.frame === 'portrait' || s.frame === 'icon';
      expect(s.portrait, id).toBe(framed ? `portrait.${id}` : null);
      if (!framed) expect(s.variants, id).toEqual([]);
      if (s.blip !== null) expect(s.blip).toBe(`blip.${id}`);
    }
  });

  it('frames the portrait-less speakers by their text style (story-runtime.md § Dialogue runner)', () => {
    expect(SPEAKER_DEFS.kfa.frame).toBe('form');
    expect(SPEAKER_DEFS.hollow.frame).toBe('distorted');
    expect(SPEAKER_DEFS.narrator.frame).toBe('caption');
    expect(SPEAKER_DEFS.gerald.frame).toBe('icon');
  });

  it('lists the Act I cast with name plates', () => {
    for (const id of ACT1_SPEAKERS) expect(SPEAKER_DEFS[id].name.length, id).toBeGreaterThan(0);
    // QUILL's tell and the party hat (A1M5) exist for the Act I portraits.
    expect(EXPRESSION_EXTRAS.quill).toHaveProperty('policy');
    expect(SPEAKER_DEFS.quill.variants.map((v) => v.variant)).toContain('party_hat');
  });
});

describe('the dialogue registries', () => {
  it('has one entry per Act I map, each on the campaign plan', () => {
    expect(MAP_DIALOGUE.map((m) => m.map)).toEqual(CAMPAIGN_PLAN_IDS.slice(0, 5));
  });

  it('files every scene under its own map, with a well-formed, unique id', () => {
    const ids = MAP_DIALOGUE.flatMap((m) => m.scenes.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MAP_DIALOGUE) {
      for (const s of m.scenes) {
        expect(s.id).toMatch(SCENE_ID);
        expect(s.id.startsWith(`${m.map}_`), s.id).toBe(true);
      }
    }
    expect(Object.keys(SCENES)).toEqual(ids);
  });

  it('gives every bark a well-formed, unique id', () => {
    const all = MAP_DIALOGUE.flatMap((m) => m.barks);
    for (const b of all) expect(b.id).toMatch(BARK_ID);
    expect(Object.keys(BARKS).length).toBeGreaterThanOrEqual(all.length);
  });

  it('looks up scenes and maps safely', () => {
    expect(sceneById('__proto__')).toBeUndefined();
    expect(mapDialogue('a2_m01')).toEqual({ map: 'a2_m01', scenes: [], barks: [] });
    expect(barksFor('a1_m03')).toEqual(mapDialogue('a1_m03').barks);
  });

  it('matches the id patterns of style-guide § 5.3', () => {
    for (const ok of ['a1_m01_brief', 'a1_m05_w08', 'a3_m03_cue_seal', 'a2_m04_debrief']) {
      expect(ok).toMatch(SCENE_ID);
    }
    expect('a1_m05_scene_party').toMatch(SCENE_ID);
    expect('a1_m03_base_stardust').toMatch(SCENE_ID);
    for (const bad of ['a1_m01_briefing', 'a1_m01_w8', 'a9_m01_brief', 'a1_m01_Cue_x']) {
      expect(bad).not.toMatch(SCENE_ID);
    }
    expect('bricks_idle_fire_a1_01').toMatch(BARK_ID);
    expect('bricks_idle_a1_1').not.toMatch(BARK_ID);
  });
});

describe('codex and memo registries', () => {
  it('keys every entry by its own, well-formed id', () => {
    for (const e of CODEX_ENTRIES) {
      expect(e.id).toMatch(CODEX_ID);
      expect(CODEX[e.id]).toBe(e);
    }
    for (const m of MEMO_LIST) {
      expect(m.id).toMatch(MEMO_ID);
      expect(MEMOS[m.id]).toBe(m);
    }
  });
});

describe('the profile (core-loop.md § 6.1)', () => {
  it('accepts names the bitmap font can draw, 1–16 characters', () => {
    for (const ok of ['Jo', "O'Neil", 'Mary-Kate', 'J.R. Smith', 'A', 'X'.repeat(16), 'R2 D2']) {
      expect(isValidPlayerName(ok), ok).toBe(true);
    }
    for (const bad of ['', ' ', 'X'.repeat(17), ' Jo', 'Jo ', 'Zoë', 'Jo!', '...', "'-", 'a\nb']) {
      expect(isValidPlayerName(bad), bad).toBe(false);
    }
  });

  it('has three pronoun sets with all five forms and an agreement', () => {
    expect(Object.keys(PRONOUN_SETS)).toEqual(PRONOUN_IDS);
    expect(PRONOUN_SETS.they.agreement).toBe('plural');
    expect(PRONOUN_SETS.she.agreement).toBe('singular');
    expect(PRONOUN_SETS.he).toMatchObject({ they: 'he', their: 'his', themself: 'himself' });
  });

  it('names the callsigns in story order, and the arrival reasons of the flag', () => {
    expect(CALLSIGN_IDS.map((c) => CALLSIGNS[c])).toEqual(['Sprout', 'Thorn', 'Waykeeper']);
    expect(Object.keys(ARRIVAL_REASONS)).toEqual(FLAGS.arrival_reason.values);
  });
});
