// The epilogue cards' validator and resolution (T800b; story/bible.md § 10): a complete card set
// passes, every flag combination resolves each slot that must show a card, and the validator
// rejects an unresolved slot, a card past 240 characters, an unknown token, a flag its slot doesn't
// read, a value its flag never holds, and a card shadowed by the ones before it.
import { describe, expect, it } from 'vitest';
import {
  EPILOGUE_SLOTS,
  EPILOGUE_SLOT_IDS,
  epilogueFor,
  type EpilogueCardDef,
} from './dialogue/epilogue.ts';
import { EPILOGUE_CARDS } from './dialogue/fin/epilogue.ts';
import { flagCombinations, validateEpilogue } from './validateEpilogue.ts';

/** A complete card set in bible.md § 10's shape (placeholder words; T811 writes the real ones). */
const CARDS: readonly EpilogueCardDef[] = [
  { slot: 'world', when: { ending_choice: 'stay' }, text: 'The domes came down pane by pane.' },
  {
    slot: 'world',
    when: { ending_choice: 'go' },
    text: 'The last freighter lifted at first light.',
  },
  // Card 2: the convoy's Go variant first, so it wins over the convoy's own.
  {
    slot: 'bricks',
    when: { door_choice: 'convoy', ending_choice: 'go' },
    text: 'HE HELD THE DOOR. The Skitterkin keep it clean.',
  },
  { slot: 'bricks', when: { door_choice: 'convoy' }, text: 'Goldie admits to the second coat.' },
  { slot: 'bricks', when: { door_choice: 'warren' }, text: "It translates, roughly, to 'Bricks.'" },
  { slot: 'thrum_pebble', when: { spared_quiet_wave: true }, text: 'You got taller every time.' },
  { slot: 'thrum_pebble', when: { spared_quiet_wave: false }, text: 'She always looks up.' },
  ...(['purge', 'keep', 'rewrite'] as const).flatMap((q) =>
    (['stay', 'go'] as const).map((e): EpilogueCardDef => ({
      slot: 'quill',
      when: { quill_choice: q, ending_choice: e },
      text: `QUILL, ${q}, ${e}.`,
    })),
  ),
  { slot: 'the_dead', when: { stardust_choice: 'returned' }, text: 'He has never cashed it.' },
  { slot: 'the_dead', when: { stardust_choice: 'sold' }, text: 'SOMEONE’S.' },
  { slot: 'vesthara', when: {}, text: 'She will be sung.' },
  { slot: 'zibzab', when: {}, text: 'SOME THINGS YOU GIVE BACK.' },
  { slot: 'goldie', when: { ending_choice: 'stay' }, text: 'Very crunchy water.' },
  { slot: 'goldie', when: { ending_choice: 'go' }, text: 'Nobody reported her.' },
  { slot: 'kip', when: { ending_choice: 'go' }, text: 'Listen.' },
  { slot: 'kip', when: { ending_choice: 'stay' }, text: 'Nobody left.' },
  { slot: 'sterling', when: { ending_choice: 'stay' }, text: 'It contained none.' },
  { slot: 'sterling', when: { ending_choice: 'go' }, text: 'It did not help.' },
  { slot: 'gerald', when: {}, text: 'Signature: received.' },
  { slot: 'you', when: { arrival_reason: 'family', ending_choice: 'go' }, text: 'By a lake.' },
  {
    slot: 'you',
    when: { arrival_reason: 'family', ending_choice: 'stay' },
    text: 'You sent the road.',
  },
  { slot: 'you', when: { ending_choice: 'go' }, text: 'Just a stone.' },
  { slot: 'final', when: {}, text: 'REMEMBERED: {pests_processed}' },
];

describe('the epilogue (bible.md § 10)', () => {
  it('has its 13 slots in order; the live cards are T811’s (empty until then) and valid', () => {
    expect(EPILOGUE_SLOTS.map((s) => s.id)).toEqual([...EPILOGUE_SLOT_IDS]);
    expect(EPILOGUE_SLOTS).toHaveLength(13);
    expect(EPILOGUE_SLOTS.filter((s) => s.optional !== undefined).map((s) => s.id)).toEqual([
      'the_dead',
      'you',
    ]);
    expect(validateEpilogue()).toEqual([]);
    expect(validateEpilogue(EPILOGUE_CARDS)).toEqual([]);
  });

  it('accepts a complete set: every flag combination resolves every required slot', () => {
    expect(validateEpilogue(CARDS)).toEqual([]);
    // Every combination of every epilogue flag shows one card per required slot, in slot order.
    const all = flagCombinations([
      'arrival_reason',
      'spared_quiet_wave',
      'stardust_choice',
      'door_choice',
      'quill_choice',
      'ending_choice',
    ]);
    expect(all).toHaveLength(3 * 2 * 3 * 2 * 3 * 2);
    for (const flags of all) {
      const shown = epilogueFor(flags, CARDS).map((c) => c.slot);
      const required = EPILOGUE_SLOTS.filter((s) => s.optional === undefined).map((s) => s.id);
      expect(shown.filter((s) => required.includes(s))).toEqual(required);
      expect(shown).toEqual(EPILOGUE_SLOT_IDS.filter((id) => shown.includes(id)));
    }
  });

  it("resolves first match: the convoy's Go card over its Stay card", () => {
    const flags = { door_choice: 'convoy', ending_choice: 'go' } as const;
    expect(epilogueFor(flags, CARDS).find((c) => c.slot === 'bricks')?.text).toMatch(/clean/);
    const stay = { door_choice: 'convoy', ending_choice: 'stay' } as const;
    expect(epilogueFor(stay, CARDS).find((c) => c.slot === 'bricks')?.text).toMatch(/second coat/);
    // An optional slot shows nothing where it has no card (C2's `none`, Stay without `family`);
    // Go's catch-all shows the jar where `family`'s card doesn't match.
    const none = {
      stardust_choice: 'none',
      arrival_reason: 'lettuce',
      ending_choice: 'stay',
    } as const;
    const slots = epilogueFor(none, CARDS).map((c) => c.slot);
    expect(slots).not.toContain('the_dead');
    expect(slots).not.toContain('you');
    const go = { arrival_reason: 'lettuce', ending_choice: 'go' } as const;
    expect(epilogueFor(go, CARDS).find((c) => c.slot === 'you')?.text).toBe('Just a stone.');
    const family = { arrival_reason: 'family', ending_choice: 'go' } as const;
    expect(epilogueFor(family, CARDS).find((c) => c.slot === 'you')?.text).toBe('By a lake.');
  });

  it('rejects an unresolved slot', () => {
    const noGo = CARDS.filter((c) => !(c.slot === 'kip' && c.when.ending_choice === 'go'));
    expect(validateEpilogue(noGo)).toEqual(['[epilogue] slots.kip: no card for ending_choice=go']);
    const noWarren = CARDS.filter((c) => !(c.slot === 'bricks' && c.when.door_choice === 'warren'));
    expect(validateEpilogue(noWarren).join('\n')).toMatch(
      /slots\.bricks: no card for door_choice=warren, ending_choice=stay/,
    );
  });

  it('rejects text past 240 characters at worst, and unknown tokens', () => {
    const long = { slot: 'gerald', when: {}, text: 'x'.repeat(241) } as const;
    expect(validateEpilogue([long, ...CARDS]).join('\n')).toMatch(/241 characters at worst/);
    // {name} counts at its worst case (16), so 230 letters and a name are over.
    const named = { slot: 'gerald', when: {}, text: `${'x'.repeat(230)} {name}` } as const;
    expect(validateEpilogue([named, ...CARDS]).join('\n')).toMatch(/over 240/);
    const token = { slot: 'gerald', when: {}, text: 'REMEMBERED: {n}' } as const;
    expect(validateEpilogue([token, ...CARDS]).join('\n')).toMatch(/cards\[0\] \(gerald\)/);
  });

  it("rejects a flag its slot doesn't read, a value its flag never holds, and a shadowed card", () => {
    const foreign = { slot: 'zibzab', when: { door_choice: 'warren' }, text: 'Hm.' } as const;
    expect(validateEpilogue([foreign, ...CARDS]).join('\n')).toMatch(
      /reads 'door_choice', which slot zibzab doesn't list/,
    );
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value the flag never holds
    const value = {
      slot: 'kip',
      when: { ending_choice: 'maybe' },
      text: 'Hm.',
    } as unknown as EpilogueCardDef;
    expect(validateEpilogue([value, ...CARDS]).join('\n')).toMatch(
      /ending_choice never holds maybe/,
    );
    const shadowed = [...CARDS, { slot: 'gerald', when: {}, text: 'Never.' } as const];
    expect(validateEpilogue(shadowed).join('\n')).toMatch(/slots\.gerald: a card never shows/);
  });
});
