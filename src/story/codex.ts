// The codex (docs/tech/story-runtime.md § Other story systems; design/core-loop.md § 6.5): which
// versions of each entry are unlocked, the *Pest Field Guide* / *Field Journal* title, and the
// side-by-side mode from A3M1. Pure over content (content/codex/) and the story context.
import {
  CODEX_ENTRIES,
  CODEX_VERSIONS,
  type CodexEntryDef,
  type CodexId,
  type CodexSubject,
  type CodexVersion,
} from '../content/codex/index.ts';
import { evaluateCondition, type StoryContext } from './conditions.ts';

/** What the codex reads besides the context: the units and abilities met so far. */
export interface CodexEncounters {
  /** Enemy types seen (`campaign.seenEnemies`). */
  readonly enemies: readonly string[];
  /** Towers owned (`unlocks.towers`). */
  readonly towers: readonly string[];
  /** Abilities owned (`unlocks.abilities`). */
  readonly abilities: readonly string[];
}

/** The map from which the codex is the *Field Journal* and shows corrections side by side. */
const FIELD_JOURNAL_FROM = { mapAtLeast: 'a3_m01' } as const;

/** Whether the save has met `subject` (an enemy seen, a tower or ability owned). */
export function subjectMet(subject: CodexSubject, met: CodexEncounters): boolean {
  if ('enemy' in subject) return met.enemies.includes(subject.enemy);
  if ('tower' in subject) return met.towers.includes(subject.tower);
  return met.abilities.includes(subject.ability);
}

/**
 * Every version of `entry` unlocked now, in version order. Nothing unlocks before the entry's
 * subject is met; then each version unlocks when its `when` holds (`original` needs none; a later
 * version without a `when` never unlocks, so a draft can't leak early).
 */
export function unlockedVersions(
  entry: CodexEntryDef,
  ctx: StoryContext,
  met: CodexEncounters,
): CodexVersion[] {
  if (entry.subject !== undefined && !subjectMet(entry.subject, met)) return [];
  const out: CodexVersion[] = [];
  for (const v of CODEX_VERSIONS) {
    const def = entry.versions[v];
    if (def === undefined) continue;
    if (def.when === undefined ? v === 'original' : evaluateCondition(def.when, ctx)) out.push(v);
  }
  return out;
}

/**
 * The codex unlocks to add to a save's `story.codex`: for each entry, the versions unlocked now
 * that `have` doesn't hold yet (entries with none are left out). Unlocks are never taken back.
 */
export function newCodexUnlocks(
  have: Readonly<Record<CodexId, readonly CodexVersion[]>>,
  ctx: StoryContext,
  met: CodexEncounters,
  entries: readonly CodexEntryDef[] = CODEX_ENTRIES,
): Record<CodexId, CodexVersion[]> {
  const out: Record<CodexId, CodexVersion[]> = {};
  for (const e of entries) {
    const held = Object.hasOwn(have, e.id) ? (have[e.id] ?? []) : [];
    const fresh = unlockedVersions(e, ctx, met).filter((v) => !held.includes(v));
    if (fresh.length > 0) out[e.id] = fresh;
  }
  return out;
}

/** Whether the codex is the Act III *Field Journal* (from A3M1). */
export function isFieldJournal(ctx: StoryContext): boolean {
  return evaluateCondition(FIELD_JOURNAL_FROM, ctx);
}

/** The codex's title: *Pest Field Guide*, or *Field Journal* from A3M1. */
export function codexTitle(ctx: StoryContext): string {
  return isFieldJournal(ctx) ? 'Field Journal' : 'Pest Field Guide';
}

/**
 * The versions an entry shows, given those unlocked (in version order): before Act III the newest
 * (older ones a tab away); in the *Field Journal* an entry with a correction shows its original and
 * its correction side by side (core-loop.md § 6.5).
 */
export function shownVersions(
  unlocked: readonly CodexVersion[],
  ctx: StoryContext,
): CodexVersion[] {
  const ordered = CODEX_VERSIONS.filter((v) => unlocked.includes(v));
  const newest = ordered[ordered.length - 1];
  if (newest === undefined) return [];
  if (isFieldJournal(ctx) && newest === 'corrected' && ordered.includes('original')) {
    return ['original', 'corrected'];
  }
  return [newest];
}

/**
 * The `story.seen` id that marks a codex version read (the NEW badge clears). The save has no
 * separate codex-read list; `seen` holds what the player has seen (scenes, once-per-campaign barks,
 * and these), checked by shape only. Entry ids never hold `__` (a content test checks).
 */
export function codexSeenId(id: CodexId, version: CodexVersion): string {
  return `${id}__${version}`;
}

/** The unlocked versions of an entry the player hasn't opened yet. */
export function unreadVersions(
  id: CodexId,
  unlocked: readonly CodexVersion[],
  seen: readonly string[],
): CodexVersion[] {
  return unlocked.filter((v) => !seen.includes(codexSeenId(id, v)));
}
