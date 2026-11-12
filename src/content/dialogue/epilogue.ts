// The epilogue cards' shape, slots, and resolution (story/bible.md § 10 *Epilogue cards*;
// design/core-loop.md § 6.8; story-runtime.md § Epilogue cards). After C5, the epilogue shows one
// card per slot, in slot order, over the credits: each slot's first card whose `when` matches the
// save's flags. The cards' words are T811's, in `fin/epilogue.ts` (`EPILOGUE_CARDS`); the slots and
// the flags each may read are here, so content validation (content/validateEpilogue.ts) can prove
// every flag combination resolves every slot that must show a card. The cards are the finale's, so
// they load with its chunk (content/acts/fin.ts, which registers them here; T802): nothing here
// imports them, and `epilogueFor` throws until they're registered rather than show no cards.
import { FLAGS, type FlagValueOf } from './flags.ts';

/** The flags an epilogue card may read (bible.md § 10's conditions), in the ledger's order. */
export const EPILOGUE_FLAGS = [
  'arrival_reason',
  'spared_quiet_wave',
  'stardust_choice',
  'door_choice',
  'quill_choice',
  'ending_choice',
] as const;
export type EpilogueFlag = (typeof EPILOGUE_FLAGS)[number];

/** Whether `id` names a flag an epilogue card may read. */
export function isEpilogueFlag(id: string): id is EpilogueFlag {
  return EPILOGUE_FLAGS.some((f) => f === id);
}

/** A card's condition: every flag it names holds that value (an unset flag reads its default). */
export type EpilogueWhen = { readonly [F in EpilogueFlag]?: FlagValueOf<F> };

/** The epilogue's slots, by id, in the order they show (bible.md § 10's #1–#13). */
export const EPILOGUE_SLOT_IDS = [
  'world',
  'bricks',
  'thrum_pebble',
  'quill',
  'the_dead',
  'vesthara',
  'zibzab',
  'goldie',
  'kip',
  'sterling',
  'gerald',
  'you',
  'final',
] as const;
export type EpilogueSlotId = (typeof EPILOGUE_SLOT_IDS)[number];

/** One epilogue card: its slot, when it shows (first match in the slot wins), and its text. */
export interface EpilogueCardDef {
  readonly slot: EpilogueSlotId;
  /** `{}` matches every save (a slot's last card, or its only one). */
  readonly when: EpilogueWhen;
  /** ≤ 240 characters after worst-case token substitution (TEXT_LIMITS.epilogue). */
  readonly text: string;
}

/** One slot: the flags its cards may read, and whether some saves show no card in it. */
export interface EpilogueSlotDef {
  readonly id: EpilogueSlotId;
  readonly flags: readonly EpilogueFlag[];
  /**
   * Why a flag combination may show no card here (bible.md § 10 gives the slot a card for only
   * some values). A slot without it must resolve for every combination of its flags.
   */
  readonly optional?: string;
  /** The counter card: PESTS PROCESSED: 0 flips to REMEMBERED: {n} (T810 draws the flip). */
  readonly counter?: true;
}

/** The slots, in order (bible.md § 10). */
export const EPILOGUE_SLOTS: readonly EpilogueSlotDef[] = [
  { id: 'world', flags: ['ending_choice'] },
  { id: 'bricks', flags: ['door_choice', 'ending_choice'] },
  { id: 'thrum_pebble', flags: ['spared_quiet_wave'] },
  { id: 'quill', flags: ['quill_choice', 'ending_choice'] },
  {
    id: 'the_dead',
    flags: ['stardust_choice'],
    optional: '`none`: an empty bank at C2 sold and returned nothing (bible.md § 9, C2)',
  },
  { id: 'vesthara', flags: [] },
  { id: 'zibzab', flags: [] },
  { id: 'goldie', flags: ['ending_choice'] },
  { id: 'kip', flags: ['ending_choice'] },
  { id: 'sterling', flags: ['ending_choice'] },
  { id: 'gerald', flags: [] },
  {
    id: 'you',
    flags: ['arrival_reason', 'ending_choice'],
    optional: "only `family` has a card: the residency points C5's form names",
  },
  { id: 'final', flags: [], counter: true },
];

/** The value `flag` reads in `flags`: its own, else the registry default (null for a choice). */
function readFlag(
  flags: Readonly<Partial<Record<EpilogueFlag, unknown>>>,
  flag: EpilogueFlag,
): unknown {
  return Object.hasOwn(flags, flag) ? flags[flag] : FLAGS[flag].default;
}

/** Whether `card` shows over `flags`. */
export function epilogueMatches(
  card: Pick<EpilogueCardDef, 'when'>,
  flags: Readonly<Partial<Record<EpilogueFlag, unknown>>>,
): boolean {
  return Object.entries(card.when).every(([f, v]) => isEpilogueFlag(f) && readFlag(flags, f) === v);
}

const registered: EpilogueCardDef[] = [];

/** Registers the epilogue's cards (the finale's chunk does: content/acts `registerActStory`). */
export function registerEpilogueCards(cards: readonly EpilogueCardDef[]): void {
  registered.length = 0;
  registered.push(...cards);
}

/** The registered cards: empty until the finale's chunk has loaded (app/actContent.ts). */
export function epilogueCards(): readonly EpilogueCardDef[] {
  return registered;
}

/**
 * The cards the epilogue shows over `flags`: per slot in `slots` order, the first of `cards` in it
 * that matches (a slot with none shows nothing). `cards` defaults to the registered ones, and
 * throws while none are (the finale's chunk hasn't loaded), so a screen can't show no epilogue.
 */
export function epilogueFor(
  flags: Readonly<Partial<Record<EpilogueFlag, unknown>>>,
  cards?: readonly EpilogueCardDef[],
  slots: readonly EpilogueSlotDef[] = EPILOGUE_SLOTS,
): EpilogueCardDef[] {
  const list = cards ?? registered;
  if (list.length === 0) {
    throw new Error("epilogueFor: no epilogue cards registered (the finale's chunk hasn't loaded)");
  }
  return slots.flatMap((s) => {
    const card = list.find((c) => c.slot === s.id && epilogueMatches(c, flags));
    return card === undefined ? [] : [card];
  });
}
