// The base's story panes, app side (T303): the Inbox and codex views for the save in play, the read
// marks that clear the NEW badges, and the catch-up that runs on entering the base.
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../meta/index.ts';
import { GLYPH_CHARS } from '../story/text.ts';
import {
  catchUpStory,
  codexView,
  inboxView,
  markCodexRead,
  markMemoRead,
  storyBadges,
} from './inbox.ts';
import { activeSave, initSaves, loadDevSave, newGame, recordRun } from './save.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1);
});

/** A new game with A1M1 won (its run end delivers and unlocks, meta's step 8). */
function afterA1M1Win(): void {
  newGame(1);
  recordRun({
    mapId: 'a1_m01',
    outcome: 'won',
    mapStardust: 0,
    waveCount: 7,
    wavesResolved: 7,
    earnedMedals: ['victory'],
    skitterkinKilled: 40,
    meter: 20,
  });
}

describe('the Inbox', () => {
  it('holds the welcome memo from a new game, unread, with its sun drawn', () => {
    newGame(1);
    const [welcome] = inboxView();
    expect(welcome).toMatchObject({ id: 'memo_a1_00', unread: true });
    expect(welcome?.subject).toBe(`WELCOME TO THE GARDENS! ${GLYPH_CHARS.sun}`);
    expect(welcome?.signOff).toContain(GLYPH_CHARS.sun);
    expect(storyBadges().inbox).toBe(1);
    expect(markMemoRead('memo_a1_00')).toEqual({ ok: true });
    expect(storyBadges().inbox).toBe(0);
    expect(inboxView()[0]?.unread).toBe(false);
    // Marking it again, or a memo not delivered, writes nothing.
    expect(markMemoRead('memo_a1_00')).toBeNull();
    expect(markMemoRead('memo_a1_03')).toBeNull();
  });

  it("lists memos newest first; A1M1's win delivers its memo", () => {
    afterA1M1Win();
    expect(inboxView().map((m) => m.id)).toEqual(['memo_a1_01', 'memo_a1_00']);
    expect(storyBadges()).toMatchObject({ inbox: 2 });
    expect(storyBadges().codex).toBeGreaterThan(0);
  });
});

describe('the codex', () => {
  it('shows the unlocked entries with their pictures, and reading one clears its NEW', () => {
    afterA1M1Win();
    const view = codexView()!;
    expect(view.title).toBe('Pest Field Guide');
    const ids = view.entries.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['codex_nibbler', 'codex_orbital_strike']));
    expect(ids).not.toContain('codex_chonk');
    const nibbler = view.entries.find((e) => e.id === 'codex_nibbler')!;
    expect(nibbler.picture).toEqual({ id: 'icon.enemy.nibbler', frame: 'icon' });
    expect(nibbler.versions.map((v) => v.version)).toEqual(['original']);
    const gardens = view.entries.find((e) => e.id === 'codex_everglow_gardens')!;
    expect(gardens.picture).toEqual({ id: 'prop.dome', frame: 'v0' });
    const strike = view.entries.find((e) => e.id === 'codex_orbital_strike')!;
    expect(strike.versions[0]?.smallPrint).toBe(
      'Uplink access contingent on Q2 extraction targets.',
    );
    const before = storyBadges().codex;
    expect(nibbler.isNew).toBe(true);
    expect(markCodexRead('codex_nibbler')).toEqual({ ok: true });
    expect(activeSave()?.story.seen).toContain('codex_nibbler__original');
    expect(codexView()?.entries.find((e) => e.id === 'codex_nibbler')?.isNew).toBe(false);
    expect(storyBadges().codex).toBe(before - 1);
    expect(markCodexRead('codex_nibbler')).toBeNull();
  });
});

describe('entering the base', () => {
  it('catches an older save up once, then writes nothing', () => {
    loadDevSave('after_a1m1');
    const first = catchUpStory();
    expect(first).toEqual({ ok: true });
    expect(activeSave()?.story.memosDelivered).toEqual(['memo_a1_00', 'memo_a1_01']);
    expect(catchUpStory()).toBeNull();
  });

  it('does nothing without a save', () => {
    expect(catchUpStory()).toBeNull();
    expect(inboxView()).toEqual([]);
    expect(codexView()).toBeNull();
  });
});
