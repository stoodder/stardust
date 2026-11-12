// The finale's chunk (app/actContent.ts loads it on demand): its story, its sounds, its music
// (T850: the Long Walk, the hymn, Dawn), and its sprites (T871: the Unsung, the choir, the Bore,
// the finale's props, baked into an atlas page of their own); never imported from the core, so
// none of it is in the initial JS.
import { FIN_CUES, FIN_THEMES } from '../../audio/music/fin.ts';
import { FIN_SFX } from '../../audio/sfx/fin.ts';
import { FINALE_STORY } from '../../content/acts/fin.ts';
import { FINALE_SPRITES } from '../../content/sprites/finale.ts';
import type { ActChunk } from './types.ts';

export const FINALE_CHUNK: ActChunk = {
  story: FINALE_STORY,
  sfx: { fin: FIN_SFX },
  music: { fin: { themes: FIN_THEMES, cues: FIN_CUES } },
  sprites: FINALE_SPRITES,
};
