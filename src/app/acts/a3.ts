// Act III's chunk (app/actContent.ts loads it on demand): its story and its sounds.
import { ACT3_SFX } from '../../audio/sfx/act3.ts';
import { ACT3B_SFX } from '../../audio/sfx/act3b.ts';
import { ACT3_STORY } from '../../content/acts/a3.ts';
import type { ActChunk } from './types.ts';

export const ACT3_CHUNK: ActChunk = {
  story: ACT3_STORY,
  sfx: { act3: ACT3_SFX, act3b: ACT3B_SFX },
};
