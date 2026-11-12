// Story transactions (docs/tech/meta-runtime.md § Story transactions): named meta operations the
// story makes on a save, each idempotent, each recording itself so it never applies twice. Pure:
// every one returns a new save (the input is untouched) and what it did.
//
// Built by T500b (the seam: signatures, grant ids, the C2 rule's numbers, run end's step 6 hook)
// and T510 (the bodies); Act III part one's (T600b): the briefing gifts, the run-end gift's
// condition, revocation with the Mk II refund, and C3.
//
// Which ones run where:
// - **Run end, step 6** (on the run that first wins the map, before the towers it issues and the
//   memos it delivers): A2M4's Q3 Bonus (+400 Stardust, so the bank is full when its debrief offers
//   C2; `memo_a2_04` arrives with step 8), A2M5's gift of the Prism Spire. The table is
//   `RUN_END_TRANSACTIONS`.
// - **Results** (the debrief's choice; app/resultsFlow.ts): C2, `resolveC2`. With an empty bank
//   there is nothing to trade, `stardust_choice = none` (the debrief tests it with the `bank`
//   condition).
// - **Run end, step 3** (on the run that first wins the map; `runEndRevocations`): the classes and
//   abilities the run revoked (A3M2's Clean Exit: `revokeTower`, `revokeAbility` with Orbital
//   Strike Mk II's Intel refunded).
// - **The briefing** (as the map's loadout first opens; `briefingGifts`): A3M1's Scuttle Den. C3,
//   `setDoorChoice`, is committed as A3M3's briefing closes.
// - Act III part two (M7; T700b's seams, T710's bodies): `buyJailbreak` (the base's Shop, after
//   A3M3), `inheritAbility` (A3M4's mail scene at run end's step 6; C4 Keep), `resolveC4` (A3M4's
//   card), `openCrate` (as A3M6's briefing closes), each beside its table (`JAILBREAK`,
//   `INHERITED_ABILITIES`, `C4_EFFECTS`, `CRATE`); C4's effects in play are `C4_IN_PLAY`.
// - The finale (M8; T800b's seam, T810's body): `resolveC5` (C5, after the finale's card and
//   Sterling's memo; `RESULTS_FLOW.fin_m01.ending`), committed as C5's scene ends.
import { ABILITIES } from '../content/abilities/index.ts';
import type { CampaignMapId } from '../content/campaign.ts';
import { FLAGS, type FlagValueOf } from '../content/dialogue/flags.ts';
import type { Condition } from '../content/dialogue/types.ts';
import type { MemoId } from '../content/memos/types.ts';
import { TOWERS } from '../content/towers/index.ts';
import type {
  AbilityId,
  IdSpace,
  MapId,
  ProtocolId,
  TowerFaction,
  TowerId,
  UpgradeId,
} from '../content/types.ts';
import { PROTOCOLS, UPGRADES } from '../content/upgrades/index.ts';
import type { Currency } from '../content/upgrades/types.ts';
import type { Modifier } from '../sim/index.ts';
import { evaluateCondition } from '../story/conditions.ts';
import { isMapWon } from './progress.ts';
import type { SaveData } from './saveData.ts';
import { baseStoryContext } from './story.ts';
import { clampCurrency } from './validate.ts';

/** C2's three outcomes: the `stardust_choice` flag's values (campaign.md § 6.2). */
export type C2Choice = FlagValueOf<'stardust_choice'>;
/** C3's two doors: the `door_choice` flag's values (campaign.md § 6.2). */
export type C3Choice = FlagValueOf<'door_choice'>;

/** The numbers of the story's grants (design/progression.md § 2.1, its one home). */
export const STORY_TRANSACTION_RULES = {
  /** The Q3 Performance Bonus, paid on A2M4's results (about 1.8× its first clear). */
  q3BonusStardust: 400,
  /** C2 Sell's Intel windfall: `clamp(floor(bank / windfallPer), windfallMin, windfallMax)`. */
  windfallPer: 150,
  windfallMin: 3,
  windfallMax: 8,
  /** The jailbreak's price at Zibzab's (towers.md § 9); free under `door_choice = convoy`. */
  jailbreakStardust: 300,
} as const;

/** C2 Sell's Zibzab Tune-up: a granted-only upgrade (content/upgrades/tuneUps.ts), owned at rank 1. */
export const ZIBZAB_TUNE_UP: UpgradeId = 'tune_zibzab';

/** The `story.granted` id the Q3 Bonus records (meta-runtime.md § Save system). */
export const Q3_BONUS_GRANT = 'q3_bonus';

/**
 * The Q3 Bonus's memo, which arrives on A2M4's results card with it (core-loop.md § 6.4): step 8
 * delivers it to the Inbox like any memo due, and Results shows it beside the +400.
 */
export const Q3_BONUS_MEMO: MemoId = 'memo_a2_04';

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
  /** An ability the story gave (A3M4's briefing: QUILL patches in System Reboot). */
  | { readonly kind: 'gift_ability'; readonly ability: AbilityId }
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
    }
  /**
   * A companion ability inherited into slot 1 (A3M4's mail: Suppressing Fire, run end's step 6),
   * and C4 as committed on Results (Keep's Time Dilation, Purge's Rapport refund).
   */
  | Extract<ActThreeTwoTransaction, { readonly kind: 'inherit' | 'c4' }>;

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

/**
 * A transaction run end makes on a map's first win (step 6). A gift with a `when` is given only
 * when it holds over the save as step 6 finds it (`baseStoryContext`: its flags, so A3M1's Hum
 * Choir comes at its debrief only under `spared_quiet_wave`, else in A3M4's briefing).
 */
export type RunEndTransactionDef =
  | { readonly kind: 'q3_bonus' }
  | { readonly kind: 'gift'; readonly tower: TowerId; readonly when?: Condition }
  /** A companion ability inherited into slot 1 (`inheritAbility`; A3M4's mail). */
  | { readonly kind: 'inherit'; readonly ability: AbilityId };

/**
 * Each map's run-end transactions, in order (campaign data: story/campaign/act2.md, A2M4's
 * *Results* and A2M5's *Debrief*; act3.md § A3M1's *Gifts*: the Hum Choir, Thrum's ring, if
 * spared; cleared, the shelter elders give it in A3M4's briefing, M7).
 */
export const RUN_END_TRANSACTIONS: Readonly<
  Partial<Record<CampaignMapId, readonly RunEndTransactionDef[]>>
> = {
  a2_m04: [{ kind: 'q3_bonus' }],
  a2_m05: [{ kind: 'gift', tower: 'prism' }],
  a3_m01: [{ kind: 'gift', tower: 'choir', when: { flag: 'spared_quiet_wave', eq: true } }],
  // act3.md § A3M4's mail scene (D146): the fire-control key, Bricks's Suppressing Fire, on the
  // first win, so a closed tab on the scene or the card never loses it.
  a3_m04: [{ kind: 'inherit', ability: 'suppressing_fire' }],
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
    if (def.kind === 'gift' && def.when !== undefined) {
      if (!evaluateCondition(def.when, baseStoryContext(next))) continue;
    }
    if (def.kind === 'inherit') {
      const r = inheritAbility(next, def.ability);
      if (!r.ok) throw new Error(r.message);
      next = r.save;
      if (r.applied?.kind === 'inherit') transactions.push(r.applied);
      continue;
    }
    const r = def.kind === 'q3_bonus' ? grantQ3Bonus(next) : grantGift(next, def.tower);
    next = r.save;
    if (r.applied !== null) transactions.push(r.applied);
  }
  return { save: next, transactions };
}

// ─── Act III part one (T600b): briefing gifts, revocation, C3 ───────────────────────────────────

/**
 * One gift a map's briefing gives: a tower or a Technician ability, given only when `when` holds
 * over the save as the briefing finds it (`baseStoryContext`: its flags, so A3M4's Gloop Spitter
 * comes only under `door_choice = warren`).
 */
export type BriefingGiftDef =
  | { readonly tower: TowerId; readonly when?: Condition }
  | { readonly ability: AbilityId; readonly when?: Condition };

/**
 * The gifts each map's briefing gives (campaign.md § 4.1's *Gift* rows given "in the briefing";
 * act3.md *Facts*), granted as the map's loadout first opens (D141), so a gift can be picked for
 * that very map:
 * - A3M1: Bramble's Scuttle Den.
 * - A3M4: System Reboot (QUILL patched it in); the Hum Choir, from the shelter elders, if A3M1's
 *   debrief didn't give it (`grantGift` only records a tower already owned); the warren's Gloop
 *   Spitter under `door_choice = warren`.
 * - A3M5: Pebble's friend Boing, the Sproing Pad.
 * - A3M6: Goldie's Gloop Spitter under `door_choice = convoy` (the warren's came in A3M4).
 */
export const BRIEFING_GIFTS: Readonly<Partial<Record<CampaignMapId, readonly BriefingGiftDef[]>>> =
  {
    a3_m01: [{ tower: 'burrow' }],
    a3_m04: [
      { ability: 'system_reboot' },
      { tower: 'choir' },
      { tower: 'gloop', when: { flag: 'door_choice', eq: 'warren' } },
    ],
    a3_m05: [{ tower: 'sproing' }],
    a3_m06: [{ tower: 'gloop', when: { flag: 'door_choice', eq: 'convoy' } }],
  };

/** The `story.granted` id an ability gift records: `gift_<ability>` (A3M4's `gift_system_reboot`). */
export function abilityGiftGrantId(ability: AbilityId): string {
  return `gift_${ability}`;
}

/**
 * A Technician ability given by the story (A3M4's briefing: System Reboot): added to
 * `unlocks.abilities`, recorded as `abilityGiftGrantId(ability)`, once (one already owned is only
 * recorded, and `applied` still names it).
 */
export function grantAbilityGift(save: SaveData, ability: AbilityId): TransactionResult {
  const id = abilityGiftGrantId(ability);
  if (save.story.granted.includes(id)) return { save, applied: null };
  const owned = save.unlocks.abilities.includes(ability);
  return {
    save: {
      ...save,
      unlocks: owned
        ? save.unlocks
        : { ...save.unlocks, abilities: [...save.unlocks.abilities, ability] },
      story: { ...save.story, granted: [...save.story.granted, id] },
    },
    applied: { kind: 'gift_ability', ability },
  };
}

/**
 * The briefing gifts of `map` (`BRIEFING_GIFTS`, each through `grantGift` or `grantAbilityGift`, so
 * once a save; one whose `when` doesn't hold over the save is skipped, and given on a later
 * briefing if it comes to hold): what the app calls as the map's loadout first opens (or the battle
 * starts, with no loadout screen). A map with none leaves the save as it is.
 */
export function briefingGifts(
  save: SaveData,
  map: CampaignMapId,
  table: Readonly<Partial<Record<string, readonly BriefingGiftDef[]>>> = BRIEFING_GIFTS,
): RunEndTransactions {
  let next = save;
  const transactions: StoryTransaction[] = [];
  for (const gift of table[map] ?? []) {
    if (gift.when !== undefined && !evaluateCondition(gift.when, baseStoryContext(next))) continue;
    const r = 'tower' in gift ? grantGift(next, gift.tower) : grantAbilityGift(next, gift.ability);
    next = r.save;
    if (r.applied !== null) transactions.push(r.applied);
  }
  return { save: next, transactions };
}

/**
 * The R&D upgrade whose price is refunded when an ability is revoked (progression.md § 7.3:
 * Orbital Strike Mk II, "Refunded when the uplink is revoked in A3M2").
 */
export const REVOCATION_REFUNDS: Readonly<Partial<Record<AbilityId, UpgradeId>>> = {
  orbital_strike: 'orbital_strike_mk2',
};

/** A revocation, C3, as made on the save (Results and the run-end summary read them). */
export type RevocationTransaction =
  | { readonly kind: 'revoke_tower'; readonly tower: TowerId }
  /**
   * An ability revoked, with what was refunded for it: the upgrade, its currency, and the price of
   * every rank the save owned (null when it owned none).
   */
  | {
      readonly kind: 'revoke_ability';
      readonly ability: AbilityId;
      readonly refund: UpgradeRefund | null;
    };

/** C3 as committed: the door Bricks holds. */
export interface C3Transaction {
  readonly kind: 'c3';
  readonly choice: C3Choice;
}

/**
 * A tower class revoked for good (A3M2's Clean Exit; until the jailbreak, M7): it joins
 * `unlocks.revokedTowers`, so the loadout no longer offers it (meta/pools.ts). Once: a class
 * already revoked, or one the save doesn't own (nothing to revoke), changes nothing (`applied`
 * null). Presets that hold it are fitted when read (meta/loadout.ts).
 */
export function revokeTower(
  save: SaveData,
  tower: TowerId,
): { readonly save: SaveData; readonly applied: RevocationTransaction | null } {
  const u = save.unlocks;
  if (!u.towers.includes(tower) || u.revokedTowers.includes(tower)) return { save, applied: null };
  return {
    save: { ...save, unlocks: { ...u, revokedTowers: [...u.revokedTowers, tower] } },
    applied: { kind: 'revoke_tower', tower },
  };
}

/**
 * An ability revoked for good (A3M2's uplink): it joins `unlocks.revokedAbilities`, and the price
 * of every rank owned of its `REVOCATION_REFUNDS` upgrade comes back to the bank (Orbital Strike
 * Mk II: its one rank, 2 Intel; clamped like any payout). The rank stays on record, so R&D shows
 * it bought and never sells it again. Once: an ability already revoked, or not owned, changes
 * nothing.
 */
export function revokeAbility(
  save: SaveData,
  ability: AbilityId,
  upgrades: Readonly<
    Record<
      string,
      { readonly currency: Currency; readonly ranks: readonly { readonly price: number }[] }
    >
  > = UPGRADES,
): { readonly save: SaveData; readonly applied: RevocationTransaction | null } {
  const u = save.unlocks;
  if (!u.abilities.includes(ability) || u.revokedAbilities.includes(ability)) {
    return { save, applied: null };
  }
  const refund = upgradeRefund(save, REVOCATION_REFUNDS[ability], upgrades);
  return {
    save: {
      ...save,
      currencies: refunded(save, refund),
      unlocks: { ...u, revokedAbilities: [...u.revokedAbilities, ability] },
    },
    applied: { kind: 'revoke_ability', ability, refund },
  };
}

/** What a run revoked (the sim's `state.revoked`, in the order revoked). */
export interface RunRevocations {
  readonly towers: readonly TowerId[];
  readonly abilities: readonly AbilityId[];
  /**
   * The factions of the run's `revokeTowerClass` cues that fired (`revokedClassFactions` over the
   * map's events whose `scriptFired` holds; null: any class). One the run took no class of (the
   * loadout held none, so the cue took nothing mid-map) takes the save's first owned class of it
   * at map end (towers.md § 9). Default none; a cue that never fired takes nothing.
   */
  readonly atMapEnd?: readonly (TowerFaction | null)[];
}

/**
 * The factions of `events`' `revokeTowerClass` actions, in event order (null: any class): the app
 * passes the events that fired, as `RunRevocations.atMapEnd` (towers.md § 9's map-end rule). A
 * `restoreTowerClass` (the finale's "Not Everglow."; sim/revoke.ts) cancels the last one before it:
 * its class came back, so it takes none at map end either.
 */
export function revokedClassFactions(
  events:
    | readonly {
        readonly actions: readonly (
          { readonly revokeTowerClass: { readonly faction?: TowerFaction } } | object
        )[];
      }[]
    | undefined,
): (TowerFaction | null)[] {
  const out: (TowerFaction | null)[] = [];
  for (const e of events ?? []) {
    for (const a of e.actions) {
      if ('revokeTowerClass' in a) out.push(a.revokeTowerClass.faction ?? null);
      else if ('restoreTowerClass' in a) out.pop(); // T807
    }
  }
  return out;
}

/** What run end's step 3 reads about the run. */
export interface RunEndRevocationInput {
  readonly won: boolean;
  readonly wonBefore: boolean;
  /** What the run's script revoked (the sim's `state.revoked`); absent: nothing is saved. */
  readonly revoked?: RunRevocations;
}

/** Whether `tower` belongs to `faction` (null: any). Unknown ids belong to none. */
function ofFaction(tower: string, faction: TowerFaction | null): boolean {
  if (faction === null) return true;
  const def = Object.values(TOWERS).find((d) => d.id === tower);
  return def?.faction === faction;
}

/**
 * Run end's step 3 (meta-runtime.md § Run end): on the run that first wins the map, every class and
 * ability it revoked, in order (`revokeTower`, `revokeAbility`); nothing on a loss or a replay
 * (D141: saved only on a win; a replay's Clean Exit, which may take another class, changes
 * nothing, like the flags and transactions of a replay). Between the two, towers.md § 9's map-end
 * rule: for each `revoked.atMapEnd` faction (a class cue that fired) the run revoked no class of, the save's first owned, unrevoked
 * class of that faction (its `unlocks.towers` order: the order it was acquired) is revoked, with
 * no refund (nothing was built). A save owning none loses nothing.
 */
export function runEndRevocations(
  save: SaveData,
  input: RunEndRevocationInput,
): { readonly save: SaveData; readonly revocations: readonly RevocationTransaction[] } {
  if (!input.won || input.wonBefore || input.revoked === undefined) {
    return { save, revocations: [] };
  }
  let next = save;
  const revocations: RevocationTransaction[] = [];
  for (const tower of input.revoked.towers) {
    const r = revokeTower(next, tower);
    next = r.save;
    if (r.applied !== null) revocations.push(r.applied);
  }
  const taken: string[] = [...input.revoked.towers];
  for (const faction of input.revoked.atMapEnd ?? []) {
    if (taken.some((t) => ofFaction(t, faction))) continue;
    const u = next.unlocks;
    const first = u.towers.find((t) => !u.revokedTowers.includes(t) && ofFaction(t, faction));
    if (first === undefined) continue;
    const r = revokeTower(next, first);
    next = r.save;
    taken.push(first);
    if (r.applied !== null) revocations.push(r.applied);
  }
  for (const ability of input.revoked.abilities) {
    const r = revokeAbility(next, ability);
    next = r.save;
    if (r.applied !== null) revocations.push(r.applied);
  }
  return { save: next, revocations };
}

/**
 * C3, Which door (campaign.md § 6.1): Bricks holds the convoy road or the warren tunnel. Committed
 * as A3M3's first briefing closes, so the sim reads it (`door_choice` is a script flag) and the
 * question is never asked again: a save whose flag is set is left as it is.
 */
export function setDoorChoice(
  save: SaveData,
  choice: C3Choice,
): { readonly save: SaveData; readonly applied: C3Transaction | null } {
  if (save.story.flags.door_choice !== undefined) return { save, applied: null };
  return {
    save: {
      ...save,
      story: { ...save.story, flags: { ...save.story.flags, door_choice: choice } },
    },
    applied: { kind: 'c3', choice },
  };
}

// ─── Act III part two (M7): T700b's seams, T710's bodies ────────────────────────────────────────
//
// Each transaction checks its arguments (an id outside the registries, a value outside its flag's,
// is `'invalid'`), then makes what its table beside it says (D146; act3.md § A3M4–A3M6): the
// jailbreak at the base, Gerald's mail and C4 on A3M4's first win, Zibzab's crate as A3M6's
// briefing closes. The dev saves are built with them (meta/__fixtures__/devSaves.ts).

/** C4's three answers: the `quill_choice` flag's values (campaign.md § 6.1). */
export type C4Choice = FlagValueOf<'quill_choice'>;
/** C4's answers, in the ledger's order. */
export const C4_CHOICES: readonly C4Choice[] = FLAGS.quill_choice.values;

/** Why an Act III part two transaction changed nothing. */
export type StoryRefusal =
  /** An argument outside the registries or its flag's values, or not due: a caller's bug. */
  | 'invalid'
  /** The jailbreak before A3M3 is won (`JAILBREAK.availableAfter`). */
  | 'not_stocked'
  /** The jailbreak with no revoked class to bring back. */
  | 'nothing_revoked'
  /** The bank is short of the jailbreak's price. */
  | 'short'
  /**
   * The crate holds no tune-up and a Field Protocol is left to give: it opens on the player's
   * pick (`crateProtocols`), which the briefing asks for.
   */
  | 'needs_pick'
  /** The transaction's body waits for its task (`'unbuilt'`, naming it); none does now. */
  | 'unbuilt';

/** An upgrade's price paid back for every rank owned (Purge's Rapport, the uplink's Mk II). */
export interface UpgradeRefund {
  readonly upgrade: UpgradeId;
  readonly currency: Currency;
  readonly amount: number;
}

/** What an Act III part two transaction did, for Results and the base. */
export type ActThreeTwoTransaction =
  /** The jailbreak: the classes brought back (drawn jailbroken), and the Stardust it took. */
  | { readonly kind: 'jailbreak'; readonly towers: readonly TowerId[]; readonly stardust: number }
  /** A companion ability made a Technician ability (`INHERITED_ABILITIES`). */
  | { readonly kind: 'inherit'; readonly ability: AbilityId }
  /**
   * C4 as committed: the ability Keep inherits (else null) and the Rapport Purge refunds (its
   * upgrade, currency, and the price of every rank owned; null when none was owned).
   */
  | {
      readonly kind: 'c4';
      readonly choice: C4Choice;
      readonly inherited: AbilityId | null;
      readonly refund: UpgradeRefund | null;
    }
  /** C5 as committed: the ending (its only effect on the save is `ending_choice`). */
  | { readonly kind: 'c5'; readonly choice: C5Choice }
  /** Zibzab's crate: the ranks it installed (each item's new rank), or the protocol picked. */
  | {
      readonly kind: 'crate';
      readonly upgrades: Readonly<Partial<Record<UpgradeId, number>>>;
      readonly protocol: ProtocolId | null;
    };

/**
 * An Act III part two transaction's outcome: the new save and what it did (`applied` null when it
 * had already applied), or why it changed nothing (the save is untouched).
 */
export type StoryOutcome =
  | { readonly ok: true; readonly save: SaveData; readonly applied: ActThreeTwoTransaction | null }
  | { readonly ok: false; readonly reason: StoryRefusal; readonly message: string };

function refuse(reason: StoryRefusal, message: string): StoryOutcome {
  return { ok: false, reason, message };
}

/** The price of every rank of `upgrade` the save owns, or null when it owns none. */
function upgradeRefund(
  save: SaveData,
  upgrade: UpgradeId | undefined | null,
  upgrades: Readonly<
    Record<
      string,
      { readonly currency: Currency; readonly ranks: readonly { readonly price: number }[] }
    >
  >,
): UpgradeRefund | null {
  if (upgrade === undefined || upgrade === null) return null;
  const def = upgrades[upgrade];
  const owned = save.upgrades[upgrade] ?? 0;
  if (def === undefined || owned === 0) return null;
  const amount = def.ranks.slice(0, owned).reduce((sum, r) => sum + r.price, 0);
  return { upgrade, currency: def.currency, amount };
}

/** `save`'s bank with `refund` paid in (clamped like any payout). */
function refunded(save: SaveData, refund: UpgradeRefund | null): SaveData['currencies'] {
  if (refund === null) return save.currencies;
  return {
    ...save.currencies,
    [refund.currency]: clampCurrency(save.currencies[refund.currency] + refund.amount),
  };
}

/**
 * The jailbreak (towers.md § 9; progression.md § 2.1): stocked at Zibzab's once A3M3 is won, for
 * `STORY_TRANSACTION_RULES.jailbreakStardust`, or free where `freeWhen` holds (Goldie's engineers,
 * under the convoy; the player still takes it, so the moment is seen). It moves every revoked class
 * from `unlocks.revokedTowers` to `unlocks.jailbroken` (identical stats and specs, its tune-ups and
 * spec unlock kept), recorded as `grant` in `story.granted`, once.
 */
export const JAILBREAK = {
  grant: 'jailbreak',
  availableAfter: 'a3_m03',
  freeWhen: { flag: 'door_choice', eq: 'convoy' },
} as const satisfies {
  readonly grant: string;
  readonly availableAfter: CampaignMapId;
  readonly freeWhen: Condition;
};

/** The jailbreak's price for `save`: 0 where `JAILBREAK.freeWhen` holds, else 300 Stardust. */
export function jailbreakPrice(save: SaveData): number {
  return evaluateCondition(JAILBREAK.freeWhen, baseStoryContext(save))
    ? 0
    : STORY_TRANSACTION_RULES.jailbreakStardust;
}

/**
 * Takes the jailbreak (the base's Shop, after A3M3; meta/purchase.ts's `jailbreak` item): every
 * revoked class moves to `unlocks.jailbroken`, the price comes off the bank, and `JAILBREAK.grant`
 * is recorded. Refuses `'not_stocked'` before A3M3 is won, `'nothing_revoked'` with no class to
 * bring back, `'short'` when the bank can't pay; `applied` null once taken.
 */
export function buyJailbreak(save: SaveData): StoryOutcome {
  if (save.story.granted.includes(JAILBREAK.grant)) return { ok: true, save, applied: null };
  if (!isMapWon(save, JAILBREAK.availableAfter)) {
    return refuse(
      'not_stocked',
      `story: the jailbreak is stocked once ${JAILBREAK.availableAfter} is won`,
    );
  }
  const u = save.unlocks;
  if (u.revokedTowers.length === 0) {
    return refuse('nothing_revoked', 'story: the jailbreak has no revoked class to bring back');
  }
  const price = jailbreakPrice(save);
  if (save.currencies.stardust < price) {
    return refuse(
      'short',
      `story: the jailbreak costs ${price} Stardust; the bank holds ${save.currencies.stardust}`,
    );
  }
  const towers = [...u.revokedTowers];
  return {
    ok: true,
    save: {
      ...save,
      currencies: {
        ...save.currencies,
        stardust: clampCurrency(save.currencies.stardust - price),
      },
      unlocks: {
        ...u,
        revokedTowers: [],
        jailbroken: [...u.jailbroken, ...towers.filter((t) => !u.jailbroken.includes(t))],
      },
      story: { ...save.story, granted: [...save.story.granted, JAILBREAK.grant] },
    },
    applied: { kind: 'jailbreak', towers, stardust: price },
  };
}

/**
 * The companion abilities the story makes Technician abilities (core-loop.md § 3.1, § 6.11; D146):
 * where and when each is inherited, and the condition it needs over the save's flags.
 * - Suppressing Fire, Bricks's: the fire-control key in Gerald's mail (A3M4's mail scene), on the
 *   first win (run end's step 6, `RUN_END_TRANSACTIONS`), so slot 1 holds it from A3M5. Bricks's
 *   Rapport carries over to it.
 * - Time Dilation, QUILL's: C4 Keep (`resolveC4`), from A3M5 through finale Phase 1 (the
 *   finale's Keep script takes it back for Phase 2, M8).
 */
export const INHERITED_ABILITIES: Readonly<
  Partial<
    Record<
      AbilityId,
      { readonly map: CampaignMapId; readonly at: 'mail_scene' | 'c4'; readonly when?: Condition }
    >
  >
> = {
  suppressing_fire: { map: 'a3_m04', at: 'mail_scene' },
  time_dilation: { map: 'a3_m04', at: 'c4', when: { flag: 'quill_choice', eq: 'keep' } },
};

/**
 * Makes companion ability `ability` (one of `INHERITED_ABILITIES`) an equippable Technician
 * ability: it joins `unlocks.abilities` (unless owned) and `unlocks.inheritedAbilities`, once.
 * `'invalid'` for any other ability, or one whose `when` doesn't hold over the save's flags.
 */
export function inheritAbility(save: SaveData, ability: AbilityId): StoryOutcome {
  const def = INHERITED_ABILITIES[ability];
  if (!Object.hasOwn(ABILITIES, ability) || def === undefined) {
    return refuse('invalid', `story: '${ability}' isn't an inherited ability`);
  }
  if (save.unlocks.inheritedAbilities?.includes(ability) === true) {
    return { ok: true, save, applied: null };
  }
  if (def.when !== undefined && !evaluateCondition(def.when, baseStoryContext(save))) {
    return refuse('invalid', `story: '${ability}' isn't inherited under this save's flags`);
  }
  const u = save.unlocks;
  return {
    ok: true,
    save: {
      ...save,
      unlocks: {
        ...u,
        abilities: u.abilities.includes(ability) ? u.abilities : [...u.abilities, ability],
        inheritedAbilities: [...(u.inheritedAbilities ?? []), ability],
      },
    },
    applied: { kind: 'inherit', ability },
  };
}

/**
 * What each C4 answer does to the save as it is committed (core-loop.md § 6.11): Keep inherits
 * Time Dilation; Purge refunds QUILL's Companion Rapport (every rank owned, progression.md § 7.3;
 * the rank stays on record, as the uplink's Mk II does) and takes QUILL off the finale's pick list
 * (M8); Rewrite changes nothing at once. Their effects in play, from A3M5 on, are `C4_IN_PLAY`'s.
 */
export const C4_EFFECTS: Readonly<
  Record<C4Choice, { readonly inherit: AbilityId | null; readonly refund: UpgradeId | null }>
> = {
  purge: { inherit: null, refund: 'rapport_quill' },
  keep: { inherit: 'time_dilation', refund: null },
  rewrite: { inherit: null, refund: null },
};

/**
 * C4's effects in play (core-loop.md § 6.11; D146), which the battle reads (app/battleSetup.ts):
 * - from `from` on (A3M5, and every later campaign map; a dev map counts as later), Purge's
 *   `purgeArmor`: every Everglow Security unit spawns with −2 armor (minimum 0) and its
 *   maintenance panel open (sim/factionArmor.ts);
 * - on `quillOffline.map` (A3M5) under Rewrite, QUILL is offline: its barks and radio slots are
 *   silent and the threat intel is `system`'s (presentation, T713). System Reboot's lock there is
 *   the map's own `lockedAbilities` row.
 * Keep's Time Dilation needs nothing here: it is inherited (`resolveC4`), so slot 1's pool has it.
 */
export const C4_IN_PLAY = {
  from: 'a3_m05',
  purgeArmor: {
    when: { flag: 'quill_choice', eq: 'purge' },
    modifier: {
      kind: 'enemyStat',
      stat: 'armor',
      faction: 'everglow',
      flat: -2,
      source: 'c4:purge',
    },
  },
  quillOffline: { map: 'a3_m05', when: { flag: 'quill_choice', eq: 'rewrite' } },
} as const satisfies {
  readonly from: CampaignMapId;
  readonly purgeArmor: { readonly when: Condition; readonly modifier: Modifier<IdSpace> };
  readonly quillOffline: { readonly map: CampaignMapId; readonly when: Condition };
};

/**
 * C4, QUILL's directives (campaign.md § 6.1), asked once in A3M4's debrief on the first win and
 * committed on the answer (D146): sets `quill_choice`, then makes `C4_EFFECTS[choice]` (Keep
 * inherits Time Dilation, Purge pays back QUILL's Rapport). A save whose flag is set is left as it
 * is (asked once). `'invalid'` for a value outside the flag's.
 */
export function resolveC4(
  save: SaveData,
  choice: C4Choice,
  upgrades: Readonly<
    Record<
      string,
      { readonly currency: Currency; readonly ranks: readonly { readonly price: number }[] }
    >
  > = UPGRADES,
): StoryOutcome {
  if (!C4_CHOICES.includes(choice)) {
    return refuse('invalid', `story: '${choice}' isn't a quill_choice value`);
  }
  if (save.story.flags.quill_choice !== undefined) return { ok: true, save, applied: null };
  const effects = C4_EFFECTS[choice];
  let next: SaveData = {
    ...save,
    story: { ...save.story, flags: { ...save.story.flags, quill_choice: choice } },
  };
  if (effects.inherit !== null) {
    const r = inheritAbility(next, effects.inherit);
    if (!r.ok) return r;
    next = r.save;
  }
  const refund = upgradeRefund(next, effects.refund, upgrades);
  next = { ...next, currencies: refunded(next, refund) };
  return {
    ok: true,
    save: next,
    applied: { kind: 'c4', choice, inherited: effects.inherit, refund },
  };
}

/**
 * Zibzab's crate (act3.md § A3M6; D146): opened as A3M6's briefing closes, so it is live from W1.
 * It installs every tune-up rank the save doesn't own for each tower of `faction` the save owns
 * (`crateContents`), free; when there is none to install, one Field Protocol unlock the player picks
 * in the briefing instead (`crateProtocols`). Recorded as `grant`, once.
 */
export const CRATE = { grant: 'crate', map: 'a3_m06', faction: 'vrell' } as const satisfies {
  readonly grant: string;
  readonly map: CampaignMapId;
  readonly faction: TowerFaction;
};

/**
 * What the crate would install over `save`: each tune-up (a `shop` upgrade with a `tower`) of an
 * owned `CRATE.faction` tower that isn't at its top rank, with that top rank. Empty when every one
 * is owned (the crate then offers a protocol). Pure; tests pass their own catalogs.
 */
export function crateContents(
  save: SaveData,
  upgrades: Readonly<
    Record<
      string,
      { readonly kind: string; readonly tower?: string; readonly ranks: readonly unknown[] }
    >
  > = UPGRADES,
  towers: Readonly<Record<string, { readonly faction: TowerFaction }>> = TOWERS,
): Partial<Record<UpgradeId, number>> {
  const owned: readonly string[] = save.unlocks.towers;
  const ranks: Readonly<Partial<Record<string, number>>> = save.upgrades;
  const out: Partial<Record<string, number>> = {};
  for (const [id, def] of Object.entries(upgrades)) {
    const tower = def.tower;
    if (def.kind !== 'shop' || tower === undefined || !owned.includes(tower)) continue;
    if (towers[tower]?.faction !== CRATE.faction) continue;
    const top = def.ranks.length;
    if ((ranks[id] ?? 0) < top) out[id] = top;
  }
  return out;
}

/**
 * The Field Protocols the crate can hold when it holds no tune-up: every registered protocol the
 * save doesn't own, in catalog order (the briefing's pick; empty when the save owns them all).
 */
export function crateProtocols(save: SaveData): ProtocolId[] {
  return Object.values(PROTOCOLS)
    .map((p) => p.id)
    .filter((id) => !save.unlocks.protocols.includes(id));
}

/**
 * Opens Zibzab's crate (`CRATE`) on `save`: its tune-ups (`crateContents`) installed free; with
 * none, `pick` (one of `crateProtocols`) unlocked. `'invalid'` for a pick that isn't one, or any
 * pick while the crate has tune-ups; `'needs_pick'` with no tune-up, no pick, and a protocol left
 * to give. A save that owns everything opens an empty crate (only its sticker, peeled off).
 */
export function openCrate(save: SaveData, pick?: ProtocolId): StoryOutcome {
  if (save.story.granted.includes(CRATE.grant)) return { ok: true, save, applied: null };
  const contents = crateContents(save);
  const tuneUps = Object.keys(contents).length > 0;
  if (pick !== undefined) {
    if (!Object.hasOwn(PROTOCOLS, pick) || save.unlocks.protocols.includes(pick)) {
      return refuse('invalid', `story: the crate can't hold protocol '${pick}'`);
    }
    if (tuneUps) return refuse('invalid', 'story: the crate holds tune-ups, not a protocol pick');
  } else if (!tuneUps && crateProtocols(save).length > 0) {
    return refuse('needs_pick', 'story: the crate holds no tune-up; pick a Field Protocol');
  }
  const granted = [...save.story.granted, CRATE.grant];
  return {
    ok: true,
    save: {
      ...save,
      upgrades: { ...save.upgrades, ...contents },
      unlocks:
        pick === undefined
          ? save.unlocks
          : { ...save.unlocks, protocols: [...save.unlocks.protocols, pick] },
      story: { ...save.story, granted },
    },
    applied: { kind: 'crate', upgrades: contents, protocol: pick ?? null },
  };
}

// ─── The finale (M8): C5's seam by T800b, its body by T810 ───────────────────────────────────────

/** C5's two answers: the `ending_choice` flag's values (campaign.md § 6.1). */
export type C5Choice = FlagValueOf<'ending_choice'>;
/** C5's answers, in the ledger's order. */
export const C5_CHOICES: readonly C5Choice[] = FLAGS.ending_choice.values;

/** The map C5 follows, and the task that built its body (T810: C5, the epilogue, the credits). */
export const C5 = { map: 'fin_m01', task: 'T810' } as const satisfies {
  readonly map: CampaignMapId;
  readonly task: string;
};

/**
 * C5, Stay or Go (bible.md § 9; campaign.md § 6.1), asked once after the finale's card and
 * Sterling's memo (`RESULTS_FLOW.fin_m01.ending`; `fin_m01_scene_c5`, whose choice sets the flag
 * through app/dialogue.ts `withSceneEffects`), committed on the answer and never re-asked: sets
 * `ending_choice`, and nothing else in the save (the ending, the epilogue cards, and the post-game
 * star map read the flag). A save whose flag is set is left as it is (`applied` null). `'invalid'`
 * for a value outside the flag's, or before the finale is won (not due).
 */
export function resolveC5(save: SaveData, choice: C5Choice): StoryOutcome {
  if (!C5_CHOICES.includes(choice)) {
    return refuse('invalid', `story: '${choice}' isn't an ending_choice value`);
  }
  if (save.story.flags.ending_choice !== undefined) return { ok: true, save, applied: null };
  if (!isMapWon(save, C5.map)) return refuse('invalid', `story: C5 waits for ${C5.map}'s win`);
  return {
    ok: true,
    save: {
      ...save,
      story: { ...save.story, flags: { ...save.story.flags, ending_choice: choice } },
    },
    applied: { kind: 'c5', choice },
  };
}
