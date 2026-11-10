// Story transactions (docs/tech/meta-runtime.md § Story transactions): named meta operations the
// story makes on a save, each idempotent, each recording itself so it never applies twice. Pure:
// every one returns a new save (the input is untouched) and what it did.
//
// Built by T500b (the seam: signatures, grant ids, the C2 rule's numbers, run end's step 6 hook)
// and T510 (the bodies).
//
// Which ones run where:
// - **Run end, step 6** (on the run that first wins the map, before the towers it issues and the
//   memos it delivers): A2M4's Q3 Bonus (+400 Stardust, so the bank is full when its debrief offers
//   C2; `memo_a2_04` arrives with step 8), A2M5's gift of the Prism Spire. The table is
//   `RUN_END_TRANSACTIONS`.
// - **Results** (T510, the debrief's choice): C2, `resolveC2`. With an empty bank there is nothing
//   to trade, `stardust_choice = none` (the debrief tests it with the `bank` condition).
// - Later acts add `buyJailbreak`, `inheritAbility`, `resolveC4`, `revokeAbility`, and `openCrate`
//   with their maps (meta-runtime.md lists them).
import type { CampaignMapId } from '../content/campaign.ts';
import type { FlagValueOf } from '../content/dialogue/flags.ts';
import type { MapId, TowerId, UpgradeId } from '../content/types.ts';
import type { SaveData } from './saveData.ts';
import { clampCurrency } from './validate.ts';

/** C2's three outcomes: the `stardust_choice` flag's values (campaign.md § 6.2). */
export type C2Choice = FlagValueOf<'stardust_choice'>;

/** The numbers of the story's grants (design/progression.md § 2.1, its one home). */
export const STORY_TRANSACTION_RULES = {
  /** The Q3 Performance Bonus, paid on A2M4's results (about 1.8× its first clear). */
  q3BonusStardust: 400,
  /** C2 Sell's Intel windfall: `clamp(floor(bank / windfallPer), windfallMin, windfallMax)`. */
  windfallPer: 150,
  windfallMin: 3,
  windfallMax: 8,
} as const;

/** C2 Sell's Zibzab Tune-up: a granted-only upgrade (content/upgrades/tuneUps.ts), owned at rank 1. */
export const ZIBZAB_TUNE_UP: UpgradeId = 'tune_zibzab';

/** The `story.granted` id the Q3 Bonus records (meta-runtime.md § Save system). */
export const Q3_BONUS_GRANT = 'q3_bonus';

/** The `story.granted` id a tower gift records: `gift_<tower>` (A2M5's `gift_prism`). */
export function giftGrantId(tower: TowerId): string {
  return `gift_${tower}`;
}

/**
 * C2 Sell's Intel windfall for a bank of `bank` Stardust (progression.md § 2.1): one Intel per
 * 150, at least 3 and at most 8 (the cap is what keeps hoarding before A2M4 from paying; open
 * question 7).
 */
export function c2Windfall(bank: number): number {
  const r = STORY_TRANSACTION_RULES;
  return Math.min(
    r.windfallMax,
    Math.max(r.windfallMin, Math.floor(Math.max(0, bank) / r.windfallPer)),
  );
}

/** What a story transaction did, for Results and the run-end summary. */
export type StoryTransaction =
  | { readonly kind: 'q3_bonus'; readonly stardust: number }
  | { readonly kind: 'gift'; readonly tower: TowerId }
  /**
   * C2, as resolved: the bank it took (0 for `none`), the Intel windfall (Sell only), and whether
   * the Zibzab Tune-up was granted (Sell only).
   */
  | {
      readonly kind: 'c2';
      readonly choice: C2Choice;
      readonly bank: number;
      readonly intel: number;
      readonly tuneUp: boolean;
    };

/** A transaction's result: the new save, and what it did (null when it had already applied). */
export interface TransactionResult {
  readonly save: SaveData;
  readonly applied: StoryTransaction | null;
}

/**
 * The Q3 Performance Bonus (progression.md § 2.1): +400 Stardust (the bank clamped like any
 * payout), recorded as `q3_bonus` in `story.granted`, once per save. Run end's step 6 pays it on
 * A2M4's first win.
 */
export function grantQ3Bonus(save: SaveData): TransactionResult {
  if (save.story.granted.includes(Q3_BONUS_GRANT)) return { save, applied: null };
  const stardust = STORY_TRANSACTION_RULES.q3BonusStardust;
  return {
    save: {
      ...save,
      currencies: {
        ...save.currencies,
        stardust: clampCurrency(save.currencies.stardust + stardust),
      },
      story: { ...save.story, granted: [...save.story.granted, Q3_BONUS_GRANT] },
    },
    applied: { kind: 'q3_bonus', stardust },
  };
}

/**
 * C2, Zibzab's Price (progression.md § 2.1), for the whole bank, on A2M4's Results:
 * - `sold`: the bank goes to 0, Intel + `c2Windfall(bank)`, and the Zibzab Tune-up (its upgrade
 *   at rank 1);
 * - `returned`: the bank goes to 0 (his fee is an IOU, never cashed);
 * - `none`: only with an empty bank, nothing changes but the flag.
 * Each sets `stardust_choice`; a save whose flag is already set is left as it is (C2 is offered
 * once), so the transaction is idempotent without a `story.granted` id. A choice the bank doesn't
 * allow (`none` with Stardust banked, a trade with none) is a caller's bug and throws: the
 * debrief offers the trade only when its `bank` test finds Stardust.
 */
export function resolveC2(save: SaveData, choice: C2Choice): TransactionResult {
  if (save.story.flags.stardust_choice !== undefined) return { save, applied: null };
  const bank = Math.max(0, save.currencies.stardust);
  if ((choice === 'none') !== (bank === 0)) {
    throw new Error(`story: C2 '${choice}' with a bank of ${bank} Stardust`);
  }
  const sold = choice === 'sold';
  const intel = sold ? c2Windfall(bank) : 0;
  return {
    save: {
      ...save,
      currencies: { stardust: 0, intel: clampCurrency(save.currencies.intel + intel) },
      upgrades: sold ? { ...save.upgrades, [ZIBZAB_TUNE_UP]: 1 } : save.upgrades,
      story: { ...save.story, flags: { ...save.story.flags, stardust_choice: choice } },
    },
    applied: { kind: 'c2', choice, bank, intel, tuneUp: sold },
  };
}

/**
 * A tower given by the story (A2M5: Ves'thara's Prism Spire): added to `unlocks.towers`, recorded
 * as `giftGrantId(tower)` in `story.granted`, once (a tower the save already owns records the
 * grant and adds nothing; `applied` still names the gift, so Results can say it was given).
 */
export function grantGift(save: SaveData, tower: TowerId): TransactionResult {
  const id = giftGrantId(tower);
  if (save.story.granted.includes(id)) return { save, applied: null };
  const owned = save.unlocks.towers.includes(tower);
  return {
    save: {
      ...save,
      unlocks: owned ? save.unlocks : { ...save.unlocks, towers: [...save.unlocks.towers, tower] },
      story: { ...save.story, granted: [...save.story.granted, id] },
    },
    applied: { kind: 'gift', tower },
  };
}

/** A transaction run end makes on a map's first win (step 6). */
export type RunEndTransactionDef =
  { readonly kind: 'q3_bonus' } | { readonly kind: 'gift'; readonly tower: TowerId };

/**
 * Each map's run-end transactions, in order (campaign data: story/campaign/act2.md, A2M4's
 * *Results* and A2M5's *Debrief*).
 */
export const RUN_END_TRANSACTIONS: Readonly<
  Partial<Record<CampaignMapId, readonly RunEndTransactionDef[]>>
> = {
  a2_m04: [{ kind: 'q3_bonus' }],
  a2_m05: [{ kind: 'gift', tower: 'prism' }],
};

/** What run end's step 6 reads about the run. */
export interface RunEndTransactionInput {
  readonly mapId: MapId;
  readonly won: boolean;
  /** The map was won before this run (a replay never transacts again). */
  readonly wonBefore: boolean;
}

/** Step 6's result: the save after the map's transactions, and what each did, in order. */
export interface RunEndTransactions {
  readonly save: SaveData;
  readonly transactions: readonly StoryTransaction[];
}

/**
 * Run end's step 6 (meta-runtime.md § Run end): on the run that first wins `mapId`, its
 * `RUN_END_TRANSACTIONS` in order; nothing on a loss or a replay. Each transaction is idempotent
 * on its own, so a save that already holds a grant is never paid twice.
 */
export function runEndTransactions(
  save: SaveData,
  input: RunEndTransactionInput,
  table: Readonly<Partial<Record<string, readonly RunEndTransactionDef[]>>> = RUN_END_TRANSACTIONS,
): RunEndTransactions {
  if (!input.won || input.wonBefore) return { save, transactions: [] };
  let next = save;
  const transactions: StoryTransaction[] = [];
  for (const def of table[input.mapId] ?? []) {
    const r = def.kind === 'q3_bonus' ? grantQ3Bonus(next) : grantGift(next, def.tower);
    next = r.save;
    if (r.applied !== null) transactions.push(r.applied);
  }
  return { save: next, transactions };
}
