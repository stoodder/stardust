// Act II's chunk (app/actContent.ts loads it on demand): its story and its sounds.
import { ACT2_SFX } from '../../audio/sfx/act2.ts';
import { ACT2B_SFX } from '../../audio/sfx/act2b.ts';
import { ACT2_TOWER_SFX } from '../../audio/sfx/act2towers.ts';
import { AELARI_SFX } from '../../audio/sfx/aelari.ts';
import { HOLLOW_SFX } from '../../audio/sfx/hollow.ts';
import { ACT2_STORY } from '../../content/acts/a2.ts';
import type { ActChunk } from './types.ts';

export const ACT2_CHUNK: ActChunk = {
  story: ACT2_STORY,
  sfx: {
    aelari: AELARI_SFX,
    hollow: HOLLOW_SFX,
    act2: ACT2_SFX,
    act2b: ACT2B_SFX,
    act2towers: ACT2_TOWER_SFX,
  },
};
