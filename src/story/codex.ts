// The codex (docs/tech/story-runtime.md § Other story systems; design/core-loop.md § 6.5): which
// versions of each entry are unlocked, the *Pest Field Guide* / *Field Journal* title, and the
// side-by-side mode from A3M1. Pure over content (content/codex/) and the story context.
import {
  CODEX_ENTRIES,
  CODEX_NOTE_VERSIONS,
  CODEX_VERSIONS,
  type CodexEntryDef,
  type CodexId,
  type CodexNoteVersion,
  type CodexSubject,
  type CodexVersion,
  type CodexVersionDef,
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
 * (a note version brings the record and the earlier notes with it: `notesShown`); in the *Field
 * Journal* an entry with a correction shows its original and its correction side by side
 * (core-loop.md § 6.5).
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

/** Whether `v` is a note written on the original (`annotated`, `margin`; style-guide § 6.2). */
export function isNoteVersion(v: CodexVersion): v is CodexNoteVersion {
  return (CODEX_NOTE_VERSIONS as readonly CodexVersion[]).includes(v);
}

/**
 * The notes a note version shows, oldest first, ending with itself: every note version unlocked up
 * to it, so Ves'thara's margin note shows under QUILL's annotation, both under the record (T501e).
 * Empty for a version that isn't a note.
 */
export function notesShown(
  version: CodexVersion,
  unlocked: readonly CodexVersion[],
): CodexNoteVersion[] {
  if (!isNoteVersion(version)) return [];
  const upTo = CODEX_NOTE_VERSIONS.indexOf(version);
  return CODEX_NOTE_VERSIONS.filter((v, i) => i <= upTo && (v === version || unlocked.includes(v)));
}

/**
 * The `story.seen` id that marks a codex version read (the NEW badge clears). The save has no
 * separate codex-read list; `seen` holds what the player has seen (scenes, once-per-campaign barks,
 * and these), checked by shape only. Entry ids never hold `__` (a content test checks).
 */
export function codexSeenId(id: CodexId, version: CodexVersion): string {
  return `${id}__${version}`;
}

/** Whether `def`'s later wording (`revised`) is the one shown now (the Elder's from A3M3). */
export function revisionInForce(def: CodexVersionDef, ctx: StoryContext): boolean {
  return def.revised !== undefined && evaluateCondition(def.revised.when, ctx);
}

/** The text `def` shows now: its revision once that holds, else its own. */
export function versionText(def: CodexVersionDef, ctx: StoryContext): string {
  return def.revised !== undefined && revisionInForce(def, ctx) ? def.revised.text : def.text;
}

/**
 * The `story.seen` id that marks `entry`'s version `v` read as it reads now: `codexSeenId`, plus
 * `__revised` while its later wording is in force, so the Elder's new citation is NEW once more
 * even with the A3M1 wording read.
 */
export function versionSeenId(entry: CodexEntryDef, v: CodexVersion, ctx: StoryContext): string {
  const def = entry.versions[v];
  const id = codexSeenId(entry.id, v);
  return def !== undefined && revisionInForce(def, ctx) ? `${id}__revised` : id;
}

/**
 * The unlocked versions of an entry the player hasn't opened yet. `seenIdOf` names each version's
 * read mark (default `codexSeenId`; the app passes `versionSeenId`, so a revision is NEW again).
 */
export function unreadVersions(
  id: CodexId,
  unlocked: readonly CodexVersion[],
  seen: readonly string[],
  seenIdOf: (v: CodexVersion) => string = (v) => codexSeenId(id, v),
): CodexVersion[] {
  return unlocked.filter((v) => !seen.includes(seenIdOf(v)));
}
