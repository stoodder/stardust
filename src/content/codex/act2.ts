// The Act II codex (docs/story/campaign/act2.md, each map's *Codex* line; style-guide § 6.2): the
// Act II maps' own entries, with their `original` versions, and the `annotated` versions Act II
// adds to entries of either act (QUILL's unredactions from A2M3, Ves'thara's margin notes from
// A2M6). This file is the home of their text. Registered empty (T400b); T411 writes them.
import type { CodexEntryDef, CodexLaterVersions } from './types.ts';

/** Every Act II entry, in codex order (by the map that introduces it). */
export const ACT2_CODEX: readonly CodexEntryDef[] = [];

/**
 * The versions Act II adds to entries it doesn't own (an Act I entry's `annotated`, or an Act II
 * entry's written apart from it), by entry id. The registry merges them into their entries.
 */
export const ACT2_CODEX_VERSIONS: CodexLaterVersions = {};
