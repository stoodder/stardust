// The epilogue cards' words (T811; bible.md § 10): the validator passes on the live cards (every
// flag combination resolves each slot that must show one, ≤ 240 characters at worst), and a few
// whole saves read as the bible's endings: Stay and Go each end on the counter card, `family` adds
// its card, and C2's `none` shows nothing in its slot.
import { describe, expect, it } from 'vitest';
import { validateEpilogue } from '../../validateEpilogue.ts';
import { EPILOGUE_SLOT_IDS, epilogueFor } from '../epilogue.ts';
import { EPILOGUE_CARDS } from './epilogue.ts';

describe('the epilogue cards (T811)', () => {
  it('pass the epilogue validation, every slot authored', () => {
    expect(EPILOGUE_CARDS.length).toBeGreaterThan(0);
    expect(validateEpilogue()).toEqual([]);
    const slots = new Set(EPILOGUE_CARDS.map((c) => c.slot));
    for (const s of EPILOGUE_SLOT_IDS) expect(slots.has(s), s).toBe(true);
  });

  it('reads a Stay save as the bible does, ending on the counter card', () => {
    const cards = epilogueFor({
      ending_choice: 'stay',
      door_choice: 'convoy',
      spared_quiet_wave: true,
      quill_choice: 'rewrite',
      stardust_choice: 'returned',
      arrival_reason: 'family',
    });
    expect(cards.map((c) => c.slot)).toEqual([...EPILOGUE_SLOT_IDS]);
    expect(cards[1]?.text).toMatch(/^In Wayside/);
    expect(cards.at(-1)?.text).toBe('REMEMBERED: {pests_processed}');
  });

  it('reads a Go save, with no card for an empty bank or an arrival other than family', () => {
    const cards = epilogueFor({
      ending_choice: 'go',
      door_choice: 'convoy',
      spared_quiet_wave: false,
      quill_choice: 'purge',
      stardust_choice: 'none',
      arrival_reason: 'lettuce',
    });
    const slots = cards.map((c) => c.slot);
    expect(slots).not.toContain('the_dead');
    expect(slots).not.toContain('you');
    expect(cards.find((c) => c.slot === 'bricks')?.text).not.toContain('Wayside');
    expect(cards.find((c) => c.slot === 'world')?.text).toMatch(/^The last freighter/);
  });

  it("never names Wayside in a Go card (Wayside is the Stay ending's name)", () => {
    for (const c of EPILOGUE_CARDS) {
      if (c.when.ending_choice === 'go') expect(c.text, c.slot).not.toContain('Wayside');
    }
  });
});
