// The Act I codex content (T303): every entry the act file lists, each original within the style
// guide's limits, its subject and picture real, and its unlock condition one the base can meet.
import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../abilities/index.ts';
import { CAMPAIGN_PLAN_IDS, type CampaignMapId } from '../campaign.ts';
import type { Condition } from '../dialogue/types.ts';
import { TEXT_LIMITS, tokenProblems, usesName, worstCaseLength } from '../dialogue/rules.ts';
import { ENEMIES } from '../enemies/index.ts';
import { MAPS } from '../maps/index.ts';
import { SPRITES } from '../sprites/index.ts';
import type { SpriteDef } from '../sprites/types.ts';
import { TOWERS } from '../towers/index.ts';
import { ACT1_CODEX } from './act1.ts';
import { ACT2_CODEX } from './act2.ts';
import {
  CODEX,
  CODEX_ENTRIES,
  CODEX_ID,
  CODEX_IDS,
  CODEX_LATER_VERSIONS,
  CODEX_VERSIONS,
  withLaterVersions,
  type CodexEntryDef,
  type CodexVersion,
} from './index.ts';

/** Act I's entries by the map whose *Codex* line lists them (story/campaign/act1.md). */
const ACT1_LISTS = {
  a1_m01: [
    'codex_nibbler',
    'codex_zoomer',
    'codex_rivet',
    'codex_thumper',
    'codex_tidybot',
    'codex_everglow_gardens',
    'codex_orbital_strike',
  ],
  a1_m02: [
    'codex_chonk',
    'codex_brood_hauler',
    'codex_sprinkler',
    'codex_bounty_board',
    'codex_stardust',
    'codex_rig_3',
    'codex_scarecrow',
  ],
  a1_m03: [
    'codex_puffwing',
    'codex_skyhook',
    'codex_gerald',
    'codex_form_88b',
    'codex_zibzab',
    'codex_vrell',
    'codex_hold_fire',
  ],
  a1_m04: [
    'codex_elder',
    'codex_bunchling',
    'codex_zapcoil',
    'codex_admin_plaza',
    'codex_evie',
    'codex_prim',
    'codex_smile_audit',
  ],
  a1_m05: ['codex_digger', 'codex_chitterbloom', 'codex_northern_gate', 'codex_rig_nine'],
} as const;

/** Act II's entries by the map whose *Codex* line lists them (story/campaign/act2.md). */
const ACT2_LISTS = {
  a2_m01: ['codex_mote', 'codex_diggings', 'codex_hushed', 'codex_crew_log'],
  a2_m02: ['codex_glimmer', 'codex_glass_witch', 'codex_lumenglass', 'codex_aelari'],
  a2_m03: ['codex_weft_warden', 'codex_lightwing', 'codex_pebble'],
} as const;

/** Entries unlocked by something other than their map's win (act2.md § A2M1: Crew Logs). */
const UNLOCKED_BY: Readonly<Record<string, Condition>> = {
  codex_crew_log: { objectiveDone: { map: 'a2_m01', objective: 'crew_logs' } },
};

/**
 * The versions each entry has, where it has more than an original: Act II's annotations (Rig
 * Nine's status update from A2M1; QUILL's from A2M3), by the map that unlocks them.
 */
const LATER_VERSIONS: Readonly<Record<string, Partial<Record<CodexVersion, CampaignMapId>>>> = {
  codex_rig_nine: { annotated: 'a2_m01' },
  codex_mote: { annotated: 'a2_m03' },
  codex_brood_hauler: { annotated: 'a2_m03' },
  codex_rig_3: { annotated: 'a2_m03' },
};

const sprites = SPRITES as readonly SpriteDef[];

describe('the codex content', () => {
  it('holds every Act I and Act II entry, in campaign order, each id unique and well-formed', () => {
    expect(CODEX_IDS).toEqual([
      ...Object.values(ACT1_LISTS).flat(),
      ...Object.values(ACT2_LISTS).flat(),
    ]);
    expect(new Set(CODEX_IDS).size).toBe(CODEX_IDS.length);
    for (const id of CODEX_IDS) {
      expect(id).toMatch(CODEX_ID);
      // codexSeenId joins id and version with "__".
      expect(id).not.toContain('__');
    }
  });

  it.each(CODEX_ENTRIES.map((e) => [e.id, e] as const))(
    '%s: its versions fit the limits and use no tokens they may not',
    (_, e) => {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.versions.original).toBeDefined();
      for (const v of CODEX_VERSIONS) {
        const def = e.versions[v];
        if (def === undefined) continue;
        expect(tokenProblems(def.text)).toEqual([]);
        expect(worstCaseLength(def.text)).toBeLessThanOrEqual(TEXT_LIMITS.codex);
        // The codex never names the player (style-guide § 3: no NPC says it before A3M3).
        expect(usesName(def.text)).toBe(false);
        if (def.smallPrint !== undefined) {
          expect(tokenProblems(def.smallPrint)).toEqual([]);
          expect(worstCaseLength(def.smallPrint)).toBeLessThanOrEqual(TEXT_LIMITS.smallPrint);
        }
      }
      // Only the listed entries have more than an original, each unlocked from its map on
      // (Act III's corrections are M6's).
      const later = LATER_VERSIONS[e.id] ?? {};
      const laterVersions = CODEX_VERSIONS.filter((v) => later[v] !== undefined);
      expect(Object.keys(e.versions)).toEqual(['original', ...laterVersions]);
      for (const v of laterVersions) {
        expect(e.versions[v]?.when, `${e.id}.${v}`).toEqual({ mapAtLeast: later[v] });
      }
      // An annotation is bracketed and signed (style-guide § 6.2).
      const note = e.versions.annotated?.text;
      if (note !== undefined) expect(note).toMatch(/^\[[A-Z][^\]]*\]$/);
    },
  );

  it('names real subjects, and an entry without one unlocks once its own map is won', () => {
    for (const [map, ids] of Object.entries({ ...ACT1_LISTS, ...ACT2_LISTS })) {
      for (const id of ids) {
        const e = CODEX[id]!;
        const when = e.versions.original?.when;
        if (e.subject === undefined) {
          const by = UNLOCKED_BY[id] ?? { mapAtLeast: map };
          expect(when, id).toEqual(by);
          expect(CAMPAIGN_PLAN_IDS).toContain(map);
        } else {
          expect(when, id).toBeUndefined();
          if ('enemy' in e.subject) expect(Object.keys(ENEMIES)).toContain(e.subject.enemy);
          else if ('tower' in e.subject) expect(Object.keys(TOWERS)).toContain(e.subject.tower);
          else expect(Object.keys(ABILITIES)).toContain(e.subject.ability);
        }
      }
    }
  });

  it("gates the crew log on A2M1's Crew Logs objective, a real one of that map", () => {
    const objectives = MAPS.a2_m01.objectives?.map((o) => o.id) ?? [];
    expect(UNLOCKED_BY.codex_crew_log).toEqual({
      objectiveDone: { map: 'a2_m01', objective: 'crew_logs' },
    });
    expect(objectives).toContain('crew_logs');
  });

  it('withholds the "Pebble" entry: QUILL won\'t file her (act2.md § A2M3)', () => {
    const e = CODEX.codex_pebble!;
    expect(e).toMatchObject({ title: 'Pebble', kind: 'person', photo: 'Withheld' });
    expect(e.sprite).toBeUndefined();
    expect(e.versions.original?.text).toBe('[QUILL: Entry withheld.]');
  });

  it("shows a real sprite frame: its own, or its subject's icon", () => {
    for (const e of CODEX_ENTRIES) {
      if (e.sprite === undefined) continue;
      const def = sprites.find((s) => s.id === e.sprite!.id);
      expect(def, e.id).toBeDefined();
      expect(Object.keys(def!.frames), e.id).toContain(e.sprite.frame ?? 'icon');
      expect(e.subject, `${e.id}: a subject brings its own icon`).toBeUndefined();
    }
  });
});

describe("the later acts' versions of earlier entries", () => {
  const base: CodexEntryDef = {
    id: 'codex_x',
    title: 'X',
    kind: 'thing',
    versions: { original: { text: 'Original.' } },
  };

  it('merges a later version in CODEX_VERSIONS order, never replacing one the entry has', () => {
    const [merged] = withLaterVersions(
      [base],
      [
        { codex_x: { corrected: { text: 'Corrected.' } } },
        { codex_x: { annotated: { text: 'Annotated.' }, original: { text: 'Not this.' } } },
      ],
    );
    expect(Object.keys(merged!.versions)).toEqual(['original', 'annotated', 'corrected']);
    expect(merged!.versions.original?.text).toBe('Original.');
    expect(withLaterVersions([base], [{ codex_y: {} }])[0]).toBe(base);
  });

  it('every later version names a registered entry and adds a version it lacks', () => {
    const own = [...ACT1_CODEX, ...ACT2_CODEX];
    for (const patch of CODEX_LATER_VERSIONS) {
      for (const [id, versions] of Object.entries(patch)) {
        const entry = own.find((e) => e.id === id);
        expect(entry, id).toBeDefined();
        for (const v of Object.keys(versions)) {
          expect(entry!.versions, `${id}.${v}`).not.toHaveProperty(v);
          expect(CODEX[id]!.versions, `${id}.${v}`).toHaveProperty(v);
        }
      }
    }
  });
});
