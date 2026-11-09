// The Act I codex content (T303): every entry the act file lists, each original within the style
// guide's limits, its subject and picture real, and its unlock condition one the base can meet.
import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../abilities/index.ts';
import { CAMPAIGN_PLAN_IDS } from '../campaign.ts';
import { TEXT_LIMITS, tokenProblems, usesName, worstCaseLength } from '../dialogue/rules.ts';
import { ENEMIES } from '../enemies/index.ts';
import { SPRITES } from '../sprites/index.ts';
import type { SpriteDef } from '../sprites/types.ts';
import { TOWERS } from '../towers/index.ts';
import { CODEX, CODEX_ENTRIES, CODEX_ID, CODEX_IDS, CODEX_VERSIONS } from './index.ts';

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

const sprites = SPRITES as readonly SpriteDef[];

describe('the codex content', () => {
  it('holds every Act I entry, in campaign order, each id unique and well-formed', () => {
    expect(CODEX_IDS).toEqual(Object.values(ACT1_LISTS).flat());
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
      // Act I ships originals only (annotations are M4's, D064).
      expect(Object.keys(e.versions)).toEqual(['original']);
    },
  );

  it('names real subjects, and an entry without one unlocks once its own map is won', () => {
    for (const [map, ids] of Object.entries(ACT1_LISTS)) {
      for (const id of ids) {
        const e = CODEX[id]!;
        const when = e.versions.original?.when;
        if (e.subject === undefined) {
          expect(when, id).toEqual({ mapAtLeast: map });
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
