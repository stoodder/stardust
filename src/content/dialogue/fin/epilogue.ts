// The epilogue cards' words (story/bible.md § 10 *Epilogue cards*, the canon drafts; final text is
// this data), written by T811 (finale.md first). One card per slot and condition, in slot order;
// in each slot the first matching card shows, so a slot's catch-all (`when: {}`) goes last. The
// slots, the flags each may read, and which may show nothing are content/dialogue/epilogue.ts's;
// content/validateEpilogue.ts checks the cards against them (every flag combination resolves each
// slot that must show a card; ≤ 240 characters after worst-case tokens) once any card is authored.
import type { EpilogueCardDef } from '../epilogue.ts';

export const EPILOGUE_CARDS: readonly EpilogueCardDef[] = [];
