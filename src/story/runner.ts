// The dialogue runner (docs/tech/story-runtime.md § Dialogue runner): a pure state machine over a
// scene's nodes. `start` opens a scene; `advance` moves past the current line or takes a choice;
// branch and set nodes run on the way, so a cursor always rests on a line, a choice, or the end.
// The effects (flags set, the callsign) ride on the cursor for meta to save; the scene itself is
// seen once it ends. A cursor is plain data, so a saved `{ scene, index, effects }` resumes.
import type { FlagSet } from '../content/dialogue/flags.ts';
import type { CallsignId } from '../content/dialogue/profile.ts';
import { parseSceneId } from '../content/dialogue/rules.ts';
import type {
  ChoiceNode,
  ChoiceOption,
  LineNode,
  ReplyButton,
  Scene,
  SceneId,
  SceneSlot,
} from '../content/dialogue/types.ts';
import { evaluateCondition, withFlags, type StoryContext } from './conditions.ts';

/** Where a scene's playback rests. */
export type DialogueStep =
  | { readonly kind: 'line'; readonly node: LineNode }
  | { readonly kind: 'choice'; readonly node: ChoiceNode }
  | { readonly kind: 'end' };

/** What playing a scene changed, so far. */
export interface DialogueEffects {
  readonly flags: FlagSet;
  readonly callsign: CallsignId | null;
}

export interface DialogueCursor {
  readonly scene: SceneId;
  /** The index of the node the cursor rests on (`nodes.length` once it falls off the end). */
  readonly index: number;
  readonly step: DialogueStep;
  readonly effects: DialogueEffects;
  /** The option taken at the last choice, for its "{Speaker} will remember that." (C3, C4). */
  readonly chose: ChoiceOption | null;
}

export const NO_EFFECTS: DialogueEffects = { flags: {}, callsign: null };

/** Whether `scene` plays now: its `when`, judged as its trigger fires. */
export function scenePlays(scene: Scene, ctx: StoryContext): boolean {
  return scene.when === undefined || evaluateCondition(scene.when, ctx);
}

/** Opens `scene` in `ctx`; the cursor rests on its first line, choice, or end. */
export function start(scene: Scene, ctx: StoryContext): DialogueCursor {
  return settle(scene, 0, NO_EFFECTS, ctx, null);
}

/**
 * Resumes `scene` at a saved node index with the effects so far (a cursor's `index` and
 * `effects`). Branch and set nodes from there run again, so a saved index on one is safe.
 */
export function resume(
  scene: Scene,
  index: number,
  effects: DialogueEffects,
  ctx: StoryContext,
): DialogueCursor {
  return settle(scene, index, effects, ctx, null);
}

/**
 * Moves past the current line, or takes option `choice` at a choice node (required there, and a
 * valid index). At the end it returns the cursor unchanged.
 */
export function advance(
  scene: Scene,
  cursor: DialogueCursor,
  ctx: StoryContext,
  choice?: number,
): DialogueCursor {
  if (scene.id !== cursor.scene) {
    throw new Error(`story: cursor is on ${cursor.scene}, not ${scene.id}`);
  }
  const { step, effects } = cursor;
  if (step.kind === 'end') return cursor;
  if (step.kind === 'line') return settle(scene, cursor.index + 1, effects, ctx, null);
  const option = choice === undefined ? undefined : step.node.options[choice];
  if (option === undefined) {
    throw new Error(`story: ${scene.id} needs a choice in 0..${step.node.options.length - 1}`);
  }
  const next = option.set === undefined ? effects : addFlags(effects, option.set);
  const to = option.goto === undefined ? cursor.index + 1 : labelIndex(scene, option.goto);
  return settle(scene, to, next, ctx, option);
}

/**
 * What pressing a reply button does (story-runtime.md § Barks): the flags it sets and the scene
 * it plays. Not pressing it changes nothing.
 */
export function pressButton(button: ReplyButton): {
  readonly flags: FlagSet;
  readonly reply: SceneId | null;
} {
  return { flags: button.set ?? {}, reply: button.reply ?? null };
}

/**
 * The lines `scene` plays in `ctx` with nobody advancing it by hand: from its start to its first
 * choice or its end (a debrief on the results card; the canon tests). Takes no choice.
 */
export function linesUntilChoice(scene: Scene, ctx: StoryContext): LineNode[] {
  const out: LineNode[] = [];
  let cursor = start(scene, ctx);
  while (cursor.step.kind === 'line') {
    out.push(cursor.step.node);
    cursor = advance(scene, cursor, ctx);
  }
  return out;
}

/** A scene id's slot (`a1_m03_w04` → radio before wave 4), or null for a malformed id. */
export function sceneSlot(id: SceneId): SceneSlot | null {
  return parseSceneId(id)?.slot ?? null;
}

/** The index of the node labelled `label` in `scene`. Throws when there is none. */
export function labelIndex(scene: Scene, label: string): number {
  const i = scene.nodes.findIndex((n) => n.label === label);
  if (i < 0) throw new Error(`story: ${scene.id} has no label '${label}'`);
  return i;
}

function addFlags(effects: DialogueEffects, set: FlagSet): DialogueEffects {
  return { ...effects, flags: { ...effects.flags, ...set } };
}

/**
 * Runs branch and set nodes from `index` until a line, a choice, or the end. A chain of more
 * jumps than the scene has nodes is a loop with nothing to show (validation refuses those).
 */
function settle(
  scene: Scene,
  index: number,
  effects: DialogueEffects,
  ctx: StoryContext,
  chose: ChoiceOption | null,
): DialogueCursor {
  let i = index;
  const flags: FlagSet = { ...effects.flags };
  let callsign = effects.callsign;
  for (let guard = 0; guard <= scene.nodes.length; guard++) {
    const node = scene.nodes[i];
    const at = (step: DialogueStep): DialogueCursor => ({
      scene: scene.id,
      index: i,
      step,
      effects: { flags, callsign },
      chose,
    });
    if (node === undefined || node.kind === 'end') {
      return at({ kind: 'end' });
    }
    switch (node.kind) {
      case 'line':
        return at({ kind: 'line', node });
      case 'choice':
        return at({ kind: 'choice', node });
      case 'branch': {
        const holds = evaluateCondition(node.cond, withFlags(ctx, flags));
        const target = holds ? node.goto : node.else;
        i = target === undefined ? i + 1 : labelIndex(scene, target);
        break;
      }
      case 'set':
        if ('callsign' in node) callsign = node.callsign;
        else Object.assign(flags, { [node.flag]: node.value });
        i++;
        break;
    }
  }
  throw new Error(`story: ${scene.id} loops without a line or a choice`);
}
