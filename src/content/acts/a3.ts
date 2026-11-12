// Act III's story content, one lazy chunk with Act III's sounds (app/acts/a3.ts; content/acts/index.ts
// says what an act holds). A map task registers its dialogue here, one line in campaign order.
import { ACT3_CODEX, ACT3_CODEX_VERSIONS } from '../codex/act3.ts';
import { barks as a3m01Barks } from '../dialogue/a3/a3_m01/barks.ts';
import { scenes as a3m01BaseScenes } from '../dialogue/a3/a3_m01/base.ts';
import { scenes as a3m01Scenes } from '../dialogue/a3/a3_m01/scenes.ts';
import { barks as a3m02Barks } from '../dialogue/a3/a3_m02/barks.ts';
import { scenes as a3m02Scenes } from '../dialogue/a3/a3_m02/scenes.ts';
import { barks as a3m03Barks } from '../dialogue/a3/a3_m03/barks.ts';
import { scenes as a3m03Scenes } from '../dialogue/a3/a3_m03/scenes.ts';
import { barks as a3m04Barks } from '../dialogue/a3/a3_m04/barks.ts';
import { scenes as a3m04Scenes } from '../dialogue/a3/a3_m04/scenes.ts';
import { barks as a3m05Barks } from '../dialogue/a3/a3_m05/barks.ts';
import { scenes as a3m05Scenes } from '../dialogue/a3/a3_m05/scenes.ts';
import { barks as a3m06Barks } from '../dialogue/a3/a3_m06/barks.ts';
import { scenes as a3m06Scenes } from '../dialogue/a3/a3_m06/scenes.ts';
import { ACT3_MEMOS } from '../memos/act3.ts';
import type { ActStory } from './index.ts';

export const ACT3_STORY: ActStory = {
  act: 3,
  marker: 'lazy-act:3',
  dialogue: [
    { map: 'a3_m01', scenes: [...a3m01Scenes, ...a3m01BaseScenes], barks: a3m01Barks },
    { map: 'a3_m02', scenes: a3m02Scenes, barks: a3m02Barks },
    { map: 'a3_m03', scenes: a3m03Scenes, barks: a3m03Barks },
    { map: 'a3_m04', scenes: a3m04Scenes, barks: a3m04Barks },
    { map: 'a3_m05', scenes: a3m05Scenes, barks: a3m05Barks },
    { map: 'a3_m06', scenes: a3m06Scenes, barks: a3m06Barks },
  ],
  codex: ACT3_CODEX,
  codexVersions: ACT3_CODEX_VERSIONS,
  memos: ACT3_MEMOS,
};
