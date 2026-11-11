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
import { ACT3_CODEX, ACT3_CODEX_VERSIONS } from './act3.ts';
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
  a2_m04: [
    'codex_second_harvest',
    'codex_veilwalker',
    'codex_blinkstrider',
    'codex_kip',
    'codex_intake_manifest',
  ],
  a2_m05: ['codex_cantor', 'codex_penitent', 'codex_preserve', 'codex_vesthara'],
  // The Prism Spire's entry is A2M6's line; it unlocks once the tower is owned (A2M5's gift).
  a2_m06: ['codex_fracture', 'codex_riftmoth', 'codex_prism', 'codex_long_night'],
} as const;

/** Act III's entries by the map whose *Codex* line lists them (story/campaign/act3.md; T611). */
const ACT3_LISTS = {
  a3_m01: ['codex_maw', 'codex_leaving_song', 'codex_thrum', 'codex_small_ones_walk'],
  a3_m02: [
    'codex_compliance',
    'codex_expediter',
    'codex_buffer_protocol',
    'codex_clean_exit',
    'codex_quill_directives',
    'codex_sterling',
  ],
  a3_m03: ['codex_undertow', 'codex_okonkwos_gap', 'codex_amended_survey'],
} as const;

/**
 * Entries unlocked by something other than their map's win (their maps' objectives: act2.md §
 * A2M1, Crew Logs; § A2M4, Intake Manifest).
 */
const UNLOCKED_BY: Readonly<Record<string, Condition>> = {
  codex_crew_log: { objectiveDone: { map: 'a2_m01', objective: 'crew_logs' } },
  codex_intake_manifest: { objectiveDone: { map: 'a2_m04', objective: 'intake_manifest' } },
  // C1's payoff (act3.md § A3M1: "Old Thrum or 'the small ones' walk'"): one or the other.
  codex_thrum: { all: [{ mapAtLeast: 'a3_m01' }, { flag: 'spared_quiet_wave', eq: true }] },
  codex_small_ones_walk: {
    all: [{ mapAtLeast: 'a3_m01' }, { flag: 'spared_quiet_wave', eq: false }],
  },
};

/**
 * The versions each entry has, where it has more than an original: Act II's annotations (Rig
 * Nine's status update from A2M1; QUILL's from A2M3 and A2M4), Ves'thara's margin notes (from
 * A2M6), and Act III's corrections (the Field Journal's, from A3M1; T600b's seam, T611 the rest),
 * by the map that unlocks them.
 */
const LATER_VERSIONS: Readonly<Record<string, Partial<Record<CodexVersion, CampaignMapId>>>> = {
  codex_rig_nine: { annotated: 'a2_m01' },
  codex_mote: { annotated: 'a2_m03' },
  codex_brood_hauler: { annotated: 'a2_m03', margin: 'a2_m06', corrected: 'a3_m01' },
  codex_elder: { corrected: 'a3_m01' },
  codex_chitterbloom: { corrected: 'a3_m01' },
  codex_rig_3: { annotated: 'a2_m03' },
  codex_tidybot: { annotated: 'a2_m04' },
  codex_stardust: { annotated: 'a2_m04' },
  codex_hushed: { margin: 'a2_m06' },
  codex_glass_witch: { margin: 'a2_m06' },
  codex_lumenglass: { margin: 'a2_m06' },
  codex_aelari: { margin: 'a2_m06' },
  // A3M2's Everglow records arrive beside their corrections (T611).
  codex_buffer_protocol: { corrected: 'a3_m02' },
  codex_clean_exit: { corrected: 'a3_m02' },
  codex_sterling: { corrected: 'a3_m02' },
};

const sprites = SPRITES as readonly SpriteDef[];

describe('the codex content', () => {
  it('holds every entry of Acts I–III, in campaign order, each id unique and well-formed', () => {
    expect(CODEX_IDS).toEqual([
      ...Object.values(ACT1_LISTS).flat(),
      ...Object.values(ACT2_LISTS).flat(),
      ...Object.values(ACT3_LISTS).flat(),
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
        // A later wording (the Elder's after A3M3) keeps to the same limits.
        if (def.revised !== undefined) {
          expect(tokenProblems(def.revised.text)).toEqual([]);
          expect(worstCaseLength(def.revised.text)).toBeLessThanOrEqual(TEXT_LIMITS.codex);
          expect(usesName(def.revised.text)).toBe(false);
        }
        if (def.smallPrint !== undefined) {
          expect(tokenProblems(def.smallPrint)).toEqual([]);
          expect(worstCaseLength(def.smallPrint)).toBeLessThanOrEqual(TEXT_LIMITS.smallPrint);
        }
      }
      // Only the listed entries have more than an original, each unlocked from its map on.
      const later = LATER_VERSIONS[e.id] ?? {};
      const laterVersions = CODEX_VERSIONS.filter((v) => later[v] !== undefined);
      expect(Object.keys(e.versions)).toEqual(['original', ...laterVersions]);
      for (const v of laterVersions) {
        expect(e.versions[v]?.when, `${e.id}.${v}`).toEqual({ mapAtLeast: later[v] });
      }
      // An annotation is bracketed and signed (style-guide § 6.2); a margin note is Ves'thara's.
      const note = e.versions.annotated?.text;
      if (note !== undefined) expect(note).toMatch(/^\[[A-Z][^\]]*\]$/);
      const margin = e.versions.margin?.text;
      if (margin !== undefined) {
        expect(margin).toMatch(/^\[In the margin, in Ves'thara's hand: [A-Z][^\]]*\]$/);
        // Her voice: no contractions (characters.md § Ves'thara).
        expect(margin).not.toMatch(/\w'(?:s|t|re|ll|ve|d|m)\b(?<!Ves'thara's)/);
      }
    },
  );

  it('names real subjects, and an entry without one unlocks once its own map is won', () => {
    for (const [map, ids] of Object.entries({ ...ACT1_LISTS, ...ACT2_LISTS, ...ACT3_LISTS })) {
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

  it("gates the Intake Manifest on A2M4's objective of that name, a real one of that map", () => {
    const objective = MAPS.a2_m04.objectives?.find((o) => o.id === 'intake_manifest');
    expect(objective?.name).toBe(CODEX.codex_intake_manifest?.title);
  });

  it("shows the Act II portraits' frames: Kip's plant coat, Ves'thara touched (T541)", () => {
    expect(CODEX.codex_kip?.sprite).toEqual({ id: 'portrait.kip', frame: 'act2.neutral' });
    expect(CODEX.codex_vesthara?.sprite).toEqual({
      id: 'portrait.vesthara',
      frame: 'touched.neutral',
    });
    expect(CODEX.codex_long_night).toMatchObject({ photo: 'Too dark' });
    expect(CODEX.codex_long_night?.sprite).toBeUndefined();
  });

  it("writes Ves'thara's margin notes only once Sundown is won, under QUILL's on the Hauler", () => {
    const margins = CODEX_ENTRIES.filter((e) => e.versions.margin !== undefined).map((e) => e.id);
    expect(margins).toEqual([
      'codex_brood_hauler',
      'codex_hushed',
      'codex_glass_witch',
      'codex_lumenglass',
      'codex_aelari',
    ]);
    expect(Object.keys(CODEX.codex_brood_hauler!.versions)).toEqual([
      'original',
      'annotated',
      'margin',
      'corrected',
    ]);
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
    const own = [...ACT1_CODEX, ...ACT2_CODEX, ...ACT3_CODEX];
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

/** A codex text without its closing citation (the Elder's "(…)"). */
const body = (t: string): string => t.slice(0, t.lastIndexOf(' ('));

describe("the Field Journal's text (Act III, T611)", () => {
  const act3Ids = new Set<string>([
    ...Object.values(ACT3_LISTS).flat(),
    ...Object.keys(ACT3_CODEX_VERSIONS),
  ]);
  /** Everglow records written in Sterling's voice: the only Act III text that may exclaim. */
  const STERLINGS = new Set(['codex_buffer_protocol', 'codex_sterling']);

  it("spends no exclamation point but Sterling's, on her own records (style-guide § 2)", () => {
    for (const id of act3Ids) {
      const own = ACT3_CODEX.find((e) => e.id === id)?.versions ?? ACT3_CODEX_VERSIONS[id] ?? {};
      for (const [v, def] of Object.entries(own)) {
        const texts = [def.text, def.revised?.text ?? '', def.smallPrint ?? ''];
        const mayExclaim = v === 'original' && STERLINGS.has(id);
        if (!mayExclaim) expect(texts.join(' '), `${id}.${v}`).not.toContain('!');
      }
    }
  });

  it('writes a correction for every Act III record it sets beside one', () => {
    for (const id of act3Ids) {
      const e = CODEX[id]!;
      if (e.versions.corrected === undefined) continue;
      expect(e.versions.original, id).toBeDefined();
      expect(e.versions.corrected.when, id).toBeDefined();
    }
  });

  it("rewords only the Elder's correction, from A3M3, to the style guide's citation", () => {
    const revised = CODEX_ENTRIES.flatMap((e) =>
      CODEX_VERSIONS.filter((v) => e.versions[v]?.revised !== undefined).map((v) => `${e.id}.${v}`),
    );
    expect(revised).toEqual(['codex_elder.corrected']);
    const elder = CODEX.codex_elder!.versions.corrected!;
    expect(elder.when).toEqual({ mapAtLeast: 'a3_m01' });
    expect(elder.text).toMatch(/\(Survey 2346, Okonkwo\.\)$/);
    expect(elder.revised?.when).toEqual({ mapAtLeast: 'a3_m03' });
    // The same correction, only its citation changed.
    expect(body(elder.revised!.text)).toBe(body(elder.text));
  });

  it("files C1's payoff one way or the other, never both", () => {
    expect(CODEX.codex_thrum?.sprite).toEqual({ id: 'portrait.thrum', frame: 'neutral' });
    expect(CODEX.codex_small_ones_walk?.sprite).toBeUndefined();
    expect(CODEX.codex_small_ones_walk?.photo).toBe('Remembered');
    for (const e of CODEX_ENTRIES) {
      if (e.photo !== undefined) expect(e.photo.length, e.id).toBeLessThanOrEqual(12);
    }
  });
});
