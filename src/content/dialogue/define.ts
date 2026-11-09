// Authoring helpers for dialogue data (docs/story/style-guide.md § 5.8): identity functions that
// give scene and bark literals their types, so a map's dialogue file reads like the style guide.
import type { Bark, Condition, DialogueNode, Scene, SceneId } from './types.ts';

/** One scene: its id (`<map_id>_<slot>`) and its nodes, plus an optional gate. */
export function defineScene(id: SceneId, nodes: readonly DialogueNode[], when?: Condition): Scene {
  return when === undefined ? { id, nodes } : { id, nodes, when };
}

/** A map's scenes, in authoring order. */
export function defineScenes(scenes: readonly Scene[]): readonly Scene[] {
  return scenes;
}

/** A pool of barks, in authoring order. */
export function defineBarks(barks: readonly Bark[]): readonly Bark[] {
  return barks;
}
