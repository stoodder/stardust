// The finale's story content, one lazy chunk with its sounds (app/acts/fin.ts; content/acts/index.ts
// says what an act holds): the walk's scenes and barks, the Journal's last pages, Sterling's
// farewell, the epilogue's cards, and the post-game maps. Nothing of the finale is in the initial
// JS.
import { FINALE_CODEX } from '../codex/finale.ts';
import { EPILOGUE_CARDS } from '../dialogue/fin/epilogue.ts';
import { barks as finM01Barks } from '../dialogue/fin/fin_m01/barks.ts';
import { scenes as finM01Scenes } from '../dialogue/fin/fin_m01/scenes.ts';
import { CHALLENGE_MAPS } from '../maps/challenge.ts';
import { scenes as chM01Briefing } from '../maps/ch_m01/briefing.ts';
import { scenes as chM02Briefing } from '../maps/ch_m02/briefing.ts';
import { scenes as chM03Briefing } from '../maps/ch_m03/briefing.ts';
import { ENDLESS_MAPS } from '../maps/end_m01/index.ts';
import { FINALE_MEMOS } from '../memos/finale.ts';
import type { ActStory } from './index.ts';

export const FINALE_STORY: ActStory = {
  act: 'finale',
  marker: 'lazy-act:finale',
  dialogue: [
    { map: 'fin_m01', scenes: finM01Scenes, barks: finM01Barks },
    // The challenge maps' briefings (T862).
    { map: 'ch_m01', scenes: chM01Briefing, barks: [] },
    { map: 'ch_m02', scenes: chM02Briefing, barks: [] },
    { map: 'ch_m03', scenes: chM03Briefing, barks: [] },
  ],
  codex: FINALE_CODEX,
  codexVersions: {},
  memos: FINALE_MEMOS,
  epilogue: EPILOGUE_CARDS,
  // The post-game maps (T862): the challenge maps, and Endless's (T861).
  maps: { ...CHALLENGE_MAPS, ...ENDLESS_MAPS },
};
