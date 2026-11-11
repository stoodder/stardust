// The debrief's story choice (T510; T329's C2 half; T710's C4): C2, Zibzab's Price, on A2M4's win,
// and C4, QUILL's directives, on A3M4's (D146: asked once on the first win, committed on the answer). The card
// shows the debrief up to its choice (app/runResult.ts `debriefLines`); when that choice decides a
// story transaction's flag (`RESULTS_CHOICES`: `stardust_choice` → meta's `resolveC2`) and the save
// hasn't made it yet, the card offers its options in place of its way on, price first (the whole
// bank, and what each option pays under it, D138). Taking one makes the transaction on the save in
// play, shows what it did in the payroll, and plays the rest of the debrief onto the card. A
// debrief that reaches the decision without a choice (an empty bank: "No refunds. I did say.",
// `none`) makes it as the card opens. Guarded by the flag, never by the debrief's seen id: a win
// whose card was never answered (the tab closed) is offered it at the base (app/baseChoice.ts,
// which plays the same offer through `openChoice` and `takeChoice`).
import { SCENES } from '../content/dialogue/index.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
import type { FlagSet } from '../content/dialogue/flags.ts';
import type { FlagId } from '../content/types.ts';
import type { ChoiceNode, LineNode, Scene } from '../content/dialogue/types.ts';
import { UPGRADES } from '../content/upgrades/index.ts';
import {
  C4_CHOICES,
  c2Windfall,
  resolveC2,
  resolveC4,
  ZIBZAB_TUNE_UP,
  type C2Choice,
  type C4Choice,
  type SaveData,
  type StoryOutcome,
  type TransactionResult,
} from '../meta/index.ts';
import type { StoryContext } from '../story/conditions.ts';
import { advance, readThrough, type DialogueCursor } from '../story/runner.ts';
import { resolveText } from '../story/text.ts';
import { assertNever } from '../shared/types.ts';
import type { SpokenLine } from '../ui/state.ts';
import {
  runResult,
  type ResultsChoice,
  type ResultsPay,
  type ResultsTransaction,
  type RunResult,
} from '../ui/screens/state.ts';
import { withSceneEffects } from './dialogue.ts';
import { transactionView } from './resultsStory.ts';
import {
  debriefStory,
  runStoryContext,
  spoken,
  type DebriefStory,
  type RunEndInput,
} from './runResult.ts';
import { activeSave, updateActiveSave } from './save.ts';
import type { RunOutcome } from './testHookTypes.ts';

/** A flag a debrief's choice decides on Results, and the story transaction that decides it. */
export interface ResultsChoiceRule {
  readonly flag: FlagId;
  /** Makes the choice `value` (one of the flag's values) on `save`; idempotent per flag. */
  readonly resolve: (save: SaveData, value: string) => TransactionResult;
  /** What choosing `value` would pay over `save`, shown before the pick (price first, D138). */
  readonly pays: (save: SaveData, value: string) => ResultsPay;
  /** The choice's own heading in place of the bank's stake (`ResultsChoice.title`); C2 has none. */
  readonly title?: string;
}

/** Nothing priced under an option (C4: none of QUILL's answers is a purchase). */
const NO_PAY: ResultsPay = { intel: 0, note: '' };

/** The note under C2's Return, as its payroll row will read ("Carried home", "Fee: an IOU"). */
export const C2_RETURN_NOTE = 'Fee: an IOU';

/** What C2's `value` would pay over `save`: Sell's windfall and Tune-up, Return's IOU. */
function c2Pays(save: SaveData, value: string): ResultsPay {
  const choice = c2Choice(value);
  if (choice === 'sold') {
    return {
      intel: c2Windfall(save.currencies.stardust),
      note: UPGRADES[ZIBZAB_TUNE_UP].name,
    };
  }
  return { intel: 0, note: choice === 'returned' ? C2_RETURN_NOTE : '' };
}

/**
 * The flags a debrief's choice decides on Results: C2 (A2M4's Zibzab's Price) and C4 (A3M4's
 * QUILL's directives, T710; committed on the answer through meta's `resolveC4`, D146).
 */
export const RESULTS_CHOICES: readonly ResultsChoiceRule[] = [
  {
    flag: 'stardust_choice',
    resolve: (save, value) => resolveC2(save, c2Choice(value)),
    pays: c2Pays,
  },
  {
    flag: 'quill_choice',
    resolve: (save, value) => c4Result(resolveC4(save, c4Choice(value))),
    pays: () => NO_PAY,
    title: "QUILL's directives",
  },
];

/** `value` as C4's answer (a `quill_choice` value); anything else is a content bug. */
function c4Choice(value: string): C4Choice {
  const choice = C4_CHOICES.find((c) => c === value);
  if (choice !== undefined) return choice;
  throw new Error(`story: '${value}' isn't a quill_choice value`);
}

/** C4's outcome as a Results transaction (a refusal is a content bug: the value was checked). */
function c4Result(r: StoryOutcome): TransactionResult {
  if (!r.ok) throw new Error(r.message);
  return { save: r.save, applied: r.applied?.kind === 'c4' ? r.applied : null };
}

/** `value` as C2's choice (a `stardust_choice` value); anything else is a content bug. */
function c2Choice(value: string): C2Choice {
  if (value === 'sold' || value === 'returned' || value === 'none') return value;
  throw new Error(`story: '${value}' isn't a stardust_choice value`);
}

/** The value `set` gives the rule's flag, as text; undefined when it doesn't set it. */
function valueOf(rule: ResultsChoiceRule, set: FlagSet | undefined): string | undefined {
  const v = set?.[rule.flag];
  return v === undefined ? undefined : String(v);
}

/** The save has made the rule's choice already (its flag is set). */
function isMade(rule: ResultsChoiceRule, save: SaveData): boolean {
  return save.story.flags[rule.flag] !== undefined;
}

/** A story choice waiting on the player (on the card or at the base), with what taking it needs. */
export interface PendingChoice {
  readonly view: ResultsChoice;
  readonly rule: ResultsChoiceRule;
  readonly scene: Scene;
  readonly cursor: DialogueCursor;
  readonly ctx: StoryContext;
  readonly story: DebriefStory;
  /**
   * False for the results fixture (`__sd.results`): the choice plays on a copy of `save`, and
   * nothing is written.
   */
  readonly record: boolean;
  readonly save: SaveData;
}

/** What reading a debrief up to its decision found. */
export type ChoiceOpening =
  /** It rests on a choice the save hasn't made: offer it (`lines`: the lines before it). */
  | { readonly kind: 'offer'; readonly pending: PendingChoice; readonly lines: readonly LineNode[] }
  /** It decides the flag without a choice (C2's `none`): `t` made it. */
  | { readonly kind: 'decided'; readonly t: TransactionResult }
  /** Nothing to decide: no choice in RESULTS_CHOICES, or the save has made it. */
  | { readonly kind: 'none' };

/** The rule a choice node decides (every option sets its flag), or none. */
function ruleOf(node: ChoiceNode): ResultsChoiceRule | null {
  return (
    RESULTS_CHOICES.find((r) => node.options.every((o) => valueOf(r, o.set) !== undefined)) ?? null
  );
}

/**
 * Reads `scene` over `ctx` to its decision: a choice to offer (priced over `save`: its bank and
 * what each option pays), a decision made without one, or nothing to decide.
 */
export function openChoice(
  scene: Scene,
  ctx: StoryContext,
  story: DebriefStory,
  save: SaveData,
  record: boolean,
): ChoiceOpening {
  const { lines, cursor } = readThrough(scene, ctx);
  if (cursor.step.kind === 'choice') {
    const rule = ruleOf(cursor.step.node);
    if (rule === null || isMade(rule, save)) return { kind: 'none' };
    const by = lines.at(-1);
    const options = cursor.step.node.options;
    const view: ResultsChoice = {
      by: by === undefined ? '' : spoken(by.speaker, '', story).name,
      bank: save.currencies.stardust,
      title: rule.title ?? null,
      options: options.map((o) => resolveText(o.text, story.text)),
      pays: options.map((o) => rule.pays(save, valueOf(rule, o.set) ?? '')),
      // As C3's in the briefing (T714): "QUILL will remember that." once picked (C4; C2 has none).
      ...(options.some((o) => o.remember !== undefined)
        ? {
            remember: options.map((o) =>
              o.remember === undefined
                ? null
                : `${spoken(o.remember, '', story).name} will remember that.`,
            ),
          }
        : {}),
      picked: null,
    };
    return {
      kind: 'offer',
      pending: { view, rule, scene, cursor, ctx, story, record, save },
      lines,
    };
  }
  // Decided without a choice (C2's `none`: nothing to trade).
  for (const rule of RESULTS_CHOICES) {
    const value = valueOf(rule, cursor.effects.flags);
    if (value === undefined || isMade(rule, save)) continue;
    return { kind: 'decided', t: rule.resolve(save, value) };
  }
  return { kind: 'none' };
}

/** What taking a choice did: the save it made, the transaction, and the lines after the pick. */
export interface ChoiceTaken {
  readonly save: SaveData;
  readonly t: TransactionResult;
  readonly lines: readonly SpokenLine[];
}

/** What a scene plays from `cursor` on, to its next choice or its end: its lines and effects. */
function playFrom(
  scene: Scene,
  cursor: DialogueCursor,
  ctx: StoryContext,
): { lines: LineNode[]; effects: DialogueCursor['effects'] } {
  const lines: LineNode[] = [];
  let c = cursor;
  while (c.step.kind === 'line') {
    lines.push(c.step.node);
    c = advance(scene, c, ctx);
  }
  return { lines, effects: c.effects };
}

/**
 * Takes option `index` of `p` over `save`: its transaction, the rest of the debrief, and the save
 * with both (the debrief recorded seen; anything else it sets joins, the choice's own flag being
 * the transaction's). Null for an option that isn't one. Writes nothing.
 */
export function takeChoice(p: PendingChoice, index: number, save: SaveData): ChoiceTaken | null {
  if (p.cursor.step.kind !== 'choice') return null;
  const option = p.cursor.step.node.options[index];
  const value = option === undefined ? undefined : valueOf(p.rule, option.set);
  if (value === undefined) return null;
  const t = p.rule.resolve(save, value);
  const after = advance(p.scene, p.cursor, p.ctx, index);
  const { lines: rest, effects } = playFrom(p.scene, after, p.ctx);
  const { [p.rule.flag]: _taken, ...flags } = effects.flags;
  return {
    save: withSceneEffects(t.save, p.scene.id, { ...effects, flags }),
    t,
    lines: rest.map((l) => spoken(l.speaker, l.text, p.story)),
  };
}

/** Writes a transaction's save (record) and says whether the write failed. */
export function commitChoice(next: SaveData, record: boolean): string | null {
  if (!record) return null;
  const r = updateActiveSave(() => next);
  return r.ok ? null : r.message;
}

/** The payroll row a made transaction shows, or null when it had already applied. */
export function madeView(t: TransactionResult): ResultsTransaction | null {
  return t.applied === null ? null : transactionView(t.applied);
}

let pending: PendingChoice | null = null;

/** `result` with a made transaction in its payroll (and a failed write's notice). */
function withTransaction(
  result: RunResult,
  t: TransactionResult,
  notice: string | null,
): RunResult {
  const rewards = result.rewards;
  const made = madeView(t);
  if (rewards === null || (made === null && notice === null)) return result;
  return {
    ...result,
    rewards: {
      ...rewards,
      transactions: made === null ? rewards.transactions : [...rewards.transactions, made],
      saveNotice: notice ?? rewards.saveNotice,
    },
  };
}

/**
 * `result` with its debrief's story choice (router `endRun`, and the results fixture with
 * `record` false): offered when a won run's debrief rests on a choice that decides a flag in
 * `RESULTS_CHOICES` the save hasn't decided; made at once when the debrief decides it without a
 * choice (C2's `none`). `save` is the save as run end left it (the active one when recording).
 * Call it before the debrief's own effects are applied (`endRunStory`). `lookup` finds the debrief
 * (tests pass their own).
 */
export function withResultsChoice(
  result: RunResult,
  input: Pick<RunEndInput, 'mapId' | 'stats' | 'story' | 'escort'>,
  outcome: RunOutcome,
  save: SaveData | null,
  record = true,
  lookup: (id: string) => Scene | undefined = (id) => SCENES[id],
): RunResult {
  pending = null;
  const map = input.mapId;
  const scene = lookup(`${map}_debrief`);
  if (outcome !== 'won' || save === null || scene === undefined || !isCampaignMapId(map)) {
    return result;
  }
  const opening = openChoice(
    scene,
    runStoryContext(map, input, outcome),
    debriefStory(input),
    save,
    record,
  );
  switch (opening.kind) {
    case 'offer':
      pending = opening.pending;
      return { ...result, choice: opening.pending.view };
    case 'decided':
      return withTransaction(result, opening.t, commitChoice(opening.t.save, record));
    case 'none':
      return result;
    default:
      return assertNever(opening);
  }
}

/**
 * Takes option `index` of the choice on the card (Results' option buttons): makes its
 * transaction on the save in play (written at once), shows what it did, and plays the rest of the
 * debrief onto the card, which then offers its way on. A no-op once taken, or with none waiting.
 */
export function pickResultsChoice(index: number): void {
  const p = pending;
  const result = runResult.value;
  if (p === null || result === null || result.choice !== p.view) return;
  const save = p.record ? (activeSave() ?? p.save) : p.save;
  const taken = takeChoice(p, index, save);
  if (taken === null) return;
  pending = null;
  const notice = commitChoice(taken.save, p.record);
  runResult.value = withTransaction(
    {
      ...result,
      choice: { ...p.view, picked: index },
      debrief: [...result.debrief, ...taken.lines],
    },
    taken.t,
    notice,
  );
}
