// The story's per-act content, loaded an act at a time (architecture.md § 5, *Bundle*; T802). Act I
// (and everything shared: the bark pools, the speakers, the rules) is in the initial JS; Act II,
// Act III, and the finale are each a lazy chunk (app/actContent.ts loads them; the act's files
// here say what each holds: its maps' scenes and barks, its codex entries and its versions of
// earlier entries, its memos). Registering an act adds its parts to the registries
// (dialogue/index.ts, codex/index.ts, memos/index.ts), which always list what is registered in
// campaign order, whatever order the acts arrive in. Tests and the Node tools register every act
// up front (app/acts/all.ts). Pure.
import { CAMPAIGN_PLAN_IDS } from '../campaign.ts';
import { registerCodex } from '../codex/index.ts';
import type { CodexEntryDef, CodexLaterVersions } from '../codex/types.ts';
import { registerMapDialogue } from '../dialogue/index.ts';
import type { MapDialogue, StoryAct } from '../dialogue/types.ts';
import { mapAct } from '../dialogue/rules.ts';
import { registerMemos } from '../memos/index.ts';
import type { MemoDef } from '../memos/types.ts';

/** The story's acts, in campaign order. */
export const STORY_ACTS = [1, 2, 3, 'finale'] as const satisfies readonly StoryAct[];

/** The acts that load on demand (Act I is always in). */
export const LAZY_ACTS = [2, 3, 'finale'] as const satisfies readonly StoryAct[];
export type LazyAct = (typeof LAZY_ACTS)[number];

/** An act's place in campaign order (Act I 0, the finale 3). */
export function actRank(act: StoryAct): number {
  return STORY_ACTS.indexOf(act);
}

/** The act `rank` places (clamped to the story's acts). */
export function actAtRank(rank: number): StoryAct {
  return STORY_ACTS[Math.max(0, Math.min(STORY_ACTS.length - 1, rank))] ?? 1;
}

/** The act of a campaign map id; null for any other map (the dev battles). */
export function actOfMapId(map: string): StoryAct | null {
  const id = CAMPAIGN_PLAN_IDS.find((m) => m === map);
  return id === undefined ? null : mapAct(id);
}

/** One act's story content: the lazy part of each registry. */
export interface ActStory {
  readonly act: LazyAct;
  /**
   * A string only this act's chunk holds: tools/bundleSize.ts fails the build when an initial
   * script contains `lazy-act:` (a static import dragged an act into the initial JS).
   */
  readonly marker: `lazy-act:${LazyAct}`;
  /** Its maps' scenes and barks, in campaign order. */
  readonly dialogue: readonly MapDialogue[];
  /** Its codex entries, in codex order. */
  readonly codex: readonly CodexEntryDef[];
  /** Its versions of earlier acts' entries (Act II's annotations, Act III's corrections). */
  readonly codexVersions: CodexLaterVersions;
  /** Its memos, in delivery order. */
  readonly memos: readonly MemoDef[];
}

/** Adds `story`'s parts to the registries (again: replaces them, so it's idempotent). */
export function registerActStory(story: ActStory): void {
  const rank = actRank(story.act);
  registerMapDialogue(rank, story.dialogue);
  registerCodex(rank, story.codex, story.codexVersions);
  registerMemos(rank, story.memos);
}
