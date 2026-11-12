// The finale's story content, one lazy chunk with its sounds (app/acts/fin.ts; content/acts/index.ts
// says what an act holds): the walk's scenes and barks, the Journal's last pages, Sterling's
// farewell. Nothing of the finale is in the initial JS.
import { FINALE_CODEX } from '../codex/finale.ts';
import { barks as finM01Barks } from '../dialogue/fin/fin_m01/barks.ts';
import { scenes as finM01Scenes } from '../dialogue/fin/fin_m01/scenes.ts';
import { FINALE_MEMOS } from '../memos/finale.ts';
import type { ActStory } from './index.ts';

export const FINALE_STORY: ActStory = {
  act: 'finale',
  marker: 'lazy-act:finale',
  dialogue: [{ map: 'fin_m01', scenes: finM01Scenes, barks: finM01Barks }],
  codex: FINALE_CODEX,
  codexVersions: {},
  memos: FINALE_MEMOS,
};
