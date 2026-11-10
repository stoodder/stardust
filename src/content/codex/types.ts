// Codex data shapes (docs/story/style-guide.md § 6.2; design/core-loop.md § 6.5): entries that
// unlock on first encounter, each with up to three versions, each version with its own unlock
// condition. Which versions a save has unlocked is `story.codex` (meta/saveData.ts); the logic is
// story/codex.ts (T303).
import type { Condition } from '../dialogue/types.ts';
import type { AbilityId, EnemyId, SpriteId, TowerId } from '../types.ts';

/** A codex entry id: `codex_<entry>` (style-guide § 5.3). */
export type CodexId = string;
/** The codex-id pattern. */
export const CODEX_ID = /^codex_[a-z0-9_]+$/;

/**
 * The versions an entry can have, in unlock order: the `original` (the *Pest Field Guide*), Act
 * II's two layers of notes written on it (`annotated`: Everglow's update or QUILL's note;
 * `margin`: Ves'thara's margin note, from A2M6), and Act III's `corrected`.
 */
export const CODEX_VERSIONS = ['original', 'annotated', 'margin', 'corrected'] as const;
export type CodexVersion = (typeof CODEX_VERSIONS)[number];

/**
 * The versions that are notes written on the `original` (style-guide § 6.2): each shows under the
 * record it annotates, the earlier note above the later one.
 */
export const CODEX_NOTE_VERSIONS = [
  'annotated',
  'margin',
] as const satisfies readonly CodexVersion[];
export type CodexNoteVersion = (typeof CODEX_NOTE_VERSIONS)[number];

/** What an entry is about (the codex's tabs). */
export type CodexKind = 'enemy' | 'tower' | 'ability' | 'place' | 'person' | 'thing';

/**
 * What the entry describes, when it is a unit or ability: its first encounter unlocks the
 * `original` version (an enemy spawned, a tower owned, an ability owned).
 */
export type CodexSubject =
  { readonly enemy: EnemyId } | { readonly tower: TowerId } | { readonly ability: AbilityId };

export interface CodexVersionDef {
  /**
   * ≤ 600 characters after substitution. Original: smug PR; annotated and margin: bracketed and
   * signed, the note alone (the codex shows it under the original it annotates, a margin note under
   * the annotation too). Single line breaks show.
   */
  readonly text: string;
  /**
   * ≤ 140 characters; collapsed until clicked, like a memo's. Sterling's gifts carry theirs here
   * (bible.md § 5: "every gift carries small print in the codex").
   */
  readonly smallPrint?: string;
  /** When this version unlocks (besides the subject's first encounter, for `original`). */
  readonly when?: Condition;
}

/** The picture an entry shows when it has no subject (a subject shows its own icon). */
export interface CodexSprite {
  readonly id: SpriteId;
  /** The frame to show; default `icon` (a portrait's `neutral`, a prop's `v0`). */
  readonly frame?: string;
}

export interface CodexEntryDef {
  readonly id: CodexId;
  readonly title: string;
  readonly kind: CodexKind;
  readonly subject?: CodexSubject;
  readonly sprite?: CodexSprite;
  /**
   * What the photo frame says when the entry has no picture: "Photo pending" by default; A2M3's
   * withheld "Pebble" entry says "Withheld" (≤ 12 characters, two lines of the frame).
   */
  readonly photo?: string;
  readonly versions: { readonly [V in CodexVersion]?: CodexVersionDef };
}

/**
 * Versions a later act adds to entries it doesn't own (an Act I entry's `annotated`), by entry id:
 * the registry (index.ts) merges them in, so each act's text stays in its own file. A version
 * here never replaces one the entry already has (codex.test.ts).
 */
export type CodexLaterVersions = Readonly<Record<CodexId, CodexEntryDef['versions']>>;
