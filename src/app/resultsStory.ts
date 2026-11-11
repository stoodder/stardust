// The story side of the results card's payroll (T510): the story transactions a run made (run
// end's step 6: A2M4's Q3 Bonus, A2M5's Prism gift, A3M4's mail; then C2 or C4 once the debrief's
// choice is taken, app/resultsFlow.ts) and the memo that arrives on the card with the Q3 Bonus, as the card shows
// them (ui/screens/state.ts). Pure.
import { ABILITIES } from '../content/abilities/index.ts';
import { MEMOS } from '../content/memos/index.ts';
import { UPGRADES } from '../content/upgrades/index.ts';
import type { MemoId } from '../content/memos/types.ts';
import { Q3_BONUS_MEMO, ZIBZAB_TUNE_UP, type StoryTransaction } from '../meta/index.ts';
import type { MeterLabel } from '../content/types.ts';
import type {
  ResultsMemo,
  ResultsTransaction,
  RunBearers,
  RunEscort,
} from '../ui/screens/state.ts';
import { bearersCarried } from '../sim/index.ts';
import { assertNever } from '../shared/types.ts';
import { meterLabelText, towerName } from './hudText.ts';

/** A story transaction as the card shows it: names for ids, the Zibzab Tune-up's own line. */
export function transactionView(t: StoryTransaction): ResultsTransaction {
  switch (t.kind) {
    case 'q3_bonus':
      return { kind: 'q3_bonus', stardust: t.stardust };
    case 'gift':
      return { kind: 'gift', tower: towerName(t.tower) };
    // An ability gift reads as a gift too ("Given: System Reboot"), by the ability's name.
    case 'gift_ability':
      return { kind: 'gift', tower: ABILITIES[t.ability].name };
    case 'c2': {
      const def = UPGRADES[ZIBZAB_TUNE_UP];
      return {
        kind: 'c2',
        choice: t.choice,
        bank: t.bank,
        intel: t.intel,
        tuneUp: t.tuneUp ? { name: def.name, line: def.copy ?? '' } : null,
      };
    }
    // Gerald's mail (A3M4): "Inherited: Suppressing Fire".
    case 'inherit':
      return { kind: 'inherit', ability: ABILITIES[t.ability].name };
    // C4 (T710): Keep's Time Dilation as an inheritance, Purge's Rapport as a refund row.
    case 'c4':
      return {
        kind: 'c4',
        choice: t.choice,
        inherited: t.inherited === null ? null : ABILITIES[t.inherited].name,
        refund:
          t.refund === null
            ? null
            : {
                name: UPGRADES[t.refund.upgrade].name,
                currency: t.refund.currency,
                amount: t.refund.amount,
              },
      };
    default:
      return assertNever(t);
  }
}

/**
 * The memos a run's card shows (core-loop.md § 6.4: one arrives on a results screen): the Q3
 * Bonus's, when this run paid it and delivered it. Every other memo waits in the Inbox.
 */
export function resultsMemos(
  transactions: readonly StoryTransaction[],
  delivered: readonly MemoId[],
): ResultsMemo[] {
  const due = transactions.some((t) => t.kind === 'q3_bonus') ? [Q3_BONUS_MEMO] : [];
  return delivered
    .filter((id) => due.includes(id))
    .flatMap((id) => {
      const memo = MEMOS[id];
      return memo === undefined ? [] : [{ id, subject: memo.subject }];
    });
}

/** The payroll's story rows from meta's run-end summary. */
export function storyRewardsOf(summary: {
  readonly transactions: readonly StoryTransaction[];
  readonly memos: readonly MemoId[];
}): { transactions: ResultsTransaction[]; memos: ResultsMemo[] } {
  return {
    transactions: summary.transactions.map(transactionView),
    memos: resultsMemos(summary.transactions, summary.memos),
  };
}

/** What `escortAtEnd` reads of a finished battle. */
interface EscortSim {
  readonly state: {
    readonly objective: string;
    readonly meterLabel: MeterLabel | null;
    /** The run's refugees: the map's, less any group a story flag left out (A3M3's other door). */
    readonly refugeeTotal: number;
    readonly stats: { readonly evacuated: number; readonly refugeesLost: number };
  };
}

/**
 * The run's Escort meter as the map ended (`RunEndInput.escort`): only when the map was an Escort
 * then (from the start, or after a pivot like A2M5's) or a Holdout (A3M3, scored by Evacuated);
 * `{}` otherwise. The total is the run's own (`state.refugeeTotal`), so a group a story flag left
 * out (Thrum's under `cleared`, the door A3M3's C3 didn't pick) is never counted.
 */
export function escortAtEnd(sim: EscortSim): { escort?: RunEscort } {
  const s = sim.state;
  const holdout = s.objective === 'holdout';
  if (s.objective !== 'escort' && !holdout) return {};
  const kind = s.meterLabel === 'sheltered' ? 'sheltered' : 'evacuated';
  return {
    escort: {
      kind,
      label: meterLabelText(kind),
      evacuated: s.stats.evacuated,
      total: s.refugeeTotal,
      lost: s.stats.refugeesLost,
      ...(holdout ? { holdout: true } : {}),
    },
  };
}

/** What `bearersAtEnd` reads of a finished battle. */
interface BearerSim {
  readonly state: Parameters<typeof bearersCarried>[0];
  readonly map: Parameters<typeof bearersCarried>[1];
  readonly config: { readonly scriptFlags: Parameters<typeof bearersCarried>[2] };
}

/**
 * The run's bearers as the map ended (`RunEndInput.bearers`; A3M5): those home and lost of the
 * bearers its flags walked (`bearersCarried`), for Act III's "Carried: {n} of {total}." line; `{}`
 * on a map with none.
 */
export function bearersAtEnd(sim: BearerSim): { bearers?: RunBearers } {
  const b = bearersCarried(sim.state, sim.map, sim.config.scriptFlags);
  return b === null ? {} : { bearers: { home: b.home, lost: b.lost, total: b.total } };
}
