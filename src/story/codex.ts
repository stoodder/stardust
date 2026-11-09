// The codex (docs/tech/story-runtime.md § Other story systems; design/core-loop.md § 6.5): which
// versions of each entry are unlocked, the *Pest Field Guide* / *Field Journal* title, and the
// side-by-side mode from A3M1. Pure over content (content/codex/) and the story context.
import type { CodexEntryDef, CodexId, CodexVersion } from '../content/codex/types.ts';
import type { StoryContext } from './conditions.ts';
import { notImplemented } from './notImplemented.ts';

/** What the codex reads besides the context: the units and abilities met so far. */
export interface CodexEncounters {
  readonly enemies: readonly string[];
  readonly towers: readonly string[];
  readonly abilities: readonly string[];
}

/** Every version of `entry` unlocked now, in version order. */
export function unlockedVersions(
  entry: CodexEntryDef,
  ctx: StoryContext,
  met: CodexEncounters,
): CodexVersion[] {
  void entry;
  void ctx;
  void met;
  return notImplemented('unlockedVersions', 'T303');
}

/** The codex unlocks to add to a save's `story.codex` (newly unlocked versions only). */
export function newCodexUnlocks(
  have: Readonly<Record<CodexId, readonly CodexVersion[]>>,
  ctx: StoryContext,
  met: CodexEncounters,
): Record<CodexId, CodexVersion[]> {
  void have;
  void ctx;
  void met;
  return notImplemented('newCodexUnlocks', 'T303');
}

/** The codex's title: *Pest Field Guide*, or *Field Journal* from A3M1. */
export function codexTitle(ctx: StoryContext): string {
  void ctx;
  return notImplemented('codexTitle', 'T303');
}
