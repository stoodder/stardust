// Epilogue card validation (story-runtime.md § Epilogue cards; story/bible.md § 10): the cards fit
// their slots, read only the flags their slot names with values those flags hold, stay within 240
// characters after worst-case token substitution with every token known, and, per slot, every
// combination of the slot's flags resolves to a card (unless the slot is `optional`), with no card
// shadowed by the ones before it. An empty card list is the epilogue not authored yet (T811) and
// passes; the moment one card lands, the whole epilogue must be complete.
import { EPILOGUE_CARDS } from './dialogue/fin/epilogue.ts';
import {
  EPILOGUE_FLAGS,
  EPILOGUE_SLOTS,
  EPILOGUE_SLOT_IDS,
  epilogueMatches,
  type EpilogueCardDef,
  type EpilogueFlag,
  type EpilogueSlotDef,
} from './dialogue/epilogue.ts';
import { FLAGS } from './dialogue/flags.ts';
import { TEXT_LIMITS, tokenProblems, worstCaseLength } from './dialogue/rules.ts';
import { Issues } from './validateHelpers.ts';

/** Every assignment of `flags`' declared values (one empty assignment for no flags). */
export function flagCombinations(
  flags: readonly EpilogueFlag[],
): Readonly<Partial<Record<EpilogueFlag, unknown>>>[] {
  let out: Partial<Record<EpilogueFlag, unknown>>[] = [{}];
  for (const f of flags) {
    const values: readonly unknown[] = FLAGS[f].values;
    out = out.flatMap((combo) => values.map((v) => ({ ...combo, [f]: v })));
  }
  return out;
}

/** `combo` as `flag=value, …` for a message. */
function show(combo: Readonly<Partial<Record<EpilogueFlag, unknown>>>): string {
  const parts = Object.entries(combo).map(([f, v]) => `${f}=${String(v)}`);
  return parts.length === 0 ? 'any save' : parts.join(', ');
}

/** Every epilogue problem in `cards` against `slots`; empty when valid. Never throws. */
export function validateEpilogue(
  cards: readonly EpilogueCardDef[] = EPILOGUE_CARDS,
  slots: readonly EpilogueSlotDef[] = EPILOGUE_SLOTS,
): string[] {
  const issues = new Issues();
  const ids = slots.map((s) => s.id);
  if (ids.join() !== EPILOGUE_SLOT_IDS.join()) {
    issues.add(
      'epilogue',
      'slots',
      `expected ${EPILOGUE_SLOT_IDS.join(', ')}, got ${ids.join(', ')}`,
    );
  }
  for (const s of slots) {
    for (const f of s.flags) {
      if (!EPILOGUE_FLAGS.includes(f)) issues.add('epilogue', `slots.${s.id}`, `reads '${f}'`);
    }
  }
  if (cards.length === 0) return issues.errors;

  cards.forEach((card, i) => {
    const where = `cards[${i}] (${card.slot})`;
    const slot = slots.find((s) => s.id === card.slot);
    if (slot === undefined) {
      issues.add('epilogue', where, `no slot '${String(card.slot)}'`);
      return;
    }
    for (const [f, v] of Object.entries(card.when)) {
      if (!slot.flags.some((own) => own === f)) {
        issues.add('epilogue', where, `reads '${f}', which slot ${slot.id} doesn't list`);
        continue;
      }
      const values: readonly unknown[] = FLAGS[f as EpilogueFlag].values;
      if (!values.includes(v)) issues.add('epilogue', where, `${f} never holds ${String(v)}`);
    }
    if (card.text.trim() === '') issues.add('epilogue', where, 'empty text');
    for (const p of tokenProblems(card.text)) issues.add('epilogue', where, p);
    const len = worstCaseLength(card.text);
    if (len > TEXT_LIMITS.epilogue) {
      issues.add('epilogue', where, `${len} characters at worst, over ${TEXT_LIMITS.epilogue}`);
    }
  });

  for (const slot of slots) {
    const own = cards.filter((c) => c.slot === slot.id);
    const shown = new Set<EpilogueCardDef>();
    for (const combo of flagCombinations(slot.flags)) {
      const card = own.find((c) => epilogueMatches(c, combo));
      if (card !== undefined) shown.add(card);
      else if (slot.optional === undefined) {
        issues.add('epilogue', `slots.${slot.id}`, `no card for ${show(combo)}`);
      }
    }
    for (const c of own) {
      if (!shown.has(c)) {
        issues.add(
          'epilogue',
          `slots.${slot.id}`,
          `a card never shows (an earlier one always matches first): "${c.text.slice(0, 40)}"`,
        );
      }
    }
  }
  return issues.errors;
}
