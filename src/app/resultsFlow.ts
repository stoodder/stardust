// The debrief's story choice on the results card (T510; T329's C2 half): C2, Zibzab's Price, on
// A2M4's win. The card shows the debrief up to its choice (app/runResult.ts `debriefLines`); when
// that choice decides a story transaction's flag (`RESULTS_CHOICES`: `stardust_choice` → meta's
// `resolveC2`) and the save hasn't made it yet, the card offers its options in place of its way
// on, price first (the whole bank). Taking one makes the transaction on the save in play, shows
// what it did in the payroll, and plays the rest of the debrief onto the card. A debrief that
// reaches the decision without a choice (an empty bank: "No refunds. I did say.", `none`) makes it
// as the card opens. Guarded by the flag, never by the debrief's seen id, so a win whose card was
// never answered (the tab closed) offers it again on the next win.
import { SCENES } from '../content/dialogue/index.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
import type { FlagSet } from '../content/dialogue/flags.ts';
import type { FlagId } from '../content/types.ts';
import type { ChoiceNode, LineNode, Scene } from '../content/dialogue/types.ts';
import { resolveC2, type C2Choice, type SaveData, type TransactionResult } from '../meta/index.ts';
import type { StoryContext } from '../story/conditions.ts';
import { advance, readThrough, type DialogueCursor } from '../story/runner.ts';
import { resolveText } from '../story/text.ts';
import type { SpokenLine } from '../ui/state.ts';
import { runResult, type ResultsChoice, type RunResult } from '../ui/screens/state.ts';
import { withSceneEffects } from './dialogue.ts';
import { transactionView } from './resultsStory.ts';
import { debriefStory, runStoryContext, spoken, type RunEndInput } from './runResult.ts';
import { activeSave, updateActiveSave } from './save.ts';
import type { RunOutcome } from './testHookTypes.ts';

/** A flag a debrief's choice decides on Results, and the story transaction that decides it. */
export interface ResultsChoiceRule {
  readonly flag: FlagId;
  /** Makes the choice `value` (one of the flag's values) on `save`; idempotent per flag. */
  readonly resolve: (save: SaveData, value: string) => TransactionResult;
}

/** The flags a debrief's choice decides on Results: C2 (C4 joins with A3M4). */
export const RESULTS_CHOICES: readonly ResultsChoiceRule[] = [
  { flag: 'stardust_choice', resolve: (save, value) => resolveC2(save, c2Choice(value)) },
];

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

/** The choice the card waits on, with what taking it needs. */
interface Pending {
  readonly view: ResultsChoice;
  readonly rule: ResultsChoiceRule;
  readonly scene: Scene;
  readonly cursor: DialogueCursor;
  readonly ctx: StoryContext;
  readonly input: Pick<RunEndInput, 'story' | 'escort'>;
  /**
   * False for the results fixture (`__sd.results`): the choice plays on a copy of `save`, and
   * nothing is written.
   */
  readonly record: boolean;
  readonly save: SaveData;
}

let pending: Pending | null = null;

/** The rule a choice node decides (every option sets its flag), or none. */
function ruleOf(node: ChoiceNode): ResultsChoiceRule | null {
  return (
    RESULTS_CHOICES.find((r) => node.options.every((o) => valueOf(r, o.set) !== undefined)) ?? null
  );
}

/** Writes a transaction's save (record) and says whether the write failed. */
function commit(next: SaveData, record: boolean): string | null {
  if (!record) return null;
  const r = updateActiveSave(() => next);
  return r.ok ? null : r.message;
}

/** `result` with a made transaction in its payroll (and a failed write's notice). */
function withTransaction(
  result: RunResult,
  t: TransactionResult,
  notice: string | null,
): RunResult {
  const rewards = result.rewards;
  if (rewards === null || (t.applied === null && notice === null)) return result;
  return {
    ...result,
    rewards: {
      ...rewards,
      transactions:
        t.applied === null
          ? rewards.transactions
          : [...rewards.transactions, transactionView(t.applied)],
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
  const ctx = runStoryContext(map, input, outcome);
  const { lines, cursor } = readThrough(scene, ctx);
  if (cursor.step.kind === 'choice') {
    const rule = ruleOf(cursor.step.node);
    if (rule === null || isMade(rule, save)) return result;
    const story = debriefStory(input);
    const by = lines.at(-1);
    const view: ResultsChoice = {
      by: by === undefined ? '' : spoken(by.speaker, '', story).name,
      bank: save.currencies.stardust,
      options: cursor.step.node.options.map((o) => resolveText(o.text, story.text)),
      picked: null,
    };
    pending = { view, rule, scene, cursor, ctx, input, record, save };
    return { ...result, choice: view };
  }
  // Decided without a choice (C2's `none`: nothing to trade).
  for (const rule of RESULTS_CHOICES) {
    const value = valueOf(rule, cursor.effects.flags);
    if (value === undefined || isMade(rule, save)) continue;
    const t = rule.resolve(save, value);
    return withTransaction(result, t, commit(t.save, record));
  }
  return result;
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
 * Takes option `index` of the choice on the card (Results' option buttons): makes its
 * transaction on the save in play (written at once), shows what it did, and plays the rest of the
 * debrief onto the card, which then offers its way on. A no-op once taken, or with none waiting.
 */
export function pickResultsChoice(index: number): void {
  const p = pending;
  const result = runResult.value;
  if (
    p === null ||
    result === null ||
    result.choice !== p.view ||
    p.cursor.step.kind !== 'choice'
  ) {
    return;
  }
  const option = p.cursor.step.node.options[index];
  const value = option === undefined ? undefined : valueOf(p.rule, option.set);
  if (value === undefined) return;
  pending = null;
  const save = p.record ? (activeSave() ?? p.save) : p.save;
  const t = p.rule.resolve(save, value);
  const after = advance(p.scene, p.cursor, p.ctx, index);
  const { lines: rest, effects } = playFrom(p.scene, after, p.ctx);
  // Anything else the debrief sets on the way to its end (none in C2's) joins the save; the
  // choice's own flag is the transaction's.
  const { [p.rule.flag]: _taken, ...flags } = effects.flags;
  const next = withSceneEffects(t.save, p.scene.id, { ...effects, flags });
  const notice = commit(next, p.record);
  const story = debriefStory(p.input);
  const lines: SpokenLine[] = rest.map((l) => spoken(l.speaker, l.text, story));
  runResult.value = withTransaction(
    {
      ...result,
      choice: { ...p.view, picked: index },
      debrief: [...result.debrief, ...lines],
    },
    t,
    notice,
  );
}

/** Whether the card on screen waits on a story choice (its way on is the choice). */
export function resultsChoicePending(): boolean {
  const choice = runResult.value?.choice;
  return choice !== undefined && choice !== null && choice.picked === null;
}
