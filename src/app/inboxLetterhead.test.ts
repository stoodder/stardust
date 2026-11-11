// The Inbox's letterheads (T713 for T711; art-direction § Menu screens): each memo's view carries
// its `MemoDef.letterhead`, which the reader draws (ui/screens/Inbox.tsx), never guessed from its
// sender: Acts I–II on the full letterhead, Sterling's `memo_a3_01` on Act III's worn one (she
// still signs it), the automated memos from A3M2 on the sunless one; a form's is unread.
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../meta/index.ts';
import { MEMOS } from '../content/memos/index.ts';
import { inboxView } from './inbox.ts';
import { initSaves, loadDevSave } from './save.ts';

describe('letterheads', () => {
  beforeEach(() => initSaves(new MemoryStore()));

  it("files Sterling's memo_a3_01 worn and the automated ones automated", () => {
    expect(loadDevSave('after_a3m4_keep')).toBe(true);
    const look = new Map(inboxView().map((m) => [m.id, m.letterhead]));
    expect(look.get('memo_a3_01')).toBe('worn');
    expect(look.get('memo_a3_02')).toBe('automated');
    expect(look.get('memo_a1_00')).toBe('full');
  });

  it('reads the data, not the sender: every view matches its memo', () => {
    expect(loadDevSave('after_a3m4_keep')).toBe(true);
    for (const m of inboxView()) {
      expect(m.letterhead, m.id).toBe(MEMOS[m.id]?.letterhead ?? 'full');
    }
  });
});
