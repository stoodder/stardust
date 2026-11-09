// Codex data shapes (docs/story/style-guide.md § 6.2; design/core-loop.md § 6.5): entries that
// unlock on first encounter, each with up to three versions, each version with its own unlock
// condition. Which versions a save has unlocked is `story.codex` (meta/saveData.ts); the logic is
// story/codex.ts (T303).
import type { Condition } from '../dialogue/types.ts';
import type { AbilityId, EnemyId, TowerId } from '../types.ts';

/** A codex entry id: `codex_<entry>` (style-guide § 5.3). */
export type CodexId = string;
/** The codex-id pattern. */
export const CODEX_ID = /^codex_[a-z0-9_]+$/;

/** The versions an entry can have, in unlock order. */
export const CODEX_VERSIONS = ['original', 'annotated', 'corrected'] as const;
export type CodexVersion = (typeof CODEX_VERSIONS)[number];

/** What an entry is about (the codex's tabs). */
export type CodexKind = 'enemy' | 'tower' | 'ability' | 'place' | 'person' | 'thing';

/**
 * What the entry describes, when it is a unit or ability: its first encounter unlocks the
 * `original` version (an enemy spawned, a tower owned, an ability owned).
 */
export type CodexSubject =
  { readonly enemy: EnemyId } | { readonly tower: TowerId } | { readonly ability: AbilityId };

export interface CodexVersionDef {
  /** ≤ 600 characters after substitution. Original: smug PR; annotated: bracketed and signed. */
  readonly text: string;
  /** When this version unlocks (besides the subject's first encounter, for `original`). */
  readonly when?: Condition;
}

export interface CodexEntryDef {
  readonly id: CodexId;
  readonly title: string;
  readonly kind: CodexKind;
  readonly subject?: CodexSubject;
  readonly versions: { readonly [V in CodexVersion]?: CodexVersionDef };
}
