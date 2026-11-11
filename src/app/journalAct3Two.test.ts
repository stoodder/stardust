// Act III part two in the base (T711): every Field Journal entry and memo that A3M4–A3M6 add is
// delivered by some path. On the real dev saves, A3M4's and A3M5's entries and corrections are in
// the Journal and their memos in the Inbox, the same under every C4 outcome (no entry differs by
// C4); the Gloop Spitter's entry follows the tower, the warren's in A3M4 or Goldie's in A3M6; and
// every unit an entry names is one some map sends or some briefing gives (A3M6's once its map is
// registered).
import { beforeEach, describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../content/campaign.ts';
import { CODEX_ENTRIES } from '../content/codex/index.ts';
import { MAPS } from '../content/maps/index.ts';
import { BRIEFING_GIFTS, MemoryStore } from '../meta/index.ts';
import type { DevSaveId } from '../meta/__fixtures__/devSaves.ts';
import { codexView, inboxView } from './inbox.ts';
import { activeSave, initSaves, loadDevSave } from './save.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1);
});

const entry = (id: string) => codexView()?.entries.find((e) => e.id === id);
const ids = (): string[] => codexView()?.entries.map((e) => e.id) ?? [];
const memoIds = (): string[] => inboxView().map((m) => m.id);

/** Whether the dev save has won `map` (a dev save skips a map that isn't registered yet). */
const won = (map: string): boolean =>
  (activeSave()?.campaign.maps as Partial<Record<string, { completed: boolean }>> | undefined)?.[
    map
  ]?.completed === true;

const A3M4 = ['codex_silencer', 'codex_liability', 'codex_system_reboot', 'codex_pension_form'];
const A3M5 = [
  'codex_auditor',
  'codex_associate',
  'codex_shareholder_value',
  'codex_sproing',
  'codex_kips_ledger',
];
const A3M6 = ['codex_gunship', 'codex_blackbudget', 'codex_gathering_maw'];

describe("A3M4's Journal and Inbox", () => {
  it.each(['after_a3m4_keep', 'after_a3m4_purge', 'after_a3m4_rewrite'] as const)(
    '%s files its entries, Gerald corrected, and the plant memo',
    (save) => {
      loadDevSave(save);
      if (!won('a3_m04')) return;
      for (const id of A3M4) expect(ids(), id).toContain(id);
      // The convoy's Gloop comes in A3M6, so no Gloop entry yet; nothing of A3M5's either.
      expect(ids()).not.toContain('codex_gloop');
      for (const id of [...A3M5, ...A3M6]) expect(ids(), id).not.toContain(id);
      expect(entry('codex_gerald')?.versions.map((v) => v.version)).toEqual([
        'original',
        'corrected',
      ]);
      expect(entry('codex_gerald')?.versions[1]?.text).toContain('He knows it arrived.');
      expect(entry('codex_pension_form')).toMatchObject({ photo: 'Form P-19', picture: null });
      // Dome Row and Zibzab wait for A3M6.
      expect(entry('codex_everglow_gardens')?.versions.map((v) => v.version)).toEqual(['original']);
      expect(memoIds()[0]).toBe('memo_a3_04');
      expect(memoIds()).not.toContain('memo_a3_05');
    },
  );

  it("files the warren's Gloop Spitter with the tower, and C4 changes no entry", () => {
    loadDevSave('after_a3m4_keep_warren');
    if (!won('a3_m04')) return;
    expect(ids()).toContain('codex_gloop');
    const warren = ids();
    for (const save of ['after_a3m4_purge_warren', 'after_a3m4_rewrite_warren'] as const) {
      loadDevSave(save);
      expect(ids(), save).toEqual(warren);
    }
  });
});

describe("A3M5's Journal and Inbox", () => {
  it.each(['after_a3m5_keep', 'after_a3m5_purge', 'after_a3m5_rewrite'] as const)(
    '%s files the Auditor, the Associate, "Shareholder Value", Boing and the ledger',
    (save) => {
      loadDevSave(save);
      if (!won('a3_m05')) return;
      for (const id of [...A3M4, ...A3M5]) expect(ids(), id).toContain(id);
      expect(entry('codex_kips_ledger')).toMatchObject({ photo: 'R2-0001', picture: null });
      expect(entry('codex_shareholder_value')?.title).toBe('"Shareholder Value"');
      expect(memoIds().slice(0, 2)).toEqual(['memo_a3_05', 'memo_a3_04']);
    },
  );

  it('is the same Journal under every C4 outcome', () => {
    const saves: readonly DevSaveId[] = [
      'after_a3m5_keep',
      'after_a3m5_purge',
      'after_a3m5_rewrite',
    ];
    const lists = saves.map((save) => {
      loadDevSave(save);
      return ids();
    });
    expect(lists[1]).toEqual(lists[0]);
    expect(lists[2]).toEqual(lists[0]);
  });
});

describe("A3M6's Journal and Inbox", () => {
  it('files the Gunship, the Operative, the Gathering Maw, Dome Row and Zibzab corrected', () => {
    loadDevSave('after_a3m6');
    // The dev save skips A3M6 until its map is registered (T722).
    if (!won('a3_m06')) return;
    for (const id of [...A3M4, ...A3M5, ...A3M6, 'codex_gloop']) expect(ids(), id).toContain(id);
    for (const id of ['codex_everglow_gardens', 'codex_zibzab']) {
      expect(
        entry(id)?.versions.map((v) => v.version),
        id,
      ).toEqual(['original', 'corrected']);
    }
    expect(memoIds()[0]).toBe('memo_a3_06');
  });
});

describe('every Act III part two entry has a way in', () => {
  /** The enemy types a registered campaign map sends, waves and script groups both. */
  const sent = new Set<string>(
    CAMPAIGN.flatMap((id) => {
      const map = MAPS[id];
      const groups = [
        ...map.waves.flatMap((w) => w.groups),
        ...Object.values(map.scriptGroups ?? {}),
      ];
      return groups.map((g) => g.enemy);
    }),
  );
  const registered = new Set<string>(CAMPAIGN);
  /** The towers and abilities a briefing gives (the Gloop, the Sproing Pad, System Reboot). */
  const gifts = Object.values(BRIEFING_GIFTS).flatMap((list) =>
    (list ?? []).map((g) => ('tower' in g ? g.tower : g.ability)),
  );

  it.each([...A3M4, 'codex_gloop', ...A3M5, ...A3M6])('%s', (id) => {
    const e = CODEX_ENTRIES.find((x) => x.id === id);
    expect(e, id).toBeDefined();
    const subject = e!.subject;
    if (subject === undefined) return; // A thing: its map's win (codex.test.ts).
    if ('enemy' in subject) {
      // A3M6's units wait for their map (T722).
      if (A3M6.includes(id) && !registered.has('a3_m06')) return;
      expect(sent, id).toContain(subject.enemy);
    } else {
      expect(gifts, id).toContain('tower' in subject ? subject.tower : subject.ability);
    }
  });
});
