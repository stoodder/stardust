// Act III in the base (T611): the codex is the *Field Journal* and its tab reads "Journal" from
// A3M1 (an earlier save's still reads "Codex"); corrections sit beside their originals; C1 picks
// Old Thrum's entry or the Small Ones' Walk; A3M2's Everglow records arrive beside their
// corrections; the Elder's citation is reworded after A3M3 and is NEW again; and the automated
// memos show no sign-off. On the real Act III dev saves.
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../meta/index.ts';
import {
  catchUpStory,
  codexTabLabel,
  codexView,
  inboxView,
  markCodexRead,
  storyBadges,
} from './inbox.ts';
import { activeSave, initSaves, loadDevSave, updateActiveSave } from './save.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1);
});

const entry = (id: string) => codexView()?.entries.find((e) => e.id === id);
const ids = (): string[] => codexView()?.entries.map((e) => e.id) ?? [];

describe('the Field Journal tab', () => {
  it('reads "Codex" before A3M1 and "Journal" from it', () => {
    expect(codexTabLabel()).toBe('Codex');
    loadDevSave('after_a2m6');
    expect(codexTabLabel()).toBe('Codex');
    expect(codexView()?.title).toBe('Pest Field Guide');
    loadDevSave('after_a3m1_spared');
    expect(codexTabLabel()).toBe('Journal');
    expect(codexView()?.title).toBe('Field Journal');
  });
});

describe("A3M1's entries", () => {
  it('sets the Hauler, the Elder and Bramble beside their originals, the old survey cited', () => {
    loadDevSave('after_a3m1_spared');
    const elder = entry('codex_elder');
    expect(elder?.versions.map((v) => v.version)).toEqual(['original', 'corrected']);
    expect(elder?.versions[1]?.text).toMatch(/linguistic\. \(Survey 2346, Okonkwo\.\)$/);
    expect(entry('codex_brood_hauler')?.versions.map((v) => v.version)).toEqual([
      'original',
      'corrected',
    ]);
    expect(entry('codex_chitterbloom')?.versions[1]?.text).toBe(
      "Not 'Chitterbloom.' A mother who walks at the back so no one is left.",
    );
    expect(entry('codex_leaving_song')).toMatchObject({ photo: 'Six notes', picture: null });
  });

  it("files Old Thrum if C1 was spared, the Small Ones' Walk if it was cleared", () => {
    loadDevSave('after_a3m1_spared');
    expect(ids()).toContain('codex_thrum');
    expect(ids()).not.toContain('codex_small_ones_walk');
    expect(entry('codex_thrum')?.picture).toEqual({ id: 'portrait.thrum', frame: 'neutral' });
    loadDevSave('after_a3m1_cleared');
    expect(ids()).not.toContain('codex_thrum');
    expect(entry('codex_small_ones_walk')?.versions[0]?.text).toMatch(/Her name was Thrum\.$/);
    // Nothing of A3M2's yet.
    expect(ids()).not.toContain('codex_buffer_protocol');
  });
});

describe("A3M2's entries and memo", () => {
  it("shows Everglow's records beside the Journal's corrections from the start", () => {
    loadDevSave('after_a3m2_rivet');
    for (const id of ['codex_buffer_protocol', 'codex_clean_exit', 'codex_sterling']) {
      expect(
        entry(id)?.versions.map((v) => v.version),
        id,
      ).toEqual(['original', 'corrected']);
    }
    expect(entry('codex_quill_directives')?.versions[0]?.text).toContain(
      'DIRECTIVE 4: DO NOT DISCLOSE DIRECTIVES 0–4.',
    );
    expect(entry('codex_sterling')?.picture).toEqual({ id: 'portrait.sterling', frame: 'neutral' });
  });

  it('files the automated memo: no sign-off, the Policy CE-1 small print', () => {
    loadDevSave('after_a3m2_rivet');
    const memo = inboxView().find((m) => m.id === 'memo_a3_02');
    expect(memo).toMatchObject({
      from: 'Everglow Automated Systems',
      signOff: null,
      smallPrint:
        'Revocation is final. Refunds issued per Policy CE-1. This message was not reviewed.',
    });
    expect(memo?.paragraphs[0]).toBe('This is an automated message.');
  });
});

/**
 * `after_a3m3_convoy`, with A3M3 on record as won and the base's catch-up run: until A3M3's map
 * is registered the dev save skips it (devSaves.ts `actThreeThrough`), and a won record is all the
 * codex and the Inbox read.
 */
function afterA3M3(): void {
  loadDevSave('after_a3m3_convoy');
  updateActiveSave((s) => {
    const maps: Record<string, unknown> = { ...s.campaign.maps };
    maps['a3_m03'] ??= maps['a3_m02'];
    return { ...s, campaign: { ...s.campaign, maps: maps as typeof s.campaign.maps } };
  });
  catchUpStory();
}

describe('A3M3: the Amended Survey', () => {
  /** After A3M3, with the Elder's correction read at A3M1 (its old wording). */
  function readAtA3M1(): void {
    afterA3M3();
    updateActiveSave((s) => ({
      ...s,
      story: {
        ...s.story,
        seen: [...s.story.seen, 'codex_elder__original', 'codex_elder__corrected'],
      },
    }));
  }

  it("rewords the Elder's citation, NEW again until its new wording is read", () => {
    readAtA3M1();
    const elder = entry('codex_elder');
    expect(elder?.versions[1]?.text).toMatch(
      /\(Amended Survey 2346, Okonkwo: 'Correction: they were singing\.'\)$/,
    );
    expect(elder?.isNew).toBe(true);
    const before = storyBadges().codex;
    markCodexRead('codex_elder');
    expect(activeSave()?.story.seen).toContain('codex_elder__corrected__revised');
    expect(entry('codex_elder')?.isNew).toBe(false);
    expect(storyBadges().codex).toBe(before - 1);
    // Reading it again writes nothing.
    expect(markCodexRead('codex_elder')).toBeNull();
  });

  it("files the Gap and the Survey, and the Personnel Update, the act file's one line", () => {
    afterA3M3();
    expect(entry('codex_okonkwos_gap')).toMatchObject({ photo: 'Sealed', kind: 'place' });
    expect(entry('codex_amended_survey')?.versions[0]?.text).toContain(
      "'Correction: they were singing.'",
    );
    const memo = inboxView()[0];
    expect(memo).toMatchObject({ id: 'memo_a3_03', signOff: null, unread: true });
    expect(memo?.paragraphs).toEqual([
      'Employee #ED-112 (Okonkwo, I.): Unscheduled Departure. Pension: Restructured.',
    ]);
  });
});
