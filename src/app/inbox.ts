// The base's story panes, app side (T303; design/core-loop.md § 6.4–6.5): the Everglow Inbox's and
// the codex's view models for the save in play, the read marks the NEW badges clear on, and the
// catch-up that delivers what an older save missed when the base opens. Text comes out resolved
// (story/text.ts), with the Evie sun as its private-use character for the screens to draw.
import { ABILITIES } from '../content/abilities/index.ts';
import {
  CODEX_ENTRIES,
  type CodexEntryDef,
  type CodexKind,
  type CodexVersionDef,
} from '../content/codex/index.ts';
import { ENEMIES } from '../content/enemies/index.ts';
import { MEMOS, type MemoFormat, type MemoLetterhead } from '../content/memos/index.ts';
import { TOWERS } from '../content/towers/index.ts';
import {
  baseStoryContext,
  withStoryUnlocks,
  type CodexVersion,
  type SaveData,
} from '../meta/index.ts';
import {
  codexTitle,
  isFieldJournal,
  notesShown,
  shownVersions,
  unreadVersions,
  versionSeenId,
  versionText,
} from '../story/codex.ts';
import type { StoryContext } from '../story/conditions.ts';
import { memoBody, unreadMemos } from '../story/inbox.ts';
import { resolveText, type TextContext } from '../story/text.ts';
import { activeSave, updateActiveSave, type SaveResult } from './save.ts';

// ── Shared ───────────────────────────────────────────────────────────────────────────────────

function textContext(save: SaveData): TextContext {
  return { profile: save.profile, pestsProcessed: save.stats.pestsProcessed, evacuated: null };
}

/**
 * Entering the base: delivers any memo due and unlocks any codex version the save has earned but
 * doesn't hold (a save from before T303, or one a dev hook built). Writes only when something
 * changed. Run end does the same for each run (meta's step 8), so this is usually a no-op.
 */
export function catchUpStory(): SaveResult | null {
  const save = activeSave();
  if (save === null) return null;
  const next = withStoryUnlocks(save);
  if (next.save === save) return null;
  return updateActiveSave(() => next.save);
}

/** The NEW badges' counts on the base's tabs. */
export interface StoryBadges {
  /** Memos delivered and not read. */
  readonly inbox: number;
  /** Codex entries with an unlocked version not opened yet. */
  readonly codex: number;
}

export function storyBadges(save: SaveData | null = activeSave()): StoryBadges {
  if (save === null) return { inbox: 0, codex: 0 };
  const ctx = baseStoryContext(save);
  return {
    inbox: unreadMemos(save.story.memosDelivered, save.story.memosRead).length,
    codex: CODEX_ENTRIES.filter((e) => unreadOf(save, e, unlockedOf(save, e), ctx).length > 0)
      .length,
  };
}

/** `versions` of `e` not read as they read now (a revised wording is NEW again). */
function unreadOf(
  save: SaveData,
  e: CodexEntryDef,
  versions: readonly CodexVersion[],
  ctx: StoryContext,
): CodexVersion[] {
  return unreadVersions(e.id, versions, save.story.seen, (v) => versionSeenId(e, v, ctx));
}

function unlockedOf(save: SaveData, e: CodexEntryDef): readonly CodexVersion[] {
  return Object.hasOwn(save.story.codex, e.id) ? (save.story.codex[e.id] ?? []) : [];
}

// ── The Inbox ────────────────────────────────────────────────────────────────────────────────

/** One delivered memo, ready to show. */
export interface MemoView {
  readonly id: string;
  /** Everglow letterhead (`memo`) or the KFA's form panel (`form`). */
  readonly format: MemoFormat;
  /**
   * A memo's letterhead (`MemoDef.letterhead`, default `full`): `worn` (Act III, the colour gone,
   * the sun kept: Sterling's `memo_a3_01`) or `automated` (worn, sunless, the sender as the brand).
   * A form's is `full` and unread.
   */
  readonly letterhead: MemoLetterhead;
  /** A form's stamp ("PENDING"), or null. */
  readonly stamp: string | null;
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  /** Paragraphs: the body, then the extras that hold. Single line breaks stay in. */
  readonly paragraphs: readonly string[];
  readonly signOff: string | null;
  readonly smallPrint: string | null;
  readonly unread: boolean;
}

/** The Inbox: every delivered memo, newest first (core-loop.md § 6.4). */
export function inboxView(save: SaveData | null = activeSave()): readonly MemoView[] {
  if (save === null) return [];
  const ctx = baseStoryContext(save);
  const text = textContext(save);
  const r = (s: string): string => resolveText(s, text);
  const out: MemoView[] = [];
  for (const id of save.story.memosDelivered) {
    const m = Object.hasOwn(MEMOS, id) ? MEMOS[id] : undefined;
    // A memo the build doesn't know (a save from a newer content set) stays filed, unshown.
    if (m === undefined) continue;
    out.push({
      id,
      format: m.format ?? 'memo',
      letterhead: m.letterhead ?? 'full',
      stamp: m.stamp ?? null,
      from: r(m.from),
      to: r(m.to),
      subject: r(m.subject),
      paragraphs: memoBody(m, ctx).map(r),
      signOff: m.signOff === undefined ? null : r(m.signOff),
      smallPrint: m.smallPrint === undefined ? null : r(m.smallPrint),
      unread: !save.story.memosRead.includes(id),
    });
  }
  return out.toReversed();
}

/** Marks a delivered memo read (its NEW badge clears). A no-op for one read already. */
export function markMemoRead(id: string): SaveResult | null {
  const save = activeSave();
  if (save === null) return null;
  if (!save.story.memosDelivered.includes(id) || save.story.memosRead.includes(id)) return null;
  return updateActiveSave((s) => ({
    ...s,
    story: { ...s.story, memosRead: [...s.story.memosRead, id] },
  }));
}

// ── The codex ────────────────────────────────────────────────────────────────────────────────

/** The sections the codex groups its entries into, in order, with their headings. */
export const CODEX_SECTIONS: readonly { readonly kind: CodexKind; readonly label: string }[] = [
  { kind: 'enemy', label: 'Pests' },
  { kind: 'tower', label: 'Turrets' },
  { kind: 'ability', label: 'Controls' },
  { kind: 'person', label: 'Personnel' },
  { kind: 'place', label: 'Places' },
  { kind: 'thing', label: 'Miscellany' },
];

/** The picture beside an entry: a sprite id and frame, or null ("Photo pending"). */
export interface CodexPicture {
  readonly id: string;
  readonly frame: string;
}

/** A version's text, resolved, with its small print. */
export interface CodexText {
  readonly text: string;
  readonly smallPrint: string | null;
}

/** A note written on the record (an `annotated` or `margin` version), and whose it is. */
export interface CodexNoteView extends CodexText {
  readonly version: CodexVersion;
}

/** One version on screen. */
export interface CodexVersionView extends CodexText {
  readonly version: CodexVersion;
  /**
   * A note (annotated, margin) is written on the record: the `original` it annotates, shown above
   * the note (null for any other version). So the newest version on screen still shows the older
   * one.
   */
  readonly record: CodexText | null;
  /**
   * The notes written on the record before this one, oldest first, shown between the record and
   * this note: QUILL's annotation above Ves'thara's margin note (T501e). Empty for the rest.
   */
  readonly earlier: readonly CodexNoteView[];
}

/** One unlocked entry, ready to show. */
export interface CodexEntryView {
  readonly id: string;
  readonly title: string;
  readonly kind: CodexKind;
  readonly picture: CodexPicture | null;
  /** What the photo frame says without a picture ("Photo pending"; "Withheld"). */
  readonly photo: string;
  /** The versions on screen (the newest; original beside corrected in the Field Journal). */
  readonly versions: readonly CodexVersionView[];
  /** A version on screen hasn't been opened yet. */
  readonly isNew: boolean;
}

export interface CodexView {
  /** *Pest Field Guide*, or *Field Journal* from A3M1. */
  readonly title: string;
  /** Unlocked entries, in codex order. */
  readonly entries: readonly CodexEntryView[];
  /** Every entry the build has, for "n of N on file". */
  readonly total: number;
}

function pictureOf(e: CodexEntryDef): CodexPicture | null {
  const s = e.subject;
  if (s !== undefined) {
    if ('enemy' in s) return { id: ENEMIES[s.enemy].sprites.icon, frame: 'icon' };
    if ('tower' in s) return { id: TOWERS[s.tower].sprites.icon, frame: 'icon' };
    return { id: ABILITIES[s.ability].sprites.icon, frame: 'icon' };
  }
  return e.sprite === undefined ? null : { id: e.sprite.id, frame: e.sprite.frame ?? 'icon' };
}

/** The codex for the save in play: its unlocked entries, each with the versions it shows. */
export function codexView(save: SaveData | null = activeSave()): CodexView | null {
  if (save === null) return null;
  const ctx = baseStoryContext(save);
  const text = textContext(save);
  const entries: CodexEntryView[] = [];
  const resolved = (def: CodexVersionDef): CodexText => ({
    text: resolveText(versionText(def, ctx), text),
    smallPrint: def.smallPrint === undefined ? null : resolveText(def.smallPrint, text),
  });
  for (const e of CODEX_ENTRIES) {
    const unlocked = unlockedOf(save, e);
    const shown = shownVersions(unlocked, ctx);
    if (shown.length === 0) continue;
    const original = e.versions.original;
    entries.push({
      id: e.id,
      title: e.title,
      kind: e.kind,
      picture: pictureOf(e),
      photo: e.photo ?? 'Photo pending',
      versions: shown.map((v) => {
        const notes = notesShown(v, unlocked);
        return {
          version: v,
          ...resolved(e.versions[v]!),
          record: notes.length > 0 && original !== undefined ? resolved(original) : null,
          earlier: notes.slice(0, -1).flatMap((n) => {
            const def = e.versions[n];
            return def === undefined ? [] : [{ version: n, ...resolved(def) }];
          }),
        };
      }),
      isNew: unreadOf(save, e, shown, ctx).length > 0,
    });
  }
  return { title: codexTitle(ctx), entries, total: CODEX_ENTRIES.length };
}

/**
 * The base's codex tab label: "Codex", or "Journal" from A3M1, when the pane is the *Field
 * Journal* (style-guide.md § 2, Act III system copy).
 */
export function codexTabLabel(save: SaveData | null = activeSave()): 'Codex' | 'Journal' {
  return save !== null && isFieldJournal(baseStoryContext(save)) ? 'Journal' : 'Codex';
}

/** Marks the versions an entry shows as read (its NEW badge clears). */
export function markCodexRead(id: string): SaveResult | null {
  const save = activeSave();
  if (save === null) return null;
  const entry = CODEX_ENTRIES.find((e) => e.id === id);
  if (entry === undefined) return null;
  const ctx = baseStoryContext(save);
  const shown = shownVersions(unlockedOf(save, entry), ctx);
  const fresh = unreadOf(save, entry, shown, ctx).map((v) => versionSeenId(entry, v, ctx));
  if (fresh.length === 0) return null;
  return updateActiveSave((s) => ({
    ...s,
    story: { ...s.story, seen: [...s.story.seen, ...fresh] },
  }));
}
