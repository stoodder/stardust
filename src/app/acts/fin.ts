// The finale's chunk (app/actContent.ts loads it on demand): its story, its sounds, and its music
// (T850: the Long Walk, the hymn, Dawn; never imported from the core, so none of it is in the
// initial JS).
import { FIN_CUES, FIN_THEMES } from '../../audio/music/fin.ts';
import { FIN_SFX } from '../../audio/sfx/fin.ts';
import { FINALE_STORY } from '../../content/acts/fin.ts';
import type { ActChunk } from './types.ts';

export const FINALE_CHUNK: ActChunk = {
  story: FINALE_STORY,
  sfx: { fin: FIN_SFX },
  music: { fin: { themes: FIN_THEMES, cues: FIN_CUES } },
};
