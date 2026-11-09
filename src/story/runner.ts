// The dialogue runner (docs/tech/story-runtime.md § Dialogue runner): a pure state machine over a
// scene's nodes. `start` opens a scene; `advance` moves past the current line or takes a choice;
// branch and set nodes run on the way, so a cursor always rests on a line, a choice, or the end.
// The effects (flags set, the callsign, the scene seen) are returned for meta to save.
import type { FlagSet } from '../content/dialogue/flags.ts';
import type { CallsignId } from '../content/dialogue/profile.ts';
import type { ChoiceNode, LineNode, Scene, SceneId, SceneSlot } from '../content/dialogue/types.ts';
import type { StoryContext } from './conditions.ts';
import { notImplemented } from './notImplemented.ts';

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
  /** The index of the node the cursor rests on. */
  readonly index: number;
  readonly step: DialogueStep;
  readonly effects: DialogueEffects;
}

/** Opens `scene` in `ctx`; the cursor rests on its first line, choice, or end. */
export function start(scene: Scene, ctx: StoryContext): DialogueCursor {
  void scene;
  void ctx;
  return notImplemented('start', 'T302a');
}

/** Moves past the current line, or takes option `choice` at a choice node. */
export function advance(
  cursor: DialogueCursor,
  ctx: StoryContext,
  choice?: number,
): DialogueCursor {
  void cursor;
  void ctx;
  void choice;
  return notImplemented('advance', 'T302a');
}

/** A scene id's slot (`a1_m03_w04` → radio before wave 4), or null for a malformed id. */
export function sceneSlot(id: SceneId): SceneSlot | null {
  void id;
  return notImplemented('sceneSlot', 'T302a');
}
