// The finale's chunk (app/actContent.ts loads it on demand): its story, and (T850) its sounds.
import { FINALE_STORY } from '../../content/acts/fin.ts';
import type { ActChunk } from './types.ts';

export const FINALE_CHUNK: ActChunk = {
  story: FINALE_STORY,
  sfx: {},
};
